import { useMemo, useState } from 'react';
import {
  calculateCredit, calculateTrainingCosts, campusName, publishRuleVersion, transferAllocation,
  updateCostRule, updateCreditRule
} from '../engine';
import type { CostRule, TrainingSession } from '../types';
import { Badge, Card, PageProps, Table, money } from '../ui';

export default function RulesCostPage({ state, update, toastError }: PageProps) {
  const latestVersion = state.ruleVersions[0]?.version;
  const latestCredit = state.creditRules.filter((rule) => rule.version === latestVersion);
  const latestCost = state.costRules.filter((rule) => rule.version === latestVersion);
  const [versionNote, setVersionNote] = useState('');

  return <div className="grid">
    <div className="grid cols-3">
      <Card title="规则版本与回溯">
        <div className="kpi-list">
          {state.ruleVersions.map((version) => <div className="entity-card" key={version.version}><div className="horizontal"><b>{version.version}</b><Badge tone={version.version === latestVersion ? 'green' : 'gray'}>{version.version === latestVersion ? '当前' : '历史'}</Badge></div><div className="small muted">{version.effectiveAt.slice(0, 10)} 生效<br />{version.note}</div></div>)}
        </div>
        <div className="form-row one section-gap"><div className="field"><label>发布新版本（复制当前规则形成草稿）</label><input value={versionNote} onChange={(event) => setVersionNote(event.target.value)} placeholder="变更说明，例如：冬季高峰成本修订" /></div></div>
        <button onClick={() => { try { update((previous) => publishRuleVersion(previous, versionNote || '总部规则修订'), '新版本已发布，历史单据仍保留旧版本计算结果'); setVersionNote(''); } catch (error) { toastError(error); } }}>发布新版本</button>
      </Card>

      <Card title="跨区学时归属规则" className="" >
        <p className="muted small">匹配优先级：科目+车型+时段 &gt; 科目+车型 &gt; 科目+时段 &gt; 默认。学员本人始终计 100%，车属/训练校区仅拆分经营归属。</p>
        <div className="table-wrap"><table><thead><tr><th>科目</th><th>车型</th><th>时段</th><th>车属/训练</th><th>调整</th></tr></thead><tbody>
          {latestCredit.map((rule) => <tr key={rule.id}><td>{rule.subject}</td><td>{rule.vehicleType}</td><td>{rule.timeSlot}</td><td style={{ minWidth: 120 }}><Badge tone="blue">{rule.ownerCampus}%</Badge> / <Badge tone="yellow">{rule.trainingCampus}%</Badge></td><td><button className="secondary" onClick={() => { const value = prompt('输入车属校区比例（训练校区自动补齐到 100%）', String(rule.ownerCampus)); if (value) try { update((previous) => updateCreditRule(previous, rule.id, { ownerCampus: Number(value), trainingCampus: 100 - Number(value) }), '学时归属比例已调整并写入审计'); } catch (error) { toastError(error); } }}>调整</button></td></tr>)}
        </tbody></table></div>
      </Card>

      <Card title="成本分摊规则">
        <div className="table-wrap"><table><thead><tr><th>场景</th><th>车型/时段</th><th>油费</th><th>过路</th><th>折旧</th></tr></thead><tbody>
          {latestCost.map((rule) => <tr key={rule.id}><td>{rule.scope}</td><td>{rule.vehicleType}<br />{rule.timeSlot}</td><td>{rule.fuelOwner}/{rule.fuelTraining}</td><td>{rule.tollOwner}/{rule.tollRequesting}</td><td>{rule.depreciationOwner}/{rule.depreciationTraining}</td></tr>)}
        </tbody></table></div>
        <p className="muted small section-gap">格式为“车属校区% / 训练或申请校区%”。任意一组不等于 100% 会被引擎拒绝，所有改动写入审计。</p>
        <button className="secondary" onClick={() => { const id = latestCost[0]?.id; if (!id) return; const value = prompt('设置异地训练平峰油费的车属校区比例', '50'); if (value) try { update((previous) => updateCostRule(previous, previous.costRules.find(r => r.id === id)!.id, { fuelOwner: Number(value), fuelTraining: 100 - Number(value) }), '成本比例已更新'); } catch (error) { toastError(error); } }}>演示调整油费比例</button>
      </Card>
    </div>

    <CreditBreakdown sessions={state.sessions} state={state} />
    <Reconciliation state={state} />
  </div>;
}

