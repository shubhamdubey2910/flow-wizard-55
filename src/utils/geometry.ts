import { FlowNode, PortDirection, Point } from '@/types/flowchart';

export function getPortPosition(node: FlowNode, port: PortDirection): Point {
  switch (port) {
    case 'N': return { x: node.x + node.w / 2, y: node.y };
    case 'S': return { x: node.x + node.w / 2, y: node.y + node.h };
    case 'E': return { x: node.x + node.w, y: node.y + node.h / 2 };
    case 'W': return { x: node.x, y: node.y + node.h / 2 };
  }
}

export function getNearestPort(node: FlowNode, point: Point): PortDirection {
  const ports: PortDirection[] = ['N', 'S', 'E', 'W'];
  let nearest = ports[0];
  let minDist = Infinity;
  for (const port of ports) {
    const pos = getPortPosition(node, port);
    const dist = Math.hypot(point.x - pos.x, point.y - pos.y);
    if (dist < minDist) { minDist = dist; nearest = port; }
  }
  return nearest;
}

function isAligned(start: Point, end: Point, threshold = 8): { horizontal: boolean; vertical: boolean } {
  return {
    horizontal: Math.abs(start.y - end.y) < threshold,
    vertical: Math.abs(start.x - end.x) < threshold,
  };
}

export function getManhattanRoute(
  start: Point, end: Point,
  sourcePort: PortDirection, targetPort: PortDirection
): Point[] {
  const aligned = isAligned(start, end);
  const isVerticalPair = (sourcePort === 'S' && targetPort === 'N') || (sourcePort === 'N' && targetPort === 'S');
  const isHorizontalPair = (sourcePort === 'E' && targetPort === 'W') || (sourcePort === 'W' && targetPort === 'E');

  if (isVerticalPair && aligned.vertical) return [{ ...start }, { ...end }];
  if (isHorizontalPair && aligned.horizontal) return [{ ...start }, { ...end }];

  const margin = 24;
  const points: Point[] = [{ ...start }];

  const isSourceH = sourcePort === 'E' || sourcePort === 'W';
  const isTargetH = targetPort === 'E' || targetPort === 'W';

  const ext: Point = { ...start };
  if (sourcePort === 'E') ext.x += margin;
  else if (sourcePort === 'W') ext.x -= margin;
  else if (sourcePort === 'S') ext.y += margin;
  else ext.y -= margin;
  points.push(ext);

  const tExt: Point = { ...end };
  if (targetPort === 'E') tExt.x += margin;
  else if (targetPort === 'W') tExt.x -= margin;
  else if (targetPort === 'S') tExt.y += margin;
  else tExt.y -= margin;

  if (isSourceH && isTargetH) {
    const midX = (ext.x + tExt.x) / 2;
    points.push({ x: midX, y: ext.y });
    points.push({ x: midX, y: tExt.y });
  } else if (!isSourceH && !isTargetH) {
    const midY = (ext.y + tExt.y) / 2;
    points.push({ x: ext.x, y: midY });
    points.push({ x: tExt.x, y: midY });
  } else if (isSourceH) {
    points.push({ x: tExt.x, y: ext.y });
  } else {
    points.push({ x: ext.x, y: tExt.y });
  }

  points.push(tExt);
  points.push({ ...end });
  return points;
}

// Smart guides for alignment snapping
export interface SmartGuide {
  orientation: 'v' | 'h';
  pos: number;
  start: number;
  end: number;
}

