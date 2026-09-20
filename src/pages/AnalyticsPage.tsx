import { useEffect, useState } from 'react';
import { campusName, transferAllocation } from '../engine';
import { Badge, Card, PageProps, Table, money } from '../ui';

export default function AnalyticsPage({ state }: PageProps) {
  const [leftId, setLeftId] = useState(state.campuses[0].id);
  const [rightId, setRightId] = useState(state.campuses[2].id);
  const [playing, setPlaying] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setTick((value) => value + 1), 700);
    return () => clearInterval(timer);
  }, [playing]);

  const ranking = state.campuses.map((campus) => {
    const vehicles = state.vehicles.filter((vehicle) => vehicle.currentCampusId === campus.id);
    const training = Math.round(vehicles.reduce((sum, vehicle) => sum + vehicle.dailyTrainingMinutes, 0) / Math.max(1, vehicles.length));
    const idle = Math.round(vehicles.reduce((sum, vehicle) => sum + vehicle.idleMinutes, 0) / Math.max(1, vehicles.length));
    const alerts = vehicles.reduce((sum, vehicle) => sum + vehicle.alertCount, 0);
    return { campus, training, idle, alerts, utilization: Math.round(training / 480 * 100), vehicles: vehicles.length };
  }).sort((a, b) => b.utilization - a.utilization);

  const monthRows = state.campuses.map((campus) => {
    const outRequests = state.requests.filter((request) => request.fromCampusId === campus.id);
    const crossMinutes = state.sessions.filter((session) => session.trainingCampusId === campus.id && session.ownerCampusId !== campus.id).reduce((sum, session) => sum + session.minutes, 0);
    const amount = state.transferCosts.reduce((sum, cost) => {
      const request = state.requests.find((request) => request.id === cost.requestId);
      if (!request || ![request.fromCampusId, request.toCampusId].includes(campus.id)) return sum;
      const allocation = transferAllocation(state, cost, request);
      if (request.toCampusId === campus.id) return sum + allocation.fuel.requesting + allocation.toll.requesting + allocation.depreciation.requesting;
      return sum + allocation.fuel.owner + allocation.toll.owner + allocation.depreciation.owner;
    }, 0);
    return { campus, transfers: outRequests.length, crossMinutes, amount, alerts: state.alerts.filter((alert) => alert.campusId === campus.id).length };
  });

  return <div className="grid">
    <Card title="车辆利用率横向排行">
      <Table headers={['排名', '校区', '车辆数', '日均在训', '闲置时长', '利用率', '告警次数']}>
        {ranking.map((row, index) => <tr key={row.campus.id}><td><span className="rank-number">{index + 1}</span></td><td><b>{row.campus.name}</b></td><td>{row.vehicles}</td><td>{row.training} 分</td><td>{row.idle} 分</td><td style={{ minWidth: 180 }}><Badge tone={row.utilization > 75 ? 'red' : row.utilization > 55 ? 'green' : 'yellow'}>{row.utilization}%</Badge><div className="progress section-gap"><i style={{ width: `${row.utilization}%` }} /></div></td><td>{row.alerts}</td></tr>)}
      </Table>
    </Card>

    <Card title="三维回放对比：两个校区同一时段拥挤情况" extra={<div className="actions"><select value={leftId} onChange={(event) => setLeftId(event.target.value)}>{state.campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}</select><select value={rightId} onChange={(event) => setRightId(event.target.value)}>{state.campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}</select><button className="secondary" onClick={() => setPlaying(!playing)}>{playing ? '暂停' : '播放'}</button></div>}>
      <div className="compare-stage">
        <ReplayCampus state={state} campusId={leftId} tick={tick} />
        <ReplayCampus state={state} campusId={rightId} tick={tick} />
      </div>
      <p className="muted small">回放窗口：2026-09-20 08:00–10:00；两个沙盘使用同一时间轴，便于并排比较库位周转和拥堵扩散。</p>
    </Card>

    <Card title="月结报表" extra={<button className="secondary" onClick={() => exportMonthly(state)}>导出月结 CSV</button>}>
      <Table headers={['校区', '调车次数', '跨区训练分钟', '分摊金额', '异常记录', '利用率结论']}>
        {monthRows.map((row) => <tr key={row.campus.id}><td><b>{row.campus.name}</b></td><td>{row.transfers}</td><td>{row.crossMinutes}</td><td><b>{money(row.amount)}</b></td><td><Badge tone={row.alerts ? 'red' : 'green'}>{row.alerts}</Badge></td><td>{ranking.find((item) => item.campus.id === row.campus.id)?.utilization}%</td></tr>)}
      </Table>
    </Card>
  </div>;
}

function ReplayCampus({ state, campusId, tick }: { state: PageProps['state']; campusId: string; tick: number }) {
  const campus = state.campuses.find((item) => item.id === campusId)!;
  const phase = (tick % 24) / 24;
  const load = Math.min(1, 0.25 + Math.abs(Math.sin(phase * Math.PI * 2 + campus.x)) * 0.72);
  const dots = Array.from({ length: 42 });
  return <div>
    <div className="horizontal"><h3>{campus.name}</h3><Badge tone={load > 0.8 ? 'red' : load > 0.6 ? 'yellow' : 'green'}>拥挤度 {Math.round(load * 100)}%</Badge></div>
    <div className="mini-map">
      <div className="road" style={{ left: '10%', top: '47%', width: '80%', height: 8 }} />
      <div className="road" style={{ left: '47%', top: '10%', width: 8, height: '80%' }} />
      {dots.map((_, index) => {
        const active = (index + tick * 2) % 42 < 42 * load;
        return <i key={index} className="dot" style={{ left: `${12 + (index % 7) * 11}%`, top: `${14 + Math.floor(index / 7) * 18}%`, opacity: active ? 1 : .12, background: active && index % 8 === 0 ? '#f87171' : '#86efac' }} />;
      })}
    </div>
    <div className="small muted">库位 {campus.occupiedSlots}/{campus.trainingSlots}；模板 {campus.templateVersion}</div>
  </div>;
}

function exportMonthly(state: PageProps['state']) {
  const rows = [['校区', '调车次数', '跨区训练分钟', '分摊金额', '异常记录']];
  state.campuses.forEach((campus) => {
    const transfers = state.requests.filter((request) => request.fromCampusId === campus.id).length;
    const minutes = state.sessions.filter((session) => session.trainingCampusId === campus.id && session.ownerCampusId !== campus.id).reduce((sum, session) => sum + session.minutes, 0);
    const alerts = state.alerts.filter((alert) => alert.campusId === campus.id).length;
    rows.push([campus.name, String(transfers), String(minutes), '见明细对账单', String(alerts)]);
  });
  const blob = new Blob(['\ufeff' + rows.map((row) => row.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = '2026-09-跨校区月结报表.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}
