import type {
  AppState, Campus, CostRule, CreditRule, DispatchRequest, DispatchStatus, GeofenceChange,
  LocalAdjustment, RoleState, TransferCost, TrainingSession, Vehicle
} from './types';

export const activeStatuses: DispatchStatus[] = ['queued', 'destination_approved', 'hq_approved', 'in_transit'];
const terminalStatuses: DispatchStatus[] = ['arrived', 'rejected', 'withdrawn', 'timeout_rollback'];

export interface NewDispatchInput {
  vehicleId: string;
  fromCampusId: string;
  toCampusId: string;
  coachId: string;
  eta: string;
  priority: 1 | 2 | 3;
  reason: string;
}

export const nowIso = () => new Date().toISOString();

export const campusName = (state: Pick<AppState, 'campuses'>, id: string) =>
  state.campuses.find((campus) => campus.id === id)?.name ?? id;

export const vehicleLabel = (state: Pick<AppState, 'vehicles'>, id: string) => {
  const vehicle = state.vehicles.find((item) => item.id === id);
  return vehicle ? `${vehicle.plate}（${vehicle.type}）` : id;
};

export const isRoleAllowed = (role: RoleState, campusId: string, coachId?: string) => {
  if (role.role === 'hq') return true;
  if (role.role === 'principal') return role.campusId === campusId;
  return role.coachId === coachId;
};

export function activeRequestForVehicle(state: AppState, vehicleId: string, excludeId?: string) {
  return state.requests.find((request) =>
    request.vehicleId === vehicleId &&
    request.id !== excludeId &&
    activeStatuses.includes(request.status)
  );
}

export function queuePosition(state: AppState, request: DispatchRequest) {
  const active = state.requests
    .filter((item) => item.vehicleId === request.vehicleId && activeStatuses.includes(item.status))
    .sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt));
  const index = active.findIndex((item) => item.id === request.id);
  return { rank: index + 1, total: active.length, head: active[0]?.id === request.id };
}

const addEvent = (request: DispatchRequest, type: string, actor: string, detail: string): DispatchRequest => ({
  ...request,
  events: [...request.events, { at: nowIso(), type, actor, detail }]
});

const withAudit = (state: AppState, entry: Omit<AppState['audit'][number], 'id' | 'at'>): AppState => ({
  ...state,
  audit: [{ ...entry, id: `au-${Date.now()}-${state.audit.length + 1}`, at: nowIso() }, ...state.audit]
});

const updateVehicle = (state: AppState, vehicleId: string, patch: Partial<Vehicle>): AppState => ({
  ...state,
  vehicles: state.vehicles.map((vehicle) => vehicle.id === vehicleId ? { ...vehicle, ...patch } : vehicle)
});

function nextReadyForVehicle(state: AppState, vehicleId: string) {
  return state.requests
    .filter((request) => request.vehicleId === vehicleId && request.status === 'queued' && request.destination === 'approved' && request.hq === 'approved')
    .sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt))[0];
}

function advanceQueue(state: AppState, vehicleId: string): AppState {
  const ready = nextReadyForVehicle(state, vehicleId);
  if (!ready) return state;
  return {
    ...state,
    requests: state.requests.map((request) => request.id === ready.id
      ? addEvent({ ...request, status: 'hq_approved' }, '队列裁决', '系统', '前方占用已释放，按优先级成为队首，获得车辆派用权')
      : request)
  };
}

function mutateRequest(state: AppState, requestId: string, actor: string, eventType: string, detail: string, patch: Partial<DispatchRequest>, auditAction?: string): AppState {
  const target = state.requests.find((request) => request.id === requestId);
  if (!target) throw new Error('调车单不存在');
  const next = addEvent({ ...target, ...patch }, eventType, actor, detail);
  let nextState: AppState = { ...state, requests: state.requests.map((request) => request.id === requestId ? next : request) };
  if (auditAction) {
    nextState = withAudit(nextState, { actor, category: '审批', action: auditAction, entityId: requestId, before: target, after: next });
  }
  return nextState;
}

