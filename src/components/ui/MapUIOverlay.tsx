import { ActionIcon, Affix, Group, Kbd, Paper, Text, Tooltip } from '@mantine/core';
import { modals } from '@mantine/modals';
import { spotlight } from '@mantine/spotlight';
import { IconEdit, IconGrid3x3, IconLayoutList, IconLine, IconMapPin, IconNote, IconPencil, IconPhoto, IconPolygon, IconSearch, IconX } from '@tabler/icons-react';
import React, { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMapStore } from '../../store/useMapStore';
import { CreationModal } from './CreationModal';
import { ElementsPanel } from './ElementsPanel';
import { InfoPanel } from './InfoPanel';
import { MapSpotlight } from './MapSpotlight';
import { mainColor } from '../../constants';

const CREATION_ACTIONS = [
    {
        mode: 'poi' as const,
        icon: <IconMapPin size={18} />,
        label: 'Add POI',
        shortcut: 'P / 1',
    },
    {
        mode: 'zone' as const,
        icon: <IconPolygon size={18} />,
        label: 'Add Zone',
        shortcut: 'Z / 2',
    },
    {
        mode: 'note' as const,
        icon: <IconNote size={18} />,
        label: 'Add Note',
        shortcut: 'N / 3',
    },
    {
        mode: 'image' as const,
        icon: <IconPhoto size={18} />,
        label: 'Add Image',
        shortcut: 'B / 4',
    },
    {
        mode: 'line' as const,
        icon: <IconLine size={18} />,
        label: 'Add Line',
        shortcut: 'T / 5',
    },
    {
        mode: 'draw' as const,
        icon: <IconPencil size={18} />,
        label: 'Draw',
        shortcut: 'D / 6',
    },
];

