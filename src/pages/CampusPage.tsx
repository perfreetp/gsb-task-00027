import { useState } from 'react';
import type { Campus } from '../types';
import { Badge, Card, PageProps } from '../ui';
import { accessibleCampuses, accessibleVehicles } from '../access';

const zoneColor = (zone: Campus['zones'][number]) => {
  if (zone.kind === '禁入区') return 'red';
  if (!zone.capacity) return 'blue';
  const ratio = (zone.occupied ?? 0) / zone.capacity;
  return ratio >= 0.95 ? 'red' : ratio >= 0.75 ? 'yellow' : 'green';
};

export default function CampusPage({ state, focusCampus }: PageProps) {
  const allowed = accessibleCampuses(state);
  const [campusId, setCampusId] = useState(allowed[0]?.id);
  const campus = state.campuses.find((item) => item.id === campusId) ?? allowed[0];
  if (!campus) return <Card title="校区精模">当前角色暂无可查看校区。</Card>;
  const vehicles = accessibleVehicles(state).filter((vehicle) => vehicle.currentCampusId === campus.id);

  return <div className="grid">
    <Card title="校区场地级视角" extra={<div className="actions"><button className="secondary" onClick={() => focusCampus(campus.id)}>返回三维沙盘</button><select value={campus.id} onChange={(event) => setCampusId(event.target.value)}>{allowed.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>}>
      <div className="zone-grid">
        {campus.zones.map((zone) => <div className="zone" key={zone.id}>
          <div className="horizontal"><span>{zone.name}</span><Badge tone={zoneColor(zone)}>{zone.kind}</Badge></div>
          <div className="num">{zone.capacity ? `${zone.occupied}/${zone.capacity}` : zone.speedLimit ? `${zone.speedLimit}km/h` : '受控'}</div>
          <div className="muted small">{zone.kind === '库位' ? '实时库位占用' : zone.kind === '训练区' ? '当前训练容量' : zone.kind === '限速区' ? '电子围栏限速' : zone.kind === '禁入区' ? '越界实时拦截' : '接待容量监控'}</div>
        </div>)}
      </div>
    </Card>

    <div className="grid cols-2">
      <Card title="场地示意">
        <div className="mini-map">
          <div className="road" style={{ left: '12%', top: '48%', width: '76%', height: 8 }} />
          <div className="road" style={{ left: '48%', top: '12%', width: 8, height: '76%' }} />
          {Array.from({ length: 28 }).map((_, index) => {
            const crowded = campus.occupiedSlots / campus.trainingSlots;
            return <i key={index} className="dot" style={{ left: `${13 + (index % 7) * 11}%`, top: `${16 + Math.floor(index / 7) * 18}%`, opacity: index < 28 * crowded ? 1 : 0.18, background: index % 9 === 0 ? '#f87171' : '#86efac' }} />;
          })}
        </div>
        <p className="muted small">绿点为占用中的训练资源；红点表示排队、等待或异常车辆。</p>
      </Card>
      <Card title={`当前校区车辆（${vehicles.length}）`}>
        <div className="table-wrap"><table><thead><tr><th>车辆</th><th>车型</th><th>车属校区</th><th>状态</th><th>终端</th></tr></thead><tbody>
          {vehicles.map((vehicle) => <tr key={vehicle.id}><td>{vehicle.plate}</td><td>{vehicle.type}</td><td>{state.campuses.find((item) => item.id === vehicle.ownerCampusId)?.name}</td><td><Badge tone={vehicle.status === '在训' ? 'green' : vehicle.status === '闲置' ? 'gray' : 'red'}>{vehicle.status}</Badge></td><td><Badge tone={vehicle.terminalOnline ? 'green' : 'red'}>{vehicle.terminalOnline ? '在线' : '离线'}</Badge></td></tr>)}
        </tbody></table></div>
      </Card>
    </div>
  </div>;
}