export function submitDispatchRequest(previous: AppState, input: NewDispatchInput): AppState {
  const vehicle = previous.vehicles.find((item) => item.id === input.vehicleId);
  if (!vehicle) throw new Error('请选择有效车辆');
  if (input.fromCampusId === input.toCampusId) throw new Error('目的地校区不能与申请方相同');
  const collision = activeRequestForVehicle(previous, input.vehicleId);
  const status: DispatchStatus = 'destination_pending';
  const id = `TR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(previous.requests.length + 21).padStart(3, '0')}`;
  const request: DispatchRequest = {
    ...input,
    id,
    status,
    destination: 'pending',
    hq: 'pending',
    progress: 0,
    createdAt: nowIso(),
    events: [{ at: nowIso(), type: '提交', actor: actorName(previous), detail: collision ? `车辆存在未闭环调车单 ${collision.id}，按优先级 ${input.priority} 排队` : '提交申请，等待目的地校长接收确认' }],
    alerts: []
  };
  let state: AppState = { ...previous, requests: [request, ...previous.requests] };
  state = withAudit(state, { actor: actorName(previous), category: '审批', action: collision ? '创建排队调车申请' : '创建调车申请', entityId: id, after: request });
  return state;
}

function actorName(state: AppState) {
  if (state.role.role === 'hq') return '总部运营';
  if (state.role.role === 'principal') return `${campusName(state, state.role.campusId ?? '')}校长`;
  return previousCoachName(state);
}
function previousCoachName(state: AppState) {
  return state.coaches.find((coach) => coach.id === state.role.coachId)?.name ?? '随车教练';
}

export function approveStage(previous: AppState, requestId: string, stage: 'destination' | 'hq'): AppState {
  const request = previous.requests.find((item) => item.id === requestId);
  if (!request) throw new Error('调车单不存在');
  if (!['destination_pending', 'queued'].includes(request.status) && stage === 'destination') throw new Error('当前状态不能重复确认');
  if (stage === 'hq' && request.destination !== 'approved') throw new Error('目的地校长尚未确认，总部不能放行');
  if (stage === 'hq' && request.status === 'in_transit') throw new Error('该申请已放行，请勿重复操作');

  const actor = stage === 'destination'
    ? `${campusName(previous, request.toCampusId)}校长`
    : '总部调度';
  const destination: DispatchRequest['destination'] = stage === 'destination' ? 'approved' : request.destination;
  const hq: DispatchRequest['hq'] = stage === 'hq' ? 'approved' : request.hq;
  const approvedBoth = destination === 'approved' && hq === 'approved';
  const competing = previous.requests
    .filter((item) => item.id !== request.id &&
      item.vehicleId === request.vehicleId &&
      ['hq_approved', 'in_transit'].includes(item.status))
    .sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt))[0];
  const canGrant = approvedBoth && (
    !competing ? true
    : competing.status === 'in_transit' ? false
    : request.priority < competing.priority || (request.priority === competing.priority && request.createdAt < competing.createdAt)
  );
  const status: DispatchStatus = !approvedBoth
    ? (request.status === 'queued' ? 'queued' : 'destination_approved')
    : canGrant
      ? 'hq_approved'
      : 'queued';
  const detail = stage === 'destination' ? '确认接收车辆并预留场地资源' : '完成跨校安全、围栏与额度校验';
  let nextState = mutateRequest(previous, requestId, actor, stage === 'destination' ? '目的地确认' : '总部放行', detail, { destination, hq, status }, '审批调车申请');
  if (status === 'hq_approved') {
    nextState = {
      ...nextState,
      requests: nextState.requests.map((item) => {
        if (item.id === requestId || item.vehicleId !== request.vehicleId || item.status !== 'hq_approved') return item;
        const loses = request.priority < item.priority || (request.priority === item.priority && request.createdAt < item.createdAt);
        return loses ? addEvent({ ...item, status: 'queued' }, '队列裁决', '系统', `更高优先级或更早申请 ${requestId} 获得车辆派用权，本单转为排队`) : item;
      })
    };
  }
  return nextState;
}

export function rejectRequest(previous: AppState, requestId: string, stage: 'destination' | 'hq', reason: string): AppState {
  const request = previous.requests.find((item) => item.id === requestId);
  if (!request || terminalStatuses.includes(request.status)) throw new Error('该申请已闭环，不能驳回');
  const actor = stage === 'destination' ? `${campusName(previous, request.toCampusId)}校长` : '总部调度';
  let state = mutateRequest(previous, requestId, actor, '驳回', reason, {
    status: 'rejected',
    destination: stage === 'destination' ? 'rejected' : request.destination,
    hq: stage === 'hq' ? 'rejected' : request.hq
  }, '驳回调车申请');
  state = advanceQueue(state, request.vehicleId);
  return state;
}

