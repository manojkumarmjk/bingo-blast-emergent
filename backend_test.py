"""
Backend smoke tests for Bingo Blast.
Tests:
  1. Razorpay toggle + config + mock create-order/verify
  2. Push registration scaffold
  3. Phase-2 endpoints: matchmaking, vip, cosmetics, guilds
"""
import os
import uuid
import json
import sys
import requests
from pathlib import Path

# Use external URL from frontend/.env
FRONTEND_ENV = Path("/app/frontend/.env")
BASE_URL = None
for line in FRONTEND_ENV.read_text().splitlines():
    if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
        BASE_URL = line.split("=", 1)[1].strip().strip('"')
        break
if not BASE_URL:
    BASE_URL = "http://localhost:8001"
API = f"{BASE_URL}/api"
print(f"Using API base: {API}")

results = []  # list of (name, ok, detail)


def record(name, ok, detail=""):
    results.append((name, ok, detail))
    status = "PASS" if ok else "FAIL"
    print(f"[{status}] {name}: {detail}")


def safe_json(r):
    try:
        return r.json()
    except Exception:
        return {"_raw": r.text}


# ---------- Setup: create two guest users ----------
def make_user(label="primary"):
    device_id = f"test-{label}-{uuid.uuid4()}"
    r = requests.post(f"{API}/guest/login", json={"device_id": device_id}, timeout=15)
    assert r.status_code == 200, f"guest/login failed: {r.status_code} {r.text}"
    u = r.json()
    return u


print("\n--- Setup: create 2 guest users ---")
user_a = make_user("A")
user_b = make_user("B")
print(f"User A: {user_a['id']} bcoins={user_a.get('bcoins')}")
print(f"User B: {user_b['id']} bcoins={user_b.get('bcoins')}")


# ===================================================================
# 1) Razorpay toggle + config + create-order/verify in mock mode
# ===================================================================
print("\n=== Test 1: Razorpay toggle + config ===")

# 1a. config
r = requests.get(f"{API}/payments/razorpay/config", timeout=15)
cfg = safe_json(r)
ok = (
    r.status_code == 200
    and cfg.get("use_real") is False
    and cfg.get("mode") == "mock"
    and cfg.get("key_id") == "rzp_test_mock"
)
record("razorpay/config returns mock", ok, f"status={r.status_code} body={cfg}")

# 1b. shop items
r = requests.get(f"{API}/shop/items", timeout=15)
items = safe_json(r) if r.status_code == 200 else []
bcoin_items = [i for i in items if i.get("type") == "bcoins"]
record(
    "GET /shop/items returns bcoins items",
    r.status_code == 200 and len(bcoin_items) > 0,
    f"status={r.status_code} bcoins_items={len(bcoin_items)}",
)
chosen_item = bcoin_items[0] if bcoin_items else None
if not chosen_item:
    print("Cannot continue Razorpay flow without a bcoins item")
else:
    # 1c. create-order
    payload = {"user_id": user_a["id"], "item_id": chosen_item["id"]}
    r = requests.post(f"{API}/payments/razorpay/create-order", json=payload, timeout=15)
    body = safe_json(r)
    create_ok = (
        r.status_code == 200
        and body.get("mocked") is True
        and isinstance(body.get("order_id"), str)
        and body["order_id"].startswith("order_mock_")
    )
    record(
        "POST /payments/razorpay/create-order (mock)",
        create_ok,
        f"status={r.status_code} body={body}",
    )
    order_id = body.get("order_id")

    # capture pre-purchase balance
    r = requests.get(f"{API}/user/{user_a['id']}", timeout=15)
    pre_balance = r.json().get("bcoins", 0)

    # 1d. verify
    verify_payload = {
        "user_id": user_a["id"],
        "item_id": chosen_item["id"],
        "razorpay_order_id": order_id or "order_mock_placeholder",
        "razorpay_payment_id": "pay_mock_test",
        "razorpay_signature": "mock_sig",
    }
    r = requests.post(f"{API}/payments/razorpay/verify", json=verify_payload, timeout=15)
    body = safe_json(r)
    verify_ok = (
        r.status_code == 200
        and body.get("ok") is True
        and body.get("mocked") is True
    )
    record(
        "POST /payments/razorpay/verify (mock)",
        verify_ok,
        f"status={r.status_code} body={body}",
    )

    # 1e. balance increased by item.amount
    r = requests.get(f"{API}/user/{user_a['id']}", timeout=15)
    post_balance = r.json().get("bcoins", 0)
    expected = pre_balance + chosen_item.get("amount", 0)
    record(
        "Bcoins balance increased by item.amount after verify",
        post_balance == expected,
        f"pre={pre_balance} post={post_balance} expected={expected}",
    )

    # 1f. transactions row inserted
    r = requests.get(f"{API}/transactions/{user_a['id']}", timeout=15)
    txs = safe_json(r) if r.status_code == 200 else []
    purchase_tx = [
        t for t in txs
        if t.get("type", "").startswith("razorpay_purchase")
        and t.get("item_id") == chosen_item["id"]
    ]
    record(
        "Transactions has razorpay_purchase row",
        r.status_code == 200 and len(purchase_tx) > 0,
        f"status={r.status_code} matching_tx={len(purchase_tx)}",
    )


