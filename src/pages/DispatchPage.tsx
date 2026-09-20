import { useState } from 'react';
import {
  activeRequestForVehicle, approveStage, arriveVehicle, campusName, changeDispatchVehicle, departVehicle,
  queuePosition, rejectRequest, submitDispatchRequest, timeoutRollback, vehicleLabel, withdrawRequest
} from '../engine';
import type { NewDispatchInput } from '../engine';
import type { DispatchRequest } from '../types';
import { Badge, Card, PageProps, Progress, statusText, statusTone, Table } from '../ui';
import { accessibleCampuses, accessibleRequests, accessibleVehicles } from '../access';

const emptyForm = (state: PageProps['state']): NewDispatchInput => ({
  vehicleId: state.vehicles[0]?.id ?? '',
  fromCampusId: state.role.campusId ?? state.campuses[0].id,
  toCampusId: state.campuses[1].id,
  coachId: state.coaches[0].id,
  eta: '',
  priority: 2,
  reason: ''
});

export default function DispatchPage(props: PageProps) {
  const { state, update, toastError } = props;
  const [form, setForm] = useState<NewDispatchInput>(() => emptyForm(state));
  const [rejectId, setRejectId] = useState('');
  const [swapVehicleId, setSwapVehicleId] = useState('');
  const collision = activeRequestForVehicle(state, form.vehicleId);
  const requests = accessibleRequests(state);
  const patch = (key: keyof NewDispatchInput, value: string | number) => setForm({ ...form, [key]: value });

  const submit = () => {
    try {
      update((previous) => submitDispatchRequest(previous, { ...form, priority: Number(form.priority) as 1 | 2 | 3 }), collision ? '申请已提交：车辆存在未闭环单，系统已加入优先级队列' : '申请已提交：等待目的地校长确认');
      setForm(emptyForm(state));
    } catch (error) { toastError(error); }
  };

  return <div className="grid">
    <div className="grid cols-3">
      <Card title="新建跨校区调车申请" className="" >
        <div className="form-row"><div className="field"><label>车辆</label><select value={form.vehicleId} onChange={(event) => patch('vehicleId', event.target.value)}>{accessibleVehicles(state).filter(v => v.status !== '维修' && v.status !== '离线' && (!state.role.coachId || v.assignedCoachId === state.role.coachId)).map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.plate} / {vehicle.type} / {campusName(state, vehicle.currentCampusId)}</option>)}</select></div><div className="field"><label>随车教练</label><select value={form.coachId} onChange={(event) => patch('coachId', event.target.value)}>{state.coaches.filter((coach) => state.role.role === 'hq' || coach.campusId === state.role.campusId || coach.id === state.role.coachId).map((coach) => <option key={coach.id} value={coach.id}>{coach.name}（{campusName(state, coach.campusId)}）</option>)}</select></div></div>
        <div className="form-row"><div className="field"><label>申请方校区</label><select value={form.fromCampusId} onChange={(event) => patch('fromCampusId', event.target.value)}>{accessibleCampuses(state).map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}</select></div><div className="field"><label>目的地校区</label><select value={form.toCampusId} onChange={(event) => patch('toCampusId', event.target.value)}>{state.campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}</select></div></div>
        <div className="form-row"><div className="field"><label>预计到达时间</label><input type="datetime-local" value={form.eta} onChange={(event) => patch('eta', event.target.value)} /></div><div className="field"><label>优先级（1 最高）</label><select value={form.priority} onChange={(event) => patch('priority', Number(event.target.value))}><option value={1}>P1 紧急考点保障</option><option value={2}>P2 高峰补车</option><option value={3}>P3 常规调度</option></select></div></div>
        <div className="form-row one"><div className="field"><label>调车原因</label><textarea value={form.reason} onChange={(event) => patch('reason', event.target.value)} placeholder="例如：科二高峰库位满载，需补一台 C2 教练车" /></div></div>
        {collision && <div className="entity-card" style={{ marginTop: 0 }}><Badge tone="yellow">冲突预检</Badge><div className="entity-meta">{vehicleLabel(state, form.vehicleId)} 已有未闭环单 <b>{collision.id}</b>，提交后会按优先级和提交时间排队，不会一车两派。</div></div>}
        <button onClick={submit}>提交申请并锁定资源校验</button>
      </Card>

      <Card title="审批链与回滚规则">
        <div className="timeline">
          <div className="event"><b>1. 申请方提交</b>选择车辆、目的地、ETA、随车教练与优先级。</div>
          <div className="event"><b>2. 目的地校长确认接收</b>预留库位、教练接待与训练容量。</div>
          <div className="event"><b>3. 总部校验放行</b>校验围栏、车辆额度、终端状态和队列。</div>
          <div className="event"><b>4. 队首发车</b>只有同时获批且排名队首的申请能发车。</div>
          <div className="event"><b>5. 到达入账或异常回滚</b>撤回、驳回、超时、换车均关闭原单并释放队列，不生成重复成本。</div>
        </div>
      </Card>

      <Card title="当前冲突裁决">
        {state.vehicles.map((vehicle) => {
          const list = state.requests.filter((request) => request.vehicleId === vehicle.id && ['destination_pending', 'queued', 'destination_approved', 'hq_approved', 'in_transit'].includes(request.status)).sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt));
          if (list.length <= 1) return null;
          return <div className="entity-card" key={vehicle.id}><div className="entity-title">{vehicle.plate}<Badge tone="red">{list.length} 单竞争</Badge></div>{list.map((request, index) => <div className="entity-meta" key={request.id}>#{index + 1} P{request.priority} {request.id} → {campusName(state, request.toCampusId)} <Badge tone={statusTone(request.status)}>{statusText(request.status)}</Badge></div>)}</div>;
        }).filter(Boolean)}
        <p className="muted small">只有活动审批链为空或前序申请闭环后，下一申请才会被裁决为可发车。</p>
      </Card>
    </div>

    <Card title={`调车单（${requests.length}）`}>
      <Table headers={['单号/原因', '车辆与路线', '审批链', '进度/队列', '风险', '操作', '事件轨迹']}>
        {requests.map((request) => <DispatchRow key={request.id} request={request} props={props} rejectId={rejectId} setRejectId={setRejectId} swapVehicleId={swapVehicleId} setSwapVehicleId={setSwapVehicleId} />)}
      </Table>
    </Card>
  </div>;
}

