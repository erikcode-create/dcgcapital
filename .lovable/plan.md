

## Plan: Reassign Email to Different Deal

### Problem
Admins viewing an email in the inbox cannot change which deal it's linked to. They can only see the current deal badge.

### Solution
Add a deal selector dropdown next to the existing deal badge in the selected email view. When changed, update/insert/delete the `deal_emails` row accordingly.

### Changes in `src/components/EmailInbox.tsx`

1. **Add state**: `deals` list (fetched once on mount) and `reassigning` loading flag.

2. **Fetch all deals on mount**: Query `deals` table for `id, name` to populate the dropdown.

3. **Add reassign handler**: 
   - If "none" selected → delete from `deal_emails` where `email_id` matches
   - If deal selected → upsert into `deal_emails` (delete existing link first, then insert new one)
   - Update `linkedDeals` map and show toast

4. **UI in selected email view** (around line 396-403, near the deal badge):
   - Replace the static deal badge with a `Select` dropdown
   - Options: "No deal" + all deals from state
   - Pre-select current linked deal (from `linkedDeals` map, but need deal_id not just name)

5. **Adjust `linkedDeals`**: Change from `Map<email_id, deal_name>` to `Map<email_id, { dealId, dealName }>` so we can pre-select the correct deal in the dropdown and perform updates.

6. **Update `fetchEmails`**: Modify the `deal_emails` select to also grab `deal_id` alongside `deals(name)`.

### Files Modified
- `src/components/EmailInbox.tsx` — add deal reassignment dropdown and handler