export function withdrawRequest(previous: AppState, requestId: string, reason: string): AppState {
  const request = previous.requests.find((item) => item.id === requestId);
  if (!request || terminalStatuses.includes(request.status)) throw new Error('该申请已闭环，不能撤回');
  if (request.status === 'in_transit') throw new Error('车辆已在途，请执行召回或到达异常处理');
  let state = mutateRequest(previous, requestId, actorName(previous), '撤回', reason || '申请方撤回，预留资源同步释放', { status: 'withdrawn' }, '撤回调车申请');
  state = advanceQueue(state, request.vehicleId);
  return state;
}

export function departVehicle(previous: AppState, requestId: string): AppState {
  const request = previous.requests.find((item) => item.id === requestId);
  if (!request) throw new Error('调车单不存在');
  if (request.status === 'in_transit') throw new Error('车辆已发车，禁止重复发车');
  const queue = queuePosition(previous, request);
  if (!queue.head) throw new Error('该车仍有更高优先级申请未处理，当前申请排队等待，不能发车');
  if (request.status !== 'hq_approved') throw new Error('双方确认和总部放行完成后才能发车');


  let state = mutateRequest(previous, requestId, actorName(previous), '发车', '获得唯一派用权，电子围栏切换为在途模式', { status: 'in_transit', departAt: nowIso() }, '车辆发车');
  state = updateVehicle(state, request.vehicleId, { status: '调车中' });
  return state;
}

export function changeDispatchVehicle(previous: AppState, requestId: string, newVehicleId: string, reason: string): AppState {
  const request = previous.requests.find((item) => item.id === requestId);
  if (!request) throw new Error('调车单不存在');
  if (request.status === 'in_transit') throw new Error('在途车辆不能直接换车，请先创建异常回滚单');
  if (terminalStatuses.includes(request.status)) throw new Error('闭环申请不能换车');
  const vehicle = previous.vehicles.find((item) => item.id === newVehicleId);
  if (!vehicle) throw new Error('新车不存在');
  const collision = previous.requests.find((item) => item.id !== request.id &&
    item.vehicleId === newVehicleId &&
    ['destination_approved', 'hq_approved', 'in_transit'].includes(item.status));
  if (collision) throw new Error(`新车已有待发或在途调车单 ${collision.id}`);

  const replacedId = `TR-REP-${request.id.split('-').slice(-2).join('-')}`;
  const replacement: DispatchRequest = {
    ...request,
    id: replacedId,
    originalVehicleId: request.originalVehicleId ?? request.vehicleId,
    vehicleId: newVehicleId,
    status: 'destination_pending',
    destination: 'pending',
    hq: 'pending',
    progress: 0,
    createdAt: nowIso(),
    events: [...request.events, { at: nowIso(), type: '换车重提', actor: actorName(previous), detail: `${vehicleLabel(previous, request.vehicleId)} 更换为 ${vehicleLabel(previous, newVehicleId)}：${reason}` }],
    alerts: []
  };
  const old = addEvent({ ...request, status: 'withdrawn' }, '系统', '换车回滚', `原车辆释放，换车由新单 ${replacedId} 承接，原单不再占用车辆`);
  let state: AppState = {
    ...previous,
    requests: [replacement, ...previous.requests.map((item) => item.id === requestId ? old : item)]
  };
  state = withAudit(state, { actor: actorName(previous), category: '审批', action: '换车并回滚原申请', entityId: replacedId, before: { vehicleId: request.vehicleId }, after: { vehicleId: newVehicleId, reason } });
  return state;
}

export function timeoutRollback(previous: AppState, requestId: string, reason: string): AppState {
  const request = previous.requests.find((item) => item.id === requestId);
  if (!request || terminalStatuses.includes(request.status)) throw new Error('申请已闭环');
  let state = mutateRequest(previous, requestId, '系统', '超时回滚', reason, { status: 'timeout_rollback' }, '超时自动回滚');
  state = updateVehicle(state, request.vehicleId, { status: '闲置' });
  state = advanceQueue(state, request.vehicleId);
  return state;
}

