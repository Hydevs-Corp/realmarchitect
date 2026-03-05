import { ActionIcon, Box, Button, Collapse, ColorSwatch, Divider, Group, Menu, Stack, Tabs, Text, TextInput, ThemeIcon, Tooltip } from '@mantine/core';
import {
    IconChevronDown,
    IconChevronRight,
    IconEye,
    IconEyeOff,
    IconFocus2,
    IconFolder,
    IconFolderPlus,
    IconFolderX,
    IconLine,
    IconLock,
    IconLockOpen,
    IconMap,
    IconMapPin,
    IconNote,
    IconPin,
    IconPinFilled,
    IconPolygon,
    IconSearch,
    IconTrash,
    IconX,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { mainColor } from '../../constants';
import { useMapStore } from '../../store/useMapStore';
import type { MapGroup } from '../../types/map';
import VirtualList from './VirtualList';

function centroid(points: number[]): { x: number; y: number } {
    let sx = 0,
        sy = 0;
    const n = points.length / 2;
    for (let i = 0; i < points.length; i += 2) {
        sx += points[i];
        sy += points[i + 1];
    }
    return { x: sx / n, y: sy / n };
}

interface RowProps {
    label: string;
    color?: string;
    icon: React.ReactNode;
    isSelected: boolean;
    isHidden: boolean;
    isLocked: boolean;
    isPinned: boolean;
    indent?: boolean;
    onFocus: () => void;
    onToggleHide: () => void;
    onHideOthers?: () => void;
    onToggleLock: () => void;
    onTogglePin: () => void;
    onSelect: () => void;
    extraAction?: React.ReactNode;
}

function ElementRow({
    label,
    color,
    icon,
    isSelected,
    isHidden,
    isLocked,
    isPinned,
    indent,
    onFocus,
    onToggleHide,
    onHideOthers,
    onToggleLock,
    onTogglePin,
    onSelect,
    extraAction,
}: RowProps) {
    return (
        <Box
            onClick={onSelect}
            style={{
                width: '100%',
                borderRadius: 6,
                padding: `4px 8px 4px ${indent ? 20 : 8}px`,
                backgroundColor: isSelected ? 'var(--mantine-color-' + mainColor + '-light)' : 'transparent',
                opacity: isHidden ? 0.45 : 1,
            }}
        >
            <Group gap="xs" wrap="nowrap" justify="space-between">
                <Group gap="xs" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                    {color ? (
                        <ColorSwatch color={color} style={{ flexShrink: 0 }} />
                    ) : (
                        <ThemeIcon variant="transparent" color="gray">
                            {icon}
                        </ThemeIcon>
                    )}
                    <Text
                        size="xs"
                        truncate
                        style={{
                            textDecoration: isHidden ? 'line-through' : undefined,
                        }}
                    >
                        {label}
                    </Text>
                </Group>
                <Group gap={2} wrap="nowrap" style={{ flexShrink: 0 }}>
                    {extraAction}
                    <Tooltip label={isPinned ? 'Unpin (stay visible in search)' : 'Pin (stay visible in search)'} withArrow openDelay={400}>
                        <ActionIcon
                            size="xs"
                            variant={isPinned ? 'light' : 'subtle'}
                            color={isPinned ? 'orange' : 'gray'}
                            style={{ opacity: isPinned ? 1 : 0.4 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onTogglePin();
                            }}
                        >
                            {isPinned ? <IconPinFilled size={12} /> : <IconPin size={12} />}
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label={isLocked ? 'Unlock' : 'Lock'} withArrow openDelay={400}>
                        <ActionIcon
                            size="xs"
                            variant="subtle"
                            color={isLocked ? 'orange' : 'gray'}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleLock();
                            }}
                        >
                            {isLocked ? <IconLock size={12} /> : <IconLockOpen size={12} />}
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label={isHidden ? 'Show' : 'Hide (right-click: hide others)'} withArrow openDelay={400}>
                        <ActionIcon
                            size="xs"
                            variant="subtle"
                            color={isHidden ? 'gray' : mainColor}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleHide();
                            }}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onHideOthers?.();
                            }}
                        >
                            {isHidden ? <IconEyeOff size={12} /> : <IconEye size={12} />}
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Centrer la vue" withArrow openDelay={400}>
                        <ActionIcon
                            size="xs"
                            variant="subtle"
                            color={mainColor}
                            onClick={(e) => {
                                e.stopPropagation();
                                onFocus();
                            }}
                        >
                            <IconFocus2 size={12} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>
        </Box>
    );
}

interface GroupPickerMenuProps {
    elementId: string;
    currentGroupId: string | undefined;
    groups: MapGroup[];
    onAssign: (groupId: string | null) => void;
}

