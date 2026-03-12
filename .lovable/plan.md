

## Plan: Investor Deal Preferences

### What
Add a "Deal Preferences" section to the Investor Portal where investors can set their investment preferences using dropdown selectors. These preferences are stored in a new `investor_preferences` table and visible to admins on the deal/user management screens.

### New Table: `investor_preferences`

```text
investor_preferences
├── id (uuid, PK)
├── investor_id (uuid, NOT NULL, unique, references auth.users)
├── preferred_regions (text[])           -- e.g. ['North America', 'Europe']
├── preferred_sectors (text[])           -- e.g. ['Technology', 'Healthcare']
├── preferred_deal_types (text[])        -- e.g. ['Buyout', 'Growth Equity']
├── preferred_categories (text[])        -- e.g. ['Equity', 'Debt']
├── revenue_size_min (text)              -- e.g. '$1M - $10M'
├── revenue_size_max (text)              -- e.g. '$50M - $100M'
├── ebitda_range (text)                  -- e.g. '$5M - $25M'
├── enterprise_value_range (text)        -- e.g. '$50M - $250M'
├── revenue_stage_preference (text)      -- 'Pre Revenue', 'Post Revenue', 'Both'
├── check_size (text)                    -- e.g. '$1M - $5M'
├── created_at (timestamptz)
├── updated_at (timestamptz)
```

RLS: Investors can CRUD their own row. Admins can view all.

### Dropdown Options

| Dropdown | Options |
|----------|---------|
| **Regions** (multi) | North America, Europe, Asia-Pacific, Middle East, Latin America, Africa |
| **Sectors** (multi) | Technology, Healthcare, Financial Services, Energy, Consumer, Industrials, Real Estate, Infrastructure |
| **Deal Type** (multi) | Buyout, Growth Equity, Venture, Recapitalization, Distressed, Add-on |
| **Category** (multi) | Equity, Debt, Revenue Seeking |
| **Revenue Size** | < $1M, $1M–$10M, $10M–$50M, $50M–$100M, $100M–$500M, $500M+ |
| **EBITDA Range** | < $1M, $1M–$5M, $5M–$25M, $25M–$50M, $50M+ |
| **EV Range** | < $10M, $10M–$50M, $50M–$250M, $250M–$1B, $1B+ |
| **Revenue Stage** | Pre Revenue, Post Revenue, Both |
| **Check Size** | < $1M, $1M–$5M, $5M–$25M, $25M–$50M, $50M+ |

### UI Changes

**InvestorPortal.tsx** — Add a "My Preferences" card/section (collapsible or always visible above deals):
- Grid of dropdown selectors for each preference
- Multi-select dropdowns for Regions, Sectors, Deal Type, Category (using checkboxes inside a popover or multiple Select components)
- Single-select dropdowns for Revenue Size, EBITDA, EV Range, Revenue Stage, Check Size
- Auto-save on change (no explicit save button) with toast confirmation

### Files Modified
- **Migration**: Create `investor_preferences` table with RLS
- **`src/pages/InvestorPortal.tsx`**: Add preferences UI section with dropdowns

