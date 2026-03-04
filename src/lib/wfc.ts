export type SocketValue = string | string[];

export interface TileSockets {
    top: SocketValue;
    bottom: SocketValue;
    left: SocketValue;
    right: SocketValue;
}

export interface WFCTileDefinition {
    weight?: number;
    sockets: TileSockets;
}

function toSocketArray(s: SocketValue): string[] {
    return Array.isArray(s) ? s : [s];
}

function socketsCompatible(a: SocketValue, b: SocketValue): boolean {
    const arrA = toSocketArray(a);
    const arrB = toSocketArray(b);
    return arrA.some((v) => arrB.includes(v));
}

export interface WFCTile {
    id: string;
    name: string;
    imageUrl: string;
    definition: WFCTileDefinition;
}

export interface WFCCell {
    row: number;
    col: number;
    collapsed: boolean;
    tileId: string | null;
    possibilities: string[];
}

export interface WFCGrid {
    rows: number;
    cols: number;
    cells: WFCCell[][];
}

export function createGrid(rows: number, cols: number, tileIds: string[]): WFCGrid {
    const cells: WFCCell[][] = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => ({
            row: r,
            col: c,
            collapsed: false,
            tileId: null,
            possibilities: [...tileIds],
        }))
    );
    return { rows, cols, cells };
}

export const OPPOSITE_DIR: Record<'top' | 'bottom' | 'left' | 'right', keyof TileSockets> = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left',
};

function getCompatible(tiles: Map<string, WFCTile>, candidates: string[], direction: 'top' | 'bottom' | 'left' | 'right', currentTileId: string): string[] {
    const current = tiles.get(currentTileId);
    if (!current) return candidates;

    const currentFacingSocket = current.definition.sockets[direction];

    return candidates.filter((id) => {
        const t = tiles.get(id);
        if (!t) return false;
        return socketsCompatible(t.definition.sockets[OPPOSITE_DIR[direction]], currentFacingSocket);
    });
}

function propagate(grid: WFCGrid, tiles: Map<string, WFCTile>, startRow: number, startCol: number): boolean {
    const stack: [number, number][] = [[startRow, startCol]];
    const inStack = new Set<string>();
    inStack.add(`${startRow},${startCol}`);

    while (stack.length > 0) {
        const [row, col] = stack.pop()!;
        inStack.delete(`${row},${col}`);

        const cell = grid.cells[row][col];

        const neighbors: { dr: number; dc: number; dir: 'top' | 'bottom' | 'left' | 'right' }[] = [
            { dr: -1, dc: 0, dir: 'top' },
            { dr: 1, dc: 0, dir: 'bottom' },
            { dr: 0, dc: -1, dir: 'left' },
            { dr: 0, dc: 1, dir: 'right' },
        ];

        for (const { dr, dc, dir } of neighbors) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr < 0 || nr >= grid.rows || nc < 0 || nc >= grid.cols) continue;

            const neighbor = grid.cells[nr][nc];
            if (neighbor.collapsed) continue;

            let allowed: Set<string>;
            if (cell.collapsed && cell.tileId) {
                allowed = new Set(getCompatible(tiles, neighbor.possibilities, dir, cell.tileId));
            } else {
                allowed = new Set<string>();
                for (const possId of cell.possibilities) {
                    const compat = getCompatible(tiles, neighbor.possibilities, dir, possId);
                    for (const c of compat) allowed.add(c);
                }
            }

            const newPossibilities = neighbor.possibilities.filter((id) => allowed.has(id));

            if (newPossibilities.length === 0) {
                return false;
            }

            if (newPossibilities.length < neighbor.possibilities.length) {
                neighbor.possibilities = newPossibilities;
                const nKey = `${nr},${nc}`;
                if (!inStack.has(nKey)) {
                    inStack.add(nKey);
                    stack.push([nr, nc]);
                }
            }
        }
    }

    return true;
}

function entropy(cell: WFCCell): number {
    return cell.possibilities.length;
}

