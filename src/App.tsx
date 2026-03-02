import { Hypb, useAuthContext, useCollection } from '@hydevs/hypb';
import { ActionIcon, Badge, Button, Card, Center, Container, Group, Loader, SimpleGrid, Stack, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconEdit, IconMap, IconSettings, IconTrash } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import './App.css';
import MapForm from './components/ui/MapForm';
import { MapSettingsModal } from './components/ui/MapSettingsModal';
import { useCreateMapModal } from './hooks/useCreateMapModal';
import type { DncWorldmapMapRecord } from './types/database';

export default function App() {
    const { records, loading, invalidate } = useCollection('dnc_worldmap_maps');
    const { userData, loading: authLoading } = useAuthContext();
    const navigate = useNavigate();

    const { openCreateMapModal } = useCreateMapModal();

    const [settingsMap, setSettingsMap] = useState<DncWorldmapMapRecord | null>(null);

    useEffect(() => {
        if (!authLoading && !userData) {
            void navigate('/login', { replace: true });
        }
    }, [authLoading, userData, navigate]);

    if (authLoading || !userData) {
        return (
            <Center h="50vh">
                <Loader size="xl" />
            </Center>
        );
    }
    const handleCreate = () => openCreateMapModal();

    const handleEdit = (map: DncWorldmapMapRecord) => {
        modals.open({
            title: `Edit: ${map.name}`,
            centered: true,
            size: 'lg',
            children: (
                <MapForm
                    initialValues={{
                        name: map.name,
                        description: map.description || '',
                    }}
                    onSubmit={async (values) => {
                        try {
                            await Hypb.pb.collection('dnc_worldmap_maps').update(map.id, values);
                            invalidate();
                            modals.closeAll();
                        } catch (e) {
                            console.error(e);
                        }
                    }}
                    onCancel={() => modals.closeAll()}
                />
            ),
        });
    };

    const handleDelete = (map: DncWorldmapMapRecord) => {
        modals.openConfirmModal({
            title: 'Delete map',
            centered: true,
            size: 'lg',
            children: (
                <Text size="sm">
                    Are you sure you want to delete <strong>{map.name}</strong>? This action is irreversible.
                </Text>
            ),
            labels: { confirm: 'Delete', cancel: 'Cancel' },
            confirmProps: { color: 'red' },
            onConfirm: async () => {
                try {
                    await Hypb.pb.collection('dnc_worldmap_maps').delete(map.id);
                    invalidate();
                } catch (e) {
                    console.error(e);
                }
            },
        });
    };

    const isOwner = (map: DncWorldmapMapRecord) => map.owner === userData.id;

    if (loading) {
        return (
            <Center h="50vh">
                <Loader size="xl" />
            </Center>
        );
    }

    return (
        <Container size="xl" py="xl">
            {records.length === 0 ? (
                <Center h={300}>
                    <Stack align="center" gap="xs">
                        <IconMap size={48} color="gray" style={{ opacity: 0.5 }} />
                        <Text size="lg" fw={500} c="dimmed">
                            No maps found
                        </Text>
                        <Button variant="light" onClick={handleCreate}>
                            Create your first map
                        </Button>
                    </Stack>
                </Center>
            ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                    {records.map((map: DncWorldmapMapRecord) => (
                        <Card key={map.id} withBorder>
                            <Stack justify="space-between" h="100%">
                                <div>
                                    <Group justify="space-between" mb="xs">
                                        <Text fw={600} size="lg" truncate="end" style={{ flex: 1 }}>
                                            {map.name}
                                        </Text>
                                        <Group gap={4}>
                                            <Badge variant="light" color={isOwner(map) ? 'orange' : 'gray'} size="xs">
                                                {isOwner(map) ? 'Owner' : 'Member'}
                                            </Badge>
                                            <Badge variant="light">{new Date(map.created).toLocaleDateString()}</Badge>
                                        </Group>
                                    </Group>

                                    <Text size="sm" c="dimmed" lineClamp={3}>
                                        {map.description || 'No description provided.'}
                                    </Text>
                                </div>

                                <Group
                                    pt="md"
                                    style={{
                                        borderTop: '1px solid var(--mantine-color-default-border)',
                                    }}
                                >
                                    <Button variant="subtle" size="xs" leftSection={<IconMap size={14} />} component={NavLink} to={`/map/${map.id}`}>
                                        Open
                                    </Button>

                                    <Group gap={4} ml="auto">
                                        <ActionIcon variant="subtle" color="gray" onClick={() => setSettingsMap(map)} title="Settings & Members">
                                            <IconSettings size={16} />
                                        </ActionIcon>
                                        {isOwner(map) && (
                                            <>
                                                <ActionIcon variant="subtle" color="gray" onClick={() => handleEdit(map)} title="Edit">
                                                    <IconEdit size={16} />
                                                </ActionIcon>
                                                <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(map)} title="Delete">
                                                    <IconTrash size={16} />
                                                </ActionIcon>
                                            </>
                                        )}
                                    </Group>
                                </Group>
                            </Stack>
                        </Card>
                    ))}
                </SimpleGrid>
            )}

            {settingsMap && (
                <MapSettingsModal
                    mapId={settingsMap.id}
                    mapName={settingsMap.name}
                    currentUserId={userData.id}
                    isOwner={isOwner(settingsMap)}
                    opened={!!settingsMap}
                    onClose={() => {
                        setSettingsMap(null);
                        invalidate();
                    }}
                    onOwnershipTransferred={() => {
                        setSettingsMap(null);
                        invalidate();
                    }}
                />
            )}
        </Container>
    );
}