export function arriveVehicle(previous: AppState, requestId: string): AppState {
  const request = previous.requests.find((item) => item.id === requestId);
  if (!request) throw new Error('调车单不存在');
  if (request.status === 'arrived') throw new Error('该车辆已完成接收，不能重复入账');
  if (request.status !== 'in_transit') throw new Error('只有在途车辆可以确认到达');
  const duplicate = previous.transferCosts.some((cost) => cost.requestId === requestId);
  if (duplicate) throw new Error('该调车单已生成成本，防重复入账拦截');
  const vehicle = previous.vehicles.find((item) => item.id === request.vehicleId);
  if (!vehicle) throw new Error('车辆不存在');

  const arrivedAt = nowIso();
  let state = mutateRequest(previous, requestId, `${campusName(previous, request.toCampusId)}校长`, '到达接收', '目的地校长确认接收，车辆当前校区更新', {
    status: 'arrived', progress: 1, arrivedAt
  }, '确认车辆到达');
  state = updateVehicle(state, request.vehicleId, { currentCampusId: request.toCampusId, status: '闲置', alertCount: 0 });
  const cost = calculateTransferCost(state, request, vehicle.type, arrivedAt);
  state = { ...state, transferCosts: [cost, ...state.transferCosts] };
  state = advanceQueue(state, request.vehicleId);
  return state;
}

const score = (wanted: string, actual: string) => wanted === '全部' || wanted === actual;

function ruleMatch<T extends { version: string; subject?: string; vehicleType: string; timeSlot: string }>(
  rules: T[], subject: string, vehicleType: string, timeSlot: string, version: string
) {
  const matches = rules.filter((rule) => rule.version === version &&
    score(rule.subject ?? '全部', subject) &&
    score(rule.vehicleType, vehicleType) &&
    score(rule.timeSlot, timeSlot));
  return matches.sort((a, b) => specificity(b) - specificity(a))[0];
}

function specificity(rule: { subject?: string; vehicleType: string; timeSlot: string }) {
  return (rule.subject && rule.subject !== '全部' ? 4 : 0) +
    (rule.vehicleType !== '全部' ? 2 : 0) +
    (rule.timeSlot !== '全部' ? 1 : 0);
}

export const getCreditRule = (state: Pick<AppState, 'creditRules'>, session: Pick<TrainingSession, 'subject' | 'vehicleType' | 'timeSlot' | 'ruleVersion'>) =>
  ruleMatch<CreditRule>(state.creditRules, session.subject, session.vehicleType, session.timeSlot, session.ruleVersion);

export function calculateCredit(state: AppState, session: TrainingSession) {
  const rule = getCreditRule(state, session);
  if (!rule) throw new Error(`找不到 ${session.ruleVersion} 版本学时规则`);
  return {
    rule,
    studentMinutes: session.minutes * rule.student / 100,
    ownerMinutes: session.minutes * rule.ownerCampus / 100,
    trainingMinutes: session.minutes * rule.trainingCampus / 100
  };
}

export function calculateTrainingCosts(state: AppState, session: TrainingSession, fuelPerHour: number, depreciationPerHour: number) {
  const rule = ruleMatch<CostRule>(
    state.costRules.filter((item) => item.scope === '异地训练'),
    session.subject, session.vehicleType, session.timeSlot, session.ruleVersion
  );
  if (!rule) throw new Error(`找不到 ${session.ruleVersion} 版本成本规则`);
  const hours = session.minutes / 60;
  const fuel = Math.round(fuelPerHour * hours);
  const depreciation = Math.round(depreciationPerHour * hours);
  return {
    rule,
    fuel: splitCost(fuel, rule.fuelOwner, rule.fuelTraining),
    depreciation: splitCost(depreciation, rule.depreciationOwner, rule.depreciationTraining)
  };
}

function splitCost(total: number, first: number, second: number) {
  const firstAmount = Math.round(total * first / 100);
  return { total, firstAmount, secondAmount: total - firstAmount, firstRatio: first, secondRatio: second };
}

export function calculateTransferCost(state: AppState, request: DispatchRequest, vehicleType: Vehicle['type'], at: string): TransferCost {
  const timeSlot = new Date(at).getHours() >= 17 ? '高峰' : '平峰';
  const rule = ruleMatch<CostRule>(
    state.costRules.filter((item) => item.scope === '跨校区调车'),
    '全部', vehicleType, timeSlot, 'RULE-2026.09'
  );
  if (!rule) throw new Error('找不到跨校区调车成本规则');
  const baseFuel = vehicleType === 'B2' ? 132 : vehicleType === 'C2' ? 88 : 76;
  const toll = vehicleType === 'B2' ? 45 : timeSlot === '高峰' ? 28 : 18;
  const depreciation = vehicleType === 'B2' ? 78 : 42;
  return {
    id: `tc-${Date.now()}`,
    requestId: request.id,
    vehicleType,
    timeSlot,
    fuel: baseFuel,
    toll,
    depreciation,
    at,
    costRuleVersion: rule.version
  };
}

