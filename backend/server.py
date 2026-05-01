from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, random, asyncio, json, uuid
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]
app = FastAPI(title="Bingo Blast API")
api_router = APIRouter(prefix="/api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# ---------------------- Utils ----------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def iso(dt: datetime) -> str:
    return dt.isoformat()

def strip_mongo(doc: dict) -> dict:
    if not doc: return doc
    doc.pop("_id", None)
    for k, v in list(doc.items()):
        if isinstance(v, datetime):
            doc[k] = v.isoformat()
    return doc

def generate_card() -> List[List[Optional[int]]]:
    cols = []
    for low, high in [(1,15),(16,30),(31,45),(46,60),(61,75)]:
        cols.append(random.sample(range(low, high+1), 5))
    card = []
    for r in range(5):
        row = []
        for c in range(5):
            row.append(None if (r==2 and c==2) else cols[c][r])
        card.append(row)
    return card

def check_line(card, dabbed_set):
    """dabbed_set: set of actual numbers user marked. FREE center always counts."""
    def m(v): return v is None or v in dabbed_set
    for r in range(5):
        if all(m(card[r][c]) for c in range(5)): return True
    for c in range(5):
        if all(m(card[r][c]) for r in range(5)): return True
    if all(m(card[i][i]) for i in range(5)): return True
    if all(m(card[i][4-i]) for i in range(5)): return True
    return False

def near_bingo(card, dabbed_set):
    """Return number of lines that are 1-cell away from bingo."""
    def m(v): return v is None or v in dabbed_set
    lines = []
    for r in range(5): lines.append([card[r][c] for c in range(5)])
    for c in range(5): lines.append([card[r][c] for r in range(5)])
    lines.append([card[i][i] for i in range(5)])
    lines.append([card[i][4-i] for i in range(5)])
    near = 0
    for ln in lines:
        missing = sum(1 for v in ln if not m(v))
        if missing == 1: near += 1
    return near

AVATARS = [
    "https://images.unsplash.com/photo-1758600433991-933fb663161f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwyfHxjaGVlcmZ1bCUyMHBlcnNvbiUyMHBvcnRyYWl0JTIwY29sb3JmdWwlMjBiYWNrZ3JvdW5kfGVufDB8fHx8MTc3NzYyMjkxOHww&ixlib=rb-4.1.0&q=85",
    "https://images.unsplash.com/photo-1758600587811-e9a20851cf7d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwxfHxjaGVlcmZ1bCUyMHBlcnNvbiUyMHBvcnRyYWl0JTIwY29sb3JmdWwlMjBiYWNrZ3JvdW5kfGVufDB8fHx8MTc3NzYyMjkxOHww&ixlib=rb-4.1.0&q=85",
    "https://images.unsplash.com/photo-1758600433358-b44bf8a32c8f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwzfHxjaGVlcmZ1bCUyMHBlcnNvbiUyMHBvcnRyYWl0JTIwY29sb3JmdWwlMjBiYWNrZ3JvdW5kfGVufDB8fHx8MTc3NzYyMjkxOHww&ixlib=rb-4.1.0&q=85",
]
USERNAMES = ["BingoKing","LuckySpin","StarPlayer","NumberNinja","CardMaster","RoyalPlay","NeonDice","QuickDraw","AceChamp","BlastHero"]


# ---------------------- Seed catalogs ----------------------
SHOP_ITEMS = [
    {"id":"coins_100","name":"Starter Pack","type":"bcoins","amount":100,"price_inr":25,"badge":"POPULAR"},
    {"id":"coins_500","name":"Boost Pack","type":"bcoins","amount":500,"price_inr":99,"badge":None},
    {"id":"coins_1200","name":"Mega Pack","type":"bcoins","amount":1200,"price_inr":199,"badge":"BEST VALUE"},
    {"id":"coins_3000","name":"Ultra Pack","type":"bcoins","amount":3000,"price_inr":449,"badge":None},
    {"id":"card_prestige","name":"Prestige Room Card","type":"room_card","tier":"prestige","price_inr":25,"badge":None},
    {"id":"card_luxury","name":"Luxury Room Card","type":"room_card","tier":"luxury","price_inr":150,"badge":"PREMIUM"},
    {"id":"pwr_dauber","name":"Auto Dauber x3","type":"powerup","powerup_id":"dauber","amount":3,"price_inr":49,"badge":None},
    {"id":"pwr_reveal","name":"Reveal x5","type":"powerup","powerup_id":"reveal","amount":5,"price_inr":39,"badge":None},
]
ACHIEVEMENTS = [
    {"id":"first_win","name":"First Win","desc":"Win your first match","target":1,"icon":"trophy","reward":50},
    {"id":"win_10","name":"Rising Star","desc":"Win 10 matches","target":10,"icon":"star","reward":200},
    {"id":"win_50","name":"Bingo Legend","desc":"Win 50 matches","target":50,"icon":"crown","reward":1000},
    {"id":"play_25","name":"Regular Player","desc":"Play 25 matches","target":25,"icon":"gamepad","reward":150},
    {"id":"streak_5","name":"On Fire","desc":"5 win streak","target":5,"icon":"fire","reward":300},
    {"id":"social","name":"Socialite","desc":"Add 5 friends","target":5,"icon":"users","reward":100},
]
TOURNAMENTS = [
    {"id":"tour_daily","name":"Daily Rush","desc":"Quick daily tournament","entry_fee":50,"prize_pool":5000,"status":"ongoing","starts_in_hours":0,"players":142,"max_players":256},
    {"id":"tour_weekend","name":"Weekend Blast","desc":"The big weekend showdown","entry_fee":150,"prize_pool":25000,"status":"upcoming","starts_in_hours":18,"players":87,"max_players":512},
    {"id":"tour_mega","name":"Mega Jackpot","desc":"Monthly championship","entry_fee":500,"prize_pool":100000,"status":"upcoming","starts_in_hours":72,"players":24,"max_players":1024},
]

# Daily mission templates (3 random per day)
MISSION_TEMPLATES = [
    {"id":"win_2","title":"Win 2 matches","target":2,"counter":"wins","reward":100,"icon":"trophy"},
    {"id":"win_5","title":"Win 5 matches","target":5,"counter":"wins","reward":250,"icon":"medal"},
    {"id":"dab_50","title":"Dab 50 numbers","target":50,"counter":"dabs","reward":80,"icon":"check-circle"},
    {"id":"dab_150","title":"Dab 150 numbers","target":150,"counter":"dabs","reward":200,"icon":"check-all"},
    {"id":"play_3","title":"Play 3 matches","target":3,"counter":"matches","reward":60,"icon":"gamepad-variant"},
    {"id":"computer_2","title":"Beat the Bot 2x","target":2,"counter":"bot_wins","reward":120,"icon":"robot"},
    {"id":"speed_10","title":"10 speed dabs","target":10,"counter":"speed_dabs","reward":150,"icon":"flash"},
    {"id":"streak_3","title":"Win 3 in a row","target":3,"counter":"streak","reward":300,"icon":"fire"},
    {"id":"spin_1","title":"Spin the wheel","target":1,"counter":"spins","reward":50,"icon":"ferris-wheel"},
    {"id":"claim_daily","title":"Claim daily reward","target":1,"counter":"dailies","reward":30,"icon":"gift"},
]

# 7-day login streak calendar
STREAK_REWARDS = [50, 75, 100, 150, 200, 300, 500]

# Collection set (first set of 12 themed balls)
COLLECTION_SET = {
    "id":"set_neon","name":"Neon Nights","desc":"Collect all 12 Neon balls to earn 2000 Bcoins",
    "reward":2000,
    "balls":[
        {"id":f"neon_{i}","name":f"Neon {i:02d}","rarity":"common" if i<=6 else "rare" if i<=10 else "epic","color":c}
        for i,c in enumerate(["#FF3366","#FFD166","#06D6A0","#4CC9F0","#9D4EDD","#F72585","#FCA311","#4361EE","#7209B7","#EF476F","#06D6A0","#FFD166"],1)
    ]
}

# Battle pass: 50 tiers with free+premium rewards
def _bp_tiers():
    tiers = []
    for i in range(1, 51):
        free = {"type":"bcoins","amount":25 + (i * 5)}
        if i % 10 == 0: free = {"type":"bcoins","amount":500}
        elif i % 5 == 0: free = {"type":"powerup","powerup_id":"dauber","amount":1}
        prem = {"type":"bcoins","amount":75 + (i * 10)}
        if i % 10 == 0: prem = {"type":"bcoins","amount":2000}
        elif i % 5 == 0: prem = {"type":"powerup","powerup_id":"reveal","amount":2}
        elif i % 3 == 0: prem = {"type":"collection","ball_id":f"neon_{((i // 3) % 12) + 1}"}
        tiers.append({"tier":i,"xp_required":i*200,"free":free,"premium":prem})
    return tiers

BATTLE_PASS = {"season":"Season 1 — Neon Blast","ends_in_days":28,"tiers":_bp_tiers(),"premium_price_inr":299}


# ---------------------- Models ----------------------
class GuestLoginRequest(BaseModel):
    device_id: Optional[str] = None

class UpdateProfileRequest(BaseModel):
    user_id: str
    username: Optional[str] = None
    avatar: Optional[str] = None

class CreateRoomRequest(BaseModel):
    user_id: str; name: str; room_type: str
    max_players: int = 10; match_count: int = 1
    entry_fee: int = 0; is_private: bool = False

class JoinRoomRequest(BaseModel):
    user_id: str

class ComputerMatchRequest(BaseModel):
    user_id: str; difficulty: str = "medium"; num_cards: int = 1

class CallRequest(BaseModel):
    match_id: str

class ClaimBingoRequest(BaseModel):
    match_id: str; user_id: str
    dabbed_numbers: List[int] = []
    card_index: int = 0  # which of the user's cards has bingo

class DabRequest(BaseModel):
    match_id: str; user_id: str; number: int; speed_bonus: bool = False

class AddFriendRequest(BaseModel):
    user_id: str; friend_code: str

class PurchaseRequest(BaseModel):
    user_id: str; item_id: str

class RazorpayOrderRequest(BaseModel):
    user_id: str; item_id: str

class RazorpayVerifyRequest(BaseModel):
    user_id: str; item_id: str
    razorpay_order_id: str; razorpay_payment_id: str; razorpay_signature: str

class ClaimMissionRequest(BaseModel):
    user_id: str; mission_id: str

class BPClaimRequest(BaseModel):
    user_id: str; tier: int; track: str  # free | premium


# ---------------------- User helpers ----------------------
def _default_user_extras() -> dict:
    return {
        "streak_days": 0,
        "bp_xp": 0, "bp_premium": False, "bp_claimed": {"free": [], "premium": []},
        "missions": {}, "missions_date": None,
        "collection": [],
        "powerups": {"dauber": 2, "reveal": 2, "double": 1},
        "stats": {"dabs": 0, "speed_dabs": 0, "bot_wins": 0, "spins": 0, "dailies": 0},
        "vip_active": False, "vip_expires_at": None,
        "equipped": {"frame": "frame_default", "title": None, "background": "bg_default"},
        "owned_cosmetics": ["frame_default", "bg_default"],
        "guild_id": None,
        "push_token": None,
    }

async def _ensure_extras(user: dict) -> dict:
    """Backfill extra fields for users created before the upgrade."""
    defaults = _default_user_extras()
    updates = {}
    for k, v in defaults.items():
        if k not in user or user.get(k) is None:
            updates[k] = v
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
        user.update(updates)
    return user

async def _today_missions(user: dict) -> list:
    """Return today's missions (generate fresh if date changed)."""
    today = now_utc().strftime("%Y-%m-%d")
    if user.get("missions_date") != today or not user.get("missions"):
        picks = random.sample(MISSION_TEMPLATES, 3)
        missions = {m["id"]: {"progress": 0, "claimed": False, **m} for m in picks}
        await db.users.update_one({"id": user["id"]}, {"$set": {"missions": missions, "missions_date": today}})
        user["missions"] = missions
        user["missions_date"] = today
    return list(user["missions"].values())

async def _track_counter(user_id: str, counter: str, amount: int = 1):
    """Increment stats + update mission progress for matching counters."""
    user = await db.users.find_one({"id": user_id})
    if not user: return
    user = await _ensure_extras(user)
    await _today_missions(user)
    user = await db.users.find_one({"id": user_id})
    stats = user.get("stats", {}) or {}
    stats[counter] = stats.get(counter, 0) + amount
    missions = user.get("missions", {}) or {}
    for mid, m in missions.items():
        if m.get("counter") == counter and not m.get("claimed"):
            m["progress"] = min(m["target"], m.get("progress", 0) + amount)
    # For wins counter also update 'streak' mission via user.streak
    await db.users.update_one({"id": user_id}, {"$set": {"stats": stats, "missions": missions}})

async def _award_bp_xp(user_id: str, xp: int):
    await db.users.update_one({"id": user_id}, {"$inc": {"bp_xp": xp}})


# ---------------------- Endpoints ----------------------
@api_router.get("/")
async def root():
    return {"app": "Bingo Blast", "status": "ok"}


@api_router.post("/guest/login")
async def guest_login(req: GuestLoginRequest):
    if req.device_id:
        existing = await db.users.find_one({"device_id": req.device_id})
        if existing:
            existing = await _ensure_extras(existing)
            return strip_mongo(existing)
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id, "device_id": req.device_id or user_id,
        "username": f"{random.choice(USERNAMES)}{random.randint(100,999)}",
        "avatar": random.choice(AVATARS),
        "bcoins": 500, "level": 1, "xp": 0, "wins": 0, "matches": 0, "streak": 0,
        "is_guest": True, "friend_code": user_id.split("-")[0].upper(),
        "achievements": {}, "friends": [],
        "settings": {"sound": True, "music": True, "notifications": True},
        "created_at": now_utc(), "last_daily_claim": None, "last_spin_claim": None,
        **_default_user_extras(),
    }
    await db.users.insert_one(user)
    return strip_mongo(user)