# ===================================================================
# 2) Push registration scaffold
# ===================================================================
print("\n=== Test 2: Push registration scaffold ===")

push_token = "ExponentPushToken[abc123]"
r = requests.post(
    f"{API}/push/register",
    params={"user_id": user_a["id"], "token": push_token, "platform": "expo"},
    timeout=15,
)
body = safe_json(r)
record(
    "POST /push/register returns ok",
    r.status_code == 200 and body.get("ok") is True,
    f"status={r.status_code} body={body}",
)

r = requests.get(f"{API}/user/{user_a['id']}", timeout=15)
ub = safe_json(r)
record(
    "User has push_token persisted",
    r.status_code == 200 and ub.get("push_token") == push_token,
    f"push_token={ub.get('push_token')} push_platform={ub.get('push_platform')}",
)
record(
    "User has push_platform=expo",
    ub.get("push_platform") == "expo",
    f"push_platform={ub.get('push_platform')}",
)


# ===================================================================
# 3a) Matchmaking
# ===================================================================
print("\n=== Test 3a: Matchmaking ===")

# Note from server.py: matchmaking_join takes user_id only (mode unused).
# matchmaking_status uses /matchmaking/status/{entry_id} (path param).

r = requests.post(f"{API}/matchmaking/join", params={"user_id": user_a["id"]}, timeout=15)
body = safe_json(r)
join_ok = (
    r.status_code == 200
    and body.get("status") in ("queued", "matched")
    and body.get("entry_id")
)
record(
    "POST /matchmaking/join returns valid state",
    join_ok,
    f"status={r.status_code} body={body}",
)
entry_id = body.get("entry_id")

if entry_id:
    r = requests.get(f"{API}/matchmaking/status/{entry_id}", timeout=15)
    body = safe_json(r)
    status_ok = (
        r.status_code == 200
        and body.get("status") in ("queued", "matched", "expired")
    )
    record(
        "GET /matchmaking/status/{entry_id} returns valid state",
        status_ok,
        f"status={r.status_code} body={body}",
    )

    # Cleanup
    requests.post(f"{API}/matchmaking/cancel/{entry_id}", timeout=10)


# ===================================================================
# 3b) VIP
# ===================================================================
print("\n=== Test 3b: VIP ===")

r = requests.get(f"{API}/vip/info/{user_a['id']}", timeout=15)
vip_before = safe_json(r)
record(
    "GET /vip/info/{user_id} works",
    r.status_code == 200 and "plans" in vip_before,
    f"status={r.status_code} active={vip_before.get('active')} plans={len(vip_before.get('plans', []))}",
)

plans = vip_before.get("plans", [])
plan_id = plans[0]["id"] if plans else "vip_monthly"
r = requests.post(
    f"{API}/vip/activate",
    params={"user_id": user_a["id"], "plan_id": plan_id},
    timeout=15,
)
body = safe_json(r)
record(
    "POST /vip/activate returns ok",
    r.status_code == 200 and body.get("ok") is True and body.get("expires_at"),
    f"status={r.status_code} body={body}",
)

r = requests.get(f"{API}/vip/info/{user_a['id']}", timeout=15)
vip_after = safe_json(r)
record(
    "VIP info reflects activation (active=true)",
    r.status_code == 200 and vip_after.get("active") is True and vip_after.get("days_left", 0) > 0,
    f"active={vip_after.get('active')} days_left={vip_after.get('days_left')}",
)


# ===================================================================
# 3c) Cosmetics / Avatars
# ===================================================================
print("\n=== Test 3c: Cosmetics ===")

r = requests.get(f"{API}/cosmetics/{user_a['id']}", timeout=15)
cos_body = safe_json(r)
record(
    "GET /cosmetics/{user_id} works",
    r.status_code == 200 and "cosmetics" in cos_body and "equipped" in cos_body,
    f"status={r.status_code} categories={list(cos_body.get('cosmetics', {}).keys())}",
)

# Equip title_newbie under titles (it's default-unlocked)
r = requests.post(
    f"{API}/cosmetics/equip",
    params={"user_id": user_a["id"], "category": "titles", "item_id": "title_newbie"},
    timeout=15,
)
body = safe_json(r)
equip_ok = (
    r.status_code == 200
    and body.get("ok") is True
    and (body.get("equipped") or {}).get("title") == "title_newbie"
)
record(
    "POST /cosmetics/equip titles=title_newbie",
    equip_ok,
    f"status={r.status_code} body={body}",
)

