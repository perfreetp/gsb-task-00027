import type { ReactNode } from 'react';

export function Card({ title, extra, children, className = '' }: { title?: ReactNode; extra?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || extra) && <header className="card-header"><h3>{title}</h3><div>{extra}</div></header>}
      {children}
    </section>
  );
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'slate' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Stat({ label, value, hint, tone = 'default' }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'default' | 'warning' | 'danger' }) {
  return (
    <div className={`stat stat-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}

export function Empty({ text = '当前角色可见范围暂无数据' }: { text?: string }) {
  return <div className="empty">{text}</div>;
}

export function Money({ value }: { value: number }) {
  return <>¥{value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>;
}
