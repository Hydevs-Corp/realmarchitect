import { modals } from '@mantine/modals';
import { useNavigate } from 'react-router';
import { Hypb } from '@hydevs/hypb';
import MapForm from '../components/ui/MapForm';
import { addMapMember } from '../lib/api';
import type { DncWorldmapMapRecord } from '../types/database';

export function useCreateMapModal() {
    const navigate = useNavigate();

    function openCreateMapModal() {
        modals.open({
            title: 'Create a new map',
            centered: true,
            size: 'lg',
            children: (
                <MapForm
                    onSubmit={async (values) => {
                        try {
                            const newMap = await Hypb.pb.collection('dnc_worldmap_maps').create<DncWorldmapMapRecord>({
                                ...values,
                                owner: Hypb.pb.authStore.model?.id,
                            });
                            await addMapMember(newMap.id, Hypb.pb.authStore.model!.id, 'owner');
                            modals.closeAll();
                            navigate(`/map/${newMap.id}`);
                        } catch (e) {
                            console.error(e);
                        }
                    }}
                    onCancel={() => modals.closeAll()}
                />
            ),
        });
    }

    return { openCreateMapModal };
}
