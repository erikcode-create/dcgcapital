

## Unify Deal Types with Categories

The user wants `deal_type` to use the same three values as `category`: **Equity, Debt, Revenue Seeking**. Currently `DEAL_TYPES` has 6 PE-specific options (buyout, growth_equity, etc.).

### Changes

**Both `src/pages/DealDetail.tsx` (line 40-47) and `src/pages/AdminPortal.tsx` (line 42-49):**
- Replace `DEAL_TYPES` with:
  - `equity` / "Equity"
  - `debt` / "Debt"
  - `revenue_seeking` / "Revenue Seeking"

**`supabase/functions/convert-email-to-deal/index.ts`** (~line 220 and 265):
- Update AI prompt's `deal_type` options to `equity, debt, revenue_seeking`
- Update fallback mapping to match category directly

**Data fix** — Update Dealer Alchemist's `deal_type` from `buyout` to `debt` via insert tool.

