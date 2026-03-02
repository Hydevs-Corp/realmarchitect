import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Circle, Rect, Group, Label, Tag, Text, Transformer } from 'react-konva';
import useImage from 'use-image';
import type { KonvaEventObject } from 'konva/lib/Node';
import Konva from 'konva';

const SNAP_SCREEN_RADIUS = 25;

function distanceToSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function closestPointOnSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number } {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return { x: a.x, y: a.y };
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
    return { x: a.x + t * dx, y: a.y + t * dy };
}

import { useShallow } from 'zustand/react/shallow';
import { useMapStore } from '../../store/useMapStore';
import type { Background, POI, Zone, TextNote, MapLine, LineAttachKind, DrawStroke } from '../../types/map';
import {
    updatePOI as apiUpdatePOI,
    updateZone as apiUpdateZone,
    updateNote as apiUpdateNote,
    updateBackground as apiUpdateBackground,
    updateLine as apiUpdateLine,
} from '../../lib/api';
import { setStageRef } from '../../lib/stageRef';

const MIDDLE_BUTTON = 1;
const RIGHT_BUTTON = 2;

const r2 = (n: number) => Math.round(n * 100) / 100;

const pbId = () => Array.from({ length: 15 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');

function quadToCubic(ax: number, ay: number, cx: number, cy: number, bx: number, by: number): number[] {
    return [ax, ay, ax + (2 / 3) * (cx - ax), ay + (2 / 3) * (cy - ay), bx + (2 / 3) * (cx - bx), by + (2 / 3) * (cy - by), bx, by];
}

function resolveAttachment(
    attachedId: string | undefined,
    attachedKind: string | undefined,
    fallbackX: number,
    fallbackY: number,
    pois: POI[],
    zones: Zone[],
    notes: TextNote[],
    backgrounds: Background[]
): { x: number; y: number } {
    if (!attachedId || !attachedKind) return { x: fallbackX, y: fallbackY };

    if (attachedKind === 'poi') {
        const e = pois.find((p) => p.id === attachedId);
        if (e) return { x: e.x + fallbackX, y: e.y + fallbackY };
    } else if (attachedKind === 'zone') {
        const e = zones.find((z) => z.id === attachedId);
        if (e && e.points.length >= 4) {
            const pts = e.points;
            const n = pts.length / 2;
            let bestX = fallbackX,
                bestY = fallbackY,
                bestD = Infinity;
            for (let i = 0; i < n; i++) {
                const j = (i + 1) % n;
                const cp = closestPointOnSegment({ x: fallbackX, y: fallbackY }, { x: pts[i * 2], y: pts[i * 2 + 1] }, { x: pts[j * 2], y: pts[j * 2 + 1] });
                const d = Math.hypot(cp.x - fallbackX, cp.y - fallbackY);
                if (d < bestD) {
                    bestD = d;
                    bestX = cp.x;
                    bestY = cp.y;
                }
            }
            return { x: bestX, y: bestY };
        }
        return { x: fallbackX, y: fallbackY };
    } else if (attachedKind === 'note') {
        const e = notes.find((n) => n.id === attachedId);
        if (e) return { x: e.x + fallbackX, y: e.y + fallbackY };
    } else if (attachedKind === 'background') {
        const e = backgrounds.find((b) => b.id === attachedId);
        if (e) return { x: e.x + fallbackX, y: e.y + fallbackY };
    }
    return { x: fallbackX, y: fallbackY };
}

type ViewportRect = {
    left: number;
    top: number;
    right: number;
    bottom: number;
};

function poiInViewport(x: number, y: number, radius: number, vp: ViewportRect): boolean {
    return x + radius >= vp.left && x - radius <= vp.right && y + radius >= vp.top && y - radius <= vp.bottom;
}

function rectInViewport(x: number, y: number, w: number, h: number, vp: ViewportRect): boolean {
    const pad = Math.hypot(w, h) / 2;
    return x - pad <= vp.right && x + w + pad >= vp.left && y - pad <= vp.bottom && y + h + pad >= vp.top;
}

function zoneInViewport(points: number[], vp: ViewportRect): boolean {
    let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
    for (let i = 0; i < points.length; i += 2) {
        if (points[i] < minX) minX = points[i];
        if (points[i] > maxX) maxX = points[i];
        if (points[i + 1] < minY) minY = points[i + 1];
        if (points[i + 1] > maxY) maxY = points[i + 1];
    }
    return maxX >= vp.left && minX <= vp.right && maxY >= vp.top && minY <= vp.bottom;
}

function lineInViewport(ax: number, ay: number, bx: number, by: number, vp: ViewportRect): boolean {
    return Math.max(ax, bx) >= vp.left && Math.min(ax, bx) <= vp.right && Math.max(ay, by) >= vp.top && Math.min(ay, by) <= vp.bottom;
}

const BackgroundItem: React.FC<{
    background: Background;
    editMode: boolean;
    selected: boolean;
    isMultiSelected: boolean;
    onSelect: (shiftKey?: boolean) => void;
    onDragStart?: () => void;
    onDragMove?: (totalDx: number, totalDy: number) => void;
    onDragEnd: (pos: { x: number; y: number }) => void;
    onResize: (updates: { x: number; y: number; width: number; height: number; rotation?: number }) => void;
}> = ({ background, editMode, selected, isMultiSelected, onSelect, onDragStart, onDragMove, onDragEnd, onResize }) => {
    const dragStartRef = useRef<{ x: number; y: number } | null>(null);
    const [image] = useImage(background.imageUrl);
    const imageRef = useRef<Konva.Image>(null);
    const trRef = useRef<Konva.Transformer>(null);

    const rasterized = useMemo<HTMLCanvasElement | null>(() => {
        if (!image) return null;
        const offscreen = document.createElement('canvas');
        offscreen.width = background.width;
        offscreen.height = background.height;
        const ctx = offscreen.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(image, 0, 0, background.width, background.height);
        return offscreen;
    }, [image, background.width, background.height]);

    useEffect(() => {
        if (selected && editMode && trRef.current && imageRef.current) {
            trRef.current.nodes([imageRef.current]);
            trRef.current.getLayer()?.batchDraw();
        }
    }, [selected, editMode]);

    return (
        <>
            <KonvaImage
                ref={imageRef}
                image={rasterized ?? image}
                x={background.x}
                y={background.y}
                rotation={background.rotation ?? 0}
                width={background.width}
                height={background.height}
                perfectDrawEnabled={false}
                draggable={editMode}
                exportUrl={background.imageUrl}
                onClick={(e) => {
                    if (e.evt.button === 0) {
                        onSelect(e.evt.shiftKey);
                        e.cancelBubble = true;
                    }
                }}
                onDragStart={(e) => {
                    dragStartRef.current = { x: e.target.x(), y: e.target.y() };
                    onDragStart?.();
                }}
                onDragMove={(e) => {
                    if (dragStartRef.current && onDragMove) {
                        onDragMove(e.target.x() - dragStartRef.current.x, e.target.y() - dragStartRef.current.y);
                    }
                }}
                onDragEnd={(e) => {
                    dragStartRef.current = null;
                    onDragEnd({ x: r2(e.target.x()), y: r2(e.target.y()) });
                }}
                onTransformEnd={(e) => {
                    const node = e.target;
                    const newWidth = r2(node.width() * node.scaleX());
                    const newHeight = r2(node.height() * node.scaleY());
                    const newRotation = r2(node.rotation() || 0);
                    node.scaleX(1);
                    node.scaleY(1);
                    onResize({
                        x: r2(node.x()),
                        y: r2(node.y()),
                        width: newWidth,
                        height: newHeight,
                        rotation: newRotation,
                    });
                }}
            />
            {selected && editMode && (
                <Transformer
                    ref={trRef}
                    rotateEnabled={true}
                    keepRatio={background.lockAspectRatio ?? false}
                    boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 10 || newBox.height < 10) return oldBox;
                        return newBox;
                    }}
                />
            )}
            {selected && !editMode && (
                <Rect
                    x={background.x}
                    y={background.y}
                    width={background.width}
                    height={background.height}
                    rotation={background.rotation ?? 0}
                    stroke="#60cdff"
                    strokeWidth={2}
                    dash={[8, 4]}
                    fill="rgba(96,205,255,0.05)"
                    listening={false}
                />
            )}
            {isMultiSelected && !selected && (
                <Rect
                    x={background.x}
                    y={background.y}
                    width={background.width}
                    height={background.height}
                    rotation={background.rotation ?? 0}
                    stroke="#ff9800"
                    strokeWidth={2}
                    dash={[8, 4]}
                    fill="rgba(255,152,0,0.05)"
                    listening={false}
                />
            )}
        </>
    );
};

