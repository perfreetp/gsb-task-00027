import { useEffect, useState } from 'react';
import { initialState } from './data';
import { switchRole } from './engine';
import type { AppState, RoleState } from './types';
import { PageProps } from './ui';
import MapPage from './pages/MapPage';
import CampusPage from './pages/CampusPage';
import DispatchPage from './pages/DispatchPage';
import MonitorPage from './pages/MonitorPage';
import RulesCostPage from './pages/RulesCostPage';
import GeofencePage from './pages/GeofencePage';
import VehiclePage from './pages/VehiclePage';
import AnalyticsPage from './pages/AnalyticsPage';
import AuditPage from './pages/AuditPage';

type Page = 'map' | 'campus' | 'dispatch' | 'monitor' | 'rules' | 'geofence' | 'vehicles' | 'analytics' | 'audit';

const nav: Array<{ key: Page; label: string; desc: string; roles: Array<AppState['role']['role']> }> = [
  { key: 'map', label: '城市沙盘', desc: '三维总览', roles: ['hq', 'principal', 'coach'] },
  { key: 'campus', label: '校区精模', desc: '库位占用', roles: ['hq', 'principal'] },
  { key: 'dispatch', label: '调车审批', desc: '冲突裁决', roles: ['hq', 'principal', 'coach'] },
  { key: 'monitor', label: '在途告警', desc: '集团下钻', roles: ['hq', 'principal', 'coach'] },
  { key: 'rules', label: '学时成本', desc: '版本规则', roles: ['hq', 'principal'] },
  { key: 'geofence', label: '围栏模板', desc: '变更审批', roles: ['hq', 'principal'] },
  { key: 'vehicles', label: '车辆资产', desc: '档案额度', roles: ['hq', 'principal', 'coach'] },
  { key: 'analytics', label: '排行月结', desc: '回放对比', roles: ['hq', 'principal'] },
  { key: 'audit', label: '审计日志', desc: '回溯导出', roles: ['hq'] }
];

export default function App() {
  const [state, setState] = useState<AppState>(initialState);
  const [page, setPage] = useState<Page>('map');
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [roamRequestId, setRoamRequestId] = useState<string | null>(null);
  const [focusCampusId, setFocusCampusId] = useState<string | null>(null);

  const notify = (text: string, error = false) => {
    setToast({ text, error });
    window.setTimeout(() => setToast(null), 2800);
  };
  const update: PageProps['update'] = (producer, success) => {
    setState((previous) => {
      const next = producer(previous);
      return next;
    });
    if (success) notify(success);
  };
  const toastError = (error: unknown) => notify(error instanceof Error ? error.message : String(error), true);
  const focusCampus = (id: string | null) => {
    setFocusCampusId(id);
    setPage('map');
  };
  const startRoam = (id: string) => {
    setRoamRequestId(id);
    setPage('map');
  };

  const props: PageProps = {
    state, update, toastError, focusCampus,
    selectedVehicleId, setSelectedVehicleId, startRoam
  };

  const roleName = state.role.role === 'hq' ? '总部运营' : state.role.role === 'principal' ? `${state.campuses.find((campus) => campus.id === state.role.campusId)?.name ?? ''}校长` : state.coaches.find((coach) => coach.id === state.role.coachId)?.name ?? '教练';
  const visibleNav = nav.filter((item) => item.roles.includes(state.role.role));
  useEffect(() => {
    if (!visibleNav.some((item) => item.key === page)) setPage('map');
  }, [page, visibleNav]);
  const pendingAlerts = state.alerts.filter((alert) => !alert.handled).length;
  const pendingApprovals = state.geofenceChanges.filter((item) => item.status === '待总部确认').length + state.quotaRequests.filter((item) => item.status === '待总部审批').length;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="logo">驾</div><div><strong>跨校区车辆围栏中台</strong><small>Driving Group Ops</small></div></div>
      <nav className="nav">
        {visibleNav.map((item) => <button key={item.key} className={page === item.key ? 'active' : ''} onClick={() => setPage(item.key)}>{item.label}{item.key === 'monitor' && pendingAlerts ? <span>{pendingAlerts}</span> : item.key === 'geofence' && state.role.role === 'hq' && pendingApprovals ? <span>{pendingApprovals}</span> : null}</button>)}
      </nav>
      <div className="sidebar-footer">
        <div className="small">当前视角：<b>{roleName}</b></div>
        <div className="small muted">总部看全部；校长看本校；教练看本人。</div>
      </div>
    </aside>

    <main className="main">
      <header className="topbar">
        <div><h1>{nav.find((item) => item.key === page)?.label}</h1><p>{nav.find((item) => item.key === page)?.desc} · 核心解决“车在各校区之间来回调，学时和成本算谁的”</p></div>
        <RoleSwitch role={state.role} onChange={(role) => { setState((previous) => switchRole(previous, role)); setPage('map'); }} />
      </header>
      {page === 'map' && <MapPage {...props} roamRequestId={roamRequestId} onRoamEnd={() => setRoamRequestId(null)} externalFocusId={focusCampusId} />}
      {page === 'campus' && <CampusPage {...props} />}
      {page === 'dispatch' && <DispatchPage {...props} />}
      {page === 'monitor' && <MonitorPage {...props} />}
      {page === 'rules' && <RulesCostPage {...props} />}
      {page === 'geofence' && <GeofencePage {...props} />}
      {page === 'vehicles' && <VehiclePage {...props} />}
      {page === 'analytics' && <AnalyticsPage {...props} />}
      {page === 'audit' && <AuditPage {...props} />}
    </main>
    {toast && <div className={`toast ${toast.error ? 'error' : ''}`}>{toast.text}</div>}
  </div>;
}

function RoleSwitch({ role, onChange }: { role: RoleState; onChange: (role: RoleState) => void }) {
  return <div className="role-switch">
    <span className="muted small">角色</span>
    <select value={role.role} onChange={(event) => {
      const next = event.target.value as RoleState['role'];
      if (next === 'hq') onChange({ role: 'hq' });
      if (next === 'principal') onChange({ role: 'principal', campusId: initialState.campuses[0].id });
      if (next === 'coach') onChange({ role: 'coach', campusId: initialState.coaches[0].campusId, coachId: initialState.coaches[0].id });
    }}>
      <option value="hq">总部运营</option>
      <option value="principal">校区校长</option>
      <option value="coach">随车教练</option>
    </select>
    {role.role === 'principal' && <select value={role.campusId} onChange={(event) => onChange({ role: 'principal', campusId: event.target.value })}>{initialState.campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}</select>}
    {role.role === 'coach' && <select value={role.coachId} onChange={(event) => {
      const coach = initialState.coaches.find((item) => item.id === event.target.value)!;
      onChange({ role: 'coach', campusId: coach.campusId, coachId: coach.id });
    }}>{initialState.coaches.map((coach) => <option key={coach.id} value={coach.id}>{coach.name}</option>)}</select>}
  </div>;
}
