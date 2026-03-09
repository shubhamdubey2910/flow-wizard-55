import { create } from 'zustand';
import { FlowNode, FlowEdge, CanvasState, ShapeType, PortDirection, Point, FreeformLine, EdgeStyle } from '@/types/flowchart';

let counter = 0;
const genId = () => `id-${Date.now()}-${++counter}`;

const defaultDimensions: Record<ShapeType, { w: number; h: number }> = {
  text: { w: 120, h: 36 },
  terminator: { w: 140, h: 56 },
  process: { w: 140, h: 72 },
  decision: { w: 120, h: 100 },
  manual: { w: 140, h: 72 },
  preparation: { w: 160, h: 72 },
  sort: { w: 100, h: 80 },
  merge: { w: 100, h: 80 },
  documents: { w: 140, h: 80 },
  output: { w: 140, h: 72 },
  database: { w: 100, h: 80 },
  cloud: { w: 140, h: 80 },
  exception: { w: 100, h: 80 },
};

const defaultLabels: Record<ShapeType, string> = {
  text: 'Text',
  terminator: 'Start/End',
  process: 'Process',
  decision: 'Decision',
  manual: 'Manual Op',
  preparation: 'Preparation',
  sort: 'Sort',
  merge: 'Merge',
  documents: 'Documents',
  output: 'Output',
  database: 'Database',
  cloud: 'Cloud',
  exception: 'Error',
};

interface Snapshot { nodes: FlowNode[]; edges: FlowEdge[]; freeformLines: FreeformLine[]; }
interface Clipboard { nodes: FlowNode[]; edges: FlowEdge[]; freeformLines: FreeformLine[]; }

interface FlowchartStore {
  nodes: FlowNode[];
  edges: FlowEdge[];
  freeformLines: FreeformLine[];
  selectedIds: string[];
  canvas: CanvasState;
  past: Snapshot[];
  future: Snapshot[];
  clipboard: Clipboard;
  activeTool: 'select' | 'line';

  addNode: (type: ShapeType, x: number, y: number) => string;
  moveNode: (id: string, x: number, y: number) => void;
  moveNodes: (moves: { id: string; x: number; y: number }[]) => void;
  resizeNode: (id: string, x: number, y: number, w: number, h: number) => void;
  updateNodeLabel: (id: string, label: string) => void;
  updateNodeStyle: (id: string, style: Partial<FlowNode['style']>) => void;
  deleteSelected: () => void;
  addEdge: (srcNode: string, srcPort: PortDirection, tgtNode: string, tgtPort: PortDirection) => void;
  updateEdgeStyle: (id: string, style: Partial<FlowEdge['style']>) => void;
  updateEdgeType: (id: string, type: FlowEdge['type']) => void;
  select: (ids: string[]) => void;
  clearSelection: () => void;
  setZoom: (zoom: number) => void;
  setOffset: (offset: Point) => void;
  toggleGrid: () => void;
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  copySelected: () => void;
  cutSelected: () => void;
  pasteClipboard: (mousePos?: Point) => void;
  exportJSON: () => string;
  importJSON: (json: string) => void;
  loadDemo: () => void;
  addFreeformLine: (start: Point, end: Point) => void;
  updateFreeformLineStyle: (id: string, style: Partial<EdgeStyle>) => void;
  setActiveTool: (tool: 'select' | 'line') => void;
}

const DEFAULT_STYLE: FlowNode['style'] = {
  fill: '#FFFFFF', stroke: '#6A1B9A', strokeWidth: 2, fontSize: 13, textColor: '#1a1a2e',
};

