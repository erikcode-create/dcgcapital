

## Plan: Fix "View as Investor" and personalized welcome

### Problems
1. **Perpetual spinner**: InvestorPortal's `useEffect` only runs when `user` exists. In preview mode (no auth session), `user` is null, so `fetchDeals` never fires and loading never resolves.
2. **Wrong welcome name**: Same reason — `profile` is null in preview mode, so it falls back to "Investor".
3. **No investor context**: The "View as Investor" button just navigates to `/portal` with no query param, so there's no way to know *which* investor to impersonate.

### Changes

**`src/pages/AdminPortal.tsx`**
- Pass the investor's ID as a query param: `navigate("/portal?viewAs=INVESTOR_ID")`

**`src/pages/InvestorPortal.tsx`**
- Read `viewAs` query param from the URL using `useSearchParams`
- When in preview/admin mode:
  - If `viewAs` param exists, fetch that investor's profile from `profiles` table and their assigned deals from `deal_assignments`
  - If no `viewAs` param, fetch all deals (current admin behavior)
  - Handle the case where there's no `user` (preview mode) — don't gate `fetchDeals` behind `if (user)`
- Update welcome message to use the viewed investor's first name (split `full_name` on space, take first part)
- Always show first name only: change `profile?.full_name` to extract just the first name

**Welcome message logic:**
```
const displayName = viewedProfile?.full_name?.split(" ")[0] || profile?.full_name?.split(" ")[0] || "Investor";
```

**Preview mode fetch flow:**
```
useEffect:
  if viewAs param → fetch that investor's profile + their deal_assignments
  else if user exists → existing logic
  else (preview, no user, no viewAs) → fetch all deals
```

### No database or migration changes needed
All required data (profiles, deal_assignments, deals) already have anon SELECT policies.

