import type { AppState, Campus, Vehicle, Coach } from './types';

const now = new Date();
const iso = (offsetHours: number) => new Date(now.getTime() - offsetHours * 3600000).toISOString();

const campuses: Campus[] = [
  {
    id: 'c-east', name: '东环总部校区', x: 18, z: -10, color: 0x2b8fff, principal: '王校长',
    trainingSlots: 48, occupiedSlots: 39, geofenceVersion: 'GF-202609-02', templateVersion: 'STD-CITY-3.0',
    zones: [
      { id: 'z1', name: 'A区倒车库位', kind: '库位', capacity: 18, occupied: 14 },
      { id: 'z2', name: 'B区曲线训练', kind: '训练区', capacity: 12, occupied: 10 },
      { id: 'z3', name: '北门限速区', kind: '限速区', speedLimit: 15 },
      { id: 'z4', name: '施工缓冲带', kind: '禁入区' },
      { id: 'z5', name: '学员接待区', kind: '接待区', capacity: 30, occupied: 12 }
    ]
  },
  {
    id: 'c-west', name: '西湖校区', x: -22, z: 2, color: 0x20c997, principal: '陈校长',
    trainingSlots: 36, occupiedSlots: 23, geofenceVersion: 'GF-202609-01', templateVersion: 'STD-CITY-3.0',
    zones: [
      { id: 'z1', name: 'A区倒车库位', kind: '库位', capacity: 14, occupied: 9 },
      { id: 'z2', name: '坡道定点区', kind: '训练区', capacity: 10, occupied: 6 },
      { id: 'z3', name: '湖景路限速区', kind: '限速区', speedLimit: 20 },
      { id: 'z4', name: '湖岸禁入区', kind: '禁入区' },
      { id: 'z5', name: '学员接待区', kind: '接待区', capacity: 24, occupied: 9 }
    ]
  },
  {
    id: 'c-north', name: '北站校区', x: -4, z: 24, color: 0xf59e0b, principal: '赵校长',
    trainingSlots: 42, occupiedSlots: 41, geofenceVersion: 'GF-202609-04', templateVersion: 'STD-CITY-2.9',
    zones: [
      { id: 'z1', name: 'A区倒车库位', kind: '库位', capacity: 16, occupied: 16 },
      { id: 'z2', name: '夜间科三环线', kind: '训练区', capacity: 14, occupied: 13 },
      { id: 'z3', name: '隧道口限速区', kind: '限速区', speedLimit: 25 },
      { id: 'z4', name: '客运禁入区', kind: '禁入区' },
      { id: 'z5', name: '学员接待区', kind: '接待区', capacity: 28, occupied: 22 }
    ]
  },
  {
    id: 'c-south', name: '南港校区', x: 8, z: -28, color: 0xa855f7, principal: '林校长',
    trainingSlots: 30, occupiedSlots: 17, geofenceVersion: 'GF-202609-01', templateVersion: 'STD-CITY-3.0',
    zones: [
      { id: 'z1', name: 'A区倒车库位', kind: '库位', capacity: 12, occupied: 6 },
      { id: 'z2', name: '港口模拟区', kind: '训练区', capacity: 8, occupied: 5 },
      { id: 'z3', name: '港兴大道限速', kind: '限速区', speedLimit: 20 },
      { id: 'z4', name: '作业禁入区', kind: '禁入区' },
      { id: 'z5', name: '学员接待区', kind: '接待区', capacity: 20, occupied: 7 }
    ]
  },
  {
    id: 'c-exam', name: '城东考点', x: 31, z: 18, color: 0xef4444, principal: '考务中心',
    trainingSlots: 18, occupiedSlots: 8, geofenceVersion: 'GF-202609-03', templateVersion: 'STD-EXAM-2.1',
    zones: [
      { id: 'z1', name: '待考停车区', kind: '库位', capacity: 12, occupied: 5 },
      { id: 'z2', name: '考试路线', kind: '训练区', capacity: 6, occupied: 3 },
      { id: 'z3', name: '考区限速区', kind: '限速区', speedLimit: 10 },
      { id: 'z4', name: '封闭考区', kind: '禁入区' },
      { id: 'z5', name: '考务大厅', kind: '接待区', capacity: 40, occupied: 11 }
    ]
  }
];