function pickWeightedRandom(possibilities: string[], tiles: Map<string, WFCTile>): string {
    const weights = possibilities.map((id) => tiles.get(id)?.definition.weight ?? 1);
    const total = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;
    for (let i = 0; i < possibilities.length; i++) {
        rand -= weights[i];
        if (rand <= 0) return possibilities[i];
    }
    return possibilities[possibilities.length - 1];
}

export interface WFCRunOptions {
    maxIterations?: number;
    onProgress?: (progress: number) => void;
}

export function runWFC(grid: WFCGrid, tiles: Map<string, WFCTile>, opts?: WFCRunOptions): boolean {
    const { maxIterations = grid.rows * grid.cols * 10, onProgress } = opts ?? {};

    const totalCells = grid.rows * grid.cols;
    let collapsed = 0;

    for (let iter = 0; iter < maxIterations; iter++) {
        const uncollapsed: WFCCell[] = [];
        for (let r = 0; r < grid.rows; r++) {
            for (let c = 0; c < grid.cols; c++) {
                if (!grid.cells[r][c].collapsed) {
                    uncollapsed.push(grid.cells[r][c]);
                }
            }
        }

        if (uncollapsed.length === 0) break;

        const minEnt = Math.min(...uncollapsed.map(entropy));
        const minCells = uncollapsed.filter((c) => entropy(c) === minEnt);

        const chosen = minCells[Math.floor(Math.random() * minCells.length)];

        if (chosen.possibilities.length === 0) {
            return false;
        }

        const chosen_tile = pickWeightedRandom(chosen.possibilities, tiles);
        chosen.collapsed = true;
        chosen.tileId = chosen_tile;
        chosen.possibilities = [chosen_tile];
        collapsed++;

        if (onProgress) onProgress(collapsed / totalCells);

        const ok = propagate(grid, tiles, chosen.row, chosen.col);
        if (!ok) return false;
    }

    const OPPOSING_DIR = OPPOSITE_DIR;
    const dirs = ['top', 'bottom', 'left', 'right'] as const;
    const offsets: Record<string, [number, number]> = { top: [-1, 0], bottom: [1, 0], left: [0, -1], right: [0, 1] };
    for (let r = 0; r < grid.rows; r++) {
        for (let c = 0; c < grid.cols; c++) {
            const cell = grid.cells[r][c];
            if (!cell.collapsed || !cell.tileId) continue;
            const tDef = tiles.get(cell.tileId)?.definition;
            if (!tDef) continue;
            for (const dir of dirs) {
                const [dr, dc] = offsets[dir];
                const nr = r + dr;
                const nc = c + dc;
                if (nr < 0 || nr >= grid.rows || nc < 0 || nc >= grid.cols) continue;
                const neighbor = grid.cells[nr][nc];
                if (!neighbor.collapsed || !neighbor.tileId) continue;
                const nDef = tiles.get(neighbor.tileId)?.definition;
                if (!nDef) continue;
                const mySocket = toSocketArray(tDef.sockets[dir]);
                const theirSocket = toSocketArray(nDef.sockets[OPPOSING_DIR[dir]]);
                if (!mySocket.some((v) => theirSocket.includes(v))) {
                    console.warn(
                        `[WFC] CONFLICT at (${r},${c}) ${tiles.get(cell.tileId)?.name} ${dir}=[${mySocket}]` +
                            ` ↔ (${nr},${nc}) ${tiles.get(neighbor.tileId)?.name} ${OPPOSING_DIR[dir]}=[${theirSocket}]`
                    );
                }
            }
        }
    }

    return true;
}

export function constrainFromCollapsed(grid: WFCGrid, tiles: Map<string, WFCTile>): boolean {
    for (let r = 0; r < grid.rows; r++) {
        for (let c = 0; c < grid.cols; c++) {
            const cell = grid.cells[r][c];
            if (!cell.collapsed) continue;
            const hasOpenNeighbour = [
                [r - 1, c],
                [r + 1, c],
                [r, c - 1],
                [r, c + 1],
            ].some(([nr, nc]) => nr >= 0 && nr < grid.rows && nc >= 0 && nc < grid.cols && !grid.cells[nr][nc].collapsed);
            if (!hasOpenNeighbour) continue;
            if (!propagate(grid, tiles, r, c)) return false;
        }
    }
    return true;
}

