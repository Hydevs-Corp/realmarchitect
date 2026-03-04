import type { DncWorldmapAssetRecord } from '../types/database';
import type { RecordModel } from 'pocketbase';

export const ASSET_HISTORY_KEY = 'realmarchitect:asset_picker_history';
export const ASSET_HISTORY_MAX = 15;

export type StoredAsset = Pick<DncWorldmapAssetRecord, 'id' | 'name' | 'file' | 'tags' | 'width' | 'height'> & {
    collectionId: string;
    collectionName: string;
};

export function loadAssetHistory(): StoredAsset[] {
    try {
        const raw = localStorage.getItem(ASSET_HISTORY_KEY);
        return raw ? (JSON.parse(raw) as StoredAsset[]) : [];
    } catch {
        return [];
    }
}

export function saveAssetHistory(history: StoredAsset[]): void {
    localStorage.setItem(ASSET_HISTORY_KEY, JSON.stringify(history));
}

export function pushAssetHistory(asset: DncWorldmapAssetRecord & RecordModel): StoredAsset[] {
    const entry: StoredAsset = {
        id: asset.id,
        name: asset.name,
        file: asset.file,
        tags: asset.tags,
        width: asset.width,
        height: asset.height,
        collectionId: asset.collectionId,
        collectionName: asset.collectionName,
    };
    const history = loadAssetHistory().filter((a) => a.id !== entry.id);
    const updated = [entry, ...history].slice(0, ASSET_HISTORY_MAX);
    saveAssetHistory(updated);
    return updated;
}