function GroupPickerMenu({ currentGroupId, groups, onAssign }: GroupPickerMenuProps) {
    return (
        <Menu
            withinPortal
            styles={{
                dropdown: {
                    zIndex: 2300,
                },
            }}
            position="right-start"
            shadow="md"
            width={200}
        >
            <Tooltip label="Grouper" withArrow openDelay={400}>
                <Menu.Target>
                    <ActionIcon size="xs" variant={currentGroupId ? 'light' : 'subtle'} color={currentGroupId ? 'violet' : 'gray'} onClick={(e) => e.stopPropagation()}>
                        <IconFolder size={12} />
                    </ActionIcon>
                </Menu.Target>
            </Tooltip>
            <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
                <Menu.Label>Group</Menu.Label>
                {groups.map((g) => (
                    <Menu.Item
                        key={g.id}
                        leftSection={<ColorSwatch size={10} color={g.color} />}
                        fw={currentGroupId === g.id ? 700 : undefined}
                        onClick={() => onAssign(currentGroupId === g.id ? null : g.id)}
                    >
                        {g.name}
                    </Menu.Item>
                ))}
                {groups.length === 0 && <Menu.Item disabled>No groups</Menu.Item>}
                {currentGroupId && (
                    <>
                        <Menu.Divider />
                        <Menu.Item color="red" leftSection={<IconFolderX size={12} />} onClick={() => onAssign(null)}>
                            Remove from group
                        </Menu.Item>
                    </>
                )}
            </Menu.Dropdown>
        </Menu>
    );
}

type ElementDisplayInfo = {
    label: string;
    color?: string;
    icon: React.ReactNode;
    kind: 'poi' | 'zone' | 'note' | 'image' | 'line';
    focusX: number;
    focusY: number;
    hidden: boolean;
    locked: boolean;
    pinned: boolean;
};

interface GroupRowProps {
    group: MapGroup;
    elementMap: Map<string, ElementDisplayInfo>;
    groups: MapGroup[];
    multiSelectedIds: string[];
    selectedElementId: string | null;
    onUpdate: (id: string, updates: Partial<MapGroup>) => void;
    onDelete: (id: string) => void;
    onSetElementGroup: (elementId: string, groupId: string | null) => void;
    onSelectGroup: () => void;
    onSelectElement: (id: string, kind: 'poi' | 'zone' | 'note' | 'image' | 'line') => void;
    onFocusElement: (x: number, y: number, id: string, kind: 'poi' | 'zone' | 'note' | 'image' | 'line') => void;
    onToggleHide: (id: string) => void;
    onHideOthers: (id: string) => void;
    onHideOthersGroup: () => void;
    onToggleLock: (id: string) => void;
    onTogglePin: (id: string) => void;
}

