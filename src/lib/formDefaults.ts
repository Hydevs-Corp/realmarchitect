/**
 * Persist and restore non-text form defaults per element type.
 * Only visual / numeric / boolean options are cached — never free-text
 * fields like name, description, or content.
 */

import type { MapLine } from '../types/map';

const STORAGE_KEY = 'realmarchitect_form_defaults';

export interface PoiDefaults {
    type: string;
    size: number;
}

export interface ZoneDefaults {
    zoneColor: string;
    pattern: string;
    smooth: boolean;
}

export interface NoteDefaults {
    isComment: boolean;
    noteFontSize: number;
    noteBgColor: string;
    noteWidth: number | '';
}

export interface LineDefaults {
    lineColor: string;
    lineStrokeWidth: number;
    lineDash: MapLine['dashPattern'];
}

export interface ImageDefaults {
    width: number;
    height: number;
}

export interface AllFormDefaults {
    poi?: PoiDefaults;
    zone?: ZoneDefaults;
    note?: NoteDefaults;
    line?: LineDefaults;
    image?: ImageDefaults;
}

function load(): AllFormDefaults {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        return JSON.parse(raw) as AllFormDefaults;
    } catch {
        return {};
    }
}

function save(data: AllFormDefaults): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
        // ignore quota errors
    }
}

export function loadFormDefaults(): AllFormDefaults {
    return load();
}

export function savePoiDefaults(defaults: PoiDefaults): void {
    const all = load();
    save({ ...all, poi: defaults });
}

export function saveZoneDefaults(defaults: ZoneDefaults): void {
    const all = load();
    save({ ...all, zone: defaults });
}

export function saveNoteDefaults(defaults: NoteDefaults): void {
    const all = load();
    save({ ...all, note: defaults });
}

export function saveLineDefaults(defaults: LineDefaults): void {
    const all = load();
    save({ ...all, line: defaults });
}

export function saveImageDefaults(defaults: ImageDefaults): void {
    const all = load();
    save({ ...all, image: defaults });
}
