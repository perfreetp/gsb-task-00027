import { useState } from 'react';
import { campusName, handleAlert, vehicleLabel } from '../engine';
import { accessibleRequests, accessibleVehicles } from '../access';
import { Badge, Card, PageProps, Table } from '../ui';

export default function MonitorPage({ state, update }: PageProps) {
  const [campusId, setCampusId] = useState('all');
  const [level, setLevel] = useState('all');
  const alerts = state.alerts
    .filter((alert) => state.role.role === 'hq' ? true : state.role.role === 'principal' ? (alert.campusId === state.role.campusId || state.requests.some((request) => request.id === alert.requestId && [request.fromCampusId, request.toCampusId].includes(state.role.campusId!))) : accessibleVehicles(state).some((vehicle) => vehicle.id === alert.vehicleId))
    .filter((alert) => campusId === 'all' || alert.campusId === campusId)
    .filter((alert) => level === 'all' || alert.level === level);
  const inTransit = accessibleRequests(state).filter((request) => request.status === 'in_transit');

  return <div className="grid">
    <div className="grid cols-4">
      <Card title="活动告警"><div className="value">{state.alerts.filter((item) => !item.handled).length}</div><span className="muted small">未处理</span></Card>
      <Card title="高危告警"><div className="value">{state.alerts.filter((item) => item.level === '高' && !item.handled).length}</div><span className="muted small">偏航/离线/越界</span></Card>
      <Card title="超时未达"><div className="value">{state.alerts.filter((item) => item.type === '超时未达' && !item.handled).length}</div><span className="muted small">按 ETA 自动检测</span></Card>
      <Card title="在途车辆"><div className="value">{inTransit.length}</div><span className="muted small">实时轨迹与围栏联动</span></Card>
    </div>

    <div className="grid cols-2">
      <Card title="在途监控规则">
        <div className="timeline">
          <div className="event"><b>路线偏航</b>定位点偏离规划路线超过 300 米，持续 2 个定位周期触发。</div>
          <div className="event"><b>超时未达</b>超过 ETA 10 分钟未完成目的地校长接收。</div>
          <div className="event"><b>长时间停留</b>非加油站/维修点连续停留超过 8 分钟。</div>
          <div className="event"><b>电子围栏与终端</b>越界、离线、超速立即进入集团告警总览并关联调车单。</div>
        </div>
      </Card>
      <Card title="在途车辆">
        {inTransit.map((request) => <div className="entity-card" key={request.id}><div className="horizontal"><b className="code">{request.id}</b><Badge tone={request.alerts.length ? 'red' : 'green'}>{request.alerts.length ? `${request.alerts.length} 条异常` : '正常'}</Badge></div><div className="entity-meta">{vehicleLabel(state, request.vehicleId)}<br />{campusName(state, request.fromCampusId)} → {campusName(state, request.toCampusId)}<br />ETA {request.eta.replace('T', ' ')}</div><ul>{request.alerts.map((alert) => <li key={alert} className="diff small">{alert}</li>)}</ul></div>)}
      </Card>
    </div>

    <Card title="集团告警总览（可按校区下钻）" extra={<div className="actions"><select value={campusId} onChange={(event) => setCampusId(event.target.value)}><option value="all">全部校区</option>{state.campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}</select><select value={level} onChange={(event) => setLevel(event.target.value)}><option value="all">全部级别</option><option>高</option><option>中</option><option>低</option></select></div>}>
      <Table headers={['级别', '类型', '车辆', '校区/关联单', '信息', '时间', '状态', '操作']}>
        {alerts.map((alert) => <tr key={alert.id}><td><Badge tone={alert.level === '高' ? 'red' : alert.level === '中' ? 'yellow' : 'gray'}>{alert.level}</Badge></td><td>{alert.type}</td><td>{vehicleLabel(state, alert.vehicleId)}</td><td>{campusName(state, alert.campusId)}<br />{alert.requestId && <span className="code small">{alert.requestId}</span>}</td><td>{alert.message}</td><td className="small muted">{alert.at.replace('T', ' ').slice(0, 16)}</td><td><Badge tone={alert.handled ? 'green' : 'red'}>{alert.handled ? '已处理' : '待处理'}</Badge></td><td>{!alert.handled && <button className="secondary" onClick={() => update((previous) => handleAlert(previous, alert.id), '告警已标记处理')}>处理</button>}</td></tr>)}
      </Table>
    </Card>
  </div>;
}
