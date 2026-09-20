import type { Fence, FenceTemplate, GeoPoint } from './types';

export function pointInPolygon(point: GeoPoint, polygon: GeoPoint[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const zi = polygon[i].z;
    const xj = polygon[j].x;
    const zj = polygon[j].z;
    const intersect = zi > point.z !== zj > point.z && point.x < ((xj - xi) * (point.z - zi)) / (zj - zi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function polygonArea(polygon: GeoPoint[]) {
  let area = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    area += a.x * b.z - b.x * a.z;
  }
  return Math.abs(area / 2);
}

export interface FenceDiff {
  areaDelta: number;
  areaDeltaPct: number;
  limitChanged?: { from?: number; to?: number };
  safetyImpact: 'none' | 'watch' | 'requires-hq';
  reasons: string[];
}

export function compareFence(before: Fence, after: Fence): FenceDiff {
  const oldArea = polygonArea(before.polygon);
  const newArea = polygonArea(after.polygon);
  const areaDelta = Math.round(newArea - oldArea);
  const areaDeltaPct = oldArea ? Math.round((areaDelta / oldArea) * 100) : 0;
  const reasons: string[] = [];
  let safetyImpact: FenceDiff['safetyImpact'] = 'none';

  if (before.kind === 'no-entry' && areaDelta > 0) {
    safetyImpact = 'requires-hq';
    reasons.push('禁入区扩大，可能影响训练路线与工时');
  }
  if (before.kind === 'training-area' && Math.abs(areaDeltaPct) >= 10) {
    safetyImpact = 'watch';
    reasons.push('训练区面积变化超过 10%，会影响异地学时归属');
  }
  if (before.kind === 'speed-limit' && (after.limitKmh ?? 0) < (before.limitKmh ?? 0)) {
    safetyImpact = 'requires-hq';
    reasons.push('限速值下调，可能影响排班与通勤时长');
  }
  if (before.enabled !== after.enabled) {
    safetyImpact = safetyImpact === 'requires-hq' ? safetyImpact : 'watch';
    reasons.push(after.enabled ? '围栏由停用改为启用' : '围栏被停用');
  }

  return {
    areaDelta,
    areaDeltaPct,
    limitChanged: before.limitKmh !== after.limitKmh ? { from: before.limitKmh, to: after.limitKmh } : undefined,
    safetyImpact,
    reasons
  };
}

export function instantiateTemplate(template: FenceTemplate, campusId: string, center: GeoPoint): Fence {
  const size = template.kind === 'speed-limit' ? 30 : 40;
  return {
    id: `f-${campusId}-${template.id}`,
    campusId,
    templateId: template.id,
    name: `${template.name}（本地副本）`,
    kind: template.kind,
    polygon: [
      { x: center.x - size / 2, z: center.z - size / 2 },
      { x: center.x + size / 2, z: center.z - size / 2 },
      { x: center.x + size / 2, z: center.z + size / 2 },
      { x: center.x - size / 2, z: center.z + size / 2 }
    ],
    limitKmh: template.defaultLimitKmh,
    enabled: true,
    version: 1,
    updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
  };
}
