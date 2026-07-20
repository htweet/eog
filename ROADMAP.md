# Vouch 2.0 — Product Roadmap

**Project:** EOG / Vouch P2P Physical Verification Marketplace  
**Date:** July 2026  
**Status:** 7 of 10 tasks complete (~70% launch-ready)

---

## Progress Summary

| Phases shipped | Phases remaining | Launch readiness |
|---|---|---|
| 3 of 6 | 3 | ~70% |

---

## Phase 1 — Foundation ✅ Shipped

Core stack, auth, task lifecycle, escrow wallet, map browse.

- React 18 + Vite + Supabase + Tailwind + shadcn/ui stack
- Auth, role-based profiles (voucher / requester / admin)
- Task CRUD — post, assign, verify, review, complete
- Escrow hold/release with Paystack integration
- Mapbox browse + real-time updates via Supabase channels

---

## Phase 2 — Trust & AI Layer ✅ Shipped

VouchScore algorithm, AI price oracle, dual-currency wallet.

- **VouchScore™** — 5-factor weighted algorithm (`completion_rate×30% + avg_rating×25% + gps_accuracy×20% + speed×15% + dispute_penalty×10%`). Fires via PostgreSQL trigger on every review insert and task status change. Levels: Bronze → Silver → Gold → Platinum → Elite
- **AI price oracle** — `suggest-bounty-price` Supabase edge function calling Gemini 2.5 Flash. Returns `{ min, max, reasoning }` per category. Wired into CreateTask UI
- **Vouch Credits™** — dual currency (VC + Naira), 100 VC = ₦50. Earned via task completion (5 VC), streaks (50–500 VC), referrals (100 VC), milestones. Full ledger in `vc_transactions`
- **Flash Bounties** — 2× payout multiplier, 2hr expiry, live countdown on BountyCard, +10 VC bonus

---

## Phase 3 — Community & Experience ✅ Shipped

Mobile-first redesign, social mechanics, community discovery.

- **Mobile landing page** — dark hero, animated counters, category grid, how-it-works, VouchScore tier cards, testimonials, pricing (Free / Pro ₦2,499/mo / Agency ₦9,999/mo), CTA
- **Guild Hub** (`/guilds`) — create guilds with custom emoji badge + color, open/invite-only toggle, join/leave, live guild stats (weekly earnings, member count, tasks). Max 10 members per guild
- **Leaderboard** (`/leaderboard`) — Top Vouchers tab (podium for #1–3, full ranked list with VouchScoreBadge) + Top Guilds tab (ranked by weekly earnings). Both backed by Supabase RPCs
- **VouchScore badge** — displayed on Voucher Dashboard and Profile page with breakdown tooltip

---

## Phase 4 — Verification Certificates 🔄 Up Next

Branded PDF proof of verification — the core trust artifact buyers and sellers can keep.

- `generate-certificate` Supabase edge function — produces a branded PDF (certificate number, item details, GPS coords, AI analysis score, checklist snapshot, voucher's VouchScore at time of verification)
- Certificate record stored in `certificates` table with QR code linking to a public verification URL
- "Download Certificate" button in ReviewTask approval flow (requester triggers on task approval)
- Optional: voucher can also download a copy for their portfolio

---

## Phase 5 — Install Wizard 📋 Queued

Supabase-only 4-step setup for CodeCanyon buyers. No PHP, no MySQL.

- **Step 1 — Branding:** app name, logo URL, primary color
- **Step 2 — Supabase credentials:** Project URL + anon key, with live connection test
- **Step 3 — Admin account:** first admin email + password
- **Step 4 — Payment keys:** Paystack public + secret keys, test payment ping

> For local dev: run `npx supabase start` — the `supabase/` directory has all migrations ready. Paste `http://localhost:54321` as the URL.

---

## Phase 6 — E2E Testing & Launch 📋 Queued

Full browser test of every flow before CodeCanyon submission.

- End-to-end flow: register → create task → assign voucher → GPS verify → submit checklist → requester reviews → approves → payout releases
- DB persistence check on all new tables (`guilds`, `guild_members`, `vouch_credits`, `vc_transactions`, `streaks`, `milestones`, `referrals`, `certificates`)
- Mobile viewport regression (375px, 390px, 430px)
- CodeCanyon asset prep: screenshots, demo video, item description, documentation

---

## Phase 7+ — Growth & Scale 🔮 Post-Launch

After CodeCanyon listing goes live.

- **PWA** — manifest, offline support, installable mobile app (iOS + Android)
- **Enterprise agency portal** — bulk task posting, team analytics, white-label branding
- **AI fraud detection** — photo authenticity scoring, duplicate image detection, suspicious pattern alerts
- **Multi-region** — GHS (Ghana), KES (Kenya), ZAR (South Africa) currency + city expansion
- **Public API** — let third-party apps (car dealerships, real estate platforms) post verification requests programmatically

---

## Key Technical Decisions

| Decision | Choice | Reason |
|---|---|---|
| DB | Supabase (PostgreSQL) | RLS, real-time, edge functions, CLI for local dev |
| AI | Gemini 2.5 Flash via Lovable gateway | Fast, cheap, good at structured JSON |
| Payments | Paystack | Nigeria-first, supports NGN, has escrow model |
| Maps | Mapbox | Best coverage for Nigerian cities |
| Distribution | CodeCanyon | Largest PHP/script marketplace; shared hosting audience |
| Install | Supabase-only wizard | Dropped PHP/MySQL adapter — too complex for buyers |

---

## File Structure (New in 2.0)

```
supabase/
  migrations/
    20260720000001_vouchscore_credits_guilds_flash.sql   ← mega migration
  functions/
    suggest-bounty-price/index.ts                        ← AI price oracle
    generate-certificate/index.ts                        ← [Phase 4]

src/
  pages/
    Landing.tsx          ← dark hero redesign
    GuildHub.tsx         ← guild browse + create + join
    Leaderboard.tsx      ← top vouchers + top guilds
  components/
    voucher/VouchScoreBadge.tsx
    wallet/VouchCreditsPanel.tsx
  hooks/
    useVouchCredits.ts
```
