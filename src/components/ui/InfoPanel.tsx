import React, { useEffect, useState } from 'react';
import {
    ActionIcon,
    Badge,
    Box,
    Button,
    ColorInput,
    ColorSwatch,
    Divider,
    Flex,
    Group,
    NumberInput,
    Select,
    Slider,
    Stack,
    Text,
    Textarea,
    TextInput,
    Switch,
    Tooltip,
} from '@mantine/core';
import {
    IconTrash,
    IconX,
    IconCheck,
    IconEye,
    IconEyeOff,
    IconLock,
    IconLockOpen,
    IconFocus2,
    IconLinkOff,
    IconPencil,
    IconPencilPause,
    IconEraser,
    IconArrowBackUp,
    IconTrashX,
    IconPin,
    IconPinFilled,
    IconFilter,
    IconFilterOff,
} from '@tabler/icons-react';
import { useShallow } from 'zustand/react/shallow';
import { useMapStore } from '../../store/useMapStore';
import {
    updatePOI as apiUpdatePOI,
    updateZone as apiUpdateZone,
    updateNote as apiUpdateNote,
    updateBackground as apiUpdateBackground,
    updateLine as apiUpdateLine,
    deletePOI as apiDeletePOI,
    deleteZone as apiDeleteZone,
    deleteNote as apiDeleteNote,
    deleteBackground as apiDeleteBackground,
    deleteLine as apiDeleteLine,
} from '../../lib/api';
import { Hypb } from '@hydevs/hypb';
import { ZONE_COLOR_SWATCHES, ZONE_PATTERNS } from '../../lib/zoneColors';
import { mainColor } from '../../constants';

