

## Fitzpatrick Capital Partners — Investment Portal

### 1. Public Marketing Website
- **Hero section** with firm name, tagline, and prominent "Investor Login" button
- **About Us** section — firm overview, investment philosophy, PE focus areas
- **Team** section — partner/team bios with photos and backgrounds
- **Investment Strategy** — focus areas, target deal sizes, sectors
- **Track Record** — key metrics (deals closed, capital deployed, returns)
- **Contact form** — name, email, message with validation
- **Footer** with legal disclaimers, contact info
- Clean, professional dark/navy color scheme befitting a PE firm

### 2. Authentication & Security (Supabase)
- Email/password login for both investors and admins
- Role-based access control: **admin** and **investor** roles stored in a dedicated `user_roles` table
- Protected routes — investor portal and admin portal behind auth
- Row-level security on all tables so investors only see deals they're assigned to

### 3. Investor Portal (logged-in investors)
- **Dashboard** — overview of available deals and their status
- **Deal cards** — each showing: deal name, description, target return, status (active/closed/under review), key documents (PDF uploads/downloads)
- **Express Interest** — button on each deal to indicate interest or commit
- **Messaging** — ability to send questions/messages to the admin about specific deals
- **Profile** — investor can view their own profile info

### 4. Admin Portal (logged-in admins)
- **Deal Management** — create, edit, delete deals with all details (name, description, financials, status, documents)
- **Document uploads** — attach PDFs and files to deals via Supabase Storage
- **Investor Management** — create/invite investor accounts, assign deals to specific investors, manage access
- **Deal Assignment** — control which investors can see which deals
- **Messages Inbox** — view and respond to investor questions
- **Interest Tracker** — see which investors have expressed interest in which deals
- **Analytics dashboard** — overview of active deals, investor engagement

### 5. Database Structure
- `profiles` — user display info
- `user_roles` — admin/investor roles (secure, separate table)
- `deals` — all deal information
- `deal_documents` — files linked to deals (Supabase Storage)
- `deal_assignments` — which investors can see which deals
- `interest_expressions` — investor interest/commitment records
- `messages` — investor-admin messaging per deal
- RLS policies on every table for security

### 6. Design
- Professional, trust-inspiring design with navy/dark blue primary palette and gold/amber accents
- Clean typography, generous whitespace
- Responsive across desktop and mobile

