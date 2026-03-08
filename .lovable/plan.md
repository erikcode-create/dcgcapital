

## Fix: Prevent Duplicate Deal Creation During Auto-Convert

### Problem
Forwarded emails get a new `conversation_id` in Microsoft Graph, so the system treats them as unrelated threads. The "Fwd: Dealer Alchemist deck" email was auto-converted into a second deal instead of being linked to the existing "Dealer Alchemist" deal.

### Solution
Add duplicate detection in `fetch-emails/index.ts` before auto-converting an email to a deal:

1. Before calling `convert-email-to-deal`, normalize the email subject (strip "Fwd:", "Re:", "FW:", etc.) and check if a deal with a similar name already exists
2. If a matching deal is found, auto-link the email to that deal instead of creating a new one
3. Update the `convDealMap` so subsequent emails in the same conversation also get linked

### Technical details

**`supabase/functions/fetch-emails/index.ts`** — in the auto-convert loop (lines 380-413):
- Add a helper function `normalizeSubject(subject)` that strips common prefixes (Fwd:, Re:, FW:, RE:) and trims whitespace
- Before calling `convert-email-to-deal`, query `deals` table for any deal whose `name` matches the normalized subject (case-insensitive using `ilike`)
- If match found: insert into `deal_emails` to link the email to the existing deal, skip conversion
- If no match: proceed with auto-conversion as before

### Files to edit
- `supabase/functions/fetch-emails/index.ts`

