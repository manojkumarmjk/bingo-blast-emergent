#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Bingo Blast — multiplayer bingo mobile app. Current iteration: (1) fix Metro 'Unable to resolve module src/StateViews' crash that blocks Profile/Streak/BattlePass/Collections screens; (2) add a backend toggle (USE_REAL_RAZORPAY) that switches between real Razorpay and mock checkout; (3) add a Razorpay config endpoint the frontend can read; (4) scaffold Expo push notifications (expo-notifications, expo-device) and call /api/push/register after login; (5) verify the new Phase-2 endpoints (/api/matchmaking, /api/vip, /api/avatars→/cosmetics, /api/guilds, /api/push/register) still work end-to-end."

backend:
  - task: "Avatar catalogue endpoint + hardened /user/update validation"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "NEW: GET /api/avatars/list returns 12 DiceBear system avatars ({id:'sys_N', url:...}). Expanded AVATARS list from 3 to 12. Hardened POST /api/user/update: username must be 2–18 chars (400 otherwise), avatar must match one of AVATARS exactly (400 otherwise), response now returns {ok, user:<fresh doc>} for optimistic UI updates. Existing fields continue to work."
      - working: true
        agent: "testing"
        comment: "PASS. GET /api/avatars/list returns exactly 12 entries with ids sys_0..sys_11 and every url starts with https://api.dicebear.com/. POST /api/user/update validation: username='A' -> 400 'Username must be 2–18 characters'; 19-char username -> 400 same; arbitrary avatar URL (evil.example.com) -> 400 'Invalid avatar selection'. Valid combined update {username:'NewName12', avatar:<first dicebear URL>} -> 200 with {ok:true, user:{...}} and user.username/user.avatar reflect new values. Follow-up GET /api/user/{user_id} confirms persistence (both fields saved). /app/backend_round2_test.py 16/16 assertions for this task passed."

  - task: "Matchmaking bot timeout bumped to 60s"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "MATCHMAKING_BOT_TIMEOUT_SECONDS raised from 15 → 60. GET /api/matchmaking/status/{entry_id} response now reports bot_fallback_in ≈ 60 on a freshly-joined classic queue. Frontend matchmaking.tsx updated to display 'Auto-match with Bot in 1m 0s'."
      - working: true
        agent: "testing"
        comment: "PASS. POST /api/matchmaking/join?user_id=<fresh_user> -> 200 {status:'queued', entry_id, wait_seconds:0}. Immediate GET /api/matchmaking/status/{entry_id} -> 200 {status:'queued', wait_seconds:0, bot_fallback_in:60}. Regression check satisfied: bot_fallback_in is 60 (in target range 55–60), NOT the old 15s. POST /api/matchmaking/cancel/{entry_id} -> 200 cleanup succeeded. Regression sanity: GET /api/payments/razorpay/config still returns mode='mock'; POST /api/push/register returns {ok:true}; GET /api/shop/items returns 8 items. All 30/30 round-2 assertions passed."

  - task: "Razorpay USE_REAL_RAZORPAY toggle + /payments/razorpay/config endpoint"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added USE_REAL_RAZORPAY env flag (default false). Client is initialised only when flag is true AND both keys are present. New GET /api/payments/razorpay/config returns {use_real, key_id, mode}. /payments/razorpay/create-order and /verify already branch on razorpay_client==None for mock path. Please verify: config returns mode=mock, create-order returns mocked=true with deterministic shape, verify grants the shop item, balance increments."
      - working: true
        agent: "testing"
        comment: "All Razorpay mock-mode checks PASS. GET /api/payments/razorpay/config -> {use_real:false, mode:'mock', key_id:'rzp_test_mock'}. POST /api/payments/razorpay/create-order with bcoins item coins_100 -> 200 with mocked=true and order_id 'order_mock_db3d8a1bc220'. POST /api/payments/razorpay/verify with mock signature -> {ok:true, mocked:true}. User bcoins incremented exactly by item.amount (500 -> 600 for coins_100). transactions collection has new razorpay_purchase_mock row referencing item_id and payment_id. coins_3000 top-up flow also verified for downstream guild test (3500 BC). No issues."

  - task: "Push token registration endpoint /api/push/register"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Scaffold only. Accepts user_id/token/platform via query, stores push_token & push_platform on user doc. Please confirm 200 + persistence in users collection."
      - working: true
        agent: "testing"
        comment: "PASS. POST /api/push/register?user_id=...&token=ExponentPushToken[abc123]&platform=expo returns {ok:true}. Subsequent GET /api/user/{user_id} confirms push_token='ExponentPushToken[abc123]' and push_platform='expo' persisted."

  - task: "Phase-2 endpoints: matchmaking, vip, cosmetics/avatars, guilds"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Previously added in prior session, never tested. Need smoke tests: POST /matchmaking/join (classic), GET /matchmaking/status, GET /vip/info/{user_id}, POST /vip/activate, GET /cosmetics/{user_id}, POST /cosmetics/equip, POST /guilds/create, POST /guilds/join, POST /guilds/leave. All should return 200 and mutate DB correctly."
      - working: true
        agent: "testing"
        comment: "All Phase-2 endpoints PASS. Matchmaking: POST /api/matchmaking/join?user_id=... -> 200 with status='queued' and entry_id; GET /api/matchmaking/status/{entry_id} -> 200 with status/wait_seconds/bot_fallback_in fields. Note: matchmaking_join takes only user_id (no mode param) and matchmaking_status uses path param /matchmaking/status/{entry_id} (NOT query ?user_id). Review request mentioned ?user_id -- actual implementation uses entry_id path param; tested using actual signature and it works correctly. VIP: GET /api/vip/info/{user_id} returns plans+perks+active=false initially; POST /api/vip/activate?user_id=...&plan_id=vip_monthly -> 200 ok, expires_at +30d; subsequent GET shows active=true and days_left=29. Cosmetics: GET /api/cosmetics/{user_id} returns frames/titles/backgrounds with equipped state; POST /api/cosmetics/equip?user_id=...&category=titles&item_id=title_newbie -> 200 with equipped.title=title_newbie, persisted in user doc. Guilds: POST /api/guilds/create?user_id=...&name=TestGuild&tag=TG (after top-up to >=1000 BC) -> 200 returns guild with id+code; user.guild_id set. POST /api/guilds/join?user_id=<userC>&code_or_id=<code> -> 200, user_c.guild_id set, guild.members contains both. POST /api/guilds/leave?user_id=<userC> -> {ok:true}, user_c.guild_id cleared. 24/24 assertions passed in /app/backend_test.py."

