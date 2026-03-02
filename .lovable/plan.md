

## Plan: Update Color Swatch Palette

**File: `src/components/flowchart/Inspector.tsx`**

Replace the current color swatch set with a cleaner palette of standard, bold colors. Remove shades of white (keep only one `#FFFFFF`). The new palette:

```
#FFFFFF (White)
#000000 (Black)
#9CA3AF (Grey)
#EF4444 (Red)
#F97316 (Orange)
#EAB308 (Yellow)
#22C55E (Green)
#3B82F6 (Blue)
#6A1B9A (Purple — existing brand color)
```

Apply this palette consistently to all three swatch pickers: Fill, Stroke, and Text Color (for nodes), and Stroke color (for edges).