const DIRS_WITH_NAME = [
    { dr: -1, dc: 0, dir: 'top' as const },
    { dr: 1, dc: 0, dir: 'bottom' as const },
    { dr: 0, dc: -1, dir: 'left' as const },
    { dr: 0, dc: 1, dir: 'right' as const },
];

function repairNeighbors(grid: WFCGrid, tiles: Map<string, WFCTile>, regionKeys: Set<string>, allowedIds: string[], allTileIds: string[]): { row: number; col: number }[] {
    const freed: { row: number; col: number }[] = [];
    for (const key of regionKeys) {
        const [row, col] = key.split(',').map(Number);
        for (const { dr, dc, dir } of DIRS_WITH_NAME) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr < 0 || nr >= grid.rows || nc < 0 || nc >= grid.cols) continue;
            if (regionKeys.has(`${nr},${nc}`)) continue;
            const neighbor = grid.cells[nr][nc];
            if (!neighbor.collapsed || !neighbor.tileId) continue;

            const neighborTile = tiles.get(neighbor.tileId);
            if (!neighborTile) continue;

            const neighborSocket = neighborTile.definition.sockets[OPPOSITE_DIR[dir]];
            const neighborArr = toSocketArray(neighborSocket);

            const anyCompatible = allowedIds.some((id) => {
                const t = tiles.get(id);
                if (!t) return false;
                return socketsCompatible(t.definition.sockets[dir], neighborArr);
            });

            if (!anyCompatible) {
                neighbor.collapsed = false;
                neighbor.tileId = null;
                neighbor.possibilities = [...allTileIds];
                freed.push({ row: nr, col: nc });
            }
        }
    }
    return freed;
}

export function fillRegion(grid: WFCGrid, tiles: Map<string, WFCTile>, cells: { row: number; col: number }[], allowedTileIds: string[]): boolean {
    const allTileIds = Array.from(tiles.keys());
    const regionKeys = new Set(cells.map(({ row, col }) => `${row},${col}`));

    for (const { row, col } of cells) {
        grid.cells[row][col].collapsed = false;
        grid.cells[row][col].tileId = null;
        grid.cells[row][col].possibilities = [...allowedTileIds];
    }

    const freedCells = repairNeighbors(grid, tiles, regionKeys, allowedTileIds, allTileIds);

    for (const { row, col } of freedCells) {
        const cell = grid.cells[row][col];
        for (const { dr, dc, dir } of DIRS_WITH_NAME) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr < 0 || nr >= grid.rows || nc < 0 || nc >= grid.cols) continue;
            const neighbor = grid.cells[nr][nc];
            if (!neighbor.collapsed || !neighbor.tileId) continue;
            const allowed = new Set(getCompatible(tiles, cell.possibilities, OPPOSITE_DIR[dir], neighbor.tileId));
            cell.possibilities = cell.possibilities.filter((id) => allowed.has(id));
            if (cell.possibilities.length === 0) return false;
        }
    }

    for (const { row, col } of cells) {
        if (!propagate(grid, tiles, row, col)) return false;
    }

    return runWFC(grid, tiles);
}