const coaches: Coach[] = [
  { id: 'coach-1', name: '刘教练', campusId: 'c-east' },
  { id: 'coach-2', name: '周教练', campusId: 'c-east' },
  { id: 'coach-3', name: '吴教练', campusId: 'c-west' },
  { id: 'coach-4', name: '郑教练', campusId: 'c-north' },
  { id: 'coach-5', name: '何教练', campusId: 'c-south' },
  { id: 'coach-6', name: '马教练', campusId: 'c-exam' }
];

const vehicles: Vehicle[] = [
  { id: 'v-001', plate: '粤A·D001学', brand: '大众捷达', type: 'C1', ownerCampusId: 'c-east', currentCampusId: 'c-east', status: '在训', terminalOnline: true, inspectionDue: '2026-12-18', insuranceDue: '2027-01-05', maintenanceDue: '2026-10-02', dailyTrainingMinutes: 382, idleMinutes: 78, alertCount: 1 },
  { id: 'v-002', plate: '粤A·D002学', brand: '丰田卡罗拉', type: 'C2', ownerCampusId: 'c-east', currentCampusId: 'c-west', status: '在训', terminalOnline: true, inspectionDue: '2026-11-20', insuranceDue: '2026-12-30', maintenanceDue: '2026-09-28', dailyTrainingMinutes: 351, idleMinutes: 104, alertCount: 2 },
  { id: 'v-003', plate: '粤A·D003学', brand: '大众捷达', type: 'C1', ownerCampusId: 'c-west', currentCampusId: 'c-west', status: '闲置', terminalOnline: true, inspectionDue: '2027-01-12', insuranceDue: '2027-02-01', maintenanceDue: '2026-10-20', dailyTrainingMinutes: 205, idleMinutes: 244, alertCount: 0 },
  { id: 'v-004', plate: '粤A·D004学', brand: '比亚迪秦', type: 'C2', ownerCampusId: 'c-west', currentCampusId: 'c-east', status: '调车中', terminalOnline: true, inspectionDue: '2026-10-08', insuranceDue: '2027-03-11', maintenanceDue: '2026-09-25', dailyTrainingMinutes: 318, idleMinutes: 96, alertCount: 3 },
  { id: 'v-005', plate: '粤A·D005学', brand: '东风天锦', type: 'B2', ownerCampusId: 'c-north', currentCampusId: 'c-north', status: '在训', terminalOnline: true, inspectionDue: '2026-12-01', insuranceDue: '2026-12-15', maintenanceDue: '2026-10-11', dailyTrainingMinutes: 426, idleMinutes: 42, alertCount: 1 },
  { id: 'v-006', plate: '粤A·D006学', brand: '大众捷达', type: 'C1', ownerCampusId: 'c-north', currentCampusId: 'c-north', status: '在训', terminalOnline: true, inspectionDue: '2027-02-14', insuranceDue: '2027-02-20', maintenanceDue: '2026-11-05', dailyTrainingMinutes: 402, idleMinutes: 55, alertCount: 2 },
  { id: 'v-007', plate: '粤A·D007学', brand: '丰田卡罗拉', type: 'C2', ownerCampusId: 'c-north', currentCampusId: 'c-east', status: '调车中', terminalOnline: false, inspectionDue: '2026-09-30', insuranceDue: '2027-01-18', maintenanceDue: '2026-09-22', dailyTrainingMinutes: 286, idleMinutes: 122, alertCount: 5 },
  { id: 'v-008', plate: '粤A·D008学', brand: '大众捷达', type: 'C1', ownerCampusId: 'c-south', currentCampusId: 'c-south', status: '维修', terminalOnline: true, inspectionDue: '2026-12-28', insuranceDue: '2027-04-02', maintenanceDue: '2026-09-19', dailyTrainingMinutes: 88, idleMinutes: 330, alertCount: 1 },
  { id: 'v-009', plate: '粤A·D009学', brand: '比亚迪秦', type: 'C2', ownerCampusId: 'c-south', currentCampusId: 'c-south', status: '闲置', terminalOnline: true, inspectionDue: '2027-03-09', insuranceDue: '2027-03-15', maintenanceDue: '2026-12-01', dailyTrainingMinutes: 177, idleMinutes: 315, alertCount: 0 },
  { id: 'v-010', plate: '粤A·D010学', brand: '大众捷达', type: 'C1', ownerCampusId: 'c-exam', currentCampusId: 'c-exam', status: '在训', terminalOnline: true, inspectionDue: '2026-11-11', insuranceDue: '2026-12-25', maintenanceDue: '2026-10-30', dailyTrainingMinutes: 264, idleMinutes: 188, alertCount: 0 },
  { id: 'v-011', plate: '粤A·D011学', brand: '丰田卡罗拉', type: 'C2', ownerCampusId: 'c-east', currentCampusId: 'c-north', status: '在训', terminalOnline: true, inspectionDue: '2027-01-28', insuranceDue: '2027-02-10', maintenanceDue: '2026-11-19', dailyTrainingMinutes: 338, idleMinutes: 99, alertCount: 1 },
  { id: 'v-012', plate: '粤A·D012学', brand: '东风天锦', type: 'B2', ownerCampusId: 'c-west', currentCampusId: 'c-south', status: '离线', terminalOnline: false, inspectionDue: '2026-10-15', insuranceDue: '2026-11-11', maintenanceDue: '2026-10-05', dailyTrainingMinutes: 0, idleMinutes: 480, alertCount: 4 }
];
vehicles.forEach((vehicle, index) => {
  vehicle.assignedCoachId = coaches[index % coaches.length].id;
});

