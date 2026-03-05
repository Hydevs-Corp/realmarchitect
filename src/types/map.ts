export interface MapElement {
    id: string;
    mapId: string;
    x: number;
    y: number;
    zIndex: number;
    hidden?: boolean;
    locked?: boolean;
    pinned?: boolean;
}

export interface ElementType {
    id: string;
    name: string;
    color: string;
}

export interface POI extends MapElement {
    type: string;
    name: string;
    description?: string;

    color: string;
    size?: number;
}

export interface Zone extends Omit<MapElement, 'x' | 'y'> {
    points: number[];
    name: string;
    description?: string;
    color: string;
    pattern?: string;
    smooth?: boolean;
}

export interface TextNote extends MapElement {
    content: string;
    fontSize?: number;
    bgColor?: string;
    width?: number;

    author?: string;

    authorName?: string;
}

export interface MapImage extends MapElement {
    name?: string;
    imageUrl: string;
    width: number;
    height: number;

    rotation?: number;
    opacity?: number;

    lockAspectRatio?: boolean;
    assetId?: string;

    tileEnabled?: boolean;
    tileUrl?: string;
    tileSizeW?: number;
    tileSizeH?: number;
    tileSpacingX?: number;
    tileSpacingY?: number;
    tileOffsetX?: number;
    tileOffsetY?: number;
}

export type LineAttachKind = 'poi' | 'zone' | 'note' | 'image';

export interface MapLine extends MapElement {
    name?: string;

    bx: number;
    by: number;

    cx?: number;
    cy?: number;

    aAttachedId?: string;
    aAttachedKind?: LineAttachKind;

    bAttachedId?: string;
    bAttachedKind?: LineAttachKind;
    color: string;
    strokeWidth?: number;
    dashPattern?: 'solid' | 'dashed' | 'dotted';
}

export interface MapData {
    id: string;
    name: string;
    description?: string;
    owner: string;
}

export interface MapMember {
    id: string;
    mapId: string;
    user: string;
    role: 'owner' | 'member';
    name: string;
    email: string;
}

export interface MapInvite {
    id: string;
    mapId: string;
    token: string;
    createdBy: string;
    label?: string;
    created: string;
}

export type DrawTool = 'pen' | 'marker' | 'eraser';

export interface DrawStroke {
    id: string;

    points: number[];
    color: string;
    size: number;
    tool: DrawTool;
}

export interface DrawingLayerState {
    hidden: boolean;
    locked: boolean;
    strokes: DrawStroke[];
    activeTool: DrawTool;
    activeColor: string;
    activeSize: number;
}

export interface MapGroup {
    id: string;
    mapId: string;
    name: string;
    color: string;

    hidden: boolean;

    collapsed: boolean;

    locked: boolean;

    pinned: boolean;

    memberIds: string[];
}

export interface HistorySnapshot {
    pois?: POI[];
    zones?: Zone[];
    notes?: TextNote[];
    images?: MapImage[];
    lines?: MapLine[];
    groups?: MapGroup[];
    drawStrokes?: DrawStroke[];
}

export interface HistoryEntry {
    before: HistorySnapshot;
    after: HistorySnapshot;
}
