import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createTheme, MantineProvider, Tooltip } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { AuthProvider, Hypb } from '@hydevs/hypb';
import '@mantine/core/styles.css';
import '@mantine/spotlight/styles.css';
import '@mantine/notifications/styles.css';
import './index.css';
import App from './App.tsx';
import { AppShellLayout } from './components/ui/AppShellLayout';
import { MapPage } from './pages/MapPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { JoinPage } from './pages/JoinPage.tsx';
import { AssetsPage } from './pages/AssetsPage.tsx';
import { mainColor } from './constants.ts';

Hypb.initPB('https://pocketbase.louisrvl.fr', {
    autoCancellation: false,
    userCollection: 'dnc_worldmap_users',
});

const router = createBrowserRouter([
    {
        path: '/',
        element: <AppShellLayout />,
        children: [
            { index: true, element: <App /> },
            { path: 'map/:mapId', element: <MapPage /> },
            { path: 'login', element: <LoginPage /> },
            { path: 'join/:token', element: <JoinPage /> },
            { path: 'assets', element: <AssetsPage /> },
        ],
    },
]);

const theme = createTheme({
    primaryColor: mainColor,
    defaultRadius: 'xs',
    components: {
        Tooltip: Tooltip.extend({
            defaultProps: {
                withArrow: true,
                zIndex: 3501,
            },
            styles: {
                tooltip: {
                    zIndex: 3500,
                },
            },
        }),
    },
});

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <MantineProvider theme={theme} defaultColorScheme="dark">
            <ModalsProvider>
                <AuthProvider>
                    <Notifications position="top-right" />
                    <RouterProvider router={router} />
                </AuthProvider>
            </ModalsProvider>
        </MantineProvider>
    </StrictMode>
);
