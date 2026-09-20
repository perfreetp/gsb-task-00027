import { useMemo, useState } from 'react';
import { useStore } from '../domain/store';
import { transferStatusText } from '../domain/transfers';
import type { TransferRequest } from '../domain/types';
import { Badge, Card, Empty } from './ui';

export function TransferPage() {
  const store = useStore();
  const { state, user } = store;
  const allowed = store.visibleCampusIds();
  const [vehicleId, setVehicleId] = useState(state.vehicles[0]?.id ?? '');
  const [toCampusId, setToCampusId] = useState(state.campuses[1]?.id ?? '');
  const [coachId, setCoachId] = useState(state.coaches[0]?.id ?? '');
  const [eta, setEta] = useState('2026-09-21 10:30');
  const [priority, setPriority] = useState<1 | 2 | 3>(2);
  const [swapTarget, setSwapTarget] = useState<Record<string, string>>({});

  const transfers = useMemo(() => state.transfers.filter((item) => user.role === 'hq' || allowed.includes(item.fromCampusId) || allowed.includes(item.toCampusId)), [state.transfers, user.role, allowed]);
  const campusName = (id: string) => state.campuses.find((campus) => campus.id === id)?.shortName ?? id;
  const vehicleName = (id: string) => state.vehicles.find((vehicle) => vehicle.id === id)?.plate ?? id;

  const submit = () => {
    const vehicle = state.vehicles.find((item) => item.id === vehicleId);
    if (!vehicle) return;
    store.createTransfer({
      idempotencyKey: `${vehicleId}-${vehicle.currentCampusId}-${toCampusId}-${eta}-${Date.now()}`,
      vehicleId,
      fromCampusId: vehicle.currentCampusId,
      toCampusId,
      coachId,
      eta,
      priority,
      note: '调度台提交跨校区调车申请'
    });
  };

  return (
    <div className="page-grid wide-left">
      <Card title="跨校区调车申请与审批" extra={<Badge tone="purple">双方校区 + 总部状态机</Badge>}>
        <div className="request-form">
          <label>选择车辆<select value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>{state.vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.plate} · {vehicle.model} · 当前{campusName(vehicle.currentCampusId)}</option>)}</select></label>
          <label>目的地校区<select value={toCampusId} onChange={(event) => setToCampusId(event.target.id ? event.target.value : event.target.value)}>{state.campuses.filter((campus) => campus.id !== state.vehicles.find((v) => v.id === vehicleId)?.currentCampusId).map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}</select></label>
          <label>随车教练<select value={coachId} onChange={(event) => setCoachId(event.target.value)}>{state.coaches.map((coach) => <option key={coach.id} value={coach.id}>{coach.name} · {campusName(coach.campusId)}</option>)}</select></label>
          <label>预计到达<input value={eta} onChange={(event) => setEta(event.target.value)} /></label>
          <label>优先级<select value={priority} onChange={(event) => setPriority(Number(event.target.value) as 1 | 2 | 3)}><option value={1}>P1 考试保障</option><option value={2}>P2 高峰补能</option><option value={3}>P3 常规调剂</option></select></label>
          <button onClick={submit}>提交申请（幂等）</button>
        </div>
        <div className="transfer-list">
          {transfers.length === 0 && <Empty />}
          {transfers.map((request) => <TransferRow key={request.id} request={request} swapVehicleId={swapTarget[request.id] ?? ''} setSwapVehicle={(id) => setSwapTarget({ ...swapTarget, [request.id]: id })} />)}
        </div>
      </Card>
      <Card title="裁决与回滚保障">
        <ul className="explain-list">
          <li>同车并发申请进入单车队列，按 P1→P3、提交时间排序。</li>
          <li>申请被驳回、撤回或超时关闭后立即释放锁，队首自动进入审批。</li>
          <li>发车前允许换车，旧车释放并回滚排队，新车重新裁决。</li>
          <li>每次操作带幂等键，重复提交不会生成重复单据。</li>
          <li>在途偏航、超时未达、长时停留写入同一单据，不另建异常单。</li>
        </ul>
        <div className="queue-board">
          <h4>当前车辆锁</h4>
          {state.vehicles.map((vehicle) => {
            const lock = state.transfers.find((item) => item.vehicleId === vehicle.id && ['awaiting_destination', 'awaiting_hq', 'approved', 'in_transit', 'arrived'].includes(item.status));
            return <div key={vehicle.id}><span>{vehicle.plate}</span><b>{lock ? `${lock.code} · ${transferStatusText[lock.status]}` : '空闲可申请'}</b></div>;
          })}
        </div>
      </Card>
    </div>
  );
}

