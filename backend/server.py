from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
import asyncio
import json
import uuid
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
    if not doc:
        return doc
    doc.pop("_id", None)
    for k, v in list(doc.items()):
        if isinstance(v, datetime):
            doc[k] = v.isoformat()
    return doc


def generate_bingo_card() -> List[List[Optional[int]]]:
    """Generate a 5x5 Bingo card. Columns: B(1-15), I(16-30), N(31-45), G(46-60), O(61-75).
    Center cell is FREE (None)."""
    card = []
    ranges = [(1, 15), (16, 30), (31, 45), (46, 60), (61, 75)]
    cols = []
    for low, high in ranges:
        nums = random.sample(range(low, high + 1), 5)
        cols.append(nums)
    # transpose to rows
    for r in range(5):
        row = []
        for c in range(5):
            if r == 2 and c == 2:
                row.append(None)  # FREE
            else:
                row.append(cols[c][r])
        card.append(row)
    return card


def check_bingo(card: List[List[Optional[int]]], called: List[int]) -> bool:
    """Return True if the card has a complete line (row/col/diag) marked."""
    called_set = set(called)

    def marked(v):
        return v is None or v in called_set

    # rows
    for r in range(5):
        if all(marked(card[r][c]) for c in range(5)):
            return True
    # cols
    for c in range(5):
        if all(marked(card[r][c]) for r in range(5)):
            return True
    # diagonals
    if all(marked(card[i][i]) for i in range(5)):
        return True
    if all(marked(card[i][4 - i]) for i in range(5)):
        return True
    return False


AVATAR_POOL = [
    "https://images.unsplash.com/photo-1758600433991-933fb663161f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwyfHxjaGVlcmZ1bCUyMHBlcnNvbiUyMHBvcnRyYWl0JTIwY29sb3JmdWwlMjBiYWNrZ3JvdW5kfGVufDB8fHx8MTc3NzYyMjkxOHww&ixlib=rb-4.1.0&q=85",
    "https://images.unsplash.com/photo-1758600587811-e9a20851cf7d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwxfHxjaGVlcmZ1bCUyMHBlcnNvbiUyMHBvcnRyYWl0JTIwY29sb3JmdWwlMjBiYWNrZ3JvdW5kfGVufDB8fHx8MTc3NzYyMjkxOHww&ixlib=rb-4.1.0&q=85",
    "https://images.unsplash.com/photo-1758600433358-b44bf8a32c8f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwzfHxjaGVlcmZ1bCUyMHBlcnNvbiUyMHBvcnRyYWl0JTIwY29sb3JmdWwlMjBiYWNrZ3JvdW5kfGVufDB8fHx8MTc3NzYyMjkxOHww&ixlib=rb-4.1.0&q=85",
]

USERNAME_POOL = [
    "BingoKing", "LuckySpin", "StarPlayer", "NumberNinja", "CardMaster",
    "RoyalPlay", "NeonDice", "QuickDraw", "AceChamp", "BlastHero",
]


# ---------------------- Models ----------------------
class GuestLoginRequest(BaseModel):
    device_id: Optional[str] = None


class UserOut(BaseModel):
    id: str
    username: str
    avatar: str
    bcoins: int
    level: int
    xp: int
    wins: int
    matches: int
    streak: int
    is_guest: bool
    created_at: str
    last_daily_claim: Optional[str] = None
    last_spin_claim: Optional[str] = None


class UpdateProfileRequest(BaseModel):
    user_id: str
    username: Optional[str] = None
    avatar: Optional[str] = None


class CreateRoomRequest(BaseModel):
    user_id: str
    name: str
    room_type: str  # free | prestige | luxury | custom | tournament
    max_players: int = 10  # 10 or 25
    match_count: int = 1  # 1 or 10
    entry_fee: int = 0  # in Bcoins
    is_private: bool = False


class JoinRoomRequest(BaseModel):
    user_id: str


class ComputerMatchRequest(BaseModel):
    user_id: str
    difficulty: str = "medium"  # easy | medium | hard


