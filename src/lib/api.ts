import { Hypb } from '@hydevs/hypb';
import type { RecordModel } from 'pocketbase';
import type {
    DncWorldmapBackgroundRecord,
    DncWorldmapElementTypeRecord,
    DncWorldmapGroupRecord,
    DncWorldmapMapRecord,
    DncWorldmapNoteRecord,
    DncWorldmapPoiRecord,
    DncWorldmapZoneRecord,
    DncWorldmapLineRecord,
    DncWorldmapDrawingStrokeRecord,
    DncWorldmapMemberRecord,
    DncWorldmapInviteRecord,
    DncWorldmapAssetRecord,
    DncWorldmapAssetCategoryRecord,
} from '../types/database';
import type { Background, DrawStroke, ElementType, MapData, MapGroup, MapInvite, MapLine, MapMember, POI, TextNote, Zone } from '../types/map';

export const getFileUrl = (record: RecordModel, filename: string) => {
    const pb = Hypb.pb;
    return pb.files.getURL(record, filename);
};

function stampUser(data: Record<string, unknown>): void {
    const uid = Hypb.pb.authStore.record?.id;
    if (uid) data.last_updated_by = uid;
}

export async function fetchMap(mapId: string): Promise<MapData> {
    const pb = Hypb.pb;
    const record = await pb.collection('dnc_worldmap_maps').getOne<DncWorldmapMapRecord>(mapId);
    return {
        id: record.id,
        name: record.name,
        description: record.description,
        owner: record.owner,
    };
}

export async function fetchElementTypes(): Promise<ElementType[]> {
    const pb = Hypb.pb;
    const list = await pb.collection('dnc_worldmap_types').getFullList<DncWorldmapElementTypeRecord>();
    return list.map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color,
    }));
}

export async function fetchMapElements(mapId: string) {
    const pb = Hypb.pb;
    const poisItems = await pb.collection('dnc_worldmap_pois').getFullList<DncWorldmapPoiRecord>({
        filter: `map_id = "${mapId}"`,
        expand: 'type',
        batch: 200,
    });
    const pois: POI[] = poisItems.map((r) => ({
        id: r.id,
        mapId: r.map_id,
        x: r.x,
        y: r.y,
        zIndex: r.z_index,
        hidden: r.hidden ?? false,
        locked: r.locked ?? false,
        pinned: r.pinned ?? false,
        type: r.type,
        name: r.name,
        description: r.description,
        color: r.expand?.type?.color ?? '#888888',
        size: r.size,
    }));

    const zonesItems = await pb.collection('dnc_worldmap_zones').getFullList<DncWorldmapZoneRecord>({
        filter: `map_id = "${mapId}"`,
        batch: 200,
    });
    const zones: Zone[] = zonesItems.map((r) => ({
        id: r.id,
        mapId: r.map_id,
        zIndex: r.z_index,
        hidden: r.hidden ?? false,
        locked: r.locked ?? false,
        pinned: r.pinned ?? false,
        name: r.name,
        description: r.description,
        points: r.points,
        color: r.color,
        pattern: r.pattern,
    }));

    const notesItems = await pb.collection('dnc_worldmap_notes').getFullList<DncWorldmapNoteRecord>({
        filter: `map_id = "${mapId}"`,
        batch: 200,
    });
    const notes: TextNote[] = notesItems.map((r) => ({
        id: r.id,
        mapId: r.map_id,
        x: r.x,
        y: r.y,
        zIndex: r.z_index,
        hidden: r.hidden ?? false,
        locked: r.locked ?? false,
        pinned: r.pinned ?? false,
        content: r.content,
        fontSize: r.font_size,
        bgColor: r.bg_color,
        width: r.width,
        author: (r as any).author ?? undefined,
        authorName: r.expand?.author?.name ?? undefined,
    }));

    const bgsItems = await pb.collection('dnc_worldmap_image').getFullList<DncWorldmapBackgroundRecord>({
        filter: `map_id = "${mapId}"`,
        expand: 'asset_id',
        batch: 200,
    });
    const backgrounds: Background[] = bgsItems.map((r) => ({
        id: r.id,
        mapId: r.map_id,
        x: r.x,
        y: r.y,
        zIndex: r.z_index,
        hidden: r.hidden ?? false,
        locked: r.locked ?? false,
        pinned: r.pinned ?? false,
        name: r.name,
        imageUrl: r.expand?.asset_id?.file ? Hypb.pb.files.getURL(r.expand.asset_id, r.expand.asset_id.file) : Hypb.pb.files.getURL(r, r.image || ''),
        width: r.width,
        height: r.height,
        rotation: r.rotation ?? 0,
        lockAspectRatio: r.lock_aspect_ratio ?? false,
    }));

    let lines: MapLine[] = [];
    try {
        const linesItems = await pb.collection('dnc_worldmap_lines').getFullList<DncWorldmapLineRecord>({
            filter: `map_id = "${mapId}"`,
            batch: 200,
        });
        lines = linesItems.map((r) => ({
            id: r.id,
            mapId: r.map_id,
            x: r.x,
            y: r.y,
            zIndex: r.z_index,
            hidden: r.hidden ?? false,
            locked: r.locked ?? false,
            pinned: r.pinned ?? false,
            name: r.name,
            bx: r.bx,
            by: r.by,
            cx: r.cx,
            cy: r.cy,
            aAttachedId: r.a_attached_id || undefined,
            aAttachedKind: (r.a_attached_kind || undefined) as MapLine['aAttachedKind'],
            bAttachedId: r.b_attached_id || undefined,
            bAttachedKind: (r.b_attached_kind || undefined) as MapLine['bAttachedKind'],
            color: r.color,
            strokeWidth: r.stroke_width,
            dashPattern: (r.dash_pattern || undefined) as MapLine['dashPattern'],
        }));
    } catch {
        lines = [];
    }

    return { pois, zones, notes, backgrounds, lines };
}

