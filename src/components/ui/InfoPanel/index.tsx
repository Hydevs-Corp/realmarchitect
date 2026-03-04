import React from 'react';
import { Flex, Text } from '@mantine/core';
import { useShallow } from 'zustand/react/shallow';
import { useMapStore } from '../../../store/useMapStore';
import { PANEL_CONTAINER_STYLE } from './types';
import { InfoPanelHeader } from './InfoPanelHeader';
import { DrawingPanel } from './DrawingPanel';
import { ImageBrushPanel } from './ImageBrushPanel';
import { PoiForm } from './PoiForm';
import { ZoneForm } from './ZoneForm';
import { NoteForm } from './NoteForm';
import { BackgroundForm } from './BackgroundForm';
import { LineForm } from './LineForm';
import { PoiView } from './PoiView';
import { ZoneView } from './ZoneView';
import { NoteView } from './NoteView';
import { BackgroundView } from './BackgroundView';
import { LineView } from './LineView';

export const InfoPanel: React.FC = () => {
    const {
        selectedElement,
        pois,
        zones,
        notes,
        backgrounds,
        lines,
        editMode,
        setSelectedElement,
        toggleElementHidden,
        toggleElementLocked,
        toggleElementPinned,
        setCenterTarget,
        activeZoneFilterId,
        setActiveZoneFilter,
        copySelected,
        duplicateSelected,
    } = useMapStore(
        useShallow((state) => ({
            selectedElement: state.selectedElement,
            pois: state.pois,
            zones: state.zones,
            notes: state.notes,
            backgrounds: state.backgrounds,
            lines: state.lines,
            editMode: state.editMode,
            setSelectedElement: state.setSelectedElement,
            toggleElementHidden: state.toggleElementHidden,
            toggleElementLocked: state.toggleElementLocked,
            toggleElementPinned: state.toggleElementPinned,
            setCenterTarget: state.setCenterTarget,
            activeZoneFilterId: state.activeZoneFilterId,
            setActiveZoneFilter: state.setActiveZoneFilter,
            copySelected: state.copySelected,
            duplicateSelected: state.duplicateSelected,
        }))
    );

    if (!selectedElement) return null;

    const { id, kind } = selectedElement;

    if (kind === 'drawing') return <DrawingPanel />;
    if (kind === 'image-brush') return <ImageBrushPanel />;

    let name = '';
    let color: string | undefined;

    if (kind === 'poi') {
        const poi = pois.find((p) => p.id === id);
        if (!poi) return null;
        name = poi.name;
        color = poi.color;
    } else if (kind === 'zone') {
        const zone = zones.find((z) => z.id === id);
        if (!zone) return null;
        name = zone.name;
        color = zone.color;
    } else if (kind === 'note') {
        const note = notes.find((n) => n.id === id);
        if (!note) return null;
    } else if (kind === 'background') {
        const bg = backgrounds.find((b) => b.id === id);
        if (!bg) return null;
        name = bg.name ?? '';
    } else if (kind === 'line') {
        const line = lines.find((l) => l.id === id);
        if (!line) return null;
        name = line.name ?? '';
        color = line.color;
    }

    const kindLabel = kind === 'poi' ? 'POI' : kind === 'zone' ? 'Zone' : kind === 'note' ? 'Note' : kind === 'line' ? 'Line' : 'Image';

    const _currentElement =
        kind === 'poi'
            ? pois.find((p) => p.id === id)
            : kind === 'zone'
              ? zones.find((z) => z.id === id)
              : kind === 'note'
                ? notes.find((n) => n.id === id)
                : kind === 'line'
                  ? lines.find((l) => l.id === id)
                  : backgrounds.find((b) => b.id === id);

    const isHidden = !!_currentElement?.hidden;
    const isLocked = !!_currentElement?.locked;
    const isPinned = !!_currentElement?.pinned;

    const handleFocus = () => {
        if (kind === 'poi') {
            const poi = pois.find((p) => p.id === id);
            if (poi) setCenterTarget({ x: poi.x, y: poi.y });
        } else if (kind === 'zone') {
            const zone = zones.find((z) => z.id === id);
            if (zone) {
                let sx = 0,
                    sy = 0;
                const n = zone.points.length / 2;
                for (let i = 0; i < zone.points.length; i += 2) {
                    sx += zone.points[i];
                    sy += zone.points[i + 1];
                }
                setCenterTarget({ x: sx / n, y: sy / n });
            }
        } else if (kind === 'note') {
            const note = notes.find((n) => n.id === id);
            if (note) setCenterTarget({ x: note.x, y: note.y });
        } else if (kind === 'background') {
            const bg = backgrounds.find((b) => b.id === id);
            if (bg) setCenterTarget({ x: bg.x + bg.width / 2, y: bg.y + bg.height / 2 });
        } else if (kind === 'line') {
            const line = lines.find((l) => l.id === id);
            if (line) setCenterTarget({ x: (line.x + line.bx) / 2, y: (line.y + line.by) / 2 });
        }
    };

    return (
        <div style={PANEL_CONTAINER_STYLE}>
            <InfoPanelHeader
                kind={kind}
                name={name}
                color={color}
                kindLabel={kindLabel}
                isHidden={isHidden}
                isLocked={isLocked}
                isPinned={isPinned}
                activeZoneFilterId={activeZoneFilterId}
                onFocus={handleFocus}
                onToggleHidden={() => toggleElementHidden(id)}
                onToggleLocked={() => toggleElementLocked(id)}
                onTogglePinned={() => toggleElementPinned(id)}
                onViewElements={() => setActiveZoneFilter(id)}
                onClearFilter={() => setActiveZoneFilter(null)}
                onCopy={copySelected}
                onDuplicate={() => {
                    void duplicateSelected();
                }}
                onClose={() => setSelectedElement(null)}
            />

            <Flex direction="column" gap="xs" p="md" style={{ overflowY: 'auto', flex: 1 }}>
                {editMode ? (
                    <>
                        {kind === 'poi' && <PoiForm id={id} onDeleted={() => setSelectedElement(null)} />}
                        {kind === 'zone' && <ZoneForm id={id} onDeleted={() => setSelectedElement(null)} />}
                        {kind === 'note' && <NoteForm id={id} onDeleted={() => setSelectedElement(null)} />}
                        {kind === 'background' && <BackgroundForm id={id} onDeleted={() => setSelectedElement(null)} />}
                        {kind === 'line' && <LineForm id={id} onDeleted={() => setSelectedElement(null)} />}
                    </>
                ) : (
                    <>
                        {kind === 'poi' && <PoiView id={id} />}
                        {kind === 'zone' && <ZoneView id={id} />}
                        {kind === 'note' && <NoteView id={id} />}
                        {kind === 'background' && <BackgroundView id={id} />}
                        {kind === 'line' && <LineView id={id} />}
                    </>
                )}
            </Flex>

            {!editMode && (
                <Text
                    size="xs"
                    c="dimmed"
                    px="md"
                    py="xs"
                    style={{
                        borderTop: '1px solid var(--mantine-color-default-border)',
                        flexShrink: 0,
                    }}
                >
                    Enable edit mode to modify this element
                </Text>
            )}
        </div>
    );
};
