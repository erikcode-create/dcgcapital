

## Plan: Custom Deal Metrics + Dual Contact Fields

### 1. New `deal_metrics` Table

Create a table for custom key-value financial metrics per deal:

```text
deal_metrics
├── id (uuid, PK)
├── deal_id (uuid, NOT NULL)
├── label (text, NOT NULL)       -- e.g. "Sponsor Contribution", "Net Debt"
├── value (numeric)              -- dollar amount
├── display_format (text)        -- 'currency' (default), 'percentage', 'multiple', 'number'
├── sort_order (integer, default 0)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

RLS: Admin full access (`authenticated` role). Investors can view metrics on assigned deals (SELECT only).

### 2. Add Company Representative Fields to `deals`

Add two new columns to the `deals` table:
- `company_rep_name` (text, nullable) — name of the company's representative (CEO, CFO, etc.)
- `company_rep_email` (text, nullable) — their email

The existing `contact_name` / `contact_email` fields become the **Intermediary / Banker** contact. The new fields represent the **Company Representative**.

### 3. UI Changes in DealDetail.tsx

**Financials Card** — below the existing 4 hardcoded metrics:
- Display all custom metrics from `deal_metrics` as label + formatted value rows
- "Add Metric" button opens an inline form (label input + value input + format selector)
- Each custom metric has a delete (X) button visible in edit mode
- Inline editing of custom metric values

**Contact Card** — split into two sections:
- **Intermediary / Banker**: existing `contact_name` + `contact_email`
- **Company Representative**: new `company_rep_name` + `company_rep_email`
- Both editable in edit mode

### 4. AI Extraction Updates

Update the AI prompts in `convert-email-to-deal` and `analyze-document` edge functions to:
- Extract `company_rep_name` and `company_rep_email` separately from the intermediary contact
- Clarify that `contact_name`/`contact_email` = the banker/sender, not the company

### Summary of Changes

| Area | What |
|------|------|
| Migration | Create `deal_metrics` table + add `company_rep_name`/`company_rep_email` to `deals` |
| DealDetail.tsx | Custom metrics CRUD UI + split contact card into two sections |
| Edge functions | Update AI prompts to distinguish intermediary vs company rep |