export function computeSmartGuides(
  node: { x: number; y: number; w: number; h: number },
  others: { x: number; y: number; w: number; h: number }[],
  threshold = 6
): { guides: SmartGuide[]; snapDx: number; snapDy: number } {
  const guides: SmartGuide[] = [];
  let snapDx = 0, snapDy = 0;
  let bestDx = Infinity, bestDy = Infinity;

  const ne = {
    l: node.x, r: node.x + node.w, t: node.y, b: node.y + node.h,
    cx: node.x + node.w / 2, cy: node.y + node.h / 2,
  };

  for (const o of others) {
    const oe = {
      l: o.x, r: o.x + o.w, t: o.y, b: o.y + o.h,
      cx: o.x + o.w / 2, cy: o.y + o.h / 2,
    };

    // Vertical (x) alignment checks
    const vPairs: [number, number][] = [
      [ne.l, oe.l], [ne.l, oe.r], [ne.l, oe.cx],
      [ne.r, oe.l], [ne.r, oe.r], [ne.r, oe.cx],
      [ne.cx, oe.cx], [ne.cx, oe.l], [ne.cx, oe.r],
    ];
    for (const [a, b] of vPairs) {
      const d = Math.abs(a - b);
      if (d < threshold && d < bestDx) {
        bestDx = d;
        snapDx = b - a;
      }
    }

    // Horizontal (y) alignment checks
    const hPairs: [number, number][] = [
      [ne.t, oe.t], [ne.t, oe.b], [ne.t, oe.cy],
      [ne.b, oe.t], [ne.b, oe.b], [ne.b, oe.cy],
      [ne.cy, oe.cy], [ne.cy, oe.t], [ne.cy, oe.b],
    ];
    for (const [a, b] of hPairs) {
      const d = Math.abs(a - b);
      if (d < threshold && d < bestDy) {
        bestDy = d;
        snapDy = b - a;
      }
    }
  }

  // Build guide lines for snapped positions
  const snappedNode = {
    l: ne.l + snapDx, r: ne.r + snapDx, t: ne.t + snapDy, b: ne.b + snapDy,
    cx: ne.cx + snapDx, cy: ne.cy + snapDy,
  };

  for (const o of others) {
    const oe = {
      l: o.x, r: o.x + o.w, t: o.y, b: o.y + o.h,
      cx: o.x + o.w / 2, cy: o.y + o.h / 2,
    };
    const yMin = Math.min(snappedNode.t, oe.t) - 10;
    const yMax = Math.max(snappedNode.b, oe.b) + 10;
    const xMin = Math.min(snappedNode.l, oe.l) - 10;
    const xMax = Math.max(snappedNode.r, oe.r) + 10;

    for (const val of [oe.l, oe.r, oe.cx]) {
      if (Math.abs(snappedNode.l - val) < 1 || Math.abs(snappedNode.r - val) < 1 || Math.abs(snappedNode.cx - val) < 1) {
        guides.push({ orientation: 'v', pos: val, start: yMin, end: yMax });
      }
    }
    for (const val of [oe.t, oe.b, oe.cy]) {
      if (Math.abs(snappedNode.t - val) < 1 || Math.abs(snappedNode.b - val) < 1 || Math.abs(snappedNode.cy - val) < 1) {
        guides.push({ orientation: 'h', pos: val, start: xMin, end: xMax });
      }
    }
  }

  return { guides, snapDx, snapDy };
}

export function applyResize(
  handle: string,
  dx: number, dy: number,
  orig: { x: number; y: number; w: number; h: number },
  shiftKey: boolean
): { x: number; y: number; w: number; h: number } {
  let { x, y, w, h } = orig;
  const minW = 40, minH = 30;

  switch (handle) {
    case 'e': w = Math.max(minW, orig.w + dx); break;
    case 'w': { const nw = Math.max(minW, orig.w - dx); x = orig.x + orig.w - nw; w = nw; break; }
    case 's': h = Math.max(minH, orig.h + dy); break;
    case 'n': { const nh = Math.max(minH, orig.h - dy); y = orig.y + orig.h - nh; h = nh; break; }
    case 'se': w = Math.max(minW, orig.w + dx); h = Math.max(minH, orig.h + dy); break;
    case 'sw': { const nw = Math.max(minW, orig.w - dx); x = orig.x + orig.w - nw; w = nw; h = Math.max(minH, orig.h + dy); break; }
    case 'ne': { w = Math.max(minW, orig.w + dx); const nh = Math.max(minH, orig.h - dy); y = orig.y + orig.h - nh; h = nh; break; }
    case 'nw': { const nw2 = Math.max(minW, orig.w - dx); x = orig.x + orig.w - nw2; w = nw2; const nh2 = Math.max(minH, orig.h - dy); y = orig.y + orig.h - nh2; h = nh2; break; }
  }

  if (shiftKey && ['nw', 'ne', 'se', 'sw'].includes(handle)) {
    const ratio = orig.w / orig.h;
    if (w / h > ratio) { h = w / ratio; }
    else { w = h * ratio; }
    // Re-anchor based on handle
    if (handle === 'nw') { x = orig.x + orig.w - w; y = orig.y + orig.h - h; }
    if (handle === 'ne') { y = orig.y + orig.h - h; }
    if (handle === 'sw') { x = orig.x + orig.w - w; }
  }

  return { x, y, w, h };
}