export async function createPOI(poi: Omit<POI, 'id'>): Promise<POI> {
    const data = {
        map_id: poi.mapId,
        x: poi.x,
        y: poi.y,
        z_index: poi.zIndex,
        type: poi.type,
        name: poi.name,
        description: poi.description ?? '',
        size: poi.size ?? 10,
    };
    const pb = Hypb.pb;
    const record = await pb.collection('dnc_worldmap_pois').create<DncWorldmapPoiRecord>(data);
    return { ...poi, id: record.id };
}

export async function createZone(zone: Omit<Zone, 'id'>): Promise<Zone> {
    const pb = Hypb.pb;
    const data = {
        map_id: zone.mapId,
        z_index: zone.zIndex,
        color: zone.color,
        name: zone.name,
        description: zone.description ?? '',
        points: zone.points,
        pattern: zone.pattern ?? '',
    };
    const record = await pb.collection('dnc_worldmap_zones').create<DncWorldmapZoneRecord>(data);
    return { ...zone, id: record.id };
}

export async function createNote(note: Omit<TextNote, 'id'>): Promise<TextNote> {
    const pb = Hypb.pb;
    const data: Record<string, unknown> = {
        map_id: note.mapId,
        x: note.x,
        y: note.y,
        z_index: note.zIndex,
        content: note.content,
        font_size: note.fontSize ?? 14,
        bg_color: note.bgColor ?? '#fff9c4ff',
        ...(note.width !== undefined ? { width: note.width } : {}),
    };
    if ((note as any).author) data.author = (note as any).author;
    const record = await pb.collection('dnc_worldmap_notes').create<DncWorldmapNoteRecord>(data);
    const authorName = (note as any).author ? (Hypb.pb.authStore.record?.id === (note as any).author ? (Hypb.pb.authStore.record as any)?.name : undefined) : undefined;
    return { ...note, id: record.id, authorName } as TextNote;
}

export async function createBackground(bg: Omit<Background, 'id' | 'imageUrl'>, file?: File, assetId?: string): Promise<Background> {
    const pb = Hypb.pb;

    if (file) {
        const formData = new FormData();
        formData.append('map_id', bg.mapId);
        formData.append('x', bg.x.toString());
        formData.append('y', bg.y.toString());
        formData.append('z_index', bg.zIndex.toString());
        formData.append('width', bg.width.toString());
        formData.append('height', bg.height.toString());
        if (bg.name) formData.append('name', bg.name);
        formData.append('image', file);
        const record = await pb.collection('dnc_worldmap_image').create<DncWorldmapBackgroundRecord>(formData);
        return {
            ...bg,
            id: record.id,
            imageUrl: Hypb.pb.files.getURL(record, record.image || ''),
        };
    }

    const data: Record<string, unknown> = {
        map_id: bg.mapId,
        x: bg.x,
        y: bg.y,
        z_index: bg.zIndex,
        width: bg.width,
        height: bg.height,
    };
    if (bg.name) data.name = bg.name;
    if (assetId) data.asset_id = assetId;
    const record = await pb.collection('dnc_worldmap_image').create<DncWorldmapBackgroundRecord>(data);

    let imageUrl = '';
    if (assetId) {
        try {
            const asset = await pb.collection('dnc_worldmap_assets').getOne(assetId);
            imageUrl = Hypb.pb.files.getURL(asset, asset.file);
        } catch {
            imageUrl = '';
        }
    } else {
        imageUrl = Hypb.pb.files.getURL(record, record.image || '');
    }
    return { ...bg, id: record.id, imageUrl };
}

