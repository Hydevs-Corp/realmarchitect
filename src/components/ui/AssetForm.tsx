import { useEffect, useState } from 'react';
import { Button, FileInput, Group, NumberInput, Select, Stack, TextInput, Text } from '@mantine/core';
import { TagsInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import type { DncWorldmapAssetCategoryRecord, DncWorldmapAssetRecord } from '../../types/database';

type Props = {
    categories: DncWorldmapAssetCategoryRecord[];
    initial?: DncWorldmapAssetRecord;
    onSubmit: (data: { name?: string; file?: File; category?: string; tags?: string[]; width?: number; height?: number }) => Promise<void>;
};

export default function AssetForm({ categories, initial, onSubmit }: Props) {
    const form = useForm<{
        name: string;
        category: string | undefined;
        tags: string[];
        file: File | null;
        width?: number;
        height?: number;
    }>({
        initialValues: {
            name: initial?.name || '',
            category: initial?.category,
            tags: initial?.tags || [],
            file: null,
            width: initial?.width,
            height: initial?.height,
        },
    });

    const [loading, setLoading] = useState(false);

    const submit = form.onSubmit(async (values) => {
        setLoading(true);
        await onSubmit({
            name: values.name,
            file: values.file ?? undefined,
            category: values.category || undefined,
            tags: values.tags,
            width: values.width ?? undefined,
            height: values.height ?? undefined,
        });
        setLoading(false);
    });

    useEffect(() => {
        const file = form.values.file;
        if (!file) {
            return;
        }

        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            form.setFieldValue('width', w);
            form.setFieldValue('height', h);
            URL.revokeObjectURL(url);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
        };
        img.src = url;

        return () => {
            try {
                URL.revokeObjectURL(url);
            } catch (e) {
                console.error(e);
            }
        };
    }, [form, form.values.file]);

    return (
        <Stack gap="sm">
            <TextInput label="Nom" required {...form.getInputProps('name')} />

            <Select label="Category" data={[{ value: '', label: 'None' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} {...form.getInputProps('category')} />

            <TagsInput label="Tags" placeholder="Add a tag and press Enter" {...form.getInputProps('tags')} />

            <Group grow>
                <NumberInput label="Width (px)" min={0} step={0} {...form.getInputProps('width')} />
                <NumberInput label="Height (px)" min={0} step={0} {...form.getInputProps('height')} />
            </Group>

            <FileInput
                label={initial ? 'Replace file (optional)' : 'File'}
                accept="image/*"
                value={form.values.file}
                onChange={(f) => form.setFieldValue('file', f)}
                required={!initial}
            />

            {form.values.width && form.values.height ? (
                <Text size="sm" c="dimmed">
                    Dimensions: {form.values.width} x {form.values.height} px
                </Text>
            ) : null}

            <Group justify="end">
                <Button type="button" onClick={() => submit()} loading={loading}>
                    Enregistrer
                </Button>
            </Group>
        </Stack>
    );
}
