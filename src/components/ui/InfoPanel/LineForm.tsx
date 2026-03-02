import React, { useEffect, useState } from 'react';
import { Box, Button, ColorInput, Divider, Group, NumberInput, Select, Text } from '@mantine/core';
import { IconCheck, IconTrash } from '@tabler/icons-react';
import { useShallow } from 'zustand/react/shallow';
import { useMapStore } from '../../../store/useMapStore';
import { updateLine as apiUpdateLine, deleteLine as apiDeleteLine } from '../../../lib/api';
import { DeleteConfirm } from './DeleteConfirm';

interface LineFormProps {
    id: string;
    onDeleted: () => void;
}

export const LineForm: React.FC<LineFormProps> = ({ id, onDeleted }) => {
    const { lines, pois, zones, notes, backgrounds, updateLine, deleteLine } = useMapStore(
        useShallow((state) => ({
            lines: state.lines,
            pois: state.pois,
            zones: state.zones,
            notes: state.notes,
            backgrounds: state.backgrounds,
            updateLine: state.updateLine,
            deleteLine: state.deleteLine,
        }))
    );

    const line = lines.find((l) => l.id === id);

    const [formLineName, setFormLineName] = useState<string>(line?.name ?? '');
    const [formLineColor, setFormLineColor] = useState<string>(line?.color ?? '#ffffff');
    const [formLineStrokeWidth, setFormLineStrokeWidth] = useState<number>(line?.strokeWidth ?? 2);
    const [formLineDash, setFormLineDash] = useState<string>(line?.dashPattern ?? 'solid');
    const [formLineAx, setFormLineAx] = useState<number>(line?.x ?? 0);
    const [formLineAy, setFormLineAy] = useState<number>(line?.y ?? 0);
    const [formLineBx, setFormLineBx] = useState<number>(line?.bx ?? 100);
    const [formLineBy, setFormLineBy] = useState<number>(line?.by ?? 100);
    const [formLineCx, setFormLineCx] = useState<number | ''>(line?.cx ?? '');
    const [formLineCy, setFormLineCy] = useState<number | ''>(line?.cy ?? '');
    const [formLineAAttach, setFormLineAAttach] = useState<string>(line?.aAttachedId && line?.aAttachedKind ? `${line.aAttachedKind}:${line.aAttachedId}` : '');
    const [formLineBAttach, setFormLineBAttach] = useState<string>(line?.bAttachedId && line?.bAttachedKind ? `${line.bAttachedKind}:${line.bAttachedId}` : '');
    const [formZIndex, setFormZIndex] = useState<number>(line?.zIndex ?? 0);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => {
        if (!line) return;
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
        setConfirmDelete(false);
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    const _ax = line?.x,
        _ay = line?.y,
        _bx = line?.bx,
        _by = line?.by;
    const _cx = line?.cx,
        _cy = line?.cy;
    const _aId = line?.aAttachedId,
        _aKind = line?.aAttachedKind;
    const _bId = line?.bAttachedId,
        _bKind = line?.bAttachedKind;

    useEffect(() => {
        if (_ax === undefined || _ay === undefined || _bx === undefined || _by === undefined) return;
        setFormLineAx(_ax);
        setFormLineAy(_ay);
        setFormLineBx(_bx);
        setFormLineBy(_by);
        setFormLineCx(_cx ?? '');
        setFormLineCy(_cy ?? '');
        setFormLineAAttach(_aId && _aKind ? `${_aKind}:${_aId}` : '');
        setFormLineBAttach(_bId && _bKind ? `${_bKind}:${_bId}` : '');
    }, [_ax, _ay, _bx, _by, _cx, _cy, _aId, _aKind, _bId, _bKind]);

    if (!line) return null;

    const isDirty =
        formLineName !== (line.name ?? '') ||
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
        formZIndex !== line.zIndex;

    const parseAttach = (val: string) => {
        if (!val) return { id: undefined, kind: undefined };
        const sep = val.indexOf(':');
        return {
            kind: val.slice(0, sep) as 'poi' | 'zone' | 'note' | 'background',
            id: val.slice(sep + 1),
        };
    };

    const handleSave = async () => {
        setSaving(true);
        try {
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
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) {
            setConfirmDelete(true);
            return;
        }
        deleteLine(id);
        await apiDeleteLine(id);
        onDeleted();
    };

    const attachData = [
        ...(pois.length > 0 ? [{ group: 'POIs', items: pois.map((p) => ({ value: `poi:${p.id}`, label: p.name || 'Unnamed POI' })) }] : []),
        ...(zones.length > 0 ? [{ group: 'Zones', items: zones.map((z) => ({ value: `zone:${z.id}`, label: z.name || 'Unnamed zone' })) }] : []),
        ...(notes.length > 0 ? [{ group: 'Notes', items: notes.map((n) => ({ value: `note:${n.id}`, label: (n.content ?? '').slice(0, 30) || 'Empty note' })) }] : []),
        ...(backgrounds.length > 0 ? [{ group: 'Images', items: backgrounds.map((b) => ({ value: `background:${b.id}`, label: b.name || `Image ${b.width}×${b.height}` })) }] : []),
    ];

    return (
        <>
            <Text size="sm" fw={500} mb={-4}>
                Name (optional)
            </Text>
            <input style={{ display: 'none' }} aria-hidden />
            <Box>
                <input style={{ display: 'none' }} aria-hidden />
            </Box>

            <Box component="div">
                <Box mb="xs">
                    <Text size="xs" c="dimmed" mb={4}>
                        Name (optional)
                    </Text>
                    <input
                        value={formLineName}
                        onChange={(e) => setFormLineName(e.currentTarget.value)}
                        placeholder="Line name"
                        style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: 4,
                            border: '1px solid var(--mantine-color-default-border)',
                            background: 'var(--mantine-color-default)',
                            color: 'var(--mantine-color-text)',
                            fontSize: 14,
                        }}
                    />
                </Box>
            </Box>

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
                data={attachData}
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
                data={attachData}
                styles={{ dropdown: { zIndex: 2100 } }}
                size="sm"
            />

            <Text size="xs" c="dimmed" mt="xs">
                Control point (curvature)
            </Text>
            <Group grow gap="xs">
                <NumberInput label="X" value={formLineCx} onChange={(v) => setFormLineCx(typeof v === 'number' ? v : '')} step={1} size="sm" placeholder="Auto" decimalScale={2} />
                <NumberInput label="Y" value={formLineCy} onChange={(v) => setFormLineCy(typeof v === 'number' ? v : '')} step={1} size="sm" placeholder="Auto" decimalScale={2} />
            </Group>

            <NumberInput label="Order (z-index)" value={formZIndex} onChange={(v) => setFormZIndex(typeof v === 'number' ? v : 0)} min={0} step={1} size="sm" />

            <Box>
                <Button fullWidth size="sm" variant="filled" leftSection={<IconCheck />} loading={saving} disabled={!isDirty} onClick={handleSave}>
                    Save
                </Button>
            </Box>

            <Divider />

            {confirmDelete ? (
                <DeleteConfirm onDelete={handleDelete} onCancel={() => setConfirmDelete(false)} />
            ) : (
                <Box>
                    <Button fullWidth size="sm" variant="subtle" color="red" leftSection={<IconTrash />} onClick={() => setConfirmDelete(true)}>
                        Delete
                    </Button>
                </Box>
            )}
        </>
    );
};
