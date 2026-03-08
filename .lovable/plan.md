

## Fix: "Fwd: DealerAlchemist" AI Extraction + Add Email Delete

### Why the email didn't populate deal data

The edge function logs show the error: **"Unsupported MIME type: application/vnd.openxmlformats-officedocument.wordprocessingml.document"**. The email had a `.docx` attachment, and the code incorrectly sends `.docx` files as `image_url` content to the AI model. Google Gemini doesn't support `.docx` as an inline content type. The deal WAS created, but with only basic info from the email text (no attachment analysis).

A deal named "Fwd: DealerAlchemist" likely exists in your pipeline with minimal data. The existing "Dealer Alchemist" deal was created earlier from a different email.

### Changes

**1. Fix attachment handling in `convert-email-to-deal/index.ts`** (lines 188-202)
- Only send PDFs and images as inline content to the AI model
- Exclude `.docx`, `.pptx`, `.ppt` from inline content (they cause Gemini errors)
- Still upload all attachments to storage, just don't try to pass unsupported types to AI

**2. Add delete email button in `EmailInbox.tsx`**
- Add a Trash icon button in the email list (each row) and in the detail view header
- On click, delete from the `emails` table in the database
- Remove from the local state so it disappears immediately
- Add confirmation dialog to prevent accidental deletes

### Files to edit
- `supabase/functions/convert-email-to-deal/index.ts` — fix supported types filter
- `src/components/EmailInbox.tsx` — add delete button + handler

