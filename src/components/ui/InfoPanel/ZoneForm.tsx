import React, { useEffect, useState } from 'react';
import { Box, Button, ColorInput, Divider, NumberInput, Select, Textarea, TextInput } from '@mantine/core';
import { IconCheck, IconTrash } from '@tabler/icons-react';
import { useShallow } from 'zustand/react/shallow';
import { useMapStore } from '../../../store/useMapStore';
import { updateZone as apiUpdateZone, deleteZone as apiDeleteZone } from '../../../lib/api';
import { ZONE_COLOR_SWATCHES, ZONE_PATTERNS } from '../../../lib/zoneColors';
import { DeleteConfirm } from './DeleteConfirm';

interface ZoneFormProps {
    id: string;
    onDeleted: () => void;
}

export const ZoneForm: React.FC<ZoneFormProps> = ({ id, onDeleted }) => {
    const { zones, updateZone, deleteZone } = useMapStore(
        useShallow((state) => ({
            zones: state.zones,
            updateZone: state.updateZone,
            deleteZone: state.deleteZone,
        }))
    );

    const zone = zones.find((z) => z.id === id);

    const [formName, setFormName] = useState(zone?.name ?? '');
    const [formDescription, setFormDescription] = useState(zone?.description ?? '');
    const [formZoneColor, setFormZoneColor] = useState(zone?.color ?? '');
    const [formZonePattern, setFormZonePattern] = useState(zone?.pattern ?? '');
    const [formZIndex, setFormZIndex] = useState<number>(zone?.zIndex ?? 0);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => {
        if (!zone) return;
        setFormName(zone.name);
        setFormDescription(zone.description ?? '');
        setFormZoneColor(zone.color);
        setFormZonePattern(zone.pattern ?? '');
        setFormZIndex(zone.zIndex);
        setConfirmDelete(false);
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!zone) return null;

    const isDirty =
        formName !== zone.name ||
        formDescription !== (zone.description ?? '') ||
        formZoneColor !== zone.color ||
        formZonePattern !== (zone.pattern ?? '') ||
        formZIndex !== zone.zIndex;

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = {
                name: formName,
                description: formDescription,
                color: formZoneColor,
                pattern: formZonePattern,
                zIndex: formZIndex,
            };
            updateZone(id, updates);
            await apiUpdateZone(id, updates);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) { setConfirmDelete(true); return; }
        deleteZone(id);
        await apiDeleteZone(id);
        onDeleted();
    };

    return (
        <>
            <TextInput label="Name" value={formName} onChange={(e) => setFormName(e.currentTarget.value)} size="sm" />
            <Textarea label="Description" value={formDescription} onChange={(e) => setFormDescription(e.currentTarget.value)} size="sm" autosize minRows={3} maxRows={8} />
            <ColorInput
                label="Color"
                value={formZoneColor}
                onChange={setFormZoneColor}
                styles={{ dropdown: { zIndex: 2100 } }}
                swatches={ZONE_COLOR_SWATCHES}
                swatchesPerRow={7}
                format="hexa"
                popoverProps={{ withinPortal: true }}
                size="sm"
            />
            <Select
                label="Fill pattern"
                value={formZonePattern}
                onChange={(v) => setFormZonePattern(v ?? '')}
                data={ZONE_PATTERNS}
                styles={{ dropdown: { zIndex: 2100 } }}
                size="sm"
            />
            <NumberInput label="Order (z-index)" value={formZIndex} onChange={(v) => setFormZIndex(typeof v === 'number' ? v : 0)} min={0} step={1} size="sm" />

            <Box>
                <Button fullWidth size="sm" variant="filled" leftSection={<IconCheck size={14} />} loading={saving} disabled={!isDirty} onClick={handleSave}>
                    Save
                </Button>
            </Box>

            <Divider />

            {confirmDelete ? (
                <DeleteConfirm onDelete={handleDelete} onCancel={() => setConfirmDelete(false)} />
            ) : (
                <Box>
                    <Button fullWidth size="sm" variant="subtle" color="red" leftSection={<IconTrash size={14} />} onClick={() => setConfirmDelete(true)}>
                        Delete
                    </Button>
                </Box>
            )}
        </>
    );
};