export const InfoPanel: React.FC = () => {
    const {
        selectedElement,
        pois,
        zones,
        notes,
        backgrounds,
        lines,
        elementTypes,
        editMode,
        setSelectedElement,
        updatePoi,
        updateZone,
        updateNote,
        updateBackground,
        updateLine,
        deletePoi,
        deleteZone,
        deleteNote,
        deleteBackground,
        deleteLine,
        toggleElementHidden,
        toggleElementLocked,
        toggleElementPinned,
        setCenterTarget,
        activeZoneFilterId,
        setActiveZoneFilter,
        drawingLayer,
        setDrawingLayerHidden,
        setDrawingLayerLocked,
        setDrawingLayerTool,
        setDrawingLayerColor,
        setDrawingLayerSize,
        undoLastDrawStroke,
        clearDrawStrokes,
    } = useMapStore(
        useShallow((state) => ({
            selectedElement: state.selectedElement,
            pois: state.pois,
            zones: state.zones,
            notes: state.notes,
            backgrounds: state.backgrounds,
            lines: state.lines,
            elementTypes: state.elementTypes,
            editMode: state.editMode,
            setSelectedElement: state.setSelectedElement,
            updatePoi: state.updatePoi,
            updateZone: state.updateZone,
            updateNote: state.updateNote,
            updateBackground: state.updateBackground,
            updateLine: state.updateLine,
            deletePoi: state.deletePoi,
            deleteZone: state.deleteZone,
            deleteNote: state.deleteNote,
            deleteBackground: state.deleteBackground,
            deleteLine: state.deleteLine,
            toggleElementHidden: state.toggleElementHidden,
            toggleElementLocked: state.toggleElementLocked,
            toggleElementPinned: state.toggleElementPinned,
            setCenterTarget: state.setCenterTarget,
            activeZoneFilterId: state.activeZoneFilterId,
            setActiveZoneFilter: state.setActiveZoneFilter,
            drawingLayer: state.drawingLayer,
            setDrawingLayerHidden: state.setDrawingLayerHidden,
            setDrawingLayerLocked: state.setDrawingLayerLocked,
            setDrawingLayerTool: state.setDrawingLayerTool,
            setDrawingLayerColor: state.setDrawingLayerColor,
            setDrawingLayerSize: state.setDrawingLayerSize,
            undoLastDrawStroke: state.undoLastDrawStroke,
            clearDrawStrokes: state.clearDrawStrokes,
        }))
    );

    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formPoitype, setFormPoitype] = useState('');
    const [formPoiSize, setFormPoiSize] = useState<number>(10);
    const [formContent, setFormContent] = useState('');
    const [formNoteFontSize, setFormNoteFontSize] = useState<number>(14);
    const [formNoteBgColor, setFormNoteBgColor] = useState('#fff9c4ff');
    const [formNoteWidth, setFormNoteWidth] = useState<number | ''>('');
    const [formNoteIsComment, setFormNoteIsComment] = useState<boolean>(false);
    const [formZoneColor, setFormZoneColor] = useState('');
    const [formZonePattern, setFormZonePattern] = useState('');
    const [formZIndex, setFormZIndex] = useState<number>(0);
    const [formBgX, setFormBgX] = useState<number>(0);
    const [formBgY, setFormBgY] = useState<number>(0);
    const [formBgWidth, setFormBgWidth] = useState<number>(1000);
    const [formBgHeight, setFormBgHeight] = useState<number>(1000);
    const [formBgName, setFormBgName] = useState<string>('');
    const [formBgRotation, setFormBgRotation] = useState<number>(0);
    const [formBgLockAspect, setFormBgLockAspect] = useState<boolean>(false);
    const [formLineName, setFormLineName] = useState<string>('');
    const [formLineColor, setFormLineColor] = useState<string>('#ffffff');
    const [formLineStrokeWidth, setFormLineStrokeWidth] = useState<number>(2);
    const [formLineDash, setFormLineDash] = useState<string>('solid');
    const [formLineAx, setFormLineAx] = useState<number>(0);
    const [formLineAy, setFormLineAy] = useState<number>(0);
    const [formLineBx, setFormLineBx] = useState<number>(100);
    const [formLineBy, setFormLineBy] = useState<number>(100);
    const [formLineCx, setFormLineCx] = useState<number | ''>('');
    const [formLineCy, setFormLineCy] = useState<number | ''>('');
    const [formLineAAttach, setFormLineAAttach] = useState<string>('');
    const [formLineBAttach, setFormLineBAttach] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleViewElements = () => {
        if (selectedElement?.kind === 'zone') {
            setActiveZoneFilter(selectedElement.id);
        }
    };

    const handleClearFilter = () => {
        setActiveZoneFilter(null);
    };

    useEffect(() => {
        if (!selectedElement) return;
        setConfirmDelete(false);
        const { id, kind } = selectedElement;

        if (kind === 'poi') {
            const poi = pois.find((p) => p.id === id);
            if (poi) {
                setFormName(poi.name);
                setFormDescription(poi.description ?? '');
                setFormPoitype(poi.type);
                setFormZIndex(poi.zIndex);
            }
        } else if (kind === 'zone') {
            const zone = zones.find((z) => z.id === id);
            if (zone) {
                setFormName(zone.name);
                setFormDescription(zone.description ?? '');
                setFormZoneColor(zone.color);
                setFormZonePattern(zone.pattern ?? '');
                setFormZIndex(zone.zIndex);
            }
        } else if (kind === 'note') {
            const note = notes.find((n) => n.id === id);
            if (note) {
                setFormContent(note.content);
                setFormNoteFontSize(note.fontSize ?? 14);
                setFormNoteBgColor(note.bgColor ?? '#fff9c4ff');
                setFormNoteWidth(note.width ?? '');
                setFormNoteIsComment(!!note.author);
                setFormZIndex(note.zIndex);
            }
        } else if (kind === 'background') {
            const bg = backgrounds.find((b) => b.id === id);
            if (bg) {
                setFormBgName(bg.name ?? '');
                setFormBgX(bg.x);
                setFormBgY(bg.y);
                setFormBgWidth(bg.width);
                setFormBgHeight(bg.height);
                setFormBgRotation(bg.rotation ?? 0);
                setFormBgLockAspect(!!bg.lockAspectRatio);
                setFormZIndex(bg.zIndex);
            }
        } else if (kind === 'line') {
            const line = lines.find((l) => l.id === id);
            if (line) {
                setFormLineName(line.name ?? '');
                setFormLineColor(line.color);
                setFormLineStrokeWidth(line.strokeWidth ?? 2);
                setFormLineDash(line.dashPattern ?? 'solid');
                setFormLineAx(line.x);
                setFormLineAy(line.y);
                setFormLineBx(line.bx);
                setFormLineBy(line.by);
                setFormLineCx(line.cx ?? '');
                setFormLineCy(line.cy ?? '');
                setFormLineAAttach(line.aAttachedId && line.aAttachedKind ? `${line.aAttachedKind}:${line.aAttachedId}` : '');
                setFormLineBAttach(line.bAttachedId && line.bAttachedKind ? `${line.bAttachedKind}:${line.bAttachedId}` : '');
                setFormZIndex(line.zIndex);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedElement?.id, selectedElement?.kind]);

    const _selectedBg = selectedElement?.kind === 'background' ? backgrounds.find((b) => b.id === selectedElement.id) : null;
    const _bgX = _selectedBg?.x;
    const _bgY = _selectedBg?.y;
    const _bgWidth = _selectedBg?.width;
    const _bgHeight = _selectedBg?.height;

    useEffect(() => {
        if (_bgX === undefined || _bgY === undefined || _bgWidth === undefined || _bgHeight === undefined) return;
        setFormBgX(_bgX);
        setFormBgY(_bgY);
        setFormBgWidth(_bgWidth);
        setFormBgHeight(_bgHeight);
        setFormBgRotation(_selectedBg?.rotation ?? 0);
        setFormBgLockAspect(!!_selectedBg?.lockAspectRatio);
    }, [_bgX, _bgY, _bgWidth, _bgHeight, _selectedBg?.rotation, _selectedBg?.lockAspectRatio]);

    const _selectedLine = selectedElement?.kind === 'line' ? lines.find((l) => l.id === selectedElement.id) : null;
    const _lineAx = _selectedLine?.x;
    const _lineAy = _selectedLine?.y;
    const _lineBx = _selectedLine?.bx;
    const _lineBy = _selectedLine?.by;
    const _lineCx = _selectedLine?.cx;
    const _lineCy = _selectedLine?.cy;
    const _lineAAttachedId = _selectedLine?.aAttachedId;
    const _lineAAttachedKind = _selectedLine?.aAttachedKind;
    const _lineBAttachedId = _selectedLine?.bAttachedId;
    const _lineBAttachedKind = _selectedLine?.bAttachedKind;

    useEffect(() => {
        if (_lineAx === undefined || _lineAy === undefined || _lineBx === undefined || _lineBy === undefined) return;
        setFormLineAx(_lineAx);
        setFormLineAy(_lineAy);
        setFormLineBx(_lineBx);
        setFormLineBy(_lineBy);
        setFormLineCx(_lineCx ?? '');
        setFormLineCy(_lineCy ?? '');
        setFormLineAAttach(_lineAAttachedId && _lineAAttachedKind ? `${_lineAAttachedKind}:${_lineAAttachedId}` : '');
        setFormLineBAttach(_lineBAttachedId && _lineBAttachedKind ? `${_lineBAttachedKind}:${_lineBAttachedId}` : '');
    }, [_lineAx, _lineAy, _lineBx, _lineBy, _lineCx, _lineCy, _lineAAttachedId, _lineAAttachedKind, _lineBAttachedId, _lineBAttachedKind]);

    if (!selectedElement) return null;

    const { id, kind } = selectedElement;

    if (kind === 'drawing') {
        return (
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 350,
                    height: '100vh',
                    pointerEvents: 'auto',
                    zIndex: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: 'var(--mantine-color-body)',
                    borderLeft: '1px solid var(--mantine-color-default-border)',
                    boxShadow: '-4px 0 16px rgba(0,0,0,0.15)',
                }}
            >
                <Group
                    px="md"
                    py="sm"
                    justify="space-between"
                    align="center"
                    style={{
                        borderBottom: '1px solid var(--mantine-color-default-border)',
                        flexShrink: 0,
                    }}
                >
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
                                <ActionIcon
                                    size="lg"
                                    variant={drawingLayer.activeTool === 'pen' ? 'filled' : 'default'}
                                    color={mainColor}
                                    onClick={() => setDrawingLayerTool('pen')}
                                >
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
                            styles={{
                                dropdown: {
                                    zIndex: 1000,
                                },
                            }}
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
                        <Button
                            variant="light"
                            color={mainColor}
                            leftSection={<IconArrowBackUp size={14} />}
                            size="xs"
                            disabled={drawingLayer.strokes.length === 0}
                            onClick={undoLastDrawStroke}
                        >
                            Undo last stroke ({drawingLayer.strokes.length})
                        </Button>
                        <Button
                            variant="light"
                            color="red"
                            leftSection={<IconTrashX size={14} />}
                            size="xs"
                            disabled={drawingLayer.strokes.length === 0}
                            onClick={clearDrawStrokes}
                        >
                            Clear all
                        </Button>
                    </Stack>
                </Stack>
            </div>
        );
    }

    let name = '';
    let description: string | undefined;
    let color: string | undefined;
    let content: string | undefined;
    let pattern: string | undefined;
    let typeName: string | undefined;

    if (kind === 'poi') {
        const poi = pois.find((p) => p.id === id);
        if (!poi) return null;
        name = poi.name;
        description = poi.description;
        color = poi.color;
        typeName = elementTypes.find((t) => t.id === poi.type)?.name;
    } else if (kind === 'zone') {
        const zone = zones.find((z) => z.id === id);
        if (!zone) return null;
        name = zone.name;
        description = zone.description;
        color = zone.color;
        pattern = zone.pattern;
    } else if (kind === 'note') {
        const note = notes.find((n) => n.id === id);
        if (!note) return null;
        content = note.content;
    } else if (kind === 'background') {
        const bg = backgrounds.find((b) => b.id === id);
        if (!bg) return null;
        name = bg.name ?? '';
    } else if (kind === 'line') {
        const line = lines.find((l) => l.id === id);
        if (!line) return null;
        name = line.name ?? '';
        color = line.color;
    }

    const handleSave = async () => {
        setSaving(true);
        try {
            if (kind === 'poi') {
                const selectedType = elementTypes.find((t) => t.id === formPoitype);
                const updates = {
                    name: formName,
                    description: formDescription,
                    type: formPoitype,
                    color: selectedType?.color ?? color,
                    size: formPoiSize,
                    zIndex: formZIndex,
                };
                updatePoi(id, updates);
                await apiUpdatePOI(id, updates);
            } else if (kind === 'zone') {
                const updates = {
                    name: formName,
                    description: formDescription,
                    color: formZoneColor,
                    pattern: formZonePattern,
                    zIndex: formZIndex,
                };
                updateZone(id, updates);
                await apiUpdateZone(id, updates);
            } else if (kind === 'note') {
                const updates = {
                    content: formContent,
                    fontSize: formNoteFontSize,
                    bgColor: formNoteBgColor,
                    width: formNoteWidth !== '' ? formNoteWidth : undefined,
                    zIndex: formZIndex,
                    author: formNoteIsComment ? Hypb.pb.authStore.record?.id : undefined,
                };
                updateNote(id, updates);
                await apiUpdateNote(id, updates);
            } else if (kind === 'background') {
                const updates = {
                    name: formBgName,
                    x: formBgX,
                    y: formBgY,
                    width: formBgWidth,
                    height: formBgHeight,
                    rotation: formBgRotation,
                    lockAspectRatio: formBgLockAspect,
                    zIndex: formZIndex,
                };
                updateBackground(id, updates);
                await apiUpdateBackground(id, updates);
            } else if (kind === 'line') {
                const parseAttach = (val: string) => {
                    if (!val) return { id: undefined, kind: undefined };
                    const sep = val.indexOf(':');
                    return {
                        kind: val.slice(0, sep) as 'poi' | 'zone' | 'note' | 'background',
                        id: val.slice(sep + 1),
                    };
                };
                const aAttach = parseAttach(formLineAAttach);
                const bAttach = parseAttach(formLineBAttach);
                const updates = {
                    name: formLineName || undefined,
                    color: formLineColor,
                    strokeWidth: formLineStrokeWidth,
                    dashPattern: formLineDash as 'solid' | 'dashed' | 'dotted',
                    x: formLineAx,
                    y: formLineAy,
                    bx: formLineBx,
                    by: formLineBy,
                    cx: formLineCx !== '' ? formLineCx : undefined,
                    cy: formLineCy !== '' ? formLineCy : undefined,
                    aAttachedId: aAttach.id,
                    aAttachedKind: aAttach.kind,
                    bAttachedId: bAttach.id,
                    bAttachedKind: bAttach.kind,
                    zIndex: formZIndex,
                };
                updateLine(id, updates);
                await apiUpdateLine(id, updates);
            }
        } finally {
            setSaving(false);
        }
    };

    let isDirty = false;
    if (kind === 'poi') {
        const poi = pois.find((p) => p.id === id);
        isDirty =
            !!poi &&
            (formName !== poi.name || formDescription !== (poi.description ?? '') || formPoitype !== poi.type || formPoiSize !== (poi.size ?? 10) || formZIndex !== poi.zIndex);
    } else if (kind === 'zone') {
        const zone = zones.find((z) => z.id === id);
        isDirty =
            !!zone &&
            (formName !== zone.name ||
                formDescription !== (zone.description ?? '') ||
                formZoneColor !== zone.color ||
                formZonePattern !== (zone.pattern ?? '') ||
                formZIndex !== zone.zIndex);
    } else if (kind === 'note') {
        const note = notes.find((n) => n.id === id);
        isDirty =
            !!note &&
            (formContent !== note.content ||
                formNoteFontSize !== (note.fontSize ?? 14) ||
                formNoteBgColor !== (note.bgColor ?? '#fff9c4ff') ||
                formNoteWidth !== (note.width ?? '') ||
                formZIndex !== note.zIndex ||
                formNoteIsComment !== !!note.author);
    } else if (kind === 'background') {
        const bg = backgrounds.find((b) => b.id === id);
        isDirty =
            !!bg &&
            (formBgName !== (bg.name ?? '') ||
                formBgX !== bg.x ||
                formBgY !== bg.y ||
                formBgWidth !== bg.width ||
                formBgHeight !== bg.height ||
                formBgRotation !== (bg.rotation ?? 0) ||
                formBgLockAspect !== !!bg.lockAspectRatio ||
                formZIndex !== bg.zIndex);
    } else if (kind === 'line') {
        const line = lines.find((l) => l.id === id);
        isDirty =
            !!line &&
            (formLineName !== (line.name ?? '') ||
                formLineColor !== line.color ||
                formLineStrokeWidth !== (line.strokeWidth ?? 2) ||
                formLineDash !== (line.dashPattern ?? 'solid') ||
                formLineAx !== line.x ||
                formLineAy !== line.y ||
                formLineBx !== line.bx ||
                formLineBy !== line.by ||
                formLineCx !== (line.cx ?? '') ||
                formLineCy !== (line.cy ?? '') ||
                formLineAAttach !== (line.aAttachedId && line.aAttachedKind ? `${line.aAttachedKind}:${line.aAttachedId}` : '') ||
                formLineBAttach !== (line.bAttachedId && line.bAttachedKind ? `${line.bAttachedKind}:${line.bAttachedId}` : '') ||
                formZIndex !== line.zIndex);
    }

    const handleDelete = async () => {
        if (!confirmDelete) {
            setConfirmDelete(true);
            return;
        }
        if (kind === 'poi') {
            deletePoi(id);
            await apiDeletePOI(id);
        } else if (kind === 'zone') {
            deleteZone(id);
            await apiDeleteZone(id);
        } else if (kind === 'note') {
            deleteNote(id);
            await apiDeleteNote(id);
        } else if (kind === 'background') {
            deleteBackground(id);
            await apiDeleteBackground(id);
        } else if (kind === 'line') {
            deleteLine(id);
            await apiDeleteLine(id);
        }
        setSelectedElement(null);
    };

    const handleDetachA = () => {
        if (kind !== 'line') return;
        const line = lines.find((l) => l.id === id);
        if (!line || !line.aAttachedId) return;
        let absX = line.x,
            absY = line.y;
        if (line.aAttachedKind === 'poi') {
            const p = pois.find((p) => p.id === line.aAttachedId);
            if (p) {
                absX = p.x + line.x;
                absY = p.y + line.y;
            }
        } else if (line.aAttachedKind === 'note') {
            const n = notes.find((n) => n.id === line.aAttachedId);
            if (n) {
                absX = n.x + line.x;
                absY = n.y + line.y;
            }
        } else if (line.aAttachedKind === 'background') {
            const b = backgrounds.find((b) => b.id === line.aAttachedId);
            if (b) {
                absX = b.x + line.x;
                absY = b.y + line.y;
            }
        }
        const updates = {
            x: absX,
            y: absY,
            aAttachedId: undefined,
            aAttachedKind: undefined,
        };
        updateLine(id, updates);
        apiUpdateLine(id, updates);
        setFormLineAAttach('');
        setFormLineAx(absX);
        setFormLineAy(absY);
    };

    const handleDetachB = () => {
        if (kind !== 'line') return;
        const line = lines.find((l) => l.id === id);
        if (!line || !line.bAttachedId) return;
        let absX = line.bx,
            absY = line.by;
        if (line.bAttachedKind === 'poi') {
            const p = pois.find((p) => p.id === line.bAttachedId);
            if (p) {
                absX = p.x + line.bx;
                absY = p.y + line.by;
            }
        } else if (line.bAttachedKind === 'note') {
            const n = notes.find((n) => n.id === line.bAttachedId);
            if (n) {
                absX = n.x + line.bx;
                absY = n.y + line.by;
            }
        } else if (line.bAttachedKind === 'background') {
            const b = backgrounds.find((b) => b.id === line.bAttachedId);
            if (b) {
                absX = b.x + line.bx;
                absY = b.y + line.by;
            }
        }
        const updates = {
            bx: absX,
            by: absY,
            bAttachedId: undefined,
            bAttachedKind: undefined,
        };
        updateLine(id, updates);
        apiUpdateLine(id, updates);
        setFormLineBAttach('');
        setFormLineBx(absX);
        setFormLineBy(absY);
    };

    const kindLabel = kind === 'poi' ? 'POI' : kind === 'zone' ? 'Zone' : kind === 'note' ? 'Note' : kind === 'line' ? 'Line' : 'Image';

    const _currentElement =
        kind === 'poi'
            ? pois.find((p) => p.id === id)
            : kind === 'zone'
              ? zones.find((z) => z.id === id)
              : kind === 'note'
                ? notes.find((n) => n.id === id)
                : kind === 'line'
                  ? lines.find((l) => l.id === id)
                  : backgrounds.find((b) => b.id === id);
    const isHidden = !!_currentElement?.hidden;
    const isLocked = !!_currentElement?.locked;
    const isPinned = !!_currentElement?.pinned;

    function handleFocus() {
        if (kind === 'poi') {
            const poi = pois.find((p) => p.id === id);
            if (poi) setCenterTarget({ x: poi.x, y: poi.y });
        } else if (kind === 'zone') {
            const zone = zones.find((z) => z.id === id);
            if (zone) {
                let sx = 0,
                    sy = 0;
                const n = zone.points.length / 2;
                for (let i = 0; i < zone.points.length; i += 2) {
                    sx += zone.points[i];
                    sy += zone.points[i + 1];
                }
                setCenterTarget({ x: sx / n, y: sy / n });
            }
        } else if (kind === 'note') {
            const note = notes.find((n) => n.id === id);
            if (note) setCenterTarget({ x: note.x, y: note.y });
        } else if (kind === 'background') {
            const bg = backgrounds.find((b) => b.id === id);
            if (bg) setCenterTarget({ x: bg.x + bg.width / 2, y: bg.y + bg.height / 2 });
        } else if (kind === 'line') {
            const line = lines.find((l) => l.id === id);
            if (line)
                setCenterTarget({
                    x: (line.x + line.bx) / 2,
                    y: (line.y + line.by) / 2,
                });
        }
    }

    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 350,
                height: '100vh',
                pointerEvents: 'auto',
                zIndex: 0,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--mantine-color-body)',
                borderLeft: '1px solid var(--mantine-color-default-border)',
                boxShadow: '-4px 0 16px rgba(0,0,0,0.15)',
            }}
        >
            <Group
                px="md"
                py="sm"
                justify="space-between"
                align="center"
                style={{
                    borderBottom: '1px solid var(--mantine-color-default-border)',
                    flexShrink: 0,
                }}
            >
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
                        <ActionIcon size="sm" variant="subtle" color={mainColor} onClick={handleFocus}>
                            <IconFocus2 size={14} />
                        </ActionIcon>
                    </Tooltip>

                    <Tooltip label={isHidden ? 'Show' : 'Hide'} withArrow openDelay={400}>
                        <ActionIcon size="sm" variant={isHidden ? 'light' : 'subtle'} color={isHidden ? 'gray' : mainColor} onClick={() => toggleElementHidden(id)}>
                            {isHidden ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label={isLocked ? 'Unlock' : 'Lock'} withArrow openDelay={400}>
                        <ActionIcon size="sm" variant={isLocked ? 'light' : 'subtle'} color={isLocked ? 'orange' : 'gray'} onClick={() => toggleElementLocked(id)}>
                            {isLocked ? <IconLock size={14} /> : <IconLockOpen size={14} />}
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label={isPinned ? 'Unpin' : 'Pin'} withArrow openDelay={400}>
                        <ActionIcon size="sm" variant={isPinned ? 'light' : 'subtle'} color={isPinned ? 'orange' : 'gray'} onClick={() => toggleElementPinned(id)}>
                            {isPinned ? <IconPinFilled size={14} /> : <IconPin size={14} />}
                        </ActionIcon>
                    </Tooltip>
                    {kind === 'zone' &&
                        (activeZoneFilterId ? (
                            <Tooltip label="Exit filter" withArrow openDelay={400}>
                                <ActionIcon size="sm" variant="subtle" color="gray" onClick={handleClearFilter}>
                                    <IconFilterOff size={14} />
                                </ActionIcon>
                            </Tooltip>
                        ) : (
                            <Tooltip label="See elements in zone" withArrow openDelay={400}>
                                <ActionIcon size="sm" variant="subtle" color="blue" onClick={handleViewElements}>
                                    <IconFilter size={14} />
                                </ActionIcon>
                            </Tooltip>
                        ))}
                    <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => setSelectedElement(null)}>
                        <IconX size={14} />
                    </ActionIcon>
                </Group>
            </Group>

            <Flex direction={'column'} gap={'xs'} p="md" style={{ overflowY: 'auto' }}>
                {editMode ? (
                    <>
                        {kind === 'poi' && (
                            <>
                                <Select
                                    label="Type"
                                    value={formPoitype}
                                    onChange={(v) => setFormPoitype(v ?? '')}
                                    styles={{
                                        dropdown: {
                                            zIndex: 2100,
                                        },
                                    }}
                                    leftSection={formPoitype ? <ColorSwatch color={elementTypes.find((t) => t.id === formPoitype)?.color ?? '#000'} size={12} /> : undefined}
                                    renderOption={(element) => {
                                        const type = elementTypes.find((t) => t.id === element.option.value);
                                        return (
                                            <Group gap="xs" align="center">
                                                <ColorSwatch color={type?.color ?? '#000'} size={12} />
                                                <Text size="sm">{element.option.label}</Text>
                                            </Group>
                                        );
                                    }}
                                    data={elementTypes.map((t) => ({
                                        value: t.id,
                                        label: t.name,
                                    }))}
                                    size="sm"
                                />
                                <TextInput label="Name" value={formName} onChange={(e) => setFormName(e.currentTarget.value)} size="sm" />
                                <NumberInput
                                    label="Size"
                                    value={formPoiSize}
                                    onChange={(v) => setFormPoiSize(typeof v === 'number' ? v : 10)}
                                    min={4}
                                    max={100}
                                    step={1}
                                    size="sm"
                                />
                                <Textarea
                                    label="Description"
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.currentTarget.value)}
                                    size="sm"
                                    autosize
                                    minRows={3}
                                    maxRows={8}
                                />
                                <NumberInput label="Order (z-index)" value={formZIndex} onChange={(v) => setFormZIndex(typeof v === 'number' ? v : 0)} min={0} step={1} size="sm" />
                            </>
                        )}
                        {kind === 'zone' && (
                            <>
                                <TextInput label="Name" value={formName} onChange={(e) => setFormName(e.currentTarget.value)} size="sm" />
                                <Textarea
                                    label="Description"
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.currentTarget.value)}
                                    size="sm"
                                    autosize
                                    minRows={3}
                                    maxRows={8}
                                />
                                <ColorInput
                                    label="Color"
                                    value={formZoneColor}
                                    onChange={setFormZoneColor}
                                    styles={{
                                        dropdown: {
                                            zIndex: 2100,
                                        },
                                    }}
                                    swatches={ZONE_COLOR_SWATCHES}
                                    swatchesPerRow={7}
                                    format="hexa"
                                    popoverProps={{ withinPortal: true }}
                                    size="sm"
                                />
                                <Select
                                    styles={{
                                        dropdown: {
                                            zIndex: 2100,
                                        },
                                    }}
                                    label="Fill pattern"
                                    value={formZonePattern}
                                    onChange={(v) => setFormZonePattern(v ?? '')}
                                    data={ZONE_PATTERNS}
                                    size="sm"
                                />
                                <NumberInput label="Order (z-index)" value={formZIndex} onChange={(v) => setFormZIndex(typeof v === 'number' ? v : 0)} min={0} step={1} size="sm" />
                            </>
                        )}
                        {kind === 'note' && (
                            <>
                                <Textarea label="Content" value={formContent} onChange={(e) => setFormContent(e.currentTarget.value)} size="sm" autosize minRows={4} maxRows={12} />
                                <NumberInput
                                    label="Font size"
                                    value={formNoteFontSize}
                                    onChange={(v) => setFormNoteFontSize(typeof v === 'number' ? v : 14)}
                                    min={8}
                                    max={72}
                                    step={1}
                                    size="sm"
                                />
                                <ColorInput
                                    label="Background color"
                                    value={formNoteBgColor}
                                    onChange={setFormNoteBgColor}
                                    format="hexa"
                                    styles={{
                                        dropdown: {
                                            zIndex: 2100,
                                        },
                                    }}
                                    swatches={['#fff9c4ff', '#ffffff00', '#ffffffff', '#c4f9ffff', '#ffd6d6ff', '#d6ffd6ff', '#e8d6ffff', '#1a1a2eff']}
                                    swatchesPerRow={8}
                                    popoverProps={{ withinPortal: true }}
                                    size="sm"
                                />
                                <NumberInput
                                    label="Width (empty = auto)"
                                    value={formNoteWidth}
                                    onChange={(v) => setFormNoteWidth(typeof v === 'number' ? v : '')}
                                    min={50}
                                    max={2000}
                                    step={10}
                                    size="sm"
                                    placeholder="Auto"
                                />
                                <NumberInput label="Order (z-index)" value={formZIndex} onChange={(v) => setFormZIndex(typeof v === 'number' ? v : 0)} min={0} step={1} size="sm" />
                                <Switch
                                    label="Comment (link to your account)"
                                    checked={formNoteIsComment}
                                    onChange={(e) => setFormNoteIsComment(e.currentTarget.checked)}
                                    size="sm"
                                />
                            </>
                        )}
                        {kind === 'background' && (
                            <>
                                <TextInput label="Name" value={formBgName} onChange={(e) => setFormBgName(e.currentTarget.value)} placeholder="Image name" size="sm" />
                                <NumberInput label="Position X" value={formBgX} onChange={(v) => setFormBgX(typeof v === 'number' ? v : 0)} step={10} size="sm" />
                                <NumberInput label="Position Y" value={formBgY} onChange={(v) => setFormBgY(typeof v === 'number' ? v : 0)} step={10} size="sm" />
                                <NumberInput label="Width" value={formBgWidth} onChange={(v) => setFormBgWidth(typeof v === 'number' ? v : 1000)} min={1} step={10} size="sm" />
                                <NumberInput label="Height" value={formBgHeight} onChange={(v) => setFormBgHeight(typeof v === 'number' ? v : 1000)} min={1} step={10} size="sm" />
                                <NumberInput
                                    label="Rotation (deg)"
                                    value={formBgRotation}
                                    onChange={(v) => setFormBgRotation(typeof v === 'number' ? v : 0)}
                                    min={0}
                                    max={360}
                                    step={1}
                                    size="sm"
                                />
                                <Switch label="Lock aspect ratio" checked={formBgLockAspect} onChange={(e) => setFormBgLockAspect(e.currentTarget.checked)} size="sm" />
                                <NumberInput label="Order (z-index)" value={formZIndex} onChange={(v) => setFormZIndex(typeof v === 'number' ? v : 0)} min={0} step={1} size="sm" />
                            </>
                        )}

                        {kind === 'line' && (
                            <>
                                <TextInput
                                    label="Name (optional)"
                                    value={formLineName}
                                    onChange={(e) => setFormLineName(e.currentTarget.value)}
                                    placeholder="Line name"
                                    size="sm"
                                />
                                <ColorInput
                                    label="Color"
                                    value={formLineColor}
                                    onChange={setFormLineColor}
                                    format="hex"
                                    styles={{ dropdown: { zIndex: 2100 } }}
                                    popoverProps={{ withinPortal: true }}
                                    size="sm"
                                />
                                <NumberInput
                                    label="Thickness (px)"
                                    value={formLineStrokeWidth}
                                    onChange={(v) => setFormLineStrokeWidth(typeof v === 'number' ? v : 2)}
                                    min={1}
                                    max={50}
                                    step={1}
                                    size="sm"
                                />
                                <Select
                                    label="Line style"
                                    value={formLineDash}
                                    onChange={(v) => setFormLineDash(v ?? 'solid')}
                                    data={[
                                        { value: 'solid', label: 'Solid' },
                                        { value: 'dashed', label: 'Dashed' },
                                        { value: 'dotted', label: 'Dotted' },
                                    ]}
                                    styles={{ dropdown: { zIndex: 2100 } }}
                                    size="sm"
                                />
                                <Text size="xs" c="dimmed" mt="xs">
                                    Point A
                                </Text>
                                <Group grow gap="xs">
                                    <NumberInput
                                        label="X"
                                        value={formLineAx}
                                        onChange={(v) => setFormLineAx(typeof v === 'number' ? v : 0)}
                                        step={1}
                                        size="sm"
                                        decimalScale={2}
                                        disabled={!!formLineAAttach}
                                    />
                                    <NumberInput
                                        label="Y"
                                        value={formLineAy}
                                        onChange={(v) => setFormLineAy(typeof v === 'number' ? v : 0)}
                                        step={1}
                                        size="sm"
                                        decimalScale={2}
                                        disabled={!!formLineAAttach}
                                    />
                                </Group>
                                <Select
                                    label="Attach A to…"
                                    placeholder="Free (unattached)"
                                    clearable
                                    value={formLineAAttach || null}
                                    onChange={(v) => setFormLineAAttach(v ?? '')}
                                    data={[
                                        ...(pois.length > 0
                                            ? [
                                                  {
                                                      group: 'POIs',
                                                      items: pois.map((p) => ({
                                                          value: `poi:${p.id}`,
                                                          label: p.name || 'Unnamed POI',
                                                      })),
                                                  },
                                              ]
                                            : []),
                                        ...(zones.length > 0
                                            ? [
                                                  {
                                                      group: 'Zones',
                                                      items: zones.map((z) => ({
                                                          value: `zone:${z.id}`,
                                                          label: z.name || 'Unnamed zone',
                                                      })),
                                                  },
                                              ]
                                            : []),
                                        ...(notes.length > 0
                                            ? [
                                                  {
                                                      group: 'Notes',
                                                      items: notes.map((n) => ({
                                                          value: `note:${n.id}`,
                                                          label: (n.content ?? '').slice(0, 30) || 'Empty note',
                                                      })),
                                                  },
                                              ]
                                            : []),
                                        ...(backgrounds.length > 0
                                            ? [
                                                  {
                                                      group: 'Images',
                                                      items: backgrounds.map((b) => ({
                                                          value: `background:${b.id}`,
                                                          label: b.name || `Image ${b.width}×${b.height}`,
                                                      })),
                                                  },
                                              ]
                                            : []),
                                    ]}
                                    styles={{ dropdown: { zIndex: 2100 } }}
                                    size="sm"
                                />
                                <Text size="xs" c="dimmed" mt="xs">
                                    Point B
                                </Text>
                                <Group grow gap="xs">
                                    <NumberInput
                                        label="X"
                                        value={formLineBx}
                                        onChange={(v) => setFormLineBx(typeof v === 'number' ? v : 100)}
                                        step={1}
                                        size="sm"
                                        decimalScale={2}
                                        disabled={!!formLineBAttach}
                                    />
                                    <NumberInput
                                        label="Y"
                                        value={formLineBy}
                                        onChange={(v) => setFormLineBy(typeof v === 'number' ? v : 100)}
                                        step={1}
                                        size="sm"
                                        decimalScale={2}
                                        disabled={!!formLineBAttach}
                                    />
                                </Group>
                                <Select
                                    label="Attach B to…"
                                    placeholder="Free (unattached)"
                                    clearable
                                    value={formLineBAttach || null}
                                    onChange={(v) => setFormLineBAttach(v ?? '')}
                                    data={[
                                        ...(pois.length > 0
                                            ? [
                                                  {
                                                      group: 'POIs',
                                                      items: pois.map((p) => ({
                                                          value: `poi:${p.id}`,
                                                          label: p.name || 'Unnamed POI',
                                                      })),
                                                  },
                                              ]
                                            : []),
                                        ...(zones.length > 0
                                            ? [
                                                  {
                                                      group: 'Zones',
                                                      items: zones.map((z) => ({
                                                          value: `zone:${z.id}`,
                                                          label: z.name || 'Unnamed zone',
                                                      })),
                                                  },
                                              ]
                                            : []),
                                        ...(notes.length > 0
                                            ? [
                                                  {
                                                      group: 'Notes',
                                                      items: notes.map((n) => ({
                                                          value: `note:${n.id}`,
                                                          label: (n.content ?? '').slice(0, 30) || 'Empty note',
                                                      })),
                                                  },
                                              ]
                                            : []),
                                        ...(backgrounds.length > 0
                                            ? [
                                                  {
                                                      group: 'Images',
                                                      items: backgrounds.map((b) => ({
                                                          value: `background:${b.id}`,
                                                          label: b.name || `Image ${b.width}×${b.height}`,
                                                      })),
                                                  },
                                              ]
                                            : []),
                                    ]}
                                    styles={{ dropdown: { zIndex: 2100 } }}
                                    size="sm"
                                />
                                <Text size="xs" c="dimmed" mt="xs">
                                    Control point (curvature)
                                </Text>
                                <Group grow gap="xs">
                                    <NumberInput
                                        label="X"
                                        value={formLineCx}
                                        onChange={(v) => setFormLineCx(typeof v === 'number' ? v : '')}
                                        step={1}
                                        size="sm"
                                        placeholder="Auto"
                                        decimalScale={2}
                                    />
                                    <NumberInput
                                        label="Y"
                                        value={formLineCy}
                                        onChange={(v) => setFormLineCy(typeof v === 'number' ? v : '')}
                                        step={1}
                                        size="sm"
                                        placeholder="Auto"
                                        decimalScale={2}
                                    />
                                </Group>
                                <NumberInput label="Order (z-index)" value={formZIndex} onChange={(v) => setFormZIndex(typeof v === 'number' ? v : 0)} min={0} step={1} size="sm" />
                            </>
                        )}

                        <Box>
                            <Button fullWidth size="sm" variant="filled" leftSection={<IconCheck size={14} />} loading={saving} disabled={!isDirty} onClick={handleSave}>
                                Save
                            </Button>
                        </Box>

                        <Divider />

                        {confirmDelete ? (
                            <Stack gap="xs">
                                <Text size="xs" c="red">
                                    Confirm deletion?
                                </Text>
                                <Group gap="xs">
                                    <Button size="xs" color="red" variant="filled" leftSection={<IconTrash size={12} />} onClick={handleDelete} style={{ flex: 1 }}>
                                        Delete
                                    </Button>
                                    <Button size="xs" variant="default" onClick={() => setConfirmDelete(false)} style={{ flex: 1 }}>
                                        Cancel
                                    </Button>
                                </Group>
                            </Stack>
                        ) : (
                            <Box>
                                <Button fullWidth size="sm" variant="subtle" color="red" leftSection={<IconTrash size={14} />} onClick={handleDelete}>
                                    Delete
                                </Button>
                            </Box>
                        )}
                    </>
                ) : (
                    <>
                        {kind === 'poi' && (
                            <>
                                {typeName && (
                                    <div>
                                        <Text size="xs" c="dimmed" mb={2}>
                                            Type
                                        </Text>
                                        <Group gap="xs" align="center">
                                            <div
                                                style={{
                                                    width: 10,
                                                    height: 10,
                                                    borderRadius: '50%',
                                                    background: color,
                                                    border: '1px solid rgba(0,0,0,0.2)',
                                                    flexShrink: 0,
                                                }}
                                            />
                                            <Text size="sm" fw={500}>
                                                {typeName}
                                            </Text>
                                        </Group>
                                    </div>
                                )}
                                <div>
                                    <Text size="xs" c="dimmed" mb={2}>
                                        Name
                                    </Text>
                                    <Text size="sm" fw={500}>
                                        {name || '—'}
                                    </Text>
                                </div>
                                <div>
                                    <Text size="xs" c="dimmed" mb={2}>
                                        Size
                                    </Text>
                                    <Text size="sm">{(pois.find((p) => p.id === id)?.size ?? 10) + ' px'}</Text>
                                </div>
                                {description ? (
                                    <div>
                                        <Text size="xs" c="dimmed" mb={2}>
                                            Description
                                        </Text>
                                        <Text size="sm">{description}</Text>
                                    </div>
                                ) : (
                                    <Text size="xs" c="dimmed" fs="italic">
                                        No description
                                    </Text>
                                )}
                                <div>
                                    <Text size="xs" c="dimmed" mb={2}>
                                        Order (z-index)
                                    </Text>
                                    <Text size="sm">{pois.find((p) => p.id === id)?.zIndex ?? 0}</Text>
                                </div>
                            </>
                        )}
                        {kind === 'zone' && (
                            <>
                                <div>
                                    <Text size="xs" c="dimmed" mb={2}>
                                        Name
                                    </Text>
                                    <Text size="sm" fw={500}>
                                        {name || '—'}
                                    </Text>
                                </div>
                                {description ? (
                                    <div>
                                        <Text size="xs" c="dimmed" mb={2}>
                                            Description
                                        </Text>
                                        <Text size="sm">{description}</Text>
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
                                            background: color,
                                            border: '1px solid rgba(0,0,0,0.15)',
                                            flexShrink: 0,
                                        }}
                                    />
                                    <Text size="sm">{color}</Text>
                                </Group>
                                {pattern && (
                                    <div>
                                        <Text size="xs" c="dimmed" mb={2}>
                                            Pattern
                                        </Text>
                                        <Text size="sm">{ZONE_PATTERNS.find((p) => p.value === pattern)?.label ?? pattern}</Text>
                                    </div>
                                )}
                                <div>
                                    <Text size="xs" c="dimmed" mb={2}>
                                        Order (z-index)
                                    </Text>
                                    <Text size="sm">{zones.find((z) => z.id === id)?.zIndex ?? 0}</Text>
                                </div>
                            </>
                        )}
                        {kind === 'note' && (
                            <>
                                <div>
                                    <Text size="xs" c="dimmed" mb={2}>
                                        Content
                                    </Text>
                                    <Text size="sm">{content}</Text>
                                </div>
                                {notes.find((n) => n.id === id)?.authorName && (
                                    <div style={{ marginTop: 8 }}>
                                        <Text size="xs" c="dimmed" mb={2}>
                                            Author
                                        </Text>
                                        <Text size="sm">{notes.find((n) => n.id === id)!.authorName}</Text>
                                    </div>
                                )}
                                <Group gap="xs" align="center" mt={4}>
                                    <div
                                        style={{
                                            width: 16,
                                            height: 16,
                                            borderRadius: 3,
                                            background: notes.find((n) => n.id === id)?.bgColor ?? '#fff9c4',
                                            border: '1px solid rgba(0,0,0,0.15)',
                                            flexShrink: 0,
                                        }}
                                    />
                                    <Text size="xs" c="dimmed">
                                        {notes.find((n) => n.id === id)?.bgColor ?? '#fff9c4ff'}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                        ·
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                        {notes.find((n) => n.id === id)?.fontSize ?? 14}px
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                        ·
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                        {notes.find((n) => n.id === id)?.width ? notes.find((n) => n.id === id)!.width + 'px' : 'auto'}
                                    </Text>
                                </Group>
                                <div>
                                    <Text size="xs" c="dimmed" mb={2}>
                                        Order (z-index)
                                    </Text>
                                    <Text size="sm">{notes.find((n) => n.id === id)?.zIndex ?? 0}</Text>
                                </div>
                            </>
                        )}
                        {kind === 'background' &&
                            (() => {
                                const bg = backgrounds.find((b) => b.id === id);
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
                                        <div>
                                            <Text size="xs" c="dimmed" mb={2}>
                                                Order (z-index)
                                            </Text>
                                            <Text size="sm">{bg.zIndex}</Text>
                                        </div>
                                    </>
                                );
                            })()}
                        {kind === 'line' &&
                            (() => {
                                const line = lines.find((l) => l.id === id);
                                if (!line) return null;
                                return (
                                    <>
                                        {line.name && (
                                            <div>
                                                <Text size="xs" c="dimmed" mb={2}>
                                                    Name
                                                </Text>
                                                <Text size="sm" fw={500}>
                                                    {line.name}
                                                </Text>
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
                                            <Text size="xs" c="dimmed">
                                                ·
                                            </Text>
                                            <Text size="sm">{line.strokeWidth ?? 2}px</Text>
                                            {line.dashPattern && line.dashPattern !== 'solid' && (
                                                <>
                                                    <Text size="xs" c="dimmed">
                                                        ·
                                                    </Text>
                                                    <Text size="xs" c="dimmed">
                                                        {line.dashPattern === 'dashed' ? 'Dashed' : 'Dotted'}
                                                    </Text>
                                                </>
                                            )}
                                        </Group>
                                        <Group gap="xl">
                                            <div>
                                                <Text size="xs" c="dimmed" mb={2}>
                                                    Point A
                                                </Text>
                                                <Text size="sm">
                                                    {line.x.toFixed(0)}, {line.y.toFixed(0)}
                                                </Text>
                                            </div>
                                            <div>
                                                <Text size="xs" c="dimmed" mb={2}>
                                                    Point B
                                                </Text>
                                                <Text size="sm">
                                                    {line.bx.toFixed(0)}, {line.by.toFixed(0)}
                                                </Text>
                                            </div>
                                        </Group>
                                        {(line.aAttachedId || line.bAttachedId) &&
                                            (() => {
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
                                                    <Group gap="xl">
                                                        {aLabel && (
                                                            <div>
                                                                <Group gap={4} align="center" mb={2}>
                                                                    <Text size="xs" c="dimmed">
                                                                        A attached to
                                                                    </Text>
                                                                    <Tooltip label="Detach point A" withArrow>
                                                                        <ActionIcon size="xs" variant="subtle" color="red" onClick={handleDetachA}>
                                                                            <IconLinkOff size={12} />
                                                                        </ActionIcon>
                                                                    </Tooltip>
                                                                </Group>
                                                                <Text size="sm" c={mainColor}>
                                                                    {aLabel}
                                                                </Text>
                                                            </div>
                                                        )}
                                                        {bLabel && (
                                                            <div>
                                                                <Group gap={4} align="center" mb={2}>
                                                                    <Text size="xs" c="dimmed">
                                                                        B attached to
                                                                    </Text>
                                                                    <Tooltip label="Detach point B" withArrow>
                                                                        <ActionIcon size="xs" variant="subtle" color="red" onClick={handleDetachB}>
                                                                            <IconLinkOff size={12} />
                                                                        </ActionIcon>
                                                                    </Tooltip>
                                                                </Group>
                                                                <Text size="sm" c={mainColor}>
                                                                    {bLabel}
                                                                </Text>
                                                            </div>
                                                        )}
                                                    </Group>
                                                );
                                            })()}
                                        {line.cx !== undefined && line.cy !== undefined && (
                                            <div>
                                                <Text size="xs" c="dimmed" mb={2}>
                                                    Control point
                                                </Text>
                                                <Text size="sm">
                                                    {line.cx.toFixed(0)}, {line.cy.toFixed(0)}
                                                </Text>
                                            </div>
                                        )}
                                        <div>
                                            <Text size="xs" c="dimmed" mb={2}>
                                                Order (z-index)
                                            </Text>
                                            <Text size="sm">{line.zIndex}</Text>
                                        </div>
                                    </>
                                );
                            })()}
                    </>
                )}
            </Flex>

            {!editMode && (
                <Text
                    size="xs"
                    c="dimmed"
                    px="md"
                    py="xs"
                    style={{
                        borderTop: '1px solid var(--mantine-color-default-border)',
                        flexShrink: 0,
                    }}
                >
                    Enable edit mode to modify this element
                </Text>
            )}
        </div>
    );
};
