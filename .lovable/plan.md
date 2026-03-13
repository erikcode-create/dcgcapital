

## Plan: Fix Follow-up Email Dialog

Two targeted changes in `src/pages/DealDetail.tsx`:

### 1. Allow sending to anyone (remove recipient requirement from button)
The "Send Follow-up" button is currently disabled when there's no `company_rep_email` or `contact_email` on the deal. Change this so the button is only disabled when there's no `aiSummary` — the To/CC fields start empty and the user fills them in manually before sending.

**Line 1146**: Remove the `!(deal.company_rep_email || deal.contact_email)` condition from `disabled`.

**Lines 564-566**: Still pre-fill To/CC if contact emails exist, but don't block the dialog from opening when they're empty.

### 2. Change signature from "DCG Capital" to "Fitzpatrick Capital Partners"
**Line 589**: Replace `"Best regards,\nDCG Capital"` with `"Best regards,\nFitzpatrick Capital Partners"`.

### Files Modified
- `src/pages/DealDetail.tsx` — two small edits (button disabled condition + signature text)