@api_router.get("/user/{user_id}")
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user: raise HTTPException(404, "User not found")
    user = await _ensure_extras(user)
    return strip_mongo(user)


@api_router.post("/user/update")
async def update_user(req: UpdateProfileRequest):
    updates = {}
    if req.username: updates["username"] = req.username
    if req.avatar: updates["avatar"] = req.avatar
    if not updates: raise HTTPException(400, "No updates")
    res = await db.users.update_one({"id": req.user_id}, {"$set": updates})
    if res.matched_count == 0: raise HTTPException(404, "User not found")
    return {"ok": True}


@api_router.post("/daily-reward/claim")
async def claim_daily(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user: raise HTTPException(404, "User not found")
    user = await _ensure_extras(user)
    last = user.get("last_daily_claim")
    streak_days = user.get("streak_days", 0)
    if last:
        last_dt = last if isinstance(last, datetime) else datetime.fromisoformat(last)
        if last_dt.tzinfo is None: last_dt = last_dt.replace(tzinfo=timezone.utc)
        delta = now_utc() - last_dt
        if delta < timedelta(hours=20):
            raise HTTPException(400, f"Already claimed. Come back in ~{20 - int(delta.total_seconds()//3600)}h")
        # Within 40h? maintain streak; else reset
        if delta < timedelta(hours=40):
            streak_days = min(7, streak_days + 1) if streak_days < 7 else 1  # wrap on day 8
        else:
            streak_days = 1
    else:
        streak_days = 1
    reward = STREAK_REWARDS[streak_days - 1]
    await db.users.update_one({"id": user_id}, {"$set": {"last_daily_claim": now_utc(), "streak_days": streak_days},
                                                 "$inc": {"bcoins": reward}})
    await db.transactions.insert_one({"id": str(uuid.uuid4()), "user_id": user_id, "type": "daily_reward",
                                       "amount": reward, "description": f"Daily streak day {streak_days}",
                                       "created_at": now_utc()})
    await _track_counter(user_id, "dailies")
    await _award_bp_xp(user_id, 50)
    return {"reward": reward, "streak_days": streak_days, "next_reward": STREAK_REWARDS[streak_days % 7]}


@api_router.get("/streak/{user_id}")
async def streak_info(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user: raise HTTPException(404, "User not found")
    user = await _ensure_extras(user)
    return {
        "streak_days": user.get("streak_days", 0),
        "rewards": STREAK_REWARDS,
        "last_daily_claim": iso(user["last_daily_claim"]) if isinstance(user.get("last_daily_claim"), datetime) else user.get("last_daily_claim"),
    }


@api_router.post("/spin-wheel/spin")
async def spin_wheel(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user: raise HTTPException(404, "User not found")
    user = await _ensure_extras(user)
    last = user.get("last_spin_claim")
    if last:
        last_dt = last if isinstance(last, datetime) else datetime.fromisoformat(last)
        if last_dt.tzinfo is None: last_dt = last_dt.replace(tzinfo=timezone.utc)
        if now_utc() - last_dt < timedelta(hours=6):
            hleft = max(1, 6 - int((now_utc() - last_dt).total_seconds() // 3600))
            raise HTTPException(400, f"Wheel cooling down. Try in ~{hleft}h")
    segments = [
        {"label":"25 BC","type":"bcoins","amount":25,"weight":30},
        {"label":"50 BC","type":"bcoins","amount":50,"weight":25},
        {"label":"100 BC","type":"bcoins","amount":100,"weight":15},
        {"label":"Neon Ball","type":"collection","amount":1,"weight":10},
        {"label":"250 BC","type":"bcoins","amount":250,"weight":8},
        {"label":"500 BC","type":"bcoins","amount":500,"weight":5},
        {"label":"Power-up","type":"powerup","amount":1,"weight":5},
        {"label":"JACKPOT","type":"bcoins","amount":1000,"weight":2},
    ]
    weights = [s["weight"] for s in segments]
    choice = random.choices(segments, weights=weights, k=1)[0]
    idx = segments.index(choice)
    updates = {"$set": {"last_spin_claim": now_utc()}}
    inc: Dict[str, int] = {}
    if choice["type"] == "bcoins": inc["bcoins"] = choice["amount"]
    elif choice["type"] == "powerup":
        pid = random.choice(["dauber","reveal","double"])
        inc[f"powerups.{pid}"] = 1
    elif choice["type"] == "collection":
        ball_id = random.choice([b["id"] for b in COLLECTION_SET["balls"]])
        await db.users.update_one({"id": user_id}, {"$addToSet": {"collection": ball_id}})
    if inc: updates["$inc"] = inc
    await db.users.update_one({"id": user_id}, updates)
    await db.transactions.insert_one({"id": str(uuid.uuid4()), "user_id": user_id, "type": "spin_wheel",
                                       "amount": choice["amount"] if choice["type"]=="bcoins" else 0,
                                       "description": f"Spin: {choice['label']}", "created_at": now_utc()})
    await _track_counter(user_id, "spins")
    return {"segment_index": idx, "reward": choice}


# ---------------------- Rooms ----------------------
ROOM_DEFAULTS = {
    "free":{"entry_fee":0,"prize":100},"prestige":{"entry_fee":25,"prize":200},
    "luxury":{"entry_fee":150,"prize":1200},"custom":{"entry_fee":10,"prize":80},
    "tournament":{"entry_fee":50,"prize":5000},
}

@api_router.get("/rooms")
async def list_rooms(filter: Optional[str] = None):
    query: Dict[str, Any] = {"status": {"$in": ["waiting","playing"]}}
    if filter == "free": query["entry_fee"] = 0
    elif filter == "paid": query["entry_fee"] = {"$gt": 0}
    elif filter == "tournament": query["room_type"] = "tournament"
    rooms = await db.rooms.find(query).sort("created_at", -1).to_list(100)
    return [strip_mongo(r) for r in rooms]

@api_router.post("/rooms")
async def create_room(req: CreateRoomRequest):
    user = await db.users.find_one({"id": req.user_id})
    if not user: raise HTTPException(404, "User not found")
    d = ROOM_DEFAULTS.get(req.room_type, ROOM_DEFAULTS["custom"])
    entry_fee = req.entry_fee if req.entry_fee is not None else d["entry_fee"]
    room = {
        "id": str(uuid.uuid4()), "code": str(uuid.uuid4()).split("-")[0].upper(),
        "name": req.name, "room_type": req.room_type,
        "max_players": req.max_players, "match_count": req.match_count,
        "entry_fee": entry_fee, "prize": d["prize"], "host_id": req.user_id,
        "players": [{"user_id": user["id"], "username": user["username"], "avatar": user["avatar"], "ready": True, "is_host": True}],
        "status": "waiting", "called_numbers": [], "cards": {}, "winner_id": None,
        "is_private": req.is_private, "created_at": now_utc(),
    }
    await db.rooms.insert_one(room)
    return strip_mongo(room)

@api_router.get("/rooms/{room_id}")
async def get_room(room_id: str):
    room = await db.rooms.find_one({"id": room_id})
    if not room: room = await db.rooms.find_one({"code": room_id.upper()})
    if not room: raise HTTPException(404, "Room not found")
    return strip_mongo(room)

@api_router.post("/rooms/{room_id}/join")
async def join_room(room_id: str, req: JoinRoomRequest):
    user = await db.users.find_one({"id": req.user_id})
    if not user: raise HTTPException(404, "User not found")
    room = await db.rooms.find_one({"id": room_id}) or await db.rooms.find_one({"code": room_id.upper()})
    if not room: raise HTTPException(404, "Room not found")
    if room["status"] != "waiting": raise HTTPException(400, "Room already started")
    if any(p["user_id"] == req.user_id for p in room["players"]): return strip_mongo(room)
    if len(room["players"]) >= room["max_players"]: raise HTTPException(400, "Room full")
    if user["bcoins"] < room["entry_fee"]: raise HTTPException(400, "Not enough Bcoins")
    np = {"user_id": user["id"], "username": user["username"], "avatar": user["avatar"], "ready": False, "is_host": False}
    await db.rooms.update_one({"id": room["id"]}, {"$push": {"players": np}})
    if room["entry_fee"] > 0:
        await db.users.update_one({"id": req.user_id}, {"$inc": {"bcoins": -room["entry_fee"]}})
        await db.transactions.insert_one({"id": str(uuid.uuid4()), "user_id": req.user_id, "type": "room_entry",
                                           "amount": -room["entry_fee"], "description": f"Joined {room['name']}",
                                           "created_at": now_utc()})
    room = await db.rooms.find_one({"id": room["id"]})
    await manager.broadcast(room["id"], {"type": "player_joined", "room": strip_mongo(dict(room))})
    return strip_mongo(room)


# ---------------------- Computer match (MULTI-CARD + MANUAL DAB) ----------------------
@api_router.post("/computer-match")
async def create_computer_match(req: ComputerMatchRequest):
    user = await db.users.find_one({"id": req.user_id})
    if not user: raise HTTPException(404, "User not found")
    user = await _ensure_extras(user)
    num_cards = max(1, min(4, req.num_cards or 1))
    match_id = str(uuid.uuid4())
    user_cards = [generate_card() for _ in range(num_cards)]
    bot_card = generate_card()
    match = {
        "id": match_id, "mode": "computer", "user_id": req.user_id,
        "difficulty": req.difficulty, "num_cards": num_cards,
        "user_cards": user_cards, "bot_card": bot_card,
        "bot_name": "Bingo Bot", "bot_avatar": AVATARS[0],
        "called_numbers": [], "last_call_at": None,
        "status": "playing", "winner": None,
        "reward": 150 * num_cards,
        "powerups_used": {"dauber": 0, "reveal": 0, "double": 0},
        "revealed_peek": [],
        "created_at": now_utc(),
    }
    await db.matches.insert_one(match)
    await _track_counter(req.user_id, "matches")
    return strip_mongo(match)


@api_router.post("/computer-match/call")
async def call_number(req: CallRequest):
    match = await db.matches.find_one({"id": req.match_id})
    if not match: raise HTTPException(404, "Match not found")
    if match["status"] != "playing": raise HTTPException(400, "Match finished")
    called = match["called_numbers"]
    remaining = [n for n in range(1, 76) if n not in called]
    if not remaining: raise HTTPException(400, "No numbers left")
    # If there's a peeked next number, use the first peeked one
    peek = match.get("revealed_peek", [])
    if peek and peek[0] in remaining:
        next_num = peek[0]
        peek = peek[1:]
    else:
        next_num = random.choice(remaining)
        peek = []
    called.append(next_num)
    # Bot auto-dabs everything (simple). Decides whether to claim.
    bot_has = check_line(match["bot_card"], set(called))
    prob = {"easy":0.3,"medium":0.7,"hard":1.0}.get(match.get("difficulty","medium"), 0.7)
    winner = None
    updates = {"called_numbers": called, "last_call_at": now_utc(), "revealed_peek": peek}
    if bot_has and random.random() < prob:
        winner = "bot"
        updates["status"] = "finished"
        updates["winner"] = "bot"
        await db.users.update_one({"id": match["user_id"]}, {"$inc": {"matches": 1}, "$set": {"streak": 0}})
    await db.matches.update_one({"id": req.match_id}, {"$set": updates})
    match = await db.matches.find_one({"id": req.match_id})
    return strip_mongo(match)


@api_router.post("/computer-match/dab")
async def dab_number(req: DabRequest):
    """Track a manual dab for stats/missions/BP XP (client is source of truth for UI)."""
    await _track_counter(req.user_id, "dabs")
    if req.speed_bonus: await _track_counter(req.user_id, "speed_dabs")
    await _award_bp_xp(req.user_id, 2 if req.speed_bonus else 1)
    return {"ok": True}


@api_router.post("/computer-match/use-powerup")
async def use_powerup(match_id: str, user_id: str, powerup_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user: raise HTTPException(404, "User not found")
    user = await _ensure_extras(user)
    if user["powerups"].get(powerup_id, 0) <= 0:
        raise HTTPException(400, "No power-ups left")
    match = await db.matches.find_one({"id": match_id})
    if not match or match["status"] != "playing": raise HTTPException(400, "Match not active")
    # Consume power-up
    await db.users.update_one({"id": user_id}, {"$inc": {f"powerups.{powerup_id}": -1}})
    effect = {"powerup_id": powerup_id}
    if powerup_id == "reveal":
        # Pre-determine next 3 numbers
        called = match["called_numbers"]
        remaining = [n for n in range(1, 76) if n not in called]
        peek = random.sample(remaining, min(3, len(remaining)))
        await db.matches.update_one({"id": match_id}, {"$set": {"revealed_peek": peek}})
        effect["peek"] = peek
    elif powerup_id == "dauber":
        # Auto-dab next 3 called numbers (client handles UI; server just tracks)
        effect["auto_dabs"] = 3
    elif powerup_id == "double":
        # Mark match for 2x reward
        await db.matches.update_one({"id": match_id}, {"$set": {"double_reward": True}})
        effect["double_reward"] = True
    return {"ok": True, "effect": effect}


@api_router.post("/computer-match/claim-bingo")
async def claim_bingo_computer(req: ClaimBingoRequest):
    match = await db.matches.find_one({"id": req.match_id})
    if not match: raise HTTPException(404, "Match not found")
    if match["status"] != "playing": raise HTTPException(400, "Match finished")
    cards = match.get("user_cards") or [match.get("user_card")]
    if req.card_index >= len(cards): raise HTTPException(400, "Invalid card index")
    card = cards[req.card_index]
    dabbed_set = set(req.dabbed_numbers)
    called_set = set(match["called_numbers"])
    # Dabbed numbers must all be in called set (can't dab uncalled numbers)
    if not dabbed_set.issubset(called_set):
        await db.matches.update_one({"id": req.match_id}, {"$set": {"status": "finished", "winner": "bot"}})
        return {"valid": False, "message": "You dabbed an uncalled number!"}
    if not check_line(card, dabbed_set):
        await db.matches.update_one({"id": req.match_id}, {"$set": {"status": "finished", "winner": "bot"}})
        return {"valid": False, "message": "No complete line yet!"}
    # Valid!
    reward = match.get("reward", 150)
    if match.get("double_reward"): reward *= 2
    await db.matches.update_one({"id": req.match_id}, {"$set": {"status": "finished", "winner": "user"}})
    await db.users.update_one({"id": req.user_id}, {"$inc": {"matches": 1, "wins": 1, "bcoins": reward, "streak": 1, "xp": 50}})
    await db.transactions.insert_one({"id": str(uuid.uuid4()), "user_id": req.user_id, "type": "match_win",
                                       "amount": reward, "description": "Bingo win vs Bot", "created_at": now_utc()})
    await _track_counter(req.user_id, "wins")
    await _track_counter(req.user_id, "bot_wins")
    # Update streak mission
    u = await db.users.find_one({"id": req.user_id})
    missions = u.get("missions", {}) or {}
    for mid, m in missions.items():
        if m.get("counter") == "streak":
            m["progress"] = max(m.get("progress",0), u.get("streak", 0))
    await db.users.update_one({"id": req.user_id}, {"$set": {"missions": missions}})
    await _award_bp_xp(req.user_id, 100)
    await _update_achievements(req.user_id)
    return {"valid": True, "reward": reward, "streak": u.get("streak", 0)}


async def _update_achievements(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user: return
    ach = user.get("achievements", {}) or {}
    progress = {"first_win": user.get("wins",0),"win_10": user.get("wins",0),
                "win_50": user.get("wins",0),"play_25": user.get("matches",0),
                "streak_5": user.get("streak",0),"social": len(user.get("friends",[]))}
    grant = 0
    for a in ACHIEVEMENTS:
        if ach.get(a["id"], {}).get("unlocked"): continue
        cur = progress.get(a["id"], 0)
        if cur >= a["target"]:
            ach[a["id"]] = {"unlocked": True, "unlocked_at": iso(now_utc())}; grant += a["reward"]
        else:
            ach[a["id"]] = {"unlocked": False, "progress": cur}
    upd: Dict[str, Any] = {"$set": {"achievements": ach}}
    if grant > 0: upd["$inc"] = {"bcoins": grant}
    await db.users.update_one({"id": user_id}, upd)


# ---------------------- Missions ----------------------
@api_router.get("/missions/{user_id}")
async def missions_today(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user: raise HTTPException(404, "User not found")
    user = await _ensure_extras(user)
    missions = await _today_missions(user)
    # Sync mission progress with current counters (live view)
    stats = user.get("stats", {})
    synced = []
    for m in missions:
        counter = m.get("counter")
        live_prog = min(m["target"], stats.get(counter, 0)) if counter in stats else m.get("progress", 0)
        if counter == "streak":
            live_prog = min(m["target"], user.get("streak", 0))
        synced.append({**m, "progress": max(m.get("progress", 0), live_prog)})
    return {"missions": synced, "refreshes_in": "tomorrow 00:00 UTC"}


@api_router.post("/missions/claim")
async def missions_claim(req: ClaimMissionRequest):
    user = await db.users.find_one({"id": req.user_id})
    if not user: raise HTTPException(404, "User not found")
    user = await _ensure_extras(user)
    missions = user.get("missions", {}) or {}
    m = missions.get(req.mission_id)
    if not m: raise HTTPException(404, "Mission not found")
    if m.get("claimed"): raise HTTPException(400, "Already claimed")
    # Re-check live progress
    stats = user.get("stats", {})
    counter = m.get("counter")
    live_prog = stats.get(counter, 0) if counter in stats else m.get("progress", 0)
    if counter == "streak": live_prog = user.get("streak", 0)
    if live_prog < m["target"]: raise HTTPException(400, "Not completed yet")
    m["claimed"] = True; m["progress"] = m["target"]
    missions[req.mission_id] = m
    await db.users.update_one({"id": req.user_id}, {"$set": {"missions": missions}, "$inc": {"bcoins": m["reward"]}})
    await db.transactions.insert_one({"id": str(uuid.uuid4()), "user_id": req.user_id, "type": "mission",
                                       "amount": m["reward"], "description": f"Mission: {m['title']}",
                                       "created_at": now_utc()})
    await _award_bp_xp(req.user_id, 50)
    return {"ok": True, "reward": m["reward"]}


# ---------------------- Battle Pass ----------------------
@api_router.get("/battle-pass/{user_id}")
async def battle_pass(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user: raise HTTPException(404, "User not found")
    user = await _ensure_extras(user)
    return {
        "season": BATTLE_PASS["season"],
        "ends_in_days": BATTLE_PASS["ends_in_days"],
        "premium_price_inr": BATTLE_PASS["premium_price_inr"],
        "tiers": BATTLE_PASS["tiers"],
        "xp": user.get("bp_xp", 0),
        "premium": user.get("bp_premium", False),
        "claimed": user.get("bp_claimed", {"free": [], "premium": []}),
    }


@api_router.post("/battle-pass/claim")
async def bp_claim(req: BPClaimRequest):
    user = await db.users.find_one({"id": req.user_id})
    if not user: raise HTTPException(404, "User not found")
    user = await _ensure_extras(user)
    tier = next((t for t in BATTLE_PASS["tiers"] if t["tier"] == req.tier), None)
    if not tier: raise HTTPException(404, "Tier not found")
    if user.get("bp_xp", 0) < tier["xp_required"]: raise HTTPException(400, "Not enough XP")
    if req.track == "premium" and not user.get("bp_premium"): raise HTTPException(400, "Premium pass not active")
    claimed = user.get("bp_claimed", {"free": [], "premium": []})
    if req.tier in claimed.get(req.track, []): raise HTTPException(400, "Already claimed")
    reward = tier["free"] if req.track == "free" else tier["premium"]
    inc = {}
    if reward["type"] == "bcoins": inc["bcoins"] = reward["amount"]
    elif reward["type"] == "powerup": inc[f"powerups.{reward['powerup_id']}"] = reward.get("amount", 1)
    elif reward["type"] == "collection":
        await db.users.update_one({"id": req.user_id}, {"$addToSet": {"collection": reward["ball_id"]}})
    claimed.setdefault(req.track, []).append(req.tier)
    updates: Dict[str, Any] = {"$set": {"bp_claimed": claimed}}
    if inc: updates["$inc"] = inc
    await db.users.update_one({"id": req.user_id}, updates)
    return {"ok": True, "reward": reward}


@api_router.post("/battle-pass/activate-premium")
async def bp_activate_premium(user_id: str):
    """Mock endpoint — would be gated by Razorpay purchase in production."""
    await db.users.update_one({"id": user_id}, {"$set": {"bp_premium": True}})
    return {"ok": True}


# ---------------------- Collection ----------------------
@api_router.get("/collection/{user_id}")
async def collection(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user: raise HTTPException(404, "User not found")
    user = await _ensure_extras(user)
    owned = set(user.get("collection", []))
    balls = [{**b, "owned": b["id"] in owned} for b in COLLECTION_SET["balls"]]
    complete = all(b["owned"] for b in balls)
    return {"set": {**COLLECTION_SET, "balls": balls}, "complete": complete, "owned_count": len([b for b in balls if b["owned"]])}


@api_router.post("/collection/claim")
async def collection_claim(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user: raise HTTPException(404, "User not found")
    user = await _ensure_extras(user)
    owned = set(user.get("collection", []))
    if not all(b["id"] in owned for b in COLLECTION_SET["balls"]):
        raise HTTPException(400, "Set not complete")
    if user.get("collection_claimed"):
        raise HTTPException(400, "Already claimed")
    await db.users.update_one({"id": user_id}, {"$set": {"collection_claimed": True}, "$inc": {"bcoins": COLLECTION_SET["reward"]}})
    return {"ok": True, "reward": COLLECTION_SET["reward"]}


# ---------------------- Live event (Power Hour) ----------------------
@api_router.get("/event/current")
async def current_event():
    # Power Hour: 19:00-20:00 UTC on weekdays; Weekend Blast: Sat/Sun all day
    now = now_utc()
    wd = now.weekday()  # 0=Mon
    event = None
    if wd >= 5:  # Sat/Sun
        event = {"id": "weekend_blast", "name": "Weekend Blast", "multiplier": 2, "ends_at": iso(now.replace(hour=23, minute=59, second=59))}
    elif 19 <= now.hour < 20:
        event = {"id": "power_hour", "name": "Power Hour", "multiplier": 2, "ends_at": iso(now.replace(hour=20, minute=0, second=0))}
    else:
        next_hour = 19 if now.hour < 19 else 19 + 24  # next day if past
        event = {"id": "power_hour_upcoming", "name": "Power Hour", "multiplier": 2, "starts_in_hours": max(1, next_hour - now.hour)}
    return event


# ---------------------- Leaderboard / Tournaments / Achievements / Friends ----------------------
@api_router.get("/leaderboard")
async def leaderboard(period: str = "all"):
    users = await db.users.find({}).sort("wins", -1).limit(50).to_list(50)
    out = []
    for i, u in enumerate(users):
        out.append({"rank": i+1, "user_id": u.get("id"), "username": u.get("username"),
                    "avatar": u.get("avatar"), "wins": u.get("wins",0),
                    "bcoins": u.get("bcoins",0), "level": u.get("level",1)})
    return {"period": period, "leaderboard": out}

@api_router.get("/tournaments")
async def tournaments(): return TOURNAMENTS

@api_router.post("/tournament/register")
async def tournament_register(user_id: str, tournament_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user: raise HTTPException(404, "User not found")
    tour = next((t for t in TOURNAMENTS if t["id"] == tournament_id), None)
    if not tour: raise HTTPException(404, "Tournament not found")
    if user["bcoins"] < tour["entry_fee"]: raise HTTPException(400, "Not enough Bcoins")
    await db.users.update_one({"id": user_id}, {"$inc": {"bcoins": -tour["entry_fee"]}})
    await db.transactions.insert_one({"id": str(uuid.uuid4()), "user_id": user_id, "type": "tournament_entry",
                                       "amount": -tour["entry_fee"], "description": f"Registered: {tour['name']}",
                                       "created_at": now_utc()})
    return {"ok": True, "tournament_id": tournament_id}

@api_router.get("/achievements/{user_id}")
async def achievements(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user: raise HTTPException(404, "User not found")
    user = await _ensure_extras(user)
    ach = user.get("achievements", {}) or {}
    out = []
    for a in ACHIEVEMENTS:
        info = ach.get(a["id"], {})
        out.append({**a, "unlocked": info.get("unlocked", False),
                    "progress": info.get("progress", 0) if not info.get("unlocked") else a["target"]})
    return out

@api_router.get("/friends/{user_id}")
async def friends_list(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user: raise HTTPException(404, "User not found")
    friends = []
    async for f in db.users.find({"id": {"$in": user.get("friends", [])}}):
        friends.append({"user_id": f["id"], "username": f["username"], "avatar": f["avatar"],
                        "level": f.get("level", 1), "wins": f.get("wins", 0),
                        "online": random.choice([True, False])})
    return friends

@api_router.post("/friends/add")
async def friends_add(req: AddFriendRequest):
    user = await db.users.find_one({"id": req.user_id})
    if not user: raise HTTPException(404, "User not found")
    friend = await db.users.find_one({"friend_code": req.friend_code.upper()})
    if not friend: raise HTTPException(404, "Friend code not found")
    if friend["id"] == req.user_id: raise HTTPException(400, "Can't add yourself")
    if friend["id"] in user.get("friends", []): return {"ok": True, "message": "Already friends"}
    await db.users.update_one({"id": req.user_id}, {"$addToSet": {"friends": friend["id"]}})
    await db.users.update_one({"id": friend["id"]}, {"$addToSet": {"friends": req.user_id}})
    await _update_achievements(req.user_id)
    return {"ok": True, "friend": {"user_id": friend["id"], "username": friend["username"], "avatar": friend["avatar"]}}

@api_router.get("/transactions/{user_id}")
async def transactions(user_id: str):
    txs = await db.transactions.find({"user_id": user_id}).sort("created_at", -1).limit(100).to_list(100)
    return [strip_mongo(t) for t in txs]


# ---------------------- Shop ----------------------
@api_router.get("/shop/items")
async def shop_items(): return SHOP_ITEMS


# ---------------------- Razorpay ----------------------
# Toggle controls whether we call Razorpay's real API or mock the flow locally.
USE_REAL_RAZORPAY = os.environ.get("USE_REAL_RAZORPAY", "false").strip().lower() in ("true", "1", "yes", "on")
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "").strip().strip('"')
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "").strip().strip('"')
razorpay_client = None
try:
    if USE_REAL_RAZORPAY and RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
        import razorpay as _rzp
        razorpay_client = _rzp.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        logger.info("Razorpay: REAL mode enabled")
    else:
        logger.info(f"Razorpay: MOCK mode (USE_REAL_RAZORPAY={USE_REAL_RAZORPAY}, keys_present={bool(RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)})")
except Exception as e:
    logger.warning(f"Razorpay init failed: {e}")
    razorpay_client = None

@api_router.get("/payments/razorpay/config")
async def razorpay_config():
    """Lets the frontend know whether to use the real checkout or mock flow."""
    return {"use_real": razorpay_client is not None,
            "key_id": RAZORPAY_KEY_ID if razorpay_client is not None else "rzp_test_mock",
            "mode": "real" if razorpay_client is not None else "mock"}

@api_router.post("/payments/razorpay/create-order")
async def create_razorpay_order(req: RazorpayOrderRequest):
    item = next((i for i in SHOP_ITEMS if i["id"] == req.item_id), None)
    if not item: raise HTTPException(404, "Item not found")
    amount = int(item["price_inr"] * 100)
    if razorpay_client is None:
        return {"mocked": True, "order_id": f"order_mock_{uuid.uuid4().hex[:12]}", "amount": amount,
                "currency": "INR", "key_id": "rzp_test_mock", "item": item,
                "message": "Razorpay keys not configured."}
    order = razorpay_client.order.create({"amount": amount, "currency": "INR", "payment_capture": 1,
                                          "notes": {"user_id": req.user_id, "item_id": req.item_id}})
    return {"mocked": False, "order_id": order["id"], "amount": amount, "currency": "INR",
            "key_id": RAZORPAY_KEY_ID, "item": item}

@api_router.post("/payments/razorpay/verify")
async def verify_razorpay(req: RazorpayVerifyRequest):
    item = next((i for i in SHOP_ITEMS if i["id"] == req.item_id), None)
    if not item: raise HTTPException(404, "Item not found")
    if razorpay_client is None:
        return await _grant_shop_item(req.user_id, item, req.razorpay_payment_id, True)
    try:
        razorpay_client.utility.verify_payment_signature({
            "razorpay_order_id": req.razorpay_order_id,
            "razorpay_payment_id": req.razorpay_payment_id,
            "razorpay_signature": req.razorpay_signature,
        })
    except Exception as e:
        raise HTTPException(400, f"Signature verification failed: {e}")
    return await _grant_shop_item(req.user_id, item, req.razorpay_payment_id, False)

async def _grant_shop_item(user_id: str, item: dict, payment_id: str, mocked: bool):
    inc = {}
    if item["type"] == "bcoins": inc["bcoins"] = item["amount"]
    elif item["type"] == "powerup":
        pid = item.get("powerup_id","dauber")
        inc[f"powerups.{pid}"] = item.get("amount", 1)
    if inc: await db.users.update_one({"id": user_id}, {"$inc": inc})
    await db.transactions.insert_one({"id": str(uuid.uuid4()), "user_id": user_id,
                                       "type": "razorpay_purchase" + ("_mock" if mocked else ""),
                                       "amount": item.get("amount", 0) if item["type"] == "bcoins" else 0,
                                       "payment_id": payment_id, "item_id": item["id"],
                                       "description": f"Purchased {item['name']}", "created_at": now_utc()})
    return {"ok": True, "item": item, "mocked": mocked}


# ---------------------- WebSocket Multiplayer ----------------------
class RoomManager:
    def __init__(self): self.rooms: Dict[str, Dict[str, WebSocket]] = {}
    async def connect(self, room_id: str, user_id: str, ws: WebSocket):
        await ws.accept()
        self.rooms.setdefault(room_id, {})[user_id] = ws
    def disconnect(self, room_id: str, user_id: str):
        if room_id in self.rooms and user_id in self.rooms[room_id]:
            del self.rooms[room_id][user_id]
            if not self.rooms[room_id]: del self.rooms[room_id]
    async def broadcast(self, room_id: str, message: dict):
        conns = self.rooms.get(room_id, {})
        dead = []
        for uid, ws in list(conns.items()):
            try: await ws.send_json(message)
            except Exception: dead.append(uid)
        for uid in dead: self.disconnect(room_id, uid)

manager = RoomManager()

@app.websocket("/api/ws/room/{room_id}/{user_id}")
async def ws_room(websocket: WebSocket, room_id: str, user_id: str):
    await manager.connect(room_id, user_id, websocket)
    room = await db.rooms.find_one({"id": room_id})
    if room:
        await websocket.send_json({"type": "room_state", "room": strip_mongo(dict(room))})
    number_caller_task = None
    try:
        while True:
            data = await websocket.receive_text()
            try: msg = json.loads(data)
            except Exception: continue
            mtype = msg.get("type")
            if mtype == "ready":
                room = await db.rooms.find_one({"id": room_id})
                if not room: continue
                for p in room["players"]:
                    if p["user_id"] == user_id: p["ready"] = bool(msg.get("ready", True))
                await db.rooms.update_one({"id": room_id}, {"$set": {"players": room["players"]}})
                await manager.broadcast(room_id, {"type": "room_state", "room": strip_mongo(dict(room))})
            elif mtype == "start":
                room = await db.rooms.find_one({"id": room_id})
                if not room or room.get("host_id") != user_id: continue
                cards = {p["user_id"]: generate_card() for p in room["players"]}
                await db.rooms.update_one({"id": room_id}, {"$set": {"status": "playing", "cards": cards,
                                                                     "called_numbers": [], "started_at": now_utc()}})
                room = await db.rooms.find_one({"id": room_id})
                await manager.broadcast(room_id, {"type": "game_started", "room": strip_mongo(dict(room))})
                number_caller_task = asyncio.create_task(_auto_caller(room_id))
            elif mtype == "chat":
                await manager.broadcast(room_id, {"type": "chat", "user_id": user_id, "message": str(msg.get("message",""))[:120]})
            elif mtype == "emote":
                await manager.broadcast(room_id, {"type": "emote", "user_id": user_id, "emote": str(msg.get("emote",""))[:40]})
            elif mtype == "claim_bingo":
                room = await db.rooms.find_one({"id": room_id})
                if not room or room.get("status") != "playing": continue
                card = (room.get("cards") or {}).get(user_id)
                if not card: continue
                dabbed = set(msg.get("dabbed_numbers", []))
                called = set(room.get("called_numbers", []))
                if not dabbed.issubset(called) or not check_line(card, dabbed):
                    await websocket.send_json({"type": "invalid_bingo"}); continue
                prize = room.get("prize", 100)
                await db.rooms.update_one({"id": room_id}, {"$set": {"status":"finished", "winner_id":user_id}})
                await db.users.update_one({"id": user_id}, {"$inc": {"wins":1,"matches":1,"bcoins":prize,"streak":1,"xp":100}})
                await db.transactions.insert_one({"id": str(uuid.uuid4()), "user_id": user_id, "type":"match_win",
                                                   "amount":prize, "description":f"Won {room['name']}", "created_at": now_utc()})
                await _track_counter(user_id, "wins")
                await _award_bp_xp(user_id, 150)
                await _update_achievements(user_id)
                for p in room["players"]:
                    if p["user_id"] != user_id:
                        await db.users.update_one({"id": p["user_id"]}, {"$inc": {"matches":1}, "$set": {"streak":0}})
                room = await db.rooms.find_one({"id": room_id})
                await manager.broadcast(room_id, {"type": "bingo_winner", "winner_id": user_id, "prize": prize,
                                                   "room": strip_mongo(dict(room))})
                if number_caller_task: number_caller_task.cancel()
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(room_id, user_id)
        if number_caller_task: number_caller_task.cancel()

async def _auto_caller(room_id: str):
    try:
        while True:
            await asyncio.sleep(3)
            room = await db.rooms.find_one({"id": room_id})
            if not room or room.get("status") != "playing": break
            called = room.get("called_numbers", [])
            remaining = [n for n in range(1, 76) if n not in called]
            if not remaining: break
            nxt = random.choice(remaining); called.append(nxt)
            await db.rooms.update_one({"id": room_id}, {"$set": {"called_numbers": called}})
            await manager.broadcast(room_id, {"type": "number_called", "number": nxt, "called_numbers": called})
    except asyncio.CancelledError:
        pass


# ---------------------- Matchmaking (Classic Quick Match) ----------------------
matchmaking_queue: Dict[str, dict] = {}  # entry_id -> {user_id, created_at, room_id}
MATCHMAKING_BOT_TIMEOUT_SECONDS = 15


@api_router.post("/matchmaking/join")
async def matchmaking_join(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user: raise HTTPException(404, "User not found")
    # Cleanup stale entries (> 60s)
    now = now_utc()
    for eid in list(matchmaking_queue.keys()):
        c = matchmaking_queue[eid].get("created_at")
        if c and (now - c).total_seconds() > 60:
            del matchmaking_queue[eid]
    # Already queued/matched?
    for eid, e in matchmaking_queue.items():
        if e["user_id"] == user_id:
            if e.get("room_id"):
                return {"status": "matched", "room_id": e["room_id"], "entry_id": eid}
            return {"status": "queued", "entry_id": eid, "wait_seconds": int((now - e["created_at"]).total_seconds())}
    # Find a waiting partner
    waiting = [(eid, e) for eid, e in matchmaking_queue.items() if not e.get("room_id") and e["user_id"] != user_id]
    if waiting:
        partner_eid, partner = waiting[0]
        # Create a hidden classic 1v1 room
        room = {
            "id": str(uuid.uuid4()), "code": str(uuid.uuid4()).split("-")[0].upper(),
            "name": "Classic Quick Match", "room_type": "free",
            "max_players": 2, "match_count": 1,
            "entry_fee": 0, "prize": 200, "host_id": partner["user_id"],
            "players": [], "status": "waiting", "called_numbers": [], "cards": {},
            "winner_id": None, "is_private": True, "is_matchmaking": True,
            "created_at": now,
        }
        # Add both players
        partner_user = await db.users.find_one({"id": partner["user_id"]})
        room["players"] = [
            {"user_id": partner["user_id"], "username": partner_user["username"], "avatar": partner_user["avatar"], "ready": True, "is_host": True},
            {"user_id": user_id, "username": user["username"], "avatar": user["avatar"], "ready": True, "is_host": False},
        ]
        # Generate cards immediately, mark playing
        room["cards"] = {p["user_id"]: generate_card() for p in room["players"]}
        room["status"] = "playing"; room["started_at"] = now
        await db.rooms.insert_one(room)
        # Update partner's queue entry
        matchmaking_queue[partner_eid]["room_id"] = room["id"]
        # Add self to queue with room_id
        my_eid = str(uuid.uuid4())
        matchmaking_queue[my_eid] = {"user_id": user_id, "created_at": now, "room_id": room["id"]}
        # Auto-caller
        asyncio.create_task(_auto_caller(room["id"]))
        return {"status": "matched", "room_id": room["id"], "entry_id": my_eid, "match_type": "player"}
    # No partner — add to queue
    eid = str(uuid.uuid4())
    matchmaking_queue[eid] = {"user_id": user_id, "created_at": now}
    return {"status": "queued", "entry_id": eid, "wait_seconds": 0}


@api_router.get("/matchmaking/status/{entry_id}")
async def matchmaking_status(entry_id: str):
    e = matchmaking_queue.get(entry_id)
    if not e:
        return {"status": "expired"}
    if e.get("room_id"):
        return {"status": "matched", "room_id": e["room_id"], "match_type": "player"}
    waited = int((now_utc() - e["created_at"]).total_seconds())
    if waited >= MATCHMAKING_BOT_TIMEOUT_SECONDS:
        # Bot fallback — frontend will redirect to computer mode
        del matchmaking_queue[entry_id]
        return {"status": "matched", "match_type": "bot", "wait_seconds": waited}
    return {"status": "queued", "wait_seconds": waited, "bot_fallback_in": MATCHMAKING_BOT_TIMEOUT_SECONDS - waited}


@api_router.post("/matchmaking/cancel/{entry_id}")
async def matchmaking_cancel(entry_id: str):
    matchmaking_queue.pop(entry_id, None)
    return {"ok": True}


# ---------------------- VIP Subscription ----------------------
VIP_PLANS = [
    {"id": "vip_monthly", "name": "VIP Monthly", "price_inr": 199, "days": 30},
    {"id": "vip_yearly", "name": "VIP Yearly", "price_inr": 1799, "days": 365, "badge": "BEST VALUE"},
]
VIP_PERKS = [
    {"icon": "currency-rupee", "title": "2x Daily Rewards", "desc": "Double your daily login bonus"},
    {"icon": "trending-up", "title": "2x Battle Pass XP", "desc": "Climb tiers twice as fast"},
    {"icon": "crown", "title": "VIP Avatar Frame", "desc": "Show off the exclusive gold frame"},
    {"icon": "ad", "title": "No Ads", "desc": "Uninterrupted gameplay"},
    {"icon": "ticket", "title": "Free Daily Spin", "desc": "Bonus spin every day"},
    {"icon": "headphones", "title": "Priority Support", "desc": "Skip the queue"},
]


@api_router.get("/vip/info/{user_id}")
async def vip_info(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user: raise HTTPException(404, "User not found")
    user = await _ensure_extras(user)
    expires_at = user.get("vip_expires_at")
    active = False
    days_left = 0
    if expires_at:
        if isinstance(expires_at, str):
            try: expires_at = datetime.fromisoformat(expires_at)
            except Exception: expires_at = None
        if isinstance(expires_at, datetime):
            if expires_at.tzinfo is None: expires_at = expires_at.replace(tzinfo=timezone.utc)
            active = expires_at > now_utc()
            days_left = max(0, (expires_at - now_utc()).days)
    return {"active": active, "days_left": days_left, "expires_at": iso(expires_at) if isinstance(expires_at, datetime) else None,
            "plans": VIP_PLANS, "perks": VIP_PERKS}


@api_router.post("/vip/activate")
async def vip_activate(user_id: str, plan_id: str):
    """Mock activation — in production gate behind Razorpay successful payment."""
    plan = next((p for p in VIP_PLANS if p["id"] == plan_id), None)
    if not plan: raise HTTPException(404, "Plan not found")
    expires = now_utc() + timedelta(days=plan["days"])
    await db.users.update_one({"id": user_id}, {"$set": {"vip_active": True, "vip_expires_at": expires}})
    await db.transactions.insert_one({"id": str(uuid.uuid4()), "user_id": user_id, "type": "vip_activate_mock",
                                       "amount": 0, "description": f"VIP: {plan['name']} (mock)", "created_at": now_utc()})
    return {"ok": True, "expires_at": iso(expires), "days": plan["days"]}


# ---------------------- Avatar Customization ----------------------
COSMETICS = {
    "frames": [
        {"id": "frame_default", "name": "Classic", "rarity": "common", "color": "#F72585", "unlock": "default"},
        {"id": "frame_gold", "name": "Gold", "rarity": "rare", "color": "#FFD166", "unlock": "level_5"},
        {"id": "frame_neon", "name": "Neon Pulse", "rarity": "epic", "color": "#06D6A0", "unlock": "wins_10"},
        {"id": "frame_royal", "name": "Royal", "rarity": "epic", "color": "#9D4EDD", "unlock": "level_10"},
        {"id": "frame_vip", "name": "VIP Crown", "rarity": "legendary", "color": "#FCA311", "unlock": "vip"},
        {"id": "frame_champion", "name": "Champion", "rarity": "legendary", "color": "#EF476F", "unlock": "wins_50"},
    ],
    "titles": [
        {"id": "title_newbie", "name": "Newbie", "unlock": "default"},
        {"id": "title_lucky", "name": "Lucky", "unlock": "wins_5"},
        {"id": "title_speedster", "name": "Speedster", "unlock": "speed_dabs_50"},
        {"id": "title_streak_king", "name": "Streak King", "unlock": "streak_5"},
        {"id": "title_legend", "name": "Bingo Legend", "unlock": "wins_50"},
        {"id": "title_vip", "name": "VIP Member", "unlock": "vip"},
    ],
    "backgrounds": [
        {"id": "bg_default", "name": "Midnight", "rarity": "common", "color": "#1A0B2E", "unlock": "default"},
        {"id": "bg_neon", "name": "Neon City", "rarity": "rare", "color": "#7209B7", "unlock": "level_5"},
        {"id": "bg_sunset", "name": "Sunset", "rarity": "rare", "color": "#FCA311", "unlock": "wins_25"},
        {"id": "bg_ocean", "name": "Deep Ocean", "rarity": "epic", "color": "#4361EE", "unlock": "level_15"},
    ],
}


def _meets_cosmetic_unlock(user: dict, unlock: str) -> bool:
    if unlock == "default": return True
    if unlock == "vip": return bool(user.get("vip_active"))
    if unlock.startswith("level_"): return user.get("level", 1) >= int(unlock.split("_")[1])
    if unlock.startswith("wins_"): return user.get("wins", 0) >= int(unlock.split("_")[1])
    if unlock.startswith("streak_"): return user.get("streak", 0) >= int(unlock.split("_")[1])
    if unlock.startswith("speed_dabs_"):
        return (user.get("stats", {}) or {}).get("speed_dabs", 0) >= int(unlock.split("_")[2])
    return False


@api_router.get("/cosmetics/{user_id}")
async def cosmetics(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user: raise HTTPException(404, "User not found")
    user = await _ensure_extras(user)
    owned = set(user.get("owned_cosmetics", []))
    out = {}
    for category, items in COSMETICS.items():
        out[category] = []
        for item in items:
            unlocked = _meets_cosmetic_unlock(user, item.get("unlock", "default")) or item["id"] in owned
            out[category].append({**item, "unlocked": unlocked, "owned": item["id"] in owned or unlocked})
    return {"cosmetics": out, "equipped": user.get("equipped", {})}


@api_router.post("/cosmetics/equip")
async def cosmetics_equip(user_id: str, category: str, item_id: str):
    if category not in COSMETICS: raise HTTPException(400, "Invalid category")
    item = next((i for i in COSMETICS[category] if i["id"] == item_id), None)
    if not item: raise HTTPException(404, "Item not found")
    user = await db.users.find_one({"id": user_id})
    if not user: raise HTTPException(404, "User not found")
    user = await _ensure_extras(user)
    if not _meets_cosmetic_unlock(user, item.get("unlock", "default")) and item_id not in user.get("owned_cosmetics", []):
        raise HTTPException(400, "Cosmetic locked")
    equipped = user.get("equipped", {}) or {}
    key = "frame" if category == "frames" else "title" if category == "titles" else "background"
    equipped[key] = item_id
    await db.users.update_one({"id": user_id}, {"$set": {"equipped": equipped}})
    return {"ok": True, "equipped": equipped}


# ---------------------- Guilds ----------------------
GUILD_CREATE_COST = 1000


@api_router.post("/guilds/create")
async def guild_create(user_id: str, name: str, tag: str):
    user = await db.users.find_one({"id": user_id})
    if not user: raise HTTPException(404, "User not found")
    user = await _ensure_extras(user)
    if user.get("guild_id"): raise HTTPException(400, "Already in a guild")
    if user.get("bcoins", 0) < GUILD_CREATE_COST:
        raise HTTPException(400, f"Need {GUILD_CREATE_COST} BC to create a guild")
    guild = {
        "id": str(uuid.uuid4()), "name": name[:30], "tag": tag[:5].upper(),
        "code": str(uuid.uuid4()).split("-")[0].upper(),
        "leader_id": user_id, "members": [user_id], "max_members": 20,
        "weekly_points": 0, "total_points": 0, "level": 1,
        "created_at": now_utc(),
    }
    await db.guilds.insert_one(guild)
    await db.users.update_one({"id": user_id}, {"$set": {"guild_id": guild["id"]},
                                                 "$inc": {"bcoins": -GUILD_CREATE_COST}})
    return strip_mongo(guild)


@api_router.get("/guilds/list")
async def guilds_list():
    gs = await db.guilds.find({}).sort("weekly_points", -1).limit(50).to_list(50)
    return [strip_mongo(g) for g in gs]


@api_router.get("/guilds/{guild_id}")
async def guild_detail(guild_id: str):
    g = await db.guilds.find_one({"id": guild_id})
    if not g: raise HTTPException(404, "Guild not found")
    members = []
    async for m in db.users.find({"id": {"$in": g.get("members", [])}}):
        members.append({"user_id": m["id"], "username": m["username"], "avatar": m["avatar"],
                         "level": m.get("level", 1), "wins": m.get("wins", 0),
                         "is_leader": m["id"] == g["leader_id"]})
    return {**strip_mongo(g), "member_details": members}


@api_router.post("/guilds/join")
async def guild_join(user_id: str, code_or_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user: raise HTTPException(404, "User not found")
    user = await _ensure_extras(user)
    if user.get("guild_id"): raise HTTPException(400, "Already in a guild")
    g = await db.guilds.find_one({"code": code_or_id.upper()}) or await db.guilds.find_one({"id": code_or_id})
    if not g: raise HTTPException(404, "Guild not found")
    if len(g.get("members", [])) >= g.get("max_members", 20):
        raise HTTPException(400, "Guild is full")
    await db.guilds.update_one({"id": g["id"]}, {"$addToSet": {"members": user_id}})
    await db.users.update_one({"id": user_id}, {"$set": {"guild_id": g["id"]}})
    return strip_mongo(g)


@api_router.post("/guilds/leave")
async def guild_leave(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user or not user.get("guild_id"): raise HTTPException(400, "Not in a guild")
    gid = user["guild_id"]
    await db.guilds.update_one({"id": gid}, {"$pull": {"members": user_id}})
    await db.users.update_one({"id": user_id}, {"$set": {"guild_id": None}})
    # If leader left, promote first remaining member
    g = await db.guilds.find_one({"id": gid})
    if g and g.get("leader_id") == user_id and g.get("members"):
        await db.guilds.update_one({"id": gid}, {"$set": {"leader_id": g["members"][0]}})
    elif g and not g.get("members"):
        await db.guilds.delete_one({"id": gid})
    return {"ok": True}


# ---------------------- Push token registration (scaffold) ----------------------
@api_router.post("/push/register")
async def push_register(user_id: str, token: str, platform: str = "expo"):
    """Stores Expo Push token for future delivery (delivery requires native build)."""
    await db.users.update_one({"id": user_id}, {"$set": {"push_token": token, "push_platform": platform}})
    return {"ok": True}


# ---------------------- Wiring ----------------------
app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def on_startup(): logger.info("Bingo Blast backend started")

@app.on_event("shutdown")
async def on_shutdown(): client.close()