class CallNumberRequest(BaseModel):
    match_id: str


class ClaimBingoRequest(BaseModel):
    match_id: str
    user_id: str


class AddFriendRequest(BaseModel):
    user_id: str
    friend_code: str


class PurchaseRequest(BaseModel):
    user_id: str
    item_id: str


class RazorpayOrderRequest(BaseModel):
    user_id: str
    item_id: str


class RazorpayVerifyRequest(BaseModel):
    user_id: str
    item_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


# ---------------------- Seed data ----------------------
SHOP_ITEMS = [
    {"id": "coins_100", "name": "Starter Pack", "type": "bcoins", "amount": 100, "price_inr": 25, "badge": "POPULAR"},
    {"id": "coins_500", "name": "Boost Pack", "type": "bcoins", "amount": 500, "price_inr": 99, "badge": None},
    {"id": "coins_1200", "name": "Mega Pack", "type": "bcoins", "amount": 1200, "price_inr": 199, "badge": "BEST VALUE"},
    {"id": "coins_3000", "name": "Ultra Pack", "type": "bcoins", "amount": 3000, "price_inr": 449, "badge": None},
    {"id": "card_prestige", "name": "Prestige Room Card", "type": "room_card", "tier": "prestige", "price_inr": 25, "badge": None},
    {"id": "card_luxury", "name": "Luxury Room Card", "type": "room_card", "tier": "luxury", "price_inr": 150, "badge": "PREMIUM"},
    {"id": "pwr_dauber", "name": "Auto Dauber Power-up", "type": "powerup", "amount": 3, "price_inr": 49, "badge": None},
    {"id": "pwr_extra", "name": "Extra Time Power-up", "type": "powerup", "amount": 5, "price_inr": 39, "badge": None},
]

ACHIEVEMENTS = [
    {"id": "first_win", "name": "First Win", "desc": "Win your first match", "target": 1, "icon": "trophy", "reward": 50},
    {"id": "win_10", "name": "Rising Star", "desc": "Win 10 matches", "target": 10, "icon": "star", "reward": 200},
    {"id": "win_50", "name": "Bingo Legend", "desc": "Win 50 matches", "target": 50, "icon": "crown", "reward": 1000},
    {"id": "play_25", "name": "Regular Player", "desc": "Play 25 matches", "target": 25, "icon": "gamepad", "reward": 150},
    {"id": "streak_5", "name": "On Fire", "desc": "5 win streak", "target": 5, "icon": "fire", "reward": 300},
    {"id": "social", "name": "Socialite", "desc": "Add 5 friends", "target": 5, "icon": "users", "reward": 100},
]

TOURNAMENTS = [
    {"id": "tour_daily", "name": "Daily Rush", "desc": "Quick daily tournament", "entry_fee": 50, "prize_pool": 5000, "status": "ongoing", "starts_in_hours": 0, "players": 142, "max_players": 256},
    {"id": "tour_weekend", "name": "Weekend Blast", "desc": "The big weekend showdown", "entry_fee": 150, "prize_pool": 25000, "status": "upcoming", "starts_in_hours": 18, "players": 87, "max_players": 512},
    {"id": "tour_mega", "name": "Mega Jackpot", "desc": "Monthly championship", "entry_fee": 500, "prize_pool": 100000, "status": "upcoming", "starts_in_hours": 72, "players": 24, "max_players": 1024},
]


# ---------------------- Endpoints ----------------------
@api_router.get("/")
async def root():
    return {"app": "Bingo Blast", "status": "ok"}


@api_router.post("/guest/login", response_model=UserOut)
async def guest_login(req: GuestLoginRequest):
    # Check by device_id
    if req.device_id:
        existing = await db.users.find_one({"device_id": req.device_id})
        if existing:
            return UserOut(**strip_mongo(existing))

    user_id = str(uuid.uuid4())
    friend_code = user_id.split("-")[0].upper()
    user = {
        "id": user_id,
        "device_id": req.device_id or user_id,
        "username": f"{random.choice(USERNAME_POOL)}{random.randint(100, 999)}",
        "avatar": random.choice(AVATAR_POOL),
        "bcoins": 500,  # starter
        "level": 1,
        "xp": 0,
        "wins": 0,
        "matches": 0,
        "streak": 0,
        "is_guest": True,
        "friend_code": friend_code,
        "achievements": {},
        "friends": [],
        "settings": {"sound": True, "music": True, "notifications": True},
        "created_at": now_utc(),
        "last_daily_claim": None,
        "last_spin_claim": None,
    }
    await db.users.insert_one(user)
    return UserOut(**strip_mongo(user))


