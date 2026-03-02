import { AppShell } from '@mantine/core';
import React from 'react';
import { Outlet } from 'react-router';
import AppHeader from './AppHeader';

export const AppShellLayout: React.FC = () => {
    return (
        <AppShell
            padding={0}
            header={{
                height: 60,
            }}
        >
            <AppHeader />
            <AppShell.Main>
                <Outlet />
            </AppShell.Main>
        </AppShell>
    );
};

export default AppShellLayout;
