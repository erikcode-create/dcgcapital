

## Implementation Plan: Complete the Enhanced Deal Overview

### Status check
- ✅ `deal_tasks` table — exists with correct schema and RLS
- ✅ `deal_ai_summaries` table — exists with correct schema and RLS
- ❌ `supabase/functions/analyze-deal-overview/index.ts` — missing
- ❌ `supabase/config.toml` — missing function entry
- ❌ `src/pages/DealDetail.tsx` — missing all 4 new UI sections + data fetching

### 1. Create edge function `supabase/functions/analyze-deal-overview/index.ts`
- CORS + auth via `getClaims()` + admin check via `has_role` RPC
- Accepts `{ deal_id }`, loads deal record, linked emails (via `deal_emails` join), document summaries, and notes
- Calls Lovable AI gateway (`google/gemini-3-flash-preview`) with structured prompt requesting `communications_summary`, `concerns[]`, `missing_data[]`
- Upserts result into `deal_ai_summaries` with email/document counts
- Returns the summary data

### 2. Update `supabase/config.toml`
- Add `[functions.analyze-deal-overview]` with `verify_jwt = false`

### 3. Update `src/pages/DealDetail.tsx`

**New state:**
- `aiSummary` — cached AI briefing from `deal_ai_summaries`
- `dealTasks` — tasks from `deal_tasks`
- `refreshingAi` — loading state for AI analysis
- `newTaskTitle`, `newTaskDate`, `newTaskAssignee` — task creation form

**New data fetching (inside `fetchRelated`):**
- Fetch `deal_ai_summaries` for current deal (`.maybeSingle()`)
- Fetch `deal_tasks` ordered by due date

**New handlers:**
- `handleRefreshAiAnalysis()` — invokes `analyze-deal-overview`, updates `aiSummary` state
- `handleAddTask()` — inserts into `deal_tasks`
- `handleToggleTaskStatus(taskId)` — toggles between `todo`/`done`
- `handleDeleteTask(taskId)` — deletes from `deal_tasks`

**New UI sections on Overview tab (below existing cards):**

1. **AI Communications Summary card** — narrative text, "Refresh Analysis" button, "Last updated" timestamp, email/doc count badge
2. **AI Concerns card** — bulleted list with amber/warning styling
3. **Missing Data card** — bulleted list with blue/info styling  
4. **Scheduling & Tasks card** — Calendar component for date picking + task list with add form (title, date, assignee select from profiles), status toggle, delete

**New imports needed:** `Calendar` component, `AlertTriangle`, `Info`, `CalendarDays`, `Plus`, `CheckCircle2` from lucide-react

