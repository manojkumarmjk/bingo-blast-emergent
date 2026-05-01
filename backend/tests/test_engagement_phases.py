"""
Phase A/B/C engagement tests:
- Missions (Phase B)
- Battle Pass (Phase C)
- Collection (Phase B)
- Streak / Daily reward upgraded (Phase B)
- Live Event (Phase C)
- Computer match multi-card, dab, use-powerup, claim-bingo with dabbed_numbers (Phase A)
"""
import os
import pytest
import requests


@pytest.fixture(scope="module")
def eng_user(api_client, base_url):
    r = api_client.post(
        f"{base_url}/api/guest/login",
        json={"device_id": f"TEST_eng_{os.getpid()}"}
    )
    assert r.status_code == 200, r.text
    return r.json()


# ---------------- Guest login returns new fields ----------------
class TestGuestLoginExtras:
    def test_guest_has_phase_fields(self, eng_user):
        u = eng_user
        assert "streak_days" in u
        assert "bp_xp" in u
        assert "bp_premium" in u and u["bp_premium"] is False
        assert "bp_claimed" in u and "free" in u["bp_claimed"] and "premium" in u["bp_claimed"]
        assert "collection" in u and isinstance(u["collection"], list)
        assert "powerups" in u
        for k in ("dauber", "reveal", "double"):
            assert k in u["powerups"]
        assert "stats" in u
        for k in ("dabs", "speed_dabs", "bot_wins", "spins", "dailies"):
            assert k in u["stats"]


# ---------------- Missions ----------------
class TestMissions:
    def test_get_missions_returns_3(self, api_client, base_url, eng_user):
        r = api_client.get(f"{base_url}/api/missions/{eng_user['id']}")
        assert r.status_code == 200, r.text
        d = r.json()
        assert "missions" in d and len(d["missions"]) == 3
        for m in d["missions"]:
            for k in ("id", "title", "target", "counter", "reward", "icon", "progress", "claimed"):
                assert k in m, f"missing {k}"
        pytest.mission_ids = [m["id"] for m in d["missions"]]

    def test_claim_incomplete_rejected(self, api_client, base_url, eng_user):
        mid = pytest.mission_ids[0]
        r = api_client.post(
            f"{base_url}/api/missions/claim",
            json={"user_id": eng_user["id"], "mission_id": mid},
        )
        # Should be 400 because mission not yet complete
        assert r.status_code == 400, r.text

    def test_claim_unknown_mission(self, api_client, base_url, eng_user):
        r = api_client.post(
            f"{base_url}/api/missions/claim",
            json={"user_id": eng_user["id"], "mission_id": "does_not_exist_xyz"},
        )
        assert r.status_code == 404


# ---------------- Battle Pass ----------------
class TestBattlePass:
    def test_bp_structure(self, api_client, base_url, eng_user):
        r = api_client.get(f"{base_url}/api/battle-pass/{eng_user['id']}")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["season"]
        assert len(d["tiers"]) == 50
        for t in d["tiers"][:3]:
            assert "tier" in t and "xp_required" in t and "free" in t and "premium" in t
        assert "xp" in d and "premium" in d and "claimed" in d

    def test_bp_claim_without_xp_rejected(self, api_client, base_url, eng_user):
        r = api_client.post(
            f"{base_url}/api/battle-pass/claim",
            json={"user_id": eng_user["id"], "tier": 5, "track": "free"},
        )
        assert r.status_code == 400  # not enough xp

    def test_bp_claim_premium_without_pass_rejected(self, api_client, base_url, eng_user):
        r = api_client.post(
            f"{base_url}/api/battle-pass/claim",
            json={"user_id": eng_user["id"], "tier": 1, "track": "premium"},
        )
        # either not enough XP or premium-not-active — both 400
        assert r.status_code == 400

    def test_activate_premium(self, api_client, base_url, eng_user):
        r = api_client.post(
            f"{base_url}/api/battle-pass/activate-premium",
            params={"user_id": eng_user["id"]},
        )
        assert r.status_code == 200
        assert r.json()["ok"] is True
        # verify persisted
        r2 = api_client.get(f"{base_url}/api/battle-pass/{eng_user['id']}")
        assert r2.json()["premium"] is True


# ---------------- Collection ----------------
class TestCollection:
    def test_get_collection(self, api_client, base_url, eng_user):
        r = api_client.get(f"{base_url}/api/collection/{eng_user['id']}")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["set"]["id"] == "set_neon"
        assert len(d["set"]["balls"]) == 12
        for b in d["set"]["balls"]:
            assert "owned" in b and "rarity" in b
        assert "complete" in d and "owned_count" in d

    def test_claim_incomplete_rejected(self, api_client, base_url, eng_user):
        r = api_client.post(
            f"{base_url}/api/collection/claim",
            params={"user_id": eng_user["id"]},
        )
        assert r.status_code == 400


