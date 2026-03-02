import React, { useRef, useState } from 'react';
import { Alert, Badge, Box, Button, Divider, FileButton, Group, Loader, Modal, Radio, SegmentedControl, Stack, Text, ThemeIcon, Title, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconCheck, IconDownload, IconFileCode, IconFileTypePdf, IconFileTypeSvg, IconPhoto, IconUpload } from '@tabler/icons-react';
import { useShallow } from 'zustand/react/shallow';
import { useMapStore } from '../../store/useMapStore';
import { exportJSON, exportPNG, exportSVG, exportPDF } from '../../lib/exportMap';
import { parseImportFile, importElements } from '../../lib/importMap';
import type { MapExportData } from '../../lib/exportMap';
import type { ImportMode } from '../../lib/importMap';
import { mainColor } from '../../constants';

type ExportFormat = 'json' | 'png' | 'svg' | 'pdf';

interface Props {
    opened: boolean;
    onClose: () => void;
}

export const ExportImportModal: React.FC<Props> = ({ opened, onClose }) => {
    const { currentMap, pois, zones, notes, lines, backgrounds, groups, loadMapData } = useMapStore(
        useShallow((s) => ({
            currentMap: s.currentMap,
            pois: s.pois,
            zones: s.zones,
            notes: s.notes,
            lines: s.lines,
            backgrounds: s.backgrounds,
            groups: s.groups,
            loadMapData: s.loadMapData,
        }))
    );

    const [tab, setTab] = useState<'export' | 'import'>('export');
    const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
    const [exportScope, setExportScope] = useState<'view' | 'full'>('view');
    const [exporting, setExporting] = useState(false);

    const [parsedData, setParsedData] = useState<MapExportData | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);
    const [importMode, setImportMode] = useState<ImportMode>('fresh');
    const [importing, setImporting] = useState(false);
    const [importDone, setImportDone] = useState(false);
    const resetRef = useRef<() => void>(null);

    if (!currentMap) return null;

    const handleExport = async () => {
        if (!currentMap) return;
        setExporting(true);
        try {
            switch (exportFormat) {
                case 'json':
                    exportJSON(currentMap, pois, zones, notes, lines, backgrounds, groups);
                    break;
                case 'png':
                    await exportPNG(exportScope, currentMap, pois, zones, notes, lines, backgrounds);
                    break;
                case 'svg':
                    exportSVG(currentMap, pois, zones, notes, lines, backgrounds);
                    break;
                case 'pdf':
                    await exportPDF(exportScope, currentMap, pois, zones, notes, lines, backgrounds);
                    break;
            }
            notifications.show({ message: 'Export successful', color: 'green', icon: <IconCheck /> });
            onClose();
        } catch (e) {
            notifications.show({ message: `Export failed: ${(e as Error).message}`, color: 'red' });
        } finally {
            setExporting(false);
        }
    };

    const handleFilePicked = async (file: File | null) => {
        if (!file) return;
        setParseError(null);
        setParsedData(null);
        setImportDone(false);
        try {
            const data = await parseImportFile(file);
            setParsedData(data);

            if (data.map.id !== currentMap.id) {
                setImportMode('fresh');
            }
        } catch (e) {
            setParseError((e as Error).message);
        }
    };

    const handleImport = async () => {
        if (!parsedData || !currentMap) return;
        setImporting(true);
        try {
            const result = await importElements(currentMap.id, parsedData, importMode, { pois, zones, notes, lines, backgrounds, groups });

            await loadMapData(currentMap.id);

            const total = result.pois.length + result.zones.length + result.notes.length + result.lines.length + result.backgrounds.length;
            const skipped = result.skippedBackgrounds;
            notifications.show({
                message: `Imported ${total} element${total !== 1 ? 's' : ''}${skipped > 0 ? ` (${skipped} background${skipped > 1 ? 's' : ''} skipped — no asset)` : ''}`,
                color: 'green',
                icon: <IconCheck />,
            });

            setImportDone(true);
            setParsedData(null);
            resetRef.current?.();
            onClose();
        } catch (e) {
            notifications.show({ message: `Import failed: ${(e as Error).message}`, color: 'red' });
        } finally {
            setImporting(false);
        }
    };

    const isSameMap = parsedData?.map.id === currentMap.id;
    const needsScope = exportFormat === 'png' || exportFormat === 'pdf';

    const formatMeta: Record<ExportFormat, { icon: React.ReactNode; label: string; description: string }> = {
        json: { icon: <IconFileCode />, label: 'JSON', description: 'Full backup — ids, data, re-importable' },
        png: { icon: <IconPhoto />, label: 'PNG', description: 'Raster image of the canvas' },
        svg: { icon: <IconFileTypeSvg />, label: 'SVG', description: 'Vector graphic — scalable' },
        pdf: { icon: <IconFileTypePdf />, label: 'PDF', description: 'Image + element list on page 2' },
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group gap="xs">
                    <Title order={4}>Export / Import</Title>
                    <Badge variant="light" color={mainColor} size="sm">
                        {currentMap.name}
                    </Badge>
                </Group>
            }
            size="md"
            centered
        >
            <SegmentedControl
                fullWidth
                value={tab}
                onChange={(v) => setTab(v as 'export' | 'import')}
                data={[
                    { label: 'Export', value: 'export' },
                    { label: 'Import JSON', value: 'import' },
                ]}
                mb="md"
            />

            {/* ───── EXPORT TAB ───── */}
            {tab === 'export' && (
                <Stack gap="md">
                    {/* Format selector */}
                    <Stack gap="xs">
                        <Text size="sm" fw={500}>
                            Format
                        </Text>
                        <Group gap="xs">
                            {(Object.keys(formatMeta) as ExportFormat[]).map((fmt) => {
                                const meta = formatMeta[fmt];
                                const active = exportFormat === fmt;
                                return (
                                    <Tooltip key={fmt} label={meta.description} withArrow position="top">
                                        <Button
                                            size="xs"
                                            variant={active ? 'filled' : 'default'}
                                            color={active ? mainColor : undefined}
                                            leftSection={meta.icon}
                                            onClick={() => setExportFormat(fmt)}
                                        >
                                            {meta.label}
                                        </Button>
                                    </Tooltip>
                                );
                            })}
                        </Group>
                    </Stack>

                    {/* Scope (PNG / PDF only) */}
                    {needsScope && (
                        <>
                            <Divider />
                            <Stack gap="xs">
                                <Text size="sm" fw={500}>
                                    Scope
                                </Text>
                                <Radio.Group value={exportScope} onChange={(v) => setExportScope(v as 'view' | 'full')}>
                                    <Stack gap="xs">
                                        <Radio value="view" label="Current view (viewport)" />
                                        <Radio value="full" label="Full extent (all elements)" />
                                    </Stack>
                                </Radio.Group>
                            </Stack>
                        </>
                    )}

                    {/* Summary */}
                    <Divider />
                    <Box bg="gray.0" p="xs" style={{ borderRadius: 4 }}>
                        <Text size="xs" c="dimmed">
                            {pois.length} POIs · {zones.length} zones · {notes.length} notes · {lines.length} lines · {backgrounds.length} images
                        </Text>
                    </Box>

                    <Button leftSection={exporting ? <Loader /> : <IconDownload />} onClick={handleExport} disabled={exporting} color={mainColor}>
                        {exporting ? 'Exporting…' : `Export as ${exportFormat.toUpperCase()}`}
                    </Button>
                </Stack>
            )}

            {/* ───── IMPORT TAB ───── */}
            {tab === 'import' && (
                <Stack gap="md">
                    {importDone && (
                        <Alert icon={<IconCheck />} color="green" title="Import successful">
                            The map has been updated.
                        </Alert>
                    )}

                    <Stack gap="xs">
                        <Text size="sm" fw={500}>
                            Select a JSON export file
                        </Text>
                        <FileButton resetRef={resetRef} onChange={handleFilePicked} accept="application/json,.json">
                            {(props) => (
                                <Button {...props} leftSection={<IconUpload />} variant="default" size="sm">
                                    Choose file…
                                </Button>
                            )}
                        </FileButton>
                    </Stack>

                    {parseError && (
                        <Alert icon={<IconAlertTriangle />} color="red" title="Parse error">
                            {parseError}
                        </Alert>
                    )}

                    {parsedData && (
                        <>
                            <Divider />
                            {/* Summary of what was parsed */}
                            <Box bg="gray.0" p="sm" style={{ borderRadius: 6 }}>
                                <Text size="sm" fw={600} mb={4}>
                                    {parsedData.map.name}
                                </Text>
                                {parsedData.map.description && (
                                    <Text size="xs" c="dimmed" mb={6}>
                                        {parsedData.map.description}
                                    </Text>
                                )}
                                <Group gap={6}>
                                    {parsedData.pois?.length > 0 && (
                                        <Badge size="xs" variant="light">
                                            {parsedData.pois.length} POIs
                                        </Badge>
                                    )}
                                    {parsedData.zones?.length > 0 && (
                                        <Badge size="xs" variant="light" color="blue">
                                            {parsedData.zones.length} zones
                                        </Badge>
                                    )}
                                    {parsedData.notes?.length > 0 && (
                                        <Badge size="xs" variant="light" color="yellow">
                                            {parsedData.notes.length} notes
                                        </Badge>
                                    )}
                                    {parsedData.lines?.length > 0 && (
                                        <Badge size="xs" variant="light" color="gray">
                                            {parsedData.lines.length} lines
                                        </Badge>
                                    )}
                                    {parsedData.backgrounds?.length > 0 && (
                                        <Badge size="xs" variant="light" color="violet">
                                            {parsedData.backgrounds.length} images
                                        </Badge>
                                    )}
                                </Group>
                                <Group gap={4} mt={6}>
                                    <ThemeIcon size="xs" variant="transparent" color={isSameMap ? 'green' : 'orange'}>
                                        {isSameMap ? <IconCheck size={10} /> : <IconAlertTriangle size={10} />}
                                    </ThemeIcon>
                                    <Text size="xs" c={isSameMap ? 'green' : 'orange'}>
                                        {isSameMap ? 'Same map — merge options available' : 'Different map — ids will be regenerated'}
                                    </Text>
                                </Group>
                            </Box>

                            {/* Mode selector */}
                            <Stack gap="xs">
                                <Text size="sm" fw={500}>
                                    Import mode
                                </Text>
                                <Radio.Group value={importMode} onChange={(v) => setImportMode(v as ImportMode)}>
                                    <Stack gap="xs">
                                        <Radio value="fresh" label="Fresh import" description="Add all elements with new ids — safe, non-destructive" />
                                        {isSameMap && (
                                            <>
                                                <Radio value="merge" label="Merge" description="Keep existing elements and add imported ones with new ids" />
                                                <Radio
                                                    value="replace"
                                                    label="Replace all"
                                                    description="Delete current elements then restore imported ones with original ids"
                                                    color="red"
                                                />
                                            </>
                                        )}
                                    </Stack>
                                </Radio.Group>
                            </Stack>

                            {importMode === 'replace' && (
                                <Alert icon={<IconAlertTriangle />} color="orange" title="Warning">
                                    All current elements will be deleted and replaced with the imported data. This cannot be undone.
                                </Alert>
                            )}

                            <Button
                                leftSection={importing ? <Loader /> : <IconUpload />}
                                onClick={handleImport}
                                disabled={importing}
                                color={importMode === 'replace' ? 'red' : mainColor}
                            >
                                {importing ? 'Importing…' : 'Import'}
                            </Button>
                        </>
                    )}
                </Stack>
            )}
        </Modal>
    );
};