const PoiItem = React.memo<{
    poi: POI;
    editMode: boolean;
    selected: boolean;
    isMultiSelected: boolean;
    onDragStart?: () => void;
    onDragMove?: (totalDx: number, totalDy: number) => void;
    onDragEnd: (pos: { x: number; y: number }) => void;
    onSelect: (shiftKey?: boolean) => void;
}>(
    ({ poi, editMode, selected, isMultiSelected, onDragStart, onDragMove, onDragEnd, onSelect }) => {
        const dragStartRef = useRef<{ x: number; y: number } | null>(null);
        const radius = poi.size ?? 10;

        const initials = poi.name
            .split(' ')
            .map((w) => w.charAt(0))
            .filter((c) => c.match(/[A-Z0-9]/))
            .join('')
            .slice(0, 2);

        const fontSize = initials.length < 2 ? radius * 1.6 : radius * 1;

        return (
            <Group
                x={poi.x}
                y={poi.y}
                draggable={editMode}
                onClick={(e) => {
                    if (e.evt.button === 0) {
                        onSelect(e.evt.shiftKey);
                        e.cancelBubble = true;
                    }
                }}
                onDragStart={(e) => {
                    dragStartRef.current = { x: e.target.x(), y: e.target.y() };
                    onDragStart?.();
                }}
                onDragMove={(e) => {
                    if (dragStartRef.current && onDragMove) {
                        onDragMove(e.target.x() - dragStartRef.current.x, e.target.y() - dragStartRef.current.y);
                    }
                }}
                onDragEnd={(e) => {
                    dragStartRef.current = null;
                    onDragEnd({ x: r2(e.target.x()), y: r2(e.target.y()) });
                }}
            >
                <Circle
                    radius={radius}
                    fill={poi.color}
                    stroke={isMultiSelected ? '#ff9800' : selected ? '#60cdff' : editMode ? '#fff' : 'black'}
                    strokeWidth={isMultiSelected || selected ? 1 : editMode ? 1 : 0.1}
                    shadowEnabled={isMultiSelected || selected}
                    shadowColor={isMultiSelected ? '#ff9800' : '#60cdff'}
                    shadowBlur={10}
                    shadowOpacity={0.8}
                    shadowForStrokeEnabled={false}
                    perfectDrawEnabled={false}
                />
                {initials !== '' && (
                    <Text
                        text={initials}
                        fontSize={fontSize}
                        fontStyle="bold"
                        fill="#fff"
                        width={radius * 2}
                        height={radius * 2}
                        align="center"
                        verticalAlign="middle"
                        offsetX={radius}
                        offsetY={radius}
                        listening={false}
                        perfectDrawEnabled={false}
                    />
                )}
            </Group>
        );
    },

    (prev, next) => prev.poi === next.poi && prev.editMode === next.editMode && prev.selected === next.selected && prev.isMultiSelected === next.isMultiSelected
);

function createPatternCanvas(pattern: string, color: string): HTMLCanvasElement {
    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;

    if (pattern === 'hatch') {
        ctx.beginPath();
        ctx.moveTo(-2, size + 2);
        ctx.lineTo(size + 2, -2);
        ctx.stroke();
    } else if (pattern === 'cross') {
        ctx.beginPath();
        ctx.moveTo(-2, size + 2);
        ctx.lineTo(size + 2, -2);
        ctx.moveTo(-2, -2);
        ctx.lineTo(size + 2, size + 2);
        ctx.stroke();
    } else if (pattern === 'dots') {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    return canvas;
}

const ZoneItem: React.FC<{
    zone: Zone;
    editMode: boolean;
    selected: boolean;
    isMultiSelected: boolean;
    onPointMove: (index: number, x: number, y: number) => void;
    onPointDragEnd: (index: number, x: number, y: number) => void;
    onDeletePoint: (index: number) => void;
    onAddPoint: (afterIndex: number, x: number, y: number) => void;
    onSelect: (shiftKey?: boolean) => void;
    onMoveStart?: () => void;
    onMove: (dx: number, dy: number, totalDelta: { dx: number; dy: number }) => void;
    onMoveEnd: (newPoints: number[], totalDelta: { dx: number; dy: number }) => void;
}> = ({ zone, editMode, selected, isMultiSelected, onPointMove, onPointDragEnd, onDeletePoint, onAddPoint, onSelect, onMoveStart, onMove, onMoveEnd }) => {
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < zone.points.length; i += 2) {
        points.push({ x: zone.points[i], y: zone.points[i + 1] });
    }

    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;

    const moveHandleDragRef = useRef<{ x: number; y: number } | null>(null);

    const moveHandleTotalDelta = useRef({ dx: 0, dy: 0 });

    const patternCanvas = useMemo<HTMLCanvasElement | null>(() => {
        if (!zone.pattern) return null;
        return createPatternCanvas(zone.pattern, zone.color);
    }, [zone.pattern, zone.color]);

    const handleLineDblClick = (e: KonvaEventObject<MouseEvent>) => {
        if (!editMode) return;
        e.cancelBubble = true;
        const stage = e.target.getStage();
        if (!stage) return;
        const pos = stage.getRelativePointerPosition();
        if (!pos) return;

        let minDist = Infinity;
        let insertAfter = 0;
        for (let i = 0; i < points.length; i++) {
            const a = points[i];
            const b = points[(i + 1) % points.length];
            const dist = distanceToSegment(pos, a, b);
            if (dist < minDist) {
                minDist = dist;
                insertAfter = i;
            }
        }
        onAddPoint(insertAfter, r2(pos.x), r2(pos.y));
    };

    return (
        <React.Fragment>
            <Line points={zone.points} fill={zone.color} closed listening={false} opacity={selected ? 0.3 : 0.2} perfectDrawEnabled={false} />
            <Line
                points={zone.points}
                fill={patternCanvas ? undefined : zone.color}
                fillPatternImage={(patternCanvas ?? undefined) as HTMLImageElement | undefined}
                fillPatternRepeat="repeat"
                closed
                stroke={isMultiSelected ? '#ff9800' : selected ? '#60cdff' : editMode ? '#fff' : zone.color}
                strokeWidth={isMultiSelected || selected ? 3 : editMode ? 2 : 1}
                opacity={isMultiSelected || selected ? 0.8 : 0.7}
                hitStrokeWidth={editMode ? 12 : 8}
                onClick={(e) => {
                    if (e.evt.button === 0) {
                        onSelect(e.evt.shiftKey);
                        e.cancelBubble = true;
                    }
                }}
                onDblClick={handleLineDblClick}
            />
            {editMode &&
                points.map((point, index) => (
                    <Circle
                        key={index}
                        x={point.x}
                        y={point.y}
                        radius={6}
                        fill="white"
                        stroke="black"
                        strokeWidth={1}
                        draggable
                        onDragMove={(e) => {
                            onPointMove(index, e.target.x(), e.target.y());
                        }}
                        onDragEnd={(e) => {
                            onPointDragEnd(index, r2(e.target.x()), r2(e.target.y()));
                        }}
                        onContextMenu={(e) => {
                            e.evt.preventDefault();
                            e.cancelBubble = true;
                            if (points.length > 3) {
                                onDeletePoint(index);
                            }
                        }}
                        onPointerEnter={() => {
                            document.body.style.cursor = 'pointer';
                        }}
                        onPointerLeave={() => {
                            document.body.style.cursor = 'default';
                        }}
                    />
                ))}
            {selected && (
                <Circle
                    x={cx}
                    y={cy}
                    radius={10}
                    fill="rgba(96,205,255,0.25)"
                    stroke="#60cdff"
                    strokeWidth={1.5}
                    draggable
                    onDragStart={(e) => {
                        moveHandleDragRef.current = { x: e.target.x(), y: e.target.y() };
                        moveHandleTotalDelta.current = { dx: 0, dy: 0 };
                        onMoveStart?.();
                        document.body.style.cursor = 'grabbing';
                    }}
                    onDragMove={(e) => {
                        if (!moveHandleDragRef.current) return;
                        const dx = e.target.x() - moveHandleDragRef.current.x;
                        const dy = e.target.y() - moveHandleDragRef.current.y;

                        moveHandleDragRef.current = { x: e.target.x(), y: e.target.y() };
                        moveHandleTotalDelta.current.dx += dx;
                        moveHandleTotalDelta.current.dy += dy;
                        onMove(dx, dy, { ...moveHandleTotalDelta.current });
                    }}
                    onDragEnd={() => {
                        moveHandleDragRef.current = null;
                        onMoveEnd(zone.points, { ...moveHandleTotalDelta.current });
                        moveHandleTotalDelta.current = { dx: 0, dy: 0 };
                        document.body.style.cursor = 'default';
                    }}
                    onPointerEnter={() => {
                        document.body.style.cursor = 'grab';
                    }}
                    onPointerLeave={() => {
                        document.body.style.cursor = 'default';
                    }}
                    onClick={(e) => {
                        e.cancelBubble = true;
                    }}
                />
            )}
        </React.Fragment>
    );
};

