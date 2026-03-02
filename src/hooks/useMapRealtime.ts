import { useEffect } from 'react';
import { Hypb } from '@hydevs/hypb';
import type { RecordModel } from 'pocketbase';
import { useMapStore } from '../store/useMapStore';
import type {
    DncWorldmapPoiRecord,
    DncWorldmapZoneRecord,
    DncWorldmapNoteRecord,
    DncWorldmapBackgroundRecord,
    DncWorldmapLineRecord,
    DncWorldmapDrawingStrokeRecord,
    DncWorldmapGroupRecord,
    DncWorldmapAssetRecord,
} from '../types/database';
import type { MapLine } from '../types/map';

type PBRecord = RecordModel;

export function useMapRealtime(mapId: string | undefined) {
    useEffect(() => {
        if (!mapId) return;

        const pb = Hypb.pb;

        const unsubPromises: Promise<() => void>[] = [];

        function recordToPoi(r: PBRecord) {
            const elementTypes = useMapStore.getState().elementTypes;
            const typeColor = elementTypes.find((t) => t.id === r['type'])?.color ?? '#888888';
            const raw = r as unknown as DncWorldmapPoiRecord;
            return {
                id: raw.id,
                mapId: raw.map_id,
                x: raw.x,
                y: raw.y,
                zIndex: raw.z_index,
                hidden: raw.hidden ?? false,
                locked: raw.locked ?? false,
                pinned: raw.pinned ?? false,
                type: raw.type,
                name: raw.name,
                description: raw.description,
                color: typeColor,
                size: raw.size,
            };
        }

        function recordToZone(r: PBRecord) {
            const raw = r as unknown as DncWorldmapZoneRecord;
            return {
                id: raw.id,
                mapId: raw.map_id,
                zIndex: raw.z_index,
                hidden: raw.hidden ?? false,
                locked: raw.locked ?? false,
                pinned: raw.pinned ?? false,
                name: raw.name,
                description: raw.description,
                points: raw.points,
                color: raw.color,
                pattern: raw.pattern,
            };
        }

        function recordToNote(r: PBRecord) {
            const raw = r as unknown as DncWorldmapNoteRecord;
            return {
                id: raw.id,
                mapId: raw.map_id,
                x: raw.x,
                y: raw.y,
                zIndex: raw.z_index,
                hidden: raw.hidden ?? false,
                locked: raw.locked ?? false,
                pinned: raw.pinned ?? false,
                content: raw.content,
                fontSize: raw.font_size,
                bgColor: raw.bg_color,
                width: raw.width,
                author: raw.author ?? undefined,
                authorName: raw.expand?.author?.name ?? undefined,
            };
        }

        function recordToBackground(r: PBRecord) {
            const raw = r as unknown as DncWorldmapBackgroundRecord;
            return {
                id: raw.id,
                mapId: raw.map_id,
                x: raw.x,
                y: raw.y,
                zIndex: raw.z_index,
                hidden: raw.hidden ?? false,
                locked: raw.locked ?? false,
                pinned: raw.pinned ?? false,
                name: raw.name,
                imageUrl: pb.files.getURL(r, raw.image || ''),
                width: raw.width,
                height: raw.height,
                rotation: raw.rotation ?? 0,
                lockAspectRatio: raw.lock_aspect_ratio ?? false,
                assetId: raw.asset_id || undefined,
            };
        }

        function recordToLine(r: PBRecord): MapLine {
            const raw = r as unknown as DncWorldmapLineRecord;
            return {
                id: raw.id,
                mapId: raw.map_id,
                x: raw.x,
                y: raw.y,
                zIndex: raw.z_index,
                hidden: raw.hidden ?? false,
                locked: raw.locked ?? false,
                pinned: raw.pinned ?? false,
                name: raw.name,
                bx: raw.bx,
                by: raw.by,
                cx: raw.cx,
                cy: raw.cy,
                aAttachedId: raw.a_attached_id || undefined,
                aAttachedKind: (raw.a_attached_kind || undefined) as MapLine['aAttachedKind'],
                bAttachedId: raw.b_attached_id || undefined,
                bAttachedKind: (raw.b_attached_kind || undefined) as MapLine['bAttachedKind'],
                color: raw.color,
                strokeWidth: raw.stroke_width,
                dashPattern: (raw.dash_pattern || undefined) as MapLine['dashPattern'],
            };
        }

        function recordToStroke(r: PBRecord) {
            const raw = r as unknown as DncWorldmapDrawingStrokeRecord;
            return {
                id: raw.id,
                points: raw.points,
                color: raw.color,
                size: raw.size,
                tool: raw.tool,
            };
        }

        function recordToGroup(r: PBRecord) {
            const raw = r as unknown as DncWorldmapGroupRecord;
            return {
                id: raw.id,
                mapId: raw.map_id,
                name: raw.name,
                color: raw.color,
                hidden: raw.hidden ?? false,
                locked: raw.locked ?? false,
                pinned: raw.pinned ?? false,
                collapsed: false,
                memberIds: Array.isArray(raw.member_ids) ? raw.member_ids : [],
            };
        }

        unsubPromises.push(
            pb.collection('dnc_worldmap_pois').subscribe('*', (e) => {
                if (e.record['map_id'] !== mapId) return;
                const s = useMapStore.getState();
                const poi = recordToPoi(e.record);
                if (e.action === 'create') {
                    if (!s.pois.some((p) => p.id === poi.id)) s._remoteAddPoi(poi);
                } else if (e.action === 'update') {
                    s._remoteUpdatePoi(e.record.id, poi);
                } else if (e.action === 'delete') {
                    s._remoteDeletePoi(e.record.id);
                }
            })
        );

        unsubPromises.push(
            pb.collection('dnc_worldmap_zones').subscribe('*', (e) => {
                if (e.record['map_id'] !== mapId) return;
                const s = useMapStore.getState();
                const zone = recordToZone(e.record);
                if (e.action === 'create') {
                    if (!s.zones.some((z) => z.id === zone.id)) s._remoteAddZone(zone);
                } else if (e.action === 'update') {
                    s._remoteUpdateZone(e.record.id, zone);
                } else if (e.action === 'delete') {
                    s._remoteDeleteZone(e.record.id);
                }
            })
        );

        unsubPromises.push(
            pb.collection('dnc_worldmap_notes').subscribe('*', (e) => {
                if (e.record['map_id'] !== mapId) return;
                const s = useMapStore.getState();
                const note = recordToNote(e.record);
                if (e.action === 'create') {
                    if (!s.notes.some((n) => n.id === note.id)) s._remoteAddNote(note);
                } else if (e.action === 'update') {
                    s._remoteUpdateNote(e.record.id, note);
                } else if (e.action === 'delete') {
                    s._remoteDeleteNote(e.record.id);
                }
            })
        );

        unsubPromises.push(
            pb.collection('dnc_worldmap_image').subscribe('*', (e) => {
                if (e.record['map_id'] !== mapId) return;
                const s = useMapStore.getState();

                const bg = recordToBackground(e.record);

                const maybeAssetId = (e.record as unknown as DncWorldmapBackgroundRecord).asset_id ?? null;
                if (maybeAssetId && typeof maybeAssetId === 'string') {
                    void pb
                        .collection('dnc_worldmap_assets')
                        .getOne<DncWorldmapAssetRecord>(maybeAssetId)
                        .then((asset) => {
                            const assetUrl = pb.files.getURL(asset, asset.file);
                            const bgWithAsset = { ...bg, imageUrl: assetUrl, assetId: maybeAssetId };
                            if (e.action === 'create') {
                                if (!s.backgrounds.some((b) => b.id === bgWithAsset.id)) s._remoteAddBackground(bgWithAsset);
                            } else if (e.action === 'update') {
                                s._remoteUpdateBackground(e.record.id, bgWithAsset);
                            } else if (e.action === 'delete') {
                                s._remoteDeleteBackground(e.record.id);
                            }
                        })
                        .catch(() => {
                            if (e.action === 'create') {
                                if (!s.backgrounds.some((b) => b.id === bg.id)) s._remoteAddBackground(bg);
                            } else if (e.action === 'update') {
                                s._remoteUpdateBackground(e.record.id, bg);
                            } else if (e.action === 'delete') {
                                s._remoteDeleteBackground(e.record.id);
                            }
                        });
                } else {
                    if (e.action === 'create') {
                        if (!s.backgrounds.some((b) => b.id === bg.id)) s._remoteAddBackground(bg);
                    } else if (e.action === 'update') {
                        s._remoteUpdateBackground(e.record.id, bg);
                    } else if (e.action === 'delete') {
                        s._remoteDeleteBackground(e.record.id);
                    }
                }
            })
        );

        unsubPromises.push(
            pb.collection('dnc_worldmap_lines').subscribe('*', (e) => {
                if (e.record['map_id'] !== mapId) return;
                const s = useMapStore.getState();
                const line = recordToLine(e.record);
                if (e.action === 'create') {
                    if (!s.lines.some((l) => l.id === line.id)) s._remoteAddLine(line);
                } else if (e.action === 'update') {
                    s._remoteUpdateLine(e.record.id, line);
                } else if (e.action === 'delete') {
                    s._remoteDeleteLine(e.record.id);
                }
            })
        );

        unsubPromises.push(
            pb.collection('dnc_worldmap_drawing_strokes').subscribe('*', (e) => {
                if (e.record['map_id'] !== mapId) return;
                const s = useMapStore.getState();
                const stroke = recordToStroke(e.record);
                if (e.action === 'create') {
                    if (!s.drawingLayer.strokes.some((st) => st.id === stroke.id)) {
                        s._remoteAddStroke(stroke);
                    }
                } else if (e.action === 'delete') {
                    s._remoteDeleteStroke(e.record.id);
                }
            })
        );

        unsubPromises.push(
            pb.collection('dnc_worldmap_groups').subscribe('*', (e) => {
                if (e.record['map_id'] !== mapId) return;
                const s = useMapStore.getState();
                const group = recordToGroup(e.record);
                if (e.action === 'create') {
                    if (!s.groups.some((g) => g.id === group.id)) s._remoteAddGroup(group);
                } else if (e.action === 'update') {
                    s._remoteUpdateGroup(e.record.id, group);
                } else if (e.action === 'delete') {
                    s._remoteDeleteGroup(e.record.id);
                }
            })
        );

        return () => {
            Promise.all(unsubPromises)
                .then((unsubs) => Promise.all(unsubs.map((fn) => Promise.resolve(fn()).catch(() => {}))))
                .catch(() => {});
        };
    }, [mapId]);
}
