import React from 'react';
import { Group, Text } from '@mantine/core';
import { useShallow } from 'zustand/react/shallow';
import { useMapStore } from '../../../store/useMapStore';

interface NoteViewProps {
    id: string;
}

export const NoteView: React.FC<NoteViewProps> = ({ id }) => {
    const notes = useMapStore(useShallow((state) => state.notes));
    const note = notes.find((n) => n.id === id);
    if (!note) return null;

    return (
        <>
            <div>
                <Text size="xs" c="dimmed" mb={2}>Content</Text>
                <Text size="sm">{note.content}</Text>
            </div>
            {note.authorName && (
                <div style={{ marginTop: 8 }}>
                    <Text size="xs" c="dimmed" mb={2}>Author</Text>
                    <Text size="sm">{note.authorName}</Text>
                </div>
            )}
            <Group gap="xs" align="center" mt={4}>
                <div
                    style={{
                        width: 16,
                        height: 16,
                        borderRadius: 3,
                        background: note.bgColor ?? '#fff9c4',
                        border: '1px solid rgba(0,0,0,0.15)',
                        flexShrink: 0,
                    }}
                />
                <Text size="xs" c="dimmed">{note.bgColor ?? '#fff9c4ff'}</Text>
                <Text size="xs" c="dimmed">·</Text>
                <Text size="xs" c="dimmed">{note.fontSize ?? 14}px</Text>
                <Text size="xs" c="dimmed">·</Text>
                <Text size="xs" c="dimmed">{note.width ? note.width + 'px' : 'auto'}</Text>
            </Group>
            <div>
                <Text size="xs" c="dimmed" mb={2}>Order (z-index)</Text>
                <Text size="sm">{note.zIndex ?? 0}</Text>
            </div>
        </>
    );
};
