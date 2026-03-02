import React, { useRef, useState, useEffect } from 'react';
import { useFlowchartStore } from '@/stores/flowchartStore';
import { ShapeNode } from './ShapeNode';
import { EdgeLine } from './EdgeLine';
import { getPortPosition } from '@/utils/geometry';
import { PortDirection, ShapeType } from '@/types/flowchart';

interface DragState { nodeIds: string[]; offsets: Record<string, { x: number; y: number }>; }
interface ConnectState { sourceNodeId: string; sourcePort: PortDirection; mouseX: number; mouseY: number; }
interface PanState { startX: number; startY: number; offsetX: number; offsetY: number; }
interface MarqueeState { startX: number; startY: number; currentX: number; currentY: number; }

export const Canvas: React.FC = () => {
  const store = useFlowchartStore();
  const { nodes, edges, selectedIds, canvas } = store;
  const svgRef = useRef<SVGSVGElement>(null);
  const spaceRef = useRef(false);

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [connectState, setConnectState] = useState<ConnectState | null>(null);
  const [panState, setPanState] = useState<PanState | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [marqueeState, setMarqueeState] = useState<MarqueeState | null>(null);

  const screenToCanvas = (cx: number, cy: number) => {
    const { canvas: c } = useFlowchartStore.getState();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (cx - rect.left - c.offset.x) / c.zoom, y: (cy - rect.top - c.offset.y) / c.zoom };
  };

  // Wheel zoom (non-passive for preventDefault)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const s = useFlowchartStore.getState();
      const delta = e.deltaY > 0 ? 0.92 : 1.08;
      const newZoom = Math.min(5, Math.max(0.1, s.canvas.zoom * delta));
      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      s.setOffset({
        x: mx - (mx - s.canvas.offset.x) * (newZoom / s.canvas.zoom),
        y: my - (my - s.canvas.offset.y) * (newZoom / s.canvas.zoom),
      });
      s.setZoom(newZoom);
    };
    svg.addEventListener('wheel', handler, { passive: false });
    return () => svg.removeEventListener('wheel', handler);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) { spaceRef.current = true; e.preventDefault(); }
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Delete' || e.code === 'Backspace') useFlowchartStore.getState().deleteSelected();
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); e.shiftKey ? useFlowchartStore.getState().redo() : useFlowchartStore.getState().undo(); }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') { e.preventDefault(); useFlowchartStore.getState().redo(); }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC') { e.preventDefault(); useFlowchartStore.getState().copySelected(); }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyX') { e.preventDefault(); useFlowchartStore.getState().cutSelected(); }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') { e.preventDefault(); useFlowchartStore.getState().pasteClipboard(); }
    };
    const onUp = (e: KeyboardEvent) => { if (e.code === 'Space') spaceRef.current = false; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (spaceRef.current || e.button === 1) {
      setPanState({ startX: e.clientX, startY: e.clientY, offsetX: canvas.offset.x, offsetY: canvas.offset.y });
      return;
    }
    if ((e.target as SVGElement) === svgRef.current || (e.target as SVGElement).classList.contains('canvas-bg')) {
      store.clearSelection();
      setEditingNodeId(null);
      // Start marquee selection
      const pos = screenToCanvas(e.clientX, e.clientY);
      setMarqueeState({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y });
    }
  };

  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (panState) {
      useFlowchartStore.getState().setOffset({ x: panState.offsetX + e.clientX - panState.startX, y: panState.offsetY + e.clientY - panState.startY });
      return;
    }
    if (dragState && dragStartPos.current) {
      const pos = screenToCanvas(e.clientX, e.clientY);
      const s = useFlowchartStore.getState();
      for (const nodeId of dragState.nodeIds) {
        const off = dragState.offsets[nodeId];
        if (off) {
          s.moveNode(nodeId, pos.x - dragStartPos.current.x + off.x, pos.y - dragStartPos.current.y + off.y);
        }
      }
      return;
    }
    if (connectState) {
      setConnectState(prev => prev ? { ...prev, mouseX: e.clientX, mouseY: e.clientY } : null);
      return;
    }
    if (marqueeState) {
      const pos = screenToCanvas(e.clientX, e.clientY);
      setMarqueeState(prev => prev ? { ...prev, currentX: pos.x, currentY: pos.y } : null);
    }
  };

  const handleMouseUp = () => {
    if (panState) { setPanState(null); return; }
    if (dragState) { setDragState(null); dragStartPos.current = null; return; }
    if (connectState) {
      const pos = screenToCanvas(connectState.mouseX, connectState.mouseY);
      const s = useFlowchartStore.getState();
      for (const node of s.nodes) {
        if (node.id === connectState.sourceNodeId) continue;
        for (const dir of ['N', 'S', 'E', 'W'] as PortDirection[]) {
          const pp = getPortPosition(node, dir);
          if (Math.hypot(pos.x - pp.x, pos.y - pp.y) < 20) {
            s.addEdge(connectState.sourceNodeId, connectState.sourcePort, node.id, dir);
            setConnectState(null);
            return;
          }
        }
      }
      setConnectState(null);
    }
    if (marqueeState) {
      const s = useFlowchartStore.getState();
      const x1 = Math.min(marqueeState.startX, marqueeState.currentX);
      const y1 = Math.min(marqueeState.startY, marqueeState.currentY);
      const x2 = Math.max(marqueeState.startX, marqueeState.currentX);
      const y2 = Math.max(marqueeState.startY, marqueeState.currentY);
      if (Math.abs(x2 - x1) > 5 || Math.abs(y2 - y1) > 5) {
        const hitIds = s.nodes
          .filter(n => n.x < x2 && n.x + n.w > x1 && n.y < y2 && n.y + n.h > y1)
          .map(n => n.id);
        if (hitIds.length) s.select(hitIds);
      }
      setMarqueeState(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('shapeType');
    if (!type) return;
    const pos = screenToCanvas(e.clientX, e.clientY);
    store.addNode(type as ShapeType, pos.x, pos.y);
  };

  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const s = useFlowchartStore.getState();
    
    // Shift+click for multi-select
    if (e.shiftKey) {
      const newSelection = s.selectedIds.includes(nodeId)
        ? s.selectedIds.filter(id => id !== nodeId)
        : [...s.selectedIds, nodeId];
      s.select(newSelection);
    } else if (!s.selectedIds.includes(nodeId)) {
      s.select([nodeId]);
    }

    s.pushHistory();

    // Build drag state for all selected nodes (including newly clicked)
    const currentSelected = useFlowchartStore.getState().selectedIds;
    const dragNodeIds = currentSelected.includes(nodeId) ? currentSelected : [nodeId];
    const offsets: Record<string, { x: number; y: number }> = {};
    for (const id of dragNodeIds) {
      const n = s.nodes.find(n => n.id === id);
      if (n) offsets[id] = { x: n.x, y: n.y };
    }
    const pos = screenToCanvas(e.clientX, e.clientY);
    dragStartPos.current = pos;
    setDragState({ nodeIds: dragNodeIds, offsets });
  };

  const handlePortMouseDown = (nodeId: string, port: PortDirection, e: React.MouseEvent) => {
    e.stopPropagation();
    setConnectState({ sourceNodeId: nodeId, sourcePort: port, mouseX: e.clientX, mouseY: e.clientY });
  };

  const handleEdgeClick = (edgeId: string, e: React.MouseEvent) => {
    if (e.shiftKey) {
      const s = useFlowchartStore.getState();
      const newSelection = s.selectedIds.includes(edgeId)
        ? s.selectedIds.filter(id => id !== edgeId)
        : [...s.selectedIds, edgeId];
      s.select(newSelection);
    } else {
      store.select([edgeId]);
    }
  };

  // Temp connection line
  let tempLine: React.ReactNode = null;
  if (connectState) {
    const sn = nodes.find(n => n.id === connectState.sourceNodeId);
    if (sn) {
      const start = getPortPosition(sn, connectState.sourcePort);
      const end = screenToCanvas(connectState.mouseX, connectState.mouseY);
      tempLine = <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="hsl(280,70%,35%)" strokeWidth={2} strokeDasharray="6 4" />;
    }
  }

  const cursorStyle = spaceRef.current || panState ? 'grabbing' : 'default';

  return (
    <div className="flex-1 overflow-hidden relative" style={{ background: 'hsl(216,30%,95%)' }} onDragOver={handleDragOver} onDrop={handleDrop}>
      <svg
        ref={svgRef}
        className="w-full h-full flowchart-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: cursorStyle }}
      >
        <defs>
          {canvas.grid.enabled && (
            <pattern id="grid" width={canvas.grid.size} height={canvas.grid.size} patternUnits="userSpaceOnUse" patternTransform={`translate(${canvas.offset.x},${canvas.offset.y}) scale(${canvas.zoom})`}>
              <circle cx={canvas.grid.size / 2} cy={canvas.grid.size / 2} r={0.8} fill="hsl(220,15%,78%)" className="grid-dot" />
            </pattern>
          )}
          <marker id="arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 Z" fill="#6A1B9A" />
          </marker>
          <marker id="arrowhead-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 10 0 L 0 5 L 10 10 Z" fill="#6A1B9A" />
          </marker>
        </defs>

        {canvas.grid.enabled && <rect className="canvas-bg grid-bg" width="100%" height="100%" fill="url(#grid)" />}

        <g transform={`translate(${canvas.offset.x},${canvas.offset.y}) scale(${canvas.zoom})`}>
          {edges.map(edge => (
            <EdgeLine key={edge.id} edge={edge} nodes={nodes} selected={selectedIds.includes(edge.id)} onClick={handleEdgeClick} />
          ))}
          {nodes.map(node => (
            <ShapeNode
              key={node.id}
              node={node}
              selected={selectedIds.includes(node.id)}
              hovered={hoveredNodeId === node.id}
              editing={editingNodeId === node.id}
              onMouseDown={handleNodeMouseDown}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              onPortMouseDown={handlePortMouseDown}
              onDoubleClick={() => setEditingNodeId(node.id)}
              onEditDone={(label) => { store.updateNodeLabel(node.id, label); setEditingNodeId(null); }}
            />
          ))}
          {tempLine}
          {marqueeState && (() => {
            const x = Math.min(marqueeState.startX, marqueeState.currentX);
            const y = Math.min(marqueeState.startY, marqueeState.currentY);
            const w = Math.abs(marqueeState.currentX - marqueeState.startX);
            const h = Math.abs(marqueeState.currentY - marqueeState.startY);
            return <rect x={x} y={y} width={w} height={h} fill="hsla(220, 80%, 60%, 0.1)" stroke="hsl(220, 80%, 60%)" strokeWidth={1} strokeDasharray="6 3" rx={2} />;
          })()}
        </g>
      </svg>

      <div className="absolute bottom-3 right-3 text-xs px-2 py-1 rounded bg-card/80 text-muted-foreground border border-border backdrop-blur-sm">
        {Math.round(canvas.zoom * 100)}%
      </div>
    </div>
  );
};
