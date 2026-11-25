// Rings keep a free center. A base clearance of 8.4 and offsets of at most
// 0.4 guarantee at least 7.6 units between centers, including adjacent rings.
const CLEARANCE = 8.4;
const OFFSET_RADIUS = 0.4;

function gcd(a, b) {
    while (b) [a, b] = [b, a % b];
    return a;
}

export function positionFor(index, total, id) {
    if (total <= 1) return [0, 0];
    let radius = total <= 8 ? Math.max(5, CLEARANCE / (2 * Math.sin(Math.PI / total))) : 11;
    let remaining = total;
    let ring = 0;
    let slots;
    while (true) {
        const capacity = Math.floor(Math.PI / Math.asin(CLEARANCE / (2 * radius)) + 1e-9);
        slots = Math.min(remaining, capacity);
        if (index < slots) break;
        index -= slots;
        remaining -= slots;
        radius += CLEARANCE;
        ring++;
    }
    // Visit non-neighboring slots so catalog order does not form a visible row.
    let step = Math.max(1, Math.round(slots * 0.618));
    while (gcd(step, slots) !== 1) step++;
    const angle = (index * step % slots) * Math.PI * 2 / slots + 0.35 + ring * 0.7;
    let seed = 2166136261;
    for (const character of String(id)) {
        seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0;
    }
    const offsetAngle = seed / 4294967296 * Math.PI * 2;
    return [Math.cos(angle) * radius + Math.cos(offsetAngle) * OFFSET_RADIUS,
        Math.sin(angle) * radius + Math.sin(offsetAngle) * OFFSET_RADIUS];
}
