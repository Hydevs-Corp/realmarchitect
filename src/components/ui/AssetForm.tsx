import { useEffect, useRef, useState } from 'react';
import { ActionIcon, Box, Button, FileInput, Group, NumberInput, Select, Stack, Text, TextInput } from '@mantine/core';
import { TagsInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconX } from '@tabler/icons-react';
import type { DncWorldmapAssetCategoryRecord, DncWorldmapAssetRecord } from '../../types/database';

export type AssetSubmitItem = {
    name: string;
    file?: File;
    category?: string;
    tags?: string[];
    width?: number;
    height?: number;
};

type FileEntry = {
    file: File;
    name: string;
    previewUrl: string;
};

type Props = {
    categories: DncWorldmapAssetCategoryRecord[];
    initial?: DncWorldmapAssetRecord;
    onSubmit: (items: AssetSubmitItem[]) => Promise<void>;
};

export default function AssetForm({ categories, initial, onSubmit }: Props) {
    const [loading, setLoading] = useState(false);
    const categoryData = [{ value: '', label: 'None' }, ...categories.map((c) => ({ value: c.id, label: c.name }))];

    const editForm = useForm<{
        name: string;
        category: string | undefined;
        tags: string[];
        file: File | null;
        width?: number;
        height?: number;
    }>({
        initialValues: {
            name: initial?.name ?? '',
            category: initial?.category,
            tags: initial?.tags ?? [],
            file: null,
            width: initial?.width,
            height: initial?.height,
        },
    });

    useEffect(() => {
        if (!initial) return;
        const file = editForm.values.file;
        if (!file) return;
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            editForm.setFieldValue('width', img.naturalWidth);
            editForm.setFieldValue('height', img.naturalHeight);
            URL.revokeObjectURL(url);
        };
        img.onerror = () => URL.revokeObjectURL(url);
        img.src = url;
        return () => {
            try {
                URL.revokeObjectURL(url);
            } catch {
                /* noop */
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editForm.values.file]);

    const handleEditSubmit = editForm.onSubmit(async (values) => {
        setLoading(true);
        await onSubmit([
            {
                name: values.name,
                file: values.file ?? undefined,
                category: values.category || undefined,
                tags: values.tags,
                width: values.width,
                height: values.height,
            },
        ]);
        setLoading(false);
    });

    const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [sharedCategory, setSharedCategory] = useState<string>('');
    const [sharedTags, setSharedTags] = useState<string[]>([]);
    const [sharedWidth, setSharedWidth] = useState<number | undefined>(undefined);
    const [sharedHeight, setSharedHeight] = useState<number | undefined>(undefined);

    useEffect(() => {
        return () => {
            fileEntries.forEach((e) => URL.revokeObjectURL(e.previewUrl));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFilesAdded = (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const newEntries: FileEntry[] = Array.from(files).map((file) => ({
            file,
            name: file.name.replace(/\.[^/.]+$/, ''),
            previewUrl: URL.createObjectURL(file),
        }));

        if (!sharedWidth && !sharedHeight) {
            const img = new Image();
            img.onload = () => {
                setSharedWidth(img.naturalWidth);
                setSharedHeight(img.naturalHeight);
            };
            img.src = newEntries[0].previewUrl;
        }

        setFileEntries((prev) => [...prev, ...newEntries]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeEntry = (index: number) => {
        setFileEntries((prev) => {
            URL.revokeObjectURL(prev[index].previewUrl);
            return prev.filter((_, i) => i !== index);
        });
    };

    const updateEntryName = (index: number, name: string) => {
        setFileEntries((prev) => prev.map((e, i) => (i === index ? { ...e, name } : e)));
    };

    const handleCreateSubmit = async () => {
        if (fileEntries.length === 0) return;
        setLoading(true);
        await onSubmit(
            fileEntries.map((e) => ({
                name: e.name || e.file.name,
                file: e.file,
                category: sharedCategory || undefined,
                tags: sharedTags,
                width: sharedWidth,
                height: sharedHeight,
            }))
        );
        setLoading(false);
    };

    if (initial) {
        return (
            <Stack gap="sm">
                <TextInput label="Name" required {...editForm.getInputProps('name')} />
                <Select label="Category" data={categoryData} {...editForm.getInputProps('category')} />
                <TagsInput label="Tags" placeholder="Add a tag and press Enter" {...editForm.getInputProps('tags')} />
                <Group grow>
                    <NumberInput label="Width (px)" min={0} {...editForm.getInputProps('width')} />
                    <NumberInput label="Height (px)" min={0} {...editForm.getInputProps('height')} />
                </Group>
                <FileInput label="Replace file (optional)" accept="image/*" value={editForm.values.file} onChange={(f) => editForm.setFieldValue('file', f)} />
                {editForm.values.width && editForm.values.height ? (
                    <Text size="sm" c="dimmed">
                        Dimensions: {editForm.values.width} × {editForm.values.height} px
                    </Text>
                ) : null}
                <Group justify="end">
                    <Button type="button" onClick={() => handleEditSubmit()} loading={loading}>
                        Save
                    </Button>
                </Group>
            </Stack>
        );
    }

    return (
        <Stack gap="sm">
            <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => handleFilesAdded(e.target.files)} />

            <Box>
                <Button variant="default" onClick={() => fileInputRef.current?.click()}>
                    Add images…
                </Button>
            </Box>

            {fileEntries.length > 0 && (
                <Stack gap={6}>
                    {fileEntries.map((entry, i) => (
                        <Group key={i} gap="xs" align="center" wrap="nowrap">
                            <img src={entry.previewUrl} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                            <TextInput style={{ flex: 1 }} placeholder="Name" value={entry.name} onChange={(e) => updateEntryName(i, e.currentTarget.value)} />
                            <ActionIcon variant="subtle" color="red" onClick={() => removeEntry(i)}>
                                <IconX size={16} />
                            </ActionIcon>
                        </Group>
                    ))}
                </Stack>
            )}

            <Select label="Category (shared)" data={categoryData} value={sharedCategory} onChange={(v) => setSharedCategory(v ?? '')} />
            <TagsInput label="Tags (shared)" placeholder="Add a tag and press Enter" value={sharedTags} onChange={setSharedTags} />
            <Group grow>
                <NumberInput label="Width (px, shared)" min={0} value={sharedWidth ?? ''} onChange={(v) => setSharedWidth(v === '' ? undefined : Number(v))} />
                <NumberInput label="Height (px, shared)" min={0} value={sharedHeight ?? ''} onChange={(v) => setSharedHeight(v === '' ? undefined : Number(v))} />
            </Group>

            <Group justify="end">
                <Button type="button" onClick={() => void handleCreateSubmit()} loading={loading} disabled={fileEntries.length === 0}>
                    {fileEntries.length > 1 ? `Add ${fileEntries.length} assets` : fileEntries.length === 1 ? 'Add asset' : 'Add assets'}
                </Button>
            </Group>
        </Stack>
    );
}
