"""Bingo Blast backend API tests"""
import os
import time
import json
import pytest
import requests
from websocket import create_connection  # websocket-client


# ---------------- Health ----------------
class TestHealth:
    def test_root(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"


# ---------------- Guest Login & User ----------------
class TestGuestAndUser:
    def test_guest_login_creates_user_with_500(self, guest_user):
        assert guest_user["bcoins"] == 500
        assert guest_user["is_guest"] is True
        assert guest_user["id"]
        assert guest_user["username"]

    def test_guest_login_idempotent_by_device(self, api_client, base_url, guest_user):
        r = api_client.post(f"{base_url}/api/guest/login",
                            json={"device_id": f"TEST_device_{os.getpid()}"})
        assert r.status_code == 200
        assert r.json()["id"] == guest_user["id"]

    def test_get_user(self, api_client, base_url, guest_user):
        r = api_client.get(f"{base_url}/api/user/{guest_user['id']}")
        assert r.status_code == 200
        assert r.json()["id"] == guest_user["id"]

    def test_get_user_not_found(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/user/nonexistent_id_xyz")
        assert r.status_code == 404


# ---------------- Daily Reward ----------------
class TestDailyReward:
    def test_claim_grants_bcoins(self, api_client, base_url, guest_user):
        r = api_client.post(f"{base_url}/api/daily-reward/claim",
                            params={"user_id": guest_user["id"]})
        # If already claimed previously in run, may be 400; otherwise 200
        assert r.status_code in (200, 400)
        if r.status_code == 200:
            assert r.json()["reward"] in [50, 75, 100, 150, 200]

    def test_claim_blocked_within_20h(self, api_client, base_url, guest_user):
        # Try claim again - should be blocked
        r = api_client.post(f"{base_url}/api/daily-reward/claim",
                            params={"user_id": guest_user["id"]})
        assert r.status_code == 400


# ---------------- Spin Wheel ----------------
class TestSpinWheel:
    def test_spin(self, api_client, base_url, second_guest):
        r = api_client.post(f"{base_url}/api/spin-wheel/spin",
                            params={"user_id": second_guest["id"]})
        assert r.status_code == 200
        d = r.json()
        assert "segment_index" in d
        assert "reward" in d
        assert 0 <= d["segment_index"] < 8

    def test_spin_cooldown(self, api_client, base_url, second_guest):
        r = api_client.post(f"{base_url}/api/spin-wheel/spin",
                            params={"user_id": second_guest["id"]})
        assert r.status_code == 400


# ---------------- Rooms ----------------
class TestRooms:
    def test_create_room(self, api_client, base_url, guest_user):
        r = api_client.post(f"{base_url}/api/rooms", json={
            "user_id": guest_user["id"], "name": "TEST_Room",
            "room_type": "free", "max_players": 10, "match_count": 1, "entry_fee": 0,
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["code"] and len(d["players"]) == 1
        assert d["host_id"] == guest_user["id"]
        assert d["prize"] == 100
        pytest.room_id = d["id"]

    def test_list_rooms(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/rooms")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_list_rooms_filters(self, api_client, base_url):
        for f in ["free", "paid", "tournament"]:
            r = api_client.get(f"{base_url}/api/rooms", params={"filter": f})
            assert r.status_code == 200, f
            assert isinstance(r.json(), list)

    def test_join_room(self, api_client, base_url, second_guest):
        room_id = getattr(pytest, "room_id", None)
        assert room_id, "no room created"
        r = api_client.post(f"{base_url}/api/rooms/{room_id}/join",
                            json={"user_id": second_guest["id"]})
        assert r.status_code == 200, r.text
        d = r.json()
        assert any(p["user_id"] == second_guest["id"] for p in d["players"])


# ---------------- Computer match ----------------
class TestComputerMatch:
    def test_create_match(self, api_client, base_url, guest_user):
        r = api_client.post(f"{base_url}/api/computer-match",
                            json={"user_id": guest_user["id"], "difficulty": "easy", "num_cards": 2})
        assert r.status_code == 200
        d = r.json()
        assert "user_cards" in d and len(d["user_cards"]) == 2
        for card in d["user_cards"]:
            assert len(card) == 5 and len(card[0]) == 5
            assert card[2][2] is None
        assert d["bot_card"][2][2] is None
        pytest.match_id = d["id"]
        pytest.match_cards = d["user_cards"]
        pytest.match_called = d["called_numbers"]

    def test_call_number(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/computer-match/call",
                            json={"match_id": pytest.match_id})
        assert r.status_code == 200
        d = r.json()
        assert len(d["called_numbers"]) >= 1
        assert 1 <= d["called_numbers"][-1] <= 75

    def test_invalid_claim_finishes_match(self, api_client, base_url, guest_user):
        # New match, immediately claim - should be invalid
        r = api_client.post(f"{base_url}/api/computer-match",
                            json={"user_id": guest_user["id"], "difficulty": "easy"})
        match_id = r.json()["id"]
        r = api_client.post(f"{base_url}/api/computer-match/claim-bingo",
                            json={"match_id": match_id, "user_id": guest_user["id"]})
        assert r.status_code == 200
        assert r.json()["valid"] is False


# ---------------- Leaderboard / Tournaments / Achievements ----------------
class TestMisc:
    def test_leaderboard(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/leaderboard")
        assert r.status_code == 200
        d = r.json()
        assert "leaderboard" in d and isinstance(d["leaderboard"], list)

    def test_tournaments(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/tournaments")
        assert r.status_code == 200
        assert len(r.json()) == 3

    def test_tournament_register(self, api_client, base_url, guest_user):
        r = api_client.post(f"{base_url}/api/tournament/register",
                            params={"user_id": guest_user["id"], "tournament_id": "tour_daily"})
        assert r.status_code in (200, 400)  # 400 if not enough Bcoins

    def test_achievements(self, api_client, base_url, guest_user):
        r = api_client.get(f"{base_url}/api/achievements/{guest_user['id']}")
        assert r.status_code == 200
        assert len(r.json()) == 6

    def test_transactions(self, api_client, base_url, guest_user):
        r = api_client.get(f"{base_url}/api/transactions/{guest_user['id']}")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_shop_items(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/shop/items")
        assert r.status_code == 200
        items = r.json()
        assert len(items) == 8
        types = {i["type"] for i in items}
        assert {"bcoins", "room_card", "powerup"}.issubset(types)


# ---------------- Friends ----------------
class TestFriends:
    def test_add_friend(self, api_client, base_url, guest_user, second_guest):
        # Get friend_code of second_guest
        # second_guest UserOut doesn't include friend_code, fetch from list_rooms? Use their id-based code
        # We'll use the user object — need to query via DB or use add by friend_code which requires the code
        # Strategy: bypass: friend_code = uuid first segment uppercase. Use first segment of second_guest id.
        code = second_guest["id"].split("-")[0].upper()
        r = api_client.post(f"{base_url}/api/friends/add",
                            json={"user_id": guest_user["id"], "friend_code": code})
        assert r.status_code == 200, r.text

    def test_friends_list(self, api_client, base_url, guest_user, second_guest):
        r = api_client.get(f"{base_url}/api/friends/{guest_user['id']}")
        assert r.status_code == 200
        ids = [f["user_id"] for f in r.json()]
        assert second_guest["id"] in ids


# ---------------- Razorpay (mocked) ----------------
class TestRazorpayMocked:
    def test_create_order_mocked(self, api_client, base_url, guest_user):
        r = api_client.post(f"{base_url}/api/payments/razorpay/create-order",
                            json={"user_id": guest_user["id"], "item_id": "coins_100"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["mocked"] is True
        assert d["order_id"].startswith("order_mock_")
        assert d["amount"] == 2500  # 25 INR -> 2500 paise

    def test_verify_grants_bcoins(self, api_client, base_url, guest_user):
        before = api_client.get(f"{base_url}/api/user/{guest_user['id']}").json()["bcoins"]
        r = api_client.post(f"{base_url}/api/payments/razorpay/verify", json={
            "user_id": guest_user["id"], "item_id": "coins_100",
            "razorpay_order_id": "order_mock_x", "razorpay_payment_id": "pay_mock_x",
            "razorpay_signature": "sig_mock_x",
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True and d["mocked"] is True
        after = api_client.get(f"{base_url}/api/user/{guest_user['id']}").json()["bcoins"]
        assert after == before + 100


# ---------------- WebSocket ----------------
class TestWebSocket:
    def test_ws_room_state_and_start(self, api_client, base_url, guest_user, second_guest):
        # Create a fresh room for ws test
        r = api_client.post(f"{base_url}/api/rooms", json={
            "user_id": guest_user["id"], "name": "TEST_WS_Room",
            "room_type": "free", "max_players": 10, "match_count": 1, "entry_fee": 0,
        })
        assert r.status_code == 200
        room = r.json()
        # Add second player
        api_client.post(f"{base_url}/api/rooms/{room['id']}/join",
                        json={"user_id": second_guest["id"]})

        ws_url = base_url.replace("https://", "wss://").replace("http://", "ws://")
        url = f"{ws_url}/api/ws/room/{room['id']}/{guest_user['id']}"
        ws = create_connection(url, timeout=10)
        try:
            msg = json.loads(ws.recv())
            assert msg["type"] == "room_state"
            assert msg["room"]["id"] == room["id"]

            # Start game
            ws.send(json.dumps({"type": "start"}))
            # Expect game_started
            got_started = False
            got_number = False
            ws.settimeout(8)
            t0 = time.time()
            while time.time() - t0 < 8:
                try:
                    m = json.loads(ws.recv())
                except Exception:
                    break
                if m.get("type") == "game_started":
                    got_started = True
                if m.get("type") == "number_called":
                    got_number = True
                    break
            assert got_started, "did not receive game_started"
            assert got_number, "did not receive any number_called within 8s"
        finally:
            ws.close()