export async function fetchAssets(): Promise<{
    assets: DncWorldmapAssetRecord[];
    categories: DncWorldmapAssetCategoryRecord[];
}> {
    const pb = Hypb.pb;
    const assets = await pb.collection('dnc_worldmap_assets').getFullList<DncWorldmapAssetRecord>({});
    const categories = await pb.collection('dnc_worldmap_asset_categories').getFullList<DncWorldmapAssetCategoryRecord>({});
    return { assets, categories };
}

export async function createAssetCategory(name: string): Promise<DncWorldmapAssetCategoryRecord> {
    const pb = Hypb.pb;
    return pb.collection('dnc_worldmap_asset_categories').create<DncWorldmapAssetCategoryRecord>({ name });
}

export async function updateAssetCategory(id: string, name: string): Promise<void> {
    const pb = Hypb.pb;
    await pb.collection('dnc_worldmap_asset_categories').update(id, { name });
}

export async function deleteAssetCategory(id: string): Promise<void> {
    const pb = Hypb.pb;
    await pb.collection('dnc_worldmap_asset_categories').delete(id);
}

export async function createAsset(data: { name: string; file: File; category?: string; tags?: string[]; width?: number; height?: number }): Promise<DncWorldmapAssetRecord> {
    const pb = Hypb.pb;
    const form = new FormData();
    form.append('name', data.name);
    form.append('file', data.file);
    if (data.category) form.append('category', data.category);
    if (data.tags) form.append('tags', JSON.stringify(data.tags));
    if (data.width !== undefined) form.append('width', String(data.width));
    if (data.height !== undefined) form.append('height', String(data.height));
    return pb.collection('dnc_worldmap_assets').create<DncWorldmapAssetRecord>(form);
}

export async function updateAsset(
    id: string,
    updates: {
        name?: string;
        file?: File;
        category?: string;
        tags?: string[];
        width?: number | null;
        height?: number | null;
    }
): Promise<void> {
    const pb = Hypb.pb;
    const data: Record<string, unknown> = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.category !== undefined) data.category = updates.category;
    if (updates.tags !== undefined) data.tags = updates.tags;
    if (updates.width !== undefined) data.width = updates.width;
    if (updates.height !== undefined) data.height = updates.height;
    if (updates.file) {
        const form = new FormData();
        Object.entries(data).forEach(([k, v]) => form.append(k, v as string));
        form.append('file', updates.file);
        await pb.collection('dnc_worldmap_assets').update(id, form);
        return;
    }
    await pb.collection('dnc_worldmap_assets').update(id, data);
}

export async function deleteAsset(id: string): Promise<void> {
    const pb = Hypb.pb;
    await pb.collection('dnc_worldmap_assets').delete(id);
}

export async function updatePOI(id: string, updates: Partial<POI>): Promise<POI> {
    const data: Record<string, unknown> = {};
    if (updates.x !== undefined) data.x = updates.x;
    if (updates.y !== undefined) data.y = updates.y;
    if (updates.zIndex !== undefined) data.z_index = updates.zIndex;
    if (updates.type !== undefined) data.type = updates.type;
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.size !== undefined) data.size = updates.size;
    if (updates.hidden !== undefined) data.hidden = updates.hidden;
    if (updates.locked !== undefined) data.locked = updates.locked;
    if (updates.pinned !== undefined) data.pinned = updates.pinned;
    stampUser(data);

    const pb = Hypb.pb;
    await pb.collection('dnc_worldmap_pois').update(id, data);

    return { id, ...updates } as POI;
}

