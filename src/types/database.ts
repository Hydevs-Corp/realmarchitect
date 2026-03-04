export interface DncWorldmapMapRecord {
    id: string;
    name: string;
    description?: string;
    owner: string;
    created: string;
    updated: string;
}

export interface DncWorldmapElementTypeRecord {
    id: string;
    name: string;
    color: string;
    created: string;
    updated: string;
}

export interface DncWorldmapPoiRecord {
    id: string;
    map_id: string;
    x: number;
    y: number;
    z_index: number;
    hidden?: boolean;
    locked?: boolean;
    pinned?: boolean;
    type: string;
    name: string;
    description?: string;
    size?: number;
    last_updated_by?: string;
    created: string;
    updated: string;
    expand?: {
        type?: DncWorldmapElementTypeRecord;
        last_updated_by?: DncWorldmapUsersRecord;
    };
}

export interface DncWorldmapZoneRecord {
    id: string;
    map_id: string;
    z_index: number;
    hidden?: boolean;
    locked?: boolean;
    pinned?: boolean;
    name: string;
    description?: string;
    points: number[];
    color: string;
    pattern?: string;
    last_updated_by?: string;
    created: string;
    updated: string;
    expand?: {
        last_updated_by?: DncWorldmapUsersRecord;
    };
}

export interface DncWorldmapNoteRecord {
    id: string;
    map_id: string;
    x: number;
    y: number;
    z_index: number;
    hidden?: boolean;
    locked?: boolean;
    pinned?: boolean;
    content: string;
    font_size?: number;
    bg_color?: string;
    width?: number;
    author?: string;
    last_updated_by?: string;
    created: string;
    updated: string;
    expand?: {
        last_updated_by?: DncWorldmapUsersRecord;
        author?: DncWorldmapUsersRecord;
    };
}

export interface DncWorldmapBackgroundRecord {
    id: string;
    map_id: string;
    x: number;
    y: number;
    z_index: number;
    hidden?: boolean;
    locked?: boolean;
    pinned?: boolean;
    name?: string;
    image?: string;

    asset_id?: string;

    rotation?: number;

    lock_aspect_ratio?: boolean;
    width: number;
    height: number;
    last_updated_by?: string;
    created: string;
    updated: string;
    expand?: {
        last_updated_by?: DncWorldmapUsersRecord;
        asset_id?: DncWorldmapAssetRecord;
    };
}

export interface DncWorldmapAssetCategoryRecord {
    id: string;
    name: string;
    created: string;
    updated: string;
}

export interface DncWorldmapAssetRecord {
    id: string;
    name: string;
    file: string;
    category?: string;
    width?: number;
    height?: number;
    tags?: string[];
    created: string;
    updated: string;
    expand?: {
        category?: DncWorldmapAssetCategoryRecord;
    };
}

export interface DncWorldmapLineRecord {
    id: string;
    map_id: string;
    x: number;
    y: number;
    z_index: number;
    hidden?: boolean;
    locked?: boolean;
    pinned?: boolean;
    name?: string;
    bx: number;
    by: number;
    cx?: number;
    cy?: number;
    a_attached_id?: string;
    a_attached_kind?: string;
    b_attached_id?: string;
    b_attached_kind?: string;
    color: string;
    stroke_width?: number;
    dash_pattern?: string;
    last_updated_by?: string;
    created: string;
    updated: string;
    expand?: {
        last_updated_by?: DncWorldmapUsersRecord;
    };
}

export interface DncWorldmapDrawingStrokeRecord {
    id: string;
    map_id: string;
    points: number[];
    color: string;
    size: number;
    tool: 'pen' | 'marker' | 'eraser';
    last_updated_by?: string;
    created: string;
    updated: string;
    expand?: {
        last_updated_by?: DncWorldmapUsersRecord;
    };
}

export interface DncWorldmapGroupRecord {
    id: string;
    map_id: string;
    name: string;
    color: string;
    hidden?: boolean;
    locked?: boolean;
    pinned?: boolean;

    member_ids?: string[];
    last_updated_by?: string;
    created: string;
    updated: string;
    expand?: {
        last_updated_by?: DncWorldmapUsersRecord;
    };
}

export interface DncWorldmapMemberRecord {
    id: string;
    map_id: string;

    user: string;
    role: 'owner' | 'member';
    created: string;
    updated: string;
    expand?: {
        user?: { id: string; email: string; name?: string };
    };
}

export interface DncWorldmapInviteRecord {
    id: string;
    map_id: string;
    token: string;
    created_by: string;
    label?: string;
    created: string;
    updated: string;
}

export interface DncWorldmapUsersRecord {
    id: string;
    email: string;
    emailVisibility: boolean;
    verified: boolean;
    name?: string;

    role?: string;
    created: string;
    updated: string;
}

export interface DncWorldmapMapPresenceRecord {
    id: string;
    map_id: string;

    user_id: string;

    last_seen: number;
    created: string;
    updated: string;
    expand?: {
        user_id?: { id: string; email: string; name?: string };
    };
}

export interface DncWorldmapTilesetRecord {
    id: string;
    name: string;
    tile_size: number;
    reference_image?: string;
    description?: string;
    /** Per-label draw strategy: 'all' = pure tiles only, 'some' = transition tiles allowed */
    draw_hints?: Record<string, 'all' | 'some'>;
    created: string;
    updated: string;
}

export interface DncWorldmapTileRecord {
    id: string;
    name: string;
    tileset_id: string;
    image?: string;
    /** JSON object: { weight?: number, sockets: { top, bottom, left, right } } */
    wfc_definition: Record<string, unknown>;
    created: string;
    updated: string;
    expand?: {
        tileset_id?: DncWorldmapTilesetRecord;
    };
}

export type CollectionRecords = {
    dnc_worldmap_maps: DncWorldmapMapRecord;
    dnc_worldmap_types: DncWorldmapElementTypeRecord;
    dnc_worldmap_pois: DncWorldmapPoiRecord;
    dnc_worldmap_zones: DncWorldmapZoneRecord;
    dnc_worldmap_notes: DncWorldmapNoteRecord;
    dnc_worldmap_image: DncWorldmapBackgroundRecord;
    dnc_worldmap_lines: DncWorldmapLineRecord;
    dnc_worldmap_drawing_strokes: DncWorldmapDrawingStrokeRecord;
    dnc_worldmap_groups: DncWorldmapGroupRecord;
    dnc_worldmap_members: DncWorldmapMemberRecord;
    dnc_worldmap_invites: DncWorldmapInviteRecord;
    dnc_worldmap_users: DncWorldmapUsersRecord;
    dnc_worldmap_map_presence: DncWorldmapMapPresenceRecord;
    dnc_worldmap_tilesets: DncWorldmapTilesetRecord;
    dnc_worldmap_tiles: DncWorldmapTileRecord;
};
