import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, Center, DEFAULT_THEME, getGradient, Loader, Paper, Stack, Text, Title } from '@mantine/core';
import { useAuthContext } from '@hydevs/hypb';
import { IconMap, IconMapOff } from '@tabler/icons-react';
import { addMapMember, checkMembership, fetchInviteByToken } from '../lib/api';
import type { MapInvite } from '../types/map';
import { mainColor } from '../constants';

type State = 'loading' | 'needsAuth' | 'alreadyMember' | 'joining' | 'error' | 'done';

export function JoinPage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const { userData, loading: authLoading } = useAuthContext();

    const [state, setState] = useState<State>('loading');
    const [invite, setInvite] = useState<MapInvite | null>(null);
    const [errorMsg, setErrorMsg] = useState<string>('');

    useEffect(() => {
        if (authLoading) return;

        void (async () => {
            if (!token) {
                setState('error');
                setErrorMsg('Invalid invitation link.');
                return;
            }

            if (!userData) {
                await navigate(`/login?redirect=/join/${token}`, { replace: true });
                return;
            }

            const inv = await fetchInviteByToken(token);
            if (!inv) {
                setState('error');
                setErrorMsg('This invitation link is invalid or has expired.');
                return;
            }
            setInvite(inv);

            const already = await checkMembership(inv.mapId, userData.id);
            if (already) {
                setState('alreadyMember');
                return;
            }

            setState('joining');
        })();
    }, [authLoading, userData, token, navigate]);

    const handleJoin = async () => {
        if (!invite || !userData) return;
        setState('loading');
        try {
            await addMapMember(invite.mapId, userData.id, 'member');
            setState('done');
            setTimeout(() => void navigate(`/map/${invite.mapId}`), 1000);
        } catch (e) {
            setState('error');
            setErrorMsg(e instanceof Error ? e.message : 'Error joining the map.');
        }
    };

    if (state === 'loading' || authLoading) {
        return (
            <Center h="100vh">
                <Loader size="xl" />
            </Center>
        );
    }

    return (
        <Center
            h="calc(100svh - var(--app-shell-header-height))"
            bg={getGradient(
                {
                    from: mainColor + '.9',
                    to: mainColor + '.3',
                    deg: 45,
                },
                DEFAULT_THEME
            )}
        >
            <Paper p="xl" radius="md" withBorder w={380}>
                <Stack align="center" gap="md">
                    {state === 'error' ? (
                        <>
                            <IconMapOff size={48} color="var(--mantine-color-red-5)" />
                            <Title order={3}>Invalid link</Title>
                            <Text c="dimmed" ta="center">
                                {errorMsg}
                            </Text>
                            <Button variant="light" onClick={() => void navigate('/')}>
                                Back to home
                            </Button>
                        </>
                    ) : state === 'done' ? (
                        <>
                            <IconMap size={48} color={'var(--mantine-color-' + mainColor + '-5)'} />
                            <Title order={3}>Welcome!</Title>
                            <Text c="dimmed">You have joined the map. Redirecting…</Text>
                            <Loader />
                        </>
                    ) : state === 'alreadyMember' ? (
                        <>
                            <IconMap size={48} color={'var(--mantine-color-' + mainColor + '-5)'} />
                            <Title order={3}>Already a member</Title>
                            <Text c="dimmed">You already have access to this map.</Text>
                            <Button onClick={() => void navigate(`/map/${invite!.mapId}`)}>Open map</Button>
                        </>
                    ) : (
                        <>
                            <IconMap size={48} color={'var(--mantine-color-' + mainColor + '-5)'} />
                            <Title order={3}>Join a map</Title>
                            <Text c="dimmed" ta="center">
                                You have been invited to collaborate on a map. Click below to accept the invitation.
                            </Text>
                            <Button fullWidth onClick={() => void handleJoin()}>
                                Join map
                            </Button>
                            <Button variant="subtle" color="gray" size="xs" onClick={() => void navigate('/')}>
                                Cancel
                            </Button>
                        </>
                    )}
                </Stack>
            </Paper>
        </Center>
    );
}
