

## Fix Email Categories to Match Deal Categories

The `EMAIL_CATEGORIES` in `EmailInbox.tsx` are outdated. They still show: **Revenue Seeking, Deal Flow, Investor Relations, General, Spam/Irrelevant**.

The deal categories in `AdminPortal.tsx` were updated to: **Equity, Debt, Revenue Seeking**.

### Changes

**`src/components/EmailInbox.tsx`** (lines 50-56):
- Replace `EMAIL_CATEGORIES` to match the deal categories:
  - `equity` / "Equity"
  - `debt` / "Debt"  
  - `revenue_seeking` / "Revenue Seeking"
- Remove the old categories (deal_flow, investor_relations, general, spam)
- Update the default fallback in `handleConvertToDeal` from `"deal_flow"` to `"equity"` (line 423)

This ensures the categorize dropdown in the email detail view and the convert-to-deal flow use the same categories as the pipeline.