# Verify persisted
r = requests.get(f"{API}/user/{user_a['id']}", timeout=15)
ub = safe_json(r)
record(
    "User.equipped.title persisted as title_newbie",
    (ub.get("equipped") or {}).get("title") == "title_newbie",
    f"equipped={ub.get('equipped')}",
)


# ===================================================================
# 3d) Guilds
# ===================================================================
print("\n=== Test 3d: Guilds ===")

# user_a may already have a guild_id from prior tests; we use user_b as creator.
# But we need to ensure user_b has 1000+ bcoins. Default bcoins=500. Let's give user_b enough via mock razorpay.
# To grant bcoins, use create-order + verify mock with coins_3000 to bypass.
shop = requests.get(f"{API}/shop/items", timeout=15).json()
big_pack = next((i for i in shop if i["id"] == "coins_3000"), None) or next(i for i in shop if i.get("type") == "bcoins")
order = requests.post(
    f"{API}/payments/razorpay/create-order",
    json={"user_id": user_b["id"], "item_id": big_pack["id"]},
    timeout=15,
).json()
requests.post(
    f"{API}/payments/razorpay/verify",
    json={
        "user_id": user_b["id"],
        "item_id": big_pack["id"],
        "razorpay_order_id": order.get("order_id", "x"),
        "razorpay_payment_id": "pay_mock_test",
        "razorpay_signature": "mock_sig",
    },
    timeout=15,
)
ub = requests.get(f"{API}/user/{user_b['id']}", timeout=15).json()
print(f"User B bcoins after top-up: {ub.get('bcoins')}")

# Create a third user to act as joiner (since user_a may already be in a guild from earlier runs / user_b becomes creator)
user_c = make_user("C")

# Create guild as user_b
r = requests.post(
    f"{API}/guilds/create",
    params={"user_id": user_b["id"], "name": "TestGuild", "tag": "TG"},
    timeout=15,
)
body = safe_json(r)
guild_create_ok = (
    r.status_code == 200
    and body.get("id")
    and body.get("name") == "TestGuild"
    and body.get("tag") == "TG"
)
record(
    "POST /guilds/create",
    guild_create_ok,
    f"status={r.status_code} body={body}",
)

guild_id = body.get("id")
guild_code = body.get("code")

# user_b is now in guild; verify
ub = requests.get(f"{API}/user/{user_b['id']}", timeout=15).json()
record(
    "Creator user.guild_id set in DB",
    ub.get("guild_id") == guild_id,
    f"user.guild_id={ub.get('guild_id')} guild_id={guild_id}",
)

# Join with user_c
r = requests.post(
    f"{API}/guilds/join",
    params={"user_id": user_c["id"], "code_or_id": guild_code or guild_id or ""},
    timeout=15,
)
body = safe_json(r)
join_ok = r.status_code == 200 and body.get("id") == guild_id
record(
    "POST /guilds/join (by code)",
    join_ok,
    f"status={r.status_code} body={body}",
)

# Confirm membership
uc = requests.get(f"{API}/user/{user_c['id']}", timeout=15).json()
record(
    "Joiner user.guild_id set",
    uc.get("guild_id") == guild_id,
    f"user.guild_id={uc.get('guild_id')}",
)

if guild_id:
    g = requests.get(f"{API}/guilds/{guild_id}", timeout=15).json()
    record(
        "Guild detail shows both members",
        user_b["id"] in g.get("members", []) and user_c["id"] in g.get("members", []),
        f"members={g.get('members')}",
    )

# Leave with user_c
r = requests.post(f"{API}/guilds/leave", params={"user_id": user_c["id"]}, timeout=15)
body = safe_json(r)
leave_ok = r.status_code == 200 and body.get("ok") is True
record(
    "POST /guilds/leave",
    leave_ok,
    f"status={r.status_code} body={body}",
)

uc = requests.get(f"{API}/user/{user_c['id']}", timeout=15).json()
record(
    "Leaver user.guild_id cleared",
    uc.get("guild_id") in (None, ""),
    f"user.guild_id={uc.get('guild_id')}",
)


# ===================================================================
# Summary
# ===================================================================
print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
passed = sum(1 for _, ok, _ in results if ok)
failed = sum(1 for _, ok, _ in results if not ok)
print(f"Passed: {passed}/{len(results)}")
print(f"Failed: {failed}/{len(results)}")
if failed:
    print("\nFailures:")
    for name, ok, detail in results:
        if not ok:
            print(f"  - {name}: {detail}")

sys.exit(0 if failed == 0 else 1)
