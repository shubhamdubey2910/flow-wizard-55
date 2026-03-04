export type PoolOrientation = 'horizontal' | 'vertical';

export interface Lane {
  id: string;
  index: number;
  title: string;
  subTitle?: string;
  headerColor: string;
  bodyColor: string;
  minSizePx: number;
  sizePx: number; // actual current size (height for horizontal, width for vertical)
  collapsed: boolean;
}

export interface SwimlanePool {
  id: string;
  x: number;
  y: number;
  orientation: PoolOrientation;
  lanes: Lane[];
  headerVisible: boolean;
  borderColor: string;
  laneDividerColor: string;
  autoDistribute: boolean;
  // Total width for horizontal pools, total height for vertical pools
  crossAxisSize: number;
}

// Header strip size constants
export const LANE_HEADER_H = 40;  // horizontal pool: header height at top of each lane
export const LANE_HEADER_W = 120; // vertical pool: header width at left of each lane
export const POOL_BORDER = 2;
export const LANE_DIVIDER = 1;

/** Default alternating lane body colors at 4% opacity tint */
export const DEFAULT_LANE_COLORS = [
  '#FFFFFF',
  '#F8F6FF',
  '#F6FBF8',
];
