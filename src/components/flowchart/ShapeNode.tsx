import React, { useState, useEffect } from 'react';
import { FlowNode, PortDirection } from '@/types/flowchart';

interface Props {
  node: FlowNode;
  selected: boolean;
  hovered: boolean;
  editing: boolean;
  onMouseDown: (id: string, e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onPortMouseDown: (nodeId: string, port: PortDirection, e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onEditDone: (label: string) => void;
}

function renderShape(type: string, w: number, h: number, fill: string, stroke: string, sw: number) {
  switch (type) {
    case 'terminator':
      return <rect width={w} height={h} rx={h / 2} fill={fill} stroke={stroke} strokeWidth={sw} />;
    case 'process':
      return <rect width={w} height={h} rx={4} fill={fill} stroke={stroke} strokeWidth={sw} />;
    case 'decision':
      return <polygon points={`${w/2},0 ${w},${h/2} ${w/2},${h} 0,${h/2}`} fill={fill} stroke={stroke} strokeWidth={sw} />;
    case 'manual':
      return <polygon points={`${w*0.1},0 ${w*0.9},0 ${w},${h} 0,${h}`} fill={fill} stroke={stroke} strokeWidth={sw} />;
    case 'preparation': {
      const ix = w * 0.15;
      return <polygon points={`${ix},0 ${w-ix},0 ${w},${h/2} ${w-ix},${h} ${ix},${h} 0,${h/2}`} fill={fill} stroke={stroke} strokeWidth={sw} />;
    }
    case 'sort':
      return <polygon points={`${w/2},0 ${w},${h} 0,${h}`} fill={fill} stroke={stroke} strokeWidth={sw} />;
    case 'merge':
      return <polygon points={`0,0 ${w},0 ${w/2},${h}`} fill={fill} stroke={stroke} strokeWidth={sw} />;
    case 'documents':
      return (
        <g>
          <rect x={8} y={0} width={w - 12} height={h - 12} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
          <rect x={4} y={6} width={w - 12} height={h - 12} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
          <rect x={0} y={12} width={w - 12} height={h - 12} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
        </g>
      );
    case 'output':
      return <polygon points={`${w*0.15},0 ${w},0 ${w*0.85},${h} 0,${h}`} fill={fill} stroke={stroke} strokeWidth={sw} />;
    case 'database': {
      const ry = h * 0.15;
      return (
        <g>
          <path d={`M 0 ${ry} L 0 ${h - ry} Q 0 ${h} ${w/2} ${h} Q ${w} ${h} ${w} ${h-ry} L ${w} ${ry}`} fill={fill} stroke={stroke} strokeWidth={sw} />
          <ellipse cx={w/2} cy={ry} rx={w/2} ry={ry} fill={fill} stroke={stroke} strokeWidth={sw} />
        </g>
      );
    }
    case 'cloud':
      return (
        <path
          d={`M ${w*0.2},${h*0.65} Q 0,${h*0.65} 0,${h*0.45} Q 0,${h*0.25} ${w*0.18},${h*0.2} Q ${w*0.2},0 ${w*0.42},${h*0.05} Q ${w*0.55},${h*-0.02} ${w*0.62},${h*0.12} Q ${w*0.75},0 ${w*0.88},${h*0.15} Q ${w},${h*0.18} ${w},${h*0.38} Q ${w},${h*0.55} ${w*0.85},${h*0.6} Q ${w*0.92},${h*0.78} ${w*0.72},${h*0.78} L ${w*0.28},${h*0.78} Q ${w*0.05},${h*0.78} ${w*0.2},${h*0.65} Z`}
          fill={fill} stroke={stroke} strokeWidth={sw}
        />
      );
    case 'exception': {
      const cx = w / 2, cy = h / 2;
      const outerR = Math.min(w, h) / 2;
      const innerR = outerR * 0.55;
      const pts = Array.from({ length: 16 }, (_, i) => {
        const r = i % 2 === 0 ? outerR : innerR;
        const a = (i * Math.PI * 2) / 16 - Math.PI / 2;
        return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
      }).join(' ');
      return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} />;
    }
    default:
      return <rect width={w} height={h} fill={fill} stroke={stroke} strokeWidth={sw} />;
  }
}

export { renderShape };

const portPositions = (w: number, h: number) => ({
  N: { x: w / 2, y: 0 },
  S: { x: w / 2, y: h },
  E: { x: w, y: h / 2 },
  W: { x: 0, y: h / 2 },
});

export const ShapeNode: React.FC<Props> = ({ node, selected, hovered, editing, onMouseDown, onMouseEnter, onMouseLeave, onPortMouseDown, onDoubleClick, onEditDone }) => {
  const [editText, setEditText] = useState(node.label);
  useEffect(() => { if (editing) setEditText(node.label); }, [editing, node.label]);

  const ports = portPositions(node.w, node.h);
  const { fill, stroke, strokeWidth, fontSize, textColor } = node.style;

  return (
    <g
      transform={`translate(${node.x},${node.y})`}
      onMouseDown={(e) => onMouseDown(node.id, e)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(); }}
      style={{ cursor: 'move' }}
    >
      {selected && (
        <rect x={-4} y={-4} width={node.w + 8} height={node.h + 8} fill="none" stroke="hsl(280,70%,35%)" strokeWidth={1.5} strokeDasharray="5 3" rx={6} opacity={0.7} />
      )}
      {renderShape(node.type, node.w, node.h, fill, stroke, strokeWidth)}
      {editing ? (
        <foreignObject x={4} y={node.h / 2 - 14} width={node.w - 8} height={28}>
          <input
            autoFocus
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onEditDone(editText); if (e.key === 'Escape') onEditDone(node.label); }}
            onBlur={() => onEditDone(editText)}
            className="w-full text-center bg-transparent outline-none ring-2 ring-primary rounded px-1"
            style={{ fontSize, color: textColor }}
          />
        </foreignObject>
      ) : (
        <text x={node.w / 2} y={node.h / 2} textAnchor="middle" dominantBaseline="central" fill={textColor} fontSize={fontSize} fontFamily="system-ui, sans-serif" style={{ pointerEvents: 'none', userSelect: 'none' }}>
          {node.label}
        </text>
      )}
      {(hovered || selected) && (['N', 'S', 'E', 'W'] as PortDirection[]).map(dir => (
        <circle
          key={dir}
          cx={ports[dir].x}
          cy={ports[dir].y}
          r={5}
          fill="white"
          stroke="hsl(280,70%,35%)"
          strokeWidth={2}
          style={{ cursor: 'crosshair' }}
          onMouseDown={(e) => { e.stopPropagation(); onPortMouseDown(node.id, dir, e); }}
        />
      ))}
    </g>
  );
};