function GroupRow({
    group,
    elementMap,
    groups,
    multiSelectedIds,
    selectedElementId,
    onUpdate,
    onDelete,
    onSetElementGroup,
    onSelectGroup,
    onSelectElement,
    onFocusElement,
    onToggleHide,
    onHideOthers,
    onHideOthersGroup,
    onToggleLock,
    onTogglePin,
}: GroupRowProps) {
    const [renaming, setRenaming] = useState(false);
    const [nameInput, setNameInput] = useState(group.name);

    const isGroupSelected = group.memberIds.length > 0 && group.memberIds.every((id) => multiSelectedIds.includes(id));

    const commitRename = () => {
        const trimmed = nameInput.trim();
        if (trimmed) onUpdate(group.id, { name: trimmed });
        else setNameInput(group.name);
        setRenaming(false);
    };

    return (
        <Box>
            <Group
                gap={4}
                wrap="nowrap"
                style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    backgroundColor: isGroupSelected ? 'var(--mantine-color-violet-light)' : 'transparent',
                }}
            >
                <ColorSwatch size={10} color={group.color} style={{ flexShrink: 0 }} />
                {renaming ? (
                    <TextInput
                        size="xs"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.currentTarget.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename();
                            if (e.key === 'Escape') {
                                setRenaming(false);
                                setNameInput(group.name);
                            }
                        }}
                        autoFocus
                        style={{ flex: 1 }}
                        styles={{ input: { height: 22, minHeight: 22, fontSize: 12 } }}
                    />
                ) : (
                    <Text
                        size="xs"
                        fw={600}
                        style={{ flex: 1, cursor: 'pointer' }}
                        onClick={() => {
                            if (!renaming) onSelectGroup();
                        }}
                        onDoubleClick={() => {
                            setRenaming(true);
                            setNameInput(group.name);
                        }}
                        title="Click to select the group — Double-click to rename"
                    >
                        {group.name}
                        <Text span size="xs" c="dimmed" ml={4}>
                            ({group.memberIds.length})
                        </Text>
                    </Text>
                )}
                <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => onUpdate(group.id, { collapsed: !group.collapsed })}>
                    {group.collapsed ? <IconChevronRight size={12} /> : <IconChevronDown size={12} />}
                </ActionIcon>
                <Tooltip label={group.pinned ? 'Unpin group' : 'Pin group (visible in search)'} withArrow openDelay={400}>
                    <ActionIcon
                        size="xs"
                        variant={group.pinned ? 'light' : 'subtle'}
                        color={group.pinned ? 'orange' : 'gray'}
                        style={{ opacity: group.pinned ? 1 : 0.4 }}
                        onClick={() => onUpdate(group.id, { pinned: !group.pinned })}
                    >
                        {group.pinned ? <IconPinFilled size={12} /> : <IconPin size={12} />}
                    </ActionIcon>
                </Tooltip>
                <Tooltip label={group.locked ? 'Unlock group' : 'Lock group'} withArrow openDelay={400}>
                    <ActionIcon size="xs" variant="subtle" color={group.locked ? 'orange' : 'gray'} onClick={() => onUpdate(group.id, { locked: !group.locked })}>
                        {group.locked ? <IconLock size={12} /> : <IconLockOpen size={12} />}
                    </ActionIcon>
                </Tooltip>
                <Tooltip label={group.hidden ? 'Show on map' : 'Hide on map (right-click: hide other groups)'} withArrow openDelay={400}>
                    <ActionIcon
                        size="xs"
                        variant="subtle"
                        color={group.hidden ? 'gray' : mainColor}
                        onClick={() => onUpdate(group.id, { hidden: !group.hidden })}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            onHideOthersGroup();
                        }}
                    >
                        {group.hidden ? <IconEyeOff size={12} /> : <IconEye size={12} />}
                    </ActionIcon>
                </Tooltip>
                <Tooltip label="Delete group" withArrow openDelay={400}>
                    <ActionIcon size="xs" variant="subtle" color="red" onClick={() => onDelete(group.id)}>
                        <IconTrash size={12} />
                    </ActionIcon>
                </Tooltip>
            </Group>
            <Collapse in={!group.collapsed}>
                <Stack gap={1} pl={8} pr={4}>
                    {group.memberIds.map((memberId) => {
                        const el = elementMap.get(memberId);
                        if (!el) return null;
                        return (
                            <ElementRow
                                key={memberId}
                                label={el.label}
                                color={el.color}
                                icon={el.icon}
                                indent
                                isSelected={selectedElementId === memberId}
                                isHidden={el.hidden}
                                isLocked={el.locked}
                                isPinned={el.pinned}
                                onSelect={() => onSelectElement(memberId, el.kind)}
                                onFocus={() => onFocusElement(el.focusX, el.focusY, memberId, el.kind)}
                                onToggleHide={() => onToggleHide(memberId)}
                                onHideOthers={() => onHideOthers(memberId)}
                                onToggleLock={() => onToggleLock(memberId)}
                                onTogglePin={() => onTogglePin(memberId)}
                                extraAction={
                                    <GroupPickerMenu elementId={memberId} currentGroupId={group.id} groups={groups} onAssign={(gid) => onSetElementGroup(memberId, gid)} />
                                }
                            />
                        );
                    })}
                    {group.memberIds.length === 0 && (
                        <Text size="xs" c="dimmed" px={8} py={2}>
                            Empty
                        </Text>
                    )}
                </Stack>
            </Collapse>
        </Box>
    );
}