export async function updateZone(id: string, updates: Partial<Zone>): Promise<Zone> {
    const data: Record<string, unknown> = {};
    if (updates.points !== undefined) data.points = updates.points;
    if (updates.zIndex !== undefined) data.z_index = updates.zIndex;
    if (updates.color !== undefined) data.color = updates.color;
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.pattern !== undefined) data.pattern = updates.pattern;
    if (updates.hidden !== undefined) data.hidden = updates.hidden;
    if (updates.locked !== undefined) data.locked = updates.locked;
    if (updates.pinned !== undefined) data.pinned = updates.pinned;
    stampUser(data);

    const pb = Hypb.pb;
    await pb.collection('dnc_worldmap_zones').update(id, data);
    return { id, ...updates } as Zone;
}

export async function updateNote(id: string, updates: Partial<TextNote>): Promise<TextNote> {
    const data: Record<string, unknown> = {};
    if (updates.x !== undefined) data.x = updates.x;
    if (updates.y !== undefined) data.y = updates.y;
    if (updates.zIndex !== undefined) data.z_index = updates.zIndex;
    if (updates.content !== undefined) data.content = updates.content;
    if (updates.fontSize !== undefined) data.font_size = updates.fontSize;
    if (updates.bgColor !== undefined) data.bg_color = updates.bgColor;
    if ('width' in updates) data.width = updates.width ?? null;
    if ('author' in updates) data.author = (updates as any).author ?? null;
    if (updates.hidden !== undefined) data.hidden = updates.hidden;
    if (updates.locked !== undefined) data.locked = updates.locked;
    if (updates.pinned !== undefined) data.pinned = updates.pinned;
    stampUser(data);

    const pb = Hypb.pb;
    await pb.collection('dnc_worldmap_notes').update(id, data);
    return { id, ...updates } as TextNote;
}

export async function deletePOI(id: string): Promise<void> {
    const pb = Hypb.pb;
    await pb.collection('dnc_worldmap_pois').delete(id);
}

export async function deleteZone(id: string): Promise<void> {
    const pb = Hypb.pb;
    await pb.collection('dnc_worldmap_zones').delete(id);
}

export async function deleteNote(id: string): Promise<void> {
    const pb = Hypb.pb;
    await pb.collection('dnc_worldmap_notes').delete(id);
}

export async function updateBackground(id: string, updates: Partial<Background>): Promise<void> {
    const data: Record<string, unknown> = {};
    if (updates.x !== undefined) data.x = updates.x;
    if (updates.y !== undefined) data.y = updates.y;
    if (updates.zIndex !== undefined) data.z_index = updates.zIndex;
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.width !== undefined) data.width = updates.width;
    if (updates.height !== undefined) data.height = updates.height;
    if (updates.rotation !== undefined) data.rotation = updates.rotation;
    if (updates.lockAspectRatio !== undefined) data.lock_aspect_ratio = updates.lockAspectRatio;
    if (updates.hidden !== undefined) data.hidden = updates.hidden;
    if (updates.locked !== undefined) data.locked = updates.locked;
    if (updates.pinned !== undefined) data.pinned = updates.pinned;
    stampUser(data);
    const pb = Hypb.pb;
    await pb.collection('dnc_worldmap_image').update(id, data);
}

export async function deleteBackground(id: string): Promise<void> {
    const pb = Hypb.pb;
    await pb.collection('dnc_worldmap_image').delete(id);
}

export async function createLine(line: Omit<MapLine, 'id'>): Promise<MapLine> {
    const pb = Hypb.pb;
    const data: Record<string, unknown> = {
        map_id: line.mapId,
        x: line.x,
        y: line.y,
        z_index: line.zIndex,
        bx: line.bx,
        by: line.by,
        color: line.color,
        stroke_width: line.strokeWidth ?? 2,
        dash_pattern: line.dashPattern ?? 'solid',
    };
    if (line.name) data.name = line.name;
    if (line.cx !== undefined) data.cx = line.cx;
    if (line.cy !== undefined) data.cy = line.cy;
    if (line.aAttachedId) data.a_attached_id = line.aAttachedId;
    if (line.aAttachedKind) data.a_attached_kind = line.aAttachedKind;
    if (line.bAttachedId) data.b_attached_id = line.bAttachedId;
    if (line.bAttachedKind) data.b_attached_kind = line.bAttachedKind;
    const record = await pb.collection('dnc_worldmap_lines').create<DncWorldmapLineRecord>(data);
    return { ...line, id: record.id };
}

