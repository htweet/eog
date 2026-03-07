

## Plan: Frontend-Admin Integration, Navigation, Streaming, Billing, Pricing, AI Persistence, and Global Settings

### 1. Agency Dashboard Nav for Authorized Users

**Problem**: Header and BottomNav don't show an "Agency" link for users who have Pro/voucher access or admin role.

**Fix**:
- In `Header.tsx`: Add an "Agency" nav item (desktop + mobile dropdown) visible when `allRoles.includes('voucher')` or `isAdmin`. Links to `/dashboard/agency`.
- In `BottomNav.tsx`: Add a conditional "Agency" nav item (Building2 icon) for the same condition.

---

### 2. Connect Streaming to Admin Backend Settings

**Problem**: `WebRTCStream.tsx` doesn't read admin stream settings; `LiveStreamingPanel.tsx` settings are local state only.

**Fix**:
- Save stream settings to `platform_settings` table (key: `stream_config`) when admin toggles them in `LiveStreamingPanel.tsx`.
- In `WebRTCStream.tsx`, fetch `stream_config` from `platform_settings` on mount. If `enableLiveStreaming` is false, disable the "Go Live" button. Enforce `maxStreamDuration` by auto-stopping the stream when the timer exceeds it.

---

### 3. Frontend User Billing Flow (Subscribe to Plans)

**Problem**: No frontend page for users to browse plans and subscribe. Admin billing management exists but there's no user-facing subscription flow.

**Fix**:
- Create `src/pages/Subscribe.tsx`: Fetches active `pricing_plans`, displays them as cards (reuse PricingSection pattern). On "Subscribe" click, inserts a `user_subscriptions` record with `status: 'active'`, `started_at: now`, `expires_at: +30 days`. Shows current subscription status if one exists.
- Add route `/subscribe` in `App.tsx`.
- In `Settings.tsx`, add a "My Subscription" card showing current plan and link to `/subscribe`.
- The PricingSection on the landing page "Get Started" button navigates to `/subscribe` for logged-in users (instead of `/auth`).

---

### 4. Frontend Pricing Plan Display Connected to Admin

**Problem**: Landing page `PricingSection` already fetches from DB with realtime — this works. But logged-in user pricing page doesn't exist.

**Fix**: Handled by Task 3 above. The `/subscribe` page pulls the same `pricing_plans` table. Admin changes via `PricingManagement` sync in real-time to both landing page and subscribe page.

---

### 5. AI Video Analysis — Database Persistence

**Problem**: Analysis results (checklist_analysis, concerns, recommendation, gps_match, time_validity) are only stored as a single `ai_analysis_score` number. Full analysis data is lost after viewing.

**Fix**:
- Migration: Add `ai_analysis_result jsonb` column to `verifications` table.
- In `AIVideoAnalysis.tsx`, save the full `analysisResult` object to `ai_analysis_result` alongside `ai_analysis_score`. When viewing a previously analyzed verification, load and display the stored result instead of requiring re-analysis.
- Fix the `forwardRef` console warning by not passing refs to function components.

---

### 6. Global Admin Settings That Control Frontend

**Problem**: Admin `platform_settings` exist but frontend doesn't read them to enforce rules (maintenance mode, min bounty, platform fee, currency, allow signups).

**Fix**:
- Create `src/hooks/usePlatformSettings.ts`: Fetches `site_config` from `platform_settings` with caching. Returns typed settings object.
- In `CreateTask.tsx`: Use `minBountyAmount` from settings to validate bounty input.
- In `Auth.tsx`: If `allowNewSignups` is false, hide the signup tab.
- In `App.tsx` or a wrapper: If `maintenanceMode` is true, show a maintenance page for non-admins.
- In `Checkout.tsx` / wallet pages: Use `defaultCurrency` from settings.

---

### 7. Fix forwardRef Warning

**Problem**: Console shows `Function components cannot be given refs` for `AIVideoAnalysis` in `Admin.tsx`.

**Fix**: The issue is likely in how `Admin.tsx` renders the component (possibly via a ref-forwarding pattern). Ensure `AIVideoAnalysis` is rendered directly without ref passing, or wrap it with `forwardRef` if needed.

---

### Technical Summary

**Migration**: Add `ai_analysis_result jsonb` column to `verifications`.

**New files**:
- `src/pages/Subscribe.tsx` — user subscription page
- `src/hooks/usePlatformSettings.ts` — shared settings hook

**Edited files**:
- `Header.tsx` — add Agency nav link
- `BottomNav.tsx` — add Agency nav item
- `LiveStreamingPanel.tsx` — persist settings to `platform_settings`
- `WebRTCStream.tsx` — read stream settings from DB
- `AIVideoAnalysis.tsx` — persist full analysis result, fix ref warning
- `PricingSection.tsx` — navigate to `/subscribe` for logged-in users
- `Settings.tsx` — show subscription card
- `App.tsx` — add `/subscribe` route, maintenance mode guard
- `CreateTask.tsx` — enforce min bounty from settings
- `Auth.tsx` — respect `allowNewSignups` setting

