

## Company Data Room Portal

### Research: How Other Platforms Handle This

Platforms like DealRoom, Ansarada, Intralinks, and Firmroom all follow a similar pattern for company-side data rooms:

1. **Request Lists** -- A structured checklist of document categories that the company must fulfill. Items show completion status (uploaded, pending, overdue).
2. **Invite-by-Email** -- The deal team creates a deal, then invites the company contact via email. The company user receives a magic link and lands on a scoped portal showing only their deal.
3. **Progress Tracking** -- Admin sees a dashboard of which items have been uploaded vs. outstanding. Companies see a clear checklist with status indicators.
4. **Secure Upload** -- Files go into a per-deal data room. Some platforms support drag-and-drop, bulk upload, and folder structure.
5. **Communication** -- In-portal messaging or comments per document request item, so questions stay contextual.

### Plan

This is a significant feature. Here is the full scope:

---

### 1. New Role: `company`

Add `'company'` to the `app_role` enum. Company users are scoped to a single deal -- they can only see and upload documents for the deal they were invited to.

**Migration:**
- `ALTER TYPE public.app_role ADD VALUE 'company';`
- Create a `company_invitations` table to track invites (deal_id, email, invited_by, token, status, created_at).
- Create a `data_request_items` table with the structured checklist (deal_id, category, label, description, sort_order, status, uploaded_document_id).
- Seed default checklist template rows from the provided list (Financial, Business Operations, Legal, Assets, Market, Tax -- ~25 items).

### 2. Edge Function: `invite-company`

Admin-only function that:
- Creates the user via Supabase Admin API with `email_confirm: true` (like `create-investor`).
- Assigns `company` role + links them to the deal via `deal_assignments`.
- Seeds the `data_request_items` for that deal from the default template.
- Sends a branded invitation email via Resend from `data@fitzcap.co` with a magic link (using `supabase.auth.admin.generateLink({ type: 'magiclink', email })`).

### 3. Company Portal Page (`/company`)

A new protected route (`requiredRole: "company"`). The flow:
1. Company user clicks magic link in email, lands authenticated.
2. Portal shows their deal name, a welcome message, and the **Document Request Checklist** grouped by category (Financial, Business Ops, Legal, Assets, Market, Tax).
3. Each item shows: label, description, status (pending/uploaded/approved), and an upload button.
4. Uploads go to the existing `pitch-decks` storage bucket under a deal-specific path and create a `deal_documents` row linked to the request item.
5. Progress bar at the top shows X of Y items completed.

### 4. RLS Policies

- `data_request_items`: Company users can SELECT/UPDATE items for deals they're assigned to. Admins have full access.
- `deal_documents`: Add a policy allowing company users to INSERT documents on their assigned deals.
- `deal_assignments`: Add SELECT policy for company role users.

### 5. Admin Side Updates

- Add "Invite Company" button on the Deal Detail page (next to existing investor assignment).
- Show a dialog to enter company contact email + name.
- On the Deal Detail overview, show the document request checklist progress (X/Y items uploaded).
- Admin can approve/reject uploaded documents (status field on request items).

### 6. Auth Context Update

- Update `AuthContext` and `ProtectedRoute` to handle the `company` role.
- Company users route to `/company` after login.
- Login page redirects company users to `/company`.

### 7. File Structure

```text
New files:
  src/pages/CompanyPortal.tsx          -- Company-facing portal
  supabase/functions/invite-company/index.ts  -- Invite + email edge function

Modified files:
  src/App.tsx                          -- Add /company route
  src/contexts/AuthContext.tsx         -- Add "company" to UserRole
  src/components/ProtectedRoute.tsx    -- Handle company role
  src/pages/Login.tsx                  -- Redirect company to /company
  src/pages/DealDetail.tsx             -- Add invite company UI + checklist progress
  supabase/config.toml                 -- Add invite-company function config
```

### 8. Database Tables

```text
data_request_items
  id, deal_id, category, label, description, sort_order,
  status (pending/uploaded/approved/rejected),
  uploaded_document_id (nullable FK to deal_documents),
  created_at, updated_at

company_invitations
  id, deal_id, email, company_name, invited_by,
  status (pending/accepted), created_at
```

### 9. Email Template

The invite email from `data@fitzcap.co` will include:
- Deal name and Fitzpatrick Capital branding
- Brief explanation that they've been invited to submit documents
- Magic link button to access the portal
- The data request list summary

