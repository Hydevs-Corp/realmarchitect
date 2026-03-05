import type { POI, Zone, TextNote, MapLine, MapImage, MapGroup } from '../types/map';
import type { MapExportData } from './exportMap';
import {
    createPOI,
    createZone,
    createNote,
    createLine,
    createImage,
    createGroup,
    recreatePOI,
    recreateZone,
    recreateNote,
    recreateLine,
    recreateImage,
    deletePOI,
    deleteZone,
    deleteNote,
    deleteLine,
    deleteImage,
    deleteGroupDB,
} from './api';

export function parseImportFile(file: File): Promise<MapExportData> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const raw = JSON.parse(e.target?.result as string) as MapExportData;
                if (!raw?.version || !raw?.map) {
                    reject(new Error('Invalid export file: missing version or map fields'));
                    return;
                }
                resolve(raw);
            } catch {
                reject(new Error('Failed to parse JSON file'));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

export type ImportMode = 'fresh' | 'replace' | 'merge';

function genId(): string {
    return Array.from({ length: 15 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
}

export interface ImportResult {
    pois: POI[];
    zones: Zone[];
    notes: TextNote[];
    lines: MapLine[];
    images: MapImage[];
    groups: MapGroup[];
    skippedImages: number;
}

export async function importElements(
    targetMapId: string,
    data: MapExportData,
    mode: ImportMode,
    current: {
        pois: POI[];
        zones: Zone[];
        notes: TextNote[];
        lines: MapLine[];
        images: MapImage[];
        groups: MapGroup[];
    }
): Promise<ImportResult> {
    if (mode === 'replace') {
        await Promise.allSettled([
            ...current.pois.map((p) => deletePOI(p.id)),
            ...current.zones.map((z) => deleteZone(z.id)),
            ...current.notes.map((n) => deleteNote(n.id)),
            ...current.lines.map((l) => deleteLine(l.id)),
            ...current.images.map((b) => deleteImage(b.id)),
            ...current.groups.map((g) => deleteGroupDB(g.id)),
        ]);
    }

    const keepIds = mode === 'replace' && data.map.id === targetMapId;

    const idRemap = new Map<string, string>();
    const remapId = (oldId: string): string => {
        if (keepIds) return oldId;
        if (!idRemap.has(oldId)) idRemap.set(oldId, genId());
        return idRemap.get(oldId)!;
    };

    const result: ImportResult = {
        pois: [],
        zones: [],
        notes: [],
        lines: [],
        images: [],
        groups: [],
        skippedImages: 0,
    };

    for (const p of data.pois ?? []) {
        try {
            const freshPoi: POI = { ...p, id: remapId(p.id), mapId: targetMapId };
            if (keepIds) {
                await recreatePOI(freshPoi);
                result.pois.push(freshPoi);
            } else {
                const created = await createPOI({ ...freshPoi });
                result.pois.push(created);
            }
        } catch {
            /* skip on collision or error */
        }
    }

    for (const z of data.zones ?? []) {
        try {
            const freshZone: Zone = { ...z, id: remapId(z.id), mapId: targetMapId };
            if (keepIds) {
                await recreateZone(freshZone);
                result.zones.push(freshZone);
            } else {
                const created = await createZone({ ...freshZone });
                result.zones.push(created);
            }
        } catch {
            /* skip */
        }
    }

    for (const n of data.notes ?? []) {
        try {
            const freshNote: TextNote = { ...n, id: remapId(n.id), mapId: targetMapId };
            if (keepIds) {
                await recreateNote(freshNote);
                result.notes.push(freshNote);
            } else {
                const created = await createNote({ ...freshNote });
                result.notes.push(created);
            }
        } catch {
            /* skip */
        }
    }

    for (const l of data.lines ?? []) {
        try {
            const freshLine: MapLine = {
                ...l,
                id: remapId(l.id),
                mapId: targetMapId,

                aAttachedId: l.aAttachedId ? (idRemap.get(l.aAttachedId) ?? l.aAttachedId) : undefined,
                bAttachedId: l.bAttachedId ? (idRemap.get(l.bAttachedId) ?? l.bAttachedId) : undefined,
            };
            if (keepIds) {
                await recreateLine(freshLine);
                result.lines.push(freshLine);
            } else {
                const created = await createLine({ ...freshLine });
                result.lines.push(created);
            }
        } catch {
            /* skip */
        }
    }

    for (const b of data.images ?? []) {
        if (!b.assetId) {
            result.skippedImages++;
            continue;
        }
        try {
            const freshBg: MapImage = { ...b, id: remapId(b.id), mapId: targetMapId };
            if (keepIds) {
                await recreateImage(freshBg);
                result.images.push(freshBg);
            } else {
                const created = await createImage({ ...freshBg }, undefined, b.assetId);
                result.images.push(created);
            }
        } catch {
            result.skippedImages++;
        }
    }

    for (const g of data.groups ?? []) {
        try {
            const freshGroup: MapGroup = {
                ...g,
                id: remapId(g.id),
                mapId: targetMapId,
                memberIds: g.memberIds.map((mid) => idRemap.get(mid) ?? mid),
            };
            await createGroup(freshGroup);
            result.groups.push(freshGroup);
        } catch {
            /* skip */
        }
    }

    return result;
}
