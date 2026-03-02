import { Button, Group, LoadingOverlay, TextInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';

export default function MapForm({
    initialValues,
    onSubmit,
    onCancel,
}: {
    initialValues?: { name: string; description: string };
    onSubmit: (values: { name: string; description?: string }) => Promise<void>;
    onCancel: () => void;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm({
        initialValues: initialValues || { name: '', description: '' },
        validate: {
            name: (value) => (value.trim().length > 0 ? null : 'Name is required'),
        },
    });

    const handleSubmit = async (values: typeof form.values) => {
        setIsSubmitting(true);
        try {
            await onSubmit(values);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={form.onSubmit(handleSubmit)}>
            <LoadingOverlay visible={isSubmitting} />
            <TextInput label="Map name" placeholder="Ex: Faerûn Continent" data-autofocus required {...form.getInputProps('name')} />
            <Textarea label="Description" placeholder="A brief description..." minRows={3} autosize {...form.getInputProps('description')} />
            <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" loading={isSubmitting}>
                    {initialValues ? 'Save' : 'Create'}
                </Button>
            </Group>
        </form>
    );
}
