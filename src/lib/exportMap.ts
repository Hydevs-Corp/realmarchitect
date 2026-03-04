import jsPDF from 'jspdf';
import type Konva from 'konva';
import type { MapData, POI, Zone, TextNote, MapLine, Background, MapGroup } from '../types/map';
import { getStage } from './stageRef';

export interface MapExportData {
    version: 1;
    exportedAt: string;
    map: Pick<MapData, 'id' | 'name' | 'description'>;
    pois: POI[];
    zones: Zone[];
    notes: TextNote[];
    lines: MapLine[];
    backgrounds: Background[];
    groups: MapGroup[];
}

function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeName(name: string): string {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

interface WorldBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

function computeWorldBounds(pois: POI[], zones: Zone[], notes: TextNote[], lines: MapLine[], backgrounds: Background[]): WorldBounds | null {
    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
    let hasAny = false;

    const expand = (x: number, y: number) => {
        hasAny = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    };

    for (const p of pois) {
        const r = (p.size ?? 10) + 4;
        expand(p.x - r, p.y - r);
        expand(p.x + r, p.y + r);
    }
    for (const z of zones) {
        for (let i = 0; i < z.points.length; i += 2) expand(z.points[i], z.points[i + 1]);
    }
    for (const n of notes) {
        expand(n.x, n.y);
        expand(n.x + (n.width ?? 200), n.y + 80);
    }
    for (const l of lines) {
        expand(l.x, l.y);
        expand(l.bx, l.by);
        if (l.cx !== undefined && l.cy !== undefined) expand(l.cx, l.cy);
    }
    for (const b of backgrounds) {
        expand(b.x, b.y);
        expand(b.x + b.width, b.y + b.height);
    }

    if (!hasAny) return null;
    const pad = 30;
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
}

export function exportJSON(mapData: MapData, pois: POI[], zones: Zone[], notes: TextNote[], lines: MapLine[], backgrounds: Background[], groups: MapGroup[]): void {
    const data: MapExportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        map: { id: mapData.id, name: mapData.name, description: mapData.description },
        pois,
        zones,
        notes,
        lines,
        backgrounds,
        groups,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `${safeName(mapData.name)}_export.json`);
}

async function withResolvedImages<T>(stage: Konva.Stage, callback: () => T): Promise<T> {
    type Entry = { node: Konva.Image; origImg: CanvasImageSource | undefined; blobUrl: string | null; hidden: boolean };
    const nodes = stage.find('Image') as Konva.Image[];

    const entries: Entry[] = nodes.map((node) => ({
        node,
        origImg: node.image() as CanvasImageSource | undefined,
        blobUrl: null,
        hidden: !node.visible(),
    }));

    await Promise.all(
        entries.map(async (entry) => {
            const src = (entry.origImg as HTMLImageElement | undefined)?.src ?? (entry.node.getAttr('exportUrl') as string | undefined);
            if (!src || src.startsWith('blob:') || src.startsWith('data:')) return;
            try {
                const resp = await fetch(src);
                if (!resp.ok) return;
                entry.blobUrl = URL.createObjectURL(await resp.blob());
            } catch {
                /* network error — will fall back to hiding */
            }
        })
    );

    await Promise.all(
        entries.map(
            (entry) =>
                new Promise<void>((resolve) => {
                    if (!entry.blobUrl) {
                        entry.node.hide();
                        resolve();
                        return;
                    }
                    const img = new window.Image();
                    img.onload = () => {
                        entry.node.image(img);
                        resolve();
                    };
                    img.onerror = () => {
                        if (entry.blobUrl) URL.revokeObjectURL(entry.blobUrl);
                        entry.blobUrl = null;
                        entry.node.hide();
                        resolve();
                    };
                    img.src = entry.blobUrl;
                })
        )
    );

    stage.draw();

    let result: T;
    try {
        result = callback();
    } catch {
        entries.forEach((e) => {
            if (!e.hidden) e.node.hide();
        });
        stage.draw();
        result = callback();
    }

    entries.forEach((entry) => {
        if (entry.origImg) entry.node.image(entry.origImg);
        if (entry.hidden) entry.node.hide();
        else entry.node.show();
        if (entry.blobUrl) URL.revokeObjectURL(entry.blobUrl);
    });
    stage.draw();

    return result;
}

