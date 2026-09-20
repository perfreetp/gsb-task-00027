import { useMemo, useState } from 'react';
import { useStore } from '../domain/store';
import { allocateCost, attributeHours } from '../domain/rules';
import type { CostRule, HourRule, Subject } from '../domain/types';
import { Card, Money } from './ui';

export function RulesCostPage() {
  const store = useStore();
  const { state } = store;
  const [subject, setSubject] = useState<Subject>('subject3');
  const [carType, setCarType] = useState<'C1' | 'C2' | 'B2'>('B2');
  const [at, setAt] = useState('2026-09-20 21:30');
  const [minutes, setMinutes] = useState(120);
  const [amount, setAmount] = useState(360);

  const hourResult = useMemo(() => attributeHours(state.hourRules, {
    subject, carType, minutes, at, ownerCampusId: 'west', trainingCampusId: 'south', studentId: '学员 S1029'
  }), [state.hourRules, subject, carType, minutes, at]);

  const costResults = (['fuel', 'toll', 'depreciation'] as const).map((costType) => allocateCost(state.costRules, {
    costType, subject, carType, amount, at, ownerCampusId: 'west', userCampusId: 'south'
  }));

  return (
    <div className="stack-page">
      <div className="page-grid">
        <Card title="跨区学时归属规则" extra={<BadgeLite text="多条件优先级 + 历史快照" />}>
          <RuleTable rules={state.hourRules.map(({ id, subject, carType, timeBand, studentShare, ownerShare, trainingShare, effectiveFrom, version }) => [id, subjectName(subject), carType, timeBand === 'day' ? '日班' : timeBand === 'night' ? '夜间' : '全部', `学员 ${formatShare(studentShare)} / 车属 ${formatShare(ownerShare)} / 训练 ${formatShare(trainingShare)}`, `${effectiveFrom} v${version}`])} />
          <HourRuleForm onSave={store.saveHourRule} />
        </Card>
        <Card title="成本分摊规则" extra={<BadgeLite text="油费 / 过路费 / 折旧" />}>
          <RuleTable rules={state.costRules.map((rule) => [rule.id, costName(rule.costType), rule.subject === 'ALL' ? '全部' : subjectName(rule.subject), rule.carType, rule.timeBand === 'day' ? '日班' : rule.timeBand === 'night' ? '夜间' : '全部', `车属 ${formatShare(rule.ownerShare)} / 用车 ${formatShare(rule.userShare)} / 总部 ${formatShare(rule.hqShare)}`, `${rule.effectiveFrom} v${rule.version}`])} />
          <CostRuleForm onSave={store.saveCostRule} />
        </Card>
      </div>
      <Card title="试算：异地训练学时 + 调车成本">
        <div className="calculator">
          <label>科目<select value={subject} onChange={(e) => setSubject(e.target.value as Subject)}><option value="subject2">科目二</option><option value="subject3">科目三</option></select></label>
          <label>车型<select value={carType} onChange={(e) => setCarType(e.target.value as 'C1' | 'C2' | 'B2')}><option>C1</option><option>C2</option><option>B2</option></select></label>
          <label>发生时间<input value={at} onChange={(e) => setAt(e.target.value)} /></label>
          <label>训练分钟<input type="number" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></label>
          <label>单笔费用<input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></label>
        </div>
        <div className="result-grid">
          <div><span>学时命中</span><strong>{hourResult.matchedBy}</strong><p>学员 {hourResult.studentMinutes} 分；车属校区 {hourResult.ownerMinutes} 分；训练校区 {hourResult.trainingCampusMinutes} 分</p><small>快照：{JSON.stringify(hourResult.snapshot)}</small></div>
          {costResults.map((result, index) => <div key={index}><span>{costName(['fuel', 'toll', 'depreciation'][index] as CostRule['costType'])}</span><strong>{result.matchedBy}</strong><p>车属 <Money value={result.ownerAmount} />；用车 <Money value={result.userAmount} />；总部 <Money value={result.hqAmount} /></p><small>快照：{JSON.stringify(result.snapshot)}</small></div>)}
        </div>
      </Card>
      <Card title="校区对账单（2026-09）">
        <div className="ledger-table">
          <div className="ledger-head"><span>校区</span><span>调车次数</span><span>跨区学时</span><span>应摊油费</span><span>过路费</span><span>折旧</span><span>净额</span><span>状态</span></div>
          {state.campuses.map((campus, index) => {
            const fuel = 1860 + index * 420;
            const toll = 320 + index * 90;
            const depreciation = 5200 + index * 900;
            return <div className="ledger-row" key={campus.id}><span>{campus.shortName}</span><span>{12 + index * 3}</span><span>{218 + index * 42}h</span><Money value={fuel} /><Money value={toll} /><Money value={depreciation} /><b><Money value={fuel + toll + depreciation} /></b><span>{index === 1 ? '待确认' : '已对账'}</span></div>;
          })}
        </div>
      </Card>
    </div>
  );
}

function HourRuleForm({ onSave }: { onSave: (rule: HourRule) => void }) {
  return (
    <button className="ghost full" onClick={() => onSave({ id: `hr-${Date.now()}`, subject: 'subject2', carType: 'ALL', timeBand: 'night', studentShare: 1, ownerShare: 0.2, trainingShare: 0.8, effectiveFrom: '2026-10-01', version: 0 })}>
      新增一条规则（示例：夜间科二 车属20%/训练80%，保存后升版本并写审计）
    </button>
  );
}

function CostRuleForm({ onSave }: { onSave: (rule: CostRule) => void }) {
  return (
    <button className="ghost full" onClick={() => onSave({ id: `cr-${Date.now()}`, costType: 'fuel', subject: 'subject2', carType: 'B2', timeBand: 'night', ownerShare: 0.55, userShare: 0.35, hqShare: 0.1, effectiveFrom: '2026-10-01', version: 0 })}>
      新增一条规则（示例：夜间B2科二油费 55/35/10，保存后升版本并写审计）
    </button>
  );
}

function RuleTable({ rules }: { rules: string[][] }) {
  return <div className="mini-table">{rules.map((row) => <div key={row[0]} className="mini-row">{row.slice(1).map((cell) => <span key={cell}>{cell}</span>)}</div>)}</div>;
}
function BadgeLite({ text }: { text: string }) { return <span className="badge badge-purple">{text}</span>; }
function subjectName(subject: string) { return subject === 'subject2' ? '科目二' : subject === 'subject3' ? '科目三' : '全部'; }
function costName(type: CostRule['costType']) { return type === 'fuel' ? '油费' : type === 'toll' ? '过路费' : '车辆折旧'; }
function formatShare(value: number) { return `${Math.round(value * 100)}%`; }
