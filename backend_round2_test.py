"""Round-2 focused smoke tests for Bingo Blast backend.

Scope (per review request):
 1) Avatar catalogue (/api/avatars/list) + hardened /api/user/update validation
 2) Matchmaking bot timeout == 60s regression
 3) Regression sanity: Razorpay config (mock), push/register, shop/items
"""
import os
import sys
import uuid
import requests

BASE = os.environ.get("BACKEND_URL") or "https://bingo-mobile-app.preview.emergentagent.com"
API = f"{BASE}/api"

PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"
results = []


def check(name, cond, detail=""):
    results.append((name, cond, detail))
    marker = PASS if cond else FAIL
    print(f"[{marker}] {name}" + (f"  -> {detail}" if detail else ""))
    return cond


def post(path, **kw):
    return requests.post(f"{API}{path}", timeout=15, **kw)


def get(path, **kw):
    return requests.get(f"{API}{path}", timeout=15, **kw)


def section(title):
    print(f"\n=== {title} ===")


# -----------------------------------------------------------------------------
section("1) Avatar catalogue + /user/update hardening")

r = get("/avatars/list")
check("GET /api/avatars/list -> 200", r.status_code == 200, f"status={r.status_code}")
body = r.json() if r.ok else {}
avatars = body.get("avatars", [])
check("avatars list has EXACTLY 12 entries", len(avatars) == 12, f"got {len(avatars)}")
shape_ok = all(isinstance(a, dict) and a.get("id", "").startswith("sys_")
               and a.get("url", "").startswith("https://api.dicebear.com/") for a in avatars)
check("every avatar has {id:'sys_N', url:'https://api.dicebear.com/...'}", shape_ok)
check("ids are sys_0 .. sys_11", [a["id"] for a in avatars] == [f"sys_{i}" for i in range(12)])

first_url = avatars[0]["url"] if avatars else ""

# Fresh guest user
device_id = str(uuid.uuid4())
r = post("/guest/login", json={"device_id": device_id})
check("POST /api/guest/login (fresh device) -> 200", r.status_code == 200, f"status={r.status_code}")
user = r.json() if r.ok else {}
user_id = user.get("id")
check("guest user has id", bool(user_id))

# username too short
r = post("/user/update", json={"user_id": user_id, "username": "A"})
check("username='A' -> 400 (too short)", r.status_code == 400, f"status={r.status_code} body={r.text[:120]}")

# username too long (19 chars)
long_name = "A" * 19
r = post("/user/update", json={"user_id": user_id, "username": long_name})
check("username of 19 chars -> 400 (too long)", r.status_code == 400, f"status={r.status_code} body={r.text[:120]}")

# invalid avatar url
r = post("/user/update", json={"user_id": user_id, "avatar": "https://evil.example.com/bad.png"})
check("arbitrary avatar URL -> 400 (invalid avatar)", r.status_code == 400, f"status={r.status_code} body={r.text[:120]}")

# valid combined update
r = post("/user/update", json={"user_id": user_id, "avatar": first_url, "username": "NewName12"})
check("valid username+avatar -> 200", r.status_code == 200, f"status={r.status_code} body={r.text[:200]}")
body = r.json() if r.ok else {}
check("response has ok=True", body.get("ok") is True)
u = body.get("user") or {}
check("response.user.username == 'NewName12'", u.get("username") == "NewName12", f"got={u.get('username')}")
check("response.user.avatar == first_url", u.get("avatar") == first_url, f"got={u.get('avatar')}")

# persistence via GET
r = get(f"/user/{user_id}")
check("GET /api/user/{id} -> 200 after update", r.status_code == 200)
u2 = r.json() if r.ok else {}
check("persisted username == 'NewName12'", u2.get("username") == "NewName12", f"got={u2.get('username')}")
check("persisted avatar matches dicebear URL", u2.get("avatar") == first_url)

# -----------------------------------------------------------------------------
section("2) Matchmaking bot timeout == 60s")

r = post(f"/matchmaking/join?user_id={user_id}")
check("POST /api/matchmaking/join -> 200", r.status_code == 200, f"status={r.status_code} body={r.text[:150]}")
j = r.json() if r.ok else {}
check("join.status == 'queued'", j.get("status") == "queued", f"got {j.get('status')}")
entry_id = j.get("entry_id")
check("join returns entry_id", bool(entry_id))
check("join.wait_seconds == 0", j.get("wait_seconds") == 0, f"got {j.get('wait_seconds')}")

r = get(f"/matchmaking/status/{entry_id}")
check("GET /api/matchmaking/status/{entry_id} -> 200", r.status_code == 200, f"status={r.status_code} body={r.text[:150]}")
s = r.json() if r.ok else {}
check("status.status == 'queued'", s.get("status") == "queued", f"got {s.get('status')}")
bf = s.get("bot_fallback_in")
# Key regression: must be in (55, 60] — NOT ~15
check("bot_fallback_in in [55,60] (NOT ~15) -> 60s timeout", isinstance(bf, (int, float)) and 55 <= bf <= 60,
      f"got {bf}")

# Cleanup
r = post(f"/matchmaking/cancel/{entry_id}")
check("POST /api/matchmaking/cancel/{entry_id} -> 200", r.status_code == 200, f"status={r.status_code}")

# -----------------------------------------------------------------------------
section("3) Regression sanity")

r = get("/payments/razorpay/config")
check("GET /api/payments/razorpay/config -> 200", r.status_code == 200, f"status={r.status_code}")
c = r.json() if r.ok else {}
check("razorpay config.mode == 'mock'", c.get("mode") == "mock", f"got {c.get('mode')}")

r = post(f"/push/register?user_id={user_id}&token=ExponentPushToken[xyz]&platform=expo")
check("POST /api/push/register -> 200", r.status_code == 200, f"status={r.status_code} body={r.text[:150]}")
p = r.json() if r.ok else {}
check("push/register returns {ok:true}", p.get("ok") is True, f"got {p}")

r = get("/shop/items")
check("GET /api/shop/items -> 200", r.status_code == 200, f"status={r.status_code}")
si = r.json() if r.ok else {}
items = si.get("items") if isinstance(si, dict) else si
check("shop has items", isinstance(items, list) and len(items) > 0, f"items_count={len(items) if isinstance(items, list) else 'N/A'}")

# -----------------------------------------------------------------------------
passed = sum(1 for _, ok, _ in results if ok)
total = len(results)
print(f"\n=== RESULT: {passed}/{total} assertions passed ===")
sys.exit(0 if passed == total else 1)
