import type { ReactNode } from 'react';
import type { AppState } from './types';
import { campusName, vehicleLabel } from './engine';

export interface PageProps {
  state: AppState;
  update: (producer: (previous: AppState) => AppState, success?: string) => void;
  toastError: (error: unknown) => void;
  focusCampus: (id: string | null) => void;
  selectedVehicleId: string | null;
  setSelectedVehicleId: (id: string | null) => void;
  startRoam: (id: string) => void;
}

export const cname = (state: AppState, id?: string) => id ? campusName(state, id) ?? id : '—';
export const vlabel = (state: AppState, id: string) => vehicleLabel(state, id);

export function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: 'red' | 'green' | 'yellow' | 'blue' | 'gray' }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Card({ title, extra, children, className = '' }: { title?: ReactNode; extra?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {title && <div className="horizontal"><h2>{title}</h2>{extra}</div>}
      {children}
    </section>
  );
}

export const statusTone = (status: string): 'red' | 'green' | 'yellow' | 'blue' | 'gray' => {
  if (['arrived', '已确认', '已批准', '已生效', 'approved', '在训'].includes(status)) return 'green';
  if (['in_transit', 'hq_approved', '待总部确认', '待总部审批', '待审批', '调车中'].includes(status)) return 'blue';
  if (['queued', 'destination_pending', 'destination_approved', 'pending'].includes(status)) return 'yellow';
  if (['rejected', 'withdrawn', 'timeout_rollback', '已驳回', '离线', '维修'].includes(status)) return 'red';
  return 'gray';
};

export const statusText = (status: string) => ({
  queued: '排队中',
  destination_pending: '待目的地确认',
  destination_approved: '目的地已确认',
  hq_approved: '总部已放行',
  in_transit: '在途',
  arrived: '已到达',
  rejected: '已驳回',
  withdrawn: '已撤回',
  timeout_rollback: '超时回滚'
} as Record<string, string>)[status] ?? status;

export function Progress({ value }: { value: number }) {
  return <div className="progress"><i style={{ width: `${Math.round(value * 100)}%` }} /></div>;
}

export function money(value: number) {
  return `¥${value.toFixed(0)}`;
}

export function Table({ headers, children }: { headers: ReactNode[]; children: ReactNode }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{headers.map((header, index) => <th key={index}>{header}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="muted small" style={{ padding: 18, textAlign: 'center' }}>{text}</div>;
}
