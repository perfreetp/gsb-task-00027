import { useState } from 'react';
import { useStore } from '../domain/store';
import type { Vehicle } from '../domain/types';
import { Badge, Card, Stat } from './ui';

const statusText: Record<Vehicle['status'], string> = { training: '在训', idle: '闲置', transferring: '调车中', maintenance: '保养维修', offline: '离线' };

export function FleetPage() {
  const store = useStore();
  const { state, user } = store;
  const allowed = store.visibleCampusIds();
  const visibleVehicleIds = store.visibleVehicleIds();
  const vehicles = state.vehicles.filter((vehicle) => user.role === 'hq' || (allowed.includes(vehicle.currentCampusId) && visibleVehicleIds.includes(vehicle.id)));
  const [plate, setPlate] = useState('沪A·D9001');
  const [carType, setCarType] = useState<Vehicle['carType']>('C1');
  const [ownerCampusId, setOwnerCampusId] = useState(state.campuses[0].id);

  const rankings = state.campuses.map((campus) => {
    const list = state.vehicles.filter((vehicle) => vehicle.ownerCampusId === campus.id && visibleVehicleIds.includes(vehicle.id));
    const training = Math.round(list.reduce((sum, vehicle) => sum + vehicle.dailyTrainingMinutes, 0) / Math.max(list.length, 1));
    const idle = Math.round(list.reduce((sum, vehicle) => sum + vehicle.idleMinutes, 0) / Math.max(list.length, 1));
    const alerts = list.reduce((sum, vehicle) => sum + vehicle.alertCount, 0);
    return { campus, training, idle, alerts, utilization: Math.round((training / 480) * 100) };
  }).sort((a, b) => b.utilization - a.utilization);

  return (
    <div className="stack-page">
      <div className="stats-row">
        <Stat label="在册车辆" value={state.vehicles.length} hint={`在线 ${state.vehicles.filter((v) => v.terminalOnline).length} / 离线 ${state.vehicles.filter((v) => !v.terminalOnline).length}`} />
        <Stat label="在训车辆" value={state.vehicles.filter((v) => v.status === 'training').length} />
        <Stat label="调车中" value={state.vehicles.filter((v) => v.status === 'transferring').length} tone="warning" />
        <Stat label="保养/离线" value={state.vehicles.filter((v) => ['maintenance', 'offline'].includes(v.status)).length} tone="danger" />
      </div>
      <Card title="车辆利用率排行">
        <div className="ranking-list">
          {rankings.map((item, index) => (
            <div key={item.campus.id} className="ranking-row">
              <b>#{index + 1} {item.campus.shortName}</b>
              <div className="bar"><i style={{ width: `${item.utilization}%` }} /></div>
              <span>日均在训 {item.training} 分</span>
              <span>闲置 {item.idle} 分</span>
              <Badge tone={item.alerts > 4 ? 'red' : item.alerts > 1 ? 'amber' : 'green'}>告警 {item.alerts}</Badge>
            </div>
          ))}
        </div>
      </Card>
      <div className="page-grid">
        <Card title="车辆档案与终端状态">
          <div className="vehicle-table">
            {vehicles.map((vehicle) => {
              const owner = state.campuses.find((campus) => campus.id === vehicle.ownerCampusId);
              const current = state.campuses.find((campus) => campus.id === vehicle.currentCampusId);
              return <article key={vehicle.id}>
                <header><div><strong>{vehicle.plate}</strong><span>{vehicle.model} · {vehicle.carType}</span></div><Badge tone={vehicle.status === 'training' ? 'green' : vehicle.status === 'transferring' ? 'amber' : 'slate'}>{statusText[vehicle.status]}</Badge></header>
                <dl>
                  <dt>归属/当前</dt><dd>{owner?.shortName} / {current?.shortName}</dd>
                  <dt>年检到期</dt><dd>{vehicle.annualInspectionDue}</dd>
                  <dt>保险到期</dt><dd>{vehicle.insuranceDue}</dd>
                  <dt>下次保养</dt><dd>{vehicle.maintenanceDue}</dd>
                  <dt>定位终端</dt><dd className={vehicle.terminalOnline ? 'online' : 'offline'}>{vehicle.terminalOnline ? '在线' : '离线'}</dd>
                </dl>
                <button className="ghost" onClick={() => store.retireVehicle(vehicle.id, '到达集团更新周期')}>发起淘汰审批</button>
              </article>;
            })}
          </div>
        </Card>
        <Card title="总部车辆额度">
          <p className="muted">新增车辆由总部统一分配额度，校区不能自行扩编。提交后生成额度审批记录。</p>
          <div className="request-form vertical">
            <label>号牌<input value={plate} onChange={(event) => setPlate(event.target.value)} /></label>
            <label>车型<select value={carType} onChange={(event) => setCarType(event.target.value as Vehicle['carType'])}><option>C1</option><option>C2</option><option>B2</option></select></label>
            <label>归属校区<select value={ownerCampusId} onChange={(event) => setOwnerCampusId(event.target.value)}>{state.campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}</select></label>
            <button onClick={() => store.addVehicleRequest({ plate, model: carType === 'B2' ? '东风多利卡' : '大众捷达', carType, ownerCampusId, currentCampusId: ownerCampusId, status: 'idle', position: state.campuses.find((campus) => campus.id === ownerCampusId)!.position, heading: 0, coachId: state.coaches[0].id, terminalOnline: true, annualInspectionDue: '2027-09-20', insuranceDue: '2027-09-20', maintenanceDue: '2026-12-20', purchaseDate: '2026-09-20', depreciationDaily: 45 })}>提交新增额度审批</button>
          </div>
        </Card>
      </div>
    </div>
  );
}
