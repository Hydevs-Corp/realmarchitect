import { ActionIcon, Badge, Button, ColorInput, Divider, Group, Slider, Stack, Text, Tooltip } from '@mantine/core';
import { IconArrowBackUp, IconEraser, IconEye, IconEyeOff, IconLock, IconLockOpen, IconPencil, IconPencilPause, IconTrashX, IconX } from '@tabler/icons-react';
import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { mainColor } from '../../../constants';
import { useMapStore } from '../../../store/useMapStore';
import { HEADER_STYLE, PANEL_CONTAINER_STYLE } from './types';

export const DrawingPanel: React.FC = () => {
    const {
        drawingLayer,
        setDrawingLayerHidden,
        setDrawingLayerLocked,
        setDrawingLayerTool,
        setDrawingLayerColor,
        setDrawingLayerSize,
        undo,
        undoStack,
        clearDrawStrokes,
        setSelectedElement,
    } = useMapStore(
        useShallow((state) => ({
            drawingLayer: state.drawingLayer,
            setDrawingLayerHidden: state.setDrawingLayerHidden,
            setDrawingLayerLocked: state.setDrawingLayerLocked,
            setDrawingLayerTool: state.setDrawingLayerTool,
            setDrawingLayerColor: state.setDrawingLayerColor,
            setDrawingLayerSize: state.setDrawingLayerSize,
            undo: state.undo,
            undoStack: state.undoStack,
            clearDrawStrokes: state.clearDrawStrokes,
            setSelectedElement: state.setSelectedElement,
        }))
    );

    return (
        <div style={PANEL_CONTAINER_STYLE}>
            <Group px="md" py="sm" justify="space-between" align="center" style={HEADER_STYLE}>
                <Group gap="xs" align="center">
                    <Text fw={600} size="sm">
                        Couche de dessin
                    </Text>
                    <Badge size="xs" variant="light" color={mainColor}>
                        Dessin
                    </Badge>
                </Group>
                <Group gap={2}>
                    <Tooltip label={drawingLayer.hidden ? 'Show' : 'Hide'} withArrow openDelay={400}>
                        <ActionIcon size="sm" variant={drawingLayer.hidden ? 'light' : 'subtle'} color={mainColor} onClick={() => setDrawingLayerHidden(!drawingLayer.hidden)}>
                            {drawingLayer.hidden ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label={drawingLayer.locked ? 'Unlock' : 'Lock'} withArrow openDelay={400}>
                        <ActionIcon size="sm" variant={drawingLayer.locked ? 'light' : 'subtle'} color="orange" onClick={() => setDrawingLayerLocked(!drawingLayer.locked)}>
                            {drawingLayer.locked ? <IconLock size={14} /> : <IconLockOpen size={14} />}
                        </ActionIcon>
                    </Tooltip>
                    <ActionIcon size="sm" variant="subtle" onClick={() => setSelectedElement(null)}>
                        <IconX size={14} />
                    </ActionIcon>
                </Group>
            </Group>

            <Stack px="md" py="md" gap="md" style={{ overflow: 'auto', flex: 1 }}>
                {drawingLayer.locked && (
                    <Text size="xs" c="orange" ta="center">
                        Layer locked — unlock to draw
                    </Text>
                )}
                {drawingLayer.hidden && (
                    <Text size="xs" c="dimmed" ta="center">
                        Layer hidden — drawings are not visible
                    </Text>
                )}

                <div>
                    <Text size="xs" c="dimmed" mb={8}>
                        Tool
                    </Text>
                    <Group gap="xs">
                        <Tooltip label="Pen (thin line, opaque)" withArrow>
                            <ActionIcon size="lg" variant={drawingLayer.activeTool === 'pen' ? 'filled' : 'default'} color={mainColor} onClick={() => setDrawingLayerTool('pen')}>
                                <IconPencil size={16} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Marker (semi-transparent)" withArrow>
                            <ActionIcon
                                size="lg"
                                variant={drawingLayer.activeTool === 'marker' ? 'filled' : 'default'}
                                color={mainColor}
                                onClick={() => setDrawingLayerTool('marker')}
                            >
                                <IconPencilPause size={16} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Eraser" withArrow>
                            <ActionIcon
                                size="lg"
                                variant={drawingLayer.activeTool === 'eraser' ? 'filled' : 'default'}
                                color="orange"
                                onClick={() => setDrawingLayerTool('eraser')}
                            >
                                <IconEraser size={16} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </div>

                {drawingLayer.activeTool !== 'eraser' && (
                    <ColorInput
                        label="Stroke color"
                        value={drawingLayer.activeColor}
                        onChange={setDrawingLayerColor}
                        styles={{ dropdown: { zIndex: 1000 } }}
                        format="hex"
                        swatches={['#e03131', '#2f9e44', '#1971c2', '#f08c00', '#7048e8', '#c2255c', '#ffffff', '#000000', '#868e96']}
                    />
                )}

                <div>
                    <Text size="xs" c="dimmed" mb={8}>
                        Thickness{' '}
                        <Text span size="xs" fw={600}>
                            {drawingLayer.activeSize}px
                        </Text>
                    </Text>
                    <Slider value={drawingLayer.activeSize} onChange={setDrawingLayerSize} min={1} max={80} step={1} label={(v) => `${v}px`} />
                </div>

                <Divider />

                <Stack gap="xs">
                    <Button variant="light" color={mainColor} leftSection={<IconArrowBackUp size={14} />} size="xs" disabled={undoStack.length === 0} onClick={undo}>
                        Undo ({undoStack.length})
                    </Button>
                    <Button variant="light" color="red" leftSection={<IconTrashX size={14} />} size="xs" disabled={drawingLayer.strokes.length === 0} onClick={clearDrawStrokes}>
                        Clear all
                    </Button>
                </Stack>
            </Stack>
        </div>
    );
};
