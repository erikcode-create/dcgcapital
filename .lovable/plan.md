

## Fix: Remove gradient fade on investor name

The investor's first name on the welcome line uses the `.text-gradient-royal` CSS class, which applies a gradient that fades from a solid purple to near-transparent — making the name look like it's fading out.

### Change

**File: `src/pages/InvestorPortal.tsx` (line 231)**

Replace the `text-gradient-royal` class on the name `<span>` with a solid color, e.g. `text-primary` or a direct purple color like `text-[hsl(270,50%,45%)]`, so the name stays one consistent color without fading.

The same class is also used on line 172 and 219 area for the header name — those use `text-muted-foreground` already and are fine.

