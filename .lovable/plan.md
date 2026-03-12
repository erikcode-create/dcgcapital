

## Update NDA Template with Uploaded Agreement Language

Replace the current NDA template stored in the `nda_templates` database table with the full language from the uploaded PDF, substituting "Fitzpatrick Capital Partners" for "Ultra Safe Nuclear Corporation" and updating contact details accordingly.

### What changes

**Database migration** — Update the active `nda_templates` row's `title` and `content` columns with the full 11-section NDA text adapted for Fitzpatrick Capital Partners:

- Title: "Confidentiality and Nondisclosure Agreement"
- Content: All 11 sections (Proprietary Information, Non-Use/Non-Circumvent/Non-Disclosure, Court Ordered Disclosure, Return of Information, No Obligation, No Warranty, No License, Term, General, Remedy, Notice of Immunity) with:
  - "ULTRA SAFE NUCLEAR CORPORATION (USNC)" → "FITZPATRICK CAPITAL PARTNERS"
  - "Delaware Corporation" → appropriate entity description
  - Contact info updated to Fitzpatrick Capital Partners details
  - "State of Washington" governing law → kept or updated per your preference
  - Signature block updated to Fitzpatrick Capital Partners

The template is rendered in the investor NDA signing flow (`NdaSigning.tsx`) via `<pre>` whitespace-preserved text, so the content will be formatted with line breaks and section headers.

