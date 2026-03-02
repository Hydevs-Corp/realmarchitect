import { useCallback, useEffect, useState } from 'react';
import { ActionIcon, Badge, Button, Divider, Group, Loader, Modal, Stack, Text, TextInput, Tooltip } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconCopy, IconLink, IconLinkOff, IconCrown, IconTrash, IconUserMinus } from '@tabler/icons-react';
import { createInvite, deleteInvite, fetchMapInvites, fetchMapMembers, removeMapMember, transferOwnership } from '../../lib/api';
import type { MapInvite, MapMember } from '../../types/map';
import { mainColor } from '../../constants';

interface Props {
    mapId: string;
    mapName: string;
    currentUserId: string;
    isOwner: boolean;
    opened: boolean;
    onClose: () => void;
    onOwnershipTransferred?: () => void;
}

function InviteRow({ invite, canDelete, onDelete }: { invite: MapInvite; canDelete: boolean; onDelete: () => void }) {
    const inviteUrl = `${window.location.origin}/join/${invite.token}`;

    const copyLink = () => {
        void navigator.clipboard.writeText(inviteUrl);
        notifications.show({
            message: 'Link copied to clipboard',
            color: mainColor,
        });
    };

    return (
        <Group gap="xs" wrap="nowrap">
            <TextInput value={inviteUrl} readOnly size="xs" style={{ flex: 1 }} styles={{ input: { fontFamily: 'monospace', fontSize: 11 } }} />
            {invite.label && (
                <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                    {invite.label}
                </Text>
            )}
            <Tooltip label="Copy link">
                <ActionIcon size="sm" variant="subtle" onClick={copyLink}>
                    <IconCopy size={14} />
                </ActionIcon>
            </Tooltip>
            {canDelete && (
                <Tooltip label="Revoke this link">
                    <ActionIcon size="sm" variant="subtle" color="red" onClick={onDelete}>
                        <IconLinkOff size={14} />
                    </ActionIcon>
                </Tooltip>
            )}
        </Group>
    );
}

function MemberRow({
    member,
    isCurrentUser,
    isOwner,
    canManage,
    onRemove,
    onTransfer,
}: {
    member: MapMember;
    isCurrentUser: boolean;
    isOwner: boolean;
    canManage: boolean;
    onRemove: () => void;
    onTransfer: () => void;
}) {
    return (
        <Group gap="xs">
            <Stack gap={0} style={{ flex: 1 }}>
                <Group gap={6}>
                    <Text size="sm" fw={isOwner ? 600 : 400}>
                        {member.name || member.email || 'Unknown user'}
                    </Text>
                    {isOwner && (
                        <Badge size="xs" color="orange" variant="light">
                            Owner
                        </Badge>
                    )}
                    {isCurrentUser && (
                        <Badge size="xs" color={mainColor} variant="outline">
                            You
                        </Badge>
                    )}
                </Group>
                {member.email && (
                    <Text size="xs" c="dimmed">
                        {member.email}
                    </Text>
                )}
            </Stack>

            {canManage && !isCurrentUser && !isOwner && (
                <Group gap={4}>
                    <Tooltip label="Transfer ownership">
                        <ActionIcon size="sm" variant="subtle" color="orange" onClick={onTransfer}>
                            <IconCrown size={14} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Remove member">
                        <ActionIcon size="sm" variant="subtle" color="red" onClick={onRemove}>
                            <IconUserMinus size={14} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            )}
            {!canManage && isCurrentUser && !isOwner && (
                <Tooltip label="Leave map">
                    <ActionIcon size="sm" variant="subtle" color="red" onClick={onRemove}>
                        <IconUserMinus size={14} />
                    </ActionIcon>
                </Tooltip>
            )}
        </Group>
    );
}