# ---------------- Streak / Daily reward upgraded ----------------
class TestStreak:
    def test_get_streak(self, api_client, base_url, eng_user):
        r = api_client.get(f"{base_url}/api/streak/{eng_user['id']}")
        assert r.status_code == 200
        d = r.json()
        assert d["rewards"] == [50, 75, 100, 150, 200, 300, 500]
        assert "streak_days" in d

    def test_daily_claim_returns_streak_info(self, api_client, base_url, eng_user):
        # fresh user — first claim should succeed with streak_days=1 and reward=50
        r = api_client.post(
            f"{base_url}/api/daily-reward/claim",
            params={"user_id": eng_user["id"]},
        )
        assert r.status_code in (200, 400)
        if r.status_code == 200:
            d = r.json()
            assert "reward" in d and "streak_days" in d and "next_reward" in d
            assert d["streak_days"] >= 1


# ---------------- Live Event ----------------
class TestEvent:
    def test_event_current(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/event/current")
        assert r.status_code == 200
        d = r.json()
        assert d["id"] in ("power_hour", "weekend_blast", "power_hour_upcoming")
        assert d["multiplier"] == 2


# ---------------- Computer match Phase A ----------------
class TestComputerMatchPhaseA:
    def test_multi_card_create(self, api_client, base_url, eng_user):
        r = api_client.post(
            f"{base_url}/api/computer-match",
            json={"user_id": eng_user["id"], "difficulty": "easy", "num_cards": 2},
        )
        assert r.status_code == 200
        d = r.json()
        assert len(d["user_cards"]) == 2
        assert d["reward"] == 300
        pytest.eng_match_id = d["id"]
        pytest.eng_cards = d["user_cards"]

    def test_dab_stats_increment(self, api_client, base_url, eng_user):
        before = api_client.get(f"{base_url}/api/user/{eng_user['id']}").json()["stats"]
        r = api_client.post(
            f"{base_url}/api/computer-match/dab",
            json={
                "match_id": pytest.eng_match_id,
                "user_id": eng_user["id"],
                "number": 5,
                "speed_bonus": True,
            },
        )
        assert r.status_code == 200 and r.json()["ok"] is True
        after = api_client.get(f"{base_url}/api/user/{eng_user['id']}").json()["stats"]
        assert after["dabs"] == before["dabs"] + 1
        assert after["speed_dabs"] == before["speed_dabs"] + 1

    def test_use_powerup_reveal(self, api_client, base_url, eng_user):
        r = api_client.post(
            f"{base_url}/api/computer-match/use-powerup",
            params={
                "match_id": pytest.eng_match_id,
                "user_id": eng_user["id"],
                "powerup_id": "reveal",
            },
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["effect"]["powerup_id"] == "reveal"
        assert isinstance(d["effect"]["peek"], list)
        assert 1 <= len(d["effect"]["peek"]) <= 3

    def test_claim_bingo_with_uncalled_number_rejected(self, api_client, base_url, eng_user):
        # create fresh match, try to claim with dabbed numbers that were never called
        r = api_client.post(
            f"{base_url}/api/computer-match",
            json={"user_id": eng_user["id"], "difficulty": "easy", "num_cards": 1},
        )
        mid = r.json()["id"]
        card = r.json()["user_cards"][0]
        # dab entire first row (likely uncalled because no calls yet)
        dabbed = [card[0][c] for c in range(5) if card[0][c] is not None]
        r2 = api_client.post(
            f"{base_url}/api/computer-match/claim-bingo",
            json={
                "match_id": mid,
                "user_id": eng_user["id"],
                "dabbed_numbers": dabbed,
                "card_index": 0,
            },
        )
        assert r2.status_code == 200
        d = r2.json()
        assert d["valid"] is False
        assert "uncalled" in d["message"].lower() or "line" in d["message"].lower()

    def test_claim_bingo_valid_line(self, api_client, base_url, eng_user):
        # create a match, call numbers until a row is fully covered, then claim
        r = api_client.post(
            f"{base_url}/api/computer-match",
            json={"user_id": eng_user["id"], "difficulty": "easy", "num_cards": 1},
        )
        mid = r.json()["id"]
        card = r.json()["user_cards"][0]
        # strategy: pick row 0 (all 5 real numbers)
        target = set(n for n in card[0] if n is not None)
        # call numbers until match ends or target is called
        called_all = set()
        for _ in range(75):
            cr = api_client.post(
                f"{base_url}/api/computer-match/call",
                json={"match_id": mid},
            )
            if cr.status_code != 200:
                break
            data = cr.json()
            called_all = set(data["called_numbers"])
            if data["status"] != "playing":
                # bot may have won — skip
                pytest.skip("bot won before we could dab")
            if target.issubset(called_all):
                break
        # claim with the row dabbed
        r2 = api_client.post(
            f"{base_url}/api/computer-match/claim-bingo",
            json={
                "match_id": mid,
                "user_id": eng_user["id"],
                "dabbed_numbers": list(target),
                "card_index": 0,
            },
        )
        assert r2.status_code == 200, r2.text
        d = r2.json()
        assert d["valid"] is True, d
        assert d["reward"] >= 150


# ---------------- Ensure extras migration (simulated) ----------------
class TestEnsureExtras:
    def test_get_user_backfills(self, api_client, base_url, eng_user):
        r = api_client.get(f"{base_url}/api/user/{eng_user['id']}")
        assert r.status_code == 200
        u = r.json()
        assert "powerups" in u and "stats" in u and "bp_claimed" in u
