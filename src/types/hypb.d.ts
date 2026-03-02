import {
    DncWorldmapBackgroundRecord,
    DncWorldmapMapRecord,
    DncWorldmapNoteRecord,
    DncWorldmapPoiRecord,
    DncWorldmapZoneRecord,
    DncWorldmapAssetRecord,
    DncWorldmapAssetCategoryRecord,
    DncWorldmapUsersRecord,
} from './database';

declare module '@hydevs/hypb' {
    interface Collections {
        dnc_worldmap_image: DncWorldmapBackgroundRecord;
        dnc_worldmap_maps: DncWorldmapMapRecord;
        dnc_worldmap_notes: DncWorldmapNoteRecord;
        dnc_worldmap_pois: DncWorldmapPoiRecord;
        dnc_worldmap_zones: DncWorldmapZoneRecord;
        dnc_worldmap_assets: DncWorldmapAssetRecord;
        dnc_worldmap_asset_categories: DncWorldmapAssetCategoryRecord;
        dnc_worldmap_users: DncWorldmapUsersRecord;
    }
}
