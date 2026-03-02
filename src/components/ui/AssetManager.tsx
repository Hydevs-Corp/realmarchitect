import { Modal } from '@mantine/core';
import AssetManagerContent from './AssetManagerContent';

interface AssetManagerProps {
    opened: boolean;
    onClose: () => void;
}

export function AssetManager({ opened, onClose }: AssetManagerProps) {
    return (
        <Modal opened={opened} onClose={onClose} size="xl" title="Asset management">
            <AssetManagerContent />
        </Modal>
    );
}

export { default as AssetManagerContent } from './AssetManagerContent';

export default AssetManager;