export function ElementsPanel() {
    const {
        isElementsPanelOpen,
        images,
        zones,
        pois,
        notes,
        lines,
        selectedElement,
        elementTypes,
        groups,
        setSelectedElement,
        setCenterTarget,
        toggleElementLocked,
        toggleElementHidden,
        toggleElementPinned,
        setElementHidden,
        setAllElementsHidden,
        isolateElements,
        addGroup,
        updateGroup,
        deleteGroup,
        setElementGroup,
        multiSelectedIds,
        addToMultiSelect,
        clearMultiSelect,
        searchQuery,
        setSearchQuery,
    } = useMapStore(
        useShallow((s) => ({
            isElementsPanelOpen: s.isElementsPanelOpen,
            images: s.images,
            zones: s.zones,
            pois: s.pois,
            notes: s.notes,
            lines: s.lines,
            selectedElement: s.selectedElement,
            elementTypes: s.elementTypes,
            groups: s.groups,
            setSelectedElement: s.setSelectedElement,
            setCenterTarget: s.setCenterTarget,
            toggleElementLocked: s.toggleElementLocked,
            toggleElementHidden: s.toggleElementHidden,
            toggleElementPinned: s.toggleElementPinned,
            setElementHidden: s.setElementHidden,
            setAllElementsHidden: s.setAllElementsHidden,
            isolateElements: s.isolateElements,
            addGroup: s.addGroup,
            updateGroup: s.updateGroup,
            deleteGroup: s.deleteGroup,
            setElementGroup: s.setElementGroup,
            multiSelectedIds: s.multiSelectedIds,
            addToMultiSelect: s.addToMultiSelect,
            clearMultiSelect: s.clearMultiSelect,
            searchQuery: s.searchQuery,
            setSearchQuery: s.setSearchQuery,
        }))
    );

    const [newGroupInput, setNewGroupInput] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [activeTab, setActiveTab] = useState<'groups' | 'elements'>('elements');
    const [typeFilters, setTypeFilters] = useState<Set<'image' | 'zone' | 'poi' | 'note' | 'line'>>(new Set());
    const [stateFilters, setStateFilters] = useState<Set<'hidden' | 'visible' | 'locked' | 'pinned'>>(new Set());
    const [searchAffectsMap, setSearchAffectsMap] = useState(false);

    const toggleTypeFilter = (kind: 'image' | 'zone' | 'poi' | 'note' | 'line') =>
        setTypeFilters((prev) => {
            const next = new Set(prev);
            if (next.has(kind)) next.delete(kind);
            else next.add(kind);
            return next;
        });

    const toggleStateFilter = (state: 'hidden' | 'visible' | 'locked' | 'pinned') =>
        setStateFilters((prev) => {
            const next = new Set(prev);
            if (next.has(state)) next.delete(state);
            else next.add(state);
            return next;
        });
    const searchHiddenIds = useRef<Set<string>>(new Set());
    const panelRef = useRef<HTMLDivElement | null>(null);
    const headerRef = useRef<HTMLDivElement | null>(null);
    const listContainerRef = useRef<HTMLDivElement | null>(null);
    const [listHeight, setListHeight] = useState<number>(320);

    useEffect(() => {
        function update() {
            const panelH = panelRef.current?.clientHeight ?? window.innerHeight - 125;
            let containerTop = headerRef.current?.clientHeight ?? 80;
            if (panelRef.current && listContainerRef.current) {
                const panelRect = panelRef.current.getBoundingClientRect();
                const containerRect = listContainerRef.current.getBoundingClientRect();
                containerTop = Math.max(0, containerRect.top - panelRect.top);
            }
            const computed = Math.max(120, panelH - containerTop - 12);
            setListHeight(computed - 70);
        }
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    const searchMatch = useCallback(
        (label: string, pinned?: boolean): boolean => {
            const q = searchQuery.trim().toLowerCase();
            return !q || !!pinned || label.toLowerCase().includes(q);
        },
        [searchQuery]
    );

    const anyVisible = images.some((b) => !b.hidden) || zones.some((z) => !z.hidden) || pois.some((p) => !p.hidden) || notes.some((n) => !n.hidden) || lines.some((l) => !l.hidden);

    const hideOthers = (keepId: string) => {
        setAllElementsHidden(true);
        setElementHidden(keepId, false);
    };

    const elementGroupId = new Map<string, string>();
    for (const g of groups) {
        for (const mid of g.memberIds) elementGroupId.set(mid, g.id);
    }

    const elementDisplayMap = new Map<string, ElementDisplayInfo>();
    for (const bg of images) {
        elementDisplayMap.set(bg.id, {
            label: bg.name || `Image (${bg.width}×${bg.height})`,
            icon: <IconMap size={12} />,
            kind: 'image',
            focusX: bg.x + bg.width / 2,
            focusY: bg.y + bg.height / 2,
            hidden: !!bg.hidden,
            locked: !!bg.locked,
            pinned: !!bg.pinned,
        });
    }
    for (const zone of zones) {
        const c = centroid(zone.points);
        elementDisplayMap.set(zone.id, {
            label: zone.name || 'Unnamed zone',
            color: zone.color,
            icon: <IconPolygon size={12} />,
            kind: 'zone',
            focusX: c.x,
            focusY: c.y,
            hidden: !!zone.hidden,
            locked: !!zone.locked,
            pinned: !!zone.pinned,
        });
    }
    for (const poi of pois) {
        elementDisplayMap.set(poi.id, {
            label: poi.name || elementTypes.find((t) => t.id === poi.type)?.name || 'Unnamed POI',
            color: poi.color,
            icon: <IconMapPin size={12} />,
            kind: 'poi',
            focusX: poi.x,
            focusY: poi.y,
            hidden: !!poi.hidden,
            locked: !!poi.locked,
            pinned: !!poi.pinned,
        });
    }
    for (const note of notes) {
        elementDisplayMap.set(note.id, {
            label: note.content.slice(0, 40) || 'Empty note',
            color: note.bgColor && note.bgColor !== '#ffffff00' ? note.bgColor.slice(0, 7) : undefined,
            icon: <IconNote size={12} />,
            kind: 'note',
            focusX: note.x,
            focusY: note.y,
            hidden: !!note.hidden,
            locked: !!note.locked,
            pinned: !!note.pinned,
        });
    }
    for (const line of lines) {
        elementDisplayMap.set(line.id, {
            label: line.name || 'Unnamed line',
            color: line.color,
            icon: <IconLine size={12} />,
            kind: 'line',
            focusX: (line.x + line.bx) / 2,
            focusY: (line.y + line.by) / 2,
            hidden: !!line.hidden,
            locked: !!line.locked,
            pinned: !!line.pinned,
        });
    }

    function focusElement(x: number, y: number, id: string, kind: 'poi' | 'zone' | 'note' | 'image' | 'line') {
        setSelectedElement({ id, kind });
        setCenterTarget({ x, y });
    }

    const commitNewGroup = () => {
        const name = newGroupName.trim();
        if (name) {
            const palette = ['#845ef7', '#339af0', '#20c997', '#f06595', '#fd7e14', '#fcc419'];
            addGroup(name, palette[groups.length % palette.length]);
        }
        setNewGroupName('');
        setNewGroupInput(false);
    };

    const filteredImages = images.filter((bg) => searchMatch(bg.name || `Image (${bg.width}×${bg.height})`, bg.pinned));
    const filteredZones = zones.filter((zone) => searchMatch(zone.name || 'Unnamed zone', zone.pinned));
    const filteredPois = pois.filter((poi) => searchMatch(poi.name || 'Unnamed POI', poi.pinned));
    const filteredNotes = notes.filter((note) => searchMatch(note.content.slice(0, 40) || 'Empty note', note.pinned));
    const filteredLines = lines.filter((line) => searchMatch(line.name || 'Unnamed line', line.pinned));

    type UnifiedItem = {
        id: string;
        kind: 'image' | 'zone' | 'poi' | 'note' | 'line';
        label: string;
        color?: string;
        icon: React.ReactNode;
        focusX: number;
        focusY: number;
        hidden: boolean;
        locked: boolean;
        pinned: boolean;
    };

    const allFilteredItems: UnifiedItem[] = useMemo(() => {
        const allFilteredItems: UnifiedItem[] = [];
        for (const bg of filteredImages)
            allFilteredItems.push({
                id: bg.id,
                kind: 'image',
                label: bg.name || `Image (${bg.width}×${bg.height})`,
                icon: <IconMap size={12} />,
                focusX: bg.x + bg.width / 2,
                focusY: bg.y + bg.height / 2,
                hidden: !!bg.hidden,
                locked: !!bg.locked,
                pinned: !!bg.pinned,
            });
        for (const zone of filteredZones) {
            const c = centroid(zone.points);
            allFilteredItems.push({
                id: zone.id,
                kind: 'zone',
                label: zone.name || 'Unnamed zone',
                color: zone.color,
                icon: <IconPolygon size={12} />,
                focusX: c.x,
                focusY: c.y,
                hidden: !!zone.hidden,
                locked: !!zone.locked,
                pinned: !!zone.pinned,
            });
        }
        for (const poi of filteredPois)
            allFilteredItems.push({
                id: poi.id,
                kind: 'poi',
                label: poi.name || elementTypes.find((t) => t.id === poi.type)?.name || 'Unnamed POI',
                color: poi.color,
                icon: <IconMapPin size={12} />,
                focusX: poi.x,
                focusY: poi.y,
                hidden: !!poi.hidden,
                locked: !!poi.locked,
                pinned: !!poi.pinned,
            });
        for (const note of filteredNotes)
            allFilteredItems.push({
                id: note.id,
                kind: 'note',
                label: note.content.slice(0, 40) || 'Empty note',
                color: note.bgColor && note.bgColor !== '#ffffff00' ? note.bgColor.slice(0, 7) : undefined,
                icon: <IconNote size={12} />,
                focusX: note.x,
                focusY: note.y,
                hidden: !!note.hidden,
                locked: !!note.locked,
                pinned: !!note.pinned,
            });
        for (const line of filteredLines)
            allFilteredItems.push({
                id: line.id,
                kind: 'line',
                label: line.name || 'Unnamed line',
                color: line.color,
                icon: <IconLine size={12} />,
                focusX: (line.x + line.bx) / 2,
                focusY: (line.y + line.by) / 2,
                hidden: !!line.hidden,
                locked: !!line.locked,
                pinned: !!line.pinned,
            });
        return allFilteredItems;
    }, [filteredImages, filteredZones, filteredPois, elementTypes, filteredNotes, filteredLines]);

    const unifiedItems = allFilteredItems.filter((it) => {
        if (typeFilters.size > 0 && !typeFilters.has(it.kind)) return false;

        if (stateFilters.has('hidden') && !it.hidden) return false;
        if (stateFilters.has('visible') && it.hidden) return false;
        if (stateFilters.has('locked') && !it.locked) return false;
        if (stateFilters.has('pinned') && !it.pinned) return false;
        return true;
    });

    useEffect(() => {
        if (!searchAffectsMap) return;
        const toHide: string[] = [];
        const toUnhide: string[] = [];

        const currentMap = new Map<string, { hidden: boolean; pinned?: boolean }>();
        for (const p of pois) currentMap.set(p.id, { hidden: !!p.hidden, pinned: !!p.pinned });
        for (const z of zones) currentMap.set(z.id, { hidden: !!z.hidden, pinned: !!z.pinned });
        for (const n of notes) currentMap.set(n.id, { hidden: !!n.hidden, pinned: !!n.pinned });
        for (const b of images) currentMap.set(b.id, { hidden: !!b.hidden, pinned: !!b.pinned });
        for (const l of lines) currentMap.set(l.id, { hidden: !!l.hidden, pinned: !!l.pinned });

        for (const el of allFilteredItems) {
            const matches = searchMatch(el.label, el.pinned);
            const state = currentMap.get(el.id);
            if (!matches && state && !state.hidden && !state.pinned) {
                toHide.push(el.id);
            }
            if (matches && searchHiddenIds.current.has(el.id)) {
                toUnhide.push(el.id);
            }
        }

        for (const id of toHide) {
            searchHiddenIds.current.add(id);
            setElementHidden(id, true);
        }
        for (const id of toUnhide) {
            searchHiddenIds.current.delete(id);
            setElementHidden(id, false);
        }
    }, [searchQuery, searchAffectsMap, pois, zones, notes, images, lines, allFilteredItems, searchMatch, setElementHidden]);

    if (!isElementsPanelOpen) return null;

    return (
        <Box
            ref={panelRef}
            style={{
                position: 'absolute',
                pointerEvents: 'auto',
                top: 0,
                left: 0,
                bottom: 0,
                width: 280,
                backgroundColor: 'var(--mantine-color-body)',
                borderRight: '1px solid var(--mantine-color-default-border)',
                borderRadius: '0px',
                zIndex: 0,
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box
                ref={headerRef}
                px="sm"
                py="xs"
                style={{
                    borderBottom: '1px solid var(--mantine-color-default-border)',
                }}
            >
                <Text size="sm" fw={700} mb={6}>
                    Map elements
                </Text>
                <Group gap={4} mb={6}>
                    <Tooltip label={anyVisible ? 'Hide all' : 'Show all'} withArrow openDelay={300}>
                        <ActionIcon size="xs" variant={anyVisible ? 'light' : 'subtle'} color={anyVisible ? mainColor : 'gray'} onClick={() => setAllElementsHidden(anyVisible)}>
                            {anyVisible ? <IconEye size={12} /> : <IconEyeOff size={12} />}
                        </ActionIcon>
                    </Tooltip>
                    <TextInput
                        size="xs"
                        placeholder="Search…"
                        style={{ flex: 1 }}
                        leftSection={<IconSearch size={12} />}
                        rightSection={
                            <Group gap={4}>
                                {searchQuery ? (
                                    <ActionIcon size="xs" variant="subtle" onClick={() => setSearchQuery('')}>
                                        <IconX size={10} />
                                    </ActionIcon>
                                ) : null}
                                <Tooltip label={searchAffectsMap ? 'Search applied to map' : 'Do not apply search to map'} withArrow>
                                    <ActionIcon
                                        size="xs"
                                        variant={searchAffectsMap ? 'light' : 'subtle'}
                                        color={searchAffectsMap ? mainColor : 'gray'}
                                        onClick={() => {
                                            setSearchAffectsMap((v) => {
                                                const next = !v;

                                                if (!next) {
                                                    for (const id of searchHiddenIds.current) {
                                                        setElementHidden(id, false);
                                                    }
                                                    searchHiddenIds.current.clear();
                                                }
                                                return next;
                                            });
                                        }}
                                    >
                                        <IconMapPin size={10} />
                                    </ActionIcon>
                                </Tooltip>
                            </Group>
                        }
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.currentTarget.value)}
                    />
                </Group>
            </Box>

            <Box style={{ flex: 1, overflow: 'hidden' }}>
                <Tabs
                    value={activeTab}
                    onChange={(v) => setActiveTab((v as 'groups' | 'elements') ?? 'elements')}
                    styles={{
                        list: { paddingInline: 8, paddingTop: 4 },
                        panel: { padding: 0 },
                    }}
                >
                    <Tabs.List grow>
                        <Tabs.Tab value="elements">Elements</Tabs.Tab>
                        <Tabs.Tab value="groups">
                            Groups
                            {groups.length > 0 && (
                                <Text span size="xs" c="dimmed" ml={4}>
                                    ({groups.length})
                                </Text>
                            )}
                        </Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="groups">
                        <Stack gap={2} p={4}>
                            {groups
                                .filter((g) => searchMatch(g.name, g.pinned))
                                .map((group) => (
                                    <GroupRow
                                        key={group.id}
                                        group={group}
                                        elementMap={elementDisplayMap}
                                        groups={groups}
                                        multiSelectedIds={multiSelectedIds}
                                        selectedElementId={selectedElement?.id ?? null}
                                        onUpdate={updateGroup}
                                        onDelete={deleteGroup}
                                        onSetElementGroup={setElementGroup}
                                        onSelectGroup={() => {
                                            clearMultiSelect();
                                            setSelectedElement(null);
                                            addToMultiSelect(group.memberIds);
                                        }}
                                        onSelectElement={(id, kind) => setSelectedElement({ id, kind })}
                                        onFocusElement={focusElement}
                                        onToggleHide={toggleElementHidden}
                                        onHideOthers={hideOthers}
                                        onHideOthersGroup={() => isolateElements(group.memberIds)}
                                        onToggleLock={toggleElementLocked}
                                        onTogglePin={toggleElementPinned}
                                    />
                                ))}
                            {groups.length === 0 && !newGroupInput && (
                                <Text size="xs" c="dimmed" px={8} py={2}>
                                    No groups
                                </Text>
                            )}
                            {newGroupInput ? (
                                <Box px={8} py={4}>
                                    <TextInput
                                        size="xs"
                                        placeholder="Group name…"
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.currentTarget.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') commitNewGroup();
                                            if (e.key === 'Escape') {
                                                setNewGroupInput(false);
                                                setNewGroupName('');
                                            }
                                        }}
                                        autoFocus
                                        rightSection={
                                            <ActionIcon size="xs" variant="subtle" onClick={commitNewGroup}>
                                                <IconFolderPlus size={12} />
                                            </ActionIcon>
                                        }
                                    />
                                </Box>
                            ) : (
                                <Button
                                    size="xs"
                                    variant="subtle"
                                    color="violet"
                                    leftSection={<IconFolderPlus size={12} />}
                                    onClick={() => setNewGroupInput(true)}
                                    style={{ alignSelf: 'flex-start', marginLeft: 4 }}
                                >
                                    New group
                                </Button>
                            )}
                        </Stack>
                    </Tabs.Panel>

                    <Tabs.Panel value="elements">
                        <Stack gap={6} p={8} style={{ height: '100%' }}>
                            <Group justify="space-between" gap={'xs'} wrap="nowrap">
                                <Group gap={4} wrap="wrap">
                                    <Tooltip label={`Images (${images.length})`}>
                                        <ActionIcon
                                            size="sm"
                                            variant={typeFilters.has('image') ? 'light' : 'subtle'}
                                            color={typeFilters.has('image') ? 'violet' : 'gray'}
                                            onClick={() => toggleTypeFilter('image')}
                                        >
                                            <IconMap />
                                        </ActionIcon>
                                    </Tooltip>
                                    <Tooltip label={`Zones (${zones.length})`}>
                                        <ActionIcon
                                            size="sm"
                                            variant={typeFilters.has('zone') ? 'light' : 'subtle'}
                                            color={typeFilters.has('zone') ? 'violet' : 'gray'}
                                            onClick={() => toggleTypeFilter('zone')}
                                        >
                                            <IconPolygon />
                                        </ActionIcon>
                                    </Tooltip>
                                    <Tooltip label={`POIs (${pois.length})`}>
                                        <ActionIcon
                                            size="sm"
                                            variant={typeFilters.has('poi') ? 'light' : 'subtle'}
                                            color={typeFilters.has('poi') ? 'violet' : 'gray'}
                                            onClick={() => toggleTypeFilter('poi')}
                                        >
                                            <IconMapPin />
                                        </ActionIcon>
                                    </Tooltip>
                                    <Tooltip label={`Notes (${notes.length})`}>
                                        <ActionIcon
                                            size="sm"
                                            variant={typeFilters.has('note') ? 'light' : 'subtle'}
                                            color={typeFilters.has('note') ? 'violet' : 'gray'}
                                            onClick={() => toggleTypeFilter('note')}
                                        >
                                            <IconNote />
                                        </ActionIcon>
                                    </Tooltip>
                                    <Tooltip label={`Traits (${lines.length})`}>
                                        <ActionIcon
                                            size="sm"
                                            variant={typeFilters.has('line') ? 'light' : 'subtle'}
                                            color={typeFilters.has('line') ? 'violet' : 'gray'}
                                            onClick={() => toggleTypeFilter('line')}
                                        >
                                            <IconLine />
                                        </ActionIcon>
                                    </Tooltip>

                                    <Divider orientation="vertical" />

                                    <Tooltip label={`Visible only`}>
                                        <ActionIcon
                                            size="sm"
                                            variant={stateFilters.has('visible') ? 'light' : 'subtle'}
                                            color={stateFilters.has('visible') ? mainColor : 'gray'}
                                            onClick={() => toggleStateFilter('visible')}
                                        >
                                            <IconEye />
                                        </ActionIcon>
                                    </Tooltip>
                                    <Tooltip label="Hidden only">
                                        <ActionIcon
                                            size="sm"
                                            variant={stateFilters.has('hidden') ? 'light' : 'subtle'}
                                            color={stateFilters.has('hidden') ? 'red' : 'gray'}
                                            onClick={() => toggleStateFilter('hidden')}
                                        >
                                            <IconEyeOff />
                                        </ActionIcon>
                                    </Tooltip>
                                    <Tooltip label="Locked only">
                                        <ActionIcon
                                            size="sm"
                                            variant={stateFilters.has('locked') ? 'light' : 'subtle'}
                                            color={stateFilters.has('locked') ? 'orange' : 'gray'}
                                            onClick={() => toggleStateFilter('locked')}
                                        >
                                            <IconLock />
                                        </ActionIcon>
                                    </Tooltip>
                                    <Tooltip label="Pinned only">
                                        <ActionIcon
                                            size="sm"
                                            variant={stateFilters.has('pinned') ? 'light' : 'subtle'}
                                            color={stateFilters.has('pinned') ? 'orange' : 'gray'}
                                            onClick={() => toggleStateFilter('pinned')}
                                        >
                                            <IconPin />
                                        </ActionIcon>
                                    </Tooltip>
                                </Group>
                                <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                                    {unifiedItems.length}
                                </Text>
                            </Group>

                            <Divider />

                            <Box ref={listContainerRef} style={{ flex: 1, minHeight: 0 }}>
                                <VirtualList
                                    items={unifiedItems}
                                    itemHeight={34}
                                    height={listHeight}
                                    renderItem={(it: UnifiedItem) => {
                                        const elKind = it.kind as 'image' | 'zone' | 'poi' | 'note' | 'line';
                                        const extraAction =
                                            groups.length > 0 ? (
                                                <GroupPickerMenu
                                                    elementId={it.id}
                                                    currentGroupId={elementGroupId.get(it.id)}
                                                    groups={groups}
                                                    onAssign={(gid) => setElementGroup(it.id, gid)}
                                                />
                                            ) : null;

                                        return (
                                            <ElementRow
                                                key={it.id}
                                                label={it.label}
                                                color={it.color}
                                                icon={it.icon}
                                                isSelected={selectedElement?.id === it.id}
                                                isHidden={!!it.hidden}
                                                isLocked={!!it.locked}
                                                isPinned={!!it.pinned}
                                                onSelect={() => setSelectedElement({ id: it.id, kind: elKind })}
                                                onFocus={() => focusElement(it.focusX, it.focusY, it.id, elKind)}
                                                onToggleHide={() => toggleElementHidden(it.id)}
                                                onHideOthers={() => hideOthers(it.id)}
                                                onToggleLock={() => toggleElementLocked(it.id)}
                                                onTogglePin={() => toggleElementPinned(it.id)}
                                                extraAction={extraAction}
                                            />
                                        );
                                    }}
                                />
                            </Box>
                        </Stack>
                    </Tabs.Panel>
                </Tabs>
            </Box>
        </Box>
    );
}
