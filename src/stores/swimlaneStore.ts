import { create } from 'zustand';
import { SwimlanePool, Lane, PoolOrientation, DEFAULT_LANE_COLORS, LANE_HEADER_H } from '@/types/swimlane';

let counter = 0;
const genId = (prefix: string) => `${prefix}-${Date.now()}-${++counter}`;

const createLane = (index: number): Lane => ({
  id: genId('lane'),
  index,
  title: `Lane ${index + 1}`,
  headerColor: '#F6F6F6',
  bodyColor: DEFAULT_LANE_COLORS[index % DEFAULT_LANE_COLORS.length],
  minSizePx: 150,
  sizePx: 180,
  collapsed: false,
});

interface SwimlaneStore {
  pools: SwimlanePool[];

  createPool: (orientation: PoolOrientation, x: number, y: number, laneCount?: number) => string;
  removePool: (poolId: string) => void;
  addLane: (poolId: string, atIndex?: number) => string | null;
  removeLane: (poolId: string, laneId: string) => void;
  updateLaneTitle: (poolId: string, laneId: string, title: string) => void;
  resizeLane: (poolId: string, laneId: string, sizePx: number) => void;
  reorderLane: (poolId: string, laneId: string, toIndex: number) => void;
  updatePoolProps: (poolId: string, props: Partial<SwimlanePool>) => void;
  updateLaneProps: (poolId: string, laneId: string, props: Partial<Lane>) => void;
  movePool: (poolId: string, x: number, y: number) => void;
  distributeEvenly: (poolId: string) => void;
  resizePoolCrossAxis: (poolId: string, size: number) => void;
  selectPool: (poolId: string | null) => void;
  selectLane: (poolId: string | null, laneId: string | null) => void;
  selectedPoolId: string | null;
  selectedLaneId: string | null;
}

export const useSwimlaneStore = create<SwimlaneStore>((set, get) => ({
  pools: [],
  selectedPoolId: null,
  selectedLaneId: null,

  selectPool: (poolId) => set({ selectedPoolId: poolId, selectedLaneId: null }),
  selectLane: (poolId, laneId) => set({ selectedPoolId: poolId, selectedLaneId: laneId }),

  createPool: (orientation, x, y, laneCount = 3) => {
    const id = genId('pool');
    const lanes: Lane[] = [];
    for (let i = 0; i < laneCount; i++) {
      lanes.push(createLane(i));
    }
    const pool: SwimlanePool = {
      id, x, y, orientation, lanes,
      headerVisible: true,
      borderColor: '#9E9E9E',
      laneDividerColor: '#D5D5D5',
      autoDistribute: false,
      crossAxisSize: orientation === 'horizontal' ? 700 : 500,
    };
    set(s => ({ pools: [...s.pools, pool], selectedPoolId: id }));
    return id;
  },

  removePool: (poolId) => set(s => ({
    pools: s.pools.filter(p => p.id !== poolId),
    selectedPoolId: s.selectedPoolId === poolId ? null : s.selectedPoolId,
    selectedLaneId: s.selectedPoolId === poolId ? null : s.selectedLaneId,
  })),

  addLane: (poolId, atIndex) => {
    let newLaneId: string | null = null;
    set(s => ({
      pools: s.pools.map(p => {
        if (p.id !== poolId) return p;
        const idx = atIndex ?? p.lanes.length;
        const lane = createLane(idx);
        newLaneId = lane.id;
        const lanes = [...p.lanes];
        lanes.splice(idx, 0, lane);
        // Reindex
        return { ...p, lanes: lanes.map((l, i) => ({ ...l, index: i })) };
      }),
    }));
    return newLaneId;
  },

  removeLane: (poolId, laneId) => set(s => ({
    pools: s.pools.map(p => {
      if (p.id !== poolId) return p;
      if (p.lanes.length <= 1) return p; // Keep at least 1 lane
      const lanes = p.lanes.filter(l => l.id !== laneId).map((l, i) => ({ ...l, index: i }));
      return { ...p, lanes };
    }),
  })),

  updateLaneTitle: (poolId, laneId, title) => set(s => ({
    pools: s.pools.map(p => p.id !== poolId ? p : {
      ...p, lanes: p.lanes.map(l => l.id !== laneId ? l : { ...l, title }),
    }),
  })),

  resizeLane: (poolId, laneId, sizePx) => set(s => ({
    pools: s.pools.map(p => p.id !== poolId ? p : {
      ...p, lanes: p.lanes.map(l => l.id !== laneId ? l : { ...l, sizePx: Math.max(l.minSizePx, sizePx) }),
    }),
  })),

  reorderLane: (poolId, laneId, toIndex) => set(s => ({
    pools: s.pools.map(p => {
      if (p.id !== poolId) return p;
      const lanes = [...p.lanes];
      const fromIdx = lanes.findIndex(l => l.id === laneId);
      if (fromIdx < 0) return p;
      const [moved] = lanes.splice(fromIdx, 1);
      lanes.splice(toIndex, 0, moved);
      return { ...p, lanes: lanes.map((l, i) => ({ ...l, index: i })) };
    }),
  })),

  updatePoolProps: (poolId, props) => set(s => ({
    pools: s.pools.map(p => p.id !== poolId ? p : { ...p, ...props }),
  })),

  updateLaneProps: (poolId, laneId, props) => set(s => ({
    pools: s.pools.map(p => p.id !== poolId ? p : {
      ...p, lanes: p.lanes.map(l => l.id !== laneId ? l : { ...l, ...props }),
    }),
  })),

  movePool: (poolId, x, y) => set(s => ({
    pools: s.pools.map(p => p.id !== poolId ? p : { ...p, x, y }),
  })),

  distributeEvenly: (poolId) => set(s => ({
    pools: s.pools.map(p => {
      if (p.id !== poolId) return p;
      const totalSize = p.lanes.reduce((sum, l) => sum + l.sizePx, 0);
      const evenSize = Math.max(120, Math.floor(totalSize / p.lanes.length));
      return { ...p, lanes: p.lanes.map(l => ({ ...l, sizePx: evenSize })) };
    }),
  })),

  resizePoolCrossAxis: (poolId, size) => set(s => ({
    pools: s.pools.map(p => p.id !== poolId ? p : { ...p, crossAxisSize: Math.max(200, size) }),
  })),
}));

/** Get the bounding rectangle of a specific lane within its pool (canvas coordinates) */
export function getLaneBounds(pool: SwimlanePool, lane: Lane) {
  const laneOffset = pool.lanes
    .filter(l => l.index < lane.index)
    .reduce((sum, l) => sum + (l.collapsed ? LANE_HEADER_H : l.sizePx), 0);

  if (pool.orientation === 'horizontal') {
    return {
      x: pool.x,
      y: pool.y + laneOffset,
      w: pool.crossAxisSize,
      h: lane.collapsed ? LANE_HEADER_H : lane.sizePx,
    };
  } else {
    return {
      x: pool.x + laneOffset,
      y: pool.y,
      w: lane.collapsed ? LANE_HEADER_H : lane.sizePx,
      h: pool.crossAxisSize,
    };
  }
}

/** Find which lane a point falls within */
export function hitTestLane(pools: SwimlanePool[], px: number, py: number): { poolId: string; laneId: string } | null {
  for (const pool of pools) {
    for (const lane of pool.lanes) {
      const b = getLaneBounds(pool, lane);
      if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) {
        return { poolId: pool.id, laneId: lane.id };
      }
    }
  }
  return null;
}
