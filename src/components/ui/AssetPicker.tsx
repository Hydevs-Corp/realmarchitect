import { Button, Center, Loader, Modal } from '@mantine/core';
import { useEffect, useState } from 'react';
import { fetchAssetCategories } from '../../lib/api';
import type { DncWorldmapAssetCategoryRecord, DncWorldmapAssetRecord } from '../../types/database';
import AssetGrid from './AssetGrid';

interface AssetPickerProps {
    opened: boolean;
    onClose: () => void;
    onSelect: (asset: DncWorldmapAssetRecord) => void;
}

export default function AssetPicker({ opened, onClose, onSelect }: AssetPickerProps) {
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<DncWorldmapAssetCategoryRecord[]>([]);
    useEffect(() => {
        let mounted = true;
        void (async () => {
            setLoading(true);
            try {
                const cats = await fetchAssetCategories();
                if (mounted) setCategories(cats);
            } catch (err) {
                console.error('Failed to load categories:', err);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [opened]);

    return (
        <Modal fullScreen opened={opened} onClose={onClose} title="Choose an asset" zIndex={3000} size="100%" styles={{ content: { height: '100svh' } }}>
            {loading ? (
                <Center style={{ height: 300 }}>
                    <Loader />
                </Center>
            ) : (
                <AssetGrid
                    categories={categories}
                    renderActions={(a) => (
                        <Button
                            size="xs"
                            fullWidth
                            onClick={() => {
                                onSelect(a);
                                onClose();
                            }}
                        >
                            Choose
                        </Button>
                    )}
                />
            )}
        </Modal>
    );
}