function CreditBreakdown({ state, sessions }: { state: PageProps['state']; sessions: TrainingSession[] }) {
  return <Card title="跨区学时试算与历史锁定">
    <Table headers={['学员/开始时间', '训练条件', '车属 → 训练校区', '规则版本', '学员学时', '经营归属拆分']}>
      {sessions.map((session) => {
        const result = calculateCredit(state, session);
        const cross = session.ownerCampusId !== session.trainingCampusId;
        return <tr key={session.id}><td><b>{session.student}</b><div className="muted small">{session.startedAt.replace('T', ' ').slice(0, 16)}</div></td><td>{session.subject}<br />{session.vehicleType} / {session.timeSlot}</td><td>{campusName(state, session.ownerCampusId)}<br />→ {campusName(state, session.trainingCampusId)} {cross && <Badge tone="yellow">跨区</Badge>}</td><td><span className="code">{session.ruleVersion}</span></td><td>{result.studentMinutes} 分钟</td><td><Badge tone="blue">车属 {result.ownerMinutes}</Badge> <Badge tone="yellow">训练 {result.trainingMinutes}</Badge><div className="split-bar"><i style={{ width: `${result.rule.ownerCampus}%` }} /><i style={{ width: `${result.rule.trainingCampus}%` }} /></div></td></tr>;
      })}
    </Table>
  </Card>;
}

const fuelRate: Record<string, number> = { C1: 42, C2: 48, B2: 76 };
const depreciationRate: Record<string, number> = { C1: 24, C2: 28, B2: 46 };

function Reconciliation({ state }: { state: PageProps['state'] }) {
  const bills = useMemo(() => {
    const map = new Map<string, { campusId: string; fuel: number; toll: number; depreciation: number; count: number }>();
    const ensure = (campusId: string) => {
      if (!map.has(campusId)) map.set(campusId, { campusId, fuel: 0, toll: 0, depreciation: 0, count: 0 });
      return map.get(campusId)!;
    };
    state.sessions.filter((session) => session.ownerCampusId !== session.trainingCampusId).forEach((session) => {
      const result = calculateTrainingCosts(state, session, fuelRate[session.vehicleType], depreciationRate[session.vehicleType]);
      ensure(session.ownerCampusId).fuel += result.fuel.firstAmount;
      ensure(session.trainingCampusId).fuel += result.fuel.secondAmount;
      ensure(session.ownerCampusId).depreciation += result.depreciation.firstAmount;
      ensure(session.trainingCampusId).depreciation += result.depreciation.secondAmount;
      ensure(session.trainingCampusId).count += 1;
    });
    state.transferCosts.forEach((cost) => {
      const request = state.requests.find((request) => request.id === cost.requestId);
      if (!request) return;
      const allocation = transferAllocation(state, cost, request);
      ensure(request.toCampusId);
      const owner = map.get(request.fromCampusId)!;
      const requesting = map.get(request.toCampusId)!;
      owner.fuel += allocation.fuel.owner; owner.toll += allocation.toll.owner; owner.depreciation += allocation.depreciation.owner;
      requesting.fuel += allocation.fuel.requesting; requesting.toll += allocation.toll.requesting; requesting.depreciation += allocation.depreciation.requesting;
      requesting.count += 1;
    });
    return [...map.values()].sort((a, b) => b.fuel + b.toll + b.depreciation - a.fuel - a.toll - a.depreciation);
  }, [state]);

  return <Card title="校区成本对账单（按规则版本实时锁定）" extra={<Badge tone="green">可导出 CSV</Badge>}>
    <Table headers={['校区', '关联跨区次数', '油费', '过路费', '车辆折旧', '合计', '操作']}>
      {bills.map((bill) => <tr key={bill.campusId}><td><b>{campusName(state, bill.campusId)}</b></td><td>{bill.count}</td><td>{money(bill.fuel)}</td><td>{money(bill.toll)}</td><td>{money(bill.depreciation)}</td><td><b>{money(bill.fuel + bill.toll + bill.depreciation)}</b></td><td><button className="secondary" onClick={() => exportBill(state, bill.campusId)}>导出</button></td></tr>)}
    </Table>
  </Card>;
}

function exportBill(state: PageProps['state'], campusId: string) {
  const rows = [['类别', '单号/学员', '规则版本', '金额']];
  state.transferCosts.forEach((cost) => {
    const request = state.requests.find((item) => item.id === cost.requestId);
    if (!request || ![request.fromCampusId, request.toCampusId].includes(campusId)) return;
    rows.push(['调车成本', cost.requestId, cost.costRuleVersion, String(cost.fuel + cost.toll + cost.depreciation)]);
  });
  const blob = new Blob(['\ufeff' + rows.map((row) => row.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${campusName(state, campusId)}-成本对账.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
