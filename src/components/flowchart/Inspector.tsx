import React from 'react';
import { useFlowchartStore } from '@/stores/flowchartStore';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';

const COLOR_SWATCHES = [
  '#FFFFFF', '#000000', '#9CA3AF',
  '#EF4444', '#F97316', '#EAB308',
  '#22C55E', '#3B82F6', '#6A1B9A',
];

const ColorSwatchPicker: React.FC<{ value: string; onChange: (color: string) => void }> = ({ value, onChange }) => (
  <div className="flex flex-wrap gap-1.5">
    {COLOR_SWATCHES.map(c => (
      <button
        key={c}
        onClick={() => onChange(c)}
        className="w-6 h-6 rounded border border-border cursor-pointer flex items-center justify-center hover:scale-110 transition-transform"
        style={{ backgroundColor: c }}
        title={c}
      >
        {value.toUpperCase() === c.toUpperCase() && (
          <Check className="h-3 w-3" style={{ color: ['#FFFFFF', '#EAB308', '#F97316'].includes(c) ? '#000' : '#FFF' }} />
        )}
      </button>
    ))}
  </div>
);

export const Inspector: React.FC = () => {
  const { nodes, edges, selectedIds, canvas, toggleGrid, updateNodeLabel, updateNodeStyle, updateEdgeStyle, updateEdgeType } = useFlowchartStore();

  const selectedNode = nodes.find(n => selectedIds.includes(n.id));
  const selectedEdge = edges.find(e => selectedIds.includes(e.id));

  const adjustFontSize = (delta: number) => {
    if (!selectedNode) return;
    const newSize = Math.max(8, Math.min(48, selectedNode.style.fontSize + delta));
    updateNodeStyle(selectedNode.id, { fontSize: newSize });
  };

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
              <Textarea
                value={selectedNode.label}
                onChange={e => updateNodeLabel(selectedNode.id, e.target.value)}
                className="min-h-[60px] text-sm resize-y"
                placeholder="Enter label text…"
                rows={Math.max(2, selectedNode.label.split('\n').length)}
              />
              <span className="text-[10px] text-muted-foreground">Enter for newline</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Font Size</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => adjustFontSize(-1)}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-sm font-medium w-10 text-center tabular-nums">{selectedNode.style.fontSize}px</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => adjustFontSize(1)}>
                  <Plus className="h-3 w-3" />
                </Button>
                <input type="range" min={8} max={48} value={selectedNode.style.fontSize} onChange={e => updateNodeStyle(selectedNode.id, { fontSize: +e.target.value })} className="flex-1 accent-primary" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fill</Label>
              <ColorSwatchPicker value={selectedNode.style.fill} onChange={c => updateNodeStyle(selectedNode.id, { fill: c })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Stroke</Label>
              <ColorSwatchPicker value={selectedNode.style.stroke} onChange={c => updateNodeStyle(selectedNode.id, { stroke: c })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Stroke Width</Label>
              <input type="range" min={1} max={6} value={selectedNode.style.strokeWidth} onChange={e => updateNodeStyle(selectedNode.id, { strokeWidth: +e.target.value })} className="w-full accent-primary" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Text Color</Label>
              <ColorSwatchPicker value={selectedNode.style.textColor} onChange={c => updateNodeStyle(selectedNode.id, { textColor: c })} />
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
              <ColorSwatchPicker value={selectedEdge.style.stroke} onChange={c => updateEdgeStyle(selectedEdge.id, { stroke: c })} />
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
                <span>Multi-select</span><span className="text-right">Shift+click</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
