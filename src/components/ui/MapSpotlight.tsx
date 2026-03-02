import React, { useState, useMemo } from 'react';
import { Group, Text } from '@mantine/core';
import { Spotlight } from '@mantine/spotlight';
import { IconMapPin, IconLine, IconPolygon, IconNote, IconSearch, IconMap } from '@tabler/icons-react';
import { useShallow } from 'zustand/react/shallow';
import { useMapStore } from '../../store/useMapStore';

function centroid(points: number[]): { x: number; y: number } {
    let sx = 0;
    let sy = 0;
    const n = points.length / 2;
    for (let i = 0; i < points.length; i += 2) {
        sx += points[i];
        sy += points[i + 1];
    }
    return { x: sx / n, y: sy / n };
}

export const MapSpotlight: React.FC = () => {
    const { pois, zones, notes, backgrounds, lines, elementTypes, setSelectedElement, setCenterTarget } = useMapStore(
        useShallow((state) => ({
            pois: state.pois,
            zones: state.zones,
            notes: state.notes,
            backgrounds: state.backgrounds,
            lines: state.lines,
            elementTypes: state.elementTypes,
            setSelectedElement: state.setSelectedElement,
            setCenterTarget: state.setCenterTarget,
        }))
    );

    const [query, setQuery] = useState('');
    const q = query.toLowerCase().trim();

    const typeNameMap = useMemo(() => {
        const m = new Map<string, string>();
        for (const t of elementTypes) m.set(t.id, t.name);
        return m;
    }, [elementTypes]);

    const matchedPois = useMemo(() => {
        if (!q) return pois;
        return pois.filter((p) => {
            const typeName = typeNameMap.get(p.type) ?? '';
            const txt = `${p.name} ${p.description ?? ''} ${typeName}`.toLowerCase();
            return txt.includes(q);
        });
    }, [q, pois, typeNameMap]);

    const matchedZones = useMemo(() => {
        if (!q) return zones;
        return zones.filter((z) => {
            const txt = `${z.name} ${z.description ?? ''}`.toLowerCase();
            return txt.includes(q);
        });
    }, [q, zones]);

    const matchedNotes = useMemo(() => {
        if (!q) return notes;
        return notes.filter((n) => {
            const txt = `${n.content}`.toLowerCase();
            return txt.includes(q);
        });
    }, [q, notes]);

    const matchedBackgrounds = useMemo(() => {
        if (!q) return backgrounds;
        return backgrounds.filter((bg) => {
            const txt = `${bg.name ?? ''}`.toLowerCase();
            return txt.includes(q);
        });
    }, [q, backgrounds]);

    const matchedLines = useMemo(() => {
        if (!q) return lines;
        return lines.filter((l) => {
            const txt = `${l.name ?? ''}`.toLowerCase();
            return txt.includes(q);
        });
    }, [q, lines]);

    const hasResults = matchedPois.length > 0 || matchedZones.length > 0 || matchedNotes.length > 0 || matchedBackgrounds.length > 0 || matchedLines.length > 0;

    const MAX_RESULTS = 10;
    let _remaining = MAX_RESULTS;
    const showPois = matchedPois.slice(0, _remaining);
    _remaining -= showPois.length;
    const showZones = matchedZones.slice(0, _remaining);
    _remaining -= showZones.length;
    const showNotes = matchedNotes.slice(0, _remaining);
    _remaining -= showNotes.length;
    const showBackgrounds = matchedBackgrounds.slice(0, _remaining);
    _remaining -= showBackgrounds.length;
    const showLines = matchedLines.slice(0, _remaining);
    _remaining -= showLines.length;

    const totalMatched = matchedPois.length + matchedZones.length + matchedNotes.length + matchedBackgrounds.length + matchedLines.length;
    const extraCount = Math.max(0, totalMatched - MAX_RESULTS);

    return (
        <Spotlight.Root query={query} onQueryChange={setQuery} shortcut={['mod + K', 'mod + P']} clearQueryOnClose>
            <Spotlight.Search placeholder="Search for a POI, zone, note…" leftSection={<IconSearch size={18} stroke={1.5} />} />
            <Spotlight.ActionsList>
                {!hasResults && <Spotlight.Empty>No results</Spotlight.Empty>}

                {showPois.length > 0 && (
                    <Spotlight.ActionsGroup label="POIs">
                        {showPois.map((poi) => {
                            const typeName = elementTypes.find((t) => t.id === poi.type)?.name;
                            return (
                                <Spotlight.Action
                                    key={poi.id}
                                    onClick={() => {
                                        setSelectedElement({ id: poi.id, kind: 'poi' });
                                        setCenterTarget({ x: poi.x, y: poi.y });
                                    }}
                                >
                                    <Group wrap="nowrap" gap="sm">
                                        <div
                                            style={{
                                                width: 12,
                                                height: 12,
                                                borderRadius: '50%',
                                                background: poi.color,
                                                flexShrink: 0,
                                                border: '1px solid rgba(0,0,0,0.2)',
                                            }}
                                        />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <Text size="sm" truncate>
                                                {poi.name || '—'}
                                            </Text>
                                            {typeName && (
                                                <Text size="xs" c="dimmed" truncate>
                                                    {typeName}
                                                    {poi.description ? ` · ${poi.description}` : ''}
                                                </Text>
                                            )}
                                        </div>
                                        <IconMapPin size={14} style={{ flexShrink: 0, opacity: 0.4 }} />
                                    </Group>
                                </Spotlight.Action>
                            );
                        })}
                    </Spotlight.ActionsGroup>
                )}

                {showZones.length > 0 && (
                    <Spotlight.ActionsGroup label="Zones">
                        {showZones.map((zone) => {
                            const c = centroid(zone.points);
                            return (
                                <Spotlight.Action
                                    key={zone.id}
                                    onClick={() => {
                                        setSelectedElement({ id: zone.id, kind: 'zone' });
                                        setCenterTarget(c);
                                    }}
                                >
                                    <Group wrap="nowrap" gap="sm">
                                        <div
                                            style={{
                                                width: 12,
                                                height: 12,
                                                borderRadius: 3,
                                                background: zone.color,
                                                flexShrink: 0,
                                                border: '1px solid rgba(0,0,0,0.15)',
                                            }}
                                        />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <Text size="sm" truncate>
                                                {zone.name || '—'}
                                            </Text>
                                            {zone.description && (
                                                <Text size="xs" c="dimmed" truncate>
                                                    {zone.description}
                                                </Text>
                                            )}
                                        </div>
                                        <IconPolygon size={14} style={{ flexShrink: 0, opacity: 0.4 }} />
                                    </Group>
                                </Spotlight.Action>
                            );
                        })}
                    </Spotlight.ActionsGroup>
                )}

                {showNotes.length > 0 && (
                    <Spotlight.ActionsGroup label="Notes">
                        {showNotes.map((note) => (
                            <Spotlight.Action
                                key={note.id}
                                onClick={() => {
                                    setSelectedElement({ id: note.id, kind: 'note' });
                                    setCenterTarget({ x: note.x, y: note.y });
                                }}
                            >
                                <Group wrap="nowrap" gap="sm">
                                    <div
                                        style={{
                                            width: 12,
                                            height: 12,
                                            borderRadius: 2,
                                            background: note.bgColor ?? '#fff9c4',
                                            flexShrink: 0,
                                            border: '1px solid rgba(0,0,0,0.15)',
                                        }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <Text size="sm" truncate>
                                            {note.content.slice(0, 60)}
                                            {note.content.length > 60 ? '…' : ''}
                                        </Text>
                                    </div>
                                    <IconNote size={14} style={{ flexShrink: 0, opacity: 0.4 }} />
                                </Group>
                            </Spotlight.Action>
                        ))}
                    </Spotlight.ActionsGroup>
                )}

                {showBackgrounds.length > 0 && (
                    <Spotlight.ActionsGroup label="Images">
                        {showBackgrounds.map((bg) => (
                            <Spotlight.Action
                                key={bg.id}
                                onClick={() => {
                                    setSelectedElement({ id: bg.id, kind: 'background' });
                                    setCenterTarget({
                                        x: bg.x + bg.width / 2,
                                        y: bg.y + bg.height / 2,
                                    });
                                }}
                            >
                                <Group wrap="nowrap" gap="sm">
                                    <IconMap size={12} style={{ flexShrink: 0, opacity: 0.5 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <Text size="sm" truncate>
                                            {bg.name || `Image (${bg.width}×${bg.height})`}
                                        </Text>
                                        <Text size="xs" c="dimmed" truncate>
                                            {bg.width}×{bg.height} px
                                        </Text>
                                    </div>
                                    <IconMap size={14} style={{ flexShrink: 0, opacity: 0.4 }} />
                                </Group>
                            </Spotlight.Action>
                        ))}
                    </Spotlight.ActionsGroup>
                )}

                {showLines.length > 0 && (
                    <Spotlight.ActionsGroup label="Lines">
                        {showLines.map((line) => (
                            <Spotlight.Action
                                key={line.id}
                                onClick={() => {
                                    setSelectedElement({ id: line.id, kind: 'line' });
                                    setCenterTarget({
                                        x: (line.x + line.bx) / 2,
                                        y: (line.y + line.by) / 2,
                                    });
                                }}
                            >
                                <Group wrap="nowrap" gap="sm">
                                    <div
                                        style={{
                                            width: 24,
                                            height: 4,
                                            borderRadius: 2,
                                            background: line.color,
                                            flexShrink: 0,
                                            border: '1px solid rgba(0,0,0,0.15)',
                                        }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <Text size="sm" truncate>
                                            {line.name || 'Unnamed line'}
                                        </Text>
                                        <Text size="xs" c="dimmed" truncate>
                                            ({line.x.toFixed(0)}, {line.y.toFixed(0)}) → ({line.bx.toFixed(0)}, {line.by.toFixed(0)})
                                        </Text>
                                    </div>
                                    <IconLine size={14} style={{ flexShrink: 0, opacity: 0.4 }} />
                                </Group>
                            </Spotlight.Action>
                        ))}
                    </Spotlight.ActionsGroup>
                )}

                {extraCount > 0 && (
                    <Spotlight.ActionsGroup label="">
                        <Spotlight.Action key="more" onClick={() => {}}>
                            <Group wrap="nowrap" gap="sm">
                                <div style={{ width: 12 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <Text size="sm" c="dimmed" truncate>
                                        … and {extraCount} more results
                                    </Text>
                                </div>
                            </Group>
                        </Spotlight.Action>
                    </Spotlight.ActionsGroup>
                )}
            </Spotlight.ActionsList>
        </Spotlight.Root>
    );
};
