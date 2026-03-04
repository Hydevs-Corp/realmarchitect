import { Hypb, useAuthContext } from '@hydevs/hypb';
import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Card,
    Center,
    Container,
    FileButton,
    Group,
    JsonInput,
    Loader,
    Menu,
    Modal,
    NumberInput,
    Paper,
    Progress,
    ScrollArea,
    SegmentedControl,
    Select,
    SimpleGrid,
    Stack,
    Switch,
    Text,
    TextInput,
    Textarea,
    Title,
    Tooltip,
    useMantineTheme,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
    IconArrowDown,
    IconArrowLeft,
    IconArrowRight,
    IconArrowUp,
    IconDice,
    IconDownload,
    IconEdit,
    IconPaint,
    IconPencil,
    IconPlus,
    IconRefresh,
    IconTrash,
    IconUpload,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router';
import type { DncWorldmapTileRecord, DncWorldmapTilesetRecord } from '../types/database';
import type { WFCGrid, WFCTile } from '../lib/wfc';
import { constrainFromCollapsed, createGrid, fillRegion, OPPOSITE_DIR, paintRegion, rerollCells, runWFC } from '../lib/wfc';

/** Compute the set of tile IDs eligible as draw-centre for `label` given a hint. */
function getTilesForLabel(tilesMap: Map<string, WFCTile>, label: string, hint: 'all' | 'some'): string[] {
    return Array.from(tilesMap.keys()).filter((id) => {
        const def = tilesMap.get(id)?.definition;
        if (!def) return false;
        const sides = [def.sockets.top, def.sockets.bottom, def.sockets.left, def.sockets.right];
        if (hint === 'all') {
            return sides.every((s) => {
                const arr = Array.isArray(s) ? s : [s];
                return arr.length === 1 && arr[0] === label;
            });
        }
        return sides.some((s) => {
            const arr = Array.isArray(s) ? s : [s];
            return arr.includes(label);
        });
    });
}

interface TilesetFormValues {
    name: string;
    tile_size: number | string;
    description: string;
    draw_hints: { label: string; mode: 'all' | 'some' }[];
}

interface TileFormValues {
    name: string;
    wfc_definition: string;
}

