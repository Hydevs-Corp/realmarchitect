import React from 'react';
import { ActionIcon, Group, Text, Tooltip } from '@mantine/core';
import { IconLinkOff } from '@tabler/icons-react';
import { useShallow } from 'zustand/react/shallow';
import { useMapStore } from '../../../store/useMapStore';
import { updateLine as apiUpdateLine } from '../../../lib/api';
import { mainColor } from '../../../constants';

interface LineViewProps {
    id: string;
}

export const LineView: React.FC<LineViewProps> = ({ id }) => {
    const { lines, pois, zones, notes, backgrounds, updateLine } = useMapStore(
        useShallow((state) => ({
            lines: state.lines,
            pois: state.pois,
            zones: state.zones,
            notes: state.notes,
            backgrounds: state.backgrounds,
            updateLine: state.updateLine,
        }))
    );

    const line = lines.find((l) => l.id === id);
    if (!line) return null;

    const handleDetachA = () => {
        if (!line.aAttachedId) return;
        let absX = line.x, absY = line.y;
        if (line.aAttachedKind === 'poi') {
            const p = pois.find((p) => p.id === line.aAttachedId);
            if (p) { absX = p.x + line.x; absY = p.y + line.y; }
        } else if (line.aAttachedKind === 'note') {
            const n = notes.find((n) => n.id === line.aAttachedId);
            if (n) { absX = n.x + line.x; absY = n.y + line.y; }
        } else if (line.aAttachedKind === 'background') {
            const b = backgrounds.find((b) => b.id === line.aAttachedId);
            if (b) { absX = b.x + line.x; absY = b.y + line.y; }
        }
        const updates = { x: absX, y: absY, aAttachedId: undefined, aAttachedKind: undefined };
        updateLine(id, updates);
        apiUpdateLine(id, updates);
    };

    const handleDetachB = () => {
        if (!line.bAttachedId) return;
        let absX = line.bx, absY = line.by;
        if (line.bAttachedKind === 'poi') {
            const p = pois.find((p) => p.id === line.bAttachedId);
            if (p) { absX = p.x + line.bx; absY = p.y + line.by; }
        } else if (line.bAttachedKind === 'note') {
            const n = notes.find((n) => n.id === line.bAttachedId);
            if (n) { absX = n.x + line.bx; absY = n.y + line.by; }
        } else if (line.bAttachedKind === 'background') {
            const b = backgrounds.find((b) => b.id === line.bAttachedId);
            if (b) { absX = b.x + line.bx; absY = b.y + line.by; }
        }
        const updates = { bx: absX, by: absY, bAttachedId: undefined, bAttachedKind: undefined };
        updateLine(id, updates);
        apiUpdateLine(id, updates);
    };

    const resolveLabel = (attachedId?: string, attachedKind?: string) => {
        if (!attachedId || !attachedKind) return null;
        if (attachedKind === 'poi') return pois.find((p) => p.id === attachedId)?.name || 'POI';
        if (attachedKind === 'zone') return zones.find((z) => z.id === attachedId)?.name || 'Zone';
        if (attachedKind === 'note') return notes.find((n) => n.id === attachedId)?.content.slice(0, 20) || 'Note';
        if (attachedKind === 'background') return backgrounds.find((b) => b.id === attachedId)?.name || 'Image';
        return null;
    };

    const aLabel = resolveLabel(line.aAttachedId, line.aAttachedKind);
    const bLabel = resolveLabel(line.bAttachedId, line.bAttachedKind);

    return (
        <>
            {line.name && (
                <div>
                    <Text size="xs" c="dimmed" mb={2}>Name</Text>
                    <Text size="sm" fw={500}>{line.name}</Text>
                </div>
            )}
            <Group gap="xs" align="center">
                <div
                    style={{
                        width: 28,
                        height: 4,
                        borderRadius: 2,
                        background: line.color,
                        border: '1px solid rgba(0,0,0,0.15)',
                        flexShrink: 0,
                    }}
                />
                <Text size="sm">{line.color}</Text>
                <Text size="xs" c="dimmed">·</Text>
                <Text size="sm">{line.strokeWidth ?? 2}px</Text>
                {line.dashPattern && line.dashPattern !== 'solid' && (
                    <>
                        <Text size="xs" c="dimmed">·</Text>
                        <Text size="xs" c="dimmed">{line.dashPattern === 'dashed' ? 'Dashed' : 'Dotted'}</Text>
                    </>
                )}
            </Group>
            <Group gap="xl">
                <div>
                    <Text size="xs" c="dimmed" mb={2}>Point A</Text>
                    <Text size="sm">{line.x.toFixed(0)}, {line.y.toFixed(0)}</Text>
                </div>
                <div>
                    <Text size="xs" c="dimmed" mb={2}>Point B</Text>
                    <Text size="sm">{line.bx.toFixed(0)}, {line.by.toFixed(0)}</Text>
                </div>
            </Group>
            {(aLabel || bLabel) && (
                <Group gap="xl">
                    {aLabel && (
                        <div>
                            <Group gap={4} align="center" mb={2}>
                                <Text size="xs" c="dimmed">A attached to</Text>
                                <Tooltip label="Detach point A" withArrow>
                                    <ActionIcon size="xs" variant="subtle" color="red" onClick={handleDetachA}>
                                        <IconLinkOff size={12} />
                                    </ActionIcon>
                                </Tooltip>
                            </Group>
                            <Text size="sm" c={mainColor}>{aLabel}</Text>
                        </div>
                    )}
                    {bLabel && (
                        <div>
                            <Group gap={4} align="center" mb={2}>
                                <Text size="xs" c="dimmed">B attached to</Text>
                                <Tooltip label="Detach point B" withArrow>
                                    <ActionIcon size="xs" variant="subtle" color="red" onClick={handleDetachB}>
                                        <IconLinkOff size={12} />
                                    </ActionIcon>
                                </Tooltip>
                            </Group>
                            <Text size="sm" c={mainColor}>{bLabel}</Text>
                        </div>
                    )}
                </Group>
            )}
            {line.cx !== undefined && line.cy !== undefined && (
                <div>
                    <Text size="xs" c="dimmed" mb={2}>Control point</Text>
                    <Text size="sm">{line.cx.toFixed(0)}, {line.cy.toFixed(0)}</Text>
                </div>
            )}
            <div>
                <Text size="xs" c="dimmed" mb={2}>Order (z-index)</Text>
                <Text size="sm">{line.zIndex}</Text>
            </div>
        </>
    );
};
