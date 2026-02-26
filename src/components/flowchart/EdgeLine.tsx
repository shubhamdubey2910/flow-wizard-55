import React from 'react';
import { FlowEdge, FlowNode } from '@/types/flowchart';
import { getPortPosition, getManhattanRoute } from '@/utils/geometry';

interface Props {
  edge: FlowEdge;
  nodes: FlowNode[];
  selected: boolean;
  onClick: (id: string, e: React.MouseEvent) => void;
}

function getDashArray(pattern: string): string | undefined {
  if (pattern === 'dotted') return '4 4';
  if (pattern === 'dashed') return '8 4';
  return undefined;
}

export const EdgeLine: React.FC<Props> = ({ edge, nodes, selected, onClick }) => {
  const sourceNode = nodes.find(n => n.id === edge.source.nodeId);
  const targetNode = nodes.find(n => n.id === edge.target.nodeId);
  if (!sourceNode || !targetNode) return null;

  const start = getPortPosition(sourceNode, edge.source.port);
  const end = getPortPosition(targetNode, edge.target.port);

  let pathD: string;
  if (edge.type === 'elbow') {
    const pts = getManhattanRoute(start, end, edge.source.port, edge.target.port);
    pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  } else {
    pathD = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }

  const markerEnd = edge.style.arrowEnd !== 'none' ? 'url(#arrowhead)' : undefined;
  const markerStart = edge.style.arrowStart !== 'none' ? 'url(#arrowhead-start)' : undefined;
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;

  return (
    <g onClick={(e) => { e.stopPropagation(); onClick(edge.id, e); }} style={{ cursor: 'pointer' }}>
      <path d={pathD} fill="none" stroke="transparent" strokeWidth={14} />
      <path
        d={pathD}
        fill="none"
        stroke={selected ? '#4A148C' : edge.style.stroke}
        strokeWidth={selected ? edge.style.strokeWidth + 1 : edge.style.strokeWidth}
        strokeDasharray={getDashArray(edge.style.pattern)}
        markerEnd={markerEnd}
        markerStart={markerStart}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {edge.style.label && (
        <g>
          <rect x={midX - 18} y={midY - 12} width={36} height={18} rx={4} fill="white" fillOpacity={0.9} />
          <text x={midX} y={midY - 2} textAnchor="middle" fontSize={11} fill="#333" fontFamily="system-ui, sans-serif">{edge.style.label}</text>
        </g>
      )}
    </g>
  );
};
