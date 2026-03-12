

## Plan: Let investors set their own password from the invite link

### Problem
Currently, the admin manually enters a password when creating an investor. The invite email tells the investor to "use the password provided to you," but there's no mechanism for the investor to choose their own password. The admin has to communicate the password out-of-band, which is insecure and awkward.

### Solution
Use Supabase's `admin.generateLink({ type: 'invite' })` to generate an invite link that lets the investor set their own password when they first click it. This redirects them to the `/reset-password` page where they create their password.

### Changes

**1. `supabase/functions/create-investor/index.ts`**
- Remove the `password` field from the request body (no longer required)
- Create the user with `admin.createUser({ email, email_confirm: true })` — no password
- Generate an invite/recovery link using `admin.generateLink({ type: 'recovery', email, options: { redirectTo: PORTAL_URL + '/reset-password' } })`
- Update the invite email to include a "Set Your Password" button linking to the generated URL
- Remove the text about "password provided to you"

**2. `src/pages/AdminPortal.tsx`**
- Remove the password field from the "Create Investor Account" dialog
- Remove `password` from the `newInvestor` state object
- Update the `handleCreateInvestor` function to not send a password

**3. `src/pages/ResetPassword.tsx`**
- Verify it handles the invite/recovery token flow correctly (it should already work since Supabase recovery links use the same mechanism)

### Invite Flow After Change
```text
Admin creates investor (email only, no password)
        │
        ▼
Investor receives email with "Set Your Password" link
        │
        ▼
Link opens /reset-password page
        │
        ▼
Investor creates their own password
        │
        ▼
Investor can now log in with email + password
```

### Technical Details
- `admin.generateLink({ type: 'recovery' })` produces a one-time link that, when clicked, establishes a session and redirects to the specified URL
- The existing `/reset-password` page calls `supabase.auth.updateUser({ password })` which works for both password resets and first-time password setup
- No database changes needed

