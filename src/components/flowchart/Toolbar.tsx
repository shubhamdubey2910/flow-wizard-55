import React, { useState, useRef, useEffect } from 'react';
import { Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, LayoutGrid, Download, Upload, ChevronDown, Rows3, MousePointer2, Slash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFlowchartStore } from '@/stores/flowchartStore';
import { useSwimlaneStore } from '@/stores/swimlaneStore';

const getSvgElement = (): SVGSVGElement | null => document.querySelector('svg.flowchart-canvas');

const getContentBounds = () => {
  const { nodes } = useFlowchartStore.getState();
  if (!nodes.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.w);
    maxY = Math.max(maxY, n.y + n.h);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

const rasterize = (svgEl: SVGSVGElement, format: 'png' | 'jpeg'): Promise<Blob> => {
  return new Promise(async (resolve, reject) => {
    const bounds = getContentBounds();
    if (!bounds) return reject('No content');

    const pad = 60;
    const w = Math.ceil(bounds.width + pad * 2);
    const h = Math.ceil(bounds.height + pad * 2);
    const scale = 2;

    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    const gridBg = clone.querySelector('.grid-bg');
    if (gridBg) gridBg.remove();
    const gridPattern = clone.querySelector('#grid');
    if (gridPattern) gridPattern.remove();
    clone.querySelectorAll('[stroke-dasharray="5 3"]').forEach(el => el.remove());

    clone.setAttribute('viewBox', `${bounds.x - pad} ${bounds.y - pad} ${w} ${h}`);
    clone.setAttribute('width', String(w * scale));
    clone.setAttribute('height', String(h * scale));
    const contentG = clone.querySelector('g[transform]');
    if (contentG) contentG.removeAttribute('transform');

    const svgStr = new XMLSerializer().serializeToString(clone);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject('Failed'), `image/${format}`, 0.95);
    };
    img.onerror = reject;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
  });
};

const downloadBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
};

export const Toolbar: React.FC = () => {
  const { canvas, past, future, activeTool, undo, redo, setZoom, setOffset, toggleGrid, importJSON, setActiveTool } = useFlowchartStore();
  const swimlaneStore = useSwimlaneStore();
  const [showMenu, setShowMenu] = useState(false);
  const [showSwimMenu, setShowSwimMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const swimMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
      if (swimMenuRef.current && !swimMenuRef.current.contains(e.target as Node)) setShowSwimMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleExport = async (format: 'png' | 'jpg' | 'pdf') => {
    setShowMenu(false);
    const svgEl = getSvgElement();
    if (!svgEl) return;

    if (format === 'png' || format === 'jpg') {
      const blob = await rasterize(svgEl, format === 'jpg' ? 'jpeg' : 'png');
      downloadBlob(blob, `flowchart.${format}`);
    } else {
      const { jsPDF } = await import('jspdf');
      const blob = await rasterize(svgEl, 'png');
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const w = img.width / 2;
        const h = img.height / 2;
        const pdf = new jsPDF({ orientation: w > h ? 'landscape' : 'portrait', unit: 'px', format: [w + 40, h + 40] });
        pdf.addImage(url, 'PNG', 20, 20, w, h);
        pdf.save('flowchart.pdf');
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
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

  const handleInsertSwimlane = (orientation: 'horizontal' | 'vertical') => {
    setShowSwimMenu(false);
    swimlaneStore.createPool(orientation, 100, 100, 3);
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

      <div className="h-5 w-px bg-border mx-1" />

      {/* Tool selection */}
      <Button variant="ghost" size="icon" className={`h-8 w-8 ${activeTool === 'select' ? 'bg-accent' : ''}`} onClick={() => setActiveTool('select')} title="Select (V)">
        <MousePointer2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className={`h-8 w-8 ${activeTool === 'line' ? 'bg-accent' : ''}`} onClick={() => setActiveTool('line')} title="Draw Line">
        <Slash className="h-4 w-4" />
      </Button>

      <div className="h-5 w-px bg-border mx-1" />

      {/* Swimlane insert */}
      <div className="relative" ref={swimMenuRef}>
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => setShowSwimMenu(!showSwimMenu)} title="Insert Swimlane (L)">
          <Rows3 className="h-3.5 w-3.5" /> Swimlane <ChevronDown className="h-3 w-3" />
        </Button>
        {showSwimMenu && (
          <div className="absolute left-0 top-full mt-1 bg-popover border border-border rounded-md shadow-md py-1 z-50 min-w-[160px]">
            <button className="w-full text-left px-3 py-1.5 text-xs text-popover-foreground hover:bg-accent transition-colors" onClick={() => handleInsertSwimlane('horizontal')}>
              Horizontal (rows)
            </button>
            <button className="w-full text-left px-3 py-1.5 text-xs text-popover-foreground hover:bg-accent transition-colors" onClick={() => handleInsertSwimlane('vertical')}>
              Vertical (columns)
            </button>
          </div>
        )}
      </div>

      <div className="flex-1" />

      <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5" onClick={handleImport}>
        <Upload className="h-3.5 w-3.5" /> Import
      </Button>

      <div className="relative" ref={menuRef}>
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => setShowMenu(!showMenu)}>
          <Download className="h-3.5 w-3.5" /> Download <ChevronDown className="h-3 w-3" />
        </Button>
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-md shadow-md py-1 z-50 min-w-[120px]">
            <button className="w-full text-left px-3 py-1.5 text-xs text-popover-foreground hover:bg-accent transition-colors" onClick={() => handleExport('png')}>PNG</button>
            <button className="w-full text-left px-3 py-1.5 text-xs text-popover-foreground hover:bg-accent transition-colors" onClick={() => handleExport('jpg')}>JPG</button>
            <button className="w-full text-left px-3 py-1.5 text-xs text-popover-foreground hover:bg-accent transition-colors" onClick={() => handleExport('pdf')}>PDF</button>
          </div>
        )}
      </div>
    </div>
  );
};