export const useFlowchartStore = create<FlowchartStore>((set, get) => ({
  nodes: [],
  edges: [],
  freeformLines: [],
  selectedIds: [],
  canvas: { zoom: 1, offset: { x: 0, y: 0 }, grid: { enabled: true, size: 8 } },
  past: [],
  future: [],
  clipboard: { nodes: [], edges: [], freeformLines: [] },
  activeTool: 'select',

  pushHistory: () => set(s => ({
    past: [...s.past.slice(-30), { nodes: JSON.parse(JSON.stringify(s.nodes)), edges: JSON.parse(JSON.stringify(s.edges)), freeformLines: JSON.parse(JSON.stringify(s.freeformLines)) }],
    future: [],
  })),

  addNode: (type, x, y) => {
    const dims = defaultDimensions[type];
    const id = genId();
    get().pushHistory();
    set(s => ({
      nodes: [...s.nodes, {
        id, type,
        x: x - dims.w / 2, y: y - dims.h / 2,
        w: dims.w, h: dims.h,
        label: defaultLabels[type],
        style: { ...DEFAULT_STYLE },
        locked: false,
      }],
      selectedIds: [id],
    }));
    return id;
  },

  moveNode: (id, x, y) => set(s => {
    const { grid } = s.canvas;
    const sx = grid.enabled ? Math.round(x / grid.size) * grid.size : x;
    const sy = grid.enabled ? Math.round(y / grid.size) * grid.size : y;
    return { nodes: s.nodes.map(n => n.id === id ? { ...n, x: sx, y: sy } : n) };
  }),

  moveNodes: (moves) => set(s => {
    const { grid } = s.canvas;
    const moveMap = new Map(moves.map(m => [m.id, m]));
    return {
      nodes: s.nodes.map(n => {
        const m = moveMap.get(n.id);
        if (!m) return n;
        const sx = grid.enabled ? Math.round(m.x / grid.size) * grid.size : m.x;
        const sy = grid.enabled ? Math.round(m.y / grid.size) * grid.size : m.y;
        return { ...n, x: sx, y: sy };
      }),
    };
  }),

  resizeNode: (id, x, y, w, h) => set(s => {
    const { grid } = s.canvas;
    const snap = (v: number) => grid.enabled ? Math.round(v / grid.size) * grid.size : v;
    return {
      nodes: s.nodes.map(n => n.id === id ? {
        ...n,
        x: snap(x), y: snap(y),
        w: Math.max(40, grid.enabled ? Math.round(w / grid.size) * grid.size : w),
        h: Math.max(30, grid.enabled ? Math.round(h / grid.size) * grid.size : h),
      } : n),
    };
  }),

  updateNodeLabel: (id, label) => {
    get().pushHistory();
    set(s => ({ nodes: s.nodes.map(n => n.id === id ? { ...n, label } : n) }));
  },

  updateNodeStyle: (id, style) => {
    get().pushHistory();
    set(s => ({ nodes: s.nodes.map(n => n.id === id ? { ...n, style: { ...n.style, ...style } } : n) }));
  },

  deleteSelected: () => {
    const { selectedIds } = get();
    if (!selectedIds.length) return;
    get().pushHistory();
    set(s => ({
      nodes: s.nodes.filter(n => !selectedIds.includes(n.id)),
      edges: s.edges.filter(e => !selectedIds.includes(e.id) && !selectedIds.includes(e.source.nodeId) && !selectedIds.includes(e.target.nodeId)),
      selectedIds: [],
    }));
  },

  addEdge: (srcNode, srcPort, tgtNode, tgtPort) => {
    if (srcNode === tgtNode) return;
    get().pushHistory();
    set(s => ({
      edges: [...s.edges, {
        id: genId(),
        source: { nodeId: srcNode, port: srcPort },
        target: { nodeId: tgtNode, port: tgtPort },
        type: 'elbow',
        points: [],
        style: { stroke: '#6A1B9A', strokeWidth: 2, pattern: 'solid', arrowStart: 'none', arrowEnd: 'triangle', label: '' },
        locked: false,
      }],
    }));
  },

  updateEdgeStyle: (id, style) => {
    get().pushHistory();
    set(s => ({ edges: s.edges.map(e => e.id === id ? { ...e, style: { ...e.style, ...style } } : e) }));
  },

  updateEdgeType: (id, type) => {
    get().pushHistory();
    set(s => ({ edges: s.edges.map(e => e.id === id ? { ...e, type } : e) }));
  },

  select: (ids) => set({ selectedIds: ids }),
  clearSelection: () => set({ selectedIds: [] }),
  setZoom: (zoom) => set(s => ({ canvas: { ...s.canvas, zoom } })),
  setOffset: (offset) => set(s => ({ canvas: { ...s.canvas, offset } })),
  toggleGrid: () => set(s => ({ canvas: { ...s.canvas, grid: { ...s.canvas.grid, enabled: !s.canvas.grid.enabled } } })),

  undo: () => set(s => {
    if (!s.past.length) return s;
    const prev = s.past[s.past.length - 1];
    return { past: s.past.slice(0, -1), future: [{ nodes: s.nodes, edges: s.edges }, ...s.future.slice(0, 30)], nodes: prev.nodes, edges: prev.edges, selectedIds: [] };
  }),

  redo: () => set(s => {
    if (!s.future.length) return s;
    const next = s.future[0];
    return { future: s.future.slice(1), past: [...s.past, { nodes: s.nodes, edges: s.edges }], nodes: next.nodes, edges: next.edges, selectedIds: [] };
  }),

  copySelected: () => {
    const { nodes, edges, selectedIds } = get();
    const selNodes = nodes.filter(n => selectedIds.includes(n.id));
    const selNodeIds = new Set(selNodes.map(n => n.id));
    const selEdges = edges.filter(e => selNodeIds.has(e.source.nodeId) && selNodeIds.has(e.target.nodeId));
    set({ clipboard: { nodes: JSON.parse(JSON.stringify(selNodes)), edges: JSON.parse(JSON.stringify(selEdges)) } });
  },

  cutSelected: () => {
    get().copySelected();
    get().deleteSelected();
  },

  pasteClipboard: (mousePos?: Point) => {
    const { clipboard, canvas } = get();
    if (!clipboard.nodes.length) return;
    get().pushHistory();
    const idMap: Record<string, string> = {};
    clipboard.nodes.forEach(n => { idMap[n.id] = genId(); });

    let offsetX: number, offsetY: number;
    if (mousePos) {
      const minX = Math.min(...clipboard.nodes.map(n => n.x));
      const maxX = Math.max(...clipboard.nodes.map(n => n.x + n.w));
      const minY = Math.min(...clipboard.nodes.map(n => n.y));
      const maxY = Math.max(...clipboard.nodes.map(n => n.y + n.h));
      offsetX = mousePos.x - (minX + maxX) / 2;
      offsetY = mousePos.y - (minY + maxY) / 2;
    } else {
      offsetX = 16;
      offsetY = 16;
    }

    const { grid } = canvas;
    const newNodes = clipboard.nodes.map(n => {
      let nx = n.x + offsetX;
      let ny = n.y + offsetY;
      if (grid.enabled) {
        nx = Math.round(nx / grid.size) * grid.size;
        ny = Math.round(ny / grid.size) * grid.size;
      }
      return { ...n, id: idMap[n.id], x: nx, y: ny };
    });
    const newEdges = clipboard.edges.map(e => ({
      ...e, id: genId(),
      source: { ...e.source, nodeId: idMap[e.source.nodeId] },
      target: { ...e.target, nodeId: idMap[e.target.nodeId] },
    }));

    // Store pasted positions for +16 offset on subsequent pastes
    const updatedClipNodes = clipboard.nodes.map((n, i) => ({ ...n, x: newNodes[i].x, y: newNodes[i].y }));

    set(s => ({
      nodes: [...s.nodes, ...newNodes],
      edges: [...s.edges, ...newEdges],
      selectedIds: newNodes.map(n => n.id),
      clipboard: { nodes: updatedClipNodes, edges: clipboard.edges },
    }));
  },

  exportJSON: () => {
    const { nodes, edges, canvas } = get();
    return JSON.stringify({ version: '1.0', canvas, nodes, edges }, null, 2);
  },

  importJSON: (json) => {
    try {
      const doc = JSON.parse(json);
      get().pushHistory();
      set({ nodes: doc.nodes || [], edges: doc.edges || [], selectedIds: [] });
    } catch (e) { console.error('Invalid JSON', e); }
  },

  loadDemo: () => {
    const ids = ['demo-1', 'demo-2', 'demo-3', 'demo-4'];
    const s = { ...DEFAULT_STYLE };
    const nodes: FlowNode[] = [
      { id: ids[0], type: 'terminator', x: 220, y: 60, w: 140, h: 56, label: 'Start', style: s, locked: false },
      { id: ids[1], type: 'process', x: 220, y: 180, w: 140, h: 72, label: 'Process Data', style: s, locked: false },
      { id: ids[2], type: 'decision', x: 230, y: 320, w: 120, h: 100, label: 'Valid?', style: s, locked: false },
      { id: ids[3], type: 'terminator', x: 220, y: 500, w: 140, h: 56, label: 'End', style: { ...s, fill: '#F3E8FF' }, locked: false },
    ];
    const edgeStyle = { stroke: '#6A1B9A', strokeWidth: 2, pattern: 'solid' as const, arrowStart: 'none' as const, arrowEnd: 'triangle' as const, label: '' };
    const edges: FlowEdge[] = [
      { id: 'demo-e1', source: { nodeId: ids[0], port: 'S' }, target: { nodeId: ids[1], port: 'N' }, type: 'straight', points: [], style: edgeStyle, locked: false },
      { id: 'demo-e2', source: { nodeId: ids[1], port: 'S' }, target: { nodeId: ids[2], port: 'N' }, type: 'elbow', points: [], style: { ...edgeStyle, pattern: 'dotted' }, locked: false },
      { id: 'demo-e3', source: { nodeId: ids[2], port: 'S' }, target: { nodeId: ids[3], port: 'N' }, type: 'elbow', points: [], style: { ...edgeStyle, label: 'Yes' }, locked: false },
    ];
    set({ nodes, edges, selectedIds: [], past: [], future: [] });
  },
}));
