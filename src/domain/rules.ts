import type { CostRule, HourRule, Subject } from './types';

export type CarType = 'C1' | 'C2' | 'B2' | 'ALL';
export type TimeBand = 'day' | 'night' | 'ALL';

type Rule = { subject: Subject | 'ALL'; carType: CarType; timeBand: TimeBand; effectiveFrom: string; version: number };

const rankValue = (expected: string, actual: string) => (expected === actual ? 2 : expected === 'ALL' ? 1 : 0);

export function resolveRuleAt<T extends Rule>(rules: T[], subject: Subject, carType: Exclude<CarType, 'ALL'>, timeBand: Exclude<TimeBand, 'ALL'>, at: string): T | undefined {
  return rules
    .filter((rule) => rule.effectiveFrom <= at)
    .filter((rule) => rule.subject === subject || rule.subject === 'ALL')
    .filter((rule) => rule.carType === carType || rule.carType === 'ALL')
    .filter((rule) => rule.timeBand === timeBand || rule.timeBand === 'ALL')
    .sort((a, b) => {
      const specificity =
        rankValue(b.subject, subject) - rankValue(a.subject, subject) ||
        rankValue(b.carType, carType) - rankValue(a.carType, carType) ||
        rankValue(b.timeBand, timeBand) - rankValue(a.timeBand, timeBand);
      return specificity || b.effectiveFrom.localeCompare(a.effectiveFrom) || b.version - a.version;
    })[0];
}

export function isNight(at: Date | string) {
  const date = typeof at === 'string' ? new Date(at.replace(' ', 'T')) : at;
  const hour = date.getHours();
  return hour < 6 || hour >= 20;
}

export interface HourAttributionInput {
  subject: Subject;
  carType: Exclude<CarType, 'ALL'>;
  minutes: number;
  at: string;
  ownerCampusId: string;
  trainingCampusId: string;
  studentId: string;
}

export interface AttributionResult<T> {
  rule?: T;
  matchedBy: string;
  snapshot: { at: string; subject: Subject; carType: string; timeBand: 'day' | 'night'; effectiveFrom?: string; version?: number };
}

export interface HourAttributionResult extends AttributionResult<HourRule> {
  studentId: string;
  ownerCampusId: string;
  trainingCampusId: string;
  studentMinutes: number;
  ownerMinutes: number;
  trainingCampusMinutes: number;
}

export function attributeHours(rules: HourRule[], input: HourAttributionInput): HourAttributionResult {
  const timeBand = isNight(input.at) ? 'night' : 'day';
  const rule = resolveRuleAt(rules, input.subject, input.carType, timeBand, input.at);
  const base: AttributionResult<HourRule> = {
    rule,
    matchedBy: rule ? `${rule.subject}/${rule.carType}/${rule.timeBand}@v${rule.version}` : '未命中规则',
    snapshot: { at: input.at, subject: input.subject, carType: input.carType, timeBand, effectiveFrom: rule?.effectiveFrom, version: rule?.version }
  };
  return {
    ...base,
    studentId: input.studentId,
    ownerCampusId: input.ownerCampusId,
    trainingCampusId: input.trainingCampusId,
    studentMinutes: round1(input.minutes * (rule?.studentShare ?? 1)),
    ownerMinutes: round1(input.minutes * (rule?.ownerShare ?? 0)),
    trainingCampusMinutes: round1(input.minutes * (rule?.trainingShare ?? 0))
  };
}

export interface CostAllocationInput {
  costType: CostRule['costType'];
  subject: Subject;
  carType: Exclude<CarType, 'ALL'>;
  amount: number;
  at: string;
  ownerCampusId: string;
  userCampusId: string;
}

export function allocateCost(rules: CostRule[], input: CostAllocationInput) {
  const timeBand = isNight(input.at) ? 'night' : 'day';
  const rule = resolveRuleAt(rules, input.subject, input.carType, timeBand, input.at);
  return {
    rule,
    matchedBy: rule ? `${rule.costType}/${rule.subject}/${rule.carType}/${rule.timeBand}@v${rule.version}` : '未命中规则',
    snapshot: { at: input.at, subject: input.subject, carType: input.carType, timeBand, effectiveFrom: rule?.effectiveFrom, version: rule?.version },
    ownerCampusId: input.ownerCampusId,
    userCampusId: input.userCampusId,
    ownerAmount: round2(input.amount * (rule?.ownerShare ?? 1)),
    userAmount: round2(input.amount * (rule?.userShare ?? 0)),
    hqAmount: round2(input.amount * (rule?.hqShare ?? 0))
  };
}

export function round1(value: number) {
  return Math.round(value * 10) / 10;
}

export function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function sumTo100(values: number[]) {
  return Math.round(values.reduce((sum, value) => sum + value, 0) * 100) === 100;
}
