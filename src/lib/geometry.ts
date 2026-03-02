export function isPointInPolygon(point: { x: number; y: number }, polygon: number[]): boolean {
    let inside = false;
    const { x, y } = point;
    for (let i = 0, j = polygon.length - 2; i < polygon.length; j = i, i += 2) {
        const xi = polygon[i];
        const yi = polygon[i + 1];
        const xj = polygon[j];
        const yj = polygon[j + 1];

        const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
}
