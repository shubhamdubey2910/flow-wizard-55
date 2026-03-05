import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFlowchartStore } from '@/stores/flowchartStore';
import { useSwimlaneStore, hitTestLane, getLaneBounds } from '@/stores/swimlaneStore';
import { ShapeNode, ResizeHandle } from './ShapeNode';
import { EdgeLine } from './EdgeLine';
import { SwimlaneRenderer } from './SwimlaneRenderer';
import { getPortPosition, applyResize, computeSmartGuides, SmartGuide } from '@/utils/geometry';
import { PortDirection, ShapeType } from '@/types/flowchart';

interface DragState { nodeIds: string[]; offsets: Record<string, { x: number; y: number }>; }
interface ConnectState { sourceNodeId: string; sourcePort: PortDirection; mouseX: number; mouseY: number; }
interface PanState { startX: number; startY: number; offsetX: number; offsetY: number; }
interface MarqueeState { startX: number; startY: number; currentX: number; currentY: number; }
interface ResizeState {
  nodeId: string; handle: ResizeHandle;
  startX: number; startY: number;
  orig: { x: number; y: number; w: number; h: number };
  shiftKey: boolean;
}
interface PoolDragState { poolId: string; offsetX: number; offsetY: number; }
interface LaneDividerDragState { poolId: string; laneId: string; startPos: number; origSize: number; }
interface PoolResizeState { poolId: string; startPos: number; origSize: number; }