export function getCostRuleById(state: AppState, id: string) {
  return state.costRules.find((rule) => rule.id === id);
}

export function transferAllocation(state: AppState, cost: TransferCost, request: DispatchRequest) {
  const rule = state.costRules.find((item) =>
    item.scope === '跨校区调车' && item.version === cost.costRuleVersion &&
    score(item.vehicleType, cost.vehicleType) && score(item.timeSlot, cost.timeSlot));
  if (!rule) throw new Error('历史成本规则缺失');
  return {
    fuel: { owner: Math.round(cost.fuel * rule.fuelOwner / 100), requesting: cost.fuel - Math.round(cost.fuel * rule.fuelOwner / 100) },
    toll: { owner: Math.round(cost.toll * rule.tollOwner / 100), requesting: cost.toll - Math.round(cost.toll * rule.tollOwner / 100) },
    depreciation: { owner: Math.round(cost.depreciation * rule.depreciationOwner / 100), requesting: cost.depreciation - Math.round(cost.depreciation * rule.depreciationOwner / 100) }
  };
}

export function switchRole(previous: AppState, role: RoleState): AppState {
  if (role.role === 'principal' && !role.campusId) role = { role: 'principal', campusId: previous.campuses[0].id };
  if (role.role === 'coach' && !role.coachId) role = { role: 'coach', coachId: previous.coaches[0].id, campusId: previous.coaches[0].campusId };
  return { ...previous, role };
}

export function publishRuleVersion(previous: AppState, note: string): AppState {
  const version = `RULE-2026.${String(previous.ruleVersions.length + 7).padStart(2, '0')}`;
  const clonedCredit = previous.creditRules.map((rule, index) => ({ ...rule, id: `cr-${Date.now()}-${index}`, version }));
  const clonedCost = previous.costRules.map((rule, index) => ({ ...rule, id: `cost-${Date.now()}-${index}`, version }));
  return withAudit({
    ...previous,
    ruleVersions: [{ version, effectiveAt: nowIso(), note }, ...previous.ruleVersions],
    creditRules: [...clonedCredit, ...previous.creditRules],
    costRules: [...clonedCost, ...previous.costRules]
  }, { actor: actorName(previous), category: '规则', action: `发布新版本 ${version}`, entityId: version, after: { note } });
}

export function updateCreditRule(previous: AppState, id: string, patch: Partial<Pick<CreditRule, 'ownerCampus' | 'trainingCampus'>>): AppState {
  const before = previous.creditRules.find((rule) => rule.id === id);
  if (!before) throw new Error('规则不存在');
  const owner = patch.ownerCampus ?? before.ownerCampus;
  const training = patch.trainingCampus ?? before.trainingCampus;
  if (owner + training !== 100) throw new Error('车属校区与训练校区分摊比例合计必须为 100%');
  const after = { ...before, ownerCampus: owner, trainingCampus: training };
  return withAudit({
    ...previous,
    creditRules: previous.creditRules.map((rule) => rule.id === id ? after : rule)
  }, { actor: actorName(previous), category: '分摊比例', action: '调整跨区学时归属比例', entityId: id, before, after });
}

export function updateCostRule(previous: AppState, id: string, patch: Partial<CostRule>): AppState {
  const before = previous.costRules.find((rule) => rule.id === id);
  if (!before) throw new Error('成本规则不存在');
  const after = { ...before, ...patch };
  const pairs: Array<[keyof CostRule, keyof CostRule]> = [
    ['fuelOwner', 'fuelTraining'], ['tollOwner', 'tollRequesting'], ['depreciationOwner', 'depreciationTraining']
  ];
  for (const [left, right] of pairs) {
    if (Number(after[left]) + Number(after[right]) !== 100) throw new Error(`${String(left)} 与 ${String(right)} 比例合计必须为 100%`);
  }
  return withAudit({
    ...previous,
    costRules: previous.costRules.map((rule) => rule.id === id ? after : rule)
  }, { actor: actorName(previous), category: '分摊比例', action: '调整成本分摊比例', entityId: id, before, after });
}

