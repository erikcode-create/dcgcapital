

## Fix Gradient Text: Only "Dilution" Should Fade

Currently `text-gradient-royal` is used on many words throughout the page, applying a fade effect. The user wants only "Dilution" to have the fading gradient -- all other instances should use a solid color.

### Changes

**`src/pages/Index.tsx`:**
- Line 222: Replace `text-gradient-growth` on "Growth" with a solid color class (e.g., `text-primary-foreground`)
- Line 258: Replace `text-gradient-royal` on "Growth" with `text-accent`
- Line 285: Replace `text-gradient-royal` on "Your Growth" with solid `text-primary-foreground`
- Line 325: Replace `text-gradient-royal` on "Profile" with `text-accent`
- Line 366: Replace `text-gradient-royal` on "Scale" with solid `text-primary-foreground`
- Line 405: Replace `text-gradient-royal` on "Unlock Capital" with `text-accent`
- Line 437: Replace `text-gradient-royal` on "Company" with solid `text-primary-foreground`
- Line 223: Keep `text-gradient-royal` on "Equity Dilution" -- this is the only word that fades

The solid colors will match each section's context (light text on dark backgrounds, accent on light backgrounds).