@api_router.get("/user/{user_id}", response_model=UserOut)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(404, "User not found")
    return UserOut(**strip_mongo(user))


@api_router.post("/user/update")
async def update_user(req: UpdateProfileRequest):
    updates = {}
    if req.username:
        updates["username"] = req.username
    if req.avatar:
        updates["avatar"] = req.avatar
    if not updates:
        raise HTTPException(400, "No updates")
    res = await db.users.update_one({"id": req.user_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(404, "User not found")
    return {"ok": True}


@api_router.post("/daily-reward/claim")
async def claim_daily(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(404, "User not found")
    last = user.get("last_daily_claim")
    if last:
        last_dt = last if isinstance(last, datetime) else datetime.fromisoformat(last)
        if last_dt.tzinfo is None:
            last_dt = last_dt.replace(tzinfo=timezone.utc)
        if now_utc() - last_dt < timedelta(hours=20):
            hours_left = 20 - int((now_utc() - last_dt).total_seconds() // 3600)
            raise HTTPException(400, f"Already claimed. Come back in ~{hours_left}h")
    reward = random.choice([50, 75, 100, 150, 200])
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"last_daily_claim": now_utc()}, "$inc": {"bcoins": reward}},
    )
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id, "type": "daily_reward",
        "amount": reward, "description": "Daily login reward", "created_at": now_utc(),
    })
    return {"reward": reward}


@api_router.post("/spin-wheel/spin")
async def spin_wheel(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(404, "User not found")
    last = user.get("last_spin_claim")
    if last:
        last_dt = last if isinstance(last, datetime) else datetime.fromisoformat(last)
        if last_dt.tzinfo is None:
            last_dt = last_dt.replace(tzinfo=timezone.utc)
        if now_utc() - last_dt < timedelta(hours=6):
            hours_left = 6 - int((now_utc() - last_dt).total_seconds() // 3600)
            raise HTTPException(400, f"Wheel cooling down. Try in ~{max(hours_left,1)}h")
    segments = [
        {"label": "25 BC", "type": "bcoins", "amount": 25, "weight": 30},
        {"label": "50 BC", "type": "bcoins", "amount": 50, "weight": 25},
        {"label": "100 BC", "type": "bcoins", "amount": 100, "weight": 15},
        {"label": "Room Card", "type": "room_card", "amount": 1, "weight": 10},
        {"label": "250 BC", "type": "bcoins", "amount": 250, "weight": 8},
        {"label": "500 BC", "type": "bcoins", "amount": 500, "weight": 5},
        {"label": "Power-up", "type": "powerup", "amount": 1, "weight": 5},
        {"label": "JACKPOT", "type": "bcoins", "amount": 1000, "weight": 2},
    ]
    weights = [s["weight"] for s in segments]
    choice = random.choices(segments, weights=weights, k=1)[0]
    segment_index = segments.index(choice)
    inc = {}
    if choice["type"] == "bcoins":
        inc["bcoins"] = choice["amount"]
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"last_spin_claim": now_utc()}, **({"$inc": inc} if inc else {})},
    )
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id, "type": "spin_wheel",
        "amount": choice["amount"] if choice["type"] == "bcoins" else 0,
        "description": f"Spin Wheel: {choice['label']}", "created_at": now_utc(),
    })
    return {"segment_index": segment_index, "reward": choice}