export const MapUIOverlay: React.FC = () => {
    const {
        editMode,
        creationMode,
        setCreationMode,
        toggleEditMode,
        selectedElement,
        setSelectedElement,
        isElementsPanelOpen,
        setIsElementsPanelOpen,
        undo,
        redo,
        copySelected,
        paste,
        duplicateSelected,
        deletePoi,
        deleteZone,
        deleteNote,
        deleteImage,
        deleteLine,
        deleteMultiple,
        multiSelectedIds,
        showGrid,
        toggleGrid,
    } = useMapStore(
        useShallow((state) => ({
            editMode: state.editMode,
            creationMode: state.creationMode,
            setCreationMode: state.setCreationMode,
            toggleEditMode: state.toggleEditMode,
            selectedElement: state.selectedElement,
            setSelectedElement: state.setSelectedElement,
            isElementsPanelOpen: state.isElementsPanelOpen,
            setIsElementsPanelOpen: state.setIsElementsPanelOpen,
            undo: state.undo,
            redo: state.redo,
            copySelected: state.copySelected,
            paste: state.paste,
            duplicateSelected: state.duplicateSelected,
            deletePoi: state.deletePoi,
            deleteZone: state.deleteZone,
            deleteNote: state.deleteNote,
            deleteImage: state.deleteImage,
            deleteLine: state.deleteLine,
            deleteMultiple: state.deleteMultiple,
            multiSelectedIds: state.multiSelectedIds,
            showGrid: state.showGrid,
            toggleGrid: state.toggleGrid,
        }))
    );

    const handleSetDraw = () => {
        const next = creationMode === 'draw' ? 'none' : 'draw';
        setCreationMode(next);
        if (next === 'draw') {
            setSelectedElement({ id: 'drawing-layer', kind: 'drawing' });
        } else {
            setSelectedElement(null);
        }
    };

    const handleSetImage = () => {
        const next = creationMode === 'image' ? 'none' : 'image';
        setCreationMode(next);
        if (next === 'image') {
            setSelectedElement({ id: 'image-brush', kind: 'image-brush' });
        } else {
            setSelectedElement(null);
        }
    };

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            if (e.ctrlKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
                return;
            }
            if (e.ctrlKey && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                redo();
                return;
            }
            if (e.ctrlKey && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                copySelected();
                return;
            }
            if (e.ctrlKey && e.key.toLowerCase() === 'v') {
                e.preventDefault();
                void paste();
                return;
            }
            if (e.ctrlKey && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                void duplicateSelected();
                return;
            }

            switch (e.key.toLowerCase()) {
                case 'delete':
                case 'backspace': {
                    if (!editMode) break;
                    e.preventDefault();
                    if (multiSelectedIds.length > 1) {
                        const ids = [...multiSelectedIds];
                        modals.openConfirmModal({
                            title: `Delete ${ids.length} elements`,
                            centered: true,
                            zIndex: 3000,
                            children: (
                                <Text size="sm">
                                    Are you sure you want to delete <strong>{ids.length} elements</strong>? This action can be undone with Ctrl+Z.
                                </Text>
                            ),
                            labels: { confirm: 'Delete all', cancel: 'Cancel' },
                            confirmProps: { color: 'red' },
                            onConfirm: () => deleteMultiple(ids),
                        });
                        break;
                    }
                    if (!selectedElement) break;
                    if (selectedElement.kind === 'drawing' || selectedElement.kind === 'image-brush') break;
                    const kindLabels: Record<string, string> = {
                        poi: 'POI',
                        zone: 'Zone',
                        note: 'Note',
                        image: 'Image',
                        line: 'Line',
                    };
                    const label = kindLabels[selectedElement.kind] ?? 'element';
                    const id = selectedElement.id;
                    const kind = selectedElement.kind;
                    modals.openConfirmModal({
                        title: `Delete ${label}`,
                        zIndex: 3000,
                        centered: true,
                        children: (
                            <Text size="sm">
                                Are you sure you want to delete this <strong>{label}</strong>? This action can be undone with Ctrl+Z.
                            </Text>
                        ),
                        labels: { confirm: 'Delete', cancel: 'Cancel' },
                        confirmProps: { color: 'red' },
                        onConfirm: () => {
                            if (kind === 'poi') deletePoi(id);
                            else if (kind === 'zone') deleteZone(id);
                            else if (kind === 'note') deleteNote(id);
                            else if (kind === 'image') deleteImage(id);
                            else if (kind === 'line') deleteLine(id);
                        },
                    });
                    break;
                }
                case 'escape':
                    if (creationMode !== 'none') {
                        setCreationMode('none');
                        if (creationMode === 'draw' || creationMode === 'image') setSelectedElement(null);
                    } else if (selectedElement) {
                        setSelectedElement(null);
                    }
                    break;
                case 'e':
                    toggleEditMode();
                    break;
                case 'p':
                case '1':
                    if (editMode) setCreationMode(creationMode === 'poi' ? 'none' : 'poi');
                    break;
                case 'z':
                case '2':
                    if (editMode) setCreationMode(creationMode === 'zone' ? 'none' : 'zone');
                    break;
                case 'n':
                case '3':
                    if (editMode) setCreationMode(creationMode === 'note' ? 'none' : 'note');
                    break;
                case 'b':
                case '4':
                    if (editMode) {
                        const next = creationMode === 'image' ? 'none' : 'image';
                        setCreationMode(next);
                        if (next === 'image') {
                            setSelectedElement({ id: 'image-brush', kind: 'image-brush' });
                        } else {
                            setSelectedElement(null);
                        }
                    }
                    break;
                case 't':
                case '5':
                    if (editMode) setCreationMode(creationMode === 'line' ? 'none' : 'line');
                    break;
                case 'd':
                case '6':
                    if (editMode) {
                        const next = creationMode === 'draw' ? 'none' : 'draw';
                        setCreationMode(next);
                        if (next === 'draw') {
                            setSelectedElement({ id: 'drawing-layer', kind: 'drawing' });
                        } else {
                            setSelectedElement(null);
                        }
                    }
                    break;
                case 'l':
                    setIsElementsPanelOpen(!isElementsPanelOpen);
                    break;
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [
        creationMode,
        editMode,
        isElementsPanelOpen,
        selectedElement,
        setCreationMode,
        setIsElementsPanelOpen,
        setSelectedElement,
        toggleEditMode,
        undo,
        redo,
        copySelected,
        paste,
        duplicateSelected,
        deletePoi,
        deleteZone,
        deleteNote,
        deleteImage,
        deleteLine,
        multiSelectedIds,
        deleteMultiple,
    ]);

    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100vw',
                height: 'calc(100svh - var(--app-shell-header-height))',
                pointerEvents: 'none',
                zIndex: 1000,
            }}
        >
            <CreationModal />
            <InfoPanel />
            <MapSpotlight />
            <ElementsPanel />

            <Affix left={0} bottom={0} w={'fit-content'}>
                <Group gap={'xs'}>
                    <Paper
                        shadow="md"
                        p="xs"
                        withBorder
                        style={{
                            borderBottom: 'none',
                            borderLeft: 'none',
                        }}
                    >
                        <Group gap="xs">
                            <Tooltip
                                label={
                                    <Group gap={4}>
                                        <IconLayoutList size={12} />
                                        <Text size="xs">Elements</Text>
                                        <Kbd size="xs">L</Kbd>
                                    </Group>
                                }
                                position="top"
                            >
                                <ActionIcon
                                    size="lg"
                                    variant={isElementsPanelOpen ? 'filled' : 'default'}
                                    color={isElementsPanelOpen ? mainColor : undefined}
                                    onClick={() => setIsElementsPanelOpen(!isElementsPanelOpen)}
                                >
                                    <IconLayoutList size={18} />
                                </ActionIcon>
                            </Tooltip>
                            <Tooltip
                                label={
                                    <Group gap={4}>
                                        <IconSearch size={12} />
                                        <Text size="xs">Search</Text>
                                        <Kbd size="xs">Ctrl+K</Kbd>
                                    </Group>
                                }
                                position="top"
                            >
                                <ActionIcon size="lg" variant="default" onClick={spotlight.open}>
                                    <IconSearch size={18} />
                                </ActionIcon>
                            </Tooltip>
                            <Tooltip
                                label={
                                    <Group gap={4}>
                                        <IconEdit size={12} />
                                        <Text size="xs">Edit mode</Text>
                                        <Kbd size="xs">E</Kbd>
                                    </Group>
                                }
                                position="top"
                            >
                                <ActionIcon size="lg" variant={editMode ? 'white' : 'filled'} onClick={toggleEditMode}>
                                    <IconEdit />
                                </ActionIcon>
                            </Tooltip>
                            {editMode &&
                                CREATION_ACTIONS.map(({ mode, icon, label, shortcut }) => (
                                    <Tooltip
                                        key={mode}
                                        label={
                                            <Group gap={4}>
                                                {icon}
                                                <Text size="xs">{label}</Text>
                                                <Kbd size="xs">{shortcut}</Kbd>
                                            </Group>
                                        }
                                        position="top"
                                    >
                                        <ActionIcon
                                            size="lg"
                                            variant={creationMode === mode ? 'filled' : 'default'}
                                            color={creationMode === mode ? mainColor : 'gray'}
                                            onClick={() =>
                                                mode === 'draw'
                                                    ? handleSetDraw()
                                                    : mode === 'image'
                                                      ? handleSetImage()
                                                      : setCreationMode(creationMode === mode ? 'none' : mode)
                                            }
                                        >
                                            {icon}
                                        </ActionIcon>
                                    </Tooltip>
                                ))}
                            <Tooltip
                                label={
                                    <Group gap={4}>
                                        <IconGrid3x3 size={12} />
                                        <Text size="xs">Toggle grid</Text>
                                    </Group>
                                }
                                position="top"
                            >
                                <ActionIcon size="lg" variant={showGrid ? 'filled' : 'default'} color={showGrid ? mainColor : undefined} onClick={toggleGrid}>
                                    <IconGrid3x3 size={18} />
                                </ActionIcon>
                            </Tooltip>
                            {creationMode !== 'none' && (
                                <Tooltip label="Cancel (Escape)" position="top">
                                    <ActionIcon
                                        size="lg"
                                        variant="filled"
                                        color="red"
                                        onClick={() => {
                                            setCreationMode('none');
                                            setSelectedElement(null);
                                        }}
                                    >
                                        <IconX size={18} />
                                    </ActionIcon>
                                </Tooltip>
                            )}
                        </Group>
                    </Paper>
                    {creationMode !== 'none' && (
                        <Paper shadow="md" p="xs" withBorder>
                            <Text size="xs" c="dimmed">
                                {creationMode === 'zone'
                                    ? 'Click to place points · Click on the 1st point to close'
                                    : creationMode === 'line'
                                      ? 'Click to place point A · then click to place point B'
                                      : creationMode === 'draw'
                                        ? 'Draw freehand · Adjust options in the details panel'
                                        : creationMode === 'image'
                                          ? 'Select an image in the panel · then click to place'
                                          : 'Click on the map to place'}
                                {' · '}
                                <Kbd>Escape</Kbd> to cancel
                            </Text>
                        </Paper>
                    )}
                </Group>
            </Affix>
        </div>
    );
};
