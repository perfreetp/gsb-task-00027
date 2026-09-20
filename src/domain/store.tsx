import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { initialState } from './mockData';
import type { AppState, AuditLog, CostRule, Fence, FenceTemplate, HourRule, User, Vehicle } from './types';
import * as transfers from './transfers';
import { compareFence, instantiateTemplate } from './fences';

const now = () => new Date().toISOString().slice(0, 16).replace('T', ' ');

interface StoreValue {
  state: AppState;
  user: User;
  setUser: (id: string) => void;
  visibleCampusIds: () => string[];
  visibleVehicleIds: () => string[];
  createTransfer: (command: transfers.TransferCommand) => void;
  destinationApprove: (id: string) => void;
  hqApprove: (id: string) => void;
  reject: (id: string) => void;
  withdraw: (id: string) => void;
  dispatch: (id: string) => void;
  arrive: (id: string) => void;
  receive: (id: string) => void;
  swapVehicle: (id: string, vehicleId: string) => void;
  applyTemplate: (templateId: string, campusId: string) => void;
  proposeFence: (id: string, patch: Partial<Fence>) => void;
  approveFence: (id: string) => void;
  saveHourRule: (rule: HourRule) => void;
  saveCostRule: (rule: CostRule) => void;
  acknowledgeAlert: (id: string) => void;
  addVehicleRequest: (vehicle: Omit<Vehicle, 'id' | 'dailyTrainingMinutes' | 'idleMinutes' | 'alertCount'>) => void;
  retireVehicle: (id: string, reason: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function audit(state: AppState, log: Omit<AuditLog, 'id' | 'at' | 'operator'> & { operator?: string }): AppState {
  const user = state.users.find((item) => item.id === state.currentUserId);
  const entry: AuditLog = { ...log, id: `au-${Date.now()}`, at: now(), operator: log.operator ?? user?.name ?? '系统' };
  return { ...state, auditLogs: [entry, ...state.auditLogs] };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const user = state.users.find((item) => item.id === state.currentUserId) ?? state.users[0];

  const value = useMemo<StoreValue>(() => ({
    state,
    user,
    setUser: (id) => setState((current) => ({ ...current, currentUserId: id })),
    visibleCampusIds: () => {
      if (user.role === 'hq') return state.campuses.map((campus) => campus.id);
      if (user.campusId) return [user.campusId];
      return [];
    },
    visibleVehicleIds: () => {
      const campusIds = user.role === 'hq' ? state.campuses.map((campus) => campus.id) : user.campusId ? [user.campusId] : [];
      return state.vehicles
        .filter((vehicle) => campusIds.includes(vehicle.currentCampusId) || campusIds.includes(vehicle.ownerCampusId))
        .filter((vehicle) => user.role !== 'coach' || vehicle.coachId === user.coachId)
        .map((vehicle) => vehicle.id);
    },
    createTransfer: (command) => setState((current) => transfers.createTransfer(current, command)),
    destinationApprove: (id) => setState((current) => transfers.destinationApprove(current, id)),
    hqApprove: (id) => setState((current) => transfers.hqApprove(current, id)),
    reject: (id) => setState((current) => transfers.rejectTransfer(current, id, current.transfers.find((item) => item.id === id)?.status === 'awaiting_hq' ? 'hq' : 'destination')),
    withdraw: (id) => setState((current) => transfers.withdrawTransfer(current, id)),
    dispatch: (id) => setState((current) => transfers.dispatchTransfer(current, id)),
    arrive: (id) => setState((current) => transfers.arriveTransfer(current, id)),
    receive: (id) => setState((current) => transfers.receiveTransfer(current, id)),
    swapVehicle: (id, vehicleId) => setState((current) => {
      const request = current.transfers.find((item) => item.id === id);
      const next = transfers.swapVehicle(current, id, vehicleId, '调度员换车');
      return request ? audit(next, { module: 'fence', targetId: id, action: '调车换车', before: request.vehicleId, after: vehicleId }) : next;
    }),
    applyTemplate: (templateId, campusId) => setState((current) => {
      const template = current.templates.find((item) => item.id === templateId);
      const campus = current.campuses.find((item) => item.id === campusId);
      if (!template || !campus || current.fences.some((fence) => fence.campusId === campusId && fence.templateId === templateId)) return current;
      const fence = instantiateTemplate(template, campusId, campus.position);
      return audit({ ...current, fences: [...current.fences, fence] }, { module: 'fence', targetId: fence.id, action: '套用总部模板', before: '无本地围栏', after: fence.name });
    }),
    proposeFence: (id, patch) => setState((current) => {
      const old = current.fences.find((item) => item.id === id);
      if (!old) return current;
      const nextFence: Fence = { ...old, ...patch, version: old.version + 1, updatedAt: now() };
      const diff = compareFence(old, nextFence);
      const fences = diff.safetyImpact === 'requires-hq'
        ? current.fences.map((item) => item.id === id ? { ...old, pendingApproval: true, proposedChange: { limitKmh: patch.limitKmh, diffReason: patch.diffReason, localAdjustment: patch.localAdjustment } } : item)
        : current.fences.map((item) => item.id === id ? nextFence : item);
      const updated = { ...current, fences };
      if (diff.safetyImpact === 'requires-hq') {
        return audit(updated, { module: 'fence', targetId: id, action: '围栏安全改动待总部确认', before: JSON.stringify({ limit: old.limitKmh, version: old.version }), after: JSON.stringify({ limit: nextFence.limitKmh, version: old.version + 1, reasons: diff.reasons }) });
      }
      return audit(updated, { module: 'fence', targetId: id, action: '围栏本地调整', before: `v${old.version}`, after: `v${nextFence.version}` });
    }),
    approveFence: (id) => setState((current) => {
      const fence = current.fences.find((item) => item.id === id);
      if (!fence) return current;
      const approved: Fence = { ...fence, ...fence.proposedChange, pendingApproval: false, proposedChange: undefined, version: fence.version + 1, updatedAt: now() };
      return audit({ ...current, fences: current.fences.map((item) => item.id === id ? approved : item) }, { module: 'fence', targetId: id, action: '总部确认围栏变更', before: '待确认', after: '已生效' });
    }),
    saveHourRule: (rule) => setState((current) => {
      const exists = current.hourRules.some((item) => item.id === rule.id);
      const old = current.hourRules.find((item) => item.id === rule.id);
      const nextRule = { ...rule, version: (old?.version ?? 0) + 1 };
      const hourRules = exists ? current.hourRules.map((item) => item.id === rule.id ? nextRule : item) : [...current.hourRules, nextRule];
      return audit({ ...current, hourRules }, { module: 'hour-rule', targetId: rule.id, action: exists ? '调整学时归属规则' : '新增学时归属规则', before: old ? JSON.stringify(old) : '无', after: JSON.stringify(nextRule) });
    }),
    saveCostRule: (rule) => setState((current) => {
      const exists = current.costRules.some((item) => item.id === rule.id);
      const old = current.costRules.find((item) => item.id === rule.id);
      const nextRule = { ...rule, version: (old?.version ?? 0) + 1 };
      const costRules = exists ? current.costRules.map((item) => item.id === rule.id ? nextRule : item) : [...current.costRules, nextRule];
      return audit({ ...current, costRules }, { module: 'cost-rule', targetId: rule.id, action: exists ? '调整成本分摊规则' : '新增成本分摊规则', before: old ? JSON.stringify(old) : '无', after: JSON.stringify(nextRule) });
    }),
    acknowledgeAlert: (id) => setState((current) => ({ ...current, alerts: current.alerts.map((item) => item.id === id ? { ...item, status: 'acknowledged' } : item) })),
    addVehicleRequest: (vehicle) => setState((current) => {
      const nextVehicle: Vehicle = { ...vehicle, id: `v-${Date.now()}`, dailyTrainingMinutes: 0, idleMinutes: 0, alertCount: 0 };
      return audit({ ...current, vehicles: [nextVehicle, ...current.vehicles] }, { module: 'vehicle-quota', targetId: nextVehicle.id, action: '总部分配新增车辆额度', before: '无', after: nextVehicle.plate });
    }),
    retireVehicle: (id, reason) => setState((current) => {
      const after = `待淘汰：${reason}`;
      return audit(current, { module: 'vehicle-quota', targetId: id, action: '淘汰车辆申请', before: '在册', after });
    }),
  }), [state, user]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('StoreProvider missing');
  return store;
}

export function scopeState<T extends { campusId: string }>(items: T[], allowed: string[]) {
  return items.filter((item) => allowed.includes(item.campusId));
}
