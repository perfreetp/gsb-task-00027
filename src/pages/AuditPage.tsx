import { useState } from 'react';
import { Badge, Card, PageProps, Table } from '../ui';

const flatten = (value: unknown, prefix = ''): Record<string, string> => {
  if (!value || typeof value !== 'object') return { [prefix || 'value']: String(value) };
  return Object.entries(value as Record<string, unknown>).reduce((result, [key, item]) => {
    const name = prefix ? `${prefix}.${key}` : key;
    if (item && typeof item === 'object') Object.assign(result, flatten(item, name));
    else result[name] = String(item);
    return result;
  }, {} as Record<string, string>);
};

export default function AuditPage({ state }: PageProps) {
  const [category, setCategory] = useState('all');
  const rows = state.audit.filter((entry) => category === 'all' || entry.category === category);

  return <div className="grid">
    <div className="grid cols-3">
      <Card title="审计覆盖对象"><div className="value">围栏 / 规则 / 分摊比例</div><div className="muted small">每次变更保存操作人、时间、实体 ID、变更前后快照和审批动作。</div></Card>
      <Card title="不可变事件"><div className="value">{state.audit.length}</div><div className="muted small">历史结果通过规则版本追溯，不被后续比例调整覆盖。</div></Card>
      <Card title="导出"><div className="value">CSV</div><div className="muted small">支持按分类导出，便于内审、财务和安全合规复核。<button className="secondary section-gap" onClick={() => exportAudit(rows)}>导出当前审计</button></div></Card>
    </div>

    <Card title="变更审计与前后对比" extra={<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">全部分类</option><option>围栏</option><option>规则</option><option>分摊比例</option><option>审批</option><option>车辆</option></select>}>
      <Table headers={['时间', '分类', '操作人', '动作/实体', '变更前', '变更后']}>
        {rows.map((entry) => {
          const before = flatten(entry.before ?? {});
          const after = flatten(entry.after ?? {});
          const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
          return <tr key={entry.id}><td className="small muted">{entry.at.replace('T', ' ').slice(0, 16)}</td><td><Badge tone="blue">{entry.category}</Badge></td><td>{entry.actor}</td><td><b>{entry.action}</b><br /><span className="code small">{entry.entityId}</span></td><td>{keys.length ? keys.map((key) => <div className="small" key={key}>{key}: {before[key] ?? '—'}</div>) : <span className="muted">新建</span>}</td><td>{keys.map((key) => <div className="small" key={key}>{key}: <b>{after[key] ?? '—'}</b>{before[key] && before[key] !== after[key] ? ' ← changed' : ''}</div>)}</td></tr>;
        })}
      </Table>
    </Card>
  </div>;
}

function exportAudit(rows: PageProps['state']['audit']) {
  const table = [['时间', '分类', '操作人', '动作', '实体', '变更前', '变更后']];
  rows.forEach((entry) => table.push([entry.at, entry.category, entry.actor, entry.action, entry.entityId, JSON.stringify(entry.before ?? {}), JSON.stringify(entry.after ?? {})]));
  const blob = new Blob(['\ufeff' + table.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = '管控中台审计日志.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}
