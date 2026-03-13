

## Plan: Fix Follow-up Email Formatting

### Problem
The email body is sent as `contentType: "HTML"` to Microsoft Graph, but the content is plain text with `\n` newlines. HTML ignores newlines, so the email arrives as one big unformatted block.

### Solution
Convert the plain-text body to proper HTML before sending, in two places:

**1. `openFollowUpDialog` (line 571-592)** — Generate the template as HTML instead of plain text:
- Wrap paragraphs in `<p>` tags
- Use `<ul><li>` for bullet points (concerns, missing data)
- Use `<br>` for the signature line break
- The textarea will show HTML, which is fine since `contentType` is already `"HTML"`

**2. `handleSendFollowUp` (line 595-629)** — Convert the textarea body (which the user may have edited as plain text) to HTML before sending:
- Replace `\n\n` with `</p><p>` for paragraph breaks
- Replace remaining `\n` with `<br>` 
- Wrap bullet lines (`• `) into `<ul><li>` structure

**Better approach**: Keep the textarea as plain text for easy editing, but convert to HTML right before sending. This way the user sees readable text in the composer but the email renders properly.

### Changes in `src/pages/DealDetail.tsx`

**`handleSendFollowUp`** — Add a `plainTextToHtml` conversion before passing body to the edge function:
```typescript
const plainTextToHtml = (text: string): string => {
  // Split into paragraphs, convert bullets to lists, wrap in HTML
  const paragraphs = text.split(/\n\n+/);
  return paragraphs.map(p => {
    const lines = p.split('\n');
    const bulletLines = lines.filter(l => l.trim().startsWith('•'));
    if (bulletLines.length > 0) {
      // Mix of text + bullets
      const parts: string[] = [];
      let currentBullets: string[] = [];
      for (const line of lines) {
        if (line.trim().startsWith('•')) {
          currentBullets.push(line.trim().replace(/^•\s*/, ''));
        } else {
          if (currentBullets.length) {
            parts.push('<ul>' + currentBullets.map(b => `<li>${b}</li>`).join('') + '</ul>');
            currentBullets = [];
          }
          if (line.trim()) parts.push(`<p>${line.trim()}</p>`);
        }
      }
      if (currentBullets.length) {
        parts.push('<ul>' + currentBullets.map(b => `<li>${b}</li>`).join('') + '</ul>');
      }
      return parts.join('');
    }
    return `<p>${lines.join('<br>')}</p>`;
  }).join('');
};
```

Then in `handleSendFollowUp`, send `plainTextToHtml(followUpBody)` instead of raw `followUpBody`.

### Files Modified
- `src/pages/DealDetail.tsx` — add HTML conversion helper, use it before sending

