import type { AppState, GeoPoint, TransferEvent, TransferRequest, TransferStatus } from './types';

const terminal = new Set<TransferStatus>(['rejected', 'withdrawn', 'cancelled', 'timeout_closed', 'received']);
const locked = new Set<TransferStatus>(['awaiting_destination', 'awaiting_hq', 'approved', 'in_transit', 'arrived']);
const active = new Set<TransferStatus>(['awaiting_destination', 'awaiting_hq', 'queued', 'approved', 'in_transit', 'arrived']);

export interface TransferCommand {
  idempotencyKey: string;
  vehicleId: string;
  fromCampusId: string;
  toCampusId: string;
  coachId: string;
  priority: 1 | 2 | 3;
  eta: string;
  note?: string;
  route?: GeoPoint[];
}

const now = () => new Date().toISOString().slice(0, 16).replace('T', ' ');
const event = (actor: TransferEvent['actor'], type: TransferEvent['type'], note?: string): TransferEvent => ({
  id: `${type}-${Math.random().toString(36).slice(2, 8)}`,
  at: now(),
  actor,
  type,
  note
});

function routeBetween(from: GeoPoint, to: GeoPoint): GeoPoint[] {
  return [from, { x: (from.x + to.x) / 2, z: (from.z + to.z) / 2 - 18 }, to];
}

export function vehicleLockedBy(state: AppState, vehicleId: string, exceptId?: string) {
  return state.transfers.find((item) => item.vehicleId === vehicleId && item.id !== exceptId && locked.has(item.status));
}

export function queuedForVehicle(state: AppState, vehicleId: string) {
  return state.transfers
    .filter((item) => item.vehicleId === vehicleId && item.status === 'queued')
    .sort((a, b) => a.priority - b.priority || a.submittedAt.localeCompare(b.submittedAt));
}

