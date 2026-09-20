export type Role = 'hq' | 'principal' | 'dispatcher' | 'coach';

export interface User {
  id: string;
  name: string;
  role: Role;
  campusId?: string;
  coachId?: string;
}

export interface GeoPoint {
  x: number;
  z: number;
}

export interface Campus {
  id: string;
  name: string;
  shortName: string;
  position: GeoPoint;
  color: number;
  boundary: GeoPoint[];
  examCenter?: boolean;
  slots: number;
}

export type VehicleStatus = 'training' | 'idle' | 'transferring' | 'maintenance' | 'offline';

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  carType: 'C1' | 'C2' | 'B2';
  ownerCampusId: string;
  currentCampusId: string;
  status: VehicleStatus;
  position: GeoPoint;
  heading: number;
  coachId: string;
  terminalOnline: boolean;
  annualInspectionDue: string;
  insuranceDue: string;
  maintenanceDue: string;
  purchaseDate: string;
  dailyTrainingMinutes: number;
  idleMinutes: number;
  alertCount: number;
  depreciationDaily: number;
}

export interface Coach {
  id: string;
  name: string;
  campusId: string;
  phone: string;
}

export type FenceKind = 'no-entry' | 'speed-limit' | 'training-area';

export interface Fence {
  id: string;
  campusId: string;
  templateId?: string;
  name: string;
  kind: FenceKind;
  polygon: GeoPoint[];
  limitKmh?: number;
  enabled: boolean;
  localAdjustment?: string;
  diffReason?: string;
  version: number;
  pendingApproval?: boolean;
  proposedChange?: Partial<Pick<Fence, 'limitKmh' | 'diffReason' | 'localAdjustment'>>;
  updatedAt: string;
}

export interface FenceTemplate {
  id: string;
  name: string;
  kind: FenceKind;
  defaultLimitKmh?: number;
  description: string;
}

export type Subject = 'subject2' | 'subject3';

export interface HourRule {
  id: string;
  subject: Subject;
  carType: 'C1' | 'C2' | 'B2' | 'ALL';
  timeBand: 'day' | 'night' | 'ALL';
  studentShare: number;
  ownerShare: number;
  trainingShare: number;
  effectiveFrom: string;
  version: number;
}

export interface CostRule {
  id: string;
  costType: 'fuel' | 'toll' | 'depreciation';
  subject: Subject | 'ALL';
  carType: 'C1' | 'C2' | 'B2' | 'ALL';
  timeBand: 'day' | 'night' | 'ALL';
  ownerShare: number;
  userShare: number;
  hqShare: number;
  effectiveFrom: string;
  version: number;
}

export type TransferStatus =
  | 'draft'
  | 'awaiting_destination'
  | 'awaiting_hq'
  | 'queued'
  | 'approved'
  | 'in_transit'
  | 'arrived'
  | 'received'
  | 'rejected'
  | 'withdrawn'
  | 'cancelled'
  | 'timeout_closed';

export type TransferEventActor = 'source' | 'destination' | 'hq' | 'system';

export interface TransferEvent {
  id: string;
  at: string;
  actor: TransferEventActor;
  type: 'submit' | 'approve_destination' | 'approve_hq' | 'queue' | 'reject' | 'withdraw' | 'dispatch' | 'arrive' | 'receive' | 'swap' | 'timeout' | 'cancel';
  note?: string;
}

export interface TransferRequest {
  id: string;
  code: string;
  vehicleId: string;
  fromCampusId: string;
  toCampusId: string;
  coachId: string;
  priority: 1 | 2 | 3;
  eta: string;
  submittedAt: string;
  status: TransferStatus;
  route: GeoPoint[];
  currentPosition?: GeoPoint;
  progress: number;
  ruleVersion: number;
  idempotencyKey: string;
  events: TransferEvent[];
  queueRank?: number;
  alerts: string[];
}

export interface AlertItem {
  id: string;
  level: 'high' | 'medium' | 'low';
  type: 'geofence' | 'offline' | 'speeding' | 'route' | 'timeout' | 'stop';
  campusId: string;
  vehicleId: string;
  message: string;
  at: string;
  status: 'open' | 'acknowledged';
}

export interface AuditLog {
  id: string;
  module: 'fence' | 'hour-rule' | 'cost-rule' | 'vehicle-quota';
  targetId: string;
  action: string;
  before: string;
  after: string;
  operator: string;
  at: string;
}

export interface MonthlyRecord {
  month: string;
  transferCount: number;
  crossCampusHours: number;
  allocatedAmount: number;
  exceptions: number;
}

export interface AppState {
  currentUserId: string;
  users: User[];
  campuses: Campus[];
  vehicles: Vehicle[];
  coaches: Coach[];
  fences: Fence[];
  templates: FenceTemplate[];
  hourRules: HourRule[];
  costRules: CostRule[];
  transfers: TransferRequest[];
  alerts: AlertItem[];
  auditLogs: AuditLog[];
  monthly: MonthlyRecord[];
}
