import { useState } from 'react';
import {
  applyTemplate, approveGeofenceApplication, campusName, decideGeofenceChange, submitGeofenceChange
} from '../engine';
import type { LocalAdjustment } from '../types';
import { Badge, Card, PageProps, Table } from '../ui';
import { accessibleCampuses } from '../access';

const fields: Array<{ key: keyof Omit<LocalAdjustment, 'field' | 'standard' | 'local' | 'reason'> | 'noEntryRadius' | 'speedLimit' | 'nightLockdown' | 'idleLimitMinutes'; label: string }> = [
  { key: 'noEntryRadius', label: '禁入半径(米)' },
  { key: 'speedLimit', label: '限速(km/h)' },
  { key: 'nightLockdown', label: '夜间封场' },
  { key: 'idleLimitMinutes', label: '停留阈值(分钟)' }
];

export default function GeofencePage({ state, update, toastError }: PageProps) {
  const campuses = accessibleCampuses(state);
  const [campusId, setCampusId] = useState(campuses[0]?.id ?? state.campuses[0].id);
  const [templateId, setTemplateId] = useState(state.templates[0].id);
  const [values, setValues] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const template = state.templates.find((item) => item.id === templateId)!;
  const adjustments: LocalAdjustment[] = fields
    .map((field) => ({ field: field.key, standard: template[field.key] as string | number, local: values[field.key] ?? String(template[field.key]), reason: reasons[field.key] ?? '' }))
    .filter((item) => String(item.local) !== String(item.standard));

  return <div className="grid">
    <div className="grid cols-3">
      {state.templates.map((item) => <Card key={item.id} title={item.name} extra={<Badge tone="blue">{item.version}</Badge>}>
        <div className="kpi-list">
          <div>禁入缓冲区：<b>{item.noEntryRadius} 米</b></div>
          <div>标准限速：<b>{item.speedLimit} km/h</b></div>
          <div>夜间封场：<b>{item.nightLockdown}</b></div>
          <div>长停阈值：<b>{item.idleLimitMinutes} 分钟</b></div>
        </div>
        <p className="muted small">总部统一维护标准方案；校区可套用，但任何偏差必须填写差异原因并进入审计。</p>
      </Card>)}
    </div>

    <Card title="校区套用与本地微调">
      <div className="form-row three">
        <div className="field"><label>校区</label><select value={campusId} onChange={(event) => setCampusId(event.target.value)}>{campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}</select></div>
        <div className="field"><label>模板</label><select value={templateId} onChange={(event) => { setTemplateId(event.target.value); setValues({}); setReasons({}); }}>{state.templates.map((item) => <option key={item.id} value={item.id}>{item.name} / {item.version}</option>)}</select></div>
        <div className="field"><label>&nbsp;</label><button onClick={() => { try { update((previous) => applyTemplate(previous, campusId, templateId, adjustments), '模板套用申请已提交总部审批'); setValues({}); setReasons({}); } catch (error) { toastError(error); } }}>提交套用审批</button></div>
      </div>
      <div className="grid cols-4">
        {fields.map((field) => <div className="field" key={field.key}><label>{field.label}，标准 {String(template[field.key])}</label><input value={values[field.key] ?? String(template[field.key])} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} placeholder="留空表示沿用标准" />{String(values[field.key] ?? template[field.key]) !== String(template[field.key]) && <textarea className="section-gap" placeholder="必填：说明差异原因" value={reasons[field.key] ?? ''} onChange={(event) => setReasons({ ...reasons, [field.key]: event.target.value })} />}</div>)}
      </div>
    </Card>

    <div className="grid cols-2">
      <Card title="套用记录">
        <Table headers={['校区', '模板版本', '本地差异', '状态', '总部操作']}>
          {state.geofenceApplications.filter((application) => state.role.role === 'hq' || application.campusId === state.role.campusId).map((application) => <tr key={`${application.campusId}-${application.templateVersion}`}><td>{campusName(state, application.campusId)}</td><td><span className="code">{application.templateVersion}</span></td><td>{application.adjustments.length ? application.adjustments.map((item) => <div key={item.field} className="small">{item.field}: {String(item.standard)} → {String(item.local)}<br /><span className="muted">{item.reason}</span></div>) : <span className="muted">完全沿用</span>}</td><td><Badge tone={application.status === '已生效' ? 'green' : application.status === '已驳回' ? 'red' : 'yellow'}>{application.status}</Badge></td><td>{application.status === '待总部审批' && state.role.role === 'hq' && <button className="success" onClick={() => update((previous) => approveGeofenceApplication(previous, application.campusId), '围栏模板已生效')}>批准</button>}</td></tr>)}
        </Table>
      </Card>
      <ChangeList state={state} update={update} toastError={toastError} />
    </div>
  </div>;
}

