import React from 'react';
import { useFlowchartStore } from '@/stores/flowchartStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const Inspector: React.FC = () => {
  const { nodes, edges, selectedIds, canvas, toggleGrid, updateNodeLabel, updateNodeStyle, updateEdgeStyle, updateEdgeType } = useFlowchartStore();

  const selectedNode = nodes.find(n => selectedIds.includes(n.id));
  const selectedEdge = edges.find(e => selectedIds.includes(e.id));

  return (
    <div className="w-64 bg-card border-l border-border flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground tracking-wide">
          {selectedNode ? 'Shape' : selectedEdge ? 'Connector' : 'Canvas'}
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {selectedNode && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Label</Label>
              <Input value={selectedNode.label} onChange={e => updateNodeLabel(selectedNode.id, e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Fill</Label>
                <div className="relative">
                  <input type="color" value={selectedNode.style.fill} onChange={e => updateNodeStyle(selectedNode.id, { fill: e.target.value })} className="w-full h-8 rounded border border-border cursor-pointer" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Stroke</Label>
                <input type="color" value={selectedNode.style.stroke} onChange={e => updateNodeStyle(selectedNode.id, { stroke: e.target.value })} className="w-full h-8 rounded border border-border cursor-pointer" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Stroke Width</Label>
                <input type="range" min={1} max={6} value={selectedNode.style.strokeWidth} onChange={e => updateNodeStyle(selectedNode.id, { strokeWidth: +e.target.value })} className="w-full accent-primary" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Font Size</Label>
                <input type="range" min={10} max={24} value={selectedNode.style.fontSize} onChange={e => updateNodeStyle(selectedNode.id, { fontSize: +e.target.value })} className="w-full accent-primary" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Text Color</Label>
              <input type="color" value={selectedNode.style.textColor} onChange={e => updateNodeStyle(selectedNode.id, { textColor: e.target.value })} className="w-full h-8 rounded border border-border cursor-pointer" />
            </div>
          </>
        )}

        {selectedEdge && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <select value={selectedEdge.type} onChange={e => updateEdgeType(selectedEdge.id, e.target.value as any)} className="w-full h-8 rounded border border-border bg-background text-sm px-2">
                <option value="straight">Straight</option>
                <option value="elbow">Elbow</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Line Style</Label>
              <select value={selectedEdge.style.pattern} onChange={e => updateEdgeStyle(selectedEdge.id, { pattern: e.target.value as any })} className="w-full h-8 rounded border border-border bg-background text-sm px-2">
                <option value="solid">Solid</option>
                <option value="dotted">Dotted</option>
                <option value="dashed">Dashed</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Arrow Start</Label>
                <select value={selectedEdge.style.arrowStart} onChange={e => updateEdgeStyle(selectedEdge.id, { arrowStart: e.target.value as any })} className="w-full h-8 rounded border border-border bg-background text-sm px-2">
                  <option value="none">None</option>
                  <option value="triangle">Arrow</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Arrow End</Label>
                <select value={selectedEdge.style.arrowEnd} onChange={e => updateEdgeStyle(selectedEdge.id, { arrowEnd: e.target.value as any })} className="w-full h-8 rounded border border-border bg-background text-sm px-2">
                  <option value="none">None</option>
                  <option value="triangle">Arrow</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Stroke</Label>
              <input type="color" value={selectedEdge.style.stroke} onChange={e => updateEdgeStyle(selectedEdge.id, { stroke: e.target.value })} className="w-full h-8 rounded border border-border cursor-pointer" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Width</Label>
              <input type="range" min={1} max={6} value={selectedEdge.style.strokeWidth} onChange={e => updateEdgeStyle(selectedEdge.id, { strokeWidth: +e.target.value })} className="w-full accent-primary" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Label</Label>
              <Input value={selectedEdge.style.label} onChange={e => updateEdgeStyle(selectedEdge.id, { label: e.target.value })} className="h-8 text-sm" placeholder="e.g. Yes / No" />
            </div>
          </>
        )}

        {!selectedNode && !selectedEdge && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Grid</Label>
              <button onClick={toggleGrid} className={`w-full h-8 rounded border text-sm transition-colors ${canvas.grid.enabled ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-foreground hover:bg-accent'}`}>
                {canvas.grid.enabled ? 'Grid On' : 'Grid Off'}
              </button>
            </div>
            <div className="pt-4 text-xs text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Shortcuts</p>
              <div className="grid grid-cols-2 gap-y-1 gap-x-2">
                <span>Delete</span><span className="text-right">Del / ⌫</span>
                <span>Undo</span><span className="text-right">⌘Z</span>
                <span>Redo</span><span className="text-right">⌘⇧Z</span>
                <span>Pan</span><span className="text-right">Space + drag</span>
                <span>Zoom</span><span className="text-right">Scroll</span>
                <span>Edit text</span><span className="text-right">Double-click</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
