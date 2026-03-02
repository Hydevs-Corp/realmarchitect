import { useState } from 'react';
import { Button, Group, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';

type Props = {
    initial?: string;
    onSubmit: (name: string) => Promise<void>;
};

export default function CategoryForm({ initial = '', onSubmit }: Props) {
    const form = useForm({
        initialValues: { name: initial },
        validate: {
            name: (v) => (v.trim() ? null : 'Name is required'),
        },
    });

    const [loading, setLoading] = useState(false);

    const submit = form.onSubmit(async (values) => {
        setLoading(true);
        await onSubmit(values.name.trim());
        setLoading(false);
    });

    return (
        <Stack gap="sm">
            <TextInput label="Nom" required {...form.getInputProps('name')} />
            <Group justify="end">
                <Button type="button" onClick={() => submit()} loading={loading}>
                    Enregistrer
                </Button>
            </Group>
        </Stack>
    );
}
