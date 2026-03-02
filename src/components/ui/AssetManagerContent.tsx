import { ActionIcon, Button, Center, Group, Image, Loader, Table, Tabs, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import type { RecordModel } from 'pocketbase';
import { useEffect, useState } from 'react';
import { createAsset, createAssetCategory, deleteAsset, deleteAssetCategory, fetchAssets, getFileUrl, updateAsset, updateAssetCategory } from '../../lib/api';
import type { DncWorldmapAssetCategoryRecord, DncWorldmapAssetRecord } from '../../types/database';
import AssetForm from './AssetForm';
import CategoryForm from './CategoryForm';

export function AssetManagerContent() {
    const [loading, setLoading] = useState(true);
    const [assets, setAssets] = useState<DncWorldmapAssetRecord[]>([]);
    const [categories, setCategories] = useState<DncWorldmapAssetCategoryRecord[]>([]);
    const [activeTab, setActiveTab] = useState<string>('assets');

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetchAssets();
            setAssets(res.assets);
            setCategories(res.categories);
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
                    onSubmit={async (data) => {
                        if (!data.name || !data.file) return;
                        await createAsset({
                            name: data.name,
                            file: data.file,
                            category: data.category,
                            tags: data.tags,
                            width: data.width,
                            height: data.height,
                        });
                        modals.closeAll();
                        await load();
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
                    onSubmit={async (data) => {
                        await updateAsset(asset.id, data);
                        modals.closeAll();
                        await load();
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
                await load();
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
                            <Button leftSection={<IconPlus size={14} />} onClick={handleCreateAsset}>
                                Ajouter
                            </Button>
                        </Group>
                        <Table highlightOnHover verticalSpacing="sm">
                            <thead>
                                <tr>
                                    <th>Preview</th>
                                    <th>Name</th>
                                    <th>Category</th>
                                    <th>Tags</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {assets.map((a) => (
                                    <tr key={a.id}>
                                        <td>
                                            <Image src={getFileUrl(a as unknown as RecordModel, a.file)} width={50} height={50} />
                                        </td>
                                        <td>{a.name}</td>
                                        <td>{categories.find((c) => c.id === a.category)?.name || ''}</td>
                                        <td>{(a.tags || []).join(', ')}</td>
                                        <td>
                                            <Group gap="xs" align="right">
                                                <ActionIcon onClick={() => handleEditAsset(a)}>
                                                    <IconEdit size={16} />
                                                </ActionIcon>
                                                <ActionIcon color="red" onClick={() => handleDeleteAsset(a)}>
                                                    <IconTrash size={16} />
                                                </ActionIcon>
                                            </Group>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Tabs.Panel>

                    <Tabs.Panel value="categories" pt="md">
                        <Group align="right" mb="sm">
                            <Button leftSection={<IconPlus size={14} />} onClick={handleCreateCategory}>
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
                                                    <IconEdit size={16} />
                                                </ActionIcon>
                                                <ActionIcon color="red" onClick={() => handleDeleteCategory(c)}>
                                                    <IconTrash size={16} />
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
