import { ActionIcon, Badge, Box, Button, ColorInput, ColorSwatch, Divider, Group, ScrollArea, Slider, Stack, Text, Tooltip } from '@mantine/core';
import {
    IconArrowBackUp,
    IconArrowForwardUp,
    IconEraser,
    IconEye,
    IconEyeOff,
    IconLock,
    IconLockOpen,
    IconPencil,
    IconPencilPause,
    IconTrash,
    IconTrashX,
    IconX,
} from '@tabler/icons-react';
import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { mainColor } from '../../../constants';
import { useMapStore } from '../../../store/useMapStore';
import { HEADER_STYLE, PANEL_CONTAINER_STYLE } from './types';

const TOOL_LABEL: Record<string, string> = { pen: 'Pen', marker: 'Marker', eraser: 'Eraser' };

export const DrawingPanel: React.FC = () => {
    const {
        drawingLayer,
        setDrawingLayerHidden,
        setDrawingLayerLocked,
        setDrawingLayerTool,
        setDrawingLayerColor,
        setDrawingLayerSize,
        undoDraw,
        redoDraw,
        drawUndoStack,
        drawRedoStack,
        clearDrawStrokes,
        deleteDrawStroke,
        setSelectedElement,
    } = useMapStore(
        useShallow((state) => ({
            drawingLayer: state.drawingLayer,
            setDrawingLayerHidden: state.setDrawingLayerHidden,
            setDrawingLayerLocked: state.setDrawingLayerLocked,
            setDrawingLayerTool: state.setDrawingLayerTool,
            setDrawingLayerColor: state.setDrawingLayerColor,
            setDrawingLayerSize: state.setDrawingLayerSize,
            undoDraw: state.undoDraw,
            redoDraw: state.redoDraw,
            drawUndoStack: state.drawUndoStack,
            drawRedoStack: state.drawRedoStack,
            clearDrawStrokes: state.clearDrawStrokes,
            deleteDrawStroke: state.deleteDrawStroke,
            setSelectedElement: state.setSelectedElement,
        }))
    );

    const reversedStrokes = [...drawingLayer.strokes].reverse();

    return (
        <div style={PANEL_CONTAINER_STYLE}>
            <Group px="md" py="sm" justify="space-between" align="center" style={HEADER_STYLE}>
                <Group gap="xs" align="center">
                    <Text fw={600} size="sm">
                        Drawing Layer
                    </Text>
                    <Badge size="xs" variant="light" color={mainColor}>
                        {drawingLayer.strokes.length} stroke{drawingLayer.strokes.length !== 1 ? 's' : ''}
                    </Badge>
                </Group>
                <Group gap={2}>
                    <Tooltip label={drawingLayer.hidden ? 'Show' : 'Hide'} withArrow openDelay={400}>
                        <ActionIcon size="sm" variant={drawingLayer.hidden ? 'light' : 'subtle'} color={mainColor} onClick={() => setDrawingLayerHidden(!drawingLayer.hidden)}>
                            {drawingLayer.hidden ? <IconEyeOff /> : <IconEye />}
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label={drawingLayer.locked ? 'Unlock' : 'Lock'} withArrow openDelay={400}>
                        <ActionIcon size="sm" variant={drawingLayer.locked ? 'light' : 'subtle'} color="orange" onClick={() => setDrawingLayerLocked(!drawingLayer.locked)}>
                            {drawingLayer.locked ? <IconLock /> : <IconLockOpen />}
                        </ActionIcon>
                    </Tooltip>
                    <ActionIcon size="sm" variant="subtle" onClick={() => setSelectedElement(null)}>
                        <IconX />
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
                                <IconPencil />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Marker (semi-transparent)" withArrow>
                            <ActionIcon
                                size="lg"
                                variant={drawingLayer.activeTool === 'marker' ? 'filled' : 'default'}
                                color={mainColor}
                                onClick={() => setDrawingLayerTool('marker')}
                            >
                                <IconPencilPause />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Eraser" withArrow>
                            <ActionIcon
                                size="lg"
                                variant={drawingLayer.activeTool === 'eraser' ? 'filled' : 'default'}
                                color="orange"
                                onClick={() => setDrawingLayerTool('eraser')}
                            >
                                <IconEraser />
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

                <Group gap="xs">
                    <Tooltip label="Undo last stroke" withArrow>
                        <ActionIcon variant="light" color={mainColor} size="sm" disabled={drawUndoStack.length === 0} onClick={undoDraw}>
                            <IconArrowBackUp size={14} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Redo" withArrow>
                        <ActionIcon variant="light" color={mainColor} size="sm" disabled={drawRedoStack.length === 0} onClick={redoDraw}>
                            <IconArrowForwardUp size={14} />
                        </ActionIcon>
                    </Tooltip>
                    <Text size="xs" c="dimmed" style={{ flex: 1 }}>
                        {drawUndoStack.length} action{drawUndoStack.length !== 1 ? 's' : ''}
                    </Text>
                    <Button variant="light" color="red" leftSection={<IconTrashX size={13} />} size="xs" disabled={drawingLayer.strokes.length === 0} onClick={clearDrawStrokes}>
                        Clear all
                    </Button>
                </Group>

                <Divider
                    label={
                        <Text size="xs" c="dimmed">
                            {drawingLayer.strokes.length} trait{drawingLayer.strokes.length !== 1 ? 's' : ''}
                        </Text>
                    }
                    labelPosition="left"
                />

                {drawingLayer.strokes.length === 0 && (
                    <Text size="xs" c="dimmed" ta="center">
                        No strokes yet
                    </Text>
                )}

                <ScrollArea.Autosize mah={320} type="auto">
                    <Stack gap={4}>
                        {reversedStrokes.map((stroke) => (
                            <Box
                                key={stroke.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '4px 6px',
                                    borderRadius: 6,
                                    background: 'var(--mantine-color-dark-6)',
                                }}
                            >
                                {stroke.tool === 'eraser' ? (
                                    <IconEraser size={14} style={{ color: 'var(--mantine-color-orange-4)', flexShrink: 0 }} />
                                ) : (
                                    <ColorSwatch color={stroke.color} size={14} style={{ flexShrink: 0, opacity: stroke.tool === 'marker' ? 0.5 : 1 }} />
                                )}
                                <Text size="xs" style={{ flex: 1, minWidth: 0 }} truncate>
                                    {TOOL_LABEL[stroke.tool] ?? stroke.tool} — {stroke.size}px
                                </Text>
                                <ActionIcon size="xs" variant="subtle" color="red" onClick={() => deleteDrawStroke(stroke.id)}>
                                    <IconTrash size={11} />
                                </ActionIcon>
                            </Box>
                        ))}
                    </Stack>
                </ScrollArea.Autosize>
            </Stack>
        </div>
    );
};
