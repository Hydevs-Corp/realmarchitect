import { ActionIcon, Alert, Badge, Button, Divider, Group, NumberInput, Stack, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { IconInfoCircle, IconLock, IconLockOpen, IconPhoto, IconRotate, IconX } from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { getFileUrl } from '../../../lib/api';
import { loadAssetHistory, pushAssetHistory, type StoredAsset } from '../../../lib/assetHistory';
import { mainColor } from '../../../constants';
import { useMapStore } from '../../../store/useMapStore';
import { HEADER_STYLE, PANEL_CONTAINER_STYLE } from './types';
import AssetPicker from '../AssetPicker';
import type { DncWorldmapAssetRecord } from '../../../types/database';
import type { RecordModel } from 'pocketbase';

export const ImageBrushPanel: React.FC = () => {
    const { imageBrushAssetId, imageBrushWidth, imageBrushHeight, imageBrushRotation, setImageBrush, setImageBrushRotation, setCreationMode, setSelectedElement } = useMapStore(
        useShallow((state) => ({
            imageBrushAssetId: state.imageBrushAssetId,
            imageBrushWidth: state.imageBrushWidth,
            imageBrushHeight: state.imageBrushHeight,
            imageBrushRotation: state.imageBrushRotation,
            setImageBrush: state.setImageBrush,
            setImageBrushRotation: state.setImageBrushRotation,
            setCreationMode: state.setCreationMode,
            setSelectedElement: state.setSelectedElement,
        }))
    );

    const [assetHistory, setAssetHistory] = useState<StoredAsset[]>(() => loadAssetHistory());
    const [showPicker, setShowPicker] = useState(false);
    const [lockScale, setLockScale] = useState(true);

    useEffect(() => {
        if (!imageBrushAssetId) {
            const history = loadAssetHistory();
            if (history.length > 0) {
                const last = history[0];
                const url = getFileUrl(last as RecordModel, last.file);
                setImageBrush(last.id, last.width ?? 200, last.height ?? 200, url);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selectedAsset = assetHistory.find((a) => a.id === imageBrushAssetId) ?? null;

    const handleAssetSelect = (asset: DncWorldmapAssetRecord & RecordModel) => {
        const url = getFileUrl(asset, asset.file);
        setImageBrush(asset.id, asset.width ?? imageBrushWidth, asset.height ?? imageBrushHeight, url);
        const updated = pushAssetHistory(asset);
        setAssetHistory(updated);
        setShowPicker(false);
    };

    const handleClose = () => {
        setCreationMode('none');
        setSelectedElement(null);
    };

    return (
        <div style={PANEL_CONTAINER_STYLE}>
            <Group px="md" py="sm" justify="space-between" align="center" style={HEADER_STYLE}>
                <Group gap="xs" align="center">
                    <Text fw={600} size="sm">
                        Image Brush
                    </Text>
                    <Badge size="xs" variant="light" color={mainColor}>
                        Image
                    </Badge>
                </Group>
                <ActionIcon size="sm" variant="subtle" onClick={handleClose}>
                    <IconX />
                </ActionIcon>
            </Group>

            <Stack px="md" py="md" gap="md" style={{ overflow: 'auto', flex: 1 }}>
                {!imageBrushAssetId && (
                    <Alert icon={<IconInfoCircle size={16} />} color="orange" variant="light">
                        Select an image below, then click on the map to place it.
                    </Alert>
                )}

                {imageBrushAssetId && (
                    <Alert icon={<IconPhoto size={16} />} color={mainColor} variant="light">
                        Click anywhere on the map to place the selected image. Hold <strong>Shift</strong> and scroll to rotate.
                    </Alert>
                )}

                {selectedAsset && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px',
                            borderRadius: 6,
                            border: '1px solid var(--mantine-color-default-border)',
                            background: 'white',
                        }}
                    >
                        <img
                            src={getFileUrl(selectedAsset as RecordModel, selectedAsset.file)}
                            alt={selectedAsset.name}
                            style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <Text size="sm" c={'dark'} fw={600} truncate>
                                {selectedAsset.name}
                            </Text>
                            {selectedAsset.tags && selectedAsset.tags.length > 0 && (
                                <Text size="xs" c="dimmed" truncate>
                                    {selectedAsset.tags.join(', ')}
                                </Text>
                            )}
                        </div>
                        <ActionIcon size="sm" variant="subtle" color="red" onClick={() => setImageBrush('', imageBrushWidth, imageBrushHeight, '')}>
                            <IconX size={14} />
                        </ActionIcon>
                    </div>
                )}

                <Button variant="default" leftSection={<IconPhoto size={16} />} onClick={() => setShowPicker(true)} fullWidth>
                    {imageBrushAssetId ? 'Change image...' : 'Choose image...'}
                </Button>

                <Divider />

                <div>
                    <Text size="xs" c="dimmed" mb={8}>
                        Dimensions
                    </Text>
                    <Group gap={6} align="flex-end">
                        <NumberInput
                            label="Width"
                            min={1}
                            step={10}
                            style={{ flex: 1 }}
                            value={imageBrushWidth}
                            onChange={(v) => {
                                const newW = typeof v === 'number' ? v : imageBrushWidth;
                                const newH = lockScale && imageBrushWidth > 0 ? Math.round((newW / imageBrushWidth) * imageBrushHeight) : imageBrushHeight;
                                setImageBrush(imageBrushAssetId, newW, newH);
                            }}
                        />
                        <Tooltip label={lockScale ? 'Unlock aspect ratio' : 'Lock aspect ratio'} withArrow>
                            <ActionIcon variant={lockScale ? 'filled' : 'default'} color={lockScale ? mainColor : undefined} mb={1} onClick={() => setLockScale((l) => !l)}>
                                {lockScale ? <IconLock size={16} /> : <IconLockOpen size={16} />}
                            </ActionIcon>
                        </Tooltip>
                        <NumberInput
                            label="Height"
                            min={1}
                            step={10}
                            style={{ flex: 1 }}
                            value={imageBrushHeight}
                            onChange={(v) => {
                                const newH = typeof v === 'number' ? v : imageBrushHeight;
                                const newW = lockScale && imageBrushHeight > 0 ? Math.round((newH / imageBrushHeight) * imageBrushWidth) : imageBrushWidth;
                                setImageBrush(imageBrushAssetId, newW, newH);
                            }}
                        />
                    </Group>
                </div>

                <Divider />

                <div>
                    <Text size="xs" c="dimmed" mb={8}>
                        Rotation
                    </Text>
                    <NumberInput
                        leftSection={<IconRotate size={14} />}
                        min={0}
                        max={359}
                        step={5}
                        value={imageBrushRotation}
                        onChange={(v) => setImageBrushRotation(typeof v === 'number' ? v : imageBrushRotation)}
                        rightSection={
                            <Text size="xs" c="dimmed" pr={4}>
                                °
                            </Text>
                        }
                    />
                </div>

                {assetHistory.length > 0 && (
                    <>
                        <Divider />
                        <div>
                            <Text size="xs" c="dimmed" mb={8}>
                                Recent
                            </Text>
                            <Group gap={6} wrap="wrap">
                                {assetHistory.map((a) => (
                                    <Tooltip key={a.id} label={a.name} withArrow position="top">
                                        <UnstyledButton
                                            onClick={() => {
                                                const url = getFileUrl(a as RecordModel, a.file);
                                                setImageBrush(a.id, a.width ?? imageBrushWidth, a.height ?? imageBrushHeight, url);
                                            }}
                                            style={{
                                                border: imageBrushAssetId === a.id ? `2px solid var(--mantine-color-${mainColor}-5)` : '2px solid transparent',
                                                borderRadius: 6,
                                                overflow: 'hidden',
                                                lineHeight: 0,
                                                background: 'white',
                                            }}
                                        >
                                            <img src={getFileUrl(a as RecordModel, a.file)} alt={a.name} style={{ width: 48, height: 48, objectFit: 'cover', display: 'block' }} />
                                        </UnstyledButton>
                                    </Tooltip>
                                ))}
                            </Group>
                        </div>
                    </>
                )}
            </Stack>

            <AssetPicker opened={showPicker} onClose={() => setShowPicker(false)} onSelect={(asset) => handleAssetSelect(asset as DncWorldmapAssetRecord & RecordModel)} />
        </div>
    );
};
