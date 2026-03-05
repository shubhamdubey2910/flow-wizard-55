import React from 'react';
import { SwimlanePool, LANE_HEADER_H, POOL_BORDER } from '@/types/swimlane';
import { getLaneBounds } from '@/stores/swimlaneStore';

interface Props {
  pool: SwimlanePool;
  selectedPoolId: string | null;
  selectedLaneId: string | null;
  onHeaderClick: (poolId: string, laneId: string, e: React.MouseEvent) => void;
  onPoolMouseDown: (poolId: string, e: React.MouseEvent) => void;
  onAddLane: (poolId: string) => void;
  onLaneDividerMouseDown: (poolId: string, laneId: string, e: React.MouseEvent) => void;
  onPoolEdgeResize: (poolId: string, e: React.MouseEvent) => void;
}

const RESIZE_HANDLE_SIZE = 10;

export const SwimlaneRenderer: React.FC<Props> = ({
  pool, selectedPoolId, selectedLaneId,
  onHeaderClick, onPoolMouseDown, onAddLane, onLaneDividerMouseDown, onPoolEdgeResize,
}) => {
  const isHorizontal = pool.orientation === 'horizontal';
  const totalMainAxis = pool.lanes.reduce((sum, l) => sum + (l.collapsed ? LANE_HEADER_H : l.sizePx), 0);
  const poolW = isHorizontal ? pool.crossAxisSize : totalMainAxis;
  const poolH = isHorizontal ? totalMainAxis : pool.crossAxisSize;
  const isPoolSelected = selectedPoolId === pool.id;

  return (
    <g>
      {/* Pool background */}
      <rect
        x={pool.x} y={pool.y}
        width={poolW} height={poolH}
        rx={6}
        fill="none"
        stroke={isPoolSelected ? 'hsl(280,70%,35%)' : pool.borderColor}
        strokeWidth={POOL_BORDER}
        style={{ cursor: 'move' }}
        onMouseDown={(e) => onPoolMouseDown(pool.id, e)}
      />

      {/* Lanes */}
      {pool.lanes.map((lane) => {
        const b = getLaneBounds(pool, lane);
        const isSelected = selectedLaneId === lane.id && selectedPoolId === pool.id;
        const isLastLane = lane.index === pool.lanes.length - 1;

        return (
          <g key={lane.id}>
            {/* Lane body */}
            <rect
              x={b.x} y={b.y}
              width={b.w} height={b.h}
              fill={lane.bodyColor}
              fillOpacity={0.5}
              stroke="none"
            />

            {/* Lane header strip */}
            {isHorizontal ? (
              <g>
                <rect
                  x={b.x} y={b.y}
                  width={b.w} height={LANE_HEADER_H}
                  fill={lane.headerColor}
                  fillOpacity={0.85}
                  stroke="none"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => onHeaderClick(pool.id, lane.id, e)}
                  role="button"
                  aria-expanded={!lane.collapsed}
                  aria-label={`Lane: ${lane.title}`}
                />
                <text
                  x={b.x + 16} y={b.y + LANE_HEADER_H / 2 + 4}
                  fontSize={12} fontWeight={600}
                  fill={isSelected ? 'hsl(280,70%,35%)' : '#333'}
                  fontFamily="system-ui, sans-serif"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {lane.title}
                </text>
                {lane.subTitle && (
                  <text
                    x={b.x + 16} y={b.y + LANE_HEADER_H / 2 + 16}
                    fontSize={10} fill="#888" fontFamily="system-ui, sans-serif"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {lane.subTitle}
                  </text>
                )}
                {isSelected && (
                  <rect
                    x={b.x} y={b.y}
                    width={b.w} height={LANE_HEADER_H}
                    fill="none" stroke="hsl(280,70%,35%)" strokeWidth={2} strokeDasharray="5 3"
                  />
                )}
              </g>
            ) : (
              <g>
                <rect
                  x={b.x} y={b.y}
                  width={LANE_HEADER_H} height={b.h}
                  fill={lane.headerColor}
                  fillOpacity={0.85}
                  stroke="none"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => onHeaderClick(pool.id, lane.id, e)}
                  role="button"
                  aria-expanded={!lane.collapsed}
                  aria-label={`Lane: ${lane.title}`}
                />
                <text
                  x={b.x + LANE_HEADER_H / 2} y={b.y + 20}
                  fontSize={12} fontWeight={600}
                  fill={isSelected ? 'hsl(280,70%,35%)' : '#333'}
                  fontFamily="system-ui, sans-serif"
                  textAnchor="middle" writingMode="vertical-rl"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {lane.title}
                </text>
                {isSelected && (
                  <rect
                    x={b.x} y={b.y}
                    width={LANE_HEADER_H} height={b.h}
                    fill="none" stroke="hsl(280,70%,35%)" strokeWidth={2} strokeDasharray="5 3"
                  />
                )}
              </g>
            )}

            {/* Lane divider — wide transparent hit target + visible line */}
            {!isLastLane && (
              isHorizontal ? (
                <g
                  style={{ cursor: 'row-resize' }}
                  onMouseDown={(e) => { e.stopPropagation(); onLaneDividerMouseDown(pool.id, lane.id, e); }}
                >
                  {/* Wide transparent hit area */}
                  <rect
                    x={b.x} y={b.y + b.h - 5}
                    width={b.w} height={10}
                    fill="transparent"
                  />
                  {/* Visible divider line */}
                  <line
                    x1={b.x} y1={b.y + b.h}
                    x2={b.x + b.w} y2={b.y + b.h}
                    stroke={pool.laneDividerColor}
                    strokeWidth={1}
                    style={{ pointerEvents: 'none' }}
                  />
                  {/* Hover highlight */}
                  <rect
                    x={b.x} y={b.y + b.h - 2}
                    width={b.w} height={4}
                    fill="hsl(280,70%,35%)"
                    fillOpacity={0}
                    className="divider-highlight"
                    style={{ pointerEvents: 'none' }}
                  >
                    <set attributeName="fill-opacity" to="0.3" begin="mouseover" end="mouseout" />
                  </rect>
                </g>
              ) : (
                <g
                  style={{ cursor: 'col-resize' }}
                  onMouseDown={(e) => { e.stopPropagation(); onLaneDividerMouseDown(pool.id, lane.id, e); }}
                >
                  <rect
                    x={b.x + b.w - 5} y={b.y}
                    width={10} height={b.h}
                    fill="transparent"
                  />
                  <line
                    x1={b.x + b.w} y1={b.y}
                    x2={b.x + b.w} y2={b.y + b.h}
                    stroke={pool.laneDividerColor}
                    strokeWidth={1}
                    style={{ pointerEvents: 'none' }}
                  />
                </g>
              )
            )}

            {/* Collapsed indicator */}
            {lane.collapsed && (
              <text
                x={isHorizontal ? b.x + b.w / 2 : b.x + LANE_HEADER_H / 2}
                y={isHorizontal ? b.y + LANE_HEADER_H / 2 + 4 : b.y + b.h / 2}
                textAnchor="middle" fontSize={10} fill="#999"
                fontFamily="system-ui, sans-serif"
                style={{ pointerEvents: 'none' }}
              >
                ▸ collapsed
              </text>
            )}
          </g>
        );
      })}

      {/* Pool cross-axis resize handle (right edge for horizontal, bottom edge for vertical) */}
      {isPoolSelected && (
        isHorizontal ? (
          <g
            style={{ cursor: 'col-resize' }}
            onMouseDown={(e) => onPoolEdgeResize(pool.id, e)}
          >
            <rect
              x={pool.x + poolW - 4} y={pool.y}
              width={8} height={poolH}
              fill="transparent"
            />
            {/* Visual handle dots */}
            <rect x={pool.x + poolW - 2} y={pool.y + poolH / 2 - 12} width={3} height={24} rx={1.5} fill="hsl(280,70%,35%)" fillOpacity={0.5} />
          </g>
        ) : (
          <g
            style={{ cursor: 'row-resize' }}
            onMouseDown={(e) => onPoolEdgeResize(pool.id, e)}
          >
            <rect
              x={pool.x} y={pool.y + poolH - 4}
              width={poolW} height={8}
              fill="transparent"
            />
            <rect x={pool.x + poolW / 2 - 12} y={pool.y + poolH - 2} width={24} height={3} rx={1.5} fill="hsl(280,70%,35%)" fillOpacity={0.5} />
          </g>
        )
      )}

      {/* Add lane button */}
      {isPoolSelected && (
        <g style={{ cursor: 'pointer' }} onClick={() => onAddLane(pool.id)}>
          {isHorizontal ? (
            <>
              <rect
                x={pool.x + poolW - 80} y={pool.y + poolH + 6}
                width={76} height={24} rx={4}
                fill="hsl(275,30%,94%)" stroke="hsl(280,70%,35%)" strokeWidth={1}
              />
              <text
                x={pool.x + poolW - 42} y={pool.y + poolH + 22}
                textAnchor="middle" fontSize={10} fontWeight={600}
                fill="hsl(280,70%,35%)" fontFamily="system-ui, sans-serif"
                style={{ pointerEvents: 'none' }}
              >
                + Add Lane
              </text>
            </>
          ) : (
            <>
              <rect
                x={pool.x + poolW + 6} y={pool.y + poolH - 80}
                width={24} height={76} rx={4}
                fill="hsl(275,30%,94%)" stroke="hsl(280,70%,35%)" strokeWidth={1}
              />
              <text
                x={pool.x + poolW + 18} y={pool.y + poolH - 42}
                textAnchor="middle" fontSize={10} fontWeight={600}
                fill="hsl(280,70%,35%)" fontFamily="system-ui, sans-serif"
                writingMode="vertical-rl"
                style={{ pointerEvents: 'none' }}
              >
                + Add
              </text>
            </>
          )}
        </g>
      )}
    </g>
  );
};
