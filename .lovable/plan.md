

## Plan: Fix Grid Granularity and Space Key in Text Editing

### Issue 1: Coarse Grid Prevents Straight Connectors

The grid size is **20px**, meaning nodes snap to 20px increments. Two nodes of different widths (e.g., 140px process vs 120px decision) will have center X values differing by 10px — exceeding the 8px straight-line tolerance. Reducing the grid to **8px** makes alignment far more achievable.

**File: `src/stores/flowchartStore.ts`** (line 85)
- Change `grid: { enabled: true, size: 20 }` → `grid: { enabled: true, size: 8 }`

### Issue 2: Space Key Blocked During Text Editing

The keyboard handler in Canvas.tsx processes `Space` (for pan mode) on line 90, **before** the early return for INPUT/TEXTAREA on line 92. The fix is to move the INPUT/TEXTAREA guard above the Space handler.

**File: `src/components/flowchart/Canvas.tsx`** (lines 89-92)
- Reorder so the tag check (`INPUT`, `TEXTAREA`) comes first, before the Space key handler.

### Files to Edit

| File | Change |
|------|--------|
| `src/stores/flowchartStore.ts` | Grid size 20 → 8 |
| `src/components/flowchart/Canvas.tsx` | Move INPUT/TEXTAREA guard above Space key handler |

