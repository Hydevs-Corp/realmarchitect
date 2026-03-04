import { Badge, Card, Center, Group, Image, Loader, MultiSelect, Pagination, Select, SimpleGrid, Text, TextInput } from '@mantine/core';
import type { RecordModel } from 'pocketbase';
import { useEffect, useState } from 'react';
import { fetchAllAssetTags, fetchAssetsPage, getFileUrl } from '../../lib/api';
import type { DncWorldmapAssetCategoryRecord, DncWorldmapAssetRecord } from '../../types/database';

const PER_PAGE = 20;

const ORDER_OPTIONS = [
    { value: 'name-asc', label: 'Name A→Z' },
    { value: 'name-desc', label: 'Name Z→A' },
    { value: 'category-asc', label: 'Category A→Z' },
    { value: 'category-desc', label: 'Category Z→A' },
];

interface AssetGridProps {
    categories: DncWorldmapAssetCategoryRecord[];
    renderActions: (asset: DncWorldmapAssetRecord) => React.ReactNode;
    /** Increment to trigger a refetch (e.g. after create/edit/delete). */
    refreshKey?: number;
}

export default function AssetGrid({ categories, renderActions, refreshKey = 0 }: AssetGridProps) {
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [category, setCategory] = useState<string | null>(null);
    const [tagFilter, setTagFilter] = useState<string[]>([]);
    const [order, setOrder] = useState<string>('name-asc');
    const [page, setPage] = useState(1);

    const [items, setItems] = useState<DncWorldmapAssetRecord[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);
    const [allTags, setAllTags] = useState<string[]>([]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        void fetchAllAssetTags().then(setAllTags);
    }, [refreshKey]);

    useEffect(() => {
        let mounted = true;
        void (async () => {
            setLoading(true);
            try {
                const result = await fetchAssetsPage({
                    page,
                    perPage: PER_PAGE,
                    query: debouncedQuery,
                    categoryId: category,
                    tags: tagFilter,
                    sort: order,
                });
                if (!mounted) return;
                setItems(result.items);
                setTotalPages(result.totalPages);
                setTotalItems(result.totalItems);
            } catch (e) {
                console.error('Failed to fetch assets:', e);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [page, debouncedQuery, category, tagFilter, order, refreshKey]);

    return (
        <>
            <Group align="flex-end" mb="md" wrap="wrap">
                <TextInput placeholder="Search by name or tag" value={query} onChange={(e) => setQuery(e.currentTarget.value)} style={{ flex: 2, minWidth: 160 }} />
                <Select
                    placeholder="Category"
                    data={categories.map((c) => ({ value: c.id, label: c.name }))}
                    value={category}
                    onChange={(v) => {
                        setCategory(v);
                        setPage(1);
                    }}
                    clearable
                    style={{ flex: 1, minWidth: 140 }}
                />
                <MultiSelect
                    placeholder="Tags"
                    data={allTags}
                    value={tagFilter}
                    onChange={(v) => {
                        setTagFilter(v);
                        setPage(1);
                    }}
                    searchable
                    style={{ flex: 1, minWidth: 140 }}
                />
                <Select
                    placeholder="Order"
                    data={ORDER_OPTIONS}
                    value={order}
                    onChange={(v) => {
                        if (v) {
                            setOrder(v);
                            setPage(1);
                        }
                    }}
                    style={{ flex: 1, minWidth: 140 }}
                />
            </Group>

            {loading ? (
                <Center style={{ height: 200 }}>
                    <Loader />
                </Center>
            ) : (
                <>
                    <Text size="xs" c="dimmed" mb="sm">
                        {totalItems} asset{totalItems !== 1 ? 's' : ''}
                    </Text>
                    <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="md">
                        {items.map((a) => (
                            <Card key={a.id} withBorder radius="md" p="sm">
                                <Card.Section bg="white" p={0}>
                                    <Image src={getFileUrl(a as unknown as RecordModel, a.file)} height={120} fit="contain" />
                                </Card.Section>
                                <Text fw={600} mt="sm" size="sm" lineClamp={1}>
                                    {a.name || '—'}
                                </Text>
                                <Group gap={4} align="center" mb={4}>
                                    <Text size="xs" c="dimmed">
                                        {categories.find((c) => c.id === a.category)?.name || ''}
                                    </Text>
                                    {a.width && a.height ? (
                                        <Text size="xs" c="dimmed">
                                            · {a.width}×{a.height}
                                        </Text>
                                    ) : null}
                                </Group>
                                <Group gap={4} wrap="wrap" mb="xs">
                                    {(a.tags || []).map((tag) => (
                                        <Badge key={tag} size="xs" variant="light">
                                            {tag}
                                        </Badge>
                                    ))}
                                </Group>
                                {renderActions(a)}
                            </Card>
                        ))}
                    </SimpleGrid>

                    {totalPages > 1 && (
                        <Group justify="center" mt="lg">
                            <Pagination value={page} onChange={setPage} total={totalPages} />
                        </Group>
                    )}
                </>
            )}
        </>
    );
}
