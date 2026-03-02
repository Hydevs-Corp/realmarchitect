import { useEffect, useMemo, useState } from 'react';
import { Modal, TextInput, Select, MultiSelect, Group, Button, Image, SimpleGrid, Card, Text, Loader, Center, ScrollArea, Badge } from '@mantine/core';
import type { DncWorldmapAssetRecord, DncWorldmapAssetCategoryRecord } from '../../types/database';
import { fetchAssets, getFileUrl } from '../../lib/api';
import type { RecordModel } from 'pocketbase';

interface AssetPickerProps {
    opened: boolean;
    onClose: () => void;
    onSelect: (asset: DncWorldmapAssetRecord) => void;
}

export default function AssetPicker({ opened, onClose, onSelect }: AssetPickerProps) {
    const [loading, setLoading] = useState(true);
    const [assets, setAssets] = useState<DncWorldmapAssetRecord[]>([]);
    const [categories, setCategories] = useState<DncWorldmapAssetCategoryRecord[]>([]);
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<string | null>(null);
    const [tagFilter, setTagFilter] = useState<string[]>([]);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        const load = async () => {
            try {
                const res = await fetchAssets();
                if (!mounted) return;
                setAssets(res.assets);
                setCategories(res.categories);
            } catch (err) {
                console.error('Failed to load assets:', err);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        void load();
        return () => {
            mounted = false;
        };
    }, [opened]);

    const allTags = useMemo(() => {
        const s = new Set<string>();
        assets.forEach((a) => (a.tags || []).forEach((t) => s.add(t)));
        return Array.from(s).sort();
    }, [assets]);

    const filtered = assets.filter((a) => {
        if (category && a.category !== category) return false;
        if (tagFilter.length > 0) {
            const tags = a.tags || [];
            if (!tagFilter.every((t) => tags.includes(t))) return false;
        }
        if (query.trim()) {
            const q = query.toLowerCase();
            if (!(a.name?.toLowerCase().includes(q) || (a.tags || []).some((t) => t.toLowerCase().includes(q)))) return false;
        }
        return true;
    });

    return (
        <Modal opened={opened} onClose={onClose} title="Choose an asset" size="100%" styles={{ content: { height: '100svh' } }}>
            {loading ? (
                <Center style={{ height: 300 }}>
                    <Loader />
                </Center>
            ) : (
                <div style={{ height: '80vh', display: 'flex', flexDirection: 'column' }}>
                    <Group align="flex-start" mb="sm">
                        <TextInput placeholder="Search by name or tag" value={query} onChange={(e) => setQuery(e.currentTarget.value)} style={{ flex: 1 }} />
                        <Select
                            placeholder="Category"
                            data={[{ value: '', label: 'Toutes' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
                            value={category ?? ''}
                            onChange={(v) => setCategory(v && v !== '' ? v : null)}
                            style={{ minWidth: 200 }}
                            clearable
                        />
                        <MultiSelect placeholder="Filtrer par tags" data={allTags} value={tagFilter} onChange={setTagFilter} style={{ minWidth: 200 }} searchable />
                    </Group>

                    <ScrollArea style={{ flex: 1 }}>
                        <SimpleGrid cols={4} spacing="md">
                            {filtered.map((a) => (
                                <Card key={a.id} shadow="sm" padding="sm" radius="sm">
                                    <Card.Section>
                                        <Image src={getFileUrl(a as unknown as RecordModel, a.file)} height={140} />
                                    </Card.Section>
                                    <Group justify="space-between" align="flex-start" mt="sm">
                                        <div style={{ flex: 1 }}>
                                            <Text fw={600} size="sm" lineClamp={1}>
                                                {a.name || '—'}
                                            </Text>
                                            <Text size="xs" color="dimmed">
                                                {a.width}×{a.height}
                                            </Text>
                                            <div style={{ marginTop: 6 }}>
                                                {(a.tags || []).slice(0, 3).map((t) => (
                                                    <Badge key={t} mr={6} variant="light">
                                                        {t}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                        <div style={{ marginLeft: 8 }}>
                                            <Button
                                                size="xs"
                                                onClick={() => {
                                                    onSelect(a);
                                                    onClose();
                                                }}
                                            >
                                                Choisir
                                            </Button>
                                        </div>
                                    </Group>
                                </Card>
                            ))}
                        </SimpleGrid>
                    </ScrollArea>
                </div>
            )}
        </Modal>
    );
}
