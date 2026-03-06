

## Plan: Fix Fund Deposit Review, Pro Upgrade Flow, and Agency Access

### Issues Identified

**1. Admin Fund Deposit Review Not Responsive**
- The `transactions` table has NO `UPDATE` RLS policy for admins. The approve/reject actions silently fail because the admin can't update transaction records.
- The query uses `transactions_user_id_fkey` for joining profiles — this exists and should work, but the update operations are blocked by missing RLS.

**2. Pro Opportunities → Upgrade Flow is Disconnected**
- `ProOpportunitiesSection` navigates to `/settings` on "Upgrade to Pro" click, which is a generic settings page — not the agency registration flow.
- Should navigate to `/agency/register` instead, which has the proper 3-step upgrade wizard.
- The Pro concept and Agency concept are the same thing (Pro = verified agency), but the UI treats them as separate. Need to unify: clicking "Upgrade to Pro" on the voucher dashboard should go to Agency Registration.

**3. Agency Dashboard Access**
- Route `/dashboard/agency` requires `requiredRole="voucher"`. Admins bypass this via `isAdmin`, so admins already have access.
- However, approved Pro agencies whose `active_role` is not `voucher` would be blocked. The `ProtectedRoute` checks `userRole` (active role), not `allRoles`.
- Fix: Allow access if user has `voucher` in `allRoles` (not just active role), or remove the role restriction since the component itself checks `isPro`.

---

### Implementation Plan

#### Task 1: Add UPDATE RLS policy for admin on transactions table
- Database migration: `CREATE POLICY "Admins can update transactions" ON transactions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));`
- This unblocks approve/reject/refund actions in `FundManagement.tsx`.

#### Task 2: Fix Pro Opportunities upgrade button navigation
- In `ProOpportunitiesSection.tsx`, change `navigate("/settings")` → `navigate("/agency/register")`.
- If user is already `pending_pro`, the registration page handles that state (shows "Application Under Review").
- If user is already `pro`, it redirects to agency dashboard.

#### Task 3: Unify Pro/Agency concept in ProtectedRoute
- Update `/dashboard/agency` route in `App.tsx`: remove `requiredRole="voucher"` restriction. The `AgencyDashboard` component already handles non-Pro users by showing `ProUpgradeCard`.
- This gives admins and approved Pro users access regardless of their current active role.

#### Task 4: Fix DialogFooter ref warning in FundManagement
- The console error about `DialogFooter` receiving a ref — wrap the `DialogFooter` content properly or ensure it doesn't receive forwarded refs incorrectly. Minor fix.

---

### Technical Details

- **Migration SQL**: Single migration adding admin UPDATE policy on `transactions`.
- **File edits**: `ProOpportunitiesSection.tsx` (1 line), `App.tsx` (remove `requiredRole` from agency route), `FundManagement.tsx` (minor DialogFooter fix).
- No new tables or columns needed.

