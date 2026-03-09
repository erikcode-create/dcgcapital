

## Make "Growth" fade in from left (opposite of "Dilution" fade-out)

### What changes

**`src/index.css`** — Add a new utility class `.text-gradient-growth` with a left-to-right gradient that goes from transparent/dim to full color (the reverse direction of `.text-gradient-royal`):

```css
.text-gradient-growth {
  background: linear-gradient(135deg, hsl(270 55% 16%), hsl(270 50% 25%), hsl(270 40% 40%));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

**`src/pages/Index.tsx`** (line 222) — Wrap "Growth" in a span with the new class:

```tsx
<span className="text-gradient-growth font-medium">Growth</span> Capital Without Early{" "}
<span className="text-gradient-royal font-medium">Equity Dilution</span>
```

This mirrors the dimming effect: "Dilution" fades out left→right, "Growth" fades in left→right (starts dim, ends bright).

