

## Plan: Follow-up Email from AI Summary

### What
Add a "Send Follow-up" button in the AI Communications Summary card that opens a compose dialog pre-populated with context from the AI summary. The email is sent to the company representative (or intermediary contact as fallback) via the existing `send-email` edge function (data@fitzcap.co mailbox).

### How

**UI Changes in `DealDetail.tsx`:**

1. **New state**: `followUpOpen` (dialog toggle), `followUpTo`, `followUpCc`, `followUpSubject`, `followUpBody`, `sendingFollowUp`

2. **"Send Follow-up" button** next to the "Refresh" button in the AI Communications Summary card header — only enabled when `aiSummary` exists and there's a recipient (`company_rep_email` or `contact_email`)

3. **Compose Dialog** with:
   - **To**: Pre-filled with `deal.company_rep_email` (company rep), fallback to `deal.contact_email`
   - **CC**: Pre-filled with the other contact email (if both exist)
   - **Subject**: Pre-filled as `Re: ${deal.name} - Follow Up`
   - **Body**: AI-generated draft based on the summary — using a simple template that references the AI concerns and missing data, which the admin can freely edit before sending
   - **Send button** that calls `supabase.functions.invoke("send-email", ...)` with the composed fields

4. **AI Draft Generation** (optional enhancement): When the dialog opens, call the AI gateway to generate a suggested follow-up email body based on `aiSummary.communications_summary`, `aiSummary.concerns`, and `aiSummary.missing_data`. The admin can edit before sending.

### No new edge functions needed
The existing `send-email` function already supports sending arbitrary emails via Microsoft Graph. It accepts `{ to, cc, subject, body }`.

### No database changes needed
Sent emails are already logged to the `emails` table by the `send-email` function.

### Technical Details

- The follow-up email dialog reuses the same pattern as the compose dialog in `EmailInbox.tsx`
- The AI draft will be generated client-side as a simple template (no extra edge function call needed for v1 — just concatenate the summary/concerns/missing data into a professional email template)
- After sending, the email gets logged and can optionally be linked to the deal via `deal_emails`

### Files Modified
- `src/pages/DealDetail.tsx` — add follow-up email dialog and handler

