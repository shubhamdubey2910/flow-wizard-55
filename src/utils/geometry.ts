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

export function getManhattanRoute(
  start: Point, end: Point,
  sourcePort: PortDirection, targetPort: PortDirection
): Point[] {
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
