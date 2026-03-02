import React from 'react';
import { ActionIcon, Badge, Group, Text, Tooltip } from '@mantine/core';
import {
    IconEye,
    IconEyeOff,
    IconFilter,
    IconFilterOff,
    IconFocus2,
    IconLock,
    IconLockOpen,
    IconPin,
    IconPinFilled,
    IconX,
} from '@tabler/icons-react';
import { mainColor } from '../../../constants';
import { HEADER_STYLE } from './types';

interface InfoPanelHeaderProps {
    kind: string;
    name: string;
    color?: string;
    kindLabel: string;
    isHidden: boolean;
    isLocked: boolean;
    isPinned: boolean;
    activeZoneFilterId: string | null;
    onFocus: () => void;
    onToggleHidden: () => void;
    onToggleLocked: () => void;
    onTogglePinned: () => void;
    onViewElements: () => void;
    onClearFilter: () => void;
    onClose: () => void;
}

export const InfoPanelHeader: React.FC<InfoPanelHeaderProps> = ({
    kind,
    name,
    color,
    kindLabel,
    isHidden,
    isLocked,
    isPinned,
    activeZoneFilterId,
    onFocus,
    onToggleHidden,
    onToggleLocked,
    onTogglePinned,
    onViewElements,
    onClearFilter,
    onClose,
}) => (
    <Group px="md" py="sm" justify="space-between" align="center" style={HEADER_STYLE}>
        <Group gap="xs" align="center" style={{ minWidth: 0, flex: 1 }}>
            {color && (
                <div
                    style={{
                        width: 12,
                        height: 12,
                        borderRadius: kind === 'zone' ? 2 : '50%',
                        background: color,
                        flexShrink: 0,
                        border: '1px solid rgba(0,0,0,0.2)',
                    }}
                />
            )}
            <Text fw={600} size="sm" lineClamp={1} style={{ minWidth: 0 }}>
                {kind === 'note' ? 'Note' : kind === 'background' ? name || 'Image' : name || '—'}
            </Text>
            <Badge size="xs" variant="light" color="gray" style={{ flexShrink: 0 }}>
                {kindLabel}
            </Badge>
        </Group>
        <Group gap={2} style={{ flexShrink: 0 }}>
            <Tooltip label="Center view" withArrow openDelay={400}>
                <ActionIcon size="sm" variant="subtle" color={mainColor} onClick={onFocus}>
                    <IconFocus2 size={14} />
                </ActionIcon>
            </Tooltip>
            <Tooltip label={isHidden ? 'Show' : 'Hide'} withArrow openDelay={400}>
                <ActionIcon size="sm" variant={isHidden ? 'light' : 'subtle'} color={isHidden ? 'gray' : mainColor} onClick={onToggleHidden}>
                    {isHidden ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                </ActionIcon>
            </Tooltip>
            <Tooltip label={isLocked ? 'Unlock' : 'Lock'} withArrow openDelay={400}>
                <ActionIcon size="sm" variant={isLocked ? 'light' : 'subtle'} color={isLocked ? 'orange' : 'gray'} onClick={onToggleLocked}>
                    {isLocked ? <IconLock size={14} /> : <IconLockOpen size={14} />}
                </ActionIcon>
            </Tooltip>
            <Tooltip label={isPinned ? 'Unpin' : 'Pin'} withArrow openDelay={400}>
                <ActionIcon size="sm" variant={isPinned ? 'light' : 'subtle'} color={isPinned ? 'orange' : 'gray'} onClick={onTogglePinned}>
                    {isPinned ? <IconPinFilled size={14} /> : <IconPin size={14} />}
                </ActionIcon>
            </Tooltip>
            {kind === 'zone' &&
                (activeZoneFilterId ? (
                    <Tooltip label="Exit filter" withArrow openDelay={400}>
                        <ActionIcon size="sm" variant="subtle" color="gray" onClick={onClearFilter}>
                            <IconFilterOff size={14} />
                        </ActionIcon>
                    </Tooltip>
                ) : (
                    <Tooltip label="See elements in zone" withArrow openDelay={400}>
                        <ActionIcon size="sm" variant="subtle" color="blue" onClick={onViewElements}>
                            <IconFilter size={14} />
                        </ActionIcon>
                    </Tooltip>
                ))}
            <ActionIcon size="sm" variant="subtle" color="gray" onClick={onClose}>
                <IconX size={14} />
            </ActionIcon>
        </Group>
    </Group>
);
