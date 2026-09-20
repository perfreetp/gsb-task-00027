import type { AppState, GeoPoint } from './types';

const p = (x: number, z: number): GeoPoint => ({ x, z });
const rect = (cx: number, cz: number, w: number, d: number): GeoPoint[] => [
  p(cx - w / 2, cz - d / 2), p(cx + w / 2, cz - d / 2),
  p(cx + w / 2, cz + d / 2), p(cx - w / 2, cz + d / 2)
];

const roadA: GeoPoint[] = [p(-160, -120), p(-95, -90), p(-25, -70), p(45, -42), p(145, 5)];
const roadB: GeoPoint[] = [p(-145, 90), p(-75, 45), p(15, 15), p(90, -20), p(160, -72)];
const roadC: GeoPoint[] = [p(-80, -150), p(-45, -75), p(-10, 5), p(25, 75), p(70, 150)];

export const initialState: AppState = {
  currentUserId: 'u-hq',
  users: [
    { id: 'u-hq', name: '集团运营总监', role: 'hq' },
    { id: 'u-east', name: '东城校区王校长', role: 'principal', campusId: 'east' },
    { id: 'u-west', name: '西湖校区陈校长', role: 'principal', campusId: 'west' },
    { id: 'u-south', name: '南山校区李调度', role: 'dispatcher', campusId: 'south' },
    { id: 'u-coach', name: '赵教练', role: 'coach', campusId: 'east', coachId: 'c-zhao' }
  ],
  campuses: [
    { id: 'east', name: '东城综合训练场', shortName: '东城', position: p(110, -28), color: 0x22c55e, boundary: rect(110, -28, 58, 42), slots: 42, examCenter: true },
    { id: 'west', name: '西湖基础训练场', shortName: '西湖', position: p(-112, 58), color: 0x3b82f6, boundary: rect(-112, 58, 62, 48), slots: 36 },
    { id: 'south', name: '南山科目二场', shortName: '南山', position: p(28, 96), color: 0xa855f7, boundary: rect(28, 96, 52, 38), slots: 28 },
    { id: 'north', name: '北苑考点', shortName: '北苑', position: p(-62, -96), color: 0xf59e0b, boundary: rect(-62, -96, 48, 34), slots: 22, examCenter: true }
  ],
  coaches: [
    { id: 'c-zhao', name: '赵强', campusId: 'east', phone: '13800000001' },
    { id: 'c-qian', name: '钱敏', campusId: 'west', phone: '13800000002' },
    { id: 'c-sun', name: '孙磊', campusId: 'south', phone: '13800000003' },
    { id: 'c-li', name: '李娜', campusId: 'north', phone: '13800000004' }
  ],
  vehicles: [
    { id: 'v-001', plate: '沪A·D1021', model: '大众捷达', carType: 'C1', ownerCampusId: 'east', currentCampusId: 'east', status: 'training', position: p(103, -31), heading: 0.4, coachId: 'c-zhao', terminalOnline: true, annualInspectionDue: '2027-03-18', insuranceDue: '2026-12-05', maintenanceDue: '2026-10-11', purchaseDate: '2023-05-10', dailyTrainingMinutes: 312, idleMinutes: 96, alertCount: 1, depreciationDaily: 42 },
    { id: 'v-002', plate: '沪A·D2280', model: '比亚迪秦', carType: 'C2', ownerCampusId: 'east', currentCampusId: 'east', status: 'idle', position: p(119, -20), heading: -1.1, coachId: 'c-zhao', terminalOnline: true, annualInspectionDue: '2026-11-02', insuranceDue: '2026-11-20', maintenanceDue: '2026-10-30', purchaseDate: '2024-01-22', dailyTrainingMinutes: 256, idleMinutes: 158, alertCount: 0, depreciationDaily: 55 },
    { id: 'v-003', plate: '沪B·D0566', model: '大众桑塔纳', carType: 'C1', ownerCampusId: 'west', currentCampusId: 'west', status: 'training', position: p(-118, 60), heading: 2.2, coachId: 'c-qian', terminalOnline: true, annualInspectionDue: '2027-01-09', insuranceDue: '2027-01-18', maintenanceDue: '2026-09-28', purchaseDate: '2022-08-30', dailyTrainingMinutes: 388, idleMinutes: 72, alertCount: 3, depreciationDaily: 38 },
    { id: 'v-004', plate: '沪B·D3307', model: '东风多利卡', carType: 'B2', ownerCampusId: 'west', currentCampusId: 'south', status: 'transferring', position: p(-8, 12), heading: 0.2, coachId: 'c-sun', terminalOnline: true, annualInspectionDue: '2027-05-27', insuranceDue: '2027-04-14', maintenanceDue: '2026-11-12', purchaseDate: '2023-09-03', dailyTrainingMinutes: 201, idleMinutes: 190, alertCount: 2, depreciationDaily: 76 },
    { id: 'v-005', plate: '沪C·D0881', model: '吉利帝豪', carType: 'C1', ownerCampusId: 'south', currentCampusId: 'south', status: 'idle', position: p(20, 96), heading: 1.5, coachId: 'c-sun', terminalOnline: true, annualInspectionDue: '2026-10-16', insuranceDue: '2026-12-30', maintenanceDue: '2026-09-25', purchaseDate: '2024-06-15', dailyTrainingMinutes: 188, idleMinutes: 264, alertCount: 1, depreciationDaily: 44 },
    { id: 'v-006', plate: '沪C·D1690', model: '丰田卡罗拉', carType: 'C2', ownerCampusId: 'south', currentCampusId: 'north', status: 'maintenance', position: p(-62, -96), heading: -0.7, coachId: 'c-li', terminalOnline: false, annualInspectionDue: '2026-09-30', insuranceDue: '2027-02-11', maintenanceDue: '2026-09-20', purchaseDate: '2022-12-01', dailyTrainingMinutes: 120, idleMinutes: 280, alertCount: 5, depreciationDaily: 36 },
    { id: 'v-007', plate: '沪D·D4215', model: '大众捷达', carType: 'C1', ownerCampusId: 'north', currentCampusId: 'north', status: 'training', position: p(-72, -102), heading: 0.9, coachId: 'c-li', terminalOnline: true, annualInspectionDue: '2027-07-08', insuranceDue: '2027-06-20', maintenanceDue: '2026-12-01', purchaseDate: '2024-03-14', dailyTrainingMinutes: 341, idleMinutes: 110, alertCount: 0, depreciationDaily: 43 }
  ],
  templates: [
    { id: 'tpl-noentry', name: '标准禁入区', kind: 'no-entry', description: '覆盖河道、施工区与社会快速路入口，所有教学车辆禁入。' },
    { id: 'tpl-speed', name: '校区周边限速', kind: 'speed-limit', defaultLimitKmh: 30, description: '以校区门岗为核心的外围道路限速模板。' },
    { id: 'tpl-training', name: '训练区电子围栏', kind: 'training-area', description: '用于自动判定训练校区与有效训练时长。' }
  ],
  fences: [
    { id: 'f-e-1', campusId: 'east', templateId: 'tpl-speed', name: '东城门岗限速圈', kind: 'speed-limit', polygon: rect(132, -10, 28, 22), limitKmh: 30, enabled: true, version: 3, updatedAt: '2026-09-12 10:20' },
    { id: 'f-e-2', campusId: 'east', templateId: 'tpl-noentry', name: '东侧河道禁入区', kind: 'no-entry', polygon: [p(144,-50),p(160,-48),p(160,-12),p(146,-18)], enabled: true, version: 1, updatedAt: '2026-08-20 09:12' },
    { id: 'f-w-1', campusId: 'west', templateId: 'tpl-speed', name: '西湖门岗限速圈', kind: 'speed-limit', polygon: rect(-139, 66, 30, 24), limitKmh: 25, enabled: true, localAdjustment: '30 → 25km/h', diffReason: '早晚高峰校门口有学校路段，校长申请下调。', version: 2, updatedAt: '2026-09-03 16:41' },
    { id: 'f-s-1', campusId: 'south', templateId: 'tpl-training', name: '南山科二训练围栏', kind: 'training-area', polygon: rect(28, 96, 48, 34), enabled: true, version: 4, updatedAt: '2026-09-15 14:05' },
    { id: 'f-n-1', campusId: 'north', templateId: 'tpl-noentry', name: '考点施工禁入区', kind: 'no-entry', polygon: rect(-78, -112, 24, 16), enabled: true, version: 1, updatedAt: '2026-09-18 08:30' }
  ],
  hourRules: [
    { id: 'hr-1', subject: 'subject2', carType: 'ALL', timeBand: 'day', studentShare: 1, ownerShare: 0, trainingShare: 0, effectiveFrom: '2026-01-01', version: 1 },
    { id: 'hr-2', subject: 'subject3', carType: 'ALL', timeBand: 'ALL', studentShare: 1, ownerShare: 0.25, trainingShare: 0.75, effectiveFrom: '2026-01-01', version: 1 },
    { id: 'hr-3', subject: 'subject3', carType: 'B2', timeBand: 'night', studentShare: 1, ownerShare: 0.45, trainingShare: 0.55, effectiveFrom: '2026-04-01', version: 2 }
  ],
  costRules: [
    { id: 'cr-1', costType: 'fuel', subject: 'ALL', carType: 'ALL', timeBand: 'day', ownerShare: 0.4, userShare: 0.6, hqShare: 0, effectiveFrom: '2026-01-01', version: 1 },
    { id: 'cr-2', costType: 'toll', subject: 'ALL', carType: 'ALL', timeBand: 'ALL', ownerShare: 0.2, userShare: 0.6, hqShare: 0.2, effectiveFrom: '2026-01-01', version: 1 },
    { id: 'cr-3', costType: 'depreciation', subject: 'ALL', carType: 'ALL', timeBand: 'ALL', ownerShare: 0.75, userShare: 0.25, hqShare: 0, effectiveFrom: '2026-01-01', version: 1 },
    { id: 'cr-4', costType: 'fuel', subject: 'subject3', carType: 'B2', timeBand: 'night', ownerShare: 0.5, userShare: 0.4, hqShare: 0.1, effectiveFrom: '2026-04-01', version: 2 }
  ],
  transfers: [
    {
      id: 'tr-2401', code: 'DC-20260918-001', vehicleId: 'v-004', fromCampusId: 'west', toCampusId: 'south', coachId: 'c-sun',
      priority: 1, eta: '2026-09-20 11:30', submittedAt: '2026-09-20 08:40', status: 'in_transit', progress: 0.58,
      route: roadB, currentPosition: p(-8, 12), ruleVersion: 1, idempotencyKey: 'seed-v004-west-south',
      events: [
        { id: 'e1', at: '2026-09-20 08:40', actor: 'source', type: 'submit', note: '南山B2考前集训缺车' },
        { id: 'e2', at: '2026-09-20 08:48', actor: 'destination', type: 'approve_destination' },
        { id: 'e3', at: '2026-09-20 09:05', actor: 'hq', type: 'approve_hq' },
        { id: 'e4', at: '2026-09-20 09:20', actor: 'source', type: 'dispatch' }
      ],
      alerts: ['路线偏航 0.8km，已自动通知随车教练']
    },
    {
      id: 'tr-2402', code: 'DC-20260920-002', vehicleId: 'v-003', fromCampusId: 'east', toCampusId: 'west', coachId: 'c-qian',
      priority: 2, eta: '2026-09-20 16:30', submittedAt: '2026-09-20 09:12', status: 'queued', progress: 0, queueRank: 1,
      route: [p(110,-28), p(45,-42), p(-25,-70), p(-112,58)], ruleVersion: 1, idempotencyKey: 'seed-v003-east-west-1',
      events: [
        { id: 'e5', at: '2026-09-20 09:12', actor: 'source', type: 'submit' },
        { id: 'e6', at: '2026-09-20 09:13', actor: 'system', type: 'queue', note: '车辆当前有训练任务，按优先级排队' }
      ],
      alerts: []
    },
    {
      id: 'tr-2403', code: 'DC-20260920-003', vehicleId: 'v-003', fromCampusId: 'east', toCampusId: 'north', coachId: 'c-li',
      priority: 3, eta: '2026-09-20 18:00', submittedAt: '2026-09-20 09:18', status: 'queued', progress: 0, queueRank: 2,
      route: [p(110,-28), p(45,-42), p(-62,-96)], ruleVersion: 1, idempotencyKey: 'seed-v003-east-north-2',
      events: [
        { id: 'e7', at: '2026-09-20 09:18', actor: 'source', type: 'submit' },
        { id: 'e8', at: '2026-09-20 09:18', actor: 'system', type: 'queue', note: '同车并发申请，进入优先级队列' }
      ],
      alerts: []
    }
  ],
  alerts: [
    { id: 'al-1', level: 'high', type: 'route', campusId: 'west', vehicleId: 'v-004', message: '调往南山途中偏航 0.8km', at: '2026-09-20 10:18', status: 'open' },
    { id: 'al-2', level: 'medium', type: 'stop', campusId: 'west', vehicleId: 'v-004', message: '在途停留 23 分钟，超过阈值', at: '2026-09-20 10:42', status: 'open' },
    { id: 'al-3', level: 'high', type: 'offline', campusId: 'south', vehicleId: 'v-006', message: '定位终端离线超过 2 小时', at: '2026-09-20 09:50', status: 'acknowledged' },
    { id: 'al-4', level: 'medium', type: 'speeding', campusId: 'east', vehicleId: 'v-001', message: '校区周边 42km/h，超过 30km/h 限速', at: '2026-09-20 08:55', status: 'open' },
    { id: 'al-5', level: 'high', type: 'geofence', campusId: 'north', vehicleId: 'v-007', message: '驶入考点施工禁入区边缘', at: '2026-09-20 11:02', status: 'open' }
  ],
  auditLogs: [
    { id: 'au-1', module: 'fence', targetId: 'f-w-1', action: '本地微调待总部审批', before: '限速 30km/h', after: '限速 25km/h', operator: '西湖校区陈校长', at: '2026-09-03 16:35' },
    { id: 'au-2', module: 'cost-rule', targetId: 'cr-4', action: '新增夜间B2油费规则', before: '适用默认日班规则', after: '车属50%/用车40%/总部10%', operator: '集团运营总监', at: '2026-03-28 10:12' },
    { id: 'au-3', module: 'hour-rule', targetId: 'hr-3', action: '调整夜间B2科三归属', before: '车属25%/训练75%', after: '车属45%/训练55%', operator: '集团运营总监', at: '2026-03-28 10:15' }
  ],
  monthly: [
    { month: '2026-06', transferCount: 68, crossCampusHours: 1240, allocatedAmount: 286400, exceptions: 9 },
    { month: '2026-07', transferCount: 74, crossCampusHours: 1385, allocatedAmount: 312800, exceptions: 7 },
    { month: '2026-08', transferCount: 82, crossCampusHours: 1512, allocatedAmount: 348900, exceptions: 11 }
  ]
};

export { roadA, roadB, roadC };
