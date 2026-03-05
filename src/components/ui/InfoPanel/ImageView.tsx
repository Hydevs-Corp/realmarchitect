import React from 'react';
import { Group, Text } from '@mantine/core';
import { useShallow } from 'zustand/react/shallow';
import { useMapStore } from '../../../store/useMapStore';

interface ImageViewProps {
    id: string;
}

export const ImageView: React.FC<ImageViewProps> = ({ id }) => {
    const images = useMapStore(useShallow((state) => state.images));
    const bg = images.find((b) => b.id === id);
    if (!bg) return null;

    return (
        <>
            <div>
                <Text size="xs" c="dimmed" mb={4}>
                    Preview
                </Text>
                <img
                    src={bg.imageUrl}
                    alt="background"
                    style={{
                        maxWidth: '100%',
                        maxHeight: 120,
                        borderRadius: 4,
                        border: '1px solid var(--mantine-color-default-border)',
                    }}
                />
            </div>
            {bg.name && (
                <div>
                    <Text size="xs" c="dimmed" mb={2}>
                        Name
                    </Text>
                    <Text size="sm" fw={500}>
                        {bg.name}
                    </Text>
                </div>
            )}
            <div>
                <Text size="xs" c="dimmed" mb={2}>
                    File
                </Text>
                <Text size="xs" style={{ wordBreak: 'break-all', opacity: 0.7 }}>
                    {bg.imageUrl.split('/').pop()?.split('?')[0] ?? bg.imageUrl}
                </Text>
            </div>
            <Group gap="xl">
                <div>
                    <Text size="xs" c="dimmed" mb={2}>
                        Position
                    </Text>
                    <Text size="sm">
                        {bg.x.toFixed(0)}, {bg.y.toFixed(0)}
                    </Text>
                </div>
                <div>
                    <Text size="xs" c="dimmed" mb={2}>
                        Dimensions
                    </Text>
                    <Text size="sm">
                        {bg.width} × {bg.height}
                    </Text>
                </div>
            </Group>
            <Group gap="xl">
                <div>
                    <Text size="xs" c="dimmed" mb={2}>
                        Order (z-index)
                    </Text>
                    <Text size="sm">{bg.zIndex}</Text>
                </div>
                <div>
                    <Text size="xs" c="dimmed" mb={2}>
                        Opacity
                    </Text>
                    <Text size="sm">{Math.round((bg.opacity ?? 1) * 100)}%</Text>
                </div>
            </Group>
        </>
    );
};
