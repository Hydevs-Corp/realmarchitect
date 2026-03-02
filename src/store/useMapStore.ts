import { create } from 'zustand';
import { isPointInPolygon } from '../lib/geometry';
import type { POI, Zone, TextNote, Background, MapLine, MapData, MapGroup, ElementType, DrawStroke, DrawingLayerState } from '../types/map';

function genId(): string {
    return Array.from({ length: 15 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
}
import {
    fetchMapElements,
    fetchElementTypes,
    fetchDrawingStrokes,
    fetchGroups,
    createGroup as apiCreateGroup,
    updateGroupDB,
    deleteGroupDB,
    createDrawingStroke,
    deleteDrawingStroke,
    clearMapDrawingStrokes,
    updatePOI as apiUpdatePOI,
    updateZone as apiUpdateZone,
    updateNote as apiUpdateNote,
    updateBackground as apiUpdateBackground,
    updateLine as apiUpdateLine,
} from '../lib/api';

type CreationMode = 'none' | 'poi' | 'zone' | 'note' | 'background' | 'line' | 'draw';

export type SelectedElement = {
    id: string;
    kind: 'poi' | 'zone' | 'note' | 'background' | 'line' | 'drawing';
} | null;

interface MapState {
    currentMap: MapData | null;
    elementTypes: ElementType[];
    backgrounds: Background[];
    pois: POI[];
    zones: Zone[];
    notes: TextNote[];
    lines: MapLine[];
    contextMenuPos: { x: number; y: number } | null;
    selectedElement: SelectedElement;
    editMode: boolean;
    creationMode: CreationMode;

    tempCreationData: {
        x?: number;
        y?: number;
        points?: number[];
        ax?: number;
        ay?: number;
        bx?: number;
        by?: number;
    } | null;
    isCreationModalOpen: boolean;
    draftZonePoints: number[];
    draftLinePointA: { x: number; y: number } | null;

    pendingCenter: { x: number; y: number } | null;

    isElementsPanelOpen: boolean;

    drawingLayer: DrawingLayerState;

    groups: MapGroup[];

    multiSelectedIds: string[];

    setCurrentMap: (map: MapData | null) => void;
    loadMapData: (mapId: string) => Promise<void>;
    setElementTypes: (types: ElementType[]) => void;
    setContextMenuPos: (pos: { x: number; y: number } | null) => void;
    setSelectedElement: (el: SelectedElement) => void;
    toggleEditMode: () => void;
    setCreationMode: (mode: CreationMode) => void;
    setDraftZonePoints: (points: number[]) => void;
    setDraftLinePointA: (pt: { x: number; y: number } | null) => void;

    setTempCreationData: (
        data: {
            x?: number;
            y?: number;
            points?: number[];
            ax?: number;
            ay?: number;
            bx?: number;
            by?: number;
        } | null
    ) => void;
    openCreationModal: () => void;
    closeCreationModal: () => void;

    setCenterTarget: (pos: { x: number; y: number }) => void;
    clearCenterTarget: () => void;

    toggleElementLocked: (id: string) => void;
    toggleElementHidden: (id: string) => void;
    setElementHidden: (id: string, hidden: boolean) => void;
    setAllElementsHidden: (hidden: boolean) => void;
    isolateElements: (ids: string[]) => void;
    toggleElementPinned: (id: string) => void;
    setIsElementsPanelOpen: (open: boolean) => void;
    searchQuery: string;
    setSearchQuery: (q: string) => void;

    activeZoneFilterId: string | null;
    setActiveZoneFilter: (id: string | null) => void;
    getElementsInZone: (zoneId: string) => {
        pois: POI[];
        notes: TextNote[];
        backgrounds: Background[];
        lines: MapLine[];
    };

    setDrawingLayerHidden: (hidden: boolean) => void;
    setDrawingLayerLocked: (locked: boolean) => void;
    setDrawingLayerTool: (tool: DrawingLayerState['activeTool']) => void;
    setDrawingLayerColor: (color: string) => void;
    setDrawingLayerSize: (size: number) => void;
    addDrawStroke: (stroke: DrawStroke) => void;
    undoLastDrawStroke: () => void;
    clearDrawStrokes: () => void;

    addPoi: (poi: POI) => void;
    updatePoi: (id: string, updates: Partial<POI>) => void;
    deletePoi: (id: string) => void;
    addZone: (zone: Zone) => void;
    updateZone: (id: string, updates: Partial<Zone>) => void;
    deleteZone: (id: string) => void;
    addNote: (note: TextNote) => void;
    updateNote: (id: string, updates: Partial<TextNote>) => void;
    deleteNote: (id: string) => void;
    addBackground: (bg: Background) => void;
    updateBackground: (id: string, updates: Partial<Background>) => void;
    deleteBackground: (id: string) => void;
    addLine: (line: MapLine) => void;
    updateLine: (id: string, updates: Partial<MapLine>) => void;
    deleteLine: (id: string) => void;

    addGroup: (name: string, color: string, initialMemberIds?: string[]) => void;
    updateGroup: (id: string, updates: Partial<MapGroup>) => void;
    deleteGroup: (id: string) => void;
    setElementGroup: (elementId: string, groupId: string | null) => void;

    toggleMultiSelect: (id: string) => void;
    addToMultiSelect: (ids: string[]) => void;
    clearMultiSelect: () => void;

    _remoteAddStroke: (stroke: DrawStroke) => void;
    _remoteDeleteStroke: (id: string) => void;
    _remoteAddGroup: (group: MapGroup) => void;
    _remoteUpdateGroup: (id: string, updates: Partial<MapGroup>) => void;
    _remoteDeleteGroup: (id: string) => void;

    resetMapData: () => void;
}

export const useMapStore = create<MapState>((set, get) => ({
    currentMap: null,
    elementTypes: [],
    backgrounds: [],
    pois: [],
    zones: [],
    notes: [],
    lines: [],
    contextMenuPos: null,
    selectedElement: null,
    editMode: false,
    creationMode: 'none',

    tempCreationData: null,
    isCreationModalOpen: false,
    draftZonePoints: [],
    draftLinePointA: null,

    pendingCenter: null,

    isElementsPanelOpen: false,
    searchQuery: '',

    activeZoneFilterId: null,
    setActiveZoneFilter: (id) => set({ activeZoneFilterId: id }),
    getElementsInZone: (zoneId) => {
        const state = get();
        const zone = state.zones.find((z) => z.id === zoneId);
        if (!zone) {
            return { pois: [], notes: [], backgrounds: [], lines: [] };
        }
        const inPoly = (x: number, y: number) => isPointInPolygon({ x, y }, zone.points);
        return {
            pois: state.pois.filter((p) => inPoly(p.x, p.y)),
            notes: state.notes.filter((n) => inPoly(n.x, n.y)),
            backgrounds: state.backgrounds.filter((b) => inPoly(b.x, b.y)),
            lines: state.lines.filter((l) => inPoly(l.x, l.y) && inPoly(l.bx, l.by)),
        };
    },

    groups: [],
    multiSelectedIds: [],

    drawingLayer: {
        hidden: false,
        locked: false,
        strokes: [],
        activeTool: 'pen',
        activeColor: '#e03131',
        activeSize: 4,
    },

    setCurrentMap: (map) => set({ currentMap: map }),
    loadMapData: async (mapId) => {
        const [data, types, strokes, groups] = await Promise.all([fetchMapElements(mapId), fetchElementTypes(), fetchDrawingStrokes(mapId), fetchGroups(mapId)]);
        set((state) => ({
            pois: data.pois,
            zones: data.zones,
            notes: data.notes,
            backgrounds: data.backgrounds,
            lines: data.lines ?? [],
            elementTypes: types,
            drawingLayer: { ...state.drawingLayer, strokes },
            groups,
        }));
    },
    setElementTypes: (types) => set({ elementTypes: types }),
    setContextMenuPos: (pos) => set({ contextMenuPos: pos }),
    setSelectedElement: (el) => set({ selectedElement: el }),
    toggleEditMode: () => set((state) => ({ editMode: !state.editMode })),
    setCreationMode: (mode) => set({ creationMode: mode, draftZonePoints: [], draftLinePointA: null }),
    setDraftZonePoints: (points) => set({ draftZonePoints: points }),
    setDraftLinePointA: (pt) => set({ draftLinePointA: pt }),

    setTempCreationData: (data) => set({ tempCreationData: data }),
    openCreationModal: () => set({ isCreationModalOpen: true }),
    closeCreationModal: () =>
        set({
            isCreationModalOpen: false,
            tempCreationData: null,
            creationMode: 'none',
        }),

    setCenterTarget: (pos) => set({ pendingCenter: pos }),
    clearCenterTarget: () => set({ pendingCenter: null }),

    toggleElementLocked: (id) =>
        set((state) => {
            const toggle = <T extends { id: string; locked?: boolean }>(arr: T[]) => arr.map((el) => (el.id === id ? { ...el, locked: !el.locked } : el));
            const poi = state.pois.find((p) => p.id === id);
            const zone = state.zones.find((z) => z.id === id);
            const note = state.notes.find((n) => n.id === id);
            const bg = state.backgrounds.find((b) => b.id === id);
            const line = state.lines.find((l) => l.id === id);
            const newVal = !(poi ?? zone ?? note ?? bg ?? line)?.locked;
            if (poi) apiUpdatePOI(id, { locked: newVal }).catch(console.error);
            else if (zone) apiUpdateZone(id, { locked: newVal }).catch(console.error);
            else if (note) apiUpdateNote(id, { locked: newVal }).catch(console.error);
            else if (bg) apiUpdateBackground(id, { locked: newVal }).catch(console.error);
            else if (line) apiUpdateLine(id, { locked: newVal }).catch(console.error);
            return {
                pois: toggle(state.pois),
                zones: toggle(state.zones),
                notes: toggle(state.notes),
                backgrounds: toggle(state.backgrounds),
                lines: toggle(state.lines),
            };
        }),
    toggleElementHidden: (id) =>
        set((state) => {
            const toggle = <T extends { id: string; hidden?: boolean }>(arr: T[]) => arr.map((el) => (el.id === id ? { ...el, hidden: !el.hidden } : el));
            const poi = state.pois.find((p) => p.id === id);
            const zone = state.zones.find((z) => z.id === id);
            const note = state.notes.find((n) => n.id === id);
            const bg = state.backgrounds.find((b) => b.id === id);
            const line = state.lines.find((l) => l.id === id);
            const newVal = !(poi ?? zone ?? note ?? bg ?? line)?.hidden;
            if (poi) apiUpdatePOI(id, { hidden: newVal }).catch(console.error);
            else if (zone) apiUpdateZone(id, { hidden: newVal }).catch(console.error);
            else if (note) apiUpdateNote(id, { hidden: newVal }).catch(console.error);
            else if (bg) apiUpdateBackground(id, { hidden: newVal }).catch(console.error);
            else if (line) apiUpdateLine(id, { hidden: newVal }).catch(console.error);
            return {
                pois: toggle(state.pois),
                zones: toggle(state.zones),
                notes: toggle(state.notes),
                backgrounds: toggle(state.backgrounds),
                lines: toggle(state.lines),
            };
        }),
    setElementHidden: (id, hidden) =>
        set((state) => {
            const apply = <T extends { id: string; hidden?: boolean }>(arr: T[]) => arr.map((el) => (el.id === id ? { ...el, hidden } : el));
            const poi = state.pois.find((p) => p.id === id);
            const zone = state.zones.find((z) => z.id === id);
            const note = state.notes.find((n) => n.id === id);
            const bg = state.backgrounds.find((b) => b.id === id);
            const line = state.lines.find((l) => l.id === id);
            if (poi) apiUpdatePOI(id, { hidden }).catch(console.error);
            else if (zone) apiUpdateZone(id, { hidden }).catch(console.error);
            else if (note) apiUpdateNote(id, { hidden }).catch(console.error);
            else if (bg) apiUpdateBackground(id, { hidden }).catch(console.error);
            else if (line) apiUpdateLine(id, { hidden }).catch(console.error);
            return {
                pois: apply(state.pois),
                zones: apply(state.zones),
                notes: apply(state.notes),
                backgrounds: apply(state.backgrounds),
                lines: apply(state.lines),
            };
        }),
    setAllElementsHidden: (hidden) =>
        set((state) => {
            const shouldHide = (pinned?: boolean) => (hidden && !!pinned ? false : hidden);
            for (const poi of state.pois) apiUpdatePOI(poi.id, { hidden: shouldHide(poi.pinned) }).catch(console.error);
            for (const zone of state.zones) apiUpdateZone(zone.id, { hidden: shouldHide(zone.pinned) }).catch(console.error);
            for (const note of state.notes) apiUpdateNote(note.id, { hidden: shouldHide(note.pinned) }).catch(console.error);
            for (const bg of state.backgrounds) apiUpdateBackground(bg.id, { hidden: shouldHide(bg.pinned) }).catch(console.error);
            for (const line of state.lines) apiUpdateLine(line.id, { hidden: shouldHide(line.pinned) }).catch(console.error);
            return {
                pois: state.pois.map((p) => ({ ...p, hidden: shouldHide(p.pinned) })),
                zones: state.zones.map((z) => ({ ...z, hidden: shouldHide(z.pinned) })),
                notes: state.notes.map((n) => ({ ...n, hidden: shouldHide(n.pinned) })),
                backgrounds: state.backgrounds.map((b) => ({
                    ...b,
                    hidden: shouldHide(b.pinned),
                })),
                lines: state.lines.map((l) => ({ ...l, hidden: shouldHide(l.pinned) })),
            };
        }),
    isolateElements: (ids) =>
        set((state) => {
            const kept = new Set(ids);
            const h = <T extends { id: string; pinned?: boolean }>(el: T) => (el.pinned ? false : !kept.has(el.id));
            const applyHidden = <T extends { id: string; pinned?: boolean }>(arr: T[]) => arr.map((el) => ({ ...el, hidden: h(el) }));
            for (const p of state.pois) apiUpdatePOI(p.id, { hidden: h(p) }).catch(console.error);
            for (const z of state.zones) apiUpdateZone(z.id, { hidden: h(z) }).catch(console.error);
            for (const n of state.notes) apiUpdateNote(n.id, { hidden: h(n) }).catch(console.error);
            for (const b of state.backgrounds) apiUpdateBackground(b.id, { hidden: h(b) }).catch(console.error);
            for (const l of state.lines) apiUpdateLine(l.id, { hidden: h(l) }).catch(console.error);
            return {
                pois: applyHidden(state.pois),
                zones: applyHidden(state.zones),
                notes: applyHidden(state.notes),
                backgrounds: applyHidden(state.backgrounds),
                lines: applyHidden(state.lines),
            };
        }),
    toggleElementPinned: (id) =>
        set((state) => {
            const toggle = <T extends { id: string; pinned?: boolean }>(arr: T[]) => arr.map((el) => (el.id === id ? { ...el, pinned: !el.pinned } : el));
            const poi = state.pois.find((p) => p.id === id);
            const zone = state.zones.find((z) => z.id === id);
            const note = state.notes.find((n) => n.id === id);
            const bg = state.backgrounds.find((b) => b.id === id);
            const line = state.lines.find((l) => l.id === id);
            const newVal = !(poi ?? zone ?? note ?? bg ?? line)?.pinned;
            if (poi) apiUpdatePOI(id, { pinned: newVal }).catch(console.error);
            else if (zone) apiUpdateZone(id, { pinned: newVal }).catch(console.error);
            else if (note) apiUpdateNote(id, { pinned: newVal }).catch(console.error);
            else if (bg) apiUpdateBackground(id, { pinned: newVal }).catch(console.error);
            else if (line) apiUpdateLine(id, { pinned: newVal }).catch(console.error);
            return {
                pois: toggle(state.pois),
                zones: toggle(state.zones),
                notes: toggle(state.notes),
                backgrounds: toggle(state.backgrounds),
                lines: toggle(state.lines),
            };
        }),
    setIsElementsPanelOpen: (open) => set({ isElementsPanelOpen: open }),
    setSearchQuery: (q) => set({ searchQuery: q }),

    setDrawingLayerHidden: (hidden) => set((state) => ({ drawingLayer: { ...state.drawingLayer, hidden } })),
    setDrawingLayerLocked: (locked) => set((state) => ({ drawingLayer: { ...state.drawingLayer, locked } })),
    setDrawingLayerTool: (tool) =>
        set((state) => ({
            drawingLayer: { ...state.drawingLayer, activeTool: tool },
        })),
    setDrawingLayerColor: (color) =>
        set((state) => ({
            drawingLayer: { ...state.drawingLayer, activeColor: color },
        })),
    setDrawingLayerSize: (size) =>
        set((state) => ({
            drawingLayer: { ...state.drawingLayer, activeSize: size },
        })),
    addDrawStroke: (stroke) =>
        set((state) => {
            if (state.drawingLayer.strokes.some((s) => s.id === stroke.id)) return state;
            const mapId = state.currentMap?.id;
            if (mapId) createDrawingStroke(mapId, stroke).catch(console.error);
            return {
                drawingLayer: {
                    ...state.drawingLayer,
                    strokes: [...state.drawingLayer.strokes, stroke],
                },
            };
        }),
    undoLastDrawStroke: () =>
        set((state) => {
            const last = state.drawingLayer.strokes[state.drawingLayer.strokes.length - 1];
            if (last) deleteDrawingStroke(last.id).catch(console.error);
            return {
                drawingLayer: {
                    ...state.drawingLayer,
                    strokes: state.drawingLayer.strokes.slice(0, -1),
                },
            };
        }),
    clearDrawStrokes: () =>
        set((state) => {
            const mapId = state.currentMap?.id;
            if (mapId) clearMapDrawingStrokes(mapId).catch(console.error);
            return {
                drawingLayer: { ...state.drawingLayer, strokes: [] },
            };
        }),

    addPoi: (poi) =>
        set((state) => {
            if (state.pois.some((p) => p.id === poi.id)) return state;
            return { pois: [...state.pois, poi] };
        }),
    updatePoi: (id, updates) =>
        set((state) => ({
            pois: state.pois.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),
    deletePoi: (id) =>
        set((state) => ({
            pois: state.pois.filter((p) => p.id !== id),
            selectedElement: state.selectedElement?.id === id ? null : state.selectedElement,
        })),
    addZone: (zone) =>
        set((state) => {
            if (state.zones.some((z) => z.id === zone.id)) return state;
            return { zones: [...state.zones, zone] };
        }),
    updateZone: (id, updates) =>
        set((state) => ({
            zones: state.zones.map((z) => (z.id === id ? { ...z, ...updates } : z)),
        })),
    deleteZone: (id) =>
        set((state) => ({
            zones: state.zones.filter((z) => z.id !== id),
            selectedElement: state.selectedElement?.id === id ? null : state.selectedElement,
        })),
    addNote: (note) =>
        set((state) => {
            if (state.notes.some((n) => n.id === note.id)) return state;
            return { notes: [...state.notes, note] };
        }),
    updateNote: (id, updates) =>
        set((state) => ({
            notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
        })),
    deleteNote: (id) =>
        set((state) => ({
            notes: state.notes.filter((n) => n.id !== id),
            selectedElement: state.selectedElement?.id === id ? null : state.selectedElement,
        })),
    addBackground: (bg) =>
        set((state) => {
            if (state.backgrounds.some((b) => b.id === bg.id)) return state;
            return { backgrounds: [...state.backgrounds, bg] };
        }),
    updateBackground: (id, updates) =>
        set((state) => ({
            backgrounds: state.backgrounds.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        })),
    deleteBackground: (id) =>
        set((state) => ({
            backgrounds: state.backgrounds.filter((b) => b.id !== id),
            selectedElement: state.selectedElement?.id === id ? null : state.selectedElement,
        })),
    addLine: (line) =>
        set((state) => {
            if (state.lines.some((l) => l.id === line.id)) return state;
            return { lines: [...state.lines, line] };
        }),
    updateLine: (id, updates) =>
        set((state) => ({
            lines: state.lines.map((l) => (l.id === id ? { ...l, ...updates } : l)),
        })),
    deleteLine: (id) =>
        set((state) => ({
            lines: state.lines.filter((l) => l.id !== id),
            selectedElement: state.selectedElement?.id === id ? null : state.selectedElement,
        })),
    addGroup: (name, color, initialMemberIds = []) =>
        set((state) => {
            const mapId = state.currentMap?.id;
            if (!mapId) return state;
            let id = genId();
            while (state.groups.some((g) => g.id === id)) id = genId();
            const newGroup: MapGroup = {
                id,
                mapId,
                name,
                color,
                hidden: false,
                locked: false,
                pinned: false,
                collapsed: false,
                memberIds: initialMemberIds,
            };
            const updatedGroups = state.groups.map((g) => {
                const removed = g.memberIds.filter((mid) => initialMemberIds.includes(mid));
                if (removed.length === 0) return g;
                const newMemberIds = g.memberIds.filter((mid) => !initialMemberIds.includes(mid));
                updateGroupDB(g.id, { memberIds: newMemberIds }).catch(console.error);
                return { ...g, memberIds: newMemberIds };
            });
            apiCreateGroup(newGroup).catch(console.error);
            return { groups: [...updatedGroups, newGroup] };
        }),

    updateGroup: (id, updates) =>
        set((state) => {
            updateGroupDB(id, updates).catch(console.error);
            return {
                groups: state.groups.map((g) => (g.id === id ? { ...g, ...updates } : g)),
            };
        }),

    deleteGroup: (id) =>
        set((state) => {
            deleteGroupDB(id).catch(console.error);
            return { groups: state.groups.filter((g) => g.id !== id) };
        }),

    setElementGroup: (elementId, groupId) =>
        set((state) => {
            const updatedGroups = state.groups.map((g) => {
                const wasIn = g.memberIds.includes(elementId);
                const willBeIn = g.id === groupId;
                if (!wasIn && !willBeIn) return g;
                const newMemberIds = wasIn ? g.memberIds.filter((mid) => mid !== elementId) : [...g.memberIds, elementId];
                if (!willBeIn || wasIn) {
                    updateGroupDB(g.id, {
                        memberIds: g.memberIds.filter((mid) => mid !== elementId),
                    }).catch(console.error);
                }
                if (willBeIn && !wasIn) {
                    updateGroupDB(g.id, {
                        memberIds: [...g.memberIds, elementId],
                    }).catch(console.error);
                }
                return { ...g, memberIds: newMemberIds };
            });
            return { groups: updatedGroups };
        }),

    _remoteAddStroke: (stroke) =>
        set((state) => {
            if (state.drawingLayer.strokes.some((s) => s.id === stroke.id)) return state;
            return {
                drawingLayer: {
                    ...state.drawingLayer,
                    strokes: [...state.drawingLayer.strokes, stroke],
                },
            };
        }),
    _remoteDeleteStroke: (id) =>
        set((state) => ({
            drawingLayer: {
                ...state.drawingLayer,
                strokes: state.drawingLayer.strokes.filter((s) => s.id !== id),
            },
        })),
    _remoteAddGroup: (group) =>
        set((state) => {
            if (state.groups.some((g) => g.id === group.id)) return state;
            return { groups: [...state.groups, group] };
        }),
    _remoteUpdateGroup: (id, updates) =>
        set((state) => ({
            groups: state.groups.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        })),
    _remoteDeleteGroup: (id) => set((state) => ({ groups: state.groups.filter((g) => g.id !== id) })),

    resetMapData: () =>
        set((state) => ({
            currentMap: null,
            pois: [],
            zones: [],
            notes: [],
            backgrounds: [],
            lines: [],
            groups: [],
            selectedElement: null,
            multiSelectedIds: [],
            creationMode: 'none',
            draftZonePoints: [],
            draftLinePointA: null,
            tempCreationData: null,
            isCreationModalOpen: false,
            drawingLayer: { ...state.drawingLayer, strokes: [] },
        })),

    toggleMultiSelect: (id) =>
        set((state) => {
            if (state.multiSelectedIds.includes(id)) {
                return {
                    multiSelectedIds: state.multiSelectedIds.filter((mid) => mid !== id),
                };
            }
            if (state.multiSelectedIds.length === 0 && state.selectedElement && state.selectedElement.id !== id) {
                return { multiSelectedIds: [state.selectedElement.id, id] };
            }
            return { multiSelectedIds: [...state.multiSelectedIds, id] };
        }),

    addToMultiSelect: (ids) =>
        set((state) => ({
            multiSelectedIds: [...state.multiSelectedIds, ...ids.filter((id) => !state.multiSelectedIds.includes(id))],
        })),

    clearMultiSelect: () => set({ multiSelectedIds: [] }),
}));