export async function updateLine(id: string, updates: Partial<MapLine>): Promise<void> {
    const data: Record<string, unknown> = {};
    if (updates.x !== undefined) data.x = updates.x;
    if (updates.y !== undefined) data.y = updates.y;
    if (updates.zIndex !== undefined) data.z_index = updates.zIndex;
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.bx !== undefined) data.bx = updates.bx;
    if (updates.by !== undefined) data.by = updates.by;
    if ('cx' in updates) data.cx = updates.cx ?? null;
    if ('cy' in updates) data.cy = updates.cy ?? null;
    if ('aAttachedId' in updates) data.a_attached_id = updates.aAttachedId ?? null;
    if ('aAttachedKind' in updates) data.a_attached_kind = updates.aAttachedKind ?? null;
    if ('bAttachedId' in updates) data.b_attached_id = updates.bAttachedId ?? null;
    if ('bAttachedKind' in updates) data.b_attached_kind = updates.bAttachedKind ?? null;
    if (updates.color !== undefined) data.color = updates.color;
    if (updates.strokeWidth !== undefined) data.stroke_width = updates.strokeWidth;
    if (updates.dashPattern !== undefined) data.dash_pattern = updates.dashPattern;
    if (updates.hidden !== undefined) data.hidden = updates.hidden;
    if (updates.locked !== undefined) data.locked = updates.locked;
    if (updates.pinned !== undefined) data.pinned = updates.pinned;
    stampUser(data);
    const pb = Hypb.pb;
    await pb.collection('dnc_worldmap_lines').update(id, data);
}

export async function deleteLine(id: string): Promise<void> {
    const pb = Hypb.pb;
    await pb.collection('dnc_worldmap_lines').delete(id);
}

export async function fetchDrawingStrokes(mapId: string): Promise<DrawStroke[]> {
    const pb = Hypb.pb;
    try {
        const list = await pb.collection('dnc_worldmap_drawing_strokes').getFullList<DncWorldmapDrawingStrokeRecord>({
            filter: `map_id = "${mapId}"`,
            sort: 'created',
        });
        return list.map((r) => ({
            id: r.id,
            points: r.points,
            color: r.color,
            size: r.size,
            tool: r.tool,
        }));
    } catch {
        return [];
    }
}

export async function createDrawingStroke(mapId: string, stroke: DrawStroke): Promise<void> {
    const pb = Hypb.pb;
    await pb.collection('dnc_worldmap_drawing_strokes').create({
        id: stroke.id,
        map_id: mapId,
        points: stroke.points,
        color: stroke.color,
        size: stroke.size,
        tool: stroke.tool,
    });
}

export async function deleteDrawingStroke(id: string): Promise<void> {
    const pb = Hypb.pb;
    await pb.collection('dnc_worldmap_drawing_strokes').delete(id);
}

export async function clearMapDrawingStrokes(mapId: string): Promise<void> {
    const pb = Hypb.pb;
    try {
        const list = await pb.collection('dnc_worldmap_drawing_strokes').getFullList({ filter: `map_id = "${mapId}"` });
        await Promise.all(list.map((r) => pb.collection('dnc_worldmap_drawing_strokes').delete(r.id)));
    } catch {}
}

export async function fetchGroups(mapId: string): Promise<MapGroup[]> {
    const pb = Hypb.pb;
    try {
        const list = await pb.collection('dnc_worldmap_groups').getFullList<DncWorldmapGroupRecord>({
            filter: `map_id = "${mapId}"`,
            sort: 'created',
        });
        return list.map((r) => ({
            id: r.id,
            mapId: r.map_id,
            name: r.name,
            color: r.color,
            hidden: r.hidden ?? false,
            locked: r.locked ?? false,
            pinned: r.pinned ?? false,
            collapsed: false,
            memberIds: Array.isArray(r.member_ids) ? r.member_ids : [],
        }));
    } catch {
        return [];
    }
}

export async function createGroup(group: Omit<MapGroup, 'collapsed'>): Promise<void> {
    const pb = Hypb.pb;
    await pb.collection('dnc_worldmap_groups').create({
        id: group.id,
        map_id: group.mapId,
        name: group.name,
        color: group.color,
        hidden: group.hidden,
        locked: group.locked,
        pinned: group.pinned,
        member_ids: group.memberIds,
    });
}

