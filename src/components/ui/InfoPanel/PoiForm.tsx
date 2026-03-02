import { Box, Button, ColorSwatch, Divider, Group, NumberInput, Select, Text, Textarea, TextInput } from '@mantine/core';
import { IconCheck, IconTrash } from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { deletePOI as apiDeletePOI, updatePOI as apiUpdatePOI } from '../../../lib/api';
import { useMapStore } from '../../../store/useMapStore';
import { DeleteConfirm } from './DeleteConfirm';

interface PoiFormProps {
    id: string;
    onDeleted: () => void;
}

export const PoiForm: React.FC<PoiFormProps> = ({ id, onDeleted }) => {
    const { pois, elementTypes, updatePoi, deletePoi } = useMapStore(
        useShallow((state) => ({
            pois: state.pois,
            elementTypes: state.elementTypes,
            updatePoi: state.updatePoi,
            deletePoi: state.deletePoi,
        }))
    );

    const poi = pois.find((p) => p.id === id);

    const [formName, setFormName] = useState(poi?.name ?? '');
    const [formDescription, setFormDescription] = useState(poi?.description ?? '');
    const [formPoitype, setFormPoitype] = useState(poi?.type ?? '');
    const [formPoiSize, setFormPoiSize] = useState<number>(poi?.size ?? 10);
    const [formZIndex, setFormZIndex] = useState<number>(poi?.zIndex ?? 0);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => {
        if (!poi) return;
        setFormName(poi.name);
        setFormDescription(poi.description ?? '');
        setFormPoitype(poi.type);
        setFormPoiSize(poi.size ?? 10);
        setFormZIndex(poi.zIndex);
        setConfirmDelete(false);
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!poi) return null;

    const isDirty =
        formName !== poi.name || formDescription !== (poi.description ?? '') || formPoitype !== poi.type || formPoiSize !== (poi.size ?? 10) || formZIndex !== poi.zIndex;

    const handleSave = async () => {
        setSaving(true);
        try {
            const selectedType = elementTypes.find((t) => t.id === formPoitype);
            const updates = {
                name: formName,
                description: formDescription,
                type: formPoitype,
                color: selectedType?.color ?? poi.color,
                size: formPoiSize,
                zIndex: formZIndex,
            };
            updatePoi(id, updates);
            await apiUpdatePOI(id, updates);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) {
            setConfirmDelete(true);
            return;
        }
        deletePoi(id);
        await apiDeletePOI(id);
        onDeleted();
    };

    return (
        <>
            <Select
                label="Type"
                value={formPoitype}
                onChange={(v) => setFormPoitype(v ?? '')}
                styles={{ dropdown: { zIndex: 2100 } }}
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
                data={elementTypes.map((t) => ({ value: t.id, label: t.name }))}
                size="sm"
            />
            <TextInput label="Name" value={formName} onChange={(e) => setFormName(e.currentTarget.value)} size="sm" />
            <NumberInput label="Size" value={formPoiSize} onChange={(v) => setFormPoiSize(typeof v === 'number' ? v : 10)} min={4} max={100} step={1} size="sm" />
            <Textarea label="Description" value={formDescription} onChange={(e) => setFormDescription(e.currentTarget.value)} size="sm" autosize minRows={3} maxRows={8} />
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
