import { useMemo, useState } from 'react';
import { useStore } from '../domain/store';
import { Badge, Card, Stat } from './ui';

export function AlertsPage() {
  const store = useStore();
  const { state, user } = store;
  const allowed = store.visibleCampusIds();
  const visibleVehicleIds = store.visibleVehicleIds();
  const [campusFilter, setCampusFilter] = useState('all');
  const alerts = state.alerts.filter((alert) => (user.role === 'hq' || (allowed.includes(alert.campusId) && visibleVehicleIds.includes(alert.vehicleId))) && (campusFilter === 'all' || alert.campusId === campusFilter));
  const groups = useMemo(() => state.campuses.map((campus) => ({ campus, count: state.alerts.filter((alert) => alert.campusId === campus.id && alert.status === 'open').length })), [state.alerts, state.campuses]);

  return (
    <div className="stack-page">
      <div className="stats-row">
        <Stat label="未处理高危" value={alerts.filter((alert) => alert.level === 'high' && alert.status === 'open').length} tone="danger" />
        <Stat label="未处理中危" value={alerts.filter((alert) => alert.level === 'medium' && alert.status === 'open').length} tone="warning" />
        <Stat label="已确认" value={alerts.filter((alert) => alert.status === 'acknowledged').length} />
        <Stat label="涉及校区" value={new Set(alerts.map((alert) => alert.campusId)).size} />
      </div>
      <Card title="集团告警总览 · 可下钻校区">
        <div className="alert-drilldown">
          {groups.map((group) => <button key={group.campus.id} className={campusFilter === group.campus.id ? 'active' : ''} onClick={() => setCampusFilter(campusFilter === group.campus.id ? 'all' : group.campus.id)}><strong>{group.campus.shortName}</strong><span>{group.count} 条未处理</span><i className={group.count > 1 ? 'hot' : ''} /></button>)}
        </div>
      </Card>
      <Card title="跨校区越界 / 离线 / 超速 / 在途异常">
        <div className="alert-table">
          {alerts.map((alert) => {
            const campus = state.campuses.find((item) => item.id === alert.campusId);
            const vehicle = state.vehicles.find((item) => item.id === alert.vehicleId);
            return <article key={alert.id} className={`alert-row level-${alert.level}`}>
              <Badge tone={alert.level === 'high' ? 'red' : alert.level === 'medium' ? 'amber' : 'blue'}>{alert.level === 'high' ? '高危' : alert.level === 'medium' ? '中危' : '低危'}</Badge>
              <div><strong>{alert.message}</strong><span>{campus?.shortName} · {vehicle?.plate} · {alert.at}</span></div>
              <Badge tone={alert.status === 'open' ? 'purple' : 'slate'}>{alert.status === 'open' ? '待处理' : '已确认'}</Badge>
              {alert.status === 'open' && <button onClick={() => store.acknowledgeAlert(alert.id)}>确认</button>}
            </article>;
          })}
        </div>
      </Card>
    </div>
  );
}