# ---------------------- Rooms (Multiplayer Lobby) ----------------------
ROOM_TYPE_DEFAULTS = {
    "free": {"entry_fee": 0, "prize": 100},
    "prestige": {"entry_fee": 25, "prize": 200},
    "luxury": {"entry_fee": 150, "prize": 1200},
    "custom": {"entry_fee": 10, "prize": 80},
    "tournament": {"entry_fee": 50, "prize": 5000},
}


@api_router.get("/rooms")
async def list_rooms(filter: Optional[str] = None):
    query: Dict[str, Any] = {"status": {"$in": ["waiting", "playing"]}}
    if filter == "free":
        query["entry_fee"] = 0
    elif filter == "paid":
        query["entry_fee"] = {"$gt": 0}
    elif filter == "tournament":
        query["room_type"] = "tournament"
    rooms = await db.rooms.find(query).sort("created_at", -1).to_list(100)
    return [strip_mongo(r) for r in rooms]


@api_router.post("/rooms")
async def create_room(req: CreateRoomRequest):
    user = await db.users.find_one({"id": req.user_id})
    if not user:
        raise HTTPException(404, "User not found")
    defaults = ROOM_TYPE_DEFAULTS.get(req.room_type, ROOM_TYPE_DEFAULTS["custom"])
    entry_fee = req.entry_fee if req.entry_fee is not None else defaults["entry_fee"]
    prize = defaults["prize"]
    code = str(uuid.uuid4()).split("-")[0].upper()
    room = {
        "id": str(uuid.uuid4()),
        "code": code,
        "name": req.name,
        "room_type": req.room_type,
        "max_players": req.max_players,
        "match_count": req.match_count,
        "entry_fee": entry_fee,
        "prize": prize,
        "host_id": req.user_id,
        "players": [{
            "user_id": user["id"], "username": user["username"],
            "avatar": user["avatar"], "ready": True, "is_host": True,
        }],
        "status": "waiting",
        "called_numbers": [],
        "cards": {},
        "winner_id": None,
        "is_private": req.is_private,
        "created_at": now_utc(),
    }
    await db.rooms.insert_one(room)
    return strip_mongo(room)


@api_router.get("/rooms/{room_id}")
async def get_room(room_id: str):
    room = await db.rooms.find_one({"id": room_id})
    if not room:
        # try by code
        room = await db.rooms.find_one({"code": room_id.upper()})
    if not room:
        raise HTTPException(404, "Room not found")
    return strip_mongo(room)


@api_router.post("/rooms/{room_id}/join")
async def join_room(room_id: str, req: JoinRoomRequest):
    user = await db.users.find_one({"id": req.user_id})
    if not user:
        raise HTTPException(404, "User not found")
    room = await db.rooms.find_one({"id": room_id})
    if not room:
        room = await db.rooms.find_one({"code": room_id.upper()})
    if not room:
        raise HTTPException(404, "Room not found")
    if room["status"] != "waiting":
        raise HTTPException(400, "Room already started")
    if any(p["user_id"] == req.user_id for p in room["players"]):
        return strip_mongo(room)
    if len(room["players"]) >= room["max_players"]:
        raise HTTPException(400, "Room full")
    if user["bcoins"] < room["entry_fee"]:
        raise HTTPException(400, "Not enough Bcoins")
    new_player = {
        "user_id": user["id"], "username": user["username"],
        "avatar": user["avatar"], "ready": False, "is_host": False,
    }
    await db.rooms.update_one({"id": room["id"]}, {"$push": {"players": new_player}})
    if room["entry_fee"] > 0:
        await db.users.update_one({"id": req.user_id}, {"$inc": {"bcoins": -room["entry_fee"]}})
        await db.transactions.insert_one({
            "id": str(uuid.uuid4()), "user_id": req.user_id, "type": "room_entry",
            "amount": -room["entry_fee"], "description": f"Joined {room['name']}",
            "created_at": now_utc(),
        })
    room = await db.rooms.find_one({"id": room["id"]})
    await broadcast_room(room["id"], {"type": "player_joined", "room": strip_mongo(dict(room))})
    return strip_mongo(room)


