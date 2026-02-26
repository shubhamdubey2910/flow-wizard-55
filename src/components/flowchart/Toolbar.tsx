import React, { useState, useRef, useEffect } from 'react';
import { Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, LayoutGrid, Download, Upload, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFlowchartStore } from '@/stores/flowchartStore';

const getSvgElement = (): SVGSVGElement | null => document.querySelector('svg.flowchart-canvas');

const svgToDataUrl = (svgEl: SVGSVGElement): Promise<string> => {
  return new Promise((resolve) => {
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    // Get bounding box of content
    const bbox = svgEl.getBBox();
    const pad = 20;
    clone.setAttribute('viewBox', `${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${bbox.height + pad * 2}`);
    clone.setAttribute('width', String(Math.ceil(bbox.width + pad * 2)));
    clone.setAttribute('height', String(Math.ceil(bbox.height + pad * 2)));
    clone.style.background = '#ffffff';

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(clone);
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
    resolve(url);
  });
};

const rasterize = (svgEl: SVGSVGElement, format: 'png' | 'jpeg'): Promise<Blob> => {
  return new Promise(async (resolve, reject) => {
    const bbox = svgEl.getBBox();
    const pad = 20;
    const w = Math.ceil(bbox.width + pad * 2);
    const h = Math.ceil(bbox.height + pad * 2);
    const scale = 2;

    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('viewBox', `${bbox.x - pad} ${bbox.y - pad} ${w} ${h}`);
    clone.setAttribute('width', String(w * scale));
    clone.setAttribute('height', String(h * scale));

    const svgStr = new XMLSerializer().serializeToString(clone);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext('2d')!;
      if (format === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
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
  const { canvas, past, future, undo, redo, setZoom, setOffset, toggleGrid, importJSON } = useFlowchartStore();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
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
        const pdf = new jsPDF({ orientation: w > h ? 'landscape' : 'portrait', unit: 'px', format: [w, h] });
        pdf.addImage(url, 'PNG', 0, 0, w, h);
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