function applyFullExtentTransform(stage: Konva.Stage, pois: POI[], zones: Zone[], notes: TextNote[], lines: MapLine[], backgrounds: Background[]): (() => void) | null {
    const bounds = computeWorldBounds(pois, zones, notes, lines, backgrounds);
    if (!bounds) return null;

    const savedScaleX = stage.scaleX();
    const savedScaleY = stage.scaleY();
    const savedX = stage.x();
    const savedY = stage.y();

    const w = stage.width();
    const h = stage.height();
    const worldW = bounds.maxX - bounds.minX;
    const worldH = bounds.maxY - bounds.minY;
    const scale = Math.min(w / worldW, h / worldH) * 0.92;
    const newX = w / 2 - (bounds.minX + worldW / 2) * scale;
    const newY = h / 2 - (bounds.minY + worldH / 2) * scale;

    stage.scale({ x: scale, y: scale });
    stage.position({ x: newX, y: newY });
    stage.batchDraw();

    return () => {
        stage.scale({ x: savedScaleX, y: savedScaleY });
        stage.position({ x: savedX, y: savedY });
        stage.batchDraw();
    };
}

export async function exportPNG(
    scope: 'view' | 'full',
    mapData: MapData,
    pois: POI[],
    zones: Zone[],
    notes: TextNote[],
    lines: MapLine[],
    backgrounds: Background[]
): Promise<void> {
    const stage = getStage();
    if (!stage) return;

    let restore: (() => void) | null = null;
    if (scope === 'full') {
        restore = applyFullExtentTransform(stage, pois, zones, notes, lines, backgrounds);
    }

    const dataUrl = await withResolvedImages(stage, () => stage.toDataURL({ mimeType: 'image/png', pixelRatio: 2 }));
    restore?.();

    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${safeName(mapData.name)}_${scope}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

/**
 * Word-wrap a plain text string to fit within `maxWidth` pixels.
 * Uses a simple monospace approximation: charWidth ≈ fontSize × 0.6.
 * Respects explicit `\n` line-breaks and wraps at word boundaries.
 */
function wrapSVGText(text: string, maxWidth: number, fontSize: number): string[] {
    const charW = fontSize * 0.6;
    const maxChars = Math.max(1, Math.floor(maxWidth / charW));
    const result: string[] = [];

    for (const paragraph of text.split('\n')) {
        if (paragraph.length === 0) {
            result.push('');
            continue;
        }
        if (paragraph.length <= maxChars) {
            result.push(paragraph);
            continue;
        }
        const words = paragraph.split(' ');
        let line = '';
        for (const word of words) {
            const candidate = line ? line + ' ' + word : word;
            if (candidate.length <= maxChars) {
                line = candidate;
            } else {
                if (line) result.push(line);
                let remainder = word;
                while (remainder.length > maxChars) {
                    result.push(remainder.slice(0, maxChars));
                    remainder = remainder.slice(maxChars);
                }
                line = remainder;
            }
        }
        if (line) result.push(line);
    }

    return result;
}

function xmlEsc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Convert a stored color (may be #rrggbbaa 8-char) to an SVG-compatible fill + fill-opacity pair. */
function svgColor(raw: string): { fill: string; opacity: string } {
    const c = (raw ?? '').replace('#', '');
    if (c.length === 8) {
        const alpha = parseInt(c.slice(6, 8), 16) / 255;
        return { fill: `#${c.slice(0, 6)}`, opacity: alpha.toFixed(3) };
    }
    return { fill: raw || '#888', opacity: '1' };
}

function hexToRgb(hex: string): [number, number, number] {
    const c = hex.replace('#', '');
    if (c.length < 6) return [128, 128, 128];
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    return [isNaN(r) ? 128 : r, isNaN(g) ? 128 : g, isNaN(b) ? 128 : b];
}

export function exportSVG(mapData: MapData, pois: POI[], zones: Zone[], notes: TextNote[], lines: MapLine[], backgrounds: Background[]): void {
    const bounds = computeWorldBounds(pois, zones, notes, lines, backgrounds);
    const vbX = bounds?.minX ?? 0;
    const vbY = bounds?.minY ?? 0;
    const vbW = bounds ? bounds.maxX - bounds.minX : 1000;
    const vbH = bounds ? bounds.maxY - bounds.minY : 1000;

    const out: string[] = [];
    out.push(`<?xml version="1.0" encoding="UTF-8"?>`);
    out.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` + `viewBox="${vbX} ${vbY} ${vbW} ${vbH}" width="${vbW}" height="${vbH}">`);
    out.push(`  <title>${xmlEsc(mapData.name)}</title>`);

    const byZ = (a: { zIndex: number }, b: { zIndex: number }) => a.zIndex - b.zIndex;

    for (const bg of [...backgrounds].sort(byZ)) {
        if (bg.hidden) continue;

        const rot = bg.rotation ? ` transform="rotate(${bg.rotation} ${bg.x} ${bg.y})"` : '';
        out.push(`  <image href="${xmlEsc(bg.imageUrl)}" x="${bg.x}" y="${bg.y}" ` + `width="${bg.width}" height="${bg.height}"${rot} preserveAspectRatio="none"/>`);
    }

    for (const z of [...zones].sort(byZ)) {
        if (z.hidden) continue;
        const pts = [];
        for (let i = 0; i < z.points.length; i += 2) pts.push(`${z.points[i]},${z.points[i + 1]}`);
        out.push(
            `  <polygon points="${pts.join(' ')}" fill="${xmlEsc(z.color)}" fill-opacity="0.35" ` +
                `stroke="${xmlEsc(z.color)}" stroke-width="2"><title>${xmlEsc(z.name)}</title></polygon>`
        );
        if (z.points.length >= 4) {
            let cx = 0,
                cy = 0;
            const n = z.points.length / 2;
            for (let i = 0; i < z.points.length; i += 2) {
                cx += z.points[i];
                cy += z.points[i + 1];
            }
            out.push(
                `  <text x="${cx / n}" y="${cy / n}" text-anchor="middle" dominant-baseline="central" ` +
                    `font-family="sans-serif" font-size="12" fill="${xmlEsc(z.color)}" ` +
                    `paint-order="stroke" stroke="white" stroke-width="2">${xmlEsc(z.name)}</text>`
            );
        }
    }

    for (const l of [...lines].sort(byZ)) {
        if (l.hidden) continue;
        const dash = l.dashPattern === 'dashed' ? ' stroke-dasharray="8 4"' : l.dashPattern === 'dotted' ? ' stroke-dasharray="2 3"' : '';
        const sw = l.strokeWidth ?? 2;
        if (l.cx !== undefined && l.cy !== undefined) {
            out.push(`  <path d="M ${l.x} ${l.y} Q ${l.cx} ${l.cy} ${l.bx} ${l.by}" ` + `fill="none" stroke="${xmlEsc(l.color)}" stroke-width="${sw}"${dash}/>`);
        } else {
            out.push(`  <line x1="${l.x}" y1="${l.y}" x2="${l.bx}" y2="${l.by}" ` + `stroke="${xmlEsc(l.color)}" stroke-width="${sw}"${dash}/>`);
        }
        if (l.name) {
            const midX = l.cx !== undefined ? (l.x + l.cx + l.bx) / 3 : (l.x + l.bx) / 2;
            const midY = l.cy !== undefined ? (l.y + l.cy + l.by) / 3 : (l.y + l.by) / 2;
            out.push(`  <text x="${midX}" y="${midY - 4}" text-anchor="middle" font-family="sans-serif" font-size="10" fill="${xmlEsc(l.color)}">${xmlEsc(l.name)}</text>`);
        }
    }

    for (const p of [...pois].sort(byZ)) {
        if (p.hidden) continue;
        const r = (p.size ?? 20) / 2;
        out.push(
            `  <circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${xmlEsc(p.color)}" stroke="white" stroke-width="1.5">` +
                `<title>${xmlEsc(p.name)}${p.description ? ': ' + p.description : ''}</title></circle>`
        );
        out.push(
            `  <text x="${p.x}" y="${p.y - r - 4}" text-anchor="middle" font-family="sans-serif" font-size="11" ` +
                `fill="${xmlEsc(p.color)}" paint-order="stroke" stroke="white" stroke-width="2">${xmlEsc(p.name)}</text>`
        );
    }

    for (const n of [...notes].sort(byZ)) {
        if (n.hidden) continue;
        const w = n.width ?? 200;
        const fs = n.fontSize ?? 14;
        const { fill: noteBg, opacity: noteOpacity } = svgColor(n.bgColor ?? '#fff9c4ff');
        const allLines = wrapSVGText(n.content, w - 16, fs);
        const lineH = fs + 4;
        const padV = 8;
        const noteH = padV * 2 + allLines.length * lineH;
        const clipId = `nc_${xmlEsc(n.id)}`;

        out.push(`  <defs><clipPath id="${clipId}"><rect x="${n.x}" y="${n.y}" width="${w}" height="${noteH}"/></clipPath></defs>`);
        out.push(
            `  <rect x="${n.x}" y="${n.y}" width="${w}" height="${noteH}" ` + `fill="${xmlEsc(noteBg)}" fill-opacity="${noteOpacity}" stroke="#bbb" stroke-width="1" rx="4"/>`
        );
        out.push(`  <g clip-path="url(#${clipId})">`);
        allLines.forEach((ln, i) => {
            out.push(`    <text x="${n.x + 8}" y="${n.y + padV + fs + i * lineH}" ` + `font-family="sans-serif" font-size="${fs}" fill="#333">${xmlEsc(ln)}</text>`);
        });
        out.push(`  </g>`);
    }

    out.push('</svg>');

    const blob = new Blob([out.join('\n')], { type: 'image/svg+xml' });
    downloadBlob(blob, `${safeName(mapData.name)}_export.svg`);
}