# ---------------------- Computer (Single-Player) Match ----------------------
@api_router.post("/computer-match")
async def create_computer_match(req: ComputerMatchRequest):
    user = await db.users.find_one({"id": req.user_id})
    if not user:
        raise HTTPException(404, "User not found")
    match_id = str(uuid.uuid4())
    user_card = generate_bingo_card()
    bot_card = generate_bingo_card()
    match = {
        "id": match_id,
        "mode": "computer",
        "user_id": req.user_id,
        "difficulty": req.difficulty,
        "user_card": user_card,
        "bot_card": bot_card,
        "bot_name": "Bingo Bot",
        "bot_avatar": AVATAR_POOL[0],
        "called_numbers": [],
        "status": "playing",
        "winner": None,
        "reward": 150,
        "created_at": now_utc(),
    }
    await db.matches.insert_one(match)
    return strip_mongo(match)


@api_router.post("/computer-match/call")
async def call_number(req: CallNumberRequest):
    match = await db.matches.find_one({"id": req.match_id})
    if not match:
        raise HTTPException(404, "Match not found")
    if match["status"] != "playing":
        raise HTTPException(400, "Match finished")
    called = match["called_numbers"]
    remaining = [n for n in range(1, 76) if n not in called]
    if not remaining:
        raise HTTPException(400, "No numbers left")
    next_num = random.choice(remaining)
    called.append(next_num)
    # difficulty: bot auto-claims when it has bingo, varying probability
    bot_has_bingo = check_bingo(match["bot_card"], called)
    bot_claim_prob = {"easy": 0.3, "medium": 0.7, "hard": 1.0}.get(match.get("difficulty", "medium"), 0.7)
    winner = None
    if bot_has_bingo and random.random() < bot_claim_prob:
        winner = "bot"
        await db.matches.update_one({"id": req.match_id}, {"$set": {
            "called_numbers": called, "status": "finished", "winner": "bot",
        }})
        await db.users.update_one({"id": match["user_id"]}, {"$inc": {"matches": 1}, "$set": {"streak": 0}})
    else:
        await db.matches.update_one({"id": req.match_id}, {"$set": {"called_numbers": called}})
    match = await db.matches.find_one({"id": req.match_id})
    return strip_mongo(match)


@api_router.post("/computer-match/claim-bingo")
async def claim_bingo(req: ClaimBingoRequest):
    match = await db.matches.find_one({"id": req.match_id})
    if not match:
        raise HTTPException(404, "Match not found")
    if match["status"] != "playing":
        raise HTTPException(400, "Match finished")
    if not check_bingo(match["user_card"], match["called_numbers"]):
        # Invalid claim - small penalty
        await db.matches.update_one({"id": req.match_id}, {"$set": {"status": "finished", "winner": "bot"}})
        return {"valid": False, "message": "Invalid bingo claim!"}
    reward = match.get("reward", 150)
    await db.matches.update_one({"id": req.match_id}, {"$set": {"status": "finished", "winner": "user"}})
    await db.users.update_one(
        {"id": req.user_id},
        {"$inc": {"matches": 1, "wins": 1, "bcoins": reward, "streak": 1, "xp": 50}},
    )
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()), "user_id": req.user_id, "type": "match_win",
        "amount": reward, "description": "Bingo win vs Bot", "created_at": now_utc(),
    })
    await _update_achievements(req.user_id)
    return {"valid": True, "reward": reward}