function TilesetFormModal({ opened, onClose, onSaved, initial }: { opened: boolean; onClose: () => void; onSaved: () => void; initial?: DncWorldmapTilesetRecord }) {
    const form = useForm<TilesetFormValues>({
        initialValues: {
            name: initial?.name ?? '',
            tile_size: initial?.tile_size ?? 32,
            description: initial?.description ?? '',
            draw_hints: Object.entries(initial?.draw_hints ?? {}).map(([label, mode]) => ({ label, mode: mode as 'all' | 'some' })),
        },
    });

    const [refImage, setRefImage] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        form.setValues({
            name: initial?.name ?? '',
            tile_size: initial?.tile_size ?? 32,
            description: initial?.description ?? '',
            draw_hints: Object.entries(initial?.draw_hints ?? {}).map(([label, mode]) => ({ label, mode: mode as 'all' | 'some' })),
        });
        setRefImage(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initial, opened]);

    const handleSubmit = async (values: TilesetFormValues) => {
        setSaving(true);
        try {
            const data = new FormData();
            data.append('name', values.name);
            data.append('tile_size', String(values.tile_size));
            data.append('description', values.description);
            const hintsObj: Record<string, string> = {};
            for (const h of values.draw_hints) {
                if (h.label.trim()) hintsObj[h.label.trim()] = h.mode;
            }
            data.append('draw_hints', JSON.stringify(hintsObj));
            if (refImage) data.append('reference_image', refImage);

            if (initial) {
                await Hypb.pb.collection('dnc_worldmap_tilesets').update(initial.id, data);
            } else {
                await Hypb.pb.collection('dnc_worldmap_tilesets').create(data);
            }
            notifications.show({ message: initial ? 'Tileset updated' : 'Tileset created', color: 'green' });
            onSaved();
            onClose();
        } catch (e) {
            console.error(e);
            notifications.show({ message: 'Failed to save tileset', color: 'red' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal opened={opened} onClose={onClose} title={initial ? 'Edit tileset' : 'New tileset'} centered>
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack>
                    <TextInput label="Name" required {...form.getInputProps('name')} />
                    <NumberInput label="Tile size (px)" required min={1} {...form.getInputProps('tile_size')} />
                    <Textarea label="Description" autosize minRows={2} {...form.getInputProps('description')} />
                    <FileButton onChange={setRefImage} accept="image/*">
                        {(props) => (
                            <Button variant="outline" leftSection={<IconUpload size={16} />} {...props}>
                                {refImage ? refImage.name : 'Upload reference image (optional)'}
                            </Button>
                        )}
                    </FileButton>
                    <Group justify="flex-end">
                        <Button variant="subtle" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={saving}>
                            {initial ? 'Save' : 'Create'}
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Modal>
    );
}

const DEFAULT_WFC_DEF = JSON.stringify(
    {
        weight: 1,
        sockets: {
            top: ['default'],
            bottom: ['default'],
            left: ['default'],
            right: ['default'],
        },
    },
    null,
    2
);

function TileFormModal({
    opened,
    onClose,
    onSaved,
    tilesetId,
    initial,
}: {
    opened: boolean;
    onClose: () => void;
    onSaved: () => void;
    tilesetId: string;
    initial?: DncWorldmapTileRecord;
}) {
    const form = useForm<TileFormValues>({
        initialValues: {
            name: initial?.name ?? '',
            wfc_definition: initial ? JSON.stringify(initial.wfc_definition, null, 2) : DEFAULT_WFC_DEF,
        },
    });

    const [tileImage, setTileImage] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        form.setValues({
            name: initial?.name ?? '',
            wfc_definition: initial ? JSON.stringify(initial.wfc_definition, null, 2) : DEFAULT_WFC_DEF,
        });
        setTileImage(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initial, opened]);

    const handleSubmit = async (values: TileFormValues) => {
        let parsed: unknown;
        try {
            parsed = JSON.parse(values.wfc_definition);
        } catch {
            notifications.show({ message: 'WFC definition is not valid JSON', color: 'red' });
            return;
        }

        setSaving(true);
        try {
            const data = new FormData();
            data.append('name', values.name);
            data.append('tileset_id', tilesetId);
            data.append('wfc_definition', JSON.stringify(parsed));
            if (tileImage) data.append('image', tileImage);

            if (initial) {
                await Hypb.pb.collection('dnc_worldmap_tiles').update(initial.id, data);
            } else {
                if (!tileImage) {
                    notifications.show({ message: 'Please upload a tile image', color: 'red' });
                    setSaving(false);
                    return;
                }
                await Hypb.pb.collection('dnc_worldmap_tiles').create(data);
            }
            notifications.show({ message: initial ? 'Tile updated' : 'Tile created', color: 'green' });
            onSaved();
            onClose();
        } catch (e) {
            console.error(e);
            notifications.show({ message: 'Failed to save tile', color: 'red' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal opened={opened} onClose={onClose} title={initial ? 'Edit tile' : 'New tile'} centered size="lg">
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack>
                    <TextInput label="Name" required {...form.getInputProps('name')} />
                    <FileButton onChange={setTileImage} accept="image/*">
                        {(props) => (
                            <Button variant="outline" leftSection={<IconUpload size={16} />} {...props}>
                                {tileImage ? tileImage.name : initial ? 'Replace image (optional)' : 'Upload tile image *'}
                            </Button>
                        )}
                    </FileButton>
                    <JsonInput
                        label="WFC Definition"
                        description='Sockets describe the EDGE TYPE of the tile, not its neighbours. E.g. grass, trees and bushes all use ["ground"] on every side — they connect to each other automatically. A path tile uses ["path"] on path sides and ["ground"] on terrain sides. Multi-value ["path","ground"] means the edge transitions between both.'
                        required
                        autosize
                        minRows={8}
                        formatOnBlur
                        {...form.getInputProps('wfc_definition')}
                    />
                    <Group justify="flex-end">
                        <Button variant="subtle" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={saving}>
                            {initial ? 'Save' : 'Create'}
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Modal>
    );
}

function TilesetManager() {
    const [tilesets, setTilesets] = useState<DncWorldmapTilesetRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTileset, setSelectedTileset] = useState<DncWorldmapTilesetRecord | null>(null);
    const [tiles, setTiles] = useState<DncWorldmapTileRecord[]>([]);
    const [tilesLoading, setTilesLoading] = useState(false);

    const [tilesetFormOpened, { open: openTilesetForm, close: closeTilesetForm }] = useDisclosure(false);
    const [tileFormOpened, { open: openTileForm, close: closeTileForm }] = useDisclosure(false);
    const [editingTileset, setEditingTileset] = useState<DncWorldmapTilesetRecord | undefined>(undefined);
    const [editingTile, setEditingTile] = useState<DncWorldmapTileRecord | undefined>(undefined);

    const loadTilesets = useCallback(async () => {
        setLoading(true);
        try {
            const list = await Hypb.pb.collection('dnc_worldmap_tilesets').getFullList<DncWorldmapTilesetRecord>();
            setTilesets(list);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadTiles = useCallback(async (tilesetId: string) => {
        setTilesLoading(true);
        try {
            const list = await Hypb.pb.collection('dnc_worldmap_tiles').getFullList<DncWorldmapTileRecord>({ filter: `tileset_id = "${tilesetId}"` });
            setTiles(list);
        } finally {
            setTilesLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadTilesets();
    }, [loadTilesets]);

    useEffect(() => {
        if (selectedTileset) void loadTiles(selectedTileset.id);
        else setTiles([]);
    }, [selectedTileset, loadTiles]);

    const handleDeleteTileset = async (ts: DncWorldmapTilesetRecord) => {
        if (!confirm(`Delete tileset "${ts.name}"? All its tiles will be deleted too.`)) return;
        await Hypb.pb.collection('dnc_worldmap_tilesets').delete(ts.id);
        if (selectedTileset?.id === ts.id) setSelectedTileset(null);
        void loadTilesets();
    };

    const handleDeleteTile = async (tile: DncWorldmapTileRecord) => {
        if (!confirm(`Delete tile "${tile.name}"?`)) return;
        await Hypb.pb.collection('dnc_worldmap_tiles').delete(tile.id);
        if (selectedTileset) void loadTiles(selectedTileset.id);
    };

    return (
        <Stack>
            <Group justify="space-between">
                <Title order={4}>Tilesets</Title>
                <Button
                    size="xs"
                    leftSection={<IconPlus size={14} />}
                    onClick={() => {
                        setEditingTileset(undefined);
                        openTilesetForm();
                    }}
                >
                    New Tileset
                </Button>
            </Group>

            {loading ? (
                <Center py="xl">
                    <Loader />
                </Center>
            ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
                    {tilesets.map((ts) => (
                        <Card
                            key={ts.id}
                            withBorder
                            style={{ cursor: 'pointer', outline: selectedTileset?.id === ts.id ? '2px solid var(--mantine-primary-color-filled)' : undefined }}
                            onClick={() => setSelectedTileset(ts.id === selectedTileset?.id ? null : ts)}
                        >
                            <Group justify="space-between">
                                <div>
                                    <Text fw={600}>{ts.name}</Text>
                                    <Text size="xs" c="dimmed">
                                        {ts.tile_size}px tiles
                                    </Text>
                                </div>
                                <Group gap={4}>
                                    <ActionIcon
                                        variant="subtle"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingTileset(ts);
                                            openTilesetForm();
                                        }}
                                    >
                                        <IconEdit size={14} />
                                    </ActionIcon>
                                    <ActionIcon
                                        variant="subtle"
                                        color="red"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            void handleDeleteTileset(ts);
                                        }}
                                    >
                                        <IconTrash size={14} />
                                    </ActionIcon>
                                </Group>
                            </Group>
                        </Card>
                    ))}
                </SimpleGrid>
            )}

            {selectedTileset && (
                <Stack mt="md">
                    <Group justify="space-between">
                        <Title order={5}>Tiles in "{selectedTileset.name}"</Title>
                        <Button
                            size="xs"
                            leftSection={<IconPlus size={14} />}
                            onClick={() => {
                                setEditingTile(undefined);
                                openTileForm();
                            }}
                        >
                            New Tile
                        </Button>
                    </Group>

                    {tilesLoading ? (
                        <Center py="md">
                            <Loader size="sm" />
                        </Center>
                    ) : tiles.length === 0 ? (
                        <Text c="dimmed" size="sm">
                            No tiles yet. Add your first tile.
                        </Text>
                    ) : (
                        <SimpleGrid cols={{ base: 3, sm: 4, md: 6 }} spacing="xs">
                            {tiles.map((tile) => {
                                const imgUrl = Hypb.pb.files.getURL(tile, tile.image ?? '');
                                return (
                                    <Card key={tile.id} withBorder p="xs">
                                        <Stack gap={4} align="center">
                                            {tile.image ? (
                                                <img
                                                    src={imgUrl}
                                                    alt={tile.name}
                                                    style={{
                                                        width: 48,
                                                        height: 48,
                                                        objectFit: 'contain',
                                                        imageRendering: 'pixelated',
                                                    }}
                                                />
                                            ) : (
                                                <Box
                                                    style={{
                                                        width: 48,
                                                        height: 48,
                                                        background: 'var(--mantine-color-dark-5)',
                                                        borderRadius: 4,
                                                    }}
                                                />
                                            )}
                                            <Text size="xs" ta="center" lineClamp={1}>
                                                {tile.name}
                                            </Text>
                                            <Group gap={2}>
                                                <ActionIcon
                                                    variant="subtle"
                                                    size="xs"
                                                    onClick={() => {
                                                        setEditingTile(tile);
                                                        openTileForm();
                                                    }}
                                                >
                                                    <IconEdit size={12} />
                                                </ActionIcon>
                                                <ActionIcon variant="subtle" color="red" size="xs" onClick={() => void handleDeleteTile(tile)}>
                                                    <IconTrash size={12} />
                                                </ActionIcon>
                                            </Group>
                                        </Stack>
                                    </Card>
                                );
                            })}
                        </SimpleGrid>
                    )}
                </Stack>
            )}

            <TilesetFormModal opened={tilesetFormOpened} onClose={closeTilesetForm} onSaved={loadTilesets} initial={editingTileset} />
            {selectedTileset && (
                <TileFormModal opened={tileFormOpened} onClose={closeTileForm} onSaved={() => loadTiles(selectedTileset.id)} tilesetId={selectedTileset.id} initial={editingTile} />
            )}
        </Stack>
    );
}

interface GridSelection {
    r1: number;
    c1: number;
    r2: number;
    c2: number;
}

interface GeneratedGridProps {
    grid: ReturnType<typeof createGrid>;
    tilesMap: Map<string, WFCTile>;
    tileSize: number;
    mode: 'select' | 'draw';
    paintTileId: string | null;
    paintActive: boolean;
    selection: GridSelection | null;
    onSelectionChange: (sel: GridSelection | null) => void;
    onPaint: (row: number, col: number) => void;
}

function GeneratedGrid({ grid, tilesMap, tileSize, mode, paintTileId, paintActive, selection, onSelectionChange, onPaint }: GeneratedGridProps) {
    const displaySize = Math.min(Math.max(tileSize, 24), 64);
    const isDraggingRef = useRef(false);
    const anchorRef = useRef<{ row: number; col: number } | null>(null);
    const [liveSelection, setLiveSelection] = useState<GridSelection | null>(null);
    const isPaintingRef = useRef(false);
    const paintedRef = useRef<Set<string>>(new Set());

    const effectiveSel = liveSelection ?? selection;

    const makeSel = (a: { row: number; col: number }, b: { row: number; col: number }): GridSelection => ({
        r1: Math.min(a.row, b.row),
        r2: Math.max(a.row, b.row),
        c1: Math.min(a.col, b.col),
        c2: Math.max(a.col, b.col),
    });

    const inSel = (row: number, col: number) => !!effectiveSel && row >= effectiveSel.r1 && row <= effectiveSel.r2 && col >= effectiveSel.c1 && col <= effectiveSel.c2;

    const handleMouseDown = (row: number, col: number) => {
        if (mode === 'draw') {
            if (!paintActive) return;
            isPaintingRef.current = true;
            paintedRef.current = new Set([`${row},${col}`]);
            onPaint(row, col);
            return;
        }
        isDraggingRef.current = true;
        anchorRef.current = { row, col };
        setLiveSelection({ r1: row, r2: row, c1: col, c2: col });
    };

    const handleMouseEnter = (row: number, col: number) => {
        if (mode === 'draw') {
            if (!isPaintingRef.current || !paintActive) return;
            const key = `${row},${col}`;
            if (paintedRef.current.has(key)) return;
            paintedRef.current.add(key);
            onPaint(row, col);
            return;
        }
        if (!isDraggingRef.current || !anchorRef.current) return;
        setLiveSelection(makeSel(anchorRef.current, { row, col }));
    };

    const handleMouseUp = (row: number, col: number) => {
        if (mode === 'draw') {
            isPaintingRef.current = false;
            paintedRef.current.clear();
            return;
        }
        if (!isDraggingRef.current || !anchorRef.current) return;
        isDraggingRef.current = false;
        const sel = makeSel(anchorRef.current, { row, col });
        anchorRef.current = null;
        setLiveSelection(null);
        onSelectionChange(sel);
    };

    const handleGridMouseLeave = () => {
        isPaintingRef.current = false;
        paintedRef.current.clear();
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        if (liveSelection) onSelectionChange(liveSelection);
        setLiveSelection(null);
        anchorRef.current = null;
    };

    const paintPreviewTile = paintTileId ? tilesMap.get(paintTileId) : null;

    return (
        <ScrollArea>
            <Box
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${grid.cols}, ${displaySize}px)`,
                    gridTemplateRows: `repeat(${grid.rows}, ${displaySize}px)`,
                    gap: 0,
                    border: '1px solid var(--mantine-color-dark-4)',
                    width: 'fit-content',
                    userSelect: 'none',
                    cursor: mode === 'draw' ? (paintActive ? 'crosshair' : 'not-allowed') : 'crosshair',
                }}
                onMouseLeave={handleGridMouseLeave}
            >
                {grid.cells.flat().map((cell) => {
                    const tile = cell.tileId ? tilesMap.get(cell.tileId) : null;
                    const selected = mode === 'select' && inSel(cell.row, cell.col);

                    return (
                        <Box
                            key={`${cell.row}-${cell.col}`}
                            style={{
                                width: displaySize,
                                height: displaySize,
                                position: 'relative',
                                cursor: 'inherit',
                                outline: selected ? '2px solid rgba(99,179,237,0.9)' : undefined,
                                outlineOffset: -2,
                                zIndex: selected ? 1 : 0,
                                background: cell.possibilities.length === 0 ? 'rgba(255,0,0,0.4)' : undefined,
                            }}
                            onMouseDown={() => handleMouseDown(cell.row, cell.col)}
                            onMouseEnter={(e) => {
                                if (e.buttons === 1) handleMouseEnter(cell.row, cell.col);
                            }}
                            onMouseUp={() => handleMouseUp(cell.row, cell.col)}
                        >
                            {tile ? (
                                <img
                                    src={tile.imageUrl}
                                    alt={tile.name}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        imageRendering: 'pixelated',
                                        display: 'block',
                                        pointerEvents: 'none',
                                    }}
                                />
                            ) : (
                                <Box
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        background: 'var(--mantine-color-dark-6)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {!cell.collapsed && (
                                        <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
                                            {cell.possibilities.length}
                                        </Text>
                                    )}
                                </Box>
                            )}

                            {selected && (
                                <Box
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: 'rgba(99,179,237,0.2)',
                                        pointerEvents: 'none',
                                    }}
                                />
                            )}

                            {/* Paint preview overlay on hover in draw mode */}
                            {mode === 'draw' && paintPreviewTile && (
                                <Box
                                    className="paint-hover-overlay"
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        opacity: 0,
                                        pointerEvents: 'none',
                                        transition: 'opacity 0.1s',
                                    }}
                                />
                            )}
                        </Box>
                    );
                })}
            </Box>
        </ScrollArea>
    );
}

export function MapGeneratorPage() {
    const { userData, loading: authLoading } = useAuthContext();
    const theme = useMantineTheme();

    const [tilesets, setTilesets] = useState<DncWorldmapTilesetRecord[]>([]);
    const [tilesetsLoading, setTilesetsLoading] = useState(true);
    const [selectedTilesetId, setSelectedTilesetId] = useState<string | null>(null);
    const [tiles, setTiles] = useState<DncWorldmapTileRecord[]>([]);
    const [tilesLoading, setTilesLoading] = useState(false);

    const [gridCols, setGridCols] = useState<number | string>(20);
    const [gridRows, setGridRows] = useState<number | string>(15);
    const [borderGroundOnly, setBorderGroundOnly] = useState(false);
    const [borderLabel, setBorderLabel] = useState('ground');

    const [generating, setGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [generatedGrid, setGeneratedGrid] = useState<ReturnType<typeof createGrid> | null>(null);
    const [tilesMap, setTilesMap] = useState<Map<string, WFCTile>>(new Map());
    const [generationError, setGenerationError] = useState<string | null>(null);

    const [selection, setSelection] = useState<GridSelection | null>(null);
    const [fillLabel, setFillLabel] = useState<string | null>(null);
    const [gridMode, setGridMode] = useState<'select' | 'draw'>('select');
    const [paintDrawMode, setPaintDrawMode] = useState<'tile' | 'label'>('tile');
    const [paintTileId, setPaintTileId] = useState<string | null>(null);
    const [paintLabel, setPaintLabel] = useState<string | null>(null);

    const availableLabels = useMemo(() => {
        const labels = new Set<string>();
        for (const tile of tilesMap.values()) {
            const def = tile.definition;
            for (const side of [def.sockets.top, def.sockets.bottom, def.sockets.left, def.sockets.right]) {
                const arr = Array.isArray(side) ? side : [side];
                for (const l of arr) labels.add(l);
            }
        }
        return Array.from(labels).sort();
    }, [tilesMap]);

    const [adminOpened, { open: openAdmin, close: closeAdmin }] = useDisclosure(false);
    const [exporting, setExporting] = useState(false);

    const isAdmin = userData?.role === 'admin';

    const generatingRef = useRef(false);

    useEffect(() => {
        void (async () => {
            setTilesetsLoading(true);
            try {
                const list = await Hypb.pb.collection('dnc_worldmap_tilesets').getFullList<DncWorldmapTilesetRecord>();
                setTilesets(list);
            } finally {
                setTilesetsLoading(false);
            }
        })();
    }, []);

    useEffect(() => {
        if (!selectedTilesetId) {
            setTiles([]);
            return;
        }
        void (async () => {
            setTilesLoading(true);
            try {
                const list = await Hypb.pb.collection('dnc_worldmap_tiles').getFullList<DncWorldmapTileRecord>({ filter: `tileset_id = "${selectedTilesetId}"` });
                setTiles(list);
            } finally {
                setTilesLoading(false);
            }
        })();
    }, [selectedTilesetId]);

    if (!authLoading && !userData) {
        return <Navigate to="/login" replace />;
    }

    const selectedTileset = tilesets.find((t) => t.id === selectedTilesetId) ?? null;

    const buildTilesMap = (): Map<string, WFCTile> => {
        const map = new Map<string, WFCTile>();
        for (const tile of tiles) {
            const imgUrl = Hypb.pb.files.getURL(tile, tile.image ?? '');
            let def = tile.wfc_definition;
            if (!def || typeof def !== 'object' || !('sockets' in def)) {
                def = { weight: 1, sockets: { top: ['default'], bottom: ['default'], left: ['default'], right: ['default'] } };
            }
            map.set(tile.id, {
                id: tile.id,
                name: tile.name,
                imageUrl: imgUrl,
                definition: def as unknown as WFCTile['definition'],
            });
        }
        return map;
    };

    const handleGenerate = async () => {
        if (tiles.length === 0) {
            notifications.show({ message: 'No tiles in this tileset', color: 'red' });
            return;
        }

        const cols = Number(gridCols);
        const rows = Number(gridRows);
        if (!cols || !rows || cols < 1 || rows < 1) {
            notifications.show({ message: 'Invalid grid dimensions', color: 'red' });
            return;
        }

        setGenerating(true);
        generatingRef.current = true;
        setProgress(0);
        setGenerationError(null);

        await new Promise((r) => setTimeout(r, 10));

        const map = buildTilesMap();
        const tileIds = Array.from(map.keys());

        const grid = createGrid(rows, cols, tileIds);

        if (borderGroundOnly) {
            const label = borderLabel.trim() || 'ground';
            const groundTileIds = tileIds.filter((id) => {
                const def = map.get(id)?.definition;
                if (!def) return false;
                const sides = [def.sockets.top, def.sockets.bottom, def.sockets.left, def.sockets.right];
                return sides.every((s) => {
                    const arr = Array.isArray(s) ? s : [s];
                    return arr.length === 1 && arr[0] === label;
                });
            });
            if (groundTileIds.length === 0) {
                setGenerationError(`No tiles found where all 4 sockets are exclusively "${label}". Check the border label.`);
                setGenerating(false);
                generatingRef.current = false;
                return;
            }
            const isBorder = (r: number, c: number) => r === 0 || r === rows - 1 || c === 0 || c === cols - 1;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (isBorder(r, c)) {
                        grid.cells[r][c].possibilities = [...groundTileIds];
                    }
                }
            }
        }

        const success = runWFC(grid, map, {
            onProgress: (p) => setProgress(Math.round(p * 100)),
        });

        if (success) {
            setTilesMap(map);
            setGeneratedGrid(grid);
        } else {
            setGenerationError('Wave Function Collapse encountered a contradiction. Try again or adjust tile sockets.');
        }

        setProgress(100);
        setGenerating(false);
        generatingRef.current = false;
    };

    const handleRerollAll = async () => {
        if (tiles.length === 0 || !generatedGrid) return;

        setGenerating(true);
        setProgress(0);
        setGenerationError(null);

        await new Promise((r) => setTimeout(r, 10));

        const map = buildTilesMap();
        const tileIds = Array.from(map.keys());
        const cols = generatedGrid.cols;
        const rows = generatedGrid.rows;

        const grid = createGrid(rows, cols, tileIds);
        const success = runWFC(grid, map, {
            onProgress: (p) => setProgress(Math.round(p * 100)),
        });

        if (success) {
            setTilesMap(map);
            setGeneratedGrid(grid);
        } else {
            setGenerationError('Wave Function Collapse encountered a contradiction. Try again.');
        }

        setProgress(100);
        setGenerating(false);
    };

    const MAX_WFC_ATTEMPTS_FILL = 100;
    const MAX_WFC_ATTEMPTS_REROLL = 100;
    const MAX_WFC_ATTEMPTS_PAINT = 100;

    const cloneGrid = (g: WFCGrid): WFCGrid => ({
        rows: g.rows,
        cols: g.cols,
        cells: g.cells.map((r) => r.map((cell) => ({ ...cell, possibilities: [...cell.possibilities] }))),
    });

    const handleRerollSelection = async (sel: GridSelection) => {
        if (!generatedGrid || generating) return;

        setGenerating(true);
        setGenerationError(null);

        await new Promise((r) => setTimeout(r, 10));

        const cells: { row: number; col: number }[] = [];
        for (let r = sel.r1; r <= sel.r2; r++) {
            for (let c = sel.c1; c <= sel.c2; c++) {
                cells.push({ row: r, col: c });
            }
        }

        const tileIds = Array.from(tilesMap.keys());
        let success = false;
        let clonedGrid!: WFCGrid;
        for (let attempt = 0; attempt < MAX_WFC_ATTEMPTS_REROLL; attempt++) {
            clonedGrid = cloneGrid(generatedGrid);
            if (rerollCells(clonedGrid, tilesMap, cells, tileIds)) {
                success = true;
                break;
            }
        }

        if (success) {
            setGeneratedGrid(clonedGrid);
        } else {
            setGenerationError('Could not reroll this region without contradiction. Try a smaller area or "Reroll All".');
        }

        setGenerating(false);
    };

    const handleFillSelection = async (sel: GridSelection, label: string) => {
        if (!generatedGrid || generating) return;

        setGenerating(true);
        setGenerationError(null);

        await new Promise((r) => setTimeout(r, 10));

        const tileIds = Array.from(tilesMap.keys());
        const matchingIds = tileIds.filter((id) => {
            const def = tilesMap.get(id)?.definition;
            if (!def) return false;
            return [def.sockets.top, def.sockets.bottom, def.sockets.left, def.sockets.right].every((s) => {
                const arr = Array.isArray(s) ? s : [s];
                return arr.length === 1 && arr[0] === label;
            });
        });

        if (matchingIds.length === 0) {
            setGenerationError(`No tiles found where all 4 sockets are exclusively "${label}".`);
            setGenerating(false);
            return;
        }

        const cells: { row: number; col: number }[] = [];
        for (let r = sel.r1; r <= sel.r2; r++) {
            for (let c = sel.c1; c <= sel.c2; c++) {
                cells.push({ row: r, col: c });
            }
        }

        let success = false;
        let clonedGrid!: WFCGrid;
        for (let attempt = 0; attempt < MAX_WFC_ATTEMPTS_FILL; attempt++) {
            clonedGrid = cloneGrid(generatedGrid);
            if (fillRegion(clonedGrid, tilesMap, cells, matchingIds)) {
                success = true;
                break;
            }
        }

        if (success) {
            setGeneratedGrid(clonedGrid);
        } else {
            setGenerationError(`Fill with "${label}" produced an unresolvable contradiction after ${MAX_WFC_ATTEMPTS_FILL} attempts. Try a different area.`);
        }

        setGenerating(false);
    };

    const handlePaint = (row: number, col: number) => {
        if (!generatedGrid) return;

        let allowedCenterIds: string[];
        if (paintDrawMode === 'tile' && paintTileId) {
            allowedCenterIds = [paintTileId];
        } else if (paintDrawMode === 'label' && paintLabel) {
            const hint = selectedTileset?.draw_hints?.[paintLabel] ?? 'all';
            allowedCenterIds = getTilesForLabel(tilesMap, paintLabel, hint);
            if (allowedCenterIds.length === 0) return;

            const dirs = ['top', 'bottom', 'left', 'right'] as const;
            const offsets: Record<(typeof dirs)[number], [number, number]> = {
                top: [-1, 0],
                bottom: [1, 0],
                left: [0, -1],
                right: [0, 1],
            };
            const requiredDirs = new Set<(typeof dirs)[number]>();
            for (const dir of dirs) {
                const [dr, dc] = offsets[dir];
                const nr = row + dr;
                const nc = col + dc;
                if (nr < 0 || nr >= generatedGrid.rows || nc < 0 || nc >= generatedGrid.cols) continue;
                const nb = generatedGrid.cells[nr][nc];
                if (!nb.collapsed || !nb.tileId) continue;
                const nbTile = tilesMap.get(nb.tileId);
                if (!nbTile) continue;

                const nbFacing = nbTile.definition.sockets[OPPOSITE_DIR[dir]];
                const arr = Array.isArray(nbFacing) ? nbFacing : [nbFacing];
                if (arr.includes(paintLabel)) requiredDirs.add(dir);
            }

            const countLabel = (id: string) =>
                dirs.filter((d) => {
                    const s = tilesMap.get(id)?.definition.sockets[d];
                    const a = Array.isArray(s) ? s : [s ?? ''];
                    return a.includes(paintLabel);
                }).length;
            const countRequired = (id: string) =>
                [...requiredDirs].filter((d) => {
                    const s = tilesMap.get(id)?.definition.sockets[d];
                    const a = Array.isArray(s) ? s : [s ?? ''];
                    return a.includes(paintLabel);
                }).length;

            allowedCenterIds.sort((a, b) => {
                const reqDiff = countRequired(b) - countRequired(a);
                if (reqDiff !== 0) return reqDiff;
                if (requiredDirs.size === 0) {
                    return countLabel(b) - countLabel(a);
                }

                return countLabel(a) - countLabel(b);
            });

            if (allowedCenterIds.length > 0) {
                const topReq = countRequired(allowedCenterIds[0]);
                const topLbl = countLabel(allowedCenterIds[0]);
                allowedCenterIds = allowedCenterIds.filter((id) => {
                    if (countRequired(id) !== topReq) return false;
                    if (requiredDirs.size === 0) return countLabel(id) === topLbl;
                    return countLabel(id) === topLbl;
                });
            }
        } else {
            return;
        }

        for (let attempt = 0; attempt < MAX_WFC_ATTEMPTS_PAINT; attempt++) {
            const clonedGrid = cloneGrid(generatedGrid);
            if (paintRegion(clonedGrid, tilesMap, row, col, allowedCenterIds)) {
                setGeneratedGrid(clonedGrid);
                return;
            }
        }
    };

    const handleExtend = async (dir: 'north' | 'south' | 'east' | 'west') => {
        if (!generatedGrid || generating) return;

        setGenerating(true);
        setGenerationError(null);
        setProgress(0);

        await new Promise((r) => setTimeout(r, 10));

        const { rows, cols, cells } = generatedGrid;
        const tileIds = Array.from(tilesMap.keys());
        const amount = 1;

        const newRows = dir === 'north' || dir === 'south' ? rows + amount : rows;
        const newCols = dir === 'east' || dir === 'west' ? cols + amount : cols;
        const rowOffset = dir === 'north' ? amount : 0;
        const colOffset = dir === 'west' ? amount : 0;

        const newGrid = createGrid(newRows, newCols, tileIds);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const src = cells[r][c];
                const dst = newGrid.cells[r + rowOffset][c + colOffset];
                dst.collapsed = src.collapsed;
                dst.tileId = src.tileId;
                dst.possibilities = [...src.possibilities];
            }
        }

        if (!constrainFromCollapsed(newGrid, tilesMap)) {
            setGenerationError('Could not extend the map without contradiction.');
            setProgress(100);
            setGenerating(false);
            return;
        }

        const success = runWFC(newGrid, tilesMap, {
            onProgress: (p) => setProgress(Math.round(p * 100)),
        });

        if (success) {
            setGeneratedGrid(newGrid);
            setGridCols(newCols);
            setGridRows(newRows);
            if (selection) {
                setSelection({
                    r1: selection.r1 + rowOffset,
                    r2: selection.r2 + rowOffset,
                    c1: selection.c1 + colOffset,
                    c2: selection.c2 + colOffset,
                });
            }
        } else {
            setGenerationError('Could not extend the map without contradiction.');
        }

        setProgress(100);
        setGenerating(false);
    };

    const handleExportPng = async (scale: number) => {
        if (!generatedGrid || !selectedTileset) return;
        setExporting(true);
        try {
            const tileSize = selectedTileset.tile_size;
            const cellSize = Math.round(tileSize * scale);
            const width = generatedGrid.cols * cellSize;
            const height = generatedGrid.rows * cellSize;

            const uniqueIds = new Set<string>();
            for (const cell of generatedGrid.cells.flat()) {
                if (cell.tileId) uniqueIds.add(cell.tileId);
            }
            const imageCache = new Map<string, HTMLImageElement>();
            await Promise.all(
                Array.from(uniqueIds).map(
                    (id) =>
                        new Promise<void>((resolve) => {
                            const tile = tilesMap.get(id);
                            if (!tile) {
                                resolve();
                                return;
                            }
                            const img = new Image();
                            img.crossOrigin = 'anonymous';
                            img.onload = () => {
                                imageCache.set(id, img);
                                resolve();
                            };
                            img.onerror = () => resolve();
                            img.src = tile.imageUrl;
                        })
                )
            );

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d')!;
            ctx.imageSmoothingEnabled = false;

            for (const cell of generatedGrid.cells.flat()) {
                if (!cell.tileId) continue;
                const img = imageCache.get(cell.tileId);
                if (!img) continue;
                ctx.drawImage(img, cell.col * cellSize, cell.row * cellSize, cellSize, cellSize);
            }

            await new Promise<void>((resolve) => {
                canvas.toBlob((blob) => {
                    if (!blob) {
                        resolve();
                        return;
                    }
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `map_${scale}x.png`;
                    a.click();
                    URL.revokeObjectURL(url);
                    resolve();
                }, 'image/png');
            });
        } finally {
            setExporting(false);
        }
    };

    return (
        <>
            <Container size="xl" py="xl">
                <Group justify="space-between" mb="xl">
                    <div>
                        <Title order={2}>Map Generator</Title>
                        <Text c="dimmed" size="sm">
                            Generate procedural tile maps using Wave Function Collapse.
                        </Text>
                    </div>
                    {isAdmin && (
                        <Button variant="outline" leftSection={<IconEdit size={16} />} onClick={openAdmin}>
                            Manage Tilesets
                        </Button>
                    )}
                </Group>

                <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
                    <Stack style={{ gridColumn: 'span 1' }}>
                        <Paper withBorder p="md">
                            <Stack>
                                <Title order={5}>1. Choose a tileset</Title>
                                {tilesetsLoading ? (
                                    <Center py="md">
                                        <Loader size="sm" />
                                    </Center>
                                ) : tilesets.length === 0 ? (
                                    <Stack align="center" gap="xs" py="md">
                                        <Text c="dimmed" size="sm" ta="center">
                                            No tilesets available.
                                            {isAdmin ? ' Create one using "Manage Tilesets".' : ' Ask an admin to create one.'}
                                        </Text>
                                    </Stack>
                                ) : (
                                    <Select
                                        placeholder="Select a tileset…"
                                        data={tilesets.map((t) => ({ value: t.id, label: t.name }))}
                                        value={selectedTilesetId}
                                        onChange={(v) => {
                                            setSelectedTilesetId(v);
                                            setGeneratedGrid(null);
                                        }}
                                    />
                                )}

                                {selectedTileset && (
                                    <>
                                        {selectedTileset.description && (
                                            <Text size="sm" c="dimmed">
                                                {selectedTileset.description}
                                            </Text>
                                        )}
                                        <Badge variant="light">Tile size: {selectedTileset.tile_size}px</Badge>
                                    </>
                                )}
                            </Stack>
                        </Paper>

                        {selectedTilesetId && (
                            <Paper withBorder p="md">
                                <Stack>
                                    <Title order={5}>2. Configure grid</Title>
                                    <Group grow>
                                        <NumberInput label="Columns" min={1} max={60} value={gridCols} onChange={(v) => setGridCols(v)} />
                                        <NumberInput label="Rows" min={1} max={60} value={gridRows} onChange={(v) => setGridRows(v)} />
                                    </Group>

                                    <Switch
                                        label="Force ground-only border"
                                        description="Restrict edge tiles to tiles where all 4 sockets are the border label."
                                        checked={borderGroundOnly}
                                        onChange={(e) => setBorderGroundOnly(e.currentTarget.checked)}
                                    />

                                    {borderGroundOnly && (
                                        <TextInput
                                            label="Border socket label"
                                            description='Socket label used to identify ground tiles (e.g. "ground").'
                                            value={borderLabel}
                                            onChange={(e) => setBorderLabel(e.currentTarget.value)}
                                        />
                                    )}

                                    <Button
                                        leftSection={<IconDice size={16} />}
                                        onClick={() => void handleGenerate()}
                                        loading={generating}
                                        disabled={tilesLoading || tiles.length === 0}
                                    >
                                        {generatedGrid ? 'Regenerate' : 'Generate'}
                                    </Button>

                                    {generating && <Progress value={progress} animated size="sm" />}

                                    {generationError && (
                                        <Text c="red" size="sm">
                                            {generationError}
                                        </Text>
                                    )}
                                </Stack>
                            </Paper>
                        )}

                        {/* Tile preview */}
                        {selectedTilesetId && (
                            <Paper withBorder p="md">
                                <Title order={5} mb="sm">
                                    Tiles{' '}
                                    {tilesLoading ? (
                                        <Loader size={12} />
                                    ) : (
                                        <Badge variant="light" size="sm">
                                            {tiles.length}
                                        </Badge>
                                    )}
                                </Title>
                                {tilesLoading ? (
                                    <Center py="md">
                                        <Loader size="sm" />
                                    </Center>
                                ) : (
                                    <SimpleGrid cols={8} spacing="xs">
                                        {tiles.map((tile) => (
                                            <Tooltip key={tile.id} label={tile.name} openDelay={300}>
                                                <Box>
                                                    {tile.image ? (
                                                        <img
                                                            src={Hypb.pb.files.getURL(tile, tile.image)}
                                                            alt={tile.name}
                                                            style={{
                                                                width: '100%',
                                                                aspectRatio: '1',
                                                                objectFit: 'cover',
                                                                imageRendering: 'pixelated',
                                                                borderRadius: theme.radius.xs,
                                                                display: 'block',
                                                            }}
                                                        />
                                                    ) : (
                                                        <Box
                                                            style={{
                                                                width: '100%',
                                                                aspectRatio: '1',
                                                                background: 'var(--mantine-color-dark-5)',
                                                                borderRadius: theme.radius.xs,
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                            </Tooltip>
                                        ))}
                                    </SimpleGrid>
                                )}
                            </Paper>
                        )}
                    </Stack>

                    <Box style={{ gridColumn: 'span 2' }}>
                        {!generatedGrid ? (
                            <Center h={400}>
                                <Stack align="center" gap="xs">
                                    <IconDice size={48} color="gray" style={{ opacity: 0.3 }} />
                                    <Text c="dimmed" size="sm">
                                        {selectedTilesetId ? 'Configure and generate your map.' : 'Select a tileset to get started.'}
                                    </Text>
                                </Stack>
                            </Center>
                        ) : (
                            <Stack>
                                <Group gap="xs" wrap="wrap">
                                    <SegmentedControl
                                        size="xs"
                                        value={gridMode}
                                        onChange={(v) => {
                                            setGridMode(v as 'select' | 'draw');
                                            setSelection(null);
                                        }}
                                        data={[
                                            {
                                                value: 'select',
                                                label: (
                                                    <Group gap={4} wrap="nowrap">
                                                        <IconDice size={13} />
                                                        Select
                                                    </Group>
                                                ),
                                            },
                                            {
                                                value: 'draw',
                                                label: (
                                                    <Group gap={4} wrap="nowrap">
                                                        <IconPencil size={13} />
                                                        Draw
                                                    </Group>
                                                ),
                                            },
                                        ]}
                                    />
                                    <Text size="xs" c="dimmed">
                                        Extend:
                                    </Text>
                                    <Tooltip label="Add row to the north">
                                        <ActionIcon size="sm" variant="default" onClick={() => void handleExtend('north')} loading={generating}>
                                            <IconArrowUp size={12} />
                                        </ActionIcon>
                                    </Tooltip>
                                    <Tooltip label="Add row to the south">
                                        <ActionIcon size="sm" variant="default" onClick={() => void handleExtend('south')} loading={generating}>
                                            <IconArrowDown size={12} />
                                        </ActionIcon>
                                    </Tooltip>
                                    <Tooltip label="Add column to the west">
                                        <ActionIcon size="sm" variant="default" onClick={() => void handleExtend('west')} loading={generating}>
                                            <IconArrowLeft size={12} />
                                        </ActionIcon>
                                    </Tooltip>
                                    <Tooltip label="Add column to the east">
                                        <ActionIcon size="sm" variant="default" onClick={() => void handleExtend('east')} loading={generating}>
                                            <IconArrowRight size={12} />
                                        </ActionIcon>
                                    </Tooltip>
                                    <Text size="xs" c="dimmed" ml="xs">
                                        {generatedGrid.rows}×{generatedGrid.cols}
                                    </Text>
                                    <Group gap="xs" ml="auto">
                                        <Button size="xs" variant="outline" leftSection={<IconRefresh size={14} />} onClick={() => void handleRerollAll()} loading={generating}>
                                            Reroll All
                                        </Button>
                                        <Menu shadow="md" position="bottom-end">
                                            <Menu.Target>
                                                <Tooltip label="Export as PNG">
                                                    <ActionIcon size="sm" variant="default" loading={exporting} disabled={generating}>
                                                        <IconDownload size={14} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            </Menu.Target>
                                            <Menu.Dropdown>
                                                <Menu.Label>Export PNG</Menu.Label>
                                                {([0.25, 0.5, 1, 2, 4] as const).map((scale) => (
                                                    <Menu.Item key={scale} leftSection={<IconDownload size={14} />} onClick={() => void handleExportPng(scale)}>
                                                        {scale}× ({Math.round((selectedTileset?.tile_size ?? 32) * scale * generatedGrid.cols)}×
                                                        {Math.round((selectedTileset?.tile_size ?? 32) * scale * generatedGrid.rows)} px)
                                                    </Menu.Item>
                                                ))}
                                            </Menu.Dropdown>
                                        </Menu>
                                    </Group>
                                </Group>

                                {gridMode === 'draw' && (
                                    <Paper withBorder p="xs">
                                        <Group gap="xs" mb="xs">
                                            <IconPencil size={13} />
                                            <Text size="xs" fw={500}>
                                                Draw mode
                                            </Text>
                                            <SegmentedControl
                                                size="xs"
                                                ml="auto"
                                                value={paintDrawMode}
                                                onChange={(v) => setPaintDrawMode(v as 'tile' | 'label')}
                                                data={[
                                                    { value: 'tile', label: 'Tile' },
                                                    { value: 'label', label: 'Type' },
                                                ]}
                                            />
                                        </Group>

                                        {paintDrawMode === 'tile' && (
                                            <>
                                                {paintTileId && (
                                                    <Text size="xs" c="dimmed" mb={4}>
                                                        {tilesMap.get(paintTileId)?.name}
                                                    </Text>
                                                )}
                                                <ScrollArea h={80}>
                                                    <Group gap={4} wrap="nowrap">
                                                        {Array.from(tilesMap.values()).map((t) => (
                                                            <Tooltip key={t.id} label={t.name} openDelay={300}>
                                                                <Box
                                                                    onClick={() => setPaintTileId(t.id)}
                                                                    style={{
                                                                        width: 48,
                                                                        height: 48,
                                                                        flexShrink: 0,
                                                                        cursor: 'pointer',
                                                                        borderRadius: 4,
                                                                        outline: paintTileId === t.id ? '2px solid var(--mantine-color-orange-5)' : '2px solid transparent',
                                                                        outlineOffset: 1,
                                                                        overflow: 'hidden',
                                                                    }}
                                                                >
                                                                    <img
                                                                        src={t.imageUrl}
                                                                        alt={t.name}
                                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated', display: 'block' }}
                                                                    />
                                                                </Box>
                                                            </Tooltip>
                                                        ))}
                                                    </Group>
                                                </ScrollArea>
                                            </>
                                        )}

                                        {paintDrawMode === 'label' && (
                                            <Select
                                                size="xs"
                                                placeholder="Pick a type to paint…"
                                                data={availableLabels.map((l) => ({ value: l, label: l }))}
                                                value={paintLabel}
                                                onChange={setPaintLabel}
                                                clearable
                                            />
                                        )}
                                    </Paper>
                                )}

                                {gridMode === 'select' && selection && (
                                    <Paper withBorder p="xs">
                                        <Group gap="xs" wrap="wrap">
                                            <Text size="xs" c="dimmed">
                                                {selection.r2 - selection.r1 + 1}×{selection.c2 - selection.c1 + 1} selected
                                            </Text>

                                            <Button size="xs" leftSection={<IconRefresh size={13} />} onClick={() => void handleRerollSelection(selection)} loading={generating}>
                                                Reroll
                                            </Button>

                                            <Group gap={4} wrap="nowrap">
                                                <Select
                                                    size="xs"
                                                    placeholder="Fill with…"
                                                    data={availableLabels.map((l) => ({ value: l, label: l }))}
                                                    value={fillLabel}
                                                    onChange={setFillLabel}
                                                    w={130}
                                                    clearable
                                                />
                                                <Button
                                                    size="xs"
                                                    leftSection={<IconPaint size={13} />}
                                                    disabled={!fillLabel || generating}
                                                    loading={generating}
                                                    onClick={() => fillLabel && void handleFillSelection(selection, fillLabel)}
                                                >
                                                    Fill
                                                </Button>
                                            </Group>

                                            <Button size="xs" variant="subtle" color="gray" onClick={() => setSelection(null)} disabled={generating} ml="auto">
                                                Clear
                                            </Button>
                                        </Group>
                                    </Paper>
                                )}

                                <GeneratedGrid
                                    grid={generatedGrid}
                                    tilesMap={tilesMap}
                                    tileSize={selectedTileset?.tile_size ?? 32}
                                    mode={gridMode}
                                    paintTileId={paintTileId}
                                    paintActive={paintDrawMode === 'tile' ? !!paintTileId : !!paintLabel}
                                    selection={gridMode === 'select' ? selection : null}
                                    onSelectionChange={setSelection}
                                    onPaint={handlePaint}
                                />
                            </Stack>
                        )}
                    </Box>
                </SimpleGrid>
            </Container>

            <Modal opened={adminOpened} onClose={closeAdmin} title="Manage Tilesets" size="xl" centered>
                <TilesetManager />
            </Modal>
        </>
    );
}