export function MapSettingsModal({ mapId, mapName, currentUserId, isOwner, opened, onClose, onOwnershipTransferred }: Props) {
    const [members, setMembers] = useState<MapMember[]>([]);
    const [invites, setInvites] = useState<MapInvite[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const [creatingInvite, setCreatingInvite] = useState(false);
    const [newInviteLabel, setNewInviteLabel] = useState('');

    const reload = useCallback(async () => {
        setLoadingData(true);
        try {
            const [m, i] = await Promise.all([fetchMapMembers(mapId), isOwner ? fetchMapInvites(mapId) : Promise.resolve([])]);
            setMembers(m);
            setInvites(i);
        } finally {
            setLoadingData(false);
        }
    }, [mapId, isOwner]);

    useEffect(() => {
        if (opened) void reload();
    }, [opened, reload]);

    const handleCreateInvite = async () => {
        setCreatingInvite(true);
        try {
            const inv = await createInvite(mapId, currentUserId, newInviteLabel || undefined);
            const url = `${window.location.origin}/join/${inv.token}`;
            void navigator.clipboard.writeText(url);
            notifications.show({
                message: 'Link created and copied to clipboard',
                color: mainColor,
            });
            setNewInviteLabel('');
            setInvites((prev) => [inv, ...prev]);
        } catch {
            notifications.show({
                message: 'Error creating the link',
                color: 'red',
            });
        } finally {
            setCreatingInvite(false);
        }
    };

    const handleDeleteInvite = (invite: MapInvite) => {
        modals.openConfirmModal({
            title: 'Revoke this invitation link',
            centered: true,
            children: <Text size="sm">This link will no longer work. Members who have already joined will remain members.</Text>,
            labels: { confirm: 'Revoke', cancel: 'Cancel' },
            confirmProps: { color: 'red' },
            onConfirm: async () => {
                await deleteInvite(invite.id);
                setInvites((prev) => prev.filter((i) => i.id !== invite.id));
            },
        });
    };

    const handleRemoveMember = (member: MapMember) => {
        const isSelf = member.user === currentUserId;
        modals.openConfirmModal({
            title: isSelf ? 'Leave map' : 'Remove member',
            centered: true,
            children: <Text size="sm">{isSelf ? `Are you sure you want to leave "${mapName}"?` : `Are you sure you want to remove ${member.name || member.email}?`}</Text>,
            labels: { confirm: isSelf ? 'Leave' : 'Remove', cancel: 'Cancel' },
            confirmProps: { color: 'red' },
            onConfirm: async () => {
                await removeMapMember(member.id);
                if (isSelf) {
                    onClose();
                    window.location.href = '/';
                } else {
                    setMembers((prev) => prev.filter((m) => m.id !== member.id));
                }
            },
        });
    };

    const handleTransfer = (newOwner: MapMember) => {
        const currentOwnerMember = members.find((m) => m.user === currentUserId && m.role === 'owner');
        if (!currentOwnerMember) return;

        modals.openConfirmModal({
            title: 'Transfer ownership',
            centered: true,
            children: (
                <Text size="sm">
                    Transfer ownership of <strong>{mapName}</strong> to <strong>{newOwner.name || newOwner.email}</strong>? You will become a regular member.
                </Text>
            ),
            labels: { confirm: 'Transfer', cancel: 'Cancel' },
            confirmProps: { color: 'orange' },
            onConfirm: async () => {
                await transferOwnership(mapId, newOwner.user, currentUserId, currentOwnerMember.id, newOwner.id);
                notifications.show({
                    message: 'Ownership transferred',
                    color: mainColor,
                });
                onOwnershipTransferred?.();
                onClose();
            },
        });
    };

    const ownerMember = members.find((m) => m.role === 'owner');

    return (
        <Modal opened={opened} onClose={onClose} title={`Settings – ${mapName}`} size="lg" centered>
            <Stack gap="lg">
                {loadingData ? (
                    <Loader size="sm" mx="auto" />
                ) : (
                    <>
                        <div>
                            <Text fw={600} mb="xs">
                                Members ({members.length})
                            </Text>
                            <Stack gap={8}>
                                {members.map((m) => (
                                    <MemberRow
                                        key={m.id}
                                        member={m}
                                        isCurrentUser={m.user === currentUserId}
                                        isOwner={m.role === 'owner'}
                                        canManage={isOwner}
                                        onRemove={() => handleRemoveMember(m)}
                                        onTransfer={() => handleTransfer(m)}
                                    />
                                ))}
                                {members.length === 0 && (
                                    <Text size="sm" c="dimmed">
                                        No members
                                    </Text>
                                )}
                            </Stack>
                        </div>

                        {isOwner && (
                            <>
                                <Divider />
                                <div>
                                    <Text fw={600} mb="xs">
                                        Invitation links
                                    </Text>
                                    <Stack gap={8} mb="sm">
                                        {invites.map((inv) => (
                                            <InviteRow key={inv.id} invite={inv} canDelete={isOwner} onDelete={() => handleDeleteInvite(inv)} />
                                        ))}
                                        {invites.length === 0 && (
                                            <Text size="sm" c="dimmed">
                                                No active links
                                            </Text>
                                        )}
                                    </Stack>

                                    <Group gap="sm">
                                        <TextInput
                                            placeholder="Label (optional)"
                                            size="xs"
                                            value={newInviteLabel}
                                            onChange={(e) => setNewInviteLabel(e.currentTarget.value)}
                                            style={{ flex: 1 }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') void handleCreateInvite();
                                            }}
                                        />
                                        <Button size="xs" leftSection={<IconLink size={12} />} loading={creatingInvite} onClick={() => void handleCreateInvite()}>
                                            Generate link
                                        </Button>
                                    </Group>
                                </div>
                            </>
                        )}

                        {isOwner && (
                            <>
                                <Divider />
                                <div>
                                    <Text fw={600} c="red" mb="xs">
                                        Danger zone
                                    </Text>
                                    <Button
                                        variant="light"
                                        color="red"
                                        size="xs"
                                        leftSection={<IconTrash size={12} />}
                                        onClick={() => {
                                            modals.openConfirmModal({
                                                title: 'Delete map',
                                                centered: true,
                                                children: (
                                                    <Text size="sm">
                                                        Confirm deletion of <strong>{mapName}</strong>? This action is irreversible.
                                                    </Text>
                                                ),
                                                labels: { confirm: 'Delete', cancel: 'Cancel' },
                                                confirmProps: { color: 'red' },
                                                onConfirm: async () => {
                                                    const { Hypb } = await import('@hydevs/hypb');
                                                    await Hypb.pb.collection('dnc_worldmap_maps').delete(mapId);
                                                    onClose();
                                                    window.location.href = '/';
                                                },
                                            });
                                        }}
                                    >
                                        Delete this map
                                    </Button>
                                </div>
                            </>
                        )}

                        {!isOwner && ownerMember && (
                            <>
                                <Divider />
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">
                                        Owner: <strong>{ownerMember.name || ownerMember.email}</strong>
                                    </Text>
                                    <Button
                                        variant="light"
                                        color="red"
                                        size="xs"
                                        leftSection={<IconUserMinus size={12} />}
                                        onClick={() => {
                                            const me = members.find((m) => m.user === currentUserId);
                                            if (me) handleRemoveMember(me);
                                        }}
                                    >
                                        Leave map
                                    </Button>
                                </Group>
                            </>
                        )}
                    </>
                )}
            </Stack>
        </Modal>
    );
}
