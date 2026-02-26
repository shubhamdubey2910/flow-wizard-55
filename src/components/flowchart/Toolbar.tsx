import React from 'react';
import { Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, LayoutGrid, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFlowchartStore } from '@/stores/flowchartStore';

export const Toolbar: React.FC = () => {
  const { canvas, past, future, undo, redo, setZoom, setOffset, toggleGrid, exportJSON, importJSON } = useFlowchartStore();

  const handleExport = () => {
    const json = exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'flowchart.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) importJSON(await file.text());
    };
    input.click();
  };

  return (
    <div className="h-11 bg-card border-b border-border flex items-center px-4 gap-0.5 flex-shrink-0">
      <div className="flex items-center gap-2 mr-4">
        <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
          <span className="text-primary-foreground text-[10px] font-bold">F</span>
        </div>
        <span className="text-sm font-semibold text-foreground">Flowchart</span>
      </div>

      <div className="h-5 w-px bg-border mx-1" />

      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undo} disabled={!past.length} title="Undo (⌘Z)">
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={redo} disabled={!future.length} title="Redo (⌘⇧Z)">
        <Redo2 className="h-4 w-4" />
      </Button>

      <div className="h-5 w-px bg-border mx-1" />

      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(Math.min(5, canvas.zoom * 1.25))} title="Zoom In">
        <ZoomIn className="h-4 w-4" />
      </Button>
      <span className="text-xs text-muted-foreground w-10 text-center tabular-nums">{Math.round(canvas.zoom * 100)}%</span>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(Math.max(0.1, canvas.zoom / 1.25))} title="Zoom Out">
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} title="Fit">
        <Maximize2 className="h-4 w-4" />
      </Button>

      <div className="h-5 w-px bg-border mx-1" />

      <Button variant="ghost" size="icon" className={`h-8 w-8 ${canvas.grid.enabled ? 'bg-accent' : ''}`} onClick={toggleGrid} title="Toggle Grid">
        <LayoutGrid className="h-4 w-4" />
      </Button>

      <div className="flex-1" />

      <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5" onClick={handleImport}>
        <Upload className="h-3.5 w-3.5" /> Import
      </Button>
      <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExport}>
        <Download className="h-3.5 w-3.5" /> Export
      </Button>
    </div>
  );
};
