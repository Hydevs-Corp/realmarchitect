import { Hypb, logoutPB, useAuthContext } from '@hydevs/hypb';
import { ActionIcon, AppShell, Avatar, Button, Group, Tooltip, Menu, Text, Title } from '@mantine/core';
import { IconArrowLeft, IconChevronDown, IconFileExport, IconSettings, IconUserCircle } from '@tabler/icons-react';
import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import { useCreateMapModal } from '../../hooks/useCreateMapModal';
import useMapPresence from '../../hooks/useMapPresence';
import { useMapStore } from '../../store/useMapStore';
import { MapSettingsModal } from './MapSettingsModal';
import { ExportImportModal } from './ExportImportModal';
import { mainColor } from '../../constants';

export const AppHeader: React.FC = () => {
    const { userData } = useAuthContext();
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { openCreateMapModal } = useCreateMapModal();

    const currentMap = useMapStore((s) => s.currentMap);

    const { online } = useMapPresence(currentMap?.id);

    const [settingsOpen, setSettingsOpen] = useState(false);
    const [exportImportOpen, setExportImportOpen] = useState(false);

    const onLogout = () => {
        logoutPB();
        navigate('/login');
    };

    const onOpenSettings = () => setSettingsOpen(true);

    return (
        <>
            <AppShell.Header px="md">
                <Group justify="space-between" align="center" style={{ height: '100%' }}>
                    <Group gap="md">
                        <Title order={3} style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
                            Realm Architect
                        </Title>
                    </Group>

                    <Group gap="sm" flex={1} justify="flex-end">
                        {pathname === '/' && (
                            <>
                                {userData?.role === 'admin' && (
                                    <Button component={NavLink} to="/assets" variant="outline" size="sm">
                                        Manage assets
                                    </Button>
                                )}
                                <Button onClick={openCreateMapModal} size="sm">
                                    New Map
                                </Button>
                            </>
                        )}

                        {pathname.startsWith('/assets') && (
                            <Button size="sm" variant="outline" onClick={() => navigate('/')}>
                                Back to maps
                            </Button>
                        )}

                        {pathname.startsWith('/map') && (
                            <Group flex={1} justify="space-between">
                                <ActionIcon variant="light" onClick={() => navigate('/')}>
                                    <IconArrowLeft />
                                </ActionIcon>
                                <div>
                                    <Text fw={600}>{currentMap?.name || 'Carte'}</Text>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Group gap={6} mr={8}>
                                        {online.slice(0, 5).map((p) => (
                                            <Tooltip key={p.id} label={p.name || p.email} withArrow>
                                                <Avatar size={24} radius="xl">
                                                    {p.name ? p.name[0].toUpperCase() : (p.email || '?')[0].toUpperCase()}
                                                </Avatar>
                                            </Tooltip>
                                        ))}
                                        {online.length > 5 && (
                                            <Avatar size={24} radius="xl">
                                                +{online.length - 5}
                                            </Avatar>
                                        )}
                                    </Group>
                                </div>
                                <Tooltip label="Export / Import" withArrow>
                                    <ActionIcon variant="light" onClick={() => setExportImportOpen(true)}>
                                        <IconFileExport />
                                    </ActionIcon>
                                </Tooltip>
                                <ActionIcon size="sm" onClick={onOpenSettings}>
                                    <IconSettings />
                                </ActionIcon>
                            </Group>
                        )}

                        {userData && (
                            <Menu shadow="md" width={200} position="bottom-end">
                                <Menu.Target>
                                    <Button
                                        variant="default"
                                        rightSection={<IconChevronDown />}
                                        leftSection={
                                            <Avatar size={20} radius="xl" color={mainColor}>
                                                <IconUserCircle />
                                            </Avatar>
                                        }
                                    >
                                        {userData?.name || userData?.email}
                                    </Button>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    <Menu.Label>{userData?.email}</Menu.Label>
                                    <Menu.Item color="red" onClick={onLogout}>
                                        Sign out
                                    </Menu.Item>
                                </Menu.Dropdown>
                            </Menu>
                        )}
                    </Group>
                </Group>
            </AppShell.Header>

            {currentMap && (
                <MapSettingsModal
                    mapId={currentMap.id}
                    mapName={currentMap.name}
                    currentUserId={Hypb.pb.authStore.model?.id || ''}
                    isOwner={Hypb.pb.authStore.model?.id === currentMap.owner}
                    opened={settingsOpen}
                    onClose={() => setSettingsOpen(false)}
                    onOwnershipTransferred={() => setSettingsOpen(false)}
                />
            )}
            {currentMap && <ExportImportModal opened={exportImportOpen} onClose={() => setExportImportOpen(false)} />}
        </>
    );
};

export default AppHeader;