function TransferRow({ request, swapVehicleId, setSwapVehicle }: { request: TransferRequest; swapVehicleId: string; setSwapVehicle: (id: string) => void }) {
  const store = useStore();
  const { state } = store;
  const campusName = (id: string) => state.campuses.find((campus) => campus.id === id)?.shortName ?? id;
  const vehicle = state.vehicles.find((item) => item.id === request.vehicleId);
  const coach = state.coaches.find((item) => item.id === request.coachId);
  const tone = request.status === 'in_transit' ? 'amber' : request.status === 'queued' ? 'purple' : request.status === 'received' ? 'green' : request.status === 'rejected' || request.status === 'withdrawn' ? 'red' : 'blue';

  return (
    <article className="transfer-card">
      <header>
        <div><strong>{request.code}</strong><span>{campusName(request.fromCampusId)} → {campusName(request.toCampusId)}</span></div>
        <Badge tone={tone as 'amber'}>{transferStatusText[request.status]}{typeof request.queueRank === 'number' ? ` #${request.queueRank}` : ''}</Badge>
      </header>
      <section>
        <dl>
          <dt>车辆</dt><dd>{vehicle?.plate} / {vehicle?.carType}</dd>
          <dt>随车教练</dt><dd>{coach?.name}</dd>
          <dt>优先级</dt><dd>P{request.priority}</dd>
          <dt>预计到达</dt><dd>{request.eta}</dd>
          <dt>在途进度</dt><dd>{Math.round(request.progress * 100)}%</dd>
          <dt>规则快照</dt><dd>v{request.ruleVersion} · {request.idempotencyKey.slice(0, 18)}</dd>
        </dl>
        <div className="progress"><i style={{ width: `${request.progress * 100}%` }} /></div>
        {request.alerts.length > 0 && <div className="inline-alert">{request.alerts.join('；')}</div>}
      </section>
      <footer>
        {request.status === 'awaiting_destination' && <button onClick={() => store.destinationApprove(request.id)}>目的地校长接收确认</button>}
        {request.status === 'awaiting_hq' && <button onClick={() => store.hqApprove(request.id)}>总部批准</button>}
        {request.status === 'approved' && <button onClick={() => store.dispatch(request.id)}>确认发车</button>}
        {request.status === 'in_transit' && <button onClick={() => store.arrive(request.id)}>模拟到达</button>}
        {request.status === 'arrived' && <button onClick={() => store.receive(request.id)}>目的地确认接收</button>}
        {['awaiting_destination', 'awaiting_hq', 'queued', 'approved'].includes(request.status) && <button className="danger" onClick={() => store.withdraw(request.id)}>撤回并释放车辆</button>}
        {['awaiting_destination', 'awaiting_hq', 'queued'].includes(request.status) && <button className="ghost" onClick={() => store.reject(request.id)}>驳回</button>}
        {['awaiting_destination', 'awaiting_hq', 'queued', 'approved'].includes(request.status) && (
          <span className="swap">
            <select value={swapVehicleId} onChange={(event) => setSwapVehicle(event.target.value)}>
              <option value="">换车...</option>
              {state.vehicles.filter((item) => item.id !== request.vehicleId && item.status !== 'maintenance').map((item) => <option key={item.id} value={item.id}>{item.plate}</option>)}
            </select>
            <button className="ghost" disabled={!swapVehicleId} onClick={() => store.swapVehicle(request.id, swapVehicleId)}>确认换车</button>
          </span>
        )}
      </footer>
      <details>
        <summary>审批与回滚事件链（{request.events.length}）</summary>
        <ol className="event-trail">
          {request.events.map((event) => <li key={event.id}><time>{event.at}</time><b>{event.actor}</b><span>{event.type}</span>{event.note && <em>{event.note}</em>}</li>)}
        </ol>
      </details>
    </article>
  );
}
