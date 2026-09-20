import { useState } from 'react';
import { useStore } from '../domain/store';
import { compareFence } from '../domain/fences';
import type { Fence } from '../domain/types';
import { Badge, Card } from './ui';

export function FencePage() {
  const store = useStore();
  const { state, user } = store;
  const allowed = store.visibleCampusIds();
  const [campusId, setCampusId] = useState(allowed[0] ?? state.campuses[0].id);
  const [selected, setSelected] = useState<Fence | undefined>(state.fences[0]);
  const [limit, setLimit] = useState(state.fences[0]?.limitKmh ?? 30);
  const [reason, setReason] = useState('');
  const fences = state.fences.filter((fence) => user.role === 'hq' || fence.campusId === campusId);

  const preview = selected ? compareFence(selected, { ...selected, limitKmh: limit, diffReason: reason }) : undefined;

  return (
    <div className="page-grid wide-left">
      <Card title="总部围栏模板库" extra={<Badge tone="purple">标准方案统一下发</Badge>}>
        <div className="template-grid">
          {state.templates.map((template) => (
            <article key={template.id}>
              <h4>{template.name}</h4>
              <p>{template.description}</p>
              <div className="template-actions">
                <select value={campusId} onChange={(event) => setCampusId(event.target.value)}>
                  {state.campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.shortName}</option>)}
                </select>
                <button onClick={() => store.applyTemplate(template.id, campusId)}>校区套用</button>
              </div>
            </article>
          ))}
        </div>
      </Card>
      <Card title="本地围栏与差异">
        <div className="fence-list">
          {fences.map((fence) => {
            const campus = state.campuses.find((item) => item.id === fence.campusId);
            return <button key={fence.id} className={selected?.id === fence.id ? 'active' : ''} onClick={() => { setSelected(fence); setLimit(fence.proposedChange?.limitKmh ?? fence.limitKmh ?? 30); setReason(fence.proposedChange?.diffReason ?? fence.diffReason ?? ''); }}>
              <span>{campus?.shortName} · {fence.name}</span>
              <small>v{fence.version} · {fence.kind === 'speed-limit' ? `${fence.limitKmh}km/h` : fence.kind} {fence.pendingApproval ? '· 待总部确认' : fence.diffReason ? '· 有差异' : ''}</small>
            </button>;
          })}
        </div>
      </Card>
      <Card title="本地微调与安全审批" className="span-2">
        {selected && preview ? (
          <div className="fence-editor">
            <label>围栏名称<input value={selected.name} onChange={(event) => setSelected({ ...selected, name: event.target.value })} /></label>
            {selected.kind === 'speed-limit' && <label>限速值<input type="number" value={limit} onChange={(event) => setLimit(Number(event.target.value))} /></label>}
            <label className="reason">差异原因<input placeholder="如：校门前学校路段，高峰人车混行" value={reason} onChange={(event) => setReason(event.target.value)} /></label>
            <div className={`diff-impact impact-${preview.safetyImpact}`}>
              <b>影响评估：{preview.safetyImpact === 'requires-hq' ? '需总部确认' : preview.safetyImpact === 'watch' ? '需关注' : '无安全影响'}</b>
              <ul>{preview.reasons.length ? preview.reasons.map((item) => <li key={item}>{item}</li>) : <li>当前改动不触发安全审批。</li>}</ul>
            </div>
            <button onClick={() => { store.proposeFence(selected.id, { limitKmh: limit, diffReason: reason, localAdjustment: selected.kind === 'speed-limit' && selected.limitKmh !== limit ? `${selected.limitKmh} → ${limit}km/h` : selected.localAdjustment }); }}>提交本地版本</button>
            {user.role === 'hq' && (preview.safetyImpact === 'requires-hq' || selected.pendingApproval) && <button onClick={() => store.approveFence(selected.id)}>总部确认生效</button>}
          </div>
        ) : <p className="muted">请选择围栏。</p>}
      </Card>
    </div>
  );
}
