import { useStore } from '../domain/store';
import { Card, Money } from './ui';

export function ReportsPage() {
  const { state } = useStore();
  const exportLogs = () => {
    const rows = [['模块', '对象', '动作', '变更前', '变更后', '操作人', '时间'], ...state.auditLogs.map((log) => [log.module, log.targetId, log.action, log.before, log.after, log.operator, log.at])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '围栏规则分摊审计日志.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="stack-page">
      <Card title="月结报表">
        <div className="report-grid">
          {state.monthly.map((record) => (
            <article key={record.month}>
              <h3>{record.month}</h3>
              <dl>
                <dt>调车次数</dt><dd>{record.transferCount}</dd>
                <dt>跨区学时</dt><dd>{record.crossCampusHours}h</dd>
                <dt>分摊金额</dt><dd><Money value={record.allocatedAmount} /></dd>
                <dt>异常记录</dt><dd className={record.exceptions > 10 ? 'danger-text' : ''}>{record.exceptions}</dd>
              </dl>
            </article>
          ))}
        </div>
      </Card>
      <Card title="审计日志：围栏 / 规则 / 分摊比例全量回溯" extra={<button onClick={exportLogs}>导出 CSV</button>}>
        <div className="audit-list">
          {state.auditLogs.map((log) => (
            <article key={log.id}>
              <header><span>{log.module}</span><strong>{log.action}</strong><time>{log.at}</time></header>
              <div className="diff-compare"><pre>{log.before}</pre><b>→</b><pre>{log.after}</pre></div>
              <footer>{log.operator} · 对象 {log.targetId}</footer>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}
