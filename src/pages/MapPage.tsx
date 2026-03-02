import React, { useEffect } from 'react';
import { useParams } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { InteractiveMapManager } from '../components/InteractiveMapManager';
import { useMapStore } from '../store/useMapStore';
import { fetchMap } from '../lib/api';
import { useMapRealtime } from '../hooks/useMapRealtime';

export const MapPage: React.FC = () => {
    const { mapId } = useParams<{ mapId: string }>();
    const { setCurrentMap, loadMapData, resetMapData } = useMapStore(
        useShallow((state) => ({
            setCurrentMap: state.setCurrentMap,
            loadMapData: state.loadMapData,
            resetMapData: state.resetMapData,
        }))
    );

    useEffect(() => {
        if (mapId) {
            fetchMap(mapId).then((map) => {
                setCurrentMap(map);
            });
            loadMapData(mapId);
        }
        return () => {
            resetMapData();
        };
    }, [mapId, setCurrentMap, loadMapData, resetMapData]);

    useMapRealtime(mapId);

    return <InteractiveMapManager />;
};
