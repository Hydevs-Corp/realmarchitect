import { create } from 'zustand';
import { isPointInPolygon } from '../lib/geometry';
import type { POI, Zone, TextNote, Background, MapLine, MapData, MapGroup, ElementType, DrawStroke, DrawingLayerState, HistoryEntry, HistorySnapshot } from '../types/map';

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
    createPOI as apiCreatePOI,
    createZone as apiCreateZone,
    createNote as apiCreateNote,
    createLine as apiCreateLine,
    updatePOI as apiUpdatePOI,
    updateZone as apiUpdateZone,
    updateNote as apiUpdateNote,
    updateBackground as apiUpdateBackground,
    updateLine as apiUpdateLine,
    deletePOI as apiDeletePOI,
    deleteZone as apiDeleteZone,
    deleteNote as apiDeleteNote,
    deleteBackground as apiDeleteBackground,
    deleteLine as apiDeleteLine,
    recreatePOI as apiRecreatePOI,
    recreateZone as apiRecreateZone,
    recreateNote as apiRecreateNote,
    recreateBackground as apiRecreateBackground,
    recreateLine as apiRecreateLine,
} from '../lib/api';

export interface ClipboardPayload {
    pois: POI[];
    zones: Zone[];
    notes: TextNote[];
    lines: MapLine[];
}

const MAX_HISTORY = 100;

function pushHistory(stack: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
    const next = [...stack, entry];
    return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
}

