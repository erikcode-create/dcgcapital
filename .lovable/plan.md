

## Plan: Send investor invite email from data@fitzcap.co

### What's happening now
When you create an investor via the admin portal, the `create-investor` edge function creates their user account and profile but does **not** send any email notification. The investor has no way of knowing they've been invited.

### What we'll change

**`supabase/functions/create-investor/index.ts`**

Add email sending after successful user creation, using the same Microsoft Graph pattern already used by `invite-company` and `send-email`:

1. Add the `getAccessToken()` helper (Azure OAuth2 client credentials — same as other functions)
2. Set `MAILBOX = "data@fitzcap.co"`
3. After the user is created, send a branded HTML invite email via `POST https://graph.microsoft.com/v1.0/users/${MAILBOX}/sendMail` containing:
   - Welcome message with the investor's name
   - Their login credentials (email + temporary password)
   - A link to the portal login page (`https://dcgcapital.lovable.app/login`)
   - Branding consistent with the company invite emails (Fitzpatrick Capital Partners)
4. Log the sent email to the `emails` table (same pattern as other functions)

### No new secrets needed
The Azure credentials (`AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`) are already configured and used by other functions.

### No database changes needed
The `emails` table already exists with appropriate anon/admin policies.