async def _update_achievements(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        return
    ach = user.get("achievements", {}) or {}
    wins = user.get("wins", 0)
    matches = user.get("matches", 0)
    streak = user.get("streak", 0)
    friends = len(user.get("friends", []))
    progress = {
        "first_win": wins,
        "win_10": wins,
        "win_50": wins,
        "play_25": matches,
        "streak_5": streak,
        "social": friends,
    }
    rewards_to_grant = 0
    for a in ACHIEVEMENTS:
        if a["id"] in ach and ach[a["id"]].get("unlocked"):
            continue
        cur = progress.get(a["id"], 0)
        if cur >= a["target"]:
            ach[a["id"]] = {"unlocked": True, "unlocked_at": iso(now_utc())}
            rewards_to_grant += a["reward"]
        else:
            ach[a["id"]] = {"unlocked": False, "progress": cur}
    updates: Dict[str, Any] = {"$set": {"achievements": ach}}
    if rewards_to_grant > 0:
        updates["$inc"] = {"bcoins": rewards_to_grant}
    await db.users.update_one({"id": user_id}, updates)


# ---------------------- Leaderboard / Tournaments / Achievements / Friends ----------------------
@api_router.get("/leaderboard")
async def leaderboard(period: str = "all"):
    users = await db.users.find({}).sort("wins", -1).limit(50).to_list(50)
    out = []
    for i, u in enumerate(users):
        out.append({
            "rank": i + 1,
            "user_id": u.get("id"),
            "username": u.get("username"),
            "avatar": u.get("avatar"),
            "wins": u.get("wins", 0),
            "bcoins": u.get("bcoins", 0),
            "level": u.get("level", 1),
        })
    return {"period": period, "leaderboard": out}


@api_router.get("/tournaments")
async def tournaments():
    return TOURNAMENTS


@api_router.post("/tournament/register")
async def tournament_register(user_id: str, tournament_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(404, "User not found")
    tour = next((t for t in TOURNAMENTS if t["id"] == tournament_id), None)
    if not tour:
        raise HTTPException(404, "Tournament not found")
    if user["bcoins"] < tour["entry_fee"]:
        raise HTTPException(400, "Not enough Bcoins")
    await db.users.update_one({"id": user_id}, {"$inc": {"bcoins": -tour["entry_fee"]}})
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id, "type": "tournament_entry",
        "amount": -tour["entry_fee"], "description": f"Registered for {tour['name']}",
        "created_at": now_utc(),
    })
    return {"ok": True, "tournament_id": tournament_id}


@api_router.get("/achievements/{user_id}")
async def achievements(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(404, "User not found")
    ach = user.get("achievements", {}) or {}
    out = []
    for a in ACHIEVEMENTS:
        info = ach.get(a["id"], {})
        out.append({
            **a,
            "unlocked": info.get("unlocked", False),
            "progress": info.get("progress", 0) if not info.get("unlocked") else a["target"],
        })
    return out


@api_router.get("/friends/{user_id}")
async def friends_list(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(404, "User not found")
    friend_ids = user.get("friends", [])
    friends = []
    async for f in db.users.find({"id": {"$in": friend_ids}}):
        friends.append({
            "user_id": f["id"], "username": f["username"], "avatar": f["avatar"],
            "level": f.get("level", 1), "wins": f.get("wins", 0),
            "online": random.choice([True, False]),
        })
    return friends


@api_router.post("/friends/add")
async def friends_add(req: AddFriendRequest):
    user = await db.users.find_one({"id": req.user_id})
    if not user:
        raise HTTPException(404, "User not found")
    friend = await db.users.find_one({"friend_code": req.friend_code.upper()})
    if not friend:
        raise HTTPException(404, "Friend code not found")
    if friend["id"] == req.user_id:
        raise HTTPException(400, "Can't add yourself")
    if friend["id"] in user.get("friends", []):
        return {"ok": True, "message": "Already friends"}
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
async def shop_items():
    return SHOP_ITEMS


@api_router.post("/shop/purchase-bcoins")
async def purchase_with_bcoins(req: PurchaseRequest):
    """Spend Bcoins for in-game items (power-ups, room cards via Bcoins)."""
    user = await db.users.find_one({"id": req.user_id})
    if not user:
        raise HTTPException(404, "User not found")
    item = next((i for i in SHOP_ITEMS if i["id"] == req.item_id), None)
    if not item:
        raise HTTPException(404, "Item not found")
    # For Bcoin-priced items (e.g., buy room cards with earned coins)
    cost = item.get("price_bcoins", item.get("price_inr", 0) * 5)  # fallback: 1 INR = 5 Bcoins
    if user["bcoins"] < cost:
        raise HTTPException(400, "Not enough Bcoins")
    await db.users.update_one({"id": req.user_id}, {"$inc": {"bcoins": -cost}})
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()), "user_id": req.user_id, "type": "shop_purchase",
        "amount": -cost, "description": f"Bought {item['name']}", "created_at": now_utc(),
    })
    return {"ok": True, "item": item}


