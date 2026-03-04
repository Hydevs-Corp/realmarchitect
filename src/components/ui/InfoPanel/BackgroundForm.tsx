import { Box, Button, Divider, NumberInput, Switch, TextInput } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import React, { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { deleteBackground as apiDeleteBackground, updateBackground as apiUpdateBackground } from '../../../lib/api';
import { useMapStore } from '../../../store/useMapStore';
import { DeleteConfirm } from './DeleteConfirm';

interface BackgroundFormProps {
    id: string;
    onDeleted: () => void;
}

export const BackgroundForm: React.FC<BackgroundFormProps> = ({ id, onDeleted }) => {
    const { backgrounds, updateBackground, deleteBackground } = useMapStore(
        useShallow((state) => ({
            backgrounds: state.backgrounds,
            updateBackground: state.updateBackground,
            deleteBackground: state.deleteBackground,
        }))
    );

    const bg = backgrounds.find((b) => b.id === id);

    const [formBgName, setFormBgName] = useState<string>(bg?.name ?? '');
    const [formBgX, setFormBgX] = useState<number>(bg?.x ?? 0);
    const [formBgY, setFormBgY] = useState<number>(bg?.y ?? 0);
    const [formBgWidth, setFormBgWidth] = useState<number>(bg?.width ?? 1000);
    const [formBgHeight, setFormBgHeight] = useState<number>(bg?.height ?? 1000);
    const [formBgRotation, setFormBgRotation] = useState<number>(bg?.rotation ?? 0);
    const [formBgLockAspect, setFormBgLockAspect] = useState<boolean>(!!bg?.lockAspectRatio);
    const [formZIndex, setFormZIndex] = useState<number>(bg?.zIndex ?? 0);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!bg) return;
        setFormBgName(bg.name ?? '');
        setFormBgX(bg.x);
        setFormBgY(bg.y);
        setFormBgWidth(bg.width);
        setFormBgHeight(bg.height);
        setFormBgRotation(bg.rotation ?? 0);
        setFormBgLockAspect(!!bg.lockAspectRatio);
        setFormZIndex(bg.zIndex);
        setConfirmDelete(false);
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    const _x = bg?.x;
    const _y = bg?.y;
    const _w = bg?.width;
    const _h = bg?.height;
    const _rot = bg?.rotation;
    const _lock = bg?.lockAspectRatio;

    useEffect(() => {
        if (_x === undefined || _y === undefined || _w === undefined || _h === undefined) return;
        setFormBgX(_x);
        setFormBgY(_y);
        setFormBgWidth(_w);
        setFormBgHeight(_h);
        setFormBgRotation(_rot ?? 0);
        setFormBgLockAspect(!!_lock);
    }, [_x, _y, _w, _h, _rot, _lock]);

    useEffect(() => {
        if (!bg) return;
        if (
            formBgName === (bg.name ?? '') &&
            formBgX === bg.x &&
            formBgY === bg.y &&
            formBgWidth === bg.width &&
            formBgHeight === bg.height &&
            formBgRotation === (bg.rotation ?? 0) &&
            formBgLockAspect === !!bg.lockAspectRatio &&
            formZIndex === bg.zIndex
        ) {
            return;
        }

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
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
            void apiUpdateBackground(id, updates);
        }, 600);

        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formBgName, formBgX, formBgY, formBgWidth, formBgHeight, formBgRotation, formBgLockAspect, formZIndex]);

    if (!bg) return null;

    const handleDelete = async () => {
        if (!confirmDelete) {
            setConfirmDelete(true);
            return;
        }
        deleteBackground(id);
        await apiDeleteBackground(id);
        onDeleted();
    };

    return (
        <>
            <TextInput label="Name" value={formBgName} onChange={(e) => setFormBgName(e.currentTarget.value)} placeholder="Image name" size="sm" />
            <NumberInput label="Position X" value={formBgX} onChange={(v) => setFormBgX(typeof v === 'number' ? v : 0)} step={10} size="sm" />
            <NumberInput label="Position Y" value={formBgY} onChange={(v) => setFormBgY(typeof v === 'number' ? v : 0)} step={10} size="sm" />
            <NumberInput label="Width" value={formBgWidth} onChange={(v) => setFormBgWidth(typeof v === 'number' ? v : 1000)} min={1} step={10} size="sm" />
            <NumberInput label="Height" value={formBgHeight} onChange={(v) => setFormBgHeight(typeof v === 'number' ? v : 1000)} min={1} step={10} size="sm" />
            <NumberInput label="Rotation (deg)" value={formBgRotation} onChange={(v) => setFormBgRotation(typeof v === 'number' ? v : 0)} min={0} max={360} step={1} size="sm" />
            <Switch label="Lock aspect ratio" checked={formBgLockAspect} onChange={(e) => setFormBgLockAspect(e.currentTarget.checked)} size="sm" />
            <NumberInput label="Order (z-index)" value={formZIndex} onChange={(v) => setFormZIndex(typeof v === 'number' ? v : 0)} min={0} step={1} size="sm" />

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
