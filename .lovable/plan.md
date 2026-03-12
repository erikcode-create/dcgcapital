

## Plan: Filter out junk emails from sync

### Problem
The current Graph API call fetches from `/users/{mailbox}/messages` which returns messages from ALL folders, including Junk/Spam. This means junk emails get imported and potentially converted into deals.

### Fix

**`supabase/functions/fetch-emails/index.ts`** (line 144)

Change the inbox fetch endpoint from `/messages` (all folders) to `/mailFolders/Inbox/messages` (inbox only):

```
Before: /v1.0/users/${MAILBOX}/messages?$top=50&...
After:  /v1.0/users/${MAILBOX}/mailFolders/Inbox/messages?$top=50&...
```

This is a one-line change. The Microsoft Graph API's `mailFolders/Inbox/messages` endpoint returns only messages in the actual Inbox folder, automatically excluding Junk, Deleted Items, Drafts, etc.

The sent mail fetch (if it exists later in the file) should remain unchanged since it already targets the sent folder.

