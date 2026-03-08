

## Enhanced Deal Overview: AI Intelligence + Task Scheduling

### What we're building

Four new sections on the Overview tab that give admins an at-a-glance intelligence briefing and task management:

1. **AI Communications Summary** — Auto-generated summary of all emails and documents linked to the deal
2. **AI Concerns** — AI-identified risks, red flags, or issues worth investigating
3. **Missing Data** — AI-identified gaps in the deal profile (missing financials, contacts, documents, etc.)
4. **Scheduling & Tasks** — Calendar-style task list with due dates and assignees

### Database changes

New `deal_tasks` table:
```sql
create table public.deal_tasks (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null,
  title text not null,
  description text,
  due_date date,
  assigned_to uuid,
  created_by uuid,
  status text not null default 'todo', -- todo, in_progress, done
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.deal_tasks enable row level security;

-- RLS: admins full access
create policy "Admins can manage deal tasks"
  on public.deal_tasks for all
  to authenticated
  using (has_role(auth.uid(), 'admin'))
  with check (has_role(auth.uid(), 'admin'));

-- Investors can view tasks on assigned deals
create policy "Investors can view tasks on assigned deals"
  on public.deal_tasks for select
  to authenticated
  using (deal_id in (
    select deal_id from deal_assignments where investor_id = auth.uid()
  ));
```

New `deal_ai_summaries` table to cache AI analysis so it doesn't regenerate on every page load:
```sql
create table public.deal_ai_summaries (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null unique,
  communications_summary text,
  concerns jsonb default '[]',
  missing_data jsonb default '[]',
  generated_at timestamptz not null default now(),
  email_count int default 0,
  document_count int default 0
);

alter table public.deal_ai_summaries enable row level security;

create policy "Admins can manage deal AI summaries"
  on public.deal_ai_summaries for all
  to authenticated
  using (has_role(auth.uid(), 'admin'))
  with check (has_role(auth.uid(), 'admin'));
```

### New edge function: `analyze-deal-overview`

Takes a `deal_id`, loads the deal record + all linked emails + all document summaries, sends them to AI (Gemini 3 Flash) with a structured prompt requesting:
- Communications summary (narrative paragraph)
- List of concerns (array of strings)
- List of missing/helpful data (array of strings)

Results are upserted into `deal_ai_summaries`. The function is called:
- On-demand via a "Refresh AI Analysis" button on the Overview tab
- The UI shows cached data from `deal_ai_summaries` and indicates when it was last generated

### UI changes to `DealDetail.tsx`

The Overview tab gets reorganized with new sections below the existing cards:

1. **Communications Summary card** — Shows the AI-generated narrative with a "Refresh" button and "Last updated" timestamp
2. **AI Concerns card** — Bulleted list of concerns with warning styling
3. **Missing Data card** — Bulleted list of gaps with info styling
4. **Scheduling card** — Mini calendar (using existing Calendar component) + task list below it, with ability to add tasks (title, due date, assignee from profiles list), mark complete, delete

### Files to create/edit
- `supabase/functions/analyze-deal-overview/index.ts` — new edge function
- `supabase/config.toml` — add function config (verify_jwt = false)
- `src/pages/DealDetail.tsx` — add state, fetch, and UI for all 4 new sections
- Database migration for `deal_tasks` and `deal_ai_summaries` tables

