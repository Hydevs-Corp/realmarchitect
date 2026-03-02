import { useAuthContext } from '@hydevs/hypb';
import { Container, Text, Title, Button, Group } from '@mantine/core';
import { Navigate, useNavigate } from 'react-router';
import { AssetManagerContent } from '../components/ui/AssetManager';
import { IconArrowLeft } from '@tabler/icons-react';

export function AssetsPage() {
    const { userData, loading: authLoading } = useAuthContext();
    const navigate = useNavigate();

    if (!authLoading && userData?.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    return (
        <Container size="xl" py="xl">
            <Title order={2} mb="md">
                Global asset management
            </Title>
            <Text c="dimmed" mb="xl">
                You can add, edit or delete utility images and their categories.
            </Text>
            <AssetManagerContent />
        </Container>
    );
}
