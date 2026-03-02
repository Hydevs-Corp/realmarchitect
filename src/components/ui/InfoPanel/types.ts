import type { CSSProperties } from 'react';

export const PANEL_CONTAINER_STYLE: CSSProperties = {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 350,
    height: 'calc(100svh - var(--app-shell-header-height))',
    pointerEvents: 'auto',
    zIndex: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--mantine-color-body)',
    borderLeft: '1px solid var(--mantine-color-default-border)',
    boxShadow: '-4px 0 16px rgba(0,0,0,0.15)',
};

export const HEADER_STYLE: CSSProperties = {
    borderBottom: '1px solid var(--mantine-color-default-border)',
    flexShrink: 0,
};
