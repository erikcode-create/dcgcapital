

## Plan: Pipeline Categories, Deal Detail Page, and Email Chain Logging

### What you asked for
1. Three pipeline categories: **Equity, Debt, and Revenue Seeking** (replacing the current 7-stage pipeline)
2. Ability to re-categorize deals after initial categorization
3. Auto-log email chains from data@fitzcap.co tied to each deal
4. Replace the deal slideout panel with a **full dedicated Deal Detail page**

### Ideas from comparable systems

Before building, here are features I'd recommend based on how platforms like **DealCloud, Altvia, Juniper Square, 4Degrees, and Affinity CRM** work for PE/VC firms like yours:

**Deal Detail Page sections (what the big firms use):**
- **Overview header** -- deal name, category badge (Equity/Debt/Revenue Seeking), stage, key metrics at a glance
- **Data Room** -- the document management you already have, with AI summaries
- **Email Thread** -- complete email chain auto-linked from data@fitzcap.co, threaded by conversation
- **Activity Timeline** -- unified log of notes, emails received, stage changes, document uploads (not just manual notes)
- **Financials card** -- the financial metrics grid you already have
- **Contact/Counterparty info** -- who sent the deal, banker info, company contacts
- **Investor Access** -- which investors are assigned, NDA status per investor
- **Internal Scoring/IC Memo** -- a place for investment committee notes and a simple pass/pursue/hold vote tracker (future)
- **Comparable Deals** -- link related deals or show similar deals in the pipeline (future)

**Pipeline enhancements:**
- Within each category (Equity/Debt/Revenue Seeking), keep sub-stages (Sourcing → Screening → DD → LOI → Closing → Closed/Passed) so you can track progression
- Kanban board per category, or a tabbed view switching between the three pipelines
- Category-level stats (total pipeline value per category)

**Email chain logging approach:**
- When a deal is created from an email, store the `conversation_id` from Microsoft Graph
- Periodically (or on sync), match new emails by `conversation_id` to auto-link them to the deal
- Show the full thread in the deal detail page, newest first

### Implementation Plan

**1. Database changes**
- Add `category` column to `deals` table (values: `equity`, `debt`, `revenue_seeking`) with default `equity`
- Create `deal_emails` junction table linking `deal_id` to `email_id` (so one deal can have many emails and email chains are tracked)
- Backfill: set category based on existing `deal_type` where possible

**2. Update `convert-email-to-deal` edge function**
- When creating a deal from a categorized email, set the deal's `category` from the email's category
- Insert a `deal_emails` record linking the source email
- Store the email's `conversation_id` on the deal for future thread matching

**3. Update `fetch-emails` edge function**
- After syncing emails, auto-match any email whose `conversation_id` matches an existing deal and insert into `deal_emails`

**4. New route: `/admin/deals/:id` (Deal Detail Page)**
- Replace the slideout with navigation to a full page
- Sections: Overview header, Category selector, Stage pipeline, Data Room, Email Thread, Activity Timeline, Financials, Contacts, Assigned Investors
- Category can be changed via a dropdown at any time
- Email thread section pulls from `deal_emails` joined to `emails`, displayed as a threaded conversation

**5. Update Pipeline view**
- Three tabs or swimlanes: Equity | Debt | Revenue Seeking
- Each shows the stage-based kanban (Sourcing → Screening → DD → LOI → Closing → Closed)
- Category selector on deal cards and in the deal creation form
- Stats row shows per-category pipeline value

**6. Update `AdminPortal.tsx`**
- Pipeline tab gets category filter tabs
- Deal cards click → navigate to `/admin/deals/:id` instead of opening slideout
- Remove the slideout code entirely
- Add category to deal creation form and deal table

### Technical details

```text
Pipeline Structure:
┌─────────────────────────────────────────────────────┐
│  [Equity]  [Debt]  [Revenue Seeking]   ← category  │
│                                          tabs       │
│  Sourcing → Screening → DD → LOI → Closing → Done  │
│  (kanban columns within each category)              │
└─────────────────────────────────────────────────────┘

Deal Detail Page Layout:
┌─────────────────────────────────────────────────────┐
│ ← Back to Pipeline          [Edit] [Delete]         │
│ DEAL NAME          [Equity ▼]  [Screening ▼]        │
│ Sector · Geography · Contact                        │
├──────────┬──────────────────────────────────────────┤
│ Overview │ Data Room │ Emails │ Activity │ Investors │
├──────────┴──────────────────────────────────────────┤
│                                                     │
│  (Tab content: financials, docs, email chain, etc.) │
│                                                     │
└─────────────────────────────────────────────────────┘

deal_emails table:
  id (uuid PK)
  deal_id (uuid, FK deals)
  email_id (uuid, FK emails)
  linked_at (timestamptz, default now())
  linked_by (text: 'auto' | 'manual')
  UNIQUE(deal_id, email_id)
```

New files:
- `src/pages/DealDetail.tsx` -- full deal detail page
- Migration for `deals.category` column and `deal_emails` table

Modified files:
- `src/App.tsx` -- add `/admin/deals/:id` route
- `src/pages/AdminPortal.tsx` -- category tabs on pipeline, navigate to detail page instead of slideout, remove slideout
- `supabase/functions/convert-email-to-deal/index.ts` -- set category, insert deal_emails
- `supabase/functions/fetch-emails/index.ts` -- auto-link emails by conversation_id