# ---------------------- Razorpay Payments ----------------------
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
razorpay_client = None
try:
    if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
        import razorpay as _rzp
        razorpay_client = _rzp.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
except Exception as e:
    logger.warning(f"Razorpay init failed: {e}")


@api_router.post("/payments/razorpay/create-order")
async def create_razorpay_order(req: RazorpayOrderRequest):
    item = next((i for i in SHOP_ITEMS if i["id"] == req.item_id), None)
    if not item:
        raise HTTPException(404, "Item not found")
    amount = int(item["price_inr"] * 100)  # paise
    if razorpay_client is None:
        # Mock order for development - frontend should warn user
        return {
            "mocked": True,
            "order_id": f"order_mock_{uuid.uuid4().hex[:12]}",
            "amount": amount, "currency": "INR",
            "key_id": "rzp_test_mock",
            "item": item,
            "message": "Razorpay keys not configured. Add RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET to backend/.env",
        }
    order = razorpay_client.order.create({
        "amount": amount, "currency": "INR", "payment_capture": 1,
        "notes": {"user_id": req.user_id, "item_id": req.item_id},
    })
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()), "user_id": req.user_id, "type": "razorpay_order",
        "amount": 0, "order_id": order["id"], "item_id": req.item_id,
        "status": "created", "description": f"Order: {item['name']}", "created_at": now_utc(),
    })
    return {"mocked": False, "order_id": order["id"], "amount": amount, "currency": "INR",
            "key_id": RAZORPAY_KEY_ID, "item": item}


@api_router.post("/payments/razorpay/verify")
async def verify_razorpay(req: RazorpayVerifyRequest):
    item = next((i for i in SHOP_ITEMS if i["id"] == req.item_id), None)
    if not item:
        raise HTTPException(404, "Item not found")
    if razorpay_client is None:
        # Mock verification - grant item
        return await _grant_shop_item(req.user_id, item, req.razorpay_payment_id, mocked=True)
    try:
        razorpay_client.utility.verify_payment_signature({
            "razorpay_order_id": req.razorpay_order_id,
            "razorpay_payment_id": req.razorpay_payment_id,
            "razorpay_signature": req.razorpay_signature,
        })
    except Exception as e:
        raise HTTPException(400, f"Signature verification failed: {e}")
    return await _grant_shop_item(req.user_id, item, req.razorpay_payment_id, mocked=False)


async def _grant_shop_item(user_id: str, item: dict, payment_id: str, mocked: bool):
    inc = {}
    if item["type"] == "bcoins":
        inc["bcoins"] = item["amount"]
    if inc:
        await db.users.update_one({"id": user_id}, {"$inc": inc})
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id,
        "type": "razorpay_purchase" + ("_mock" if mocked else ""),
        "amount": item.get("amount", 0) if item["type"] == "bcoins" else 0,
        "payment_id": payment_id, "item_id": item["id"],
        "description": f"Purchased {item['name']}", "created_at": now_utc(),
    })
    return {"ok": True, "item": item, "mocked": mocked}


# ---------------------- WebSocket Multiplayer ----------------------
class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, room_id: str, user_id: str, ws: WebSocket):
        await ws.accept()
        self.rooms.setdefault(room_id, {})[user_id] = ws

    def disconnect(self, room_id: str, user_id: str):
        if room_id in self.rooms and user_id in self.rooms[room_id]:
            del self.rooms[room_id][user_id]
            if not self.rooms[room_id]:
                del self.rooms[room_id]

    async def broadcast(self, room_id: str, message: dict):
        conns = self.rooms.get(room_id, {})
        dead = []
        for uid, ws in list(conns.items()):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(uid)
        for uid in dead:
            self.disconnect(room_id, uid)


manager = RoomManager()