export function createTransfer(state: AppState, command: TransferCommand): AppState {
  if (state.transfers.some((item) => item.idempotencyKey === command.idempotencyKey)) return state;
  if (command.fromCampusId === command.toCampusId) throw new Error('目的地校区不能与申请方相同');
  const vehicle = state.vehicles.find((item) => item.id === command.vehicleId);
  const target = state.campuses.find((item) => item.id === command.toCampusId);
  const source = state.campuses.find((item) => item.id === command.fromCampusId);
  if (!vehicle || !target || !source) throw new Error('车辆、申请校区或目的地校区不存在');

  const existingLock = vehicleLockedBy(state, command.vehicleId);
  const shouldQueue = Boolean(existingLock) || vehicle.status === 'training' || state.transfers.some((item) => item.vehicleId === command.vehicleId && item.status === 'queued');
  const request: TransferRequest = {
    id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    code: `DC-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    vehicleId: command.vehicleId,
    fromCampusId: command.fromCampusId,
    toCampusId: command.toCampusId,
    coachId: command.coachId,
    priority: command.priority,
    eta: command.eta,
    submittedAt: now(),
    status: shouldQueue ? 'queued' : 'awaiting_destination',
    route: command.route ?? routeBetween(source.position, target.position),
    progress: 0,
    ruleVersion: 1,
    idempotencyKey: command.idempotencyKey,
    events: [event('source', 'submit', command.note)],
    alerts: []
  };
  if (shouldQueue) request.events.push(event('system', 'queue', existingLock ? `车辆被 ${existingLock.code} 锁定，按优先级排队` : '车辆仍有训练任务，排队等待释放'));
  return normalizeQueue({ ...state, transfers: [...state.transfers, request] }, command.vehicleId);
}

function normalizeQueue(state: AppState, vehicleId: string): AppState {
  const queued = queuedForVehicle(state, vehicleId);
  const hasLock = state.transfers.some((item) => item.vehicleId === vehicleId && locked.has(item.status));
  let transfers = state.transfers.map((item) => {
    if (item.vehicleId !== vehicleId || item.status !== 'queued') return item;
    const rank = queued.findIndex((queuedItem) => queuedItem.id === item.id) + 1;
    return { ...item, queueRank: rank };
  });
  if (!hasLock && queued[0]) {
    const head = queued[0];
    transfers = transfers.map((item) => item.id === head.id
      ? { ...item, status: 'awaiting_destination' as const, queueRank: undefined, events: [...item.events, event('system', 'queue', '队首申请已释放，进入目的地校长确认')] }
      : item);
  }
  return { ...state, transfers };
}

function mutate(state: AppState, id: string, actor: TransferEvent['actor'], type: TransferEvent['type'], next: TransferStatus | ((request: TransferRequest) => TransferRequest), note?: string, guard?: (request: TransferRequest) => boolean): AppState {
  const index = state.transfers.findIndex((item) => item.id === id);
  if (index < 0) return state;
  const current = state.transfers[index];
  if (terminal.has(current.status)) return state;
  if (guard && !guard(current)) return state;
  const deduped = current.events.some((item) => item.type === type && item.actor === actor && Math.abs(new Date(`${item.at.replace(' ', 'T')}Z`).getTime() - Date.now()) < 3000);
  if (deduped) return state;
  const updated = typeof next === 'function' ? next(current) : { ...current, status: next };
  updated.events = [...updated.events, event(actor, type, note)];
  const transfers = [...state.transfers];
  transfers[index] = updated;
  return { ...state, transfers };
}

export const destinationApprove = (state: AppState, id: string, note?: string) =>
  mutate(state, id, 'destination', 'approve_destination', 'awaiting_hq', note, (request) => request.status === 'awaiting_destination');

export const hqApprove = (state: AppState, id: string, note?: string) =>
  mutate(state, id, 'hq', 'approve_hq', 'approved', note, (request) => request.status === 'awaiting_hq');

export const rejectTransfer = (state: AppState, id: string, actor: 'destination' | 'hq', note?: string) => {
  const next = mutate(state, id, actor, 'reject', 'rejected', note, (request) => ['awaiting_destination', 'awaiting_hq', 'queued'].includes(request.status));
  const request = next.transfers.find((item) => item.id === id);
  return request ? normalizeQueue(next, request.vehicleId) : next;
};

export const withdrawTransfer = (state: AppState, id: string, note?: string) => {
  const current = state.transfers.find((item) => item.id === id);
  if (!current || !['awaiting_destination', 'awaiting_hq', 'queued', 'approved'].includes(current.status)) return state;
  const next = mutate(state, id, 'source', 'withdraw', 'withdrawn', note);
  return normalizeQueue(next, current.vehicleId);
};

export const dispatchTransfer = (state: AppState, id: string) => {
  const current = state.transfers.find((item) => item.id === id);
  if (!current || current.status !== 'approved') return state;
  const vehicles = state.vehicles.map((vehicle) => vehicle.id === current.vehicleId ? { ...vehicle, status: 'transferring' as const, position: current.route[0] } : vehicle);
  const transfers = state.transfers.map((item) => item.id === id ? { ...item, status: 'in_transit' as const, events: [...item.events, event('source', 'dispatch')] } : item);
  return { ...state, vehicles, transfers };
};

export const arriveTransfer = (state: AppState, id: string) => {
  const current = state.transfers.find((item) => item.id === id);
  if (!current || current.status !== 'in_transit') return state;
  const destination = state.campuses.find((campus) => campus.id === current.toCampusId);
  const vehicles = state.vehicles.map((vehicle) => vehicle.id === current.vehicleId ? { ...vehicle, position: destination?.position ?? vehicle.position } : vehicle);
  const transfers = state.transfers.map((item) => item.id === id ? { ...item, status: 'arrived' as const, progress: 1, currentPosition: destination?.position, events: [...item.events, event('system', 'arrive')] } : item);
  return { ...state, vehicles, transfers };
};

export const receiveTransfer = (state: AppState, id: string, note?: string) => {
  const current = state.transfers.find((item) => item.id === id);
  if (!current || current.status !== 'arrived') return state;
  const vehicles = state.vehicles.map((vehicle) => vehicle.id === current.vehicleId ? { ...vehicle, currentCampusId: current.toCampusId, status: 'idle' as const } : vehicle);
  let next = mutate({ ...state, vehicles }, id, 'destination', 'receive', 'received', note);
  next = normalizeQueue(next, current.vehicleId);
  return next;
};

export function swapVehicle(state: AppState, id: string, newVehicleId: string, note?: string) {
  const current = state.transfers.find((item) => item.id === id);
  if (!current || !['awaiting_destination', 'awaiting_hq', 'queued', 'approved'].includes(current.status) || current.vehicleId === newVehicleId) return state;
  const target = state.vehicles.find((vehicle) => vehicle.id === newVehicleId);
  if (!target || vehicleLockedBy(state, newVehicleId, id)) return state;
  const oldVehicleId = current.vehicleId;
  let transfers = state.transfers.map((item) => item.id === id ? {
    ...item,
    vehicleId: newVehicleId,
    status: 'awaiting_destination' as const,
    queueRank: undefined,
    idempotencyKey: `${item.idempotencyKey}:${newVehicleId}`,
    events: [...item.events, event('source', 'swap', `${note ?? '换车'}：${oldVehicleId} → ${newVehicleId}`)]
  } : item);
  let next = { ...state, transfers };
  next = normalizeQueue(next, oldVehicleId);
  next = normalizeQueue(next, newVehicleId);
  return next;
}

export const timeoutStaleApprovals = (state: AppState, olderThanHours = 24) => {
  const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000;
  let next = state;
  state.transfers
    .filter((item) => ['awaiting_destination', 'awaiting_hq'].includes(item.status))
    .filter((item) => new Date(`${item.submittedAt.replace(' ', 'T')}Z`).getTime() < cutoff)
    .forEach((item) => { next = mutate(next, item.id, 'system', 'timeout', 'timeout_closed', '审批超时，系统自动关闭并释放车辆'); });
  return next;
};

export function moveInTransit(state: AppState, elapsedSeconds: number): AppState {
  const vehicles = [...state.vehicles];
  const transfers = state.transfers.map((request) => {
    if (request.status !== 'in_transit') return request;
    const progress = Math.min(1, request.progress + elapsedSeconds / 180);
    const point = pointAlong(request.route, progress);
    const vehicleIndex = vehicles.findIndex((vehicle) => vehicle.id === request.vehicleId);
    if (vehicleIndex >= 0) vehicles[vehicleIndex] = { ...vehicles[vehicleIndex], position: point };
    return { ...request, progress, currentPosition: point };
  });
  return { ...state, vehicles, transfers };
}

export function pointAlong(route: GeoPoint[], progress: number): GeoPoint {
  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < route.length; i += 1) {
    const length = Math.hypot(route[i].x - route[i - 1].x, route[i].z - route[i - 1].z);
    lengths.push(length);
    total += length;
  }
  let target = progress * total;
  for (let i = 1; i < route.length; i += 1) {
    if (target <= lengths[i - 1] || i === route.length - 1) {
      const segmentProgress = lengths[i - 1] === 0 ? 0 : target / lengths[i - 1];
      return {
        x: route[i - 1].x + (route[i].x - route[i - 1].x) * segmentProgress,
        z: route[i - 1].z + (route[i].z - route[i - 1].z) * segmentProgress
      };
    }
    target -= lengths[i - 1];
  }
  return route[route.length - 1];
}

export const transferStatusText: Record<TransferStatus, string> = {
  draft: '草稿',
  awaiting_destination: '目的地确认中',
  awaiting_hq: '总部审批中',
  queued: '排队中',
  approved: '已批准待发车',
  in_transit: '在途',
  arrived: '已到达待接收',
  received: '已接收',
  rejected: '已驳回',
  withdrawn: '已撤回',
  cancelled: '已取消',
  timeout_closed: '超时关闭'
};

export { active as activeTransferStatuses, locked as lockedTransferStatuses, terminal as terminalTransferStatuses };
