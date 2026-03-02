import { useEffect, useRef, useState } from 'react';
import { Hypb } from '@hydevs/hypb';
import type { DncWorldmapMapPresenceRecord } from '../types/database';

const HEARTBEAT_DELAY = 2 * 60 * 1000;
const HEARTBEAT_INTERVAL = 2 * 60 * 1000;
const TTL = HEARTBEAT_INTERVAL + 2 * 1000;
const ONLINE_REFRESH = 5 * 1000;

export type PresenceUser = {
    id: string;
    userId: string;
    name?: string;
    email?: string;
    lastSeen: number;
};

type LSEntry = { presenceId: string; count: number; leaderTabId: string };

function lsKey(mapId: string, uid: string) {
    return `dnc_pres:${mapId}:${uid}`;
}
function lsGet(k: string): LSEntry | null {
    try {
        const raw = localStorage.getItem(k);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}
function lsSet(k: string, v: LSEntry) {
    try {
        localStorage.setItem(k, JSON.stringify(v));
    } catch {}
}
function lsDel(k: string) {
    try {
        localStorage.removeItem(k);
    } catch {}
}

function parseLastSeen(value: unknown, fallback?: string | number): number {
    if (typeof value === 'number' && value > 0) return value;
    if (typeof value === 'string') {
        const n = parseInt(value, 10);
        if (!Number.isNaN(n) && n > 0) return n;
        const d = Date.parse(value);
        if (!Number.isNaN(d)) return d;
    }
    if (typeof fallback === 'number' && fallback > 0) return fallback;
    if (typeof fallback === 'string') {
        const d = Date.parse(fallback);
        if (!Number.isNaN(d)) return d;
    }
    return Date.now();
}

export function useMapPresence(mapId?: string | null) {
    const [presences, setPresences] = useState<PresenceUser[]>([]);
    const [online, setOnline] = useState<PresenceUser[]>([]);
    const presenceIdRef = useRef<string | null>(null);
    const hbTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hbIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const unsubRef = useRef<(() => void) | null>(null);
    const tabIdRef = useRef<string>(crypto.randomUUID());
    const isLeaderRef = useRef(false);

    useEffect(() => {
        if (!mapId) return;
        const pb = Hypb.pb;
        const uid = pb.authStore.record?.id as string | undefined;
        if (!uid) return;

        let alive = true;
        const tabId = tabIdRef.current;
        const key = lsKey(mapId, uid);

        presenceIdRef.current = null;

        const sendHeartbeat = async () => {
            const id = presenceIdRef.current;
            if (!id || !alive) return;
            try {
                await pb.collection('dnc_worldmap_map_presence').update(id, { last_seen: Date.now() });
            } catch (err: unknown) {
                if (err instanceof Object && 'status' in err && (err as Record<string, unknown>).status === 404) {
                    presenceIdRef.current = null;
                    stopHeartbeat();
                }
            }
        };

        const startHeartbeat = () => {
            if (hbTimeoutRef.current || hbIntervalRef.current) return;
            hbTimeoutRef.current = setTimeout(async () => {
                hbTimeoutRef.current = null;
                await sendHeartbeat();
                hbIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
            }, HEARTBEAT_DELAY);
        };

        const stopHeartbeat = () => {
            if (hbTimeoutRef.current) {
                clearTimeout(hbTimeoutRef.current);
                hbTimeoutRef.current = null;
            }
            if (hbIntervalRef.current) {
                clearInterval(hbIntervalRef.current);
                hbIntervalRef.current = null;
            }
        };

        const claimLeadership = () => {
            isLeaderRef.current = true;
            const entry = lsGet(key);
            if (entry) lsSet(key, { ...entry, leaderTabId: tabId });
            startHeartbeat();
        };

        const fetchUser = async (userId: string) => {
            try {
                const u = await pb.collection('dnc_worldmap_users').getOne(userId);
                return {
                    name: u.name as string | undefined,
                    email: u.email as string | undefined,
                };
            } catch {
                return {};
            }
        };

        const fetchInitial = async () => {
            try {
                const list = await pb.collection('dnc_worldmap_map_presence').getFullList<DncWorldmapMapPresenceRecord>({
                    filter: `map_id = "${mapId}"`,
                    expand: 'user_id',
                });
                if (!alive) return;
                const mine = list.find((r) => r.user_id === uid);
                if (mine && !presenceIdRef.current) presenceIdRef.current = mine.id;
                setPresences(
                    list.map((r) => ({
                        id: r.id,
                        userId: r.user_id,
                        name: r.expand?.user_id?.name,
                        email: r.expand?.user_id?.email,
                        lastSeen: parseLastSeen(r.last_seen, r.created),
                    }))
                );
            } catch (e) {
                console.error(e);
            }
        };

        const createPresence = async (): Promise<string | null> => {
            try {
                const rec = await pb.collection('dnc_worldmap_map_presence').create({
                    user_id: uid,
                    map_id: mapId,
                    last_seen: Date.now(),
                });
                return rec.id;
            } catch {
                return null;
            }
        };

        const deletePresence = (id: string) => {
            try {
                pb.collection('dnc_worldmap_map_presence').delete(id);
            } catch (e) {
                console.error(e);
            }
        };

        const subscribeRealtime = async () => {
            try {
                const unsub = await pb.collection('dnc_worldmap_map_presence').subscribe('*', async (e) => {
                    if (!alive) return;
                    const rec = e.record as unknown as DncWorldmapMapPresenceRecord;
                    if (rec.map_id !== mapId) return;
                    if (e.action === 'create') {
                        let name = rec.expand?.user_id?.name;
                        let email = rec.expand?.user_id?.email;
                        if (!name && !email) {
                            const u = await fetchUser(rec.user_id);
                            name = u.name;
                            email = u.email;
                        }
                        setPresences((s) =>
                            s.some((p) => p.id === rec.id)
                                ? s
                                : [
                                      ...s,
                                      {
                                          id: rec.id,
                                          userId: rec.user_id,
                                          name,
                                          email,
                                          lastSeen: parseLastSeen(rec.last_seen, rec.created),
                                      },
                                  ]
                        );
                    } else if (e.action === 'update') {
                        setPresences((s) =>
                            s.map((p) =>
                                p.id === rec.id
                                    ? {
                                          ...p,
                                          lastSeen: parseLastSeen(rec.last_seen, rec.updated),
                                      }
                                    : p
                            )
                        );
                    } else if (e.action === 'delete') {
                        setPresences((s) => s.filter((p) => p.id !== rec.id));
                    }
                });
                unsubRef.current = unsub;
            } catch (e) {
                console.error(e);
            }
        };

        const onStorageChange = (e: StorageEvent) => {
            if (e.key !== key || !e.newValue) return;
            try {
                const entry: LSEntry = JSON.parse(e.newValue);
                presenceIdRef.current = entry.presenceId;
                if (entry.leaderTabId === tabId && !isLeaderRef.current) {
                    claimLeadership();
                } else if (entry.leaderTabId !== tabId && isLeaderRef.current) {
                    isLeaderRef.current = false;
                    stopHeartbeat();
                }
            } catch (e) {
                console.error(e);
            }
        };

        window.addEventListener('storage', onStorageChange);

        void (async () => {
            await fetchInitial();
            if (!alive) return;
            const existing = lsGet(key);
            if (existing) {
                presenceIdRef.current = existing.presenceId;
                lsSet(key, { ...existing, count: existing.count + 1 });
            } else {
                let presenceId = presenceIdRef.current;
                if (!presenceId) {
                    presenceId = await createPresence();
                } else {
                    try {
                        await pb.collection('dnc_worldmap_map_presence').update(presenceId, { last_seen: Date.now() });
                    } catch {
                        presenceId = await createPresence();
                    }
                }
                if (!presenceId || !alive) return;
                presenceIdRef.current = presenceId;
                lsSet(key, { presenceId, count: 1, leaderTabId: tabId });
                claimLeadership();

                const model = pb.authStore.model;
                setPresences((s) =>
                    s.some((p) => p.id === presenceId)
                        ? s
                        : [
                              ...s,
                              {
                                  id: presenceId,
                                  userId: uid,
                                  name: model?.name as string | undefined,
                                  email: model?.email as string | undefined,
                                  lastSeen: Date.now(),
                              },
                          ]
                );
            }
            await subscribeRealtime();
        })();

        let cleanupCalled = false;
        const cleanup = () => {
            if (cleanupCalled) return;
            cleanupCalled = true;
            alive = false;
            stopHeartbeat();
            try {
                Promise.resolve(unsubRef.current?.()).catch(() => {});
            } catch (e) {
                console.error(e);
            }
            unsubRef.current = null;
            const entry = lsGet(key);
            if (!entry) {
                presenceIdRef.current = null;
                return;
            }
            if (entry.count <= 1) {
                lsDel(key);
                const idToDelete = presenceIdRef.current;
                presenceIdRef.current = null;
                if (idToDelete) deletePresence(idToDelete);
            } else {
                const newLeaderTabId = entry.leaderTabId === tabId ? `handoff-${Date.now()}` : entry.leaderTabId;
                lsSet(key, {
                    ...entry,
                    count: entry.count - 1,
                    leaderTabId: newLeaderTabId,
                });
            }
        };

        window.addEventListener('beforeunload', cleanup);

        return () => {
            cleanup();
            window.removeEventListener('beforeunload', cleanup);
            window.removeEventListener('storage', onStorageChange);
        };
    }, [mapId]);

    useEffect(() => {
        const refresh = () => {
            const now = Date.now();
            const model = Hypb.pb.authStore.model;
            const uid = model?.id as string | undefined;

            const self: PresenceUser | null = uid
                ? {
                      id: presences.find((p) => p.userId === uid)?.id ?? `self-${uid}`,
                      userId: uid,
                      name: model?.name as string | undefined,
                      email: model?.email as string | undefined,
                      lastSeen: now,
                  }
                : null;

            const others = presences.filter((p) => p.userId !== uid && now - p.lastSeen < TTL);

            setOnline(self ? [self, ...others] : others);
        };
        refresh();
        const iv = setInterval(refresh, ONLINE_REFRESH);
        return () => clearInterval(iv);
    }, [presences]);

    return { online };
}

export default useMapPresence;
