

## Plan: Freeform Line Drawing Tool

### What
Add a "Draw Line" tool mode that lets users click any point on the canvas as the start, then click another point as the end, creating a free-standing line/arrow — not tied to any node ports.

### How

Currently, edges require `source.nodeId` and `target.nodeId`. Freeform lines need a different model since they connect arbitrary points, not nodes.

#### 1. Extend the data model (`src/types/flowchart.ts`)

Add a new `FreeformLine` interface:
```typescript
export interface FreeformLine {
  id: string;
  start: Point;
  end: Point;
  style: EdgeStyle;
}
```

#### 2. Add store support (`src/stores/flowchartStore.ts`)

- Add `freeformLines: FreeformLine[]` to the store state.
- Add actions: `addFreeformLine(start, end)`, `moveFreeformLineEndpoint(id, which, point)`, `deleteFreeformLine`.
- Include freeform line IDs in `deleteSelected` and `select` logic.
- Include them in `exportJSON`/`importJSON`, `copySelected`/`pasteClipboard`, and undo/redo snapshots.

#### 3. Add tool mode to Canvas (`src/components/flowchart/Canvas.tsx`)

- New state: `activeTool: 'select' | 'line'` (default `'select'`).
- New state: `lineDrawState: { start: Point } | null` for tracking the first click.
- When `activeTool === 'line'`:
  - First click sets the start point.
  - A dashed preview line follows the mouse from start to cursor.
  - Second click creates the freeform line and resets the draw state.
  - `Escape` cancels the current line draw.
- The tool stays active after drawing (so user can draw multiple lines). Click the select tool or press `V`/`Escape` to exit.

#### 4. Render freeform lines (`src/components/flowchart/Canvas.tsx`)

- Render `freeformLines` as SVG `<line>` elements in the transform group, with the same stroke/arrow styling as edges.
- Support selection (click), deletion (Delete key), and style editing via Inspector.

#### 5. Add toolbar button (`src/components/flowchart/Toolbar.tsx`)

- Add a "Line" tool button (using a `Minus` or `Slash` icon from lucide) that toggles `activeTool` to `'line'`.
- Highlight the active tool button.

#### 6. Inspector support (`src/components/flowchart/Inspector.tsx`)

- When a freeform line is selected, show stroke color, width, pattern, and arrow controls (same as edge styling).

### Files to Edit

| File | Changes |
|------|---------|
| `src/types/flowchart.ts` | Add `FreeformLine` interface |
| `src/stores/flowchartStore.ts` | Add `freeformLines` state, CRUD actions, include in undo/copy/delete/export |
| `src/components/flowchart/Canvas.tsx` | Add `activeTool` + `lineDrawState`, handle clicks for line drawing, render lines + preview |
| `src/components/flowchart/Toolbar.tsx` | Add Line tool button |
| `src/components/flowchart/Inspector.tsx` | Add freeform line property panel |

