import {
    Button,
    ColorInput,
    ColorSwatch,
    FileInput,
    Group,
    Modal,
    NumberInput,
    Select,
    Stack,
    Tabs,
    Text,
    Textarea,
    TextInput,
    Switch,
    Tooltip,
    UnstyledButton,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import React, { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { createBackground, createLine, createNote, createPOI, createZone, fetchAssets, getFileUrl } from '../../lib/api';
import { Hypb } from '@hydevs/hypb';
import type { DncWorldmapAssetRecord } from '../../types/database';
import AssetPicker from './AssetPicker';
import type { MapLine } from '../../types/map';
import { useMapStore } from '../../store/useMapStore';
import { ZONE_COLOR_SWATCHES, DEFAULT_ZONE_COLOR, ZONE_PATTERNS } from '../../lib/zoneColors';
import type { RecordModel } from 'pocketbase';
import { loadAssetHistory, pushAssetHistory, type StoredAsset } from '../../lib/assetHistory';

export const CreationModal: React.FC = () => {
    const { creationMode, isCreationModalOpen, tempCreationData, currentMap, elementTypes, closeCreationModal, addPoi, addZone, addNote, addBackground, addLine } = useMapStore(
        useShallow((state) => ({
            creationMode: state.creationMode,
            isCreationModalOpen: state.isCreationModalOpen,
            tempCreationData: state.tempCreationData,
            currentMap: state.currentMap,
            elementTypes: state.elementTypes,
            closeCreationModal: state.closeCreationModal,
            addPoi: state.addPoi,
            addZone: state.addZone,
            addNote: state.addNote,
            addBackground: state.addBackground,
            addLine: state.addLine,
        }))
    );

    const [loading, setLoading] = useState(false);
    const [, setAssetOptions] = useState<{ value: string; label: string }[]>([]);
    const [showAssetPicker, setShowAssetPicker] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<(DncWorldmapAssetRecord & RecordModel) | null>(null);
    const [assetHistory, setAssetHistory] = useState<StoredAsset[]>(() => loadAssetHistory());

    useEffect(() => {
        let mounted = true;
        const loadAssets = async () => {
            try {
                const res = await fetchAssets();
                if (!mounted) return;
                const opts = res.assets.map((a) => ({
                    value: a.id,
                    label: a.name || a.id,
                }));
                setAssetOptions(opts);
            } catch (err) {
                console.error('Failed to load assets:', err);
            }
        };
        void loadAssets();
        return () => {
            mounted = false;
        };
    }, []);

    const title = {
        poi: 'Create a POI',
        zone: 'Create a Zone',
        note: 'Create a Note',
        background: 'Add an Image',
        line: 'Create a Line',
        draw: 'Freehand drawing',
        none: '',
    }[creationMode];

    const typeSelectData = elementTypes.map((t) => ({
        value: t.id,
        label: t.name,
    }));

    const form = useForm({
        initialValues: {
            type: elementTypes.length > 0 ? elementTypes[0].id : '',
            name: '',
            description: '',
            size: 10,
            zoneColor: DEFAULT_ZONE_COLOR,
            pattern: '',
            content: '',
            isComment: false,
            noteFontSize: 14,
            noteBgColor: '#fff9c4ff',
            noteWidth: '' as number | '',
            width: 1000,
            height: 1000,
            image: null as File | null,
            assetId: '',
            bgName: '',
            lineName: '',
            lineColor: '#ffffff',
            lineStrokeWidth: 2,
            lineDash: 'solid' as MapLine['dashPattern'],
        },
        validate: {
            type: (value) => (creationMode === 'poi' && !value ? 'Please choose a type' : null),
            name: (value) => ((creationMode === 'poi' || creationMode === 'zone') && !value.trim() ? 'Name is required' : null),
            zoneColor: (value) => (creationMode === 'zone' && !value ? 'Please choose a color' : null),
        },
    });

    useEffect(() => {
        if (isCreationModalOpen) {
            form.reset();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCreationModalOpen]);

    const handleSubmit = async (values: typeof form.values) => {
        if (!currentMap || !tempCreationData) return;
        setLoading(true);

        try {
            if (creationMode === 'poi') {
                const selectedType = elementTypes.find((t) => t.id === values.type);
                const newPoi = await createPOI({
                    mapId: currentMap.id,
                    x: tempCreationData.x ?? 0,
                    y: tempCreationData.y ?? 0,
                    zIndex: 1,
                    type: values.type,
                    name: values.name,
                    description: values.description || undefined,
                    color: selectedType?.color ?? '#888888',
                    size: values.size,
                });
                addPoi(newPoi);
            } else if (creationMode === 'zone') {
                const newZone = await createZone({
                    mapId: currentMap.id,
                    zIndex: 0,
                    name: values.name || 'Unnamed zone',
                    description: values.description || undefined,
                    points: tempCreationData.points ?? [],
                    color: values.zoneColor,
                    pattern: values.pattern || undefined,
                });
                addZone(newZone);
            } else if (creationMode === 'note') {
                const newNote = await createNote({
                    mapId: currentMap.id,
                    x: tempCreationData.x ?? 0,
                    y: tempCreationData.y ?? 0,
                    zIndex: 2,
                    content: values.content,
                    author: values.isComment ? Hypb.pb.authStore.record?.id : undefined,
                    fontSize: values.noteFontSize,
                    bgColor: values.noteBgColor,
                    width: values.noteWidth !== '' ? values.noteWidth : undefined,
                });
                addNote(newNote);
            } else if (creationMode === 'background') {
                if (!values.image && !values.assetId) return;
                const newBg = await createBackground(
                    {
                        mapId: currentMap.id,
                        x: tempCreationData.x ?? 0,
                        y: tempCreationData.y ?? 0,
                        zIndex: -1,
                        name: values.bgName || undefined,
                        width: values.width,
                        height: values.height,
                    },
                    values.image ?? undefined,
                    values.assetId || undefined
                );
                addBackground(newBg);
            } else if (creationMode === 'line') {
                const newLine = await createLine({
                    mapId: currentMap.id,
                    x: tempCreationData.ax ?? 0,
                    y: tempCreationData.ay ?? 0,
                    zIndex: 1,
                    bx: tempCreationData.bx ?? 100,
                    by: tempCreationData.by ?? 100,
                    name: values.lineName || undefined,
                    color: values.lineColor,
                    strokeWidth: values.lineStrokeWidth,
                    dashPattern: values.lineDash,
                });
                addLine(newLine);
            }
            closeCreationModal();
        } catch (error) {
            console.error('Failed to create element:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssetSelect = (asset: DncWorldmapAssetRecord & RecordModel) => {
        form.setFieldValue('assetId', asset.id);
        if (asset.width) form.setFieldValue('width', asset.width);
        if (asset.height) form.setFieldValue('height', asset.height);
        setSelectedAsset(asset);
        const updated = pushAssetHistory(asset);
        setAssetHistory(updated);
    };

    return (
        <Modal opened={isCreationModalOpen} onClose={closeCreationModal} title={title} style={{ pointerEvents: 'auto' }}>
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack>
                    {creationMode === 'poi' && (
                        <>
                            <Select
                                label="Type"
                                placeholder="Select a type"
                                data={typeSelectData}
                                required
                                leftSection={form.values.type ? <ColorSwatch color={elementTypes.find((t) => t.id === form.values.type)?.color ?? '#000'} size={12} /> : undefined}
                                renderOption={(element) => {
                                    const type = elementTypes.find((t) => t.id === element.option.value);
                                    return (
                                        <Group gap="xs" align="center">
                                            <ColorSwatch color={type?.color ?? '#000'} size={12} />
                                            <Text size="sm">{element.option.label}</Text>
                                        </Group>
                                    );
                                }}
                                {...form.getInputProps('type')}
                            />
                            <TextInput label="Name" placeholder="Element name..." required {...form.getInputProps('name')} />
                            <Textarea label="Description" placeholder="Optional description..." autosize minRows={2} {...form.getInputProps('description')} />
                            <NumberInput label="Size" min={4} max={100} step={1} defaultValue={10} {...form.getInputProps('size')} />
                        </>
                    )}

                    {creationMode === 'zone' && (
                        <>
                            <TextInput label="Name" placeholder="Zone name..." required {...form.getInputProps('name')} />
                            <Textarea label="Description" placeholder="Optional description..." autosize minRows={2} {...form.getInputProps('description')} />
                            <ColorInput
                                label="Color"
                                placeholder="Choose a color"
                                swatches={ZONE_COLOR_SWATCHES}
                                swatchesPerRow={7}
                                format="hexa"
                                popoverProps={{ withinPortal: true }}
                                required
                                {...form.getInputProps('zoneColor')}
                            />
                            <Select label="Fill pattern" data={ZONE_PATTERNS} {...form.getInputProps('pattern')} />
                        </>
                    )}

                    {creationMode === 'note' && (
                        <>
                            <Textarea label="Content" placeholder="Note..." autosize minRows={2} {...form.getInputProps('content')} />
                            <Switch label="Comment (link to your account)" {...form.getInputProps('isComment', { type: 'checkbox' })} />
                            <NumberInput label="Font size" min={8} max={72} step={1} defaultValue={14} {...form.getInputProps('noteFontSize')} />
                            <ColorInput
                                label="Background color"
                                format="hexa"
                                swatches={['#fff9c4ff', '#ffffff00', '#ffffffff', '#c4f9ffff', '#ffd6d6ff', '#d6ffd6ff', '#e8d6ffff', '#1a1a2eff']}
                                swatchesPerRow={8}
                                popoverProps={{ withinPortal: true }}
                                {...form.getInputProps('noteBgColor')}
                            />
                            <NumberInput label="Width (empty = auto)" min={50} max={2000} step={10} placeholder="Auto" {...form.getInputProps('noteWidth')} />
                        </>
                    )}

                    {creationMode === 'background' && (
                        <>
                            <TextInput label="Name" placeholder="Image name (optional)" {...form.getInputProps('bgName')} />
                            <Tabs defaultValue="asset">
                                <Tabs.List>
                                    <Tabs.Tab value="asset">Asset</Tabs.Tab>
                                    <Tabs.Tab value="upload">Upload</Tabs.Tab>
                                </Tabs.List>

                                <Tabs.Panel value="upload" pt="sm">
                                    <FileInput label="Image" placeholder="Choose an image" {...form.getInputProps('image')} />
                                </Tabs.Panel>

                                <Tabs.Panel value="asset" pt="sm">
                                    <Stack gap="xs">
                                        <Group>
                                            <Button onClick={() => setShowAssetPicker(true)}>Open asset manager</Button>

                                            {form.values.assetId && selectedAsset && (
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                    }}
                                                >
                                                    <img
                                                        src={getFileUrl(selectedAsset, selectedAsset.file)}
                                                        alt="preview"
                                                        style={{
                                                            width: 64,
                                                            height: 64,
                                                            objectFit: 'cover',
                                                            borderRadius: 4,
                                                        }}
                                                    />
                                                    <div>
                                                        <div style={{ fontWeight: 600 }}>{selectedAsset.name}</div>
                                                        <div
                                                            style={{
                                                                fontSize: 12,
                                                                color: 'var(--mantine-color-dimmed)',
                                                            }}
                                                        >
                                                            {(selectedAsset.tags || []).join(', ')}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="subtle"
                                                        size="xs"
                                                        onClick={() => {
                                                            form.setFieldValue('assetId', '');
                                                            setSelectedAsset(null);
                                                        }}
                                                    >
                                                        Remove
                                                    </Button>
                                                </div>
                                            )}
                                        </Group>

                                        {assetHistory.length > 0 && (
                                            <div>
                                                <Text size="xs" c="dimmed" mb={4}>
                                                    Recent
                                                </Text>
                                                <Group gap={6}>
                                                    {assetHistory.map((a) => (
                                                        <Tooltip key={a.id} label={a.name} withArrow position="top">
                                                            <UnstyledButton
                                                                onClick={() => {
                                                                    handleAssetSelect(a as DncWorldmapAssetRecord & RecordModel);
                                                                }}
                                                                style={{
                                                                    border: form.values.assetId === a.id ? '2px solid var(--mantine-color-blue-5)' : '2px solid transparent',
                                                                    borderRadius: 6,
                                                                    overflow: 'hidden',
                                                                    lineHeight: 0,
                                                                    background: 'white',
                                                                }}
                                                            >
                                                                <img
                                                                    src={getFileUrl(a as RecordModel, a.file)}
                                                                    alt={a.name}
                                                                    style={{
                                                                        width: 48,
                                                                        height: 48,
                                                                        objectFit: 'cover',
                                                                        display: 'block',
                                                                    }}
                                                                />
                                                            </UnstyledButton>
                                                        </Tooltip>
                                                    ))}
                                                </Group>
                                            </div>
                                        )}
                                    </Stack>
                                </Tabs.Panel>
                            </Tabs>

                            <Group>
                                <NumberInput label="Width" {...form.getInputProps('width')} />
                                <NumberInput label="Height" {...form.getInputProps('height')} />
                            </Group>
                        </>
                    )}

                    {creationMode === 'line' && (
                        <>
                            <TextInput label="Name (optional)" placeholder="Line name..." {...form.getInputProps('lineName')} />
                            <ColorInput label="Color" placeholder="Choose a color" format="hex" popoverProps={{ withinPortal: true }} {...form.getInputProps('lineColor')} />
                            <NumberInput label="Thickness (px)" min={1} max={50} step={1} {...form.getInputProps('lineStrokeWidth')} />
                            <Select
                                label="Line style"
                                data={[
                                    { value: 'solid', label: 'Solid' },
                                    { value: 'dashed', label: 'Dashed' },
                                    { value: 'dotted', label: 'Dotted' },
                                ]}
                                {...form.getInputProps('lineDash')}
                            />
                        </>
                    )}

                    <Button type="submit" loading={loading}>
                        Create
                    </Button>
                </Stack>
            </form>
            <AssetPicker
                opened={showAssetPicker}
                onClose={() => setShowAssetPicker(false)}
                onSelect={(asset) => {
                    handleAssetSelect(asset as DncWorldmapAssetRecord & RecordModel);
                }}
            />
        </Modal>
    );
};
