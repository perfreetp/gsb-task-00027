import { useState } from 'react';
import { campusName, decideQuotaRequest } from '../engine';
import type { VehicleType } from '../types';
import { Badge, Card, PageProps, Table } from '../ui';
import { accessibleCampuses, accessibleRequests, accessibleVehicles } from '../access';

export default function VehiclePage({ state, update }: PageProps) {
  const [campusId, setCampusId] = useState('all');
  const [kind, setKind] = useState<'新增' | '淘汰'>('新增');
  const [vehicleType, setVehicleType] = useState<VehicleType>('C2');
  const [count, setCount] = useState(1);
  const [reason, setReason] = useState('');
  const vehicles = accessibleVehicles(state).filter((vehicle) => campusId === 'all' || vehicle.ownerCampusId === campusId || vehicle.currentCampusId === campusId);

  return <div className="grid">
    <div className="grid cols-4">
      <Card title="在册车辆"><div className="value">{accessibleVehicles(state).length}</div><span className="muted small">集团统一资产编号</span></Card>
      <Card title="在线终端"><div className="value">{state.vehicles.filter((vehicle) => vehicle.terminalOnline).length}/{accessibleVehicles(state).length}</div><span className="muted small">定位、围栏、轨迹依赖</span></Card>
      <Card title="待保养/年检"><div className="value">{accessibleVehicles(state).filter((vehicle) => vehicle.maintenanceDue <= '2026-10-01' || vehicle.inspectionDue <= '2026-10-15').length}</div><span className="muted small">30 天风险窗口</span></Card>
      <Card title="待批额度"><div className="value">{state.quotaRequests.filter((request) => request.status === '待总部审批' && (state.role.role === 'hq' || request.campusId === state.role.campusId)).length}</div><span className="muted small">新增/淘汰总部统一分配</span></Card>
    </div>

    <Card title="车辆档案" extra={<select value={campusId} onChange={(event) => setCampusId(event.target.value)}><option value="all">全部校区</option>{accessibleCampuses(state).map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}</select>}>
      <Table headers={['车牌/品牌', '车型', '归属/当前', '状态', '终端', '年检/保险', '保养', '今日在训/闲置', '告警']}>
        {vehicles.map((vehicle) => <tr key={vehicle.id}><td><b>{vehicle.plate}</b><div className="muted small">{vehicle.brand}</div></td><td>{vehicle.type}</td><td>{campusName(state, vehicle.ownerCampusId)}<br />{campusName(state, vehicle.currentCampusId)}</td><td><Badge tone={vehicle.status === '在训' ? 'green' : vehicle.status === '闲置' ? 'gray' : 'red'}>{vehicle.status}</Badge></td><td><Badge tone={vehicle.terminalOnline ? 'green' : 'red'}>{vehicle.terminalOnline ? '在线' : '离线'}</Badge></td><td className="small">{vehicle.inspectionDue}<br />{vehicle.insuranceDue}</td><td>{vehicle.maintenanceDue}</td><td className="small">{vehicle.dailyTrainingMinutes} 分<br />{vehicle.idleMinutes} 分</td><td><Badge tone={vehicle.alertCount ? 'red' : 'green'}>{vehicle.alertCount}</Badge></td></tr>)}
      </Table>
    </Card>

    <div className="grid cols-2">
      <Card title="新增/淘汰车辆额度申请">
        <div className="form-row three">
          <div className="field"><label>类型</label><select value={kind} onChange={(event) => setKind(event.target.value as '新增' | '淘汰')}><option>新增</option><option>淘汰</option></select></div>
          <div className="field"><label>车型</label><select value={vehicleType} onChange={(event) => setVehicleType(event.target.value as VehicleType)}><option>C1</option><option>C2</option><option>B2</option></select></div>
          <div className="field"><label>数量</label><input type="number" min={1} value={count} onChange={(event) => setCount(Number(event.target.value))} /></div>
        </div>
        <div className="field"><label>原因</label><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="例如：利用率连续超 92% / 维修成本超净值" /></div>
        <div className="section-gap"><button onClick={() => { if (!reason.trim()) return; update((previous) => ({ ...previous, quotaRequests: [{ id: `qr-${Date.now()}`, campusId: previous.role.campusId ?? previous.campuses[0].id, kind, vehicleType, count, reason, status: '待总部审批' }, ...previous.quotaRequests] }), '额度申请已提交总部'); setReason(''); }}>提交总部审批</button></div>
      </Card>
      <Card title="额度审批队列">
        <Table headers={['校区', '类型', '车型/数量', '原因', '状态', '操作']}>
          {state.quotaRequests.filter((request) => state.role.role === 'hq' || request.campusId === state.role.campusId).map((request) => <tr key={request.id}><td>{campusName(state, request.campusId)}</td><td>{request.kind}</td><td>{request.vehicleType} × {request.count}</td><td>{request.reason}</td><td><Badge tone={request.status === '已批准' ? 'green' : request.status === '已驳回' ? 'red' : 'yellow'}>{request.status}</Badge></td><td>{request.status === '待总部审批' && state.role.role === 'hq' && <div className="actions"><button className="success" onClick={() => update((previous) => decideQuotaRequest(previous, request.id, true), '额度已批准')}>批准</button><button className="danger" onClick={() => update((previous) => decideQuotaRequest(previous, request.id, false), '额度已驳回')}>驳回</button></div>}</td></tr>)}
        </Table>
      </Card>
    </div>
  </div>;
}
