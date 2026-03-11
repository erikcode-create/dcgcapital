

## Plan: Show all emails with deal badges

### Problem
All inbox emails are filtered out (line 117 of `EmailInbox.tsx`) because they've been auto-converted to deals and linked via `deal_emails`. The inbox appears empty.

### Changes

**`src/components/EmailInbox.tsx`**

1. **Stop filtering out linked emails** — remove the `filter(e => !linkedIds.has(e.id))` logic on line 117. Instead, keep all emails but track which ones are linked to deals.

2. **Fetch deal names for linked emails** — change the `deal_emails` query to also join `deals(name)` so we know which deal each email belongs to:
   ```
   supabase.from("deal_emails").select("email_id, deal_id, deals(name)")
   ```

3. **Build a lookup map** — create a `Map<email_id, deal_name>` from the joined data.

4. **Display a deal badge** — in the email list item rendering, if the email is in the linked map, show a small badge (e.g., a `Badge` component) with the deal name next to the subject line. Use a subtle color like `secondary` variant.

5. **Also show badge in email detail view** — when an email is selected, show the linked deal name at the top of the detail pane.

### Technical details
- Add state: `linkedDeals: Map<string, string>` mapping email_id to deal name
- The `deal_emails` table has a `deal_id` FK to `deals`, so the join `deals(name)` will work
- No database or RLS changes needed — current anon policies already allow reading both tables

