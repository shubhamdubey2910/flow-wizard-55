

## Plan: Three Fixes

### 1. Ctrl+A Select All

**Problem**: No select-all shortcut exists.

**Fix**: In `Canvas.tsx` keyboard handler (~line 86), add a `Ctrl/Cmd+A` case that selects all node IDs and edge IDs:
```typescript
if ((e.ctrlKey || e.metaKey) && e.code === 'KeyA') {
  e.preventDefault();
  const s = useFlowchartStore.getState();
  s.select([...s.nodes.map(n => n.id), ...s.edges.map(e => e.id)]);
}
```

### 2. Straight Connector Bug Fix

**Problem**: The straight-line shortcut in `getManhattanRoute` only triggers for exact port-pair matches (`S→N`, `N→S`, `E→W`, `W→E`). If nodes are vertically aligned but connected via non-opposing ports (e.g., `S→S`, or `E→N`), or if the edge type is `straight` but edges still use `elbow` routing, the elbow persists.

The real issue: the `isAligned` check uses the **port positions** (start/end), not the **node centers**. When grid snapping rounds node positions, port X coordinates can differ by 1-2px — just enough to exceed tolerance after the ports are computed from different-width shapes (e.g., a 140px-wide rectangle vs a 120px-wide diamond have different center X values even when "aligned").

**Fix** (in `src/utils/geometry.ts`):
- Increase `SNAP_TOLERANCE` from 6 to 8 for more forgiving alignment detection.
- Add a **general** straight-line check that works for ANY port pair, not just opposing pairs: if start and end share the same X (within tolerance), return a straight vertical line regardless of port directions. Same for Y alignment → straight horizontal.
- In `simplifyPath`, also collapse near-collinear segments with a slightly larger threshold (2px instead of 1px) to catch rounding artifacts.

### 3. Swimlane Resize Improvements

**Problem**: Lane divider dragging is buggy — the resize calculation uses raw `e.clientY` delta against `startPos` but doesn't properly account for the initial click offset. The divider line is only 1px wide (hard to grab), and there's no visual feedback during resize.

**Fixes** across multiple files:

**`SwimlaneRenderer.tsx`**:
- Make divider hit target wider: add a transparent rect (8-10px) behind the 1px divider line for easier grabbing.
- Add a pool-level resize handle on the right/bottom edge to resize `crossAxisSize` (pool width/height).
- Show a highlight on the divider being dragged.

**`Canvas.tsx`**:
- Fix the `laneDividerDrag` handler: the delta calculation should use the screen-space difference divided by zoom consistently.
- Add a new interaction state for **pool edge resize** (resizing `crossAxisSize`).
- During lane divider drag, show a temporary guide line at the current position.

**`swimlaneStore.ts`**:
- Add a `resizePoolCrossAxis` action to update `crossAxisSize`.
- Ensure `resizeLane` enforces `minSizePx` properly (already does, but double-check edge cases).

### Files to Edit

| File | Changes |
|------|---------|
| `src/components/flowchart/Canvas.tsx` | Add Ctrl+A, fix lane divider drag math, add pool edge resize state |
| `src/utils/geometry.ts` | Improve straight-line detection for all port combos, widen tolerance |
| `src/components/flowchart/SwimlaneRenderer.tsx` | Wider divider hit targets, pool resize handles, visual feedback |
| `src/stores/swimlaneStore.ts` | Add `resizePoolCrossAxis` action |