export function paintRegion(grid: WFCGrid, tiles: Map<string, WFCTile>, row: number, col: number, allowedCenterIds: string[]): boolean {
    const allTileIds = Array.from(tiles.keys());

    type Snap = { collapsed: boolean; tileId: string | null; possibilities: string[] };

    const ensureSnapped = (snap: Map<string, Snap>, r: number, c: number) => {
        const key = `${r},${c}`;
        if (!snap.has(key)) {
            const cell = grid.cells[r][c];
            snap.set(key, { collapsed: cell.collapsed, tileId: cell.tileId, possibilities: [...cell.possibilities] });
        }
    };

    const restoreSnapshot = (snap: Map<string, Snap>) => {
        for (const [key, s] of snap) {
            const [r, c] = key.split(',').map(Number);
            grid.cells[r][c].collapsed = s.collapsed;
            grid.cells[r][c].tileId = s.tileId;
            grid.cells[r][c].possibilities = [...s.possibilities];
        }
    };

    for (const centerId of allowedCenterIds) {
        const snap = new Map<string, Snap>();

        ensureSnapped(snap, row, col);
        const center = grid.cells[row][col];
        center.collapsed = true;
        center.tileId = centerId;
        center.possibilities = [centerId];

        const cascadeQueue: [number, number][] = [[row, col]];
        const inCascade = new Set<string>([`${row},${col}`]);

        while (cascadeQueue.length > 0) {
            const [cr, cc] = cascadeQueue.shift()!;
            const current = grid.cells[cr][cc];
            if (!current.collapsed || !current.tileId) continue;
            const currentTile = tiles.get(current.tileId);
            if (!currentTile) continue;

            for (const { dr, dc, dir } of DIRS_WITH_NAME) {
                const nr = cr + dr;
                const nc = cc + dc;
                if (nr < 0 || nr >= grid.rows || nc < 0 || nc >= grid.cols) continue;
                if (nr === row && nc === col) continue;
                const nb = grid.cells[nr][nc];
                if (!nb.collapsed || !nb.tileId) continue;
                const nbTile = tiles.get(nb.tileId);
                if (!nbTile) continue;
                if (!socketsCompatible(currentTile.definition.sockets[dir], nbTile.definition.sockets[OPPOSITE_DIR[dir]])) {
                    ensureSnapped(snap, nr, nc);
                    nb.collapsed = false;
                    nb.tileId = null;
                    nb.possibilities = [...allTileIds];
                    const nbKey = `${nr},${nc}`;
                    if (!inCascade.has(nbKey)) {
                        inCascade.add(nbKey);
                        cascadeQueue.push([nr, nc]);
                    }
                }
            }
        }

        let ok = true;
        for (const [key] of snap) {
            const [r, c] = key.split(',').map(Number);
            const cell = grid.cells[r][c];
            if (cell.collapsed) continue;
            for (const { dr, dc, dir } of DIRS_WITH_NAME) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr < 0 || nr >= grid.rows || nc < 0 || nc >= grid.cols) continue;
                const nb = grid.cells[nr][nc];
                if (!nb.collapsed || !nb.tileId) continue;
                const allowed = new Set(getCompatible(tiles, cell.possibilities, OPPOSITE_DIR[dir], nb.tileId));
                cell.possibilities = cell.possibilities.filter((id) => allowed.has(id));
                if (cell.possibilities.length === 0) {
                    ok = false;
                    break;
                }
            }
            if (!ok) break;
        }

        if (!ok || !runWFC(grid, tiles)) {
            restoreSnapshot(snap);
            continue;
        }

        return true;
    }

    return false;
}

/**
 * Collapse a specific region of the grid (reroll). Resets possibilities for
 * the given cells and re-runs WFC constrained by the surrounding tiles.
 *
 * Critical: we propagate FROM the collapsed neighbours that border the reset
 * zone (inward), NOT from the reset cells themselves (which have all
 * possibilities open and would push no constraints outward).
 */
export function rerollCells(grid: WFCGrid, tiles: Map<string, WFCTile>, cells: { row: number; col: number }[], allTileIds: string[]): boolean {
    const resetSet = new Set(cells.map(({ row, col }) => `${row},${col}`));

    for (const { row, col } of cells) {
        grid.cells[row][col].collapsed = false;
        grid.cells[row][col].tileId = null;
        grid.cells[row][col].possibilities = [...allTileIds];
    }

    const propagationStarts = new Set<string>();
    for (const { row, col } of cells) {
        for (const [dr, dc] of [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
        ] as const) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr < 0 || nr >= grid.rows || nc < 0 || nc >= grid.cols) continue;
            if (resetSet.has(`${nr},${nc}`)) continue;
            if (grid.cells[nr][nc].collapsed) {
                propagationStarts.add(`${nr},${nc}`);
            }
        }
    }

    for (const key of propagationStarts) {
        const [r, c] = key.split(',').map(Number);
        if (!propagate(grid, tiles, r, c)) return false;
    }

    return runWFC(grid, tiles);
}