export function applyTemplate(previous: AppState, campusId: string, templateId: string, adjustments: LocalAdjustment[]): AppState {
  const campus = previous.campuses.find((item) => item.id === campusId);
  const template = previous.templates.find((item) => item.id === templateId);
  if (!campus || !template) throw new Error('校区或模板不存在');
  if (adjustments.some((item) => !item.reason.trim())) throw new Error('本地微调必须注明差异原因');
  const application = { campusId, templateId, templateVersion: template.version, adjustments, status: '待总部审批' as const };
  const before = previous.geofenceApplications.find((item) => item.campusId === campusId);
  return withAudit({
    ...previous,
    geofenceApplications: [application, ...previous.geofenceApplications.filter((item) => item.campusId !== campusId)]
  }, { actor: `${campus.name}校长`, category: '围栏', action: '套用围栏模板并提交差异', entityId: campusId, before, after: application });
}

export function approveGeofenceApplication(previous: AppState, campusId: string): AppState {
  const application = previous.geofenceApplications.find((item) => item.campusId === campusId && item.status === '待总部审批');
  if (!application) throw new Error('没有待审批的模板套用申请');
  const campus = previous.campuses.find((item) => item.id === campusId);
  let state: AppState = {
    ...previous,
    geofenceApplications: previous.geofenceApplications.map((item) => item.campusId === campusId ? { ...item, status: '已生效' } : item),
    campuses: previous.campuses.map((item) => item.id === campusId ? { ...item, templateVersion: application.templateVersion, geofenceVersion: `GF-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String(Date.now()).slice(-2)}` } : item)
  };
  state = withAudit(state, { actor: actorName(previous), category: '围栏', action: `批准 ${campus?.name} 围栏模板`, entityId: campusId, before: application, after: { ...application, status: '已生效' } });
  return state;
}

export function submitGeofenceChange(previous: AppState, input: Omit<GeofenceChange, 'id' | 'status' | 'createdAt'>): AppState {
  const change: GeofenceChange = { ...input, id: `gc-${Date.now()}`, status: '待总部确认', createdAt: nowIso() };
  return withAudit({ ...previous, geofenceChanges: [change, ...previous.geofenceChanges] }, {
    actor: `${campusName(previous, input.campusId)}校长`, category: '围栏', action: '提交围栏安全变更', entityId: change.id, after: change
  });
}

export function decideGeofenceChange(previous: AppState, id: string, approve: boolean): AppState {
  const before = previous.geofenceChanges.find((item) => item.id === id);
  if (!before || before.status !== '待总部确认') throw new Error('变更单不可处理');
  const after = { ...before, status: approve ? '已确认' as const : '已驳回' as const };
  return withAudit({
    ...previous,
    geofenceChanges: previous.geofenceChanges.map((item) => item.id === id ? after : item)
  }, { actor: actorName(previous), category: '围栏', action: approve ? '确认围栏变更' : '驳回围栏变更', entityId: id, before, after });
}

export function decideQuotaRequest(previous: AppState, id: string, approve: boolean): AppState {
  const before = previous.quotaRequests.find((item) => item.id === id);
  if (!before || before.status !== '待总部审批') throw new Error('额度申请不可处理');
  const after = { ...before, status: approve ? '已批准' as const : '已驳回' as const };
  return withAudit({
    ...previous,
    quotaRequests: previous.quotaRequests.map((item) => item.id === id ? after : item)
  }, { actor: actorName(previous), category: '车辆', action: approve ? '批准车辆额度申请' : '驳回车辆额度申请', entityId: id, before, after });
}

export function handleAlert(previous: AppState, id: string): AppState {
  return { ...previous, alerts: previous.alerts.map((alert) => alert.id === id ? { ...alert, handled: true } : alert) };
}

export function visibleCampusIds(state: AppState): string[] {
  if (state.role.role === 'hq') return state.campuses.map((campus) => campus.id);
  if (state.role.role === 'principal') return [state.role.campusId!];
  return [state.role.campusId!];
}

export function filterByRole<T extends { campusId?: string; fromCampusId?: string; toCampusId?: string; ownerCampusId?: string; currentCampusId?: string }>(state: AppState, rows: T[]): T[] {
  if (state.role.role === 'hq') return rows;
  const campusId = state.role.campusId;
  return rows.filter((row) =>
    row.campusId === campusId || row.fromCampusId === campusId || row.toCampusId === campusId ||
    row.ownerCampusId === campusId || row.currentCampusId === campusId
  );
}

export function scopeCampus(state: AppState, campus?: Campus): Campus | undefined {
  if (state.role.role === 'hq') return campus;
  return state.campuses.find((item) => item.id === state.role.campusId);
}
