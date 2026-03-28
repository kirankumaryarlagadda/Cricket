# 🏏 IPL Picks 2026

A prediction game for IPL 2026 where players vote for match winners and compete on a leaderboard. Built with Next.js, Supabase, and deployed on Vercel.

**🌐 Live:** [cricket-delta-seven.vercel.app](https://cricket-delta-seven.vercel.app)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🗳️ **Pick System** | Vote for the winning team up to 30 min before match start |
| ✏️ **Change / Reset Picks** | Switch your pick or reset to undecided before deadline |
| 🔒 **Hidden Picks** | Other players' picks hidden until match starts, then revealed |
| ⛔ **Skipped Players Shown** | Once match starts, shows who picked what AND who skipped |
| 🏆 **Leaderboard** | Real-time rankings with points, streaks, and tie-aware podium |
| 🔥 **Winning Streaks** | Tracks current and longest winning streak per player |
| 💰 **Prize Pool** | Dedicated prizes page with configurable amounts ($) |
| 📋 **Rules Page** | Dedicated page with scoring, tiebreakers, pick rules, prize rules |
| 👤 **Player Approval** | Admin approves/rejects signups — no random access |
| 🗑️ **Remove Players** | Admin can remove approved players (deletes account + all picks) |
| ⚙️ **Admin Panel** | 3-tab panel: Matches, Players, Settings |
| 🔑 **Admin Password Reset** | Admin can reset any player's password (generates temp password) |
| 🔒 **Forgot Password** | Self-service password reset via email link |
| 🔐 **Forced Password Reset** | After admin reset, user must set new password on login |
| 🔄 **Auto-Scoring** | Sync results from Cricket API with one click |
| 🌍 **Multi-Timezone** | All dates/times display in each player's local timezone |
| 📱 **Responsive** | Grid + List view toggle, mobile-optimized leaderboard with card layout |
| 🎨 **Demo Match Support** | Demo matches highlighted in red for pre-season testing |
| 👤 **Display Name System** | Unique names, reserved forever, change once per day |
| 👤 **Profile Page** | Players can update their display name (avatar → Profile) |

---

## 📊 Scoring System

| Stage | ✅ Correct | ❌ Wrong | ⛔ Missed (skipped) |
|-------|-----------|---------|---------------------|
| **League** (Match 1–70) | +5 | -3 | -3 |
| **Knockout** (Qualifier / Eliminator) | +10 | -5 | -5 |
| **Final** | +15 | -10 | -10 |

> Missing a pick (not voting before deadline) counts the same as a wrong pick.

---

## ⚖️ Ranking Tiebreakers (in order)

| Priority | Tiebreaker | Better = |
|----------|-----------|----------|
| 1 | Total Points | Higher |
| 2 | Correct Picks | More |
| 3 | Longest Winning Streak | Higher |
| 4 | Wrong Picks | Fewer |
| 5 | Missed Picks | Fewer |
| 6 | Still Tied | Same rank (admin decides or prize split) |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        USERS                            │
│            (Browser / Mobile — any timezone)             │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                   Vercel (Free Tier)                     │
│                                                         │
│   Next.js 15 App (App Router)                           │
│   ├── Pages: Login, Signup, Pending Approval, Matches,  │
│   │   Leaderboard, My Picks, Prizes, Rules, Profile,    │
│   │   Match Detail, Admin, Reset Password, Force Reset  │
│   ├── API Routes:                                       │
│   │   ├── /api/picks            (POST/GET/DELETE)       │
│   │   ├── /api/matches          (GET)                   │
│   │   ├── /api/matches/[id]     (GET)                   │
│   │   ├── /api/leaderboard      (GET)                   │
│   │   ├── /api/profile          (POST)                  │
│   │   ├── /api/profile/check-name (POST)                │
│   │   ├── /api/admin/set-winner     (POST)              │
│   │   ├── /api/admin/update-match   (POST)              │
│   │   ├── /api/admin/add-match      (POST)              │
│   │   ├── /api/admin/manage-players (POST)              │
│   │   ├── /api/admin/update-prizes  (POST)              │
│   │   └── /api/cron/update-results  (POST, admin-only)  │
│   └── Middleware: Auth + Approval + Force Reset gate     │
└───────────────────────┬─────────────────────────────────┘
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
┌──────────────────────┐ ┌────────────────────┐
│   Supabase (Free)    │ │  CricketData API   │
│                      │ │  (Free Tier)       │
│  ✦ PostgreSQL DB     │ │                    │
│    ├── profiles      │ │  Used by admin to  │
│    ├── matches       │ │  auto-fetch match  │
│    ├── picks         │ │  results via       │
│    ├── app_settings  │ │  "Sync Results"    │
│    └── reserved_names│ │  button            │
│                      │ │                    │
│  ✦ Auth (email/pwd)  │ └────────────────────┘
│  ✦ Row Level Security│
│  ✦ Auto-triggers     │
│  ✦ SMTP via Resend   │
└──────────────────────┘
```

---

## 📅 IPL 2026 Schedule

| Detail | Value |
|--------|-------|
| **Total League Matches** | 70 (each of 10 teams plays 14 matches) |
| **Playoff Matches** | TBD (Qualifier 1, Eliminator, Qualifier 2, Final) |
| **Season Start** | March 28, 2026 |
| **League End** | May 24, 2026 |
| **Double Headers** | 12 days (3:30 PM + 7:30 PM IST) |
| **Single Matches** | 7:30 PM IST |
| **Venues** | 13 stadiums across India |
| **Data Source** | Official iplt20.com schedule, cross-validated with PDF |

### Venues
Bengaluru, Mumbai, Guwahati, New Chandigarh, Lucknow, Kolkata, Chennai, Delhi, Ahmedabad, Hyderabad, Jaipur, Raipur, Dharamshala

---

## 🗃️ Database Schema

### `profiles`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | References auth.users |
| email | TEXT | User's email |
| display_name | TEXT | Shown on leaderboard & picks |
| is_admin | BOOLEAN | Admin access flag |
| is_approved | BOOLEAN | Must be true to access app (admin approves) |
| last_name_change | TIMESTAMPTZ | Tracks last display name change (24hr cooldown) |
| created_at | TIMESTAMPTZ | Signup timestamp |

### `matches`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| match_number | INTEGER (UNIQUE) | Match 1, 2, 3... up to 70+ |
| team1 / team2 | TEXT | Team abbreviations (CSK, MI, RCB...) |
| venue | TEXT | Stadium and city |
| match_date | TIMESTAMPTZ | Match start time (stored as UTC) |
| status | TEXT | `upcoming` / `live` / `completed` |
| winner | TEXT | Set after match ends (NULL until then) |
| stage | TEXT | `league` / `qualifier` / `eliminator` / `final` |

### `picks`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| user_id | UUID (FK) | References profiles |
| match_id | UUID (FK) | References matches |
| picked_team | TEXT | Team abbreviation |
| UNIQUE | | (user_id, match_id) — one pick per match |

### `app_settings`
| Column | Type | Description |
|--------|------|-------------|
| key | TEXT (PK) | Setting name (e.g., `prizes`) |
| value | JSONB | `{"first": 700, "second": 400, "third": 200, "streak": 100}` |

### `reserved_names`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| name_lower | TEXT | Lowercase version of the display name |
| originally_used_by | UUID (FK) | The user who first used this name |
| created_at | TIMESTAMPTZ | When the name was reserved |

---

## 🔒 Security (Row Level Security)

| Table | Policy | Rule |
|-------|--------|------|
| **profiles** | SELECT | All authenticated users (needed for leaderboard) |
| **profiles** | INSERT/UPDATE | Own profile only |
| **matches** | SELECT | All authenticated users |
| **matches** | INSERT/UPDATE/DELETE | Admin only (via service_role key) |
| **picks** | SELECT | Own picks always; others' picks only after match starts (`status != 'upcoming'`) |
| **picks** | INSERT | Own picks only |
| **picks** | UPDATE/DELETE | Via API with admin service key (server-side validated) |
| **app_settings** | SELECT | All authenticated users |
| **app_settings** | INSERT/UPDATE | Admin only (via service_role key) |
| **reserved_names** | All operations | Admin only (via service_role key) |

---

## 🔐 Auth & Approval Flow

```
1. Player signs up (email + password + display name)
   ├── display_name checked for uniqueness against profiles + reserved_names
   └── display_name passed via auth metadata → trigger creates profile
2. Account created → is_approved = FALSE
3. Player sees "⏳ Waiting for Approval" page (middleware blocks all other routes)
4. Admin goes to /admin → 👥 Players tab → clicks ✅ Approve
5. Player refreshes → middleware allows access → redirected to Matches dashboard
```

- **Email verification disabled** — controlled via admin approval instead
- **SMTP configured via Resend** — for password reset emails (3,000/month free)
- **Middleware** blocks unapproved users from all pages except `/login`, `/signup`, `/pending-approval`, `/reset-password`, `/force-reset`
- Admin can also **🗑️ Remove** approved players (deletes auth account + profile + all picks)

---

## 🔑 Password Reset (Two Methods)

### Method 1: Self-Service (Forgot Password)
```
1. Player clicks "Forgot Password?" on login page
2. Enters email → clicks "Send Reset Link"
3. Receives email with reset link (via Resend SMTP)
4. Clicks link → redirected to /reset-password
5. Enters new password + confirms → done
6. Redirected to app automatically
```

### Method 2: Admin Reset
```
1. Admin goes to /admin → 👥 Players tab
2. Clicks "🔑 Reset Password" next to any player
3. Confirms → gets a popup with:
   ├── Player's email
   └── Temporary password (auto-generated)
4. Admin shares temp password with player (WhatsApp, text, etc.)
5. Player logs in with email + temp password
6. Middleware detects force_password_reset flag → redirects to /force-reset
7. Player sets new password → flag cleared → enters app
```

| | Self-Service | Admin Reset |
|---|---|---|
| **Who initiates?** | Player | Admin |
| **How?** | "Forgot Password?" link | Admin panel → 🔑 button |
| **Delivery** | Email with reset link | Admin shares temp password manually |
| **Reset page** | `/reset-password` | `/force-reset` (on next login) |
| **Requires email?** | ✅ Yes | ❌ No (backup method) |

---

## 🗳️ Pick Flow

```
1. Player sees upcoming matches with pick buttons (Grid or List view)
2. Clicks a team → pick saved via POST /api/picks
3. Can SWITCH to other team → pick updated via POST /api/picks
4. Can RESET pick (↩ button) → pick deleted via DELETE /api/picks
5. 30 min before match → picks LOCKED (deadline enforced server-side)
6. Match starts (status = 'live') → all picks REVEALED to everyone
   ├── Shows who picked which team (with team-colored cards)
   └── Shows who SKIPPED (⛔ grey cards)
7. Match ends → admin sets winner → scores calculated automatically
   ├── ✅ next to correct picks
   └── ❌ next to wrong picks
```

---

## 👤 Display Name System

| Rule | Description |
|------|-------------|
| **Unique names** | No two players can have the same display name (case-insensitive) |
| **Reserved forever** | Once you use a name, it's permanently reserved for you |
| **Switch back** | You can always switch back to any of your own previous names |
| **Once per day** | Display name can only be changed once every 24 hours |
| **2–30 characters** | Name must be between 2 and 30 characters |
| **Checked at signup** | New signups are also checked against reserved names |
| **Profile page** | Click avatar → Profile to change your display name |

### Example:
```
Kiran signs up as "Kiran"      → "kiran" reserved for Kiran
Kiran changes to "KKY"         → "kky" also reserved for Kiran, "kiran" still reserved
Dibc tries to signup as "Kiran" → ❌ "Previously used and reserved"
Kiran changes back to "Kiran"   → ✅ Works (own reserved name)
Kiran tries to change again     → ❌ "Once per day" (wait 24 hours)
```

---

## 🔥 Streak Calculation

- Winning streak = consecutive correct picks across completed matches (ordered by match_number)
- A **wrong pick** or **missed pick** (skipped) breaks the streak
- **Current streak**: active streak at the end of all completed matches
- **Longest streak**: highest streak achieved across the entire season
- Streak leader banner shown when a single player has highest streak ≥ 2
- If multiple players tied for longest streak ≥ 2: shows "tied between X, Y"
- Streak of 1 = no banner (not meaningful yet)

### 🔥 Streak Prize Rule
- Streak prize is awarded to the **best streak among players OUTSIDE the Top 3**
- Top 3 already get placement prizes, so streak prize goes to a different player
- If no one outside Top 3 has streak ≥ 2, no streak prize shown

---

## 🏆 Prize Distribution

| Prize | Awarded To |
|-------|-----------|
| 🥇 1st Place | Highest ranked player at end of tournament |
| 🥈 2nd Place | Second highest ranked player |
| 🥉 3rd Place | Third highest ranked player |
| 🔥 Longest Streak | Best winning streak among players **outside Top 3** |
| 🤝 Ties | Prize is split equally among tied players |
| 📅 Timing | All prizes awarded after the final match |

---

## 🧭 Navigation (6 Pages)

| Page | URL | Description |
|------|-----|-------------|
| **Matches** | `/` | Match cards, pick buttons, grid/list toggle, countdowns |
| **Leaderboard** | `/leaderboard` | Stats, podium (tie-aware), rankings table |
| **My Picks** | `/my-picks` | Personal pick history + summary stats |
| **Prizes** | `/prizes` | Prize pool display + distribution rules |
| **Rules** | `/rules` | Scoring, tiebreakers, pick rules, name change rules |
| **Profile** | `/profile` | Edit display name (via avatar dropdown) |

**Admin-only:** `/admin` — 3 tabs: Matches, Players, Settings

**Auth pages:** `/login`, `/signup`, `/pending-approval`, `/reset-password`, `/force-reset`

---

## 👑 Admin Panel (`/admin`) — 3 Tabs

### 🏏 Matches Tab
| Action | Description |
|--------|-------------|
| **+ Add Match** | Add new matches (number, teams, date, time, venue, stage) |
| **✏️ Edit** | Change date, time, venue, status, stage for any match |
| **🏆 Set Winner** | Select winning team → auto-scores all players |
| **🔄 Sync Results** | Fetches results from CricketData API, auto-sets winners |

### 👥 Players Tab
| Player Status | Actions |
|---------------|---------|
| **Pending** (just signed up) | ✅ Approve / ✗ Reject |
| **Approved** (active player) | 🔑 Reset Password / 👑 Make Admin / 🗑️ Remove |
| **Admin** (other admins) | 🔑 Reset Password / 📋 Remove Admin |
| **Admin** (yourself) | No actions (can't remove/demote yourself) |

### ⚙️ Settings Tab
- Configure prize amounts ($) for: 1st Place, 2nd Place, 3rd Place, Longest Streak
- Changes reflected immediately on the Prizes page

---

## 📅 Season Management

| When | What to Do |
|------|-----------|
| **Before season** | Create demo matches for testing → remove when done |
| **Schedule change** | Admin → ✏️ Edit match (date, time, venue) |
| **New player signup** | Admin → 👥 Players → Approve |
| **Player forgot password** | Player uses "Forgot Password?" OR admin uses 🔑 Reset Password |
| **Match day** | Players pick → match starts → picks + skips revealed automatically |
| **After match** | Admin → 🔄 Sync Results (or manually set winner) |
| **Knockout stage** | Add matches with stage = qualifier / eliminator / final |
| **Season ends** | Check leaderboard + prizes page for final standings 🏆 |
| **Remove test data** | Delete demo matches via Admin |

---

## 📁 Project Structure

```
ipl-picks/
├── src/
│   ├── app/
│   │   ├── page.tsx                          # Home → Matches dashboard (server component)
│   │   ├── MatchesDashboard.tsx              # Grid/List toggle, pick/reset buttons, countdowns
│   │   ├── login/page.tsx                    # Email/password login + forgot password flow
│   │   ├── signup/page.tsx                   # Registration (name uniqueness check + auth metadata)
│   │   ├── pending-approval/page.tsx         # "⏳ Waiting for Approval" page
│   │   ├── reset-password/page.tsx           # Self-service password reset (from email link)
│   │   ├── force-reset/page.tsx              # Forced password reset (after admin reset)
│   │   ├── profile/page.tsx                  # Edit display name (24hr limit, reserved names)
│   │   ├── leaderboard/
│   │   │   ├── page.tsx                      # Server component (auth check)
│   │   │   └── LeaderboardClient.tsx         # Stats, podium (tie-aware), ranking table
│   │   ├── prizes/
│   │   │   ├── page.tsx                      # Server component
│   │   │   └── PrizesClient.tsx              # Prize pool cards + distribution rules
│   │   ├── rules/
│   │   │   ├── page.tsx                      # Server component
│   │   │   └── RulesClient.tsx               # Scoring, tiebreakers, pick rules, name rules
│   │   ├── match/[id]/
│   │   │   ├── page.tsx                      # Fetches match + picks + ALL profiles + pick count
│   │   │   └── MatchDetailClient.tsx         # VS display, distribution, picks + skipped players
│   │   ├── my-picks/
│   │   │   ├── page.tsx
│   │   │   └── MyPicksClient.tsx             # Personal pick history + summary stats
│   │   ├── admin/
│   │   │   ├── page.tsx                      # Auth + admin check, loads profiles + prizes
│   │   │   └── AdminClient.tsx               # 3-tab panel: Matches, Players, Settings
│   │   └── api/
│   │       ├── picks/route.ts                # POST (create/update), GET (user picks), DELETE (reset)
│   │       ├── matches/route.ts              # GET all matches with pick counts
│   │       ├── matches/[id]/route.ts         # GET single match detail
│   │       ├── matches/[id]/picks/route.ts   # GET picks for a match (RLS: hidden until started)
│   │       ├── leaderboard/route.ts          # GET rankings + streaks + prizes (approved users only)
│   │       ├── profile/route.ts              # POST update display name (24hr limit + reserved check)
│   │       ├── profile/check-name/route.ts   # POST check name availability (for signup)
│   │       ├── admin/set-winner/route.ts     # POST set match winner + status=completed
│   │       ├── admin/update-match/route.ts   # POST edit match details
│   │       ├── admin/add-match/route.ts      # POST add new match
│   │       ├── admin/manage-players/route.ts # POST approve/reject/remove/admin/reset-password
│   │       ├── admin/update-prizes/route.ts  # POST update prize amounts
│   │       ├── cron/update-results/route.ts  # POST sync from Cricket API (admin-only)
│   │       └── auth/callback/route.ts        # Email verification callback
│   ├── components/
│   │   └── Navbar.tsx                        # 6 nav links + avatar dropdown (Profile, Logout)
│   ├── lib/
│   │   ├── types.ts                          # TypeScript interfaces + timezone helpers
│   │   ├── scoring.ts                        # Point calculation + scoring table
│   │   ├── teams.ts                          # 10 IPL teams (names, abbreviations, brand colors)
│   │   ├── auto-status.ts                    # Auto-update matches from upcoming → live
│   │   └── supabase/
│   │       ├── client.ts                     # Browser client (anon key)
│   │       ├── server.ts                     # Server client (respects RLS, uses cookies)
│   │       ├── admin.ts                      # Service role client (bypasses RLS)
│   │       └── middleware.ts                 # Auth + approval + force-reset gate
│   └── middleware.ts                         # Next.js middleware entry point
├── supabase/
│   ├── schema.sql                            # Initial DB schema (tables, RLS, triggers, indexes)
│   ├── migration-v2.sql                      # v2: is_approved, app_settings, prizes
│   └── migration-v3.sql                      # v3: reserved_names table
├── vercel.json                               # Vercel config (empty — no cron on hobby plan)
├── package.json
└── tsconfig.json
```

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | Next.js 15 (App Router) | Server components, API routes, middleware |
| **Language** | TypeScript | Type safety across frontend + API |
| **Styling** | Tailwind CSS + inline styles | Rapid development, responsive |
| **Database** | Supabase PostgreSQL | Free tier, RLS, real-time capable |
| **Auth** | Supabase Auth (email/password) | Session management, auto-profile trigger |
| **Email** | Resend SMTP | Free 3,000 emails/month for password resets |
| **Hosting** | Vercel (Hobby) | Free, auto-deploy from GitHub on every push |
| **Cricket Data** | CricketData.org API | Auto-fetch match results for scoring |

---

## 🚀 Local Development

```bash
# Clone
git clone https://github.com/kirankumaryarlagadda/Cricket.git
cd Cricket

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local
# Fill in your Supabase + CricketData keys (see below)

# Run database schema in Supabase SQL Editor
# 1. Run supabase/schema.sql
# 2. Run supabase/migration-v2.sql
# 3. Run supabase/migration-v3.sql
# 4. Run: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name_change TIMESTAMPTZ;

# Start dev server
npm run dev
# Opens at http://localhost:3000
```

### Environment Variables (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
CRICKETDATA_API_KEY=your-cricket-api-key
CRON_SECRET=your-cron-secret
```

---

## 🔧 Supabase Setup Checklist

1. **Create project** at [supabase.com](https://supabase.com)
2. **Run SQL** → `supabase/schema.sql` then `supabase/migration-v2.sql` then `supabase/migration-v3.sql`
3. **Run SQL** → `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name_change TIMESTAMPTZ;`
4. **Authentication → Sign In / Providers → Email** → Disable "Confirm email"
5. **Authentication → URL Configuration** → Set Site URL + add Redirect URLs:
   - `https://your-domain.vercel.app/api/auth/callback`
   - `https://your-domain.vercel.app/reset-password`
6. **SMTP** → Configure Resend for password reset emails

---

## 📱 Responsive Design

| Screen | Navbar | Matches | Leaderboard |
|--------|--------|---------|-------------|
| **Desktop (>768px)** | Full 5-link bar | Grid view (cards) | Full 7-column table |
| **Mobile (≤768px)** | ☰ Hamburger menu | List view (2-row layout) | Card layout per player |
| **Toggle** | — | ▦ Grid / ☰ List switch | Auto-switches by screen size |

### Mobile-specific:
- **Hamburger menu** — tap ☰ to expand nav, ✕ to close, auto-closes on navigation
- **List view** — 2-row layout: teams + countdown on top, date + pick buttons below
- **Cards** — reduced padding (1rem) and radius (12px) on mobile
- **Leaderboard** — switches from 7-column table to compact card layout

---

## 📝 Version History

| Version | Changes |
|---------|---------|
| **v1.0** | Initial launch: auth, picks, leaderboard, admin panel |
| **v1.1** | Player approval system, prize pool, winning streaks |
| **v1.2** | Pick change/reset, local timezone support |
| **v1.3** | Grid + List view toggle, mobile-responsive leaderboard |
| **v1.4** | Skipped players shown on match detail, tie-aware rankings + podium |
| **v1.5** | Remove player support, demo match highlighting, SMTP via Resend |
| **v1.6** | Profile page, display name changes with reserved names system |
| **v1.7** | Once per day name change limit, tiebreaker with wrong/missed picks |
| **v1.8** | Streak prize for non-Top 3 only, separate Prizes + Rules pages |
| **v1.9** | 6-page navigation, name change rules on Rules page, real pick count |
| **v2.0** | Admin promote/demote system — admins can make and remove other admins |
| **v2.1** | Mobile responsive: hamburger nav, 2-row list view, smaller cards |
| **v2.2** | Full IPL 2026 schedule: 70 league matches loaded (Mar 28 – May 24) |
| **v2.3** | Forgot password (self-service via email) + Admin password reset with forced change on login |

---

## 📄 License

Private project — not open for redistribution.
