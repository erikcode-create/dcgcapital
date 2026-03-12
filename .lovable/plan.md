

## Plan: Switch from magic links to password login with TOTP MFA

### Overview
Replace the current passwordless magic link authentication with traditional email/password login, add a "Forgot Password" flow, and implement TOTP-based multi-factor authentication (authenticator app like Google Authenticator or Authy).

### Changes

**1. Login page (`src/pages/Login.tsx`)**
- Replace the magic link form with email + password fields
- Use `supabase.auth.signInWithPassword({ email, password })` instead of `signInWithOtp`
- Add a "Forgot Password?" link below the form
- After successful password login, check if MFA is enrolled:
  - If enrolled, show a TOTP code input screen (6-digit code from authenticator app)
  - Verify with `supabase.auth.mfa.challengeAndVerify()`
  - If not enrolled, redirect to portal as normal
- Remove all magic link sent / check email UI states

**2. Forgot Password page (`src/pages/ForgotPassword.tsx`)** — new file
- Simple form with email input
- Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + '/reset-password' })`
- Shows confirmation message after submission

**3. Reset Password page (`src/pages/ResetPassword.tsx`)**
- Already exists and works correctly — no changes needed

**4. MFA Setup page (`src/pages/MfaSetup.tsx`)** — new file
- Shown to users who haven't enrolled in MFA yet (optional or admin-enforced)
- Calls `supabase.auth.mfa.enroll({ factorType: 'totp' })` to get a QR code
- Displays the QR code for scanning with an authenticator app
- User enters a verification code to confirm enrollment
- Calls `supabase.auth.mfa.challengeAndVerify()` to activate

**5. App routing (`src/App.tsx`)**
- Add routes: `/forgot-password`, `/mfa-setup`

**6. Create Investor function (`supabase/functions/create-investor/index.ts`)**
- Update invite email text to mention password login instead of magic link
- The function already creates users with passwords — no auth logic change needed

**7. Invite Company function (`supabase/functions/invite-company/index.ts`)**
- Update invite email text to mention password login instead of magic link

**8. Resend invite in AdminPortal (`src/pages/AdminPortal.tsx`)**
- Update email template text to reference password login

### MFA Login Flow
```text
User enters email + password
        │
        ▼
signInWithPassword()
        │
        ▼
  Has MFA enrolled? ──No──► Redirect to portal
        │
       Yes
        │
        ▼
  Show TOTP input (6 digits)
        │
        ▼
  mfa.challengeAndVerify()
        │
        ▼
  Redirect to portal
```

### Technical Details
- Supabase Auth natively supports TOTP MFA via `supabase.auth.mfa.*` methods
- `mfa.enroll({ factorType: 'totp' })` returns a QR code URI and secret
- `mfa.challenge({ factorId })` creates a challenge, `mfa.verify({ factorId, challengeId, code })` verifies it
- The `assurance_level` on the session indicates if MFA has been completed (`aal1` = password only, `aal2` = MFA verified)
- No database changes needed — MFA is handled entirely by the auth system

