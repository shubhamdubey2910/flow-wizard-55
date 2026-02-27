import React from 'react';
import { ShapeType } from '@/types/flowchart';
import { renderShape } from './ShapeNode';
import { Type } from 'lucide-react';

const shapes: { type: ShapeType; label: string }[] = [
  { type: 'text', label: 'Text' },
  { type: 'terminator', label: 'Start / End' },
  { type: 'process', label: 'Process' },
  { type: 'decision', label: 'Decision' },
  { type: 'manual', label: 'Manual Operation' },
  { type: 'preparation', label: 'Preparation' },
  { type: 'sort', label: 'Sort' },
  { type: 'merge', label: 'Merge' },
  { type: 'documents', label: 'Documents' },
  { type: 'output', label: 'Output' },
  { type: 'database', label: 'Database' },
  { type: 'cloud', label: 'Cloud' },
  { type: 'exception', label: 'Exception / Error' },
];

export const Palette: React.FC = () => {
  const handleDragStart = (e: React.DragEvent, type: ShapeType) => {
    e.dataTransfer.setData('shapeType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="w-56 bg-card border-r border-border flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground tracking-wide">Shapes</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {shapes.map(({ type, label }) => (
          <div
            key={type}
            draggable
            onDragStart={(e) => handleDragStart(e, type)}
            className="flex items-center gap-3 px-3 py-2 rounded-md cursor-grab hover:bg-accent transition-colors active:cursor-grabbing group"
          >
            {type === 'text' ? (
              <div className="w-10 h-7 flex items-center justify-center flex-shrink-0">
                <Type className="h-5 w-5 text-primary" />
              </div>
            ) : (
              <svg width={40} height={28} viewBox="0 0 40 28" className="flex-shrink-0">
                {renderShape(type, 40, 28, '#F3E8FF', '#6A1B9A', 1.5)}
              </svg>
            )}
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors truncate">{label}</span>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Drag shapes onto the canvas. Connect by dragging between ports. Shift+click to multi-select.
        </p>
      </div>
    </div>
  );
};