export async function updateGroupDB(id: string, updates: Partial<Pick<MapGroup, 'name' | 'color' | 'hidden' | 'locked' | 'pinned' | 'memberIds'>>): Promise<void> {
    const data: Record<string, unknown> = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.color !== undefined) data.color = updates.color;
    if (updates.hidden !== undefined) data.hidden = updates.hidden;
    if (updates.locked !== undefined) data.locked = updates.locked;
    if (updates.pinned !== undefined) data.pinned = updates.pinned;
    if (updates.memberIds !== undefined) data.member_ids = updates.memberIds;
    stampUser(data);
    const pb = Hypb.pb;
    await pb.collection('dnc_worldmap_groups').update(id, data);
}

export async function deleteGroupDB(id: string): Promise<void> {
    const pb = Hypb.pb;
    await pb.collection('dnc_worldmap_groups').delete(id);
}

export async function fetchMapMembers(mapId: string): Promise<MapMember[]> {
    const pb = Hypb.pb;
    const list = await pb.collection('dnc_worldmap_members').getFullList<DncWorldmapMemberRecord>({
        filter: `map_id = "${mapId}"`,
        expand: 'user_id',
    });
    return list.map((r) => ({
        id: r.id,
        mapId: r.map_id,
        userId: r.user_id,
        role: r.role,
        email: r.expand?.user_id?.email ?? r.user_id,
        name: r.expand?.user_id?.name,
    }));
}

export async function addMapMember(mapId: string, userId: string, role: 'owner' | 'member' = 'member'): Promise<void> {
    const pb = Hypb.pb;
    await pb.collection('dnc_worldmap_members').create({
        map_id: mapId,
        user_id: userId,
        role,
    });
}

export async function removeMapMember(memberId: string): Promise<void> {
    const pb = Hypb.pb;
    await pb.collection('dnc_worldmap_members').delete(memberId);
}

export async function transferOwnership(mapId: string, newOwnerId: string, currentOwnerId: string, currentOwnerMemberId: string, newOwnerMemberId: string): Promise<void> {
    const pb = Hypb.pb;

    await pb.collection('dnc_worldmap_maps').update(mapId, { owner: newOwnerId });

    await pb.collection('dnc_worldmap_members').update(currentOwnerMemberId, { role: 'member' });
    await pb.collection('dnc_worldmap_members').update(newOwnerMemberId, { role: 'owner' });
    void currentOwnerId;
}

export async function checkMembership(mapId: string, userId: string): Promise<boolean> {
    const pb = Hypb.pb;
    try {
        const result = await pb.collection('dnc_worldmap_members').getFirstListItem<DncWorldmapMemberRecord>(`map_id = "${mapId}" && user_id = "${userId}"`);
        return !!result;
    } catch {
        return false;
    }
}

export async function fetchMapInvites(mapId: string): Promise<MapInvite[]> {
    const pb = Hypb.pb;
    const list = await pb.collection('dnc_worldmap_invites').getFullList<DncWorldmapInviteRecord>({
        filter: `map_id = "${mapId}"`,
        sort: '-created',
    });
    return list.map((r) => ({
        id: r.id,
        mapId: r.map_id,
        token: r.token,
        createdBy: r.created_by,
        label: r.label,
        created: r.created,
    }));
}

export async function createInvite(mapId: string, createdBy: string, label?: string): Promise<MapInvite> {
    const pb = Hypb.pb;
    const token = crypto.randomUUID();
    const record = await pb.collection('dnc_worldmap_invites').create<DncWorldmapInviteRecord>({
        map_id: mapId,
        token,
        created_by: createdBy,
        label: label ?? '',
    });
    return {
        id: record.id,
        mapId: record.map_id,
        token: record.token,
        createdBy: record.created_by,
        label: record.label,
        created: record.created,
    };
}

export async function deleteInvite(inviteId: string): Promise<void> {
    const pb = Hypb.pb;
    await pb.collection('dnc_worldmap_invites').delete(inviteId);
}

export async function fetchInviteByToken(token: string): Promise<MapInvite | null> {
    const pb = Hypb.pb;
    try {
        const record = await pb.collection('dnc_worldmap_invites').getFirstListItem<DncWorldmapInviteRecord>(`token = "${token}"`);
        return {
            id: record.id,
            mapId: record.map_id,
            token: record.token,
            createdBy: record.created_by,
            label: record.label,
            created: record.created,
        };
    } catch {
        return null;
    }
}
