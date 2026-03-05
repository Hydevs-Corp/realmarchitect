import React from 'react';
import { Group, Text } from '@mantine/core';
import { useShallow } from 'zustand/react/shallow';
import { useMapStore } from '../../../store/useMapStore';
import { ZONE_PATTERNS } from '../../../lib/zoneColors';

interface ZoneViewProps {
    id: string;
}

export const ZoneView: React.FC<ZoneViewProps> = ({ id }) => {
    const zones = useMapStore(useShallow((state) => state.zones));
    const zone = zones.find((z) => z.id === id);
    if (!zone) return null;

    return (
        <>
            <div>
                <Text size="xs" c="dimmed" mb={2}>
                    Name
                </Text>
                <Text size="sm" fw={500}>
                    {zone.name || '—'}
                </Text>
            </div>
            {zone.description ? (
                <div>
                    <Text size="xs" c="dimmed" mb={2}>
                        Description
                    </Text>
                    <Text size="sm">{zone.description}</Text>
                </div>
            ) : (
                <Text size="xs" c="dimmed" fs="italic">
                    No description
                </Text>
            )}
            <Group gap="xs" align="center">
                <div
                    style={{
                        width: 20,
                        height: 20,
                        borderRadius: 3,
                        background: zone.color,
                        border: '1px solid rgba(0,0,0,0.15)',
                        flexShrink: 0,
                    }}
                />
                <Text size="sm">{zone.color}</Text>
            </Group>
            {zone.pattern && (
                <div>
                    <Text size="xs" c="dimmed" mb={2}>
                        Pattern
                    </Text>
                    <Text size="sm">{ZONE_PATTERNS.find((p) => p.value === zone.pattern)?.label ?? zone.pattern}</Text>
                </div>
            )}
            <div>
                <Text size="xs" c="dimmed" mb={2}>
                    Order (z-index)
                </Text>
                <Text size="sm">{zone.zIndex ?? 0}</Text>
            </div>
            <div>
                <Text size="xs" c="dimmed" mb={2}>
                    Smooth edges
                </Text>
                <Text size="sm">{zone.smooth ? 'Yes' : 'No'}</Text>
            </div>
        </>
    );
};
