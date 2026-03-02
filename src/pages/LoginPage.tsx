import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Anchor, Box, Button, Center, Paper, PasswordInput, Stack, Tabs, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { Hypb, loginPB } from '@hydevs/hypb';
import { IconMap } from '@tabler/icons-react';
import { mainColor } from '../constants';

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const form = useForm({
        initialValues: { email: '', password: '' },
        validate: {
            email: (v) => (/\S+@\S+\.\S+/.test(v) ? null : 'Invalid email'),
            password: (v) => (v.length >= 8 ? null : 'Minimum 8 characters'),
        },
    });

    const handleSubmit = async (values: typeof form.values) => {
        setLoading(true);
        setError(null);
        try {
            await loginPB(values.email, values.password);
            onSuccess();
        } catch {
            setError('Incorrect email or password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="sm">
                <TextInput label="Email" placeholder="vous@exemple.com" type="email" {...form.getInputProps('email')} />
                <PasswordInput label="Mot de passe" placeholder="••••••••" {...form.getInputProps('password')} />
                {error && (
                    <Text c="red" size="sm">
                        {error}
                    </Text>
                )}
                <Button type="submit" loading={loading} fullWidth mt="xs">
                    Sign in
                </Button>
            </Stack>
        </form>
    );
}

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const form = useForm({
        initialValues: {
            name: '',
            email: '',
            password: '',
            passwordConfirm: '',
        },
        validate: {
            email: (v) => (/\S+@\S+\.\S+/.test(v) ? null : 'Invalid email'),
            password: (v) => (v.length >= 8 ? null : 'Minimum 8 characters'),
            passwordConfirm: (v, values) => (v === values.password ? null : 'Passwords do not match'),
        },
    });

    const handleSubmit = async (values: typeof form.values) => {
        setLoading(true);
        setError(null);
        try {
            await Hypb.pb.collection('dnc_worldmap_users').create({
                name: values.name,
                email: values.email,
                password: values.password,
                passwordConfirm: values.passwordConfirm,
                emailVisibility: true,
                role: 'user',
            });
            await loginPB(values.email, values.password);
            onSuccess();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Error creating account';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="sm">
                <TextInput label="Display name" placeholder="Gandalf" {...form.getInputProps('name')} />
                <TextInput label="Email" placeholder="you@example.com" type="email" {...form.getInputProps('email')} />
                <PasswordInput label="Password" placeholder="••••••••" {...form.getInputProps('password')} />
                <PasswordInput label="Confirm password" placeholder="••••••••" {...form.getInputProps('passwordConfirm')} />
                {error && (
                    <Text c="red" size="sm">
                        {error}
                    </Text>
                )}
                <Button type="submit" loading={loading} fullWidth mt="xs">
                    Create account
                </Button>
            </Stack>
        </form>
    );
}

export function LoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirect = searchParams.get('redirect') ?? '/';

    const handleSuccess = () => {
        void navigate(redirect);
    };

    return (
        <Center h="100vh" bg="var(--mantine-color-default-hover)">
            <Box w={400}>
                <Stack align="center" mb="xl" gap="xs">
                    <IconMap size={40} color={'var(--mantine-color-' + mainColor + '-5)'} />
                    <Title order={2}>World Maps</Title>
                    <Text c="dimmed" size="sm">
                        Sign in to access your maps
                    </Text>
                </Stack>

                <Paper p="xl" radius="md" withBorder>
                    <Tabs defaultValue="login">
                        <Tabs.List grow mb="lg">
                            <Tabs.Tab value="login">Sign in</Tabs.Tab>
                            <Tabs.Tab value="register">Register</Tabs.Tab>
                        </Tabs.List>
                        <Tabs.Panel value="login">
                            <LoginForm onSuccess={handleSuccess} />
                        </Tabs.Panel>
                        <Tabs.Panel value="register">
                            <RegisterForm onSuccess={handleSuccess} />
                        </Tabs.Panel>
                    </Tabs>
                </Paper>

                <Text ta="center" mt="md" size="xs" c="dimmed">
                    Connection issues?{' '}
                    <Anchor size="xs" href="mailto:admin@louisrvl.fr">
                        Contact the admin
                    </Anchor>
                </Text>
            </Box>
        </Center>
    );
}
