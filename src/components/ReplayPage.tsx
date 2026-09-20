import { useEffect, useState } from 'react';
import { useStore } from '../domain/store';
import { Badge, Card } from './ui';

export function ReplayPage() {
  const { state } = useStore();
  const [leftId, setLeftId] = useState(state.campuses[0].id);
  const [rightId, setRightId] = useState(state.campuses[1].id);
  const [playing, setPlaying] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setTick((value) => value + 1), 600);
    return () => window.clearInterval(timer);
  }, [playing]);

  return (
    <div className="stack-page">
      <Card title="三维回放对比 · 同一时段校区拥挤情况" extra={<Badge tone="blue">2026-09-20 08:00-12:00</Badge>}>
        <div className="replay-controls">
          <select value={leftId} onChange={(event) => setLeftId(event.target.value)}>{state.campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}</select>
          <button onClick={() => setPlaying(!playing)}>{playing ? '暂停' : '播放'}</button>
          <div className="timeline"><i style={{ width: `${(tick % 40) * 2.5}%` }} /></div>
          <select value={rightId} onChange={(event) => setRightId(event.target.value)}>{state.campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}</select>
        </div>
        <div className="replay-grid">
          <ReplayCanvas key={leftId} campusId={leftId} tick={tick} />
          <ReplayCanvas key={rightId} campusId={rightId} tick={tick} />
        </div>
      </Card>
    </div>
  );
}

function ReplayCanvas({ campusId, tick }: { campusId: string; tick: number }) {
  const { state } = useStore();
  const campus = state.campuses.find((item) => item.id === campusId)!;
  const vehicles = state.vehicles.filter((vehicle) => vehicle.currentCampusId === campusId || vehicle.ownerCampusId === campusId).slice(0, 8);
  return (
    <div className="replay-card">
      <h3>{campus.name}</h3>
      <div className="mini-city">
        {Array.from({ length: 18 }, (_, index) => {
          const x = 12 + ((index * 17 + tick * 3) % 76);
          const y = 15 + ((index * 23 + tick * 2) % 62);
          const heat = (index + tick) % 3;
          return <i key={index} className={['cool', 'warm', 'hot'][heat]} style={{ left: `${x}%`, top: `${y}%` }} />;
        })}
        {vehicles.map((vehicle, index) => {
          const x = 18 + ((index * 23 + tick * 4) % 64);
          const y = 20 + ((index * 19 + tick * 3) % 54);
          return <b key={vehicle.id} style={{ left: `${x}%`, top: `${y}%` }} title={vehicle.plate} />;
        })}
        <div className="replay-overlay">库位占用 {45 + ((tick * 2) % 35)}% · 在训车辆 {vehicles.length}</div>
      </div>
    </div>
  );
}