type ChangeListProps = Pick<PageProps, 'state' | 'update' | 'toastError'>;

function ChangeList({ state, update, toastError }: ChangeListProps) {
  const [campusId, setCampusId] = useState(state.role.campusId ?? state.campuses[0].id);
  const [field, setField] = useState('speedLimit');
  const [requested, setRequested] = useState('15');
  const [impact, setImpact] = useState('');
  const [reason, setReason] = useState('');
  const visible = state.role.role === 'hq' ? state.geofenceChanges : state.geofenceChanges.filter((item) => item.campusId === state.role.campusId);

  return <Card title="围栏安全/工时影响变更审批">
    {state.role.role !== 'hq' && <div className="form-row three">
      <div className="field"><label>校区</label><select value={campusId} onChange={(event) => setCampusId(event.target.value)}>{state.campuses.filter((campus) => campus.id === state.role.campusId || state.role.role === 'hq').map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}</select></div>
      <div className="field"><label>字段</label><select value={field} onChange={(event) => setField(event.target.value)}>{fields.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></div>
      <div className="field"><label>申请值</label><input value={requested} onChange={(event) => setRequested(event.target.value)} /></div>
    </div>}
    {state.role.role !== 'hq' && <><div className="form-row"><div className="field"><label>安全或工时影响</label><input value={impact} onChange={(event) => setImpact(event.target.value)} placeholder="例如：日均可训时长减少 30 分钟" /></div><div className="field"><label>原因与附件说明</label><input value={reason} onChange={(event) => setReason(event.target.value)} /></div></div><button onClick={() => { try { update((previous) => { const application = previous.geofenceApplications.find((item) => item.campusId === campusId); const template = previous.templates.find((item) => item.id === application?.templateId) ?? previous.templates[0]; const current = application?.adjustments.find((item) => item.field === field)?.local ?? template[field as keyof typeof template]; return submitGeofenceChange(previous, { campusId, field, current: String(current), requested, impact, reason }); }, '安全相关围栏变更已提交总部确认'); setImpact(''); setReason(''); } catch (error) { toastError(error); } }}>提交总部确认</button></>}
    <div className="section-gap"><Table headers={['校区', '变更', '影响', '状态', '操作']}>
      {visible.map((change) => <tr key={change.id}><td>{campusName(state, change.campusId)}</td><td>{change.field}<br /><b>{String(change.current)} → {String(change.requested)}</b></td><td>{change.impact}<div className="muted small">{change.reason}</div></td><td><Badge tone={change.status === '已确认' ? 'green' : change.status === '已驳回' ? 'red' : 'yellow'}>{change.status}</Badge></td><td>{change.status === '待总部确认' && state.role.role === 'hq' && <div className="actions"><button className="success" onClick={() => update((previous) => decideGeofenceChange(previous, change.id, true), '围栏变更已确认')}>确认</button><button className="danger" onClick={() => update((previous) => decideGeofenceChange(previous, change.id, false), '围栏变更已驳回')}>驳回</button></div>}</td></tr>)}
    </Table></div>
  </Card>;
}
