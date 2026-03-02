import { create } from 'zustand';
import { FlowNode, FlowEdge, CanvasState, ShapeType, PortDirection, Point } from '@/types/flowchart';

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

interface Snapshot { nodes: FlowNode[]; edges: FlowEdge[]; }
interface Clipboard { nodes: FlowNode[]; edges: FlowEdge[]; }

interface FlowchartStore {
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedIds: string[];
  canvas: CanvasState;
  past: Snapshot[];
  future: Snapshot[];
  clipboard: Clipboard;

  addNode: (type: ShapeType, x: number, y: number) => string;
  moveNode: (id: string, x: number, y: number) => void;
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
  pasteClipboard: () => void;
  exportJSON: () => string;
  importJSON: (json: string) => void;
  loadDemo: () => void;
}

const DEFAULT_STYLE: FlowNode['style'] = {
  fill: '#FFFFFF', stroke: '#6A1B9A', strokeWidth: 2, fontSize: 13, textColor: '#1a1a2e',
};

export const useFlowchartStore = create<FlowchartStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedIds: [],
  canvas: { zoom: 1, offset: { x: 0, y: 0 }, grid: { enabled: true, size: 20 } },
  past: [],
  future: [],
  clipboard: { nodes: [], edges: [] },

  pushHistory: () => set(s => ({
    past: [...s.past.slice(-30), { nodes: JSON.parse(JSON.stringify(s.nodes)), edges: JSON.parse(JSON.stringify(s.edges)) }],
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

  pasteClipboard: () => {
    const { clipboard } = get();
    if (!clipboard.nodes.length) return;
    get().pushHistory();
    const idMap: Record<string, string> = {};
    clipboard.nodes.forEach(n => { idMap[n.id] = genId(); });
    const newNodes = clipboard.nodes.map(n => ({ ...n, id: idMap[n.id], x: n.x + 20, y: n.y + 20 }));
    const newEdges = clipboard.edges.map(e => ({
      ...e, id: genId(),
      source: { ...e.source, nodeId: idMap[e.source.nodeId] },
      target: { ...e.target, nodeId: idMap[e.target.nodeId] },
    }));
    // Update clipboard offsets for subsequent pastes
    set(s => ({
      nodes: [...s.nodes, ...newNodes],
      edges: [...s.edges, ...newEdges],
      selectedIds: newNodes.map(n => n.id),
      clipboard: { nodes: clipboard.nodes.map(n => ({ ...n, x: n.x + 20, y: n.y + 20 })), edges: clipboard.edges },
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
