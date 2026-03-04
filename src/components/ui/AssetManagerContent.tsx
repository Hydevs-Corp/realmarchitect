import { ActionIcon, Button, Center, Group, Loader, Table, Tabs, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { createAsset, createAssetCategory, deleteAsset, deleteAssetCategory, fetchAssetCategories, updateAsset, updateAssetCategory } from '../../lib/api';
import type { DncWorldmapAssetCategoryRecord, DncWorldmapAssetRecord } from '../../types/database';
import AssetForm from './AssetForm';
import AssetGrid from './AssetGrid';
import CategoryForm from './CategoryForm';

export function AssetManagerContent() {
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<DncWorldmapAssetCategoryRecord[]>([]);
    const [activeTab, setActiveTab] = useState<string>('assets');
    const [refreshKey, setRefreshKey] = useState(0);

    const refresh = () => setRefreshKey((k) => k + 1);

    const load = async () => {
        setLoading(true);
        try {
            setCategories(await fetchAssetCategories());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    const handleCreateCategory = () => {
        modals.open({
            title: 'New category',
            children: (
                <CategoryForm
                    onSubmit={async (name) => {
                        await createAssetCategory(name);
                        modals.closeAll();
                        await load();
                    }}
                />
            ),
        });
    };

    const handleEditCategory = (cat: DncWorldmapAssetCategoryRecord) => {
        modals.open({
            title: 'Edit category',
            children: (
                <CategoryForm
                    initial={cat.name}
                    onSubmit={async (name) => {
                        await updateAssetCategory(cat.id, name);
                        modals.closeAll();
                        await load();
                    }}
                />
            ),
        });
    };

    const handleDeleteCategory = async (cat: DncWorldmapAssetCategoryRecord) => {
        modals.openConfirmModal({
            title: 'Delete category',
            children: (
                <Text size="sm">
                    This action will permanently delete the category <strong>{cat.name}</strong>.
                </Text>
            ),
            labels: { confirm: 'Delete', cancel: 'Cancel' },
            confirmProps: { color: 'red' },
            onConfirm: async () => {
                await deleteAssetCategory(cat.id);
                await load();
            },
        });
    };

    const handleCreateAsset = () => {
        modals.open({
            title: 'New asset',
            size: 'lg',
            children: (
                <AssetForm
                    categories={categories}
                    onSubmit={async (items) => {
                        for (const item of items) {
                            if (!item.name || !item.file) continue;
                            await createAsset({
                                name: item.name,
                                file: item.file,
                                category: item.category,
                                tags: item.tags,
                                width: item.width,
                                height: item.height,
                            });
                        }
                        modals.closeAll();
                        refresh();
                    }}
                />
            ),
        });
    };

    const handleEditAsset = (asset: DncWorldmapAssetRecord) => {
        modals.open({
            title: 'Edit asset',
            size: 'lg',
            children: (
                <AssetForm
                    categories={categories}
                    initial={asset}
                    onSubmit={async (items) => {
                        const data = items[0];
                        if (!data) return;
                        await updateAsset(asset.id, data);
                        modals.closeAll();
                        refresh();
                    }}
                />
            ),
        });
    };

    const handleDeleteAsset = (asset: DncWorldmapAssetRecord) => {
        modals.openConfirmModal({
            title: 'Delete asset',
            children: (
                <Text size="sm">
                    This action will permanently delete the asset <strong>{asset.name}</strong>.
                </Text>
            ),
            labels: { confirm: 'Delete', cancel: 'Cancel' },
            confirmProps: { color: 'red' },
            onConfirm: async () => {
                await deleteAsset(asset.id);
                refresh();
            },
        });
    };

    return (
        <>
            {loading ? (
                <Center style={{ height: 200 }}>
                    <Loader />
                </Center>
            ) : (
                <Tabs value={activeTab} onChange={(v) => v && setActiveTab(v)}>
                    <Tabs.List>
                        <Tabs.Tab value="assets">Assets</Tabs.Tab>
                        <Tabs.Tab value="categories">Categories</Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="assets" pt="md">
                        <Group align="right" mb="sm">
                            <Button leftSection={<IconPlus />} onClick={handleCreateAsset}>
                                Ajouter
                            </Button>
                        </Group>
                        <AssetGrid
                            categories={categories}
                            refreshKey={refreshKey}
                            renderActions={(a) => (
                                <Group gap="xs" justify="flex-end">
                                    <ActionIcon size="sm" onClick={() => handleEditAsset(a)}>
                                        <IconEdit size={14} />
                                    </ActionIcon>
                                    <ActionIcon size="sm" color="red" onClick={() => handleDeleteAsset(a)}>
                                        <IconTrash size={14} />
                                    </ActionIcon>
                                </Group>
                            )}
                        />
                    </Tabs.Panel>

                    <Tabs.Panel value="categories" pt="md">
                        <Group align="right" mb="sm">
                            <Button leftSection={<IconPlus />} onClick={handleCreateCategory}>
                                Ajouter
                            </Button>
                        </Group>
                        <Table highlightOnHover verticalSpacing="sm">
                            <thead>
                                <tr>
                                    <th>Nom</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map((c) => (
                                    <tr key={c.id}>
                                        <td>{c.name}</td>
                                        <td>
                                            <Group gap="xs" align="right">
                                                <ActionIcon onClick={() => handleEditCategory(c)}>
                                                    <IconEdit />
                                                </ActionIcon>
                                                <ActionIcon color="red" onClick={() => handleDeleteCategory(c)}>
                                                    <IconTrash />
                                                </ActionIcon>
                                            </Group>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Tabs.Panel>
                </Tabs>
            )}
        </>
    );
}

export default AssetManagerContent;
