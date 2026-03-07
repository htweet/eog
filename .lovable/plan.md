

## Plan: Unify Subscription, Pricing, and Agency Pro Upgrade Business Model

### Problems Identified

1. **Duplicate upgrade forms**: `ProUpgradeCard` has its own inline dialog (company name + reg number only), while `/agency/register` has a full 3-step wizard with KYC. `ProUpgradeFlow` is yet another separate component with its own dialog. Three different upgrade UIs exist, creating confusion.

2. **No connection between subscription and Pro/Agency**: Users can subscribe to plans OR apply for Pro agency status independently. There's no business model linking them — a Pro agency should require an active subscription plan.

3. **Agency Dashboard has no billing visibility**: Pro agencies can't see their subscription status from the agency dashboard.

4. **Settings page shows "Become an Agency" even for Pro users**: The card doesn't adapt based on user status.

---

### Implementation

#### Task 1: Unify ProUpgradeCard to navigate to `/agency/register` instead of inline dialog
- Remove the inline dialog from `ProUpgradeCard.tsx`. The "Apply for Pro Account" button navigates to `/agency/register` instead.
- Delete `ProUpgradeFlow.tsx` (unused duplicate). Search for imports and remove them.

#### Task 2: Add subscription plan selection to Agency Registration flow
- In `AgencyRegistration.tsx`, add a Step 0 or integrate into Step 2 (Review): fetch active `pricing_plans` and require the user to select a plan before submitting.
- On submit, create both the `pro_upgrade_requests` record AND a `user_subscriptions` record (status: `pending` until admin approves).
- When admin approves Pro upgrade (existing flow in `ProValidation`), the subscription status flips to `active`.

#### Task 3: Show subscription/billing in Agency Dashboard
- In `AgencyDashboard.tsx`, add a "Billing" section in the Wallet tab (or as a new tab). Fetch the user's active `user_subscriptions` with plan details and display plan name, price, expiry, and a link to `/subscribe` to change plans.

#### Task 4: Make Settings page context-aware for agency status
- In `Settings.tsx`, conditionally show the "Become an Agency" card: hide if `isPro`, show "Application Pending" if `isPendingPro`, and show the CTA otherwise.

#### Task 5: Connect admin Pro approval to subscription activation
- In `ProValidation.tsx` (admin component), when approving a Pro request, also update the user's `user_subscriptions` record to `active` if one exists with `pending` status.

---

### Technical Details

**No new tables or migrations needed.** All changes are frontend logic connecting existing tables.

**Files to edit:**
- `ProUpgradeCard.tsx` — remove dialog, navigate to `/agency/register`
- `AgencyRegistration.tsx` — add plan selection step, create subscription on submit
- `AgencyDashboard.tsx` — add billing/subscription display
- `Settings.tsx` — make agency card context-aware using `useProVoucher`
- `ProValidation.tsx` — activate subscription on Pro approval

**Files to delete:**
- `ProUpgradeFlow.tsx` (after confirming no active imports)

