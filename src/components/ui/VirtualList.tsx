import React, { useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export default function VirtualList<T extends { id: string }>({
    items,
    itemHeight,
    renderItem,
    scrollRef,
    height = 320,
}: {
    items: T[];
    itemHeight: number;
    renderItem: (item: T, index: number) => React.ReactNode;
    scrollRef?: React.RefObject<HTMLElement | null>;
    height?: number;
}) {
    const internalRef = useRef<HTMLDivElement | null>(null);

    const getScrollElement = useCallback(() => (scrollRef && scrollRef.current) || internalRef.current, [scrollRef]);

    const estimateSize = useCallback(() => itemHeight, [itemHeight]);

    // eslint-disable-next-line react-hooks/incompatible-library -- useVirtualizer is a known incompatible library; safe to use here without memoization
    const rowVirtualizer = useVirtualizer({
        count: items.length,
        getScrollElement,
        estimateSize: estimateSize,
        overscan: 6,
    });

    if (scrollRef) {
        return (
            <div style={{ height: '100%' }}>
                <div
                    style={{
                        height: rowVirtualizer.getTotalSize(),
                        position: 'relative',
                    }}
                >
                    {rowVirtualizer.getVirtualItems().map((v) => (
                        <div
                            key={v.index}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                transform: `translateY(${v.start}px)`,
                            }}
                        >
                            {renderItem(items[v.index], v.index)}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div ref={internalRef} style={{ overflowY: 'auto', height }}>
            <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
                {rowVirtualizer.getVirtualItems().map((v) => (
                    <div
                        key={v.index}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            transform: `translateY(${v.start}px)`,
                        }}
                    >
                        {renderItem(items[v.index], v.index)}
                    </div>
                ))}
            </div>
        </div>
    );
}
