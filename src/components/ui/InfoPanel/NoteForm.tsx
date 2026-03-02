import React, { useEffect, useState } from 'react';
import { Box, Button, ColorInput, Divider, NumberInput, Switch, Textarea } from '@mantine/core';
import { IconCheck, IconTrash } from '@tabler/icons-react';
import { useShallow } from 'zustand/react/shallow';
import { Hypb } from '@hydevs/hypb';
import { useMapStore } from '../../../store/useMapStore';
import { updateNote as apiUpdateNote, deleteNote as apiDeleteNote } from '../../../lib/api';
import { DeleteConfirm } from './DeleteConfirm';

interface NoteFormProps {
    id: string;
    onDeleted: () => void;
}

export const NoteForm: React.FC<NoteFormProps> = ({ id, onDeleted }) => {
    const { notes, updateNote, deleteNote } = useMapStore(
        useShallow((state) => ({
            notes: state.notes,
            updateNote: state.updateNote,
            deleteNote: state.deleteNote,
        }))
    );

    const note = notes.find((n) => n.id === id);

    const [formContent, setFormContent] = useState(note?.content ?? '');
    const [formNoteFontSize, setFormNoteFontSize] = useState<number>(note?.fontSize ?? 14);
    const [formNoteBgColor, setFormNoteBgColor] = useState(note?.bgColor ?? '#fff9c4ff');
    const [formNoteWidth, setFormNoteWidth] = useState<number | ''>(note?.width ?? '');
    const [formNoteIsComment, setFormNoteIsComment] = useState<boolean>(!!note?.author);
    const [formZIndex, setFormZIndex] = useState<number>(note?.zIndex ?? 0);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => {
        if (!note) return;
        setFormContent(note.content);
        setFormNoteFontSize(note.fontSize ?? 14);
        setFormNoteBgColor(note.bgColor ?? '#fff9c4ff');
        setFormNoteWidth(note.width ?? '');
        setFormNoteIsComment(!!note.author);
        setFormZIndex(note.zIndex);
        setConfirmDelete(false);
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!note) return null;

    const isDirty =
        formContent !== note.content ||
        formNoteFontSize !== (note.fontSize ?? 14) ||
        formNoteBgColor !== (note.bgColor ?? '#fff9c4ff') ||
        formNoteWidth !== (note.width ?? '') ||
        formZIndex !== note.zIndex ||
        formNoteIsComment !== !!note.author;

    const handleSave = async () => {
        setSaving(true);
        try {
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
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) {
            setConfirmDelete(true);
            return;
        }
        deleteNote(id);
        await apiDeleteNote(id);
        onDeleted();
    };

    return (
        <>
            <Textarea label="Content" value={formContent} onChange={(e) => setFormContent(e.currentTarget.value)} size="sm" autosize minRows={4} maxRows={12} />
            <NumberInput label="Font size" value={formNoteFontSize} onChange={(v) => setFormNoteFontSize(typeof v === 'number' ? v : 14)} min={8} max={72} step={1} size="sm" />
            <ColorInput
                label="Background color"
                value={formNoteBgColor}
                onChange={setFormNoteBgColor}
                format="hexa"
                styles={{ dropdown: { zIndex: 2100 } }}
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
            <Switch label="Comment (link to your account)" checked={formNoteIsComment} onChange={(e) => setFormNoteIsComment(e.currentTarget.checked)} size="sm" />

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