async function syncHistoryDiff(mapId: string, from: HistorySnapshot, to: HistorySnapshot): Promise<void> {
    const ops: Promise<unknown>[] = [];

    function diff<T extends { id: string }>(
        fromArr: T[] | undefined,
        toArr: T[] | undefined,
        create: (item: T) => Promise<unknown>,
        update: (item: T) => Promise<unknown>,
        del: (id: string) => Promise<unknown>
    ) {
        if (fromArr === undefined && toArr === undefined) return;
        const f = fromArr ?? [];
        const t = toArr ?? [];
        const fMap = new Map(f.map((x) => [x.id, x]));
        const tMap = new Map(t.map((x) => [x.id, x]));
        for (const item of t) {
            const fItem = fMap.get(item.id);
            if (!fItem) ops.push(create(item));
            else if (JSON.stringify(fItem) !== JSON.stringify(item)) ops.push(update(item));
        }
        for (const item of f) {
            if (!tMap.has(item.id)) ops.push(del(item.id));
        }
    }

    diff(from.pois, to.pois, apiRecreatePOI, (p) => apiUpdatePOI(p.id, p), apiDeletePOI);
    diff(from.zones, to.zones, apiRecreateZone, (z) => apiUpdateZone(z.id, z), apiDeleteZone);
    diff(from.notes, to.notes, apiRecreateNote, (n) => apiUpdateNote(n.id, n), apiDeleteNote);
    diff(from.backgrounds, to.backgrounds, apiRecreateBackground, (b) => apiUpdateBackground(b.id, b), apiDeleteBackground);
    diff(from.lines, to.lines, apiRecreateLine, (l) => apiUpdateLine(l.id, l), apiDeleteLine);
    diff(
        from.groups,
        to.groups,
        (g) => apiCreateGroup(g),
        (g) => updateGroupDB(g.id, g),
        deleteGroupDB
    );
    diff(
        from.drawStrokes,
        to.drawStrokes,
        (s) => createDrawingStroke(mapId, s),
        () => Promise.resolve(),
        deleteDrawingStroke
    );

    await Promise.allSettled(ops);
}

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

    undoStack: HistoryEntry[];
    redoStack: HistoryEntry[];

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
    clearDrawStrokes: () => void;

    undo: () => void;
    redo: () => void;

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

    _remoteAddPoi: (poi: POI) => void;
    _remoteUpdatePoi: (id: string, updates: Partial<POI>) => void;
    _remoteDeletePoi: (id: string) => void;
    _remoteAddZone: (zone: Zone) => void;
    _remoteUpdateZone: (id: string, updates: Partial<Zone>) => void;
    _remoteDeleteZone: (id: string) => void;
    _remoteAddNote: (note: TextNote) => void;
    _remoteUpdateNote: (id: string, updates: Partial<TextNote>) => void;
    _remoteDeleteNote: (id: string) => void;
    _remoteAddBackground: (bg: Background) => void;
    _remoteUpdateBackground: (id: string, updates: Partial<Background>) => void;
    _remoteDeleteBackground: (id: string) => void;
    _remoteAddLine: (line: MapLine) => void;
    _remoteUpdateLine: (id: string, updates: Partial<MapLine>) => void;
    _remoteDeleteLine: (id: string) => void;
    _remoteAddStroke: (stroke: DrawStroke) => void;
    _remoteDeleteStroke: (id: string) => void;
    _remoteAddGroup: (group: MapGroup) => void;
    _remoteUpdateGroup: (id: string, updates: Partial<MapGroup>) => void;
    _remoteDeleteGroup: (id: string) => void;

    resetMapData: () => void;

    clipboard: ClipboardPayload | null;
    copySelected: () => void;
    paste: (offsetX?: number, offsetY?: number) => Promise<void>;
    duplicateSelected: () => Promise<void>;
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

    undoStack: [],
    redoStack: [],

    clipboard: null,

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
            undoStack: [],
            redoStack: [],
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
            const newPois = toggle(state.pois);
            const newZones = toggle(state.zones);
            const newNotes = toggle(state.notes);
            const newBgs = toggle(state.backgrounds);
            const newLines = toggle(state.lines);
            const entry: HistoryEntry = {
                before: { pois: state.pois, zones: state.zones, notes: state.notes, backgrounds: state.backgrounds, lines: state.lines },
                after: { pois: newPois, zones: newZones, notes: newNotes, backgrounds: newBgs, lines: newLines },
            };
            return {
                pois: newPois,
                zones: newZones,
                notes: newNotes,
                backgrounds: newBgs,
                lines: newLines,
                undoStack: pushHistory(state.undoStack, entry),
                redoStack: [],
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
            const newPois = toggle(state.pois);
            const newZones = toggle(state.zones);
            const newNotes = toggle(state.notes);
            const newBgs = toggle(state.backgrounds);
            const newLines = toggle(state.lines);
            const entry: HistoryEntry = {
                before: { pois: state.pois, zones: state.zones, notes: state.notes, backgrounds: state.backgrounds, lines: state.lines },
                after: { pois: newPois, zones: newZones, notes: newNotes, backgrounds: newBgs, lines: newLines },
            };
            return {
                pois: newPois,
                zones: newZones,
                notes: newNotes,
                backgrounds: newBgs,
                lines: newLines,
                undoStack: pushHistory(state.undoStack, entry),
                redoStack: [],
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
            const newPois = apply(state.pois);
            const newZones = apply(state.zones);
            const newNotes = apply(state.notes);
            const newBgs = apply(state.backgrounds);
            const newLines = apply(state.lines);
            const entry: HistoryEntry = {
                before: { pois: state.pois, zones: state.zones, notes: state.notes, backgrounds: state.backgrounds, lines: state.lines },
                after: { pois: newPois, zones: newZones, notes: newNotes, backgrounds: newBgs, lines: newLines },
            };
            return {
                pois: newPois,
                zones: newZones,
                notes: newNotes,
                backgrounds: newBgs,
                lines: newLines,
                undoStack: pushHistory(state.undoStack, entry),
                redoStack: [],
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
            const newPois = state.pois.map((p) => ({ ...p, hidden: shouldHide(p.pinned) }));
            const newZones = state.zones.map((z) => ({ ...z, hidden: shouldHide(z.pinned) }));
            const newNotes = state.notes.map((n) => ({ ...n, hidden: shouldHide(n.pinned) }));
            const newBgs = state.backgrounds.map((b) => ({ ...b, hidden: shouldHide(b.pinned) }));
            const newLines = state.lines.map((l) => ({ ...l, hidden: shouldHide(l.pinned) }));
            const entry: HistoryEntry = {
                before: { pois: state.pois, zones: state.zones, notes: state.notes, backgrounds: state.backgrounds, lines: state.lines },
                after: { pois: newPois, zones: newZones, notes: newNotes, backgrounds: newBgs, lines: newLines },
            };
            return {
                pois: newPois,
                zones: newZones,
                notes: newNotes,
                backgrounds: newBgs,
                lines: newLines,
                undoStack: pushHistory(state.undoStack, entry),
                redoStack: [],
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
            const newPois = applyHidden(state.pois);
            const newZones = applyHidden(state.zones);
            const newNotes = applyHidden(state.notes);
            const newBgs = applyHidden(state.backgrounds);
            const newLines = applyHidden(state.lines);
            const entry: HistoryEntry = {
                before: { pois: state.pois, zones: state.zones, notes: state.notes, backgrounds: state.backgrounds, lines: state.lines },
                after: { pois: newPois, zones: newZones, notes: newNotes, backgrounds: newBgs, lines: newLines },
            };
            return {
                pois: newPois,
                zones: newZones,
                notes: newNotes,
                backgrounds: newBgs,
                lines: newLines,
                undoStack: pushHistory(state.undoStack, entry),
                redoStack: [],
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
            const newPois = toggle(state.pois);
            const newZones = toggle(state.zones);
            const newNotes = toggle(state.notes);
            const newBgs = toggle(state.backgrounds);
            const newLines = toggle(state.lines);
            const entry: HistoryEntry = {
                before: { pois: state.pois, zones: state.zones, notes: state.notes, backgrounds: state.backgrounds, lines: state.lines },
                after: { pois: newPois, zones: newZones, notes: newNotes, backgrounds: newBgs, lines: newLines },
            };
            return {
                pois: newPois,
                zones: newZones,
                notes: newNotes,
                backgrounds: newBgs,
                lines: newLines,
                undoStack: pushHistory(state.undoStack, entry),
                redoStack: [],
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
            const newStrokes = [...state.drawingLayer.strokes, stroke];
            const entry: HistoryEntry = {
                before: { drawStrokes: state.drawingLayer.strokes },
                after: { drawStrokes: newStrokes },
            };
            return {
                drawingLayer: { ...state.drawingLayer, strokes: newStrokes },
                undoStack: pushHistory(state.undoStack, entry),
                redoStack: [],
            };
        }),
    clearDrawStrokes: () =>
        set((state) => {
            const mapId = state.currentMap?.id;
            if (mapId) clearMapDrawingStrokes(mapId).catch(console.error);
            const entry: HistoryEntry = {
                before: { drawStrokes: state.drawingLayer.strokes },
                after: { drawStrokes: [] },
            };
            return {
                drawingLayer: { ...state.drawingLayer, strokes: [] },
                undoStack: pushHistory(state.undoStack, entry),
                redoStack: [],
            };
        }),

    addPoi: (poi) =>
        set((state) => {
            if (state.pois.some((p) => p.id === poi.id)) return state;
            const newPois = [...state.pois, poi];
            const entry: HistoryEntry = { before: { pois: state.pois }, after: { pois: newPois } };
            return { pois: newPois, undoStack: pushHistory(state.undoStack, entry), redoStack: [] };
        }),
    updatePoi: (id, updates) =>
        set((state) => {
            const newPois = state.pois.map((p) => (p.id === id ? { ...p, ...updates } : p));
            const entry: HistoryEntry = { before: { pois: state.pois }, after: { pois: newPois } };
            return { pois: newPois, undoStack: pushHistory(state.undoStack, entry), redoStack: [] };
        }),
    deletePoi: (id) =>
        set((state) => {
            const newPois = state.pois.filter((p) => p.id !== id);
            const entry: HistoryEntry = { before: { pois: state.pois }, after: { pois: newPois } };
            return {
                pois: newPois,
                selectedElement: state.selectedElement?.id === id ? null : state.selectedElement,
                undoStack: pushHistory(state.undoStack, entry),
                redoStack: [],
            };
        }),
    addZone: (zone) =>
        set((state) => {
            if (state.zones.some((z) => z.id === zone.id)) return state;
            const newZones = [...state.zones, zone];
            const entry: HistoryEntry = { before: { zones: state.zones }, after: { zones: newZones } };
            return { zones: newZones, undoStack: pushHistory(state.undoStack, entry), redoStack: [] };
        }),
    updateZone: (id, updates) =>
        set((state) => {
            const newZones = state.zones.map((z) => (z.id === id ? { ...z, ...updates } : z));
            const entry: HistoryEntry = { before: { zones: state.zones }, after: { zones: newZones } };
            return { zones: newZones, undoStack: pushHistory(state.undoStack, entry), redoStack: [] };
        }),
    deleteZone: (id) =>
        set((state) => {
            const newZones = state.zones.filter((z) => z.id !== id);
            const entry: HistoryEntry = { before: { zones: state.zones }, after: { zones: newZones } };
            return {
                zones: newZones,
                selectedElement: state.selectedElement?.id === id ? null : state.selectedElement,
                undoStack: pushHistory(state.undoStack, entry),
                redoStack: [],
            };
        }),
    addNote: (note) =>
        set((state) => {
            if (state.notes.some((n) => n.id === note.id)) return state;
            const newNotes = [...state.notes, note];
            const entry: HistoryEntry = { before: { notes: state.notes }, after: { notes: newNotes } };
            return { notes: newNotes, undoStack: pushHistory(state.undoStack, entry), redoStack: [] };
        }),
    updateNote: (id, updates) =>
        set((state) => {
            const newNotes = state.notes.map((n) => (n.id === id ? { ...n, ...updates } : n));
            const entry: HistoryEntry = { before: { notes: state.notes }, after: { notes: newNotes } };
            return { notes: newNotes, undoStack: pushHistory(state.undoStack, entry), redoStack: [] };
        }),
    deleteNote: (id) =>
        set((state) => {
            const newNotes = state.notes.filter((n) => n.id !== id);
            const entry: HistoryEntry = { before: { notes: state.notes }, after: { notes: newNotes } };
            return {
                notes: newNotes,
                selectedElement: state.selectedElement?.id === id ? null : state.selectedElement,
                undoStack: pushHistory(state.undoStack, entry),
                redoStack: [],
            };
        }),
    addBackground: (bg) =>
        set((state) => {
            if (state.backgrounds.some((b) => b.id === bg.id)) return state;
            const newBgs = [...state.backgrounds, bg];
            const entry: HistoryEntry = { before: { backgrounds: state.backgrounds }, after: { backgrounds: newBgs } };
            return { backgrounds: newBgs, undoStack: pushHistory(state.undoStack, entry), redoStack: [] };
        }),
    updateBackground: (id, updates) =>
        set((state) => {
            const newBgs = state.backgrounds.map((b) => (b.id === id ? { ...b, ...updates } : b));
            const entry: HistoryEntry = { before: { backgrounds: state.backgrounds }, after: { backgrounds: newBgs } };
            return { backgrounds: newBgs, undoStack: pushHistory(state.undoStack, entry), redoStack: [] };
        }),
    deleteBackground: (id) =>
        set((state) => {
            const newBgs = state.backgrounds.filter((b) => b.id !== id);
            const entry: HistoryEntry = { before: { backgrounds: state.backgrounds }, after: { backgrounds: newBgs } };
            return {
                backgrounds: newBgs,
                selectedElement: state.selectedElement?.id === id ? null : state.selectedElement,
                undoStack: pushHistory(state.undoStack, entry),
                redoStack: [],
            };
        }),
    addLine: (line) =>
        set((state) => {
            if (state.lines.some((l) => l.id === line.id)) return state;
            const newLines = [...state.lines, line];
            const entry: HistoryEntry = { before: { lines: state.lines }, after: { lines: newLines } };
            return { lines: newLines, undoStack: pushHistory(state.undoStack, entry), redoStack: [] };
        }),
    updateLine: (id, updates) =>
        set((state) => {
            const newLines = state.lines.map((l) => (l.id === id ? { ...l, ...updates } : l));
            const entry: HistoryEntry = { before: { lines: state.lines }, after: { lines: newLines } };
            return { lines: newLines, undoStack: pushHistory(state.undoStack, entry), redoStack: [] };
        }),
    deleteLine: (id) =>
        set((state) => {
            const newLines = state.lines.filter((l) => l.id !== id);
            const entry: HistoryEntry = { before: { lines: state.lines }, after: { lines: newLines } };
            return {
                lines: newLines,
                selectedElement: state.selectedElement?.id === id ? null : state.selectedElement,
                undoStack: pushHistory(state.undoStack, entry),
                redoStack: [],
            };
        }),
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
            const newGroups = [...updatedGroups, newGroup];
            const entry: HistoryEntry = { before: { groups: state.groups }, after: { groups: newGroups } };
            return { groups: newGroups, undoStack: pushHistory(state.undoStack, entry), redoStack: [] };
        }),

    updateGroup: (id, updates) =>
        set((state) => {
            updateGroupDB(id, updates).catch(console.error);
            const newGroups = state.groups.map((g) => (g.id === id ? { ...g, ...updates } : g));
            const entry: HistoryEntry = { before: { groups: state.groups }, after: { groups: newGroups } };
            return { groups: newGroups, undoStack: pushHistory(state.undoStack, entry), redoStack: [] };
        }),

    deleteGroup: (id) =>
        set((state) => {
            deleteGroupDB(id).catch(console.error);
            const newGroups = state.groups.filter((g) => g.id !== id);
            const entry: HistoryEntry = { before: { groups: state.groups }, after: { groups: newGroups } };
            return { groups: newGroups, undoStack: pushHistory(state.undoStack, entry), redoStack: [] };
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
            const entry: HistoryEntry = { before: { groups: state.groups }, after: { groups: updatedGroups } };
            return { groups: updatedGroups, undoStack: pushHistory(state.undoStack, entry), redoStack: [] };
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

    _remoteAddPoi: (poi) =>
        set((state) => {
            if (state.pois.some((p) => p.id === poi.id)) return state;
            return { pois: [...state.pois, poi] };
        }),
    _remoteUpdatePoi: (id, updates) => set((state) => ({ pois: state.pois.map((p) => (p.id === id ? { ...p, ...updates } : p)) })),
    _remoteDeletePoi: (id) =>
        set((state) => ({
            pois: state.pois.filter((p) => p.id !== id),
            selectedElement: state.selectedElement?.id === id ? null : state.selectedElement,
        })),

    _remoteAddZone: (zone) =>
        set((state) => {
            if (state.zones.some((z) => z.id === zone.id)) return state;
            return { zones: [...state.zones, zone] };
        }),
    _remoteUpdateZone: (id, updates) => set((state) => ({ zones: state.zones.map((z) => (z.id === id ? { ...z, ...updates } : z)) })),
    _remoteDeleteZone: (id) =>
        set((state) => ({
            zones: state.zones.filter((z) => z.id !== id),
            selectedElement: state.selectedElement?.id === id ? null : state.selectedElement,
        })),

    _remoteAddNote: (note) =>
        set((state) => {
            if (state.notes.some((n) => n.id === note.id)) return state;
            return { notes: [...state.notes, note] };
        }),
    _remoteUpdateNote: (id, updates) => set((state) => ({ notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)) })),
    _remoteDeleteNote: (id) =>
        set((state) => ({
            notes: state.notes.filter((n) => n.id !== id),
            selectedElement: state.selectedElement?.id === id ? null : state.selectedElement,
        })),

    _remoteAddBackground: (bg) =>
        set((state) => {
            if (state.backgrounds.some((b) => b.id === bg.id)) return state;
            return { backgrounds: [...state.backgrounds, bg] };
        }),
    _remoteUpdateBackground: (id, updates) => set((state) => ({ backgrounds: state.backgrounds.map((b) => (b.id === id ? { ...b, ...updates } : b)) })),
    _remoteDeleteBackground: (id) =>
        set((state) => ({
            backgrounds: state.backgrounds.filter((b) => b.id !== id),
            selectedElement: state.selectedElement?.id === id ? null : state.selectedElement,
        })),

    _remoteAddLine: (line) =>
        set((state) => {
            if (state.lines.some((l) => l.id === line.id)) return state;
            return { lines: [...state.lines, line] };
        }),
    _remoteUpdateLine: (id, updates) => set((state) => ({ lines: state.lines.map((l) => (l.id === id ? { ...l, ...updates } : l)) })),
    _remoteDeleteLine: (id) =>
        set((state) => ({
            lines: state.lines.filter((l) => l.id !== id),
            selectedElement: state.selectedElement?.id === id ? null : state.selectedElement,
        })),

    undo: () =>
        set((state) => {
            const entry = state.undoStack[state.undoStack.length - 1];
            if (!entry) return state;
            const mapId = state.currentMap?.id ?? '';
            syncHistoryDiff(mapId, entry.after, entry.before).catch(console.error);
            const snap = entry.before;
            let selectedElement = state.selectedElement;
            if (selectedElement) {
                const { id, kind } = selectedElement;
                const stillExists =
                    (kind === 'poi' && (snap.pois === undefined || snap.pois.some((p) => p.id === id))) ||
                    (kind === 'zone' && (snap.zones === undefined || snap.zones.some((z) => z.id === id))) ||
                    (kind === 'note' && (snap.notes === undefined || snap.notes.some((n) => n.id === id))) ||
                    (kind === 'background' && (snap.backgrounds === undefined || snap.backgrounds.some((b) => b.id === id))) ||
                    (kind === 'line' && (snap.lines === undefined || snap.lines.some((l) => l.id === id))) ||
                    kind === 'drawing';
                if (!stillExists) selectedElement = null;
            }
            return {
                ...(snap.pois !== undefined ? { pois: snap.pois } : {}),
                ...(snap.zones !== undefined ? { zones: snap.zones } : {}),
                ...(snap.notes !== undefined ? { notes: snap.notes } : {}),
                ...(snap.backgrounds !== undefined ? { backgrounds: snap.backgrounds } : {}),
                ...(snap.lines !== undefined ? { lines: snap.lines } : {}),
                ...(snap.groups !== undefined ? { groups: snap.groups } : {}),
                ...(snap.drawStrokes !== undefined ? { drawingLayer: { ...state.drawingLayer, strokes: snap.drawStrokes } } : {}),
                selectedElement,
                undoStack: state.undoStack.slice(0, -1),
                redoStack: [...state.redoStack, entry],
            };
        }),

    redo: () =>
        set((state) => {
            const entry = state.redoStack[state.redoStack.length - 1];
            if (!entry) return state;
            const mapId = state.currentMap?.id ?? '';
            syncHistoryDiff(mapId, entry.before, entry.after).catch(console.error);
            const snap = entry.after;
            let selectedElement = state.selectedElement;
            if (selectedElement) {
                const { id, kind } = selectedElement;
                const stillExists =
                    (kind === 'poi' && (snap.pois === undefined || snap.pois.some((p) => p.id === id))) ||
                    (kind === 'zone' && (snap.zones === undefined || snap.zones.some((z) => z.id === id))) ||
                    (kind === 'note' && (snap.notes === undefined || snap.notes.some((n) => n.id === id))) ||
                    (kind === 'background' && (snap.backgrounds === undefined || snap.backgrounds.some((b) => b.id === id))) ||
                    (kind === 'line' && (snap.lines === undefined || snap.lines.some((l) => l.id === id))) ||
                    kind === 'drawing';
                if (!stillExists) selectedElement = null;
            }
            return {
                ...(snap.pois !== undefined ? { pois: snap.pois } : {}),
                ...(snap.zones !== undefined ? { zones: snap.zones } : {}),
                ...(snap.notes !== undefined ? { notes: snap.notes } : {}),
                ...(snap.backgrounds !== undefined ? { backgrounds: snap.backgrounds } : {}),
                ...(snap.lines !== undefined ? { lines: snap.lines } : {}),
                ...(snap.groups !== undefined ? { groups: snap.groups } : {}),
                ...(snap.drawStrokes !== undefined ? { drawingLayer: { ...state.drawingLayer, strokes: snap.drawStrokes } } : {}),
                selectedElement,
                undoStack: [...state.undoStack, entry],
                redoStack: state.redoStack.slice(0, -1),
            };
        }),

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
            undoStack: [],
            redoStack: [],
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

    copySelected: () => {
        const state = get();
        const ids = new Set<string>();
        if (state.selectedElement && state.selectedElement.kind !== 'drawing') ids.add(state.selectedElement.id);
        state.multiSelectedIds.forEach((id) => ids.add(id));
        if (ids.size === 0) return;
        const payload: ClipboardPayload = {
            pois: state.pois.filter((p) => ids.has(p.id)),
            zones: state.zones.filter((z) => ids.has(z.id)),
            notes: state.notes.filter((n) => ids.has(n.id)),
            lines: state.lines.filter((l) => ids.has(l.id)),
        };
        const total = payload.pois.length + payload.zones.length + payload.notes.length + payload.lines.length;
        if (total > 0) set({ clipboard: payload });
    },

    paste: async (offsetX = 20, offsetY = 20) => {
        const state = get();
        const { clipboard, currentMap } = state;
        if (!clipboard || !currentMap) return;

        const newPois: POI[] = [];
        const newZones: Zone[] = [];
        const newNotes: TextNote[] = [];
        const newLines: MapLine[] = [];

        for (const p of clipboard.pois) {
            try {
                const created = await apiCreatePOI({ ...p, mapId: currentMap.id, x: p.x + offsetX, y: p.y + offsetY });
                newPois.push(created);
            } catch {
                /* skip */
            }
        }
        for (const z of clipboard.zones) {
            try {
                const newPoints = z.points.map((v, i) => (i % 2 === 0 ? v + offsetX : v + offsetY));
                const created = await apiCreateZone({ ...z, mapId: currentMap.id, points: newPoints });
                newZones.push(created);
            } catch {
                /* skip */
            }
        }
        for (const n of clipboard.notes) {
            try {
                const created = await apiCreateNote({ ...n, mapId: currentMap.id, x: n.x + offsetX, y: n.y + offsetY });
                newNotes.push(created);
            } catch {
                /* skip */
            }
        }
        for (const l of clipboard.lines) {
            try {
                const created = await apiCreateLine({
                    ...l,
                    mapId: currentMap.id,
                    x: l.x + offsetX,
                    y: l.y + offsetY,
                    bx: l.bx + offsetX,
                    by: l.by + offsetY,
                    cx: l.cx !== undefined ? l.cx + offsetX : undefined,
                    cy: l.cy !== undefined ? l.cy + offsetY : undefined,

                    aAttachedId: undefined,
                    aAttachedKind: undefined,
                    bAttachedId: undefined,
                    bAttachedKind: undefined,
                });
                newLines.push(created);
            } catch {
                /* skip */
            }
        }

        set((s) => {
            const pois = [...s.pois, ...newPois];
            const zones = [...s.zones, ...newZones];
            const notes = [...s.notes, ...newNotes];
            const lines = [...s.lines, ...newLines];
            const entry: HistoryEntry = {
                before: { pois: s.pois, zones: s.zones, notes: s.notes, lines: s.lines },
                after: { pois, zones, notes, lines },
            };
            return { pois, zones, notes, lines, undoStack: pushHistory(s.undoStack, entry), redoStack: [] };
        });
    },

    duplicateSelected: async () => {
        get().copySelected();
        await get().paste(20, 20);
    },
}));