const NoteItem: React.FC<{
    note: TextNote;
    editMode: boolean;
    selected: boolean;
    isMultiSelected: boolean;
    onDragStart?: () => void;
    onDragMove?: (totalDx: number, totalDy: number) => void;
    onDragEnd: (pos: { x: number; y: number }) => void;
    onSelect: (shiftKey?: boolean) => void;
    onMeasure?: (id: string, w: number, h: number) => void;
}> = ({ note, editMode, selected, isMultiSelected, onDragStart, onDragMove, onDragEnd, onSelect, onMeasure }) => {
    const labelRef = useRef<Konva.Label>(null);
    const dragStartRef = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        if (!onMeasure || !labelRef.current) return;
        const size = labelRef.current.getClientRect({
            relativeTo: labelRef.current.getParent() ?? undefined,
            skipShadow: true,
            skipStroke: true,
        });
        onMeasure(note.id, size.width, size.height);
    });
    return (
        <Label
            ref={labelRef}
            x={note.x}
            y={note.y}
            draggable={editMode}
            onClick={(e) => {
                if (e.evt.button === 0) {
                    onSelect(e.evt.shiftKey);
                    e.cancelBubble = true;
                }
            }}
            onDragStart={(e) => {
                dragStartRef.current = { x: e.target.x(), y: e.target.y() };
                onDragStart?.();
            }}
            onDragMove={(e) => {
                if (dragStartRef.current && onDragMove) {
                    onDragMove(e.target.x() - dragStartRef.current.x, e.target.y() - dragStartRef.current.y);
                }
            }}
            onDragEnd={(e) => {
                dragStartRef.current = null;
                onDragEnd({ x: r2(e.target.x()), y: r2(e.target.y()) });
            }}
        >
            <Tag
                fill={note.bgColor ?? '#fff9c4ff'}
                stroke={isMultiSelected ? '#ff9800' : selected ? '#60cdff' : 'transparent'}
                strokeWidth={isMultiSelected || selected ? 2 : 0}
                lineJoin="round"
                shadowColor={isMultiSelected ? '#ff9800' : selected ? '#60cdff' : 'black'}
                shadowBlur={isMultiSelected || selected ? 10 : 5}
                shadowOffset={{ x: 2, y: 2 }}
                shadowOpacity={selected ? 0.8 : 0.3}
            />
            <Text
                text={note.content}
                fontFamily="Calibri"
                fontSize={note.fontSize ?? 14}
                key={note.width}
                padding={10}
                fill="black"
                width={note.width || undefined}
                wrap={note.width ? 'word' : 'none'}
            />
            {note.authorName && (
                <Text
                    text={`— ${note.authorName}`}
                    fontFamily="Calibri"
                    fontSize={(note.fontSize ?? 14) * 0.75}
                    padding={8}
                    fill="rgba(0,0,0,0.6)"
                    width={note.width || undefined}
                    wrap={note.width ? 'word' : 'none'}
                />
            )}
        </Label>
    );
};

const LineItem: React.FC<{
    line: MapLine;
    ax: number;
    ay: number;
    bx: number;
    by: number;
    editMode: boolean;
    selected: boolean;
    isMultiSelected: boolean;
    onSelect: (shiftKey?: boolean) => void;
    onControlDragEnd: (x: number, y: number) => void;
    onControlRightClick: () => void;
}> = ({ line, ax, ay, bx, by, editMode, selected, isMultiSelected, onSelect, onControlDragEnd, onControlRightClick }) => {
    const hasCurve = line.cx !== undefined && line.cy !== undefined;
    const cpx = hasCurve ? line.cx! : (ax + bx) / 2;
    const cpy = hasCurve ? line.cy! : (ay + by) / 2;
    const strokeColor = isMultiSelected ? '#ff9800' : selected ? '#60cdff' : line.color;
    const sw = line.strokeWidth ?? 2;
    const dashArr = line.dashPattern === 'dashed' ? [12, 6] : line.dashPattern === 'dotted' ? [3, 7] : [];
    const linePoints = hasCurve ? quadToCubic(ax, ay, cpx, cpy, bx, by) : [ax, ay, bx, by];

    return (
        <React.Fragment>
            <Line
                points={linePoints}
                bezier={hasCurve}
                stroke={strokeColor}
                strokeWidth={selected ? sw + 1 : sw}
                dash={dashArr}
                hitStrokeWidth={14}
                lineCap="round"
                lineJoin="round"
                shadowColor={isMultiSelected ? '#ff9800' : selected ? '#60cdff' : undefined}
                shadowBlur={isMultiSelected || selected ? 8 : 0}
                shadowOpacity={0.6}
                onClick={(e) => {
                    if (e.evt.button === 0) {
                        onSelect(e.evt.shiftKey);
                        e.cancelBubble = true;
                    }
                }}
            />
            {editMode && selected && (
                <>
                    <Line points={[ax, ay, cpx, cpy, bx, by]} stroke="rgba(255,165,0,0.45)" strokeWidth={1} dash={[4, 3]} listening={false} />
                    <Circle
                        x={cpx}
                        y={cpy}
                        radius={5}
                        fill={hasCurve ? '#ff9800' : 'rgba(255,152,0,0.3)'}
                        stroke="#ff9800"
                        strokeWidth={1}
                        draggable
                        onDragEnd={(e) => onControlDragEnd(r2(e.target.x()), r2(e.target.y()))}
                        onContextMenu={(e) => {
                            e.evt.preventDefault();
                            e.cancelBubble = true;
                            onControlRightClick();
                        }}
                        onPointerEnter={() => {
                            document.body.style.cursor = 'move';
                        }}
                        onPointerLeave={() => {
                            document.body.style.cursor = 'default';
                        }}
                    />
                </>
            )}
        </React.Fragment>
    );
};

