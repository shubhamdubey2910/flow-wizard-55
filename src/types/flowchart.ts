export type ShapeType = 'terminator' | 'process' | 'decision' | 'manual' | 'preparation' | 'sort' | 'merge' | 'documents' | 'output' | 'database' | 'cloud' | 'exception' | 'text';
export type PortDirection = 'N' | 'S' | 'E' | 'W';
export type ConnectorType = 'straight' | 'elbow';
export type LinePattern = 'solid' | 'dotted' | 'dashed';
export type ArrowType = 'none' | 'triangle';

export interface Point { x: number; y: number; }

export interface NodeStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  fontSize: number;
  textColor: string;
}

export interface FlowNode {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  style: NodeStyle;
  locked: boolean;
}

export interface EdgeStyle {
  stroke: string;
  strokeWidth: number;
  pattern: LinePattern;
  arrowStart: ArrowType;
  arrowEnd: ArrowType;
  label: string;
}

export interface FlowEdge {
  id: string;
  source: { nodeId: string; port: PortDirection };
  target: { nodeId: string; port: PortDirection };
  type: ConnectorType;
  points: Point[];
  style: EdgeStyle;
  locked: boolean;
}

export interface FreeformLine {
  id: string;
  start: Point;
  end: Point;
  style: EdgeStyle;
}

export interface CanvasState {
  zoom: number;
  offset: Point;
  grid: { enabled: boolean; size: number };
}

export interface FlowchartDocument {
  version: string;
  canvas: CanvasState;
  nodes: FlowNode[];
  edges: FlowEdge[];
}