async def broadcast_room(room_id: str, message: dict):
    await manager.broadcast(room_id, message)


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
            try:
                msg = json.loads(data)
            except Exception:
                continue
            mtype = msg.get("type")
            if mtype == "ready":
                room = await db.rooms.find_one({"id": room_id})
                if not room:
                    continue
                for p in room["players"]:
                    if p["user_id"] == user_id:
                        p["ready"] = bool(msg.get("ready", True))
                await db.rooms.update_one({"id": room_id}, {"$set": {"players": room["players"]}})
                await broadcast_room(room_id, {"type": "room_state", "room": strip_mongo(dict(room))})
            elif mtype == "start":
                room = await db.rooms.find_one({"id": room_id})
                if not room or room.get("host_id") != user_id:
                    continue
                # Generate cards
                cards = {p["user_id"]: generate_bingo_card() for p in room["players"]}
                await db.rooms.update_one({"id": room_id}, {"$set": {
                    "status": "playing", "cards": cards, "called_numbers": [],
                    "started_at": now_utc(),
                }})
                room = await db.rooms.find_one({"id": room_id})
                await broadcast_room(room_id, {"type": "game_started", "room": strip_mongo(dict(room))})
                # Auto caller loop
                number_caller_task = asyncio.create_task(_auto_caller(room_id))
            elif mtype == "chat":
                await broadcast_room(room_id, {
                    "type": "chat", "user_id": user_id,
                    "message": str(msg.get("message", ""))[:120],
                })
            elif mtype == "emote":
                await broadcast_room(room_id, {
                    "type": "emote", "user_id": user_id,
                    "emote": str(msg.get("emote", ""))[:40],
                })
            elif mtype == "claim_bingo":
                room = await db.rooms.find_one({"id": room_id})
                if not room or room.get("status") != "playing":
                    continue
                card = (room.get("cards") or {}).get(user_id)
                if not card:
                    continue
                if check_bingo(card, room.get("called_numbers", [])):
                    prize = room.get("prize", 100)
                    await db.rooms.update_one({"id": room_id}, {"$set": {
                        "status": "finished", "winner_id": user_id,
                    }})
                    await db.users.update_one({"id": user_id}, {"$inc": {
                        "wins": 1, "matches": 1, "bcoins": prize, "streak": 1, "xp": 100,
                    }})
                    await db.transactions.insert_one({
                        "id": str(uuid.uuid4()), "user_id": user_id, "type": "match_win",
                        "amount": prize, "description": f"Won {room['name']}", "created_at": now_utc(),
                    })
                    await _update_achievements(user_id)
                    # Mark loss for others
                    for p in room["players"]:
                        if p["user_id"] != user_id:
                            await db.users.update_one({"id": p["user_id"]}, {"$inc": {"matches": 1}, "$set": {"streak": 0}})
                    room = await db.rooms.find_one({"id": room_id})
                    await broadcast_room(room_id, {"type": "bingo_winner", "winner_id": user_id, "prize": prize, "room": strip_mongo(dict(room))})
                    if number_caller_task:
                        number_caller_task.cancel()
                else:
                    await websocket.send_json({"type": "invalid_bingo"})
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(room_id, user_id)
        if number_caller_task:
            number_caller_task.cancel()


async def _auto_caller(room_id: str):
    """Auto-call numbers every 3 seconds until game ends or all numbers exhausted."""
    try:
        while True:
            await asyncio.sleep(3)
            room = await db.rooms.find_one({"id": room_id})
            if not room or room.get("status") != "playing":
                break
            called = room.get("called_numbers", [])
            remaining = [n for n in range(1, 76) if n not in called]
            if not remaining:
                break
            next_num = random.choice(remaining)
            called.append(next_num)
            await db.rooms.update_one({"id": room_id}, {"$set": {"called_numbers": called}})
            await broadcast_room(room_id, {
                "type": "number_called", "number": next_num, "called_numbers": called,
            })
    except asyncio.CancelledError:
        pass


# ---------------------- App wiring ----------------------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    logger.info("Bingo Blast backend started")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
