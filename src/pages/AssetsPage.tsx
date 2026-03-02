import { useAuthContext } from '@hydevs/hypb';
import { Container, Text, Title } from '@mantine/core';
import { Navigate } from 'react-router';
import { AssetManagerContent } from '../components/ui/AssetManager';

export function AssetsPage() {
    const { userData, loading: authLoading } = useAuthContext();

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
