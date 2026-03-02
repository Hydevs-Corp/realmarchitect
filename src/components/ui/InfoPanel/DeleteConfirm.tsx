import React from 'react';
import { Button, Group, Stack, Text } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';

interface DeleteConfirmProps {
    onDelete: () => void;
    onCancel: () => void;
}

export const DeleteConfirm: React.FC<DeleteConfirmProps> = ({ onDelete, onCancel }) => (
    <Stack gap="xs">
        <Text size="xs" c="red">
            Confirm deletion?
        </Text>
        <Group gap="xs">
            <Button size="xs" color="red" variant="filled" leftSection={<IconTrash size={12} />} onClick={onDelete} style={{ flex: 1 }}>
                Delete
            </Button>
            <Button size="xs" variant="default" onClick={onCancel} style={{ flex: 1 }}>
                Cancel
            </Button>
        </Group>
    </Stack>
);