export const Canvas: React.FC = () => {
  const store = useFlowchartStore();
  const { nodes, edges, selectedIds, canvas } = store;
  const swimlaneStore = useSwimlaneStore();
  const { pools } = swimlaneStore;
  const svgRef = useRef<SVGSVGElement>(null);
  const spaceRef = useRef(false);
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [connectState, setConnectState] = useState<ConnectState | null>(null);
  const [panState, setPanState] = useState<PanState | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [marqueeState, setMarqueeState] = useState<MarqueeState | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [smartGuides, setSmartGuides] = useState<SmartGuide[]>([]);
  const [poolDragState, setPoolDragState] = useState<PoolDragState | null>(null);
  const [laneDividerDrag, setLaneDividerDrag] = useState<LaneDividerDragState | null>(null);
  const [poolResizeState, setPoolResizeState] = useState<PoolResizeState | null>(null);

  const screenToCanvas = useCallback((cx: number, cy: number) => {
    const { canvas: c } = useFlowchartStore.getState();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (cx - rect.left - c.offset.x) / c.zoom, y: (cy - rect.top - c.offset.y) / c.zoom };
  }, []);

  // Track mouse position for paste
  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    const pos = screenToCanvas(e.clientX, e.clientY);
    lastMousePosRef.current = pos;
  }, [screenToCanvas]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener('mousemove', handleGlobalMouseMove as any);
    return () => svg.removeEventListener('mousemove', handleGlobalMouseMove as any);
  }, [handleGlobalMouseMove]);

  // Wheel zoom
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
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyA') {
        e.preventDefault();
        const s = useFlowchartStore.getState();
        s.select([...s.nodes.map(n => n.id), ...s.edges.map(ed => ed.id)]);
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC') { e.preventDefault(); useFlowchartStore.getState().copySelected(); }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyX') { e.preventDefault(); useFlowchartStore.getState().cutSelected(); }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') {
        e.preventDefault();
        useFlowchartStore.getState().pasteClipboard(lastMousePosRef.current || undefined);
      }
      // L = add swimlane
      if (e.code === 'KeyL' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const sStore = useSwimlaneStore.getState();
        if (e.shiftKey && sStore.selectedPoolId) {
          // Toggle orientation
          const pool = sStore.pools.find(p => p.id === sStore.selectedPoolId);
          if (pool) {
            sStore.updatePoolProps(pool.id, {
              orientation: pool.orientation === 'horizontal' ? 'vertical' : 'horizontal',
            });
          }
        } else {
          const pos = lastMousePosRef.current || { x: 100, y: 100 };
          sStore.createPool('horizontal', pos.x - 50, pos.y - 50, 3);
        }
      }
    };
    const onUp = (e: KeyboardEvent) => { if (e.code === 'Space') spaceRef.current = false; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, []);

  // --- Mouse handlers ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (spaceRef.current || e.button === 1 || e.button === 2) {
      setPanState({ startX: e.clientX, startY: e.clientY, offsetX: canvas.offset.x, offsetY: canvas.offset.y });
      return;
    }
    const target = e.target as SVGElement;
    const isBackground = target === svgRef.current || target.classList.contains('canvas-bg');
    if (isBackground && e.button === 0) {
      store.clearSelection();
      swimlaneStore.selectPool(null);
      setEditingNodeId(null);
      const pos = screenToCanvas(e.clientX, e.clientY);
      setMarqueeState({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y });
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => { e.preventDefault(); };

  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (panState) {
      useFlowchartStore.getState().setOffset({
        x: panState.offsetX + e.clientX - panState.startX,
        y: panState.offsetY + e.clientY - panState.startY,
      });
      return;
    }
    if (poolResizeState) {
      const isH = !!pools.find(p => p.id === poolResizeState.poolId && p.orientation === 'horizontal');
      const pos = screenToCanvas(e.clientX, e.clientY);
      const pool = pools.find(p => p.id === poolResizeState.poolId);
      if (pool) {
        const delta = isH
          ? (pos.x - pool.x) - poolResizeState.origSize
          : (pos.y - pool.y) - poolResizeState.origSize;
        useSwimlaneStore.getState().resizePoolCrossAxis(
          poolResizeState.poolId,
          poolResizeState.origSize + delta
        );
      }
      return;
    }
    if (laneDividerDrag) {
      const pos = screenToCanvas(e.clientX, e.clientY);
      const pool = pools.find(p => p.id === laneDividerDrag.poolId);
      if (pool) {
        const lane = pool.lanes.find(l => l.id === laneDividerDrag.laneId);
        if (lane) {
          const b = getLaneBounds(pool, lane);
          const isH = pool.orientation === 'horizontal';
          // Calculate new size based on current mouse position relative to lane start
          const newSize = isH
            ? pos.y - b.y
            : pos.x - b.x;
          useSwimlaneStore.getState().resizeLane(
            laneDividerDrag.poolId,
            laneDividerDrag.laneId,
            newSize
          );
        }
      }
      return;
    }
    if (poolDragState) {
      const pos = screenToCanvas(e.clientX, e.clientY);
      useSwimlaneStore.getState().movePool(
        poolDragState.poolId,
        pos.x - poolDragState.offsetX,
        pos.y - poolDragState.offsetY
      );
      return;
    }
    if (resizeState) {
      const dx = (e.clientX - resizeState.startX) / canvas.zoom;
      const dy = (e.clientY - resizeState.startY) / canvas.zoom;
      const shiftKey = e.shiftKey || resizeState.shiftKey;
      const proposed = applyResize(resizeState.handle, dx, dy, resizeState.orig, shiftKey);

      const otherNodes = nodes.filter(n => n.id !== resizeState.nodeId);
      const { guides, snapDx, snapDy } = computeSmartGuides(proposed, otherNodes, 6);
      proposed.x += snapDx;
      proposed.w -= (['w', 'nw', 'sw'].includes(resizeState.handle) ? -snapDx : snapDx);
      proposed.y += snapDy;
      proposed.h -= (['n', 'nw', 'ne'].includes(resizeState.handle) ? -snapDy : snapDy);

      setSmartGuides(guides);
      useFlowchartStore.getState().resizeNode(resizeState.nodeId, proposed.x, proposed.y, Math.max(40, proposed.w), Math.max(30, proposed.h));
      return;
    }
    if (dragState && dragStartPos.current) {
      const pos = screenToCanvas(e.clientX, e.clientY);
      const s = useFlowchartStore.getState();
      let dx = pos.x - dragStartPos.current.x;
      let dy = pos.y - dragStartPos.current.y;
      if (e.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) { dy = 0; } else { dx = 0; }
      }
      // Batch move all nodes atomically to preserve relative positions (prevents straight connectors from flickering to elbow)
      const moves = dragState.nodeIds
        .filter(id => dragState.offsets[id])
        .map(id => ({ id, x: dragState.offsets[id].x + dx, y: dragState.offsets[id].y + dy }));
      s.moveNodes(moves);
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
    if (laneDividerDrag) { setLaneDividerDrag(null); return; }
    if (poolResizeState) { setPoolResizeState(null); return; }
    if (poolDragState) { setPoolDragState(null); return; }
    if (resizeState) { setResizeState(null); setSmartGuides([]); return; }
    if (dragState) {
      // Check if nodes landed in a lane (node-lane assignment is informational for now)
      setDragState(null);
      dragStartPos.current = null;
      return;
    }
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

  // --- Touch handlers for pan ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      setPanState({ startX: t.clientX, startY: t.clientY, offsetX: canvas.offset.x, offsetY: canvas.offset.y });
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (panState && e.touches.length === 1) {
      const t = e.touches[0];
      useFlowchartStore.getState().setOffset({
        x: panState.offsetX + t.clientX - panState.startX,
        y: panState.offsetY + t.clientY - panState.startY,
      });
    }
  };
  const handleTouchEnd = () => { setPanState(null); };

  // --- Drag & Drop from palette ---
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('shapeType');
    if (!type) return;
    const pos = screenToCanvas(e.clientX, e.clientY);
    store.addNode(type as ShapeType, pos.x, pos.y);
  };

  // --- Node interaction ---
  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const s = useFlowchartStore.getState();
    if (e.shiftKey) {
      const newSelection = s.selectedIds.includes(nodeId)
        ? s.selectedIds.filter(id => id !== nodeId)
        : [...s.selectedIds, nodeId];
      s.select(newSelection);
    } else if (!s.selectedIds.includes(nodeId)) {
      s.select([nodeId]);
    }
    swimlaneStore.selectPool(null); // Deselect pool when clicking a node
    s.pushHistory();
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

  const handleResizeStart = (nodeId: string, handle: ResizeHandle, e: React.MouseEvent) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    useFlowchartStore.getState().pushHistory();
    setResizeState({
      nodeId, handle,
      startX: e.clientX, startY: e.clientY,
      orig: { x: node.x, y: node.y, w: node.w, h: node.h },
      shiftKey: e.shiftKey,
    });
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

  const handleEditDone = (nodeId: string, label: string) => {
    const node = nodes.find(n => n.id === nodeId);
    store.updateNodeLabel(nodeId, label);
    if (node) {
      const lines = label.split('\n');
      const lineHeight = node.style.fontSize * 1.4;
      const neededH = Math.max(30, lines.length * lineHeight + 20);
      if (neededH > node.h) {
        store.resizeNode(nodeId, node.x, node.y, node.w, neededH);
      }
    }
    setEditingNodeId(null);
  };

  // Swimlane handlers
  const handleLaneHeaderClick = (poolId: string, laneId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    store.clearSelection();
    swimlaneStore.selectLane(poolId, laneId);
  };

  const handlePoolMouseDown = (poolId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    store.clearSelection();
    swimlaneStore.selectPool(poolId);
    const pool = pools.find(p => p.id === poolId);
    if (!pool) return;
    const pos = screenToCanvas(e.clientX, e.clientY);
    setPoolDragState({ poolId, offsetX: pos.x - pool.x, offsetY: pos.y - pool.y });
  };

  const handleAddLane = (poolId: string) => {
    swimlaneStore.addLane(poolId);
  };

  const handleLaneDividerMouseDown = (poolId: string, laneId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLaneDividerDrag({ poolId, laneId, startPos: 0, origSize: 0 });
  };

  const handlePoolEdgeResize = (poolId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const pool = pools.find(p => p.id === poolId);
    if (!pool) return;
    setPoolResizeState({ poolId, startPos: 0, origSize: pool.crossAxisSize });
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

  const cursorStyle = panState ? 'grabbing' : spaceRef.current ? 'grab' : resizeState ? 'default' : 'default';
  const resizingNode = resizeState ? nodes.find(n => n.id === resizeState.nodeId) : null;

  return (
    <div className="flex-1 overflow-hidden relative" style={{ background: 'hsl(216,30%,95%)' }} onDragOver={handleDragOver} onDrop={handleDrop}>
      <svg
        ref={svgRef}
        className="w-full h-full flowchart-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: cursorStyle, touchAction: 'none' }}
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
        {!canvas.grid.enabled && <rect className="canvas-bg" width="100%" height="100%" fill="transparent" />}

        <g transform={`translate(${canvas.offset.x},${canvas.offset.y}) scale(${canvas.zoom})`}>
          {/* Swimlane pools (rendered behind nodes) */}
          {pools.map(pool => (
            <SwimlaneRenderer
              key={pool.id}
              pool={pool}
              selectedPoolId={swimlaneStore.selectedPoolId}
              selectedLaneId={swimlaneStore.selectedLaneId}
              onHeaderClick={handleLaneHeaderClick}
              onPoolMouseDown={handlePoolMouseDown}
              onAddLane={handleAddLane}
              onLaneDividerMouseDown={handleLaneDividerMouseDown}
              onPoolEdgeResize={handlePoolEdgeResize}
              onDropShape={(type, x, y) => store.addNode(type, x, y)}
            />
          ))}

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
              onEditDone={(label) => handleEditDone(node.id, label)}
              onResizeStart={handleResizeStart}
            />
          ))}
          {tempLine}

          {/* Smart guides */}
          {smartGuides.map((g, i) => (
            g.orientation === 'v'
              ? <line key={`sg-${i}`} x1={g.pos} y1={g.start} x2={g.pos} y2={g.end} stroke="hsl(210,100%,55%)" strokeWidth={0.7} strokeDasharray="4 2" />
              : <line key={`sg-${i}`} x1={g.start} y1={g.pos} x2={g.end} y2={g.pos} stroke="hsl(210,100%,55%)" strokeWidth={0.7} strokeDasharray="4 2" />
          ))}

          {/* Dimension tooltip during resize */}
          {resizingNode && (
            <g>
              <rect
                x={resizingNode.x + resizingNode.w / 2 - 32}
                y={resizingNode.y + resizingNode.h + 8}
                width={64} height={20} rx={4}
                fill="hsl(220,20%,20%)" fillOpacity={0.85}
              />
              <text
                x={resizingNode.x + resizingNode.w / 2}
                y={resizingNode.y + resizingNode.h + 22}
                textAnchor="middle" fill="white" fontSize={11} fontFamily="system-ui"
              >
                {Math.round(resizingNode.w)} × {Math.round(resizingNode.h)}
              </text>
            </g>
          )}

          {/* Marquee */}
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
