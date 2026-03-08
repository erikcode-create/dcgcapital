

## Auto-Process Emails: Categorize, Convert, and Hide Linked Emails

### What changes

**1. Hide emails already linked to deals (Frontend — `EmailInbox.tsx`)**
- After fetching emails, filter out any whose `id` appears in `deal_emails` table
- Query `deal_emails` for all `email_id`s, then exclude those from the displayed list
- This makes converted/linked emails disappear from the inbox view

**2. Auto-categorize emails during sync (Edge Function — `fetch-emails/index.ts`)**
- After upserting each new inbox email, call the AI gateway to classify it as `equity`, `debt`, or `revenue_seeking` based on subject + body_preview
- Update the email's `category` field with the result
- For emails that share a `conversation_id` with an already-categorized email, copy that category automatically (no AI call needed)

**3. Auto-convert emails to deals during sync (Edge Function — `fetch-emails/index.ts`)**
- After categorization, automatically invoke the `convert-email-to-deal` logic for each new inbox email that doesn't already belong to a deal
- Skip emails whose `conversation_id` already maps to an existing deal (those get auto-linked, which already works)
- This removes the manual "Convert to Deal" step entirely

### Technical details

**`src/components/EmailInbox.tsx`** — `fetchEmails` function:
- Join or secondary query on `deal_emails` to get linked email IDs
- Filter: only show emails where `id` is NOT in that set

**`supabase/functions/fetch-emails/index.ts`** — after email upsert loop:
- Build a map of `conversation_id → category` from existing categorized emails
- For new emails with a known `conversation_id`, assign matching category directly
- For new emails without a match, batch-call AI (Lovable gateway, `google/gemini-2.5-flash-lite`) with subject+preview to get category
- Update `emails.category` for all newly categorized emails
- For emails not yet linked to a deal: call `convert-email-to-deal` function internally (or inline the conversion logic) to auto-create deals
- Emails in the same conversation as an existing deal get auto-linked (already implemented) and will disappear from inbox via the frontend filter

### Flow after changes

```text
Email arrives → Sync fetches it →
  1. Check conversation_id against existing categorized emails
     → Match found? Copy category
     → No match? AI classifies as equity/debt/revenue_seeking
  2. Check if conversation_id maps to existing deal
     → Yes? Auto-link to deal (already works)
     → No? Auto-convert to new deal
  3. Frontend inbox filters out all deal-linked emails
     → Email disappears from inbox
```

### Files to edit
- `src/components/EmailInbox.tsx`
- `supabase/functions/fetch-emails/index.ts`

