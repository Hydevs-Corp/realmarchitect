import React from 'react';
import { KonvaEngine } from './map/KonvaEngine';
import { MapUIOverlay } from './ui/MapUIOverlay';

export const InteractiveMapManager: React.FC = () => {
    return (
        <div
            style={{
                position: 'relative',
                width: '100vw',
                height: 'calc(100svh - var(--app-shell-header-height))',
                overflow: 'hidden',
            }}
        >
            <MapUIOverlay />
            <KonvaEngine />
        </div>
    );
};