export async function exportPDF(
    scope: 'view' | 'full',
    mapData: MapData,
    pois: POI[],
    zones: Zone[],
    notes: TextNote[],
    lines: MapLine[],
    backgrounds: Background[]
): Promise<void> {
    const stage = getStage();
    if (!stage) return;

    let restore: (() => void) | null = null;
    if (scope === 'full') {
        restore = applyFullExtentTransform(stage, pois, zones, notes, lines, backgrounds);
    }
    const dataUrl = await withResolvedImages(stage, () => stage.toDataURL({ mimeType: 'image/png', pixelRatio: 1.5 }));
    restore?.();

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    pdf.addImage(dataUrl, 'PNG', 0, 0, pageW, pageH);
    pdf.setFillColor(0, 0, 0);
    pdf.setGState(pdf.GState({ opacity: 0.45 }));
    pdf.rect(0, 0, pageW, 12, 'F');
    pdf.setGState(pdf.GState({ opacity: 1 }));
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.text(`${mapData.name}${mapData.description ? ' — ' + mapData.description : ''}`, 5, 8);

    pdf.addPage();
    pdf.setTextColor(30, 30, 30);

    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(mapData.name, pageW / 2, 16, { align: 'center' });

    if (mapData.description) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(100, 100, 100);
        pdf.text(mapData.description, pageW / 2, 23, { align: 'center' });
    }

    let y = 30;
    const lh = 7;
    const margin = 12;
    const maxW = pageW - margin * 2;

    const checkPage = () => {
        if (y > pageH - 14) {
            pdf.addPage();
            y = 14;
        }
    };

    const section = (title: string, count: number) => {
        checkPage();
        pdf.setFillColor(240, 240, 240);
        pdf.rect(margin - 2, y - 4, maxW + 4, lh + 1, 'F');
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(30, 30, 30);
        pdf.text(`${title} (${count})`, margin, y + 1);
        y += lh + 2;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
    };

    const row = (label: string, colorHex: string, desc?: string) => {
        checkPage();
        const [r, g, b] = hexToRgb(colorHex);
        pdf.setFillColor(r, g, b);
        pdf.roundedRect(margin, y - 3, 4, 4, 0.5, 0.5, 'F');
        pdf.setTextColor(40, 40, 40);
        const text = desc ? `${label}  —  ${desc}` : label;
        const wrapped = pdf.splitTextToSize(text, maxW - 8);
        pdf.text(wrapped, margin + 6, y);
        y += lh * (wrapped.length > 1 ? wrapped.length : 1);
    };

    const poisVisible = pois.filter((p) => !p.hidden);
    const zonesVisible = zones.filter((z) => !z.hidden);
    const notesVisible = notes.filter((n) => !n.hidden);

    if (poisVisible.length > 0) {
        section('Points of Interest', poisVisible.length);
        for (const p of poisVisible) row(p.name, p.color, p.description);
        y += 2;
    }
    if (zonesVisible.length > 0) {
        section('Zones', zonesVisible.length);
        for (const z of zonesVisible) row(z.name, z.color, z.description);
        y += 2;
    }
    if (notesVisible.length > 0) {
        section('Notes', notesVisible.length);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        for (const n of notesVisible) {
            checkPage();
            pdf.setTextColor(40, 40, 40);
            const preview = n.content.slice(0, 120) + (n.content.length > 120 ? '…' : '');
            const wrapped = pdf.splitTextToSize(`• ${preview}`, maxW);
            pdf.text(wrapped, margin, y);
            y += lh * (wrapped.length > 1 ? wrapped.length : 1);
        }
    }

    pdf.save(`${safeName(mapData.name)}_export.pdf`);
}
