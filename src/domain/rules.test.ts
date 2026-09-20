import { describe, expect, it } from 'vitest';
import { initialState } from './mockData';
import { allocateCost, attributeHours, resolveRuleAt } from './rules';

describe('multi-condition attribution rules', () => {
  it('matches specific night B2 rule before generic rules', () => {
    const rule = resolveRuleAt(structuredClone(initialState).hourRules, 'subject3', 'B2', 'night', '2026-09-20 21:00');
    expect(rule?.id).toBe('hr-3');
    expect(rule?.ownerShare).toBe(0.45);
  });

  it('uses historical rule version by date', () => {
    const oldRule = resolveRuleAt(structuredClone(initialState).hourRules, 'subject3', 'B2', 'night', '2026-03-01 21:00');
    expect(oldRule?.id).toBe('hr-2');
  });

  it('snapshots hour and cost results for replay', () => {
    const hours = attributeHours(structuredClone(initialState).hourRules, { subject: 'subject3', carType: 'B2', minutes: 100, at: '2026-09-20 21:00', ownerCampusId: 'west', trainingCampusId: 'south', studentId: 's1' });
    expect(hours.ownerMinutes).toBe(45);
    expect(hours.trainingCampusMinutes).toBe(55);
    expect(hours.snapshot.version).toBe(2);
    const cost = allocateCost(structuredClone(initialState).costRules, { costType: 'fuel', subject: 'subject3', carType: 'B2', amount: 100, at: '2026-09-20 21:00', ownerCampusId: 'west', userCampusId: 'south' });
    expect(cost.ownerAmount + cost.userAmount + cost.hqAmount).toBeCloseTo(100);
    expect(cost.snapshot.timeBand).toBe('night');
  });
});
