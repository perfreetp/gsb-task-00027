import { describe, expect, it } from 'vitest';
import { compareFence, pointInPolygon } from './fences';
import { initialState } from './mockData';

describe('fences', () => {
  it('detects point inside polygon', () => {
    const fence = structuredClone(initialState).fences.find((item) => item.id === 'f-s-1')!;
    expect(pointInPolygon({ x: 28, z: 96 }, fence.polygon)).toBe(true);
    expect(pointInPolygon({ x: 200, z: 200 }, fence.polygon)).toBe(false);
  });

  it('requires HQ approval when speed limit is reduced', () => {
    const fence = structuredClone(initialState).fences.find((item) => item.id === 'f-w-1')!;
    const diff = compareFence(fence, { ...fence, limitKmh: 20 });
    expect(diff.safetyImpact).toBe('requires-hq');
    expect(diff.limitChanged).toEqual({ from: 25, to: 20 });
  });
});
