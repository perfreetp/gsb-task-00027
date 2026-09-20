export type Role = 'hq' | 'principal' | 'coach';
export type VehicleType = 'C1' | 'C2' | 'B2';
export type Subject = '科目二' | '科目三' | '科目四理论';

export interface RoleState {
  role: Role;
  campusId?: string;
  coachId?: string;
}

export interface Campus {
  id: string;
  name: string;
  x: number;
  z: number;
  color: number;
  principal: string;
  trainingSlots: number;
  occupiedSlots: number;
  zones: CampusZone[];
  geofenceVersion: string;
  templateVersion: string;
}

export interface CampusZone {
  id: string;
  name: string;
  kind: '库位' | '训练区' | '限速区' | '禁入区' | '接待区';
  occupied?: number;
  capacity?: number;
  speedLimit?: number;
}

export interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  type: VehicleType;
  assignedCoachId?: string;
  ownerCampusId: string;
  currentCampusId: string;
  status: '在训' | '闲置' | '调车中' | '维修' | '离线';
  terminalOnline: boolean;
  inspectionDue: string;
  insuranceDue: string;
  maintenanceDue: string;
  dailyTrainingMinutes: number;
  idleMinutes: number;
  alertCount: number;
}

export interface Coach {
  id: string;
  name: string;
  campusId: string;
}

export type DispatchStatus =
  | 'queued'
  | 'destination_pending'
  | 'destination_approved'
  | 'hq_approved'
  | 'in_transit'
  | 'arrived'
  | 'rejected'
  | 'withdrawn'
  | 'timeout_rollback';

export type StageDecision = 'pending' | 'approved' | 'rejected';

export interface DispatchEvent {
  at: string;
  type: string;
  actor: string;
  detail: string;
}

export interface DispatchRequest {
  id: string;
  vehicleId: string;
  originalVehicleId?: string;
  fromCampusId: string;
  toCampusId: string;
  coachId: string;
  eta: string;
  departAt?: string;
  arrivedAt?: string;
  priority: 1 | 2 | 3;
  reason: string;
  status: DispatchStatus;
  destination: StageDecision;
  hq: StageDecision;
  progress: number;
  createdAt: string;
  events: DispatchEvent[];
  alerts: string[];
}

export interface RuleVersion {
  version: string;
  effectiveAt: string;
  note: string;
}

export interface CreditRule {
  id: string;
  version: string;
  subject: Subject | '全部';
  vehicleType: VehicleType | '全部';
  timeSlot: '平峰' | '高峰' | '全部';
  student: number;
  ownerCampus: number;
  trainingCampus: number;
}

export interface CostRule {
  id: string;
  version: string;
  scope: '异地训练' | '跨校区调车';
  vehicleType: VehicleType | '全部';
  timeSlot: '平峰' | '高峰' | '全部';
  fuelOwner: number;
  fuelTraining: number;
  tollOwner: number;
  tollRequesting: number;
  depreciationOwner: number;
  depreciationTraining: number;
}

export interface TrainingSession {
  id: string;
  student: string;
  subject: Subject;
  vehicleType: VehicleType;
  vehicleId: string;
  ownerCampusId: string;
  trainingCampusId: string;
  timeSlot: '平峰' | '高峰';
  startedAt: string;
  minutes: number;
  ruleVersion: string;
}

export interface TransferCost {
  id: string;
  requestId: string;
  vehicleType: VehicleType;
  timeSlot: '平峰' | '高峰';
  fuel: number;
  toll: number;
  depreciation: number;
  at: string;
  costRuleVersion: string;
}

export interface GeofenceTemplate {
  id: string;
  name: string;
  version: string;
  noEntryRadius: number;
  speedLimit: number;
  nightLockdown: string;
  idleLimitMinutes: number;
}

export interface LocalAdjustment {
  field: keyof Omit<GeofenceTemplate, 'id' | 'name' | 'version'>;
  standard: string | number;
  local: string | number;
  reason: string;
}

export interface GeofenceApplication {
  campusId: string;
  templateId: string;
  templateVersion: string;
  adjustments: LocalAdjustment[];
  status: '已生效' | '待总部审批' | '已驳回';
}

export interface GeofenceChange {
  id: string;
  campusId: string;
  field: string;
  current: string | number;
  requested: string | number;
  impact: string;
  status: '待总部确认' | '已确认' | '已驳回';
  reason: string;
  createdAt: string;
}

export interface FleetQuotaRequest {
  id: string;
  campusId: string;
  kind: '新增' | '淘汰';
  vehicleType: VehicleType;
  count: number;
  reason: string;
  status: '待总部审批' | '已批准' | '已驳回';
}

export interface AlertItem {
  id: string;
  level: '高' | '中' | '低';
  type: '偏航' | '超时未达' | '长时间停留' | '越界' | '离线' | '超速';
  vehicleId: string;
  campusId: string;
  requestId?: string;
  message: string;
  at: string;
  handled: boolean;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  category: '围栏' | '规则' | '分摊比例' | '审批' | '车辆';
  action: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

export interface AppState {
  role: RoleState;
  campuses: Campus[];
  vehicles: Vehicle[];
  coaches: Coach[];
  requests: DispatchRequest[];
  ruleVersions: RuleVersion[];
  creditRules: CreditRule[];
  costRules: CostRule[];
  sessions: TrainingSession[];
  transferCosts: TransferCost[];
  templates: GeofenceTemplate[];
  geofenceApplications: GeofenceApplication[];
  geofenceChanges: GeofenceChange[];
  quotaRequests: FleetQuotaRequest[];
  alerts: AlertItem[];
  audit: AuditEntry[];
}