frontend:
  - task: "Fix Metro resolve error for src/StateViews (Profile/Streak/BattlePass/Collections blank screens)"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/StateViews.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "StateViews.tsx actually exists. Root cause was stale Metro cache that cached the resolution failure from before the file was created. Cleared /tmp/metro-* haste map and restarted expo — web bundle now builds (HTTP 200). Not calling frontend testing agent per user protocol."

  - task: "Expo push notification scaffold (expo-notifications + registration on home)"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/push.ts"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added expo-notifications + expo-device. New helper src/push.ts requests permission (no-op on web/simulator), fetches Expo token, POSTs to /api/push/register via api.pushRegister. Hooked into (tabs)/index.tsx after loadUser succeeds. Delivery requires a dev/native build."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 3
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "Please smoke-test the three backend tasks above. Use existing guest login flow (POST /api/guest/login with a device_id) to get a user_id. Razorpay must be in MOCK mode (confirm via GET /api/payments/razorpay/config -> mode='mock'). For shop purchase test: GET /api/shop/items, pick a bcoins item, POST /payments/razorpay/create-order -> expect mocked=true, then POST /payments/razorpay/verify with any fake payment_id -> expect ok=true and user bcoins incremented. For push: POST /api/push/register?user_id=...&token=ExponentPushToken[xxx]&platform=expo -> expect ok=true and push_token set on user. For Phase-2: exercise matchmaking/join (classic mode), vip/info, cosmetics/equip, guilds/create+join+leave. Do NOT test frontend — user has not approved frontend testing yet."
  - agent: "main"
    message: "ROUND 2 changes to verify: (1) NEW endpoint GET /api/avatars/list — should return {avatars: [{id:'sys_0', url:'https://api.dicebear.com/...'}]} with exactly 12 entries. (2) POST /api/user/update now validates: username must be 2–18 chars, avatar must be one of the 12 system avatar URLs. Response now returns {ok:true, user:<fresh user doc>}. Verify: 400 on username length < 2 or > 18; 400 on unknown avatar URL; 200 + persisted change when passing a valid dicebear URL from /api/avatars/list. (3) MATCHMAKING_BOT_TIMEOUT_SECONDS bumped from 15 → 60. Confirm GET /api/matchmaking/status/{entry_id} returns bot_fallback_in starting around 60 (not 15) for a fresh queue entry, and only falls back to bot after 60s. (4) Push/Razorpay/Phase-2 regressions — re-run the existing smoke tests to confirm they still pass."
  - agent: "testing"
    message: "Backend smoke tests COMPLETE. 24/24 assertions passed in /app/backend_test.py against the public preview URL. Razorpay mock toggle works end-to-end: config reports mode=mock, create-order returns mocked=true with order_mock_* prefix, verify grants the bcoins item (balance went from 500 -> 600 for coins_100, 500 -> 3500 for coins_3000), and a transaction row of type 'razorpay_purchase_mock' is inserted referencing item_id and payment_id. Push register persists push_token + push_platform on the user doc and returns {ok:true}. Phase-2: matchmaking join/status/cancel all 200 (note: server signature is GET /api/matchmaking/status/{entry_id} with path param, NOT ?user_id query — the review-request example for status is slightly off, but the actual implementation works correctly and the frontend already uses it). VIP info+activate (vip_monthly) toggles active=true with 29 days_left. Cosmetics equip titles=title_newbie persists in user.equipped. Guilds create (1000 BC cost), join via code, member listing, and leave all work and DB state is consistent. No bugs or regressions found. Frontend was NOT tested."
  - agent: "testing"
    message: "ROUND 2 smoke-tests COMPLETE. 30/30 assertions passed in /app/backend_round2_test.py. (1) Avatar catalogue: GET /api/avatars/list returns exactly 12 entries with ids sys_0..sys_11 and DiceBear URLs. /api/user/update validation works: short/long usernames and non-whitelisted avatar URLs all return 400 with clear messages; valid {username:'NewName12', avatar:<first dicebear URL>} returns 200 {ok:true, user:{...}} and the change persists (verified via GET /api/user/{id}). (2) Matchmaking bot timeout regression fixed: GET /api/matchmaking/status/{entry_id} now returns bot_fallback_in:60 on a fresh queue entry (NOT ~15). Cancel endpoint also 200. (3) Regression sanity all green: razorpay config mode='mock', push/register -> {ok:true}, shop/items returns 8 items. No bugs found."
