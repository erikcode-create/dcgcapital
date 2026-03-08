

## Fix: Dealer Alchemist deal_type & improve conversion logic

### Problem
1. The "Dealer Alchemist" deal has `deal_type: buyout` but it's a debt deal
2. The `convert-email-to-deal` edge function (line 265) defaults to `"buyout"` for anything that isn't `revenue_seeking`, and the AI prompt doesn't include `"debt"` as a valid deal_type option

### Changes

**1. Fix the data** — Update Dealer Alchemist's `deal_type` from `buyout` to `debt` (using insert tool)

**2. Fix `supabase/functions/convert-email-to-deal/index.ts`** (line 220 and 265):
- Add `"debt"` to the AI prompt's deal_type options: `"One of: buyout, growth_equity, recapitalization, add_on, platform, revenue_seeking, debt"`
- Update the fallback logic on line 265 to map category to a sensible deal_type default:
  - `debt` category → `"debt"` deal_type
  - `revenue_seeking` category → `"revenue_seeking"` deal_type
  - Otherwise → `"buyout"`