export const initialState: AppState = {
  role: { role: 'hq' },
  campuses,
  vehicles,
  coaches,
  requests: [
    {
      id: 'TR-20260919-018', vehicleId: 'v-004', fromCampusId: 'c-west', toCampusId: 'c-east',
      coachId: 'coach-3', eta: '2026-09-19T10:30:00+08:00', departAt: iso(1.5), priority: 1,
      reason: '东环科二高峰库位满载，补一台 C2 教练车', status: 'in_transit', destination: 'approved',
      hq: 'approved', progress: 0.62, createdAt: iso(3.2),
      events: [
        { at: iso(3.2), type: '提交', actor: '西湖调度员', detail: '提交调车申请，进入双方校区确认' },
        { at: iso(2.8), type: '目的地确认', actor: '王校长', detail: '确认接收并匹配 3 号库位' },
        { at: iso(2.5), type: '总部放行', actor: '集团调度', detail: '校验额度、围栏与队列后放行' },
        { at: iso(1.5), type: '发车', actor: '吴教练', detail: '车辆从西湖校区出发' }
      ],
      alerts: ['车辆在港兴大道偏航 320 米，已自动提醒随车教练']
    },
    {
      id: 'TR-20260919-019', vehicleId: 'v-007', fromCampusId: 'c-north', toCampusId: 'c-east',
      coachId: 'coach-4', eta: '2026-09-19T09:50:00+08:00', departAt: iso(2.2), priority: 2,
      reason: '跨区科三集训', status: 'in_transit', destination: 'approved', hq: 'approved',
      progress: 0.84, createdAt: iso(4.1),
      events: [
        { at: iso(4.1), type: '提交', actor: '北站调度员', detail: '提交调车申请' },
        { at: iso(3.8), type: '目的地确认', actor: '王校长', detail: '确认接收' },
        { at: iso(3.5), type: '总部放行', actor: '集团调度', detail: '总部放行' },
        { at: iso(2.2), type: '发车', actor: '郑教练', detail: '车辆从北站校区出发' }
      ],
      alerts: ['终端离线 18 分钟', '已超过预计到达时间 12 分钟']
    }
,
    {
      id: 'TR-20260918-011', vehicleId: 'v-001', fromCampusId: 'c-east', toCampusId: 'c-west',
      coachId: 'coach-1', eta: '2026-09-18T15:20:00+08:00', departAt: iso(50), arrivedAt: iso(48),
      priority: 2, reason: '西湖科二高峰补车', status: 'arrived', destination: 'approved',
      hq: 'approved', progress: 1, createdAt: iso(54),
      events: [
        { at: iso(54), type: '提交', actor: '东环调度员', detail: '提交调车申请' },
        { at: iso(53), type: '目的地确认', actor: '陈校长', detail: '确认接收' },
        { at: iso(52), type: '总部放行', actor: '集团调度', detail: '总部放行' },
        { at: iso(50), type: '发车', actor: '刘教练', detail: '车辆出发' },
        { at: iso(48), type: '到达接收', actor: '陈校长', detail: '完成到达接收' }
      ],
      alerts: []
    },
    {
      id: 'TR-20260918-014', vehicleId: 'v-012', fromCampusId: 'c-west', toCampusId: 'c-south',
      coachId: 'coach-3', eta: '2026-09-18T11:10:00+08:00', departAt: iso(70), arrivedAt: iso(68),
      priority: 3, reason: '南港 B2 场地实训支援', status: 'arrived', destination: 'approved',
      hq: 'approved', progress: 1, createdAt: iso(76),
      events: [
        { at: iso(76), type: '提交', actor: '西湖调度员', detail: '提交调车申请' },
        { at: iso(75), type: '目的地确认', actor: '林校长', detail: '确认接收' },
        { at: iso(74), type: '总部放行', actor: '集团调度', detail: '总部放行' },
        { at: iso(70), type: '发车', actor: '吴教练', detail: '车辆出发' },
        { at: iso(68), type: '到达接收', actor: '林校长', detail: '完成到达接收' }
      ],
      alerts: []
    }
  ],
  ruleVersions: [
    { version: 'RULE-2026.07', effectiveAt: '2026-07-01T00:00:00+08:00', note: '夏季跨区训练试行版' },
    { version: 'RULE-2026.09', effectiveAt: '2026-09-01T00:00:00+08:00', note: '按车型与高峰时段细化' }
  ],
  creditRules: [
    { id: 'cr-1', version: 'RULE-2026.09', subject: '科目二', vehicleType: 'C1', timeSlot: '高峰', student: 100, ownerCampus: 20, trainingCampus: 80 },
    { id: 'cr-2', version: 'RULE-2026.09', subject: '科目二', vehicleType: 'C2', timeSlot: '高峰', student: 100, ownerCampus: 30, trainingCampus: 70 },
    { id: 'cr-3', version: 'RULE-2026.09', subject: '科目三', vehicleType: '全部', timeSlot: '平峰', student: 100, ownerCampus: 40, trainingCampus: 60 },
    { id: 'cr-4', version: 'RULE-2026.09', subject: '科目三', vehicleType: '全部', timeSlot: '高峰', student: 100, ownerCampus: 25, trainingCampus: 75 },
    { id: 'cr-5', version: 'RULE-2026.09', subject: '科目四理论', vehicleType: '全部', timeSlot: '全部', student: 100, ownerCampus: 0, trainingCampus: 100 },
    { id: 'cr-6', version: 'RULE-2026.09', subject: '全部', vehicleType: '全部', timeSlot: '全部', student: 100, ownerCampus: 50, trainingCampus: 50 }
  ],
  costRules: [
    { id: 'cost-1', version: 'RULE-2026.09', scope: '异地训练', vehicleType: 'C1', timeSlot: '高峰', fuelOwner: 35, fuelTraining: 65, tollOwner: 20, tollRequesting: 80, depreciationOwner: 70, depreciationTraining: 30 },
    { id: 'cost-2', version: 'RULE-2026.09', scope: '异地训练', vehicleType: 'C2', timeSlot: '高峰', fuelOwner: 40, fuelTraining: 60, tollOwner: 20, tollRequesting: 80, depreciationOwner: 75, depreciationTraining: 25 },
    { id: 'cost-3', version: 'RULE-2026.09', scope: '异地训练', vehicleType: '全部', timeSlot: '平峰', fuelOwner: 50, fuelTraining: 50, tollOwner: 30, tollRequesting: 70, depreciationOwner: 80, depreciationTraining: 20 },
    { id: 'cost-4', version: 'RULE-2026.09', scope: '跨校区调车', vehicleType: '全部', timeSlot: '全部', fuelOwner: 30, fuelTraining: 70, tollOwner: 10, tollRequesting: 90, depreciationOwner: 60, depreciationTraining: 40 }
  ],
  sessions: [
    { id: 's-1', student: '林一诺', subject: '科目二', vehicleType: 'C2', vehicleId: 'v-002', ownerCampusId: 'c-east', trainingCampusId: 'c-west', timeSlot: '高峰', startedAt: iso(26), minutes: 60, ruleVersion: 'RULE-2026.09' },
    { id: 's-2', student: '黄子轩', subject: '科目三', vehicleType: 'C1', vehicleId: 'v-011', ownerCampusId: 'c-east', trainingCampusId: 'c-north', timeSlot: '平峰', startedAt: iso(30), minutes: 90, ruleVersion: 'RULE-2026.09' },
    { id: 's-3', student: '陈嘉', subject: '科目二', vehicleType: 'C1', vehicleId: 'v-001', ownerCampusId: 'c-east', trainingCampusId: 'c-east', timeSlot: '高峰', startedAt: iso(20), minutes: 45, ruleVersion: 'RULE-2026.09' },
    { id: 's-4', student: '许沐', subject: '科目三', vehicleType: 'B2', vehicleId: 'v-005', ownerCampusId: 'c-north', trainingCampusId: 'c-north', timeSlot: '高峰', startedAt: iso(8), minutes: 120, ruleVersion: 'RULE-2026.09' },
    { id: 's-5', student: '周予安', subject: '科目二', vehicleType: 'C2', vehicleId: 'v-002', ownerCampusId: 'c-east', trainingCampusId: 'c-west', timeSlot: '高峰', startedAt: iso(5), minutes: 60, ruleVersion: 'RULE-2026.09' }
  ],
  transferCosts: [
    { id: 'tc-1', requestId: 'TR-20260918-011', vehicleType: 'C1', timeSlot: '高峰', fuel: 86, toll: 24, depreciation: 42, at: iso(32), costRuleVersion: 'RULE-2026.09' },
    { id: 'tc-2', requestId: 'TR-20260918-014', vehicleType: 'B2', timeSlot: '平峰', fuel: 132, toll: 45, depreciation: 78, at: iso(46), costRuleVersion: 'RULE-2026.09' }
  ],
  templates: [
    { id: 'tpl-city', name: '城市校区标准版', version: 'STD-CITY-3.0', noEntryRadius: 80, speedLimit: 20, nightLockdown: '22:30', idleLimitMinutes: 20 },
    { id: 'tpl-exam', name: '考点严管版', version: 'STD-EXAM-2.1', noEntryRadius: 120, speedLimit: 10, nightLockdown: '20:00', idleLimitMinutes: 10 },
    { id: 'tpl-port', name: '港口作业适配版', version: 'STD-PORT-1.4', noEntryRadius: 100, speedLimit: 15, nightLockdown: '21:30', idleLimitMinutes: 15 }
  ],
  geofenceApplications: [
    {
      campusId: 'c-east', templateId: 'tpl-city', templateVersion: 'STD-CITY-3.0', status: '已生效',
      adjustments: [{ field: 'speedLimit', standard: 20, local: 15, reason: '北门接临施工道路，人车混行，下调 5km/h' }]
    },
    {
      campusId: 'c-north', templateId: 'tpl-city', templateVersion: 'STD-CITY-3.0', status: '待总部审批',
      adjustments: [
        { field: 'noEntryRadius', standard: 80, local: 110, reason: '客运广场扩建，需扩大禁入缓冲区' },
        { field: 'speedLimit', standard: 20, local: 15, reason: '隧道口早高峰非机动车较多' }
      ]
    },
    {
      campusId: 'c-south', templateId: 'tpl-port', templateVersion: 'STD-PORT-1.4', status: '已生效',
      adjustments: [{ field: 'idleLimitMinutes', standard: 15, local: 20, reason: '港口闸口排队，需放宽停留阈值' }]
    }
  ],
  geofenceChanges: [
    { id: 'gc-1', campusId: 'c-north', field: 'noEntryRadius', current: 80, requested: 110, impact: '禁入区扩大，夜间可用训练时长预计减少 35 分钟/日', status: '待总部确认', reason: '客运广场施工围挡外扩', createdAt: iso(6) },
    { id: 'gc-2', campusId: 'c-east', field: 'speedLimit', current: 20, requested: 15, impact: '限速下调，科三路线周转预计下降 8%', status: '已确认', reason: '施工道路人车混行', createdAt: iso(72) },
    { id: 'gc-3', campusId: 'c-west', field: 'nightLockdown', current: '22:30', requested: '21:30', impact: '夜间训练排期减少 1 小时', status: '已驳回', reason: '缺少交管备案材料', createdAt: iso(96) }
  ],
  quotaRequests: [
    { id: 'qr-1', campusId: 'c-north', kind: '新增', vehicleType: 'C2', count: 2, reason: '高峰利用率连续 14 天超过 92%', status: '待总部审批' },
    { id: 'qr-2', campusId: 'c-south', kind: '淘汰', vehicleType: 'C1', count: 1, reason: 'v-008 维修成本超过净值 40%', status: '待总部审批' }
  ],
  alerts: [
    { id: 'a-1', level: '高', type: '偏航', vehicleId: 'v-004', campusId: 'c-west', requestId: 'TR-20260919-018', message: '偏离规划路线 320 米', at: iso(0.35), handled: false },
    { id: 'a-2', level: '高', type: '离线', vehicleId: 'v-007', campusId: 'c-north', requestId: 'TR-20260919-019', message: '定位终端离线 18 分钟', at: iso(0.3), handled: false },
    { id: 'a-3', level: '中', type: '超时未达', vehicleId: 'v-007', campusId: 'c-east', requestId: 'TR-20260919-019', message: '超过 ETA 12 分钟仍未到达', at: iso(0.2), handled: false },
    { id: 'a-4', level: '中', type: '长时间停留', vehicleId: 'v-004', campusId: 'c-east', requestId: 'TR-20260919-018', message: '非加油/维修点停留 9 分钟', at: iso(0.8), handled: true },
    { id: 'a-5', level: '中', type: '越界', vehicleId: 'v-012', campusId: 'c-south', message: '进入港口作业禁入区边缘', at: iso(3), handled: false },
    { id: 'a-6', level: '低', type: '超速', vehicleId: 'v-001', campusId: 'c-east', message: '北门限速区峰值 23km/h', at: iso(5), handled: true },
    { id: 'a-7', level: '高', type: '离线', vehicleId: 'v-012', campusId: 'c-south', message: '终端离线超过 40 分钟', at: iso(1.1), handled: false }
  ],
  audit: [
    { id: 'au-1', at: iso(72), actor: '总部运营', category: '围栏', action: '确认东环限速调整', entityId: 'gc-2', before: { speedLimit: 20 }, after: { speedLimit: 15 } },
    { id: 'au-2', at: iso(312), actor: '总部财务', category: '分摊比例', action: '发布 2026.09 成本规则', entityId: 'RULE-2026.09', before: { version: 'RULE-2026.07' }, after: { version: 'RULE-2026.09', fuelTrainingPeak: 65 } },
    { id: 'au-3', at: iso(120), actor: '总部教研', category: '规则', action: '调整 C2 科二高峰学时归属', entityId: 'cr-2', before: { ownerCampus: 25, trainingCampus: 75 }, after: { ownerCampus: 30, trainingCampus: 70 } }
  ]
};
