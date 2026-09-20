import { useState } from 'react';
import { useStore } from './domain/store';
import { CitySandbox } from './components/CitySandbox';
import { TransferPage } from './components/TransferPage';
import { RulesCostPage } from './components/RulesCostPage';
import { FencePage } from './components/FencePage';
import { FleetPage } from './components/FleetPage';
import { AlertsPage } from './components/AlertsPage';
import { ReplayPage } from './components/ReplayPage';
import { ReportsPage } from './components/ReportsPage';
import { Badge } from './components/ui';

const tabs = [
  { id: 'sandbox', label: '三维沙盘', roles: ['hq', 'principal', 'dispatcher', 'coach'] },
  { id: 'transfer', label: '调车审批', roles: ['hq', 'principal', 'dispatcher'] },
  { id: 'rules', label: '学时成本', roles: ['hq', 'principal', 'dispatcher'] },
  { id: 'fences', label: '围栏管控', roles: ['hq', 'principal', 'dispatcher'] },
  { id: 'fleet', label: '车辆档案', roles: ['hq', 'principal', 'dispatcher'] },
  { id: 'alerts', label: '告警总览', roles: ['hq', 'principal', 'dispatcher', 'coach'] },
  { id: 'replay', label: '回放对比', roles: ['hq', 'principal'] },
  { id: 'reports', label: '月结审计', roles: ['hq', 'principal'] }
] as const;

type TabId = typeof tabs[number]['id'];

const roleName = { hq: '集团总部', principal: '校区校长', dispatcher: '校区调度员', coach: '随车教练' };
const scopeText = {
  hq: '可见全部校区、车辆、规则与审计',
  principal: '仅可查看与审批本校相关数据',
  dispatcher: '可处理本校车辆调度与在途异常',
  coach: '仅查看本人车辆与安全告警'
};

export default function App() {
  const store = useStore();
  const { state, user } = store;
  const availableTabs = tabs.filter((tab) => (tab.roles as readonly typeof user.role[]).includes(user.role));
  const [activeTab, setActiveTab] = useState<TabId>('sandbox');
  const current = availableTabs.some((tab) => tab.id === activeTab) ? activeTab : availableTabs[0].id;
  const unreadAlerts = state.alerts.filter((alert) => alert.status === 'open' && (user.role === 'hq' || (user.campusId && alert.campusId === user.campusId))).length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">驾</div>
          <div><strong>连锁驾校集团</strong><span>车辆与围栏管控中台</span></div>
        </div>
        <nav>
          {availableTabs.map((tab) => (
            <button key={tab.id} className={current === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>
              {tab.label}{tab.id === 'alerts' && unreadAlerts > 0 && <i>{unreadAlerts}</i>}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <b>三大硬约束</b>
          <span>多条件分摊可回溯</span>
          <span>审批链可回滚不重复</span>
          <span>一车两派最终唯一锁定</span>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div>
            <h1>{tabs.find((tab) => tab.id === current)?.label}</h1>
            <p>{scopeText[user.role]}</p>
          </div>
          <div className="role-switch">
            <Badge tone="purple">{roleName[user.role]}</Badge>
            <select value={user.id} onChange={(event) => store.setUser(event.target.value)}>
              {state.users.map((item) => <option key={item.id} value={item.id}>{item.name}（{roleName[item.role]}）</option>)}
            </select>
          </div>
        </header>
        <section className="content">
          {current === 'sandbox' && <CitySandbox />}
          {current === 'transfer' && <TransferPage />}
          {current === 'rules' && <RulesCostPage />}
          {current === 'fences' && <FencePage />}
          {current === 'fleet' && <FleetPage />}
          {current === 'alerts' && <AlertsPage />}
          {current === 'replay' && <ReplayPage />}
          {current === 'reports' && <ReportsPage />}
        </section>
      </main>
    </div>
  );
}