export const KonvaEngine: React.FC = () => {
    const stageRef = useRef<Konva.Stage>(null);

    useEffect(() => {
        if (stageRef.current) setStageRef(stageRef.current);
        return () => setStageRef(null);
    }, []);

    const {
        backgrounds,
        pois,
        zones,
        notes,
        lines,
        creationMode,
        editMode,
        selectedElement,
        draftZonePoints,
        setDraftZonePoints,
        draftLinePointA,
        setDraftLinePointA,
        setTempCreationData,
        openCreationModal,
        updatePoi,
        updateNote,
        updateZone,
        updateBackground,
        updateLine,
        setSelectedElement,
        pendingCenter,
        clearCenterTarget,
        drawingLayer,
        addDrawStroke,
        searchQuery,
        groups,
        multiSelectedIds,
        toggleMultiSelect,
        clearMultiSelect,
        addGroup,
        activeZoneFilterId,
        getElementsInZone,
    } = useMapStore(
        useShallow((state) => ({
            backgrounds: state.backgrounds,
            pois: state.pois,
            zones: state.zones,
            notes: state.notes,
            lines: state.lines,
            creationMode: state.creationMode,
            editMode: state.editMode,
            selectedElement: state.selectedElement,
            draftZonePoints: state.draftZonePoints,
            setDraftZonePoints: state.setDraftZonePoints,
            draftLinePointA: state.draftLinePointA,
            setDraftLinePointA: state.setDraftLinePointA,
            setTempCreationData: state.setTempCreationData,
            openCreationModal: state.openCreationModal,
            updatePoi: state.updatePoi,
            updateNote: state.updateNote,
            updateZone: state.updateZone,
            updateBackground: state.updateBackground,
            updateLine: state.updateLine,
            setSelectedElement: state.setSelectedElement,
            pendingCenter: state.pendingCenter,
            clearCenterTarget: state.clearCenterTarget,
            drawingLayer: state.drawingLayer,
            addDrawStroke: state.addDrawStroke,
            searchQuery: state.searchQuery,
            groups: state.groups,
            multiSelectedIds: state.multiSelectedIds,
            toggleMultiSelect: state.toggleMultiSelect,
            clearMultiSelect: state.clearMultiSelect,
            addGroup: state.addGroup,
            activeZoneFilterId: state.activeZoneFilterId,
            getElementsInZone: state.getElementsInZone,
        }))
    );

    const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
    const [stageScale, setStageScale] = useState(1);
    const [mouseMapPos, setMouseMapPos] = useState<{
        x: number;
        y: number;
    } | null>(null);
    const [snapHighlight, setSnapHighlight] = useState<{
        x: number;
        y: number;
    } | null>(null);

    const [noteSizes, setNoteSizes] = useState<Record<string, { w: number; h: number }>>({});
    const handleNoteMeasure = (id: string, w: number, h: number) => {
        setNoteSizes((prev) => {
            if (prev[id]?.w === w && prev[id]?.h === h) return prev;
            return { ...prev, [id]: { w, h } };
        });
    };

    const allowedIds = useMemo<Set<string> | null>(() => {
        if (!activeZoneFilterId) return null;
        const { pois: ipois, notes: inotes, backgrounds: ibgs, lines: ilines } = getElementsInZone(activeZoneFilterId);
        const set = new Set<string>();
        ipois.forEach((p) => set.add(p.id));
        inotes.forEach((n) => set.add(n.id));
        ibgs.forEach((b) => set.add(b.id));
        ilines.forEach((l) => set.add(l.id));
        set.add(activeZoneFilterId);
        return set;
    }, [activeZoneFilterId, getElementsInZone]);

    const viewport = useMemo((): ViewportRect => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const pad = (Math.max(w, h) * 0.25) / stageScale;
        return {
            left: -stagePos.x / stageScale - pad,
            top: -stagePos.y / stageScale - pad,
            right: (w - stagePos.x) / stageScale + pad,
            bottom: (h - stagePos.y) / stageScale + pad,
        };
    }, [stagePos, stageScale]);

    const searchVisible = (label: string, pinned?: boolean): boolean => {
        if (!searchQuery) return true;
        if (pinned) return true;
        return label.toLowerCase().includes(searchQuery.toLowerCase());
    };

    const hiddenGroupElIds = useMemo(() => {
        const set = new Set<string>();
        for (const g of groups) {
            if (g.hidden) g.memberIds.forEach((id) => set.add(id));
        }
        return set;
    }, [groups]);

    const lockedGroupElIds = useMemo(() => {
        const set = new Set<string>();
        for (const g of groups) {
            if (g.locked) g.memberIds.forEach((id) => set.add(id));
        }
        return set;
    }, [groups]);

    const multiDragSnapshot = useRef<Record<string, { kind: string; data: number[] }>>({});

    const captureMultiDragSnapshot = React.useCallback(() => {
        const snap: Record<string, { kind: string; data: number[] }> = {};
        for (const id of multiSelectedIds) {
            const poi = pois.find((p) => p.id === id);
            if (poi) {
                snap[id] = { kind: 'poi', data: [poi.x, poi.y] };
                continue;
            }
            const note = notes.find((n) => n.id === id);
            if (note) {
                snap[id] = { kind: 'note', data: [note.x, note.y] };
                continue;
            }
            const bg = backgrounds.find((b) => b.id === id);
            if (bg) {
                snap[id] = { kind: 'bg', data: [bg.x, bg.y] };
                continue;
            }
            const zone = zones.find((z) => z.id === id);
            if (zone) {
                snap[id] = { kind: 'zone', data: [...zone.points] };
                continue;
            }
            const line = lines.find((l) => l.id === id);
            if (line) {
                snap[id] = { kind: 'line', data: [line.x, line.y, line.bx, line.by] };
            }
        }
        multiDragSnapshot.current = snap;
    }, [multiSelectedIds, pois, notes, backgrounds, zones, lines]);

    const applyMultiDragPreview = React.useCallback(
        (sourceId: string, totalDx: number, totalDy: number) => {
            if (multiSelectedIds.length <= 1) return;
            for (const id of multiSelectedIds) {
                if (id === sourceId) continue;
                const snap = multiDragSnapshot.current[id];
                if (!snap) continue;
                if (snap.kind === 'poi') {
                    updatePoi(id, {
                        x: r2(snap.data[0] + totalDx),
                        y: r2(snap.data[1] + totalDy),
                    });
                } else if (snap.kind === 'note') {
                    updateNote(id, {
                        x: r2(snap.data[0] + totalDx),
                        y: r2(snap.data[1] + totalDy),
                    });
                } else if (snap.kind === 'bg') {
                    updateBackground(id, {
                        x: r2(snap.data[0] + totalDx),
                        y: r2(snap.data[1] + totalDy),
                    });
                } else if (snap.kind === 'zone') {
                    const newPoints = snap.data.map((v, i) => (i % 2 === 0 ? r2(v + totalDx) : r2(v + totalDy)));
                    updateZone(id, { points: newPoints });
                } else if (snap.kind === 'line') {
                    updateLine(id, {
                        x: r2(snap.data[0] + totalDx),
                        y: r2(snap.data[1] + totalDy),
                        bx: r2(snap.data[2] + totalDx),
                        by: r2(snap.data[3] + totalDy),
                    });
                }
            }
        },
        [multiSelectedIds, updatePoi, updateNote, updateBackground, updateZone, updateLine]
    );

    const commitMultiDragPeers = React.useCallback(
        (sourceId: string) => {
            if (multiSelectedIds.length <= 1) return;
            for (const id of multiSelectedIds) {
                if (id === sourceId) continue;
                const snap = multiDragSnapshot.current[id];
                if (!snap) continue;
                const poi = pois.find((p) => p.id === id);
                if (poi) {
                    apiUpdatePOI(id, { x: poi.x, y: poi.y }).catch(console.error);
                    continue;
                }
                const note = notes.find((n) => n.id === id);
                if (note) {
                    apiUpdateNote(id, { x: note.x, y: note.y }).catch(console.error);
                    continue;
                }
                const bg = backgrounds.find((b) => b.id === id);
                if (bg) {
                    apiUpdateBackground(id, { x: bg.x, y: bg.y }).catch(console.error);
                    continue;
                }
                const zone = zones.find((z) => z.id === id);
                if (zone) {
                    apiUpdateZone(id, { points: zone.points }).catch(console.error);
                    continue;
                }
                const line = lines.find((l) => l.id === id);
                if (line) {
                    apiUpdateLine(id, {
                        x: line.x,
                        y: line.y,
                        bx: line.bx,
                        by: line.by,
                    }).catch(console.error);
                }
            }
        },
        [multiSelectedIds, pois, notes, backgrounds, zones, lines]
    );

    const moveElementById = React.useCallback(
        (id: string, dx: number, dy: number) => {
            const poi = pois.find((p) => p.id === id);
            if (poi) {
                const np = { x: r2(poi.x + dx), y: r2(poi.y + dy) };
                updatePoi(id, np);
                apiUpdatePOI(id, np).catch(console.error);
                return;
            }
            const note = notes.find((n) => n.id === id);
            if (note) {
                const np = { x: r2(note.x + dx), y: r2(note.y + dy) };
                updateNote(id, np);
                apiUpdateNote(id, np).catch(console.error);
                return;
            }
            const bg = backgrounds.find((b) => b.id === id);
            if (bg) {
                const np = { x: r2(bg.x + dx), y: r2(bg.y + dy) };
                updateBackground(id, np);
                apiUpdateBackground(id, np).catch(console.error);
                return;
            }
            const zone = zones.find((z) => z.id === id);
            if (zone) {
                const newPoints = zone.points.map((v, i) => (i % 2 === 0 ? r2(v + dx) : r2(v + dy)));
                updateZone(id, { points: newPoints });
                apiUpdateZone(id, { points: newPoints }).catch(console.error);
                return;
            }
            const line = lines.find((l) => l.id === id);
            if (line) {
                const upd = {
                    x: r2(line.x + dx),
                    y: r2(line.y + dy),
                    bx: r2(line.bx + dx),
                    by: r2(line.by + dy),
                };
                updateLine(id, upd);
                apiUpdateLine(id, upd).catch(console.error);
            }
        },
        [pois, notes, backgrounds, zones, lines, updatePoi, updateNote, updateBackground, updateZone, updateLine]
    );

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                clearMultiSelect();
            }
            if (!editMode) return;
            if (e.ctrlKey && e.key === 'g') {
                e.preventDefault();
                if (multiSelectedIds.length > 0) {
                    const palette = ['#845ef7', '#339af0', '#20c997', '#f06595', '#fd7e14', '#fcc419'];
                    const groupName = `Groupe ${groups.length + 1}`;
                    const groupColor = palette[groups.length % palette.length];
                    addGroup(groupName, groupColor, [...multiSelectedIds]);
                    clearMultiSelect();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [multiSelectedIds, groups, addGroup, clearMultiSelect, editMode]);

    useEffect(() => {
        const handleArrowKey = (e: KeyboardEvent) => {
            if (!editMode) return;
            const isArrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);
            if (!isArrow) return;

            const active = document.activeElement;
            if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || (active as HTMLElement)?.isContentEditable) {
                return;
            }
            e.preventDefault();
            const step = e.shiftKey ? 10 : 1;
            const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
            const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
            const ids = multiSelectedIds.length > 0 ? multiSelectedIds : selectedElement ? [selectedElement.id] : [];
            if (ids.length === 0) return;
            for (const id of ids) {
                moveElementById(id, dx, dy);
            }
        };
        window.addEventListener('keydown', handleArrowKey);
        return () => window.removeEventListener('keydown', handleArrowKey);
    }, [multiSelectedIds, selectedElement, moveElementById, editMode]);

    const creationModeRef = useRef(creationMode);
    useEffect(() => {
        creationModeRef.current = creationMode;
    }, [creationMode]);

    const drawingLockedRef = useRef(drawingLayer.locked);
    useEffect(() => {
        drawingLockedRef.current = drawingLayer.locked;
    }, [drawingLayer.locked]);

    const drawingHiddenRef = useRef(drawingLayer.hidden);
    useEffect(() => {
        drawingHiddenRef.current = drawingLayer.hidden;
    }, [drawingLayer.hidden]);

    const activeToolRef = useRef(drawingLayer.activeTool);
    useEffect(() => {
        activeToolRef.current = drawingLayer.activeTool;
    }, [drawingLayer.activeTool]);

    const activeColorRef = useRef(drawingLayer.activeColor);
    useEffect(() => {
        activeColorRef.current = drawingLayer.activeColor;
    }, [drawingLayer.activeColor]);

    const activeSizeRef = useRef(drawingLayer.activeSize);
    useEffect(() => {
        activeSizeRef.current = drawingLayer.activeSize;
    }, [drawingLayer.activeSize]);

    const addDrawStrokeRef = useRef<(s: DrawStroke) => void>(addDrawStroke);
    useEffect(() => {
        addDrawStrokeRef.current = addDrawStroke;
    }, [addDrawStroke]);

    const drawLayerRef = useRef<Konva.Layer>(null);

    useEffect(() => {
        const container = stageRef.current?.container();
        if (!container) return;

        let drawing = false;
        let drawOnMainLayer = false;
        let liveLayer: Konva.Layer | null = null;
        let liveLine: Konva.Line | null = null;
        let livePoints: number[] = [];

        const toWorld = (clientX: number, clientY: number) => {
            const stage = stageRef.current;
            if (!stage) return null;
            const tr = stage.getAbsoluteTransform().copy();
            tr.invert();
            return tr.point({ x: clientX, y: clientY });
        };

        const onMouseDown = (e: MouseEvent) => {
            if (e.button !== 0) return;
            if (creationModeRef.current !== 'draw') return;
            if (drawingLockedRef.current || drawingHiddenRef.current) return;

            const stage = stageRef.current;
            if (!stage) return;
            const world = toWorld(e.clientX, e.clientY);
            if (!world) return;

            drawing = true;
            livePoints = [world.x, world.y, world.x + 0.1, world.y + 0.1];

            const tool = activeToolRef.current;
            const isEraser = tool === 'eraser';

            if (isEraser && drawLayerRef.current) {
                drawOnMainLayer = true;
                liveLine = new Konva.Line({
                    points: livePoints,
                    stroke: 'rgba(0,0,0,1)',
                    strokeWidth: activeSizeRef.current,
                    lineCap: 'round',
                    lineJoin: 'round',
                    tension: 0.4,
                    globalCompositeOperation: 'destination-out',
                });
                drawLayerRef.current.add(liveLine);
                drawLayerRef.current.batchDraw();
            } else {
                drawOnMainLayer = false;
                liveLayer = new Konva.Layer();
                liveLine = new Konva.Line({
                    points: livePoints,
                    stroke: activeColorRef.current,
                    strokeWidth: activeSizeRef.current,
                    lineCap: 'round',
                    lineJoin: 'round',
                    tension: 0.4,
                    globalCompositeOperation: 'source-over',
                    opacity: tool === 'marker' ? 0.5 : 1,
                });
                liveLayer.add(liveLine);
                stage.add(liveLayer);
            }
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!drawing || !liveLine) return;
            if (creationModeRef.current !== 'draw') return;
            const world = toWorld(e.clientX, e.clientY);
            if (!world) return;
            livePoints = [...livePoints, world.x, world.y];
            liveLine.points(livePoints);
            if (drawOnMainLayer) {
                drawLayerRef.current?.batchDraw();
            } else {
                liveLayer?.batchDraw();
            }
        };

        const onMouseUp = (e: MouseEvent) => {
            if (e.button !== 0 || !drawing) return;
            drawing = false;

            if (drawOnMainLayer && liveLine) {
                liveLine.destroy();
                drawLayerRef.current?.batchDraw();
                drawOnMainLayer = false;
            } else if (liveLayer) {
                liveLayer.destroy();
                liveLayer = null;
            }

            if (livePoints.length >= 4) {
                const tool = activeToolRef.current;
                addDrawStrokeRef.current({
                    id: pbId(),
                    points: livePoints,
                    color: activeColorRef.current,
                    size: activeSizeRef.current,
                    tool,
                });
            }

            liveLine = null;
            livePoints = [];
        };

        container.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        return () => {
            container.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, []);

    function noteSnapDimensions(n: TextNote): { w: number; h: number } {
        if (noteSizes[n.id]) return noteSizes[n.id];

        const fontSize = n.fontSize ?? 14;
        const w = n.width ?? 0;
        if (!w) {
            const textW = Math.max(60, n.content.length * fontSize * 0.55 + 0);
            return { w: textW, h: fontSize * 1.2 + 0 };
        }
        const innerW = Math.max(1, w - 20);
        const approxCharW = fontSize * 0.55;
        const charsPerLine = Math.max(1, Math.floor(innerW / approxCharW));
        const numLines = Math.max(1, Math.ceil(n.content.length / charsPerLine));
        return { w, h: numLines * (fontSize * 1.2) + 0 };
    }

    type SnapResult = {
        x: number;
        y: number;
        id: string;
        kind: LineAttachKind;

        originX: number;
        originY: number;
    };

    function findSnapTarget(worldX: number, worldY: number): SnapResult | null {
        const threshold = SNAP_SCREEN_RADIUS / stageScale;
        const p = { x: worldX, y: worldY };
        let best: SnapResult | null = null;
        let bestDist = threshold;

        function tryPoint(cx: number, cy: number, id: string, kind: LineAttachKind, originX: number, originY: number) {
            const d = Math.hypot(cx - worldX, cy - worldY);
            if (d < bestDist) {
                bestDist = d;
                best = { x: cx, y: cy, id, kind, originX, originY };
            }
        }

        function tryEdge(a: { x: number; y: number }, b: { x: number; y: number }, id: string, kind: LineAttachKind, originX: number, originY: number) {
            const cp = closestPointOnSegment(p, a, b);
            tryPoint(cp.x, cp.y, id, kind, originX, originY);
        }

        pois.forEach((poi) => tryPoint(poi.x, poi.y, poi.id, 'poi', poi.x, poi.y));

        zones.forEach((z) => {
            const pts = z.points;
            const n = pts.length / 2;
            for (let i = 0; i < n; i++) {
                const j = (i + 1) % n;
                tryEdge({ x: pts[i * 2], y: pts[i * 2 + 1] }, { x: pts[j * 2], y: pts[j * 2 + 1] }, z.id, 'zone', 0, 0);
            }
        });

        notes.forEach((n) => {
            const { w, h } = noteSnapDimensions(n);
            const x0 = n.x,
                y0 = n.y;
            const x1 = n.x + w,
                y1 = n.y + h;
            tryEdge({ x: x0, y: y0 }, { x: x1, y: y0 }, n.id, 'note', n.x, n.y);
            tryEdge({ x: x1, y: y0 }, { x: x1, y: y1 }, n.id, 'note', n.x, n.y);
            tryEdge({ x: x1, y: y1 }, { x: x0, y: y1 }, n.id, 'note', n.x, n.y);
            tryEdge({ x: x0, y: y1 }, { x: x0, y: y0 }, n.id, 'note', n.x, n.y);
        });

        backgrounds.forEach((b) => {
            const x0 = b.x,
                y0 = b.y;
            const x1 = b.x + b.width,
                y1 = b.y + b.height;
            tryEdge({ x: x0, y: y0 }, { x: x1, y: y0 }, b.id, 'background', b.x, b.y);
            tryEdge({ x: x1, y: y0 }, { x: x1, y: y1 }, b.id, 'background', b.x, b.y);
            tryEdge({ x: x1, y: y1 }, { x: x0, y: y1 }, b.id, 'background', b.x, b.y);
            tryEdge({ x: x0, y: y1 }, { x: x0, y: y0 }, b.id, 'background', b.x, b.y);
        });

        return best;
    }

    useEffect(() => {
        if (!pendingCenter) return;
        const scale = stageScale;
        setStagePos({
            x: window.innerWidth / 2 - pendingCenter.x * scale,
            y: window.innerHeight / 2 - pendingCenter.y * scale,
        });
        clearCenterTarget();
    }, [pendingCenter]);

    useEffect(() => {
        const container = stageRef.current?.container();
        if (!container) return;
        if (creationMode === 'draw') {
            container.style.cursor = drawingLayer.activeTool === 'eraser' ? 'cell' : 'crosshair';
        } else {
            container.style.cursor = creationMode !== 'none' ? 'crosshair' : 'default';
        }
    }, [creationMode, drawingLayer.activeTool]);

    useEffect(() => {
        const container = stageRef.current?.container();
        if (!container) return;

        let panning = false;
        let startX = 0;
        let startY = 0;
        let startStageX = 0;
        let startStageY = 0;

        const onMouseDown = (e: MouseEvent) => {
            if (e.button === MIDDLE_BUTTON || e.button === RIGHT_BUTTON) {
                e.preventDefault();

                e.stopImmediatePropagation();
                panning = true;
                startX = e.clientX;
                startY = e.clientY;

                startStageX = stageRef.current?.x() ?? 0;
                startStageY = stageRef.current?.y() ?? 0;
            }
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!panning) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            setStagePos({ x: startStageX + dx, y: startStageY + dy });
        };

        const onMouseUp = (e: MouseEvent) => {
            if (e.button === MIDDLE_BUTTON || e.button === RIGHT_BUTTON) {
                panning = false;
            }
        };

        let lastTouchDist = 0;
        let lastTouchMidX = 0;
        let lastTouchMidY = 0;

        const getTouchDist = (t0: Touch, t1: Touch) => Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);

        const onTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 1) {
                e.preventDefault();
                panning = true;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                startStageX = stageRef.current?.x() ?? 0;
                startStageY = stageRef.current?.y() ?? 0;
            } else if (e.touches.length === 2) {
                e.preventDefault();
                panning = false;
                lastTouchDist = getTouchDist(e.touches[0], e.touches[1]);
                lastTouchMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                lastTouchMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 1 && panning) {
                e.preventDefault();
                const dx = e.touches[0].clientX - startX;
                const dy = e.touches[0].clientY - startY;
                setStagePos({ x: startStageX + dx, y: startStageY + dy });
            } else if (e.touches.length === 2) {
                e.preventDefault();
                const stage = stageRef.current;
                if (!stage) return;

                const newDist = getTouchDist(e.touches[0], e.touches[1]);
                const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

                if (lastTouchDist === 0) {
                    lastTouchDist = newDist;
                    lastTouchMidX = midX;
                    lastTouchMidY = midY;
                    return;
                }

                const oldScale = stage.scaleX();
                const scaleRatio = newDist / lastTouchDist;
                const newScale = Math.max(0.05, Math.min(20, oldScale * scaleRatio));

                // Zoom towards the midpoint between the two fingers
                const stageBox = stage.container().getBoundingClientRect();
                const pointerX = midX - stageBox.left;
                const pointerY = midY - stageBox.top;
                const mousePointTo = {
                    x: (pointerX - stage.x()) / oldScale,
                    y: (pointerY - stage.y()) / oldScale,
                };

                // Also pan by mid-point delta
                const panDx = midX - lastTouchMidX;
                const panDy = midY - lastTouchMidY;

                setStageScale(newScale);
                setStagePos({
                    x: pointerX - mousePointTo.x * newScale + panDx,
                    y: pointerY - mousePointTo.y * newScale + panDy,
                });

                lastTouchDist = newDist;
                lastTouchMidX = midX;
                lastTouchMidY = midY;
            }
        };

        const onTouchEnd = (e: TouchEvent) => {
            if (e.touches.length === 0) {
                panning = false;
                lastTouchDist = 0;
            } else if (e.touches.length === 1) {
                lastTouchDist = 0;
                panning = true;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                startStageX = stageRef.current?.x() ?? 0;
                startStageY = stageRef.current?.y() ?? 0;
            }
        };
        // ─────────────────────────────────────────────────────────────────────

        container.addEventListener('mousedown', onMouseDown, { capture: true });
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        container.addEventListener('touchstart', onTouchStart, { passive: false });
        container.addEventListener('touchmove', onTouchMove, { passive: false });
        container.addEventListener('touchend', onTouchEnd, { passive: false });

        return () => {
            container.removeEventListener('mousedown', onMouseDown, {
                capture: true,
            });
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            container.removeEventListener('touchstart', onTouchStart);
            container.removeEventListener('touchmove', onTouchMove);
            container.removeEventListener('touchend', onTouchEnd);
        };
    }, []);

    const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();

        const scaleBy = 1.1;
        const stage = e.target.getStage();
        if (!stage) return;

        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        };

        const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

        setStageScale(newScale);
        setStagePos({
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
        });
    };

    const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
        const stage = e.target.getStage();
        if (!stage) return;
        const pos = stage.getRelativePointerPosition();
        if (pos) setMouseMapPos(pos);
    };

    const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
        if (e.evt.button === 2 || e.evt.button === 1) return;
        if (creationMode === 'none' && e.target === e.target.getStage()) {
            setSelectedElement(null);
            clearMultiSelect();
        }
        if (creationMode === 'none') return;

        const stage = e.target.getStage();
        if (!stage) return;

        const transform = stage.getAbsoluteTransform().copy();
        transform.invert();
        const pos = stage.getPointerPosition();
        if (!pos) return;

        const relativePos = transform.point(pos);

        if (creationMode === 'poi' || creationMode === 'note' || creationMode === 'background') {
            setTempCreationData({ x: relativePos.x, y: relativePos.y });
            openCreationModal();
        } else if (creationMode === 'zone') {
            const newPoints = [...draftZonePoints, relativePos.x, relativePos.y];
            setDraftZonePoints(newPoints);
        } else if (creationMode === 'line') {
            if (!draftLinePointA) {
                setDraftLinePointA(relativePos);
            } else {
                setTempCreationData({
                    ax: r2(draftLinePointA.x),
                    ay: r2(draftLinePointA.y),
                    bx: r2(relativePos.x),
                    by: r2(relativePos.y),
                });
                setDraftLinePointA(null);
                openCreationModal();
            }
        }
    };

    const handleZoneFinish = () => {
        if (draftZonePoints.length >= 6) {
            setTempCreationData({ points: draftZonePoints });
            openCreationModal();
        }
    };

    return (
        <Stage
            width={window.innerWidth}
            height={window.innerHeight}
            onWheel={handleWheel}
            onContextMenu={(e) => e.evt.preventDefault()}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setMouseMapPos(null)}
            onClick={handleStageClick}
            scaleX={stageScale}
            scaleY={stageScale}
            x={stagePos.x}
            y={stagePos.y}
            ref={stageRef}
        >
            <Layer listening={creationMode === 'none'}>
                {backgrounds
                    .filter(
                        (bg) =>
                            !bg.hidden &&
                            !hiddenGroupElIds.has(bg.id) &&
                            searchVisible(bg.name ?? '', bg.pinned) &&
                            (selectedElement?.id === bg.id || multiSelectedIds.includes(bg.id) || rectInViewport(bg.x, bg.y, bg.width, bg.height, viewport))
                    )
                    .sort((a, b) => a.zIndex - b.zIndex)
                    .map((bg) => (
                        <BackgroundItem
                            key={bg.id}
                            background={bg}
                            editMode={editMode && !bg.locked && !lockedGroupElIds.has(bg.id)}
                            selected={selectedElement?.id === bg.id}
                            isMultiSelected={multiSelectedIds.includes(bg.id)}
                            onSelect={(shiftKey) => {
                                if (shiftKey) {
                                    toggleMultiSelect(bg.id);
                                } else {
                                    clearMultiSelect();
                                    if (bg.locked) {
                                        setSelectedElement(null);
                                    } else {
                                        setSelectedElement({ id: bg.id, kind: 'background' });
                                    }
                                }
                            }}
                            onDragStart={() => {
                                if (multiSelectedIds.includes(bg.id) && multiSelectedIds.length > 1) {
                                    captureMultiDragSnapshot();
                                }
                            }}
                            onDragMove={(totalDx, totalDy) => {
                                if (multiSelectedIds.includes(bg.id) && multiSelectedIds.length > 1) {
                                    applyMultiDragPreview(bg.id, totalDx, totalDy);
                                }
                            }}
                            onDragEnd={(pos) => {
                                updateBackground(bg.id, pos);
                                apiUpdateBackground(bg.id, pos);
                                if (multiSelectedIds.includes(bg.id) && multiSelectedIds.length > 1) {
                                    commitMultiDragPeers(bg.id);
                                }
                            }}
                            onResize={(updates) => {
                                updateBackground(bg.id, updates);
                                apiUpdateBackground(bg.id, updates);
                            }}
                        />
                    ))}
            </Layer>

            {!drawingLayer.hidden && (
                <Layer ref={drawLayerRef} listening={false}>
                    {drawingLayer.strokes.map((stroke) => (
                        <Line
                            key={stroke.id}
                            points={stroke.points}
                            stroke={stroke.tool === 'eraser' ? 'rgba(0,0,0,1)' : stroke.color}
                            strokeWidth={stroke.size}
                            lineCap="round"
                            lineJoin="round"
                            tension={0.4}
                            globalCompositeOperation={stroke.tool === 'eraser' ? 'destination-out' : 'source-over'}
                            opacity={stroke.tool === 'marker' ? 0.5 : 1}
                            listening={false}
                            perfectDrawEnabled={false}
                        />
                    ))}
                </Layer>
            )}

            <Layer listening={creationMode === 'none'}>
                {[
                    ...lines
                        .filter((line) => {
                            const always = selectedElement?.id === line.id || multiSelectedIds.includes(line.id);
                            return (
                                !line.hidden &&
                                !hiddenGroupElIds.has(line.id) &&
                                searchVisible(line.name ?? '', line.pinned) &&
                                (always || lineInViewport(line.x, line.y, line.bx, line.by, viewport)) &&
                                (!allowedIds || always || allowedIds.has(line.id))
                            );
                        })
                        .map((line) => ({ _kind: 'line' as const, data: line })),
                    ...zones
                        .filter((zone) => {
                            const always = selectedElement?.id === zone.id || multiSelectedIds.includes(zone.id);
                            return (
                                !zone.hidden &&
                                !hiddenGroupElIds.has(zone.id) &&
                                searchVisible(zone.name, zone.pinned) &&
                                (always || zoneInViewport(zone.points, viewport)) &&
                                (!allowedIds || always || allowedIds.has(zone.id))
                            );
                        })
                        .map((zone) => ({ _kind: 'zone' as const, data: zone })),
                    ...pois
                        .filter((poi) => {
                            const always = selectedElement?.id === poi.id || multiSelectedIds.includes(poi.id);
                            return (
                                !poi.hidden &&
                                !hiddenGroupElIds.has(poi.id) &&
                                searchVisible(poi.name, poi.pinned) &&
                                (always || poiInViewport(poi.x, poi.y, poi.size ?? 10, viewport)) &&
                                (!allowedIds || always || allowedIds.has(poi.id))
                            );
                        })
                        .map((poi) => ({ _kind: 'poi' as const, data: poi })),
                    ...notes
                        .filter((note) => {
                            const always = selectedElement?.id === note.id || multiSelectedIds.includes(note.id);
                            const s = noteSizes[note.id];
                            return (
                                !note.hidden &&
                                !hiddenGroupElIds.has(note.id) &&
                                searchVisible(note.content, note.pinned) &&
                                (always || rectInViewport(note.x, note.y, s?.w ?? 220, s?.h ?? 120, viewport)) &&
                                (!allowedIds || always || allowedIds.has(note.id))
                            );
                        })
                        .map((note) => ({ _kind: 'note' as const, data: note })),
                ]
                    .sort((a, b) => a.data.zIndex - b.data.zIndex)
                    .map((el) => {
                        if (el._kind === 'line') {
                            const line = el.data;
                            const a = resolveAttachment(line.aAttachedId, line.aAttachedKind, line.x, line.y, pois, zones, notes, backgrounds);
                            const b = resolveAttachment(line.bAttachedId, line.bAttachedKind, line.bx, line.by, pois, zones, notes, backgrounds);
                            return (
                                <LineItem
                                    key={line.id}
                                    line={line}
                                    ax={a.x}
                                    ay={a.y}
                                    bx={b.x}
                                    by={b.y}
                                    editMode={editMode && !line.locked && !lockedGroupElIds.has(line.id)}
                                    selected={selectedElement?.id === line.id}
                                    isMultiSelected={multiSelectedIds.includes(line.id)}
                                    onSelect={(shiftKey) => {
                                        if (shiftKey) {
                                            toggleMultiSelect(line.id);
                                        } else {
                                            clearMultiSelect();
                                            if (line.locked) {
                                                setSelectedElement(null);
                                            } else {
                                                setSelectedElement({ id: line.id, kind: 'line' });
                                            }
                                        }
                                    }}
                                    onControlDragEnd={(x, y) => {
                                        updateLine(line.id, { cx: x, cy: y });
                                        apiUpdateLine(line.id, { cx: x, cy: y });
                                    }}
                                    onControlRightClick={() => {
                                        updateLine(line.id, { cx: undefined, cy: undefined });
                                        apiUpdateLine(line.id, { cx: undefined, cy: undefined });
                                    }}
                                />
                            );
                        }
                        if (el._kind === 'zone') {
                            const zone = el.data;
                            return (
                                <ZoneItem
                                    key={zone.id}
                                    zone={zone}
                                    editMode={editMode && !zone.locked && !lockedGroupElIds.has(zone.id)}
                                    selected={selectedElement?.id === zone.id}
                                    isMultiSelected={multiSelectedIds.includes(zone.id)}
                                    onSelect={(shiftKey) => {
                                        if (shiftKey) {
                                            toggleMultiSelect(zone.id);
                                        } else {
                                            clearMultiSelect();
                                            if (zone.locked) {
                                                setSelectedElement(null);
                                            } else {
                                                setSelectedElement({ id: zone.id, kind: 'zone' });
                                            }
                                        }
                                    }}
                                    onPointMove={(index, x, y) => {
                                        const newPoints = [...zone.points];
                                        newPoints[index * 2] = x;
                                        newPoints[index * 2 + 1] = y;
                                        updateZone(zone.id, { points: newPoints });
                                    }}
                                    onPointDragEnd={(index, x, y) => {
                                        const newPoints = [...zone.points];
                                        newPoints[index * 2] = x;
                                        newPoints[index * 2 + 1] = y;
                                        updateZone(zone.id, { points: newPoints });
                                        apiUpdateZone(zone.id, { points: newPoints });
                                    }}
                                    onDeletePoint={(index) => {
                                        if (zone.points.length / 2 <= 3) return;
                                        const newPoints = [...zone.points];
                                        newPoints.splice(index * 2, 2);
                                        updateZone(zone.id, { points: newPoints });
                                        apiUpdateZone(zone.id, { points: newPoints });
                                    }}
                                    onAddPoint={(afterIndex, x, y) => {
                                        const newPoints = [...zone.points];
                                        newPoints.splice((afterIndex + 1) * 2, 0, x, y);
                                        updateZone(zone.id, { points: newPoints });
                                        apiUpdateZone(zone.id, { points: newPoints });
                                    }}
                                    onMoveStart={() => {
                                        if (multiSelectedIds.includes(zone.id) && multiSelectedIds.length > 1) {
                                            captureMultiDragSnapshot();
                                        }
                                    }}
                                    onMove={(dx, dy, totalDelta) => {
                                        const newPoints = zone.points.map((v, i) => (i % 2 === 0 ? r2(v + dx) : r2(v + dy)));
                                        updateZone(zone.id, { points: newPoints });
                                        if (multiSelectedIds.includes(zone.id) && multiSelectedIds.length > 1) {
                                            applyMultiDragPreview(zone.id, totalDelta.dx, totalDelta.dy);
                                        }
                                    }}
                                    onMoveEnd={(newPoints) => {
                                        apiUpdateZone(zone.id, { points: newPoints });
                                        if (multiSelectedIds.includes(zone.id) && multiSelectedIds.length > 1) {
                                            commitMultiDragPeers(zone.id);
                                        }
                                    }}
                                />
                            );
                        }
                        if (el._kind === 'poi') {
                            const poi = el.data;
                            return (
                                <PoiItem
                                    key={poi.id}
                                    poi={poi}
                                    editMode={editMode && !poi.locked && !lockedGroupElIds.has(poi.id)}
                                    selected={selectedElement?.id === poi.id}
                                    isMultiSelected={multiSelectedIds.includes(poi.id)}
                                    onSelect={(shiftKey) => {
                                        if (shiftKey) {
                                            toggleMultiSelect(poi.id);
                                        } else {
                                            clearMultiSelect();
                                            if (poi.locked) {
                                                setSelectedElement(null);
                                            } else {
                                                setSelectedElement({ id: poi.id, kind: 'poi' });
                                            }
                                        }
                                    }}
                                    onDragStart={() => {
                                        if (multiSelectedIds.includes(poi.id) && multiSelectedIds.length > 1) {
                                            captureMultiDragSnapshot();
                                        }
                                    }}
                                    onDragMove={(totalDx, totalDy) => {
                                        if (multiSelectedIds.includes(poi.id) && multiSelectedIds.length > 1) {
                                            applyMultiDragPreview(poi.id, totalDx, totalDy);
                                        }
                                    }}
                                    onDragEnd={(pos) => {
                                        updatePoi(poi.id, pos);
                                        apiUpdatePOI(poi.id, pos);
                                        if (multiSelectedIds.includes(poi.id) && multiSelectedIds.length > 1) {
                                            commitMultiDragPeers(poi.id);
                                        }
                                    }}
                                />
                            );
                        }
                        if (el._kind === 'note') {
                            const note = el.data;
                            return (
                                <NoteItem
                                    key={note.id}
                                    note={note}
                                    editMode={editMode && !note.locked && !lockedGroupElIds.has(note.id)}
                                    selected={selectedElement?.id === note.id}
                                    isMultiSelected={multiSelectedIds.includes(note.id)}
                                    onSelect={(shiftKey) => {
                                        if (shiftKey) {
                                            toggleMultiSelect(note.id);
                                        } else {
                                            clearMultiSelect();
                                            if (note.locked) {
                                                setSelectedElement(null);
                                            } else {
                                                setSelectedElement({ id: note.id, kind: 'note' });
                                            }
                                        }
                                    }}
                                    onDragStart={() => {
                                        if (multiSelectedIds.includes(note.id) && multiSelectedIds.length > 1) {
                                            captureMultiDragSnapshot();
                                        }
                                    }}
                                    onDragMove={(totalDx, totalDy) => {
                                        if (multiSelectedIds.includes(note.id) && multiSelectedIds.length > 1) {
                                            applyMultiDragPreview(note.id, totalDx, totalDy);
                                        }
                                    }}
                                    onDragEnd={(pos) => {
                                        updateNote(note.id, pos);
                                        apiUpdateNote(note.id, pos);
                                        if (multiSelectedIds.includes(note.id) && multiSelectedIds.length > 1) {
                                            commitMultiDragPeers(note.id);
                                        }
                                    }}
                                    onMeasure={handleNoteMeasure}
                                />
                            );
                        }
                    })}
            </Layer>

            <Layer>
                {creationMode === 'line' && draftLinePointA && mouseMapPos && (
                    <Line
                        points={[draftLinePointA.x, draftLinePointA.y, mouseMapPos.x, mouseMapPos.y]}
                        stroke="rgba(255,255,255,0.8)"
                        strokeWidth={2}
                        dash={[8, 4]}
                        listening={false}
                    />
                )}
                {creationMode === 'line' && draftLinePointA && (
                    <Circle x={draftLinePointA.x} y={draftLinePointA.y} radius={6} fill="#60cdff" stroke="white" strokeWidth={1} listening={false} />
                )}
                {creationMode === 'zone' && draftZonePoints.length > 0 && (
                    <Line
                        points={mouseMapPos ? [...draftZonePoints, mouseMapPos.x, mouseMapPos.y] : draftZonePoints}
                        stroke="rgba(255,255,255,0.8)"
                        strokeWidth={2}
                        dash={[10, 5]}
                        closed={false}
                        listening={false}
                    />
                )}
                {creationMode === 'zone' && draftZonePoints.length >= 2 && (
                    <Circle
                        x={draftZonePoints[0]}
                        y={draftZonePoints[1]}
                        radius={6}
                        fill="#ff4444"
                        stroke="white"
                        strokeWidth={1}
                        onClick={(e) => {
                            e.cancelBubble = true;
                            handleZoneFinish();
                        }}
                        onPointerEnter={() => {
                            document.body.style.cursor = 'pointer';
                        }}
                        onPointerLeave={() => {
                            document.body.style.cursor = 'default';
                        }}
                    />
                )}

                {mouseMapPos && creationMode === 'poi' && (
                    <Circle x={mouseMapPos.x} y={mouseMapPos.y} radius={10} fill="rgba(255,255,255,0.4)" stroke="white" strokeWidth={2} listening={false} />
                )}
                {mouseMapPos && creationMode === 'zone' && (
                    <>
                        <Circle x={mouseMapPos.x} y={mouseMapPos.y} radius={4} fill="white" listening={false} />
                        <Line points={[mouseMapPos.x - 10, mouseMapPos.y, mouseMapPos.x + 10, mouseMapPos.y]} stroke="white" strokeWidth={1} listening={false} />
                        <Line points={[mouseMapPos.x, mouseMapPos.y - 10, mouseMapPos.x, mouseMapPos.y + 10]} stroke="white" strokeWidth={1} listening={false} />
                    </>
                )}
                {mouseMapPos && creationMode === 'note' && (
                    <Rect
                        x={mouseMapPos.x + 6}
                        y={mouseMapPos.y - 6}
                        width={30}
                        height={24}
                        fill="rgba(255,249,196,0.6)"
                        stroke="rgba(255,249,196,0.9)"
                        strokeWidth={1}
                        listening={false}
                    />
                )}
                {mouseMapPos && creationMode === 'line' && (
                    <Circle
                        x={mouseMapPos.x}
                        y={mouseMapPos.y}
                        radius={draftLinePointA ? 5 : 4}
                        fill={draftLinePointA ? '#60cdff' : 'white'}
                        stroke={draftLinePointA ? 'white' : undefined}
                        strokeWidth={draftLinePointA ? 1 : 0}
                        listening={false}
                    />
                )}
                {mouseMapPos && creationMode === 'background' && (
                    <>
                        <Line points={[mouseMapPos.x - 12, mouseMapPos.y, mouseMapPos.x + 12, mouseMapPos.y]} stroke="white" strokeWidth={1} listening={false} />
                        <Line points={[mouseMapPos.x, mouseMapPos.y - 12, mouseMapPos.x, mouseMapPos.y + 12]} stroke="white" strokeWidth={1} listening={false} />
                    </>
                )}
                {mouseMapPos && creationMode === 'draw' && !drawingLayer.hidden && !drawingLayer.locked && (
                    <Circle
                        x={mouseMapPos.x}
                        y={mouseMapPos.y}
                        radius={drawingLayer.activeSize / 2}
                        fill={drawingLayer.activeTool === 'eraser' ? 'rgba(255,255,255,0.5)' : drawingLayer.activeColor}
                        stroke={drawingLayer.activeTool === 'eraser' ? 'rgba(200,200,200,0.8)' : 'rgba(255,255,255,0.5)'}
                        strokeWidth={1 / stageScale}
                        listening={false}
                        opacity={drawingLayer.activeTool === 'marker' ? 0.5 : 0.8}
                    />
                )}
            </Layer>

            <Layer>
                {editMode &&
                    lines
                        .filter((line) => !line.hidden && !line.locked && selectedElement?.id === line.id)
                        .map((line) => {
                            const a = resolveAttachment(line.aAttachedId, line.aAttachedKind, line.x, line.y, pois, zones, notes, backgrounds);
                            const b = resolveAttachment(line.bAttachedId, line.bAttachedKind, line.bx, line.by, pois, zones, notes, backgrounds);
                            const handleEndpointDragEndFactory = (endpoint: 'a' | 'b') => (e: KonvaEventObject<DragEvent>) => {
                                const gripOffX = endpoint === 'a' ? aGripX - a.x : bGripX - b.x;
                                const gripOffY = endpoint === 'a' ? aGripY - a.y : bGripY - b.y;
                                const x = r2(e.target.x() - gripOffX);
                                const y = r2(e.target.y() - gripOffY);
                                const snap = findSnapTarget(x, y);
                                setSnapHighlight(null);
                                let updates: Partial<typeof line>;
                                if (snap) {
                                    const relX = r2(snap.x - snap.originX);
                                    const relY = r2(snap.y - snap.originY);
                                    updates =
                                        endpoint === 'a'
                                            ? {
                                                  x: relX,
                                                  y: relY,
                                                  aAttachedId: snap.id,
                                                  aAttachedKind: snap.kind,
                                              }
                                            : {
                                                  bx: relX,
                                                  by: relY,
                                                  bAttachedId: snap.id,
                                                  bAttachedKind: snap.kind,
                                              };
                                } else {
                                    updates =
                                        endpoint === 'a'
                                            ? {
                                                  x,
                                                  y,
                                                  aAttachedId: undefined,
                                                  aAttachedKind: undefined,
                                              }
                                            : {
                                                  bx: x,
                                                  by: y,
                                                  bAttachedId: undefined,
                                                  bAttachedKind: undefined,
                                              };
                                }
                                updateLine(line.id, updates);
                                apiUpdateLine(line.id, updates);
                            };
                            const handleDragMoveFactory = (_endpoint: 'a' | 'b') => (e: KonvaEventObject<DragEvent>) => {
                                _endpoint;
                                const gripOffX = _endpoint === 'a' ? aGripX - a.x : bGripX - b.x;
                                const gripOffY = _endpoint === 'a' ? aGripY - a.y : bGripY - b.y;
                                const snap = findSnapTarget(e.target.x() - gripOffX, e.target.y() - gripOffY);
                                setSnapHighlight(snap ? { x: snap.x, y: snap.y } : null);
                            };

                            const POI_GRIP = 12 / stageScale;
                            const aGripX = line.aAttachedKind === 'poi' ? a.x + POI_GRIP : a.x;
                            const aGripY = line.aAttachedKind === 'poi' ? a.y - POI_GRIP : a.y;
                            const bGripX = line.bAttachedKind === 'poi' ? b.x + POI_GRIP : b.x;
                            const bGripY = line.bAttachedKind === 'poi' ? b.y - POI_GRIP : b.y;
                            return (
                                <React.Fragment key={line.id}>
                                    <Circle
                                        x={aGripX}
                                        y={aGripY}
                                        radius={6 / stageScale}
                                        fill={line.aAttachedId ? '#60cdff' : 'white'}
                                        stroke={line.aAttachedId ? '#0077aa' : '#333'}
                                        strokeWidth={1.5 / stageScale}
                                        draggable
                                        onDragMove={handleDragMoveFactory('a')}
                                        onDragEnd={handleEndpointDragEndFactory('a')}
                                        onPointerEnter={() => {
                                            document.body.style.cursor = 'move';
                                        }}
                                        onPointerLeave={() => {
                                            document.body.style.cursor = 'default';
                                        }}
                                    />
                                    <Circle
                                        x={bGripX}
                                        y={bGripY}
                                        radius={6 / stageScale}
                                        fill={line.bAttachedId ? '#60cdff' : 'white'}
                                        stroke={line.bAttachedId ? '#0077aa' : '#333'}
                                        strokeWidth={1.5 / stageScale}
                                        draggable
                                        onDragMove={handleDragMoveFactory('b')}
                                        onDragEnd={handleEndpointDragEndFactory('b')}
                                        onPointerEnter={() => {
                                            document.body.style.cursor = 'move';
                                        }}
                                        onPointerLeave={() => {
                                            document.body.style.cursor = 'default';
                                        }}
                                    />
                                </React.Fragment>
                            );
                        })}
                {snapHighlight && (
                    <Circle
                        x={snapHighlight.x}
                        y={snapHighlight.y}
                        radius={18 / stageScale}
                        fill="rgba(96, 205, 255, 0.12)"
                        stroke="#60cdff"
                        strokeWidth={2 / stageScale}
                        dash={[6 / stageScale, 3 / stageScale]}
                        listening={false}
                    />
                )}
            </Layer>
        </Stage>
    );
};
