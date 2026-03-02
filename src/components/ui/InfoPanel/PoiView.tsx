import React from 'react';
import { Group, Text } from '@mantine/core';
import { useShallow } from 'zustand/react/shallow';
import { useMapStore } from '../../../store/useMapStore';

interface PoiViewProps {
    id: string;
}

export const PoiView: React.FC<PoiViewProps> = ({ id }) => {
    const { pois, elementTypes } = useMapStore(
        useShallow((state) => ({ pois: state.pois, elementTypes: state.elementTypes }))
    );

    const poi = pois.find((p) => p.id === id);
    if (!poi) return null;
    const typeName = elementTypes.find((t) => t.id === poi.type)?.name;

    return (
        <>
            {typeName && (
                <div>
                    <Text size="xs" c="dimmed" mb={2}>Type</Text>
                    <Group gap="xs" align="center">
                        <div
                            style={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: poi.color,
                                border: '1px solid rgba(0,0,0,0.2)',
                                flexShrink: 0,
                            }}
                        />
                        <Text size="sm" fw={500}>{typeName}</Text>
                    </Group>
                </div>
            )}
            <div>
                <Text size="xs" c="dimmed" mb={2}>Name</Text>
                <Text size="sm" fw={500}>{poi.name || '—'}</Text>
            </div>
            <div>
                <Text size="xs" c="dimmed" mb={2}>Size</Text>
                <Text size="sm">{(poi.size ?? 10) + ' px'}</Text>
            </div>
            {poi.description ? (
                <div>
                    <Text size="xs" c="dimmed" mb={2}>Description</Text>
                    <Text size="sm">{poi.description}</Text>
                </div>
            ) : (
                <Text size="xs" c="dimmed" fs="italic">No description</Text>
            )}
            <div>
                <Text size="xs" c="dimmed" mb={2}>Order (z-index)</Text>
                <Text size="sm">{poi.zIndex ?? 0}</Text>
            </div>
        </>
    );
};