function DispatchRow({ request, props, rejectId, setRejectId, swapVehicleId, setSwapVehicleId }: { request: DispatchRequest; props: PageProps; rejectId: string; setRejectId: (value: string) => void; swapVehicleId: string; setSwapVehicleId: (value: string) => void }) {
  const { state, update, toastError } = props;
  const coach = state.coaches.find((item) => item.id === request.coachId);
  const queue = queuePosition(state, request);
  const active = ['destination_pending', 'queued', 'destination_approved', 'hq_approved', 'in_transit'].includes(request.status);
  const canDestination = state.role.role === 'hq' || state.role.campusId === request.toCampusId;
  const canHq = state.role.role === 'hq';
  const safe = (fn: () => AppState, message: string) => { try { update(fn, message); } catch (error) { toastError(error); } };
  type AppState = typeof state;

  return <tr>
    <td><b className="code">{request.id}</b><div className="muted small">{request.reason}</div><div className="muted small">ETA：{request.eta.replace('T', ' ')}；{coach?.name}</div></td>
    <td>{vehicleLabel(state, request.vehicleId)}<div className="small muted">{campusName(state, request.fromCampusId)} → {campusName(state, request.toCampusId)}</div></td>
    <td><Badge tone={request.destination === 'approved' ? 'green' : request.destination === 'rejected' ? 'red' : 'yellow'}>目的地 {request.destination === 'approved' ? '已确认' : request.destination === 'rejected' ? '驳回' : '待确认'}</Badge><br /><Badge tone={request.hq === 'approved' ? 'green' : request.hq === 'rejected' ? 'red' : 'yellow'}>总部 {request.hq === 'approved' ? '已放行' : request.hq === 'rejected' ? '驳回' : '待审'}</Badge></td>
    <td style={{ minWidth: 130 }}><Badge tone={statusTone(request.status)}>{statusText(request.status)}</Badge>{request.status === 'queued' && <div className="small muted">第 {queue.rank}/{queue.total} 位</div>}<div className="section-gap"><Progress value={request.progress} /></div></td>
    <td>{request.alerts.length ? request.alerts.map((alert) => <div key={alert} className="diff">⚠ {alert}</div>) : <span className="muted small">无</span>}</td>
    <td style={{ minWidth: 210 }}>
      <div className="actions">
        {active && canDestination && request.destination === 'pending' && <button className="success" onClick={() => safe(() => approveStage(state, request.id, 'destination'), '目的地校长已确认接收')}>接收</button>}
        {active && canDestination && request.destination === 'pending' && <button className="danger" onClick={() => setRejectId(request.id)}>目的地驳回</button>}
        {active && canHq && request.destination === 'approved' && request.hq === 'pending' && <button className="success" onClick={() => safe(() => approveStage(state, request.id, 'hq'), '总部已完成放行')}>总部放行</button>}
        {request.status === 'hq_approved' && queue.head && <button onClick={() => safe(() => departVehicle(state, request.id), '队首申请已发车，车辆获得唯一派用权')}>发车</button>}
        {request.status === 'in_transit' && canDestination && <button className="success" onClick={() => safe(() => arriveVehicle(state, request.id), '到达已确认，成本按锁定规则生成且防重复入账')}>确认到达</button>}
        {active && request.status !== 'in_transit' && <button className="secondary" onClick={() => safe(() => withdrawRequest(state, request.id, '申请方主动撤回'), '申请已撤回，资源与队列已释放')}>撤回</button>}
        {active && request.status !== 'in_transit' && <button className="warning" onClick={() => setSwapVehicleId(request.id)}>换车</button>}
        {active && <button className="danger" onClick={() => safe(() => timeoutRollback(state, request.id, '演示：审批/到达超时，系统自动回滚并释放车辆'), '已执行超时回滚')}>超时回滚</button>}
      </div>
      {rejectId === request.id && <div className="section-gap"><button className="danger" onClick={() => { safe(() => rejectRequest(state, request.id, 'destination', '目的地容量不足'), '已驳回并推进队列'); setRejectId(''); }}>确认容量不足驳回</button></div>}
      {swapVehicleId === request.id && <div className="section-gap field"><select value="" onChange={(event) => { if (event.target.value) safe(() => changeDispatchVehicle(state, request.id, event.target.value, '原车型临时维修'), '原单已回滚，新换车申请已重提'); setSwapVehicleId(''); }}><option value="">选择替代车辆…</option>{accessibleVehicles(state).filter((vehicle) => vehicle.id !== request.vehicleId && !['维修', '离线'].includes(vehicle.status)).map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.plate}</option>)}</select></div>}
    </td>
    <td style={{ maxWidth: 230 }}><div className="timeline">{request.events.slice(-3).map((event, index) => <div className="event" key={`${event.at}-${index}`}><b>{event.type} · {event.actor}</b><span>{event.detail}</span></div>)}</div></td>
  </tr>;
}
