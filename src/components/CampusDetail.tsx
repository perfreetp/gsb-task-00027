import type { Campus, Fence, Vehicle } from '../domain/types';
import { Badge, Card } from './ui';

const areaTitles = ['倒车入库', '侧方停车', '坡道定点', '曲线行驶', '直角转弯', '模拟考试区'];

export function CampusDetail({ campus, vehicles, fences, onClose }: { campus: Campus; vehicles: Vehicle[]; fences: Fence[]; onClose: () => void }) {
  const atCampus = vehicles.filter((vehicle) => vehicle.currentCampusId === campus.id);
  const used = atCampus.filter((vehicle) => vehicle.status === 'training').length * 5;
  return (
    <div className="detail-panel">
      <Card title={`${campus.name} · 场地精模`} extra={<button className="ghost" onClick={onClose}>返回沙盘</button>}>
        <div className="detail-summary">
          <span>库位 {campus.slots}</span>
          <span>在场车辆 {atCampus.length}</span>
          <span><b>{used}</b> / {campus.slots} 库位占用</span>
          <Badge tone="blue">实时定位 + 库位级占用</Badge>
        </div>
        <div className="site-model" style={{ ['--campus-color' as string]: `#${campus.color.toString(16).padStart(6, '0')}` }}>
          {Array.from({ length: campus.slots }, (_, index) => {
            const occupied = index < used || index % 11 === 0;
            const reserved = index > campus.slots - 4;
            return <i key={index} className={occupied ? 'occupied' : reserved ? 'reserved' : 'free'} title={`库位 ${index + 1}`} />;
          })}
        </div>
        <div className="area-grid">
          {areaTitles.map((area, index) => <div key={area}><span>{area}</span><b>{Math.min(96, 42 + index * 9)}%</b></div>)}
        </div>
        <div className="fence-local-list">
          <h4>本地围栏</h4>
          {fences.filter((fence) => fence.campusId === campus.id).map((fence) => (
            <div key={fence.id}><span>{fence.name}</span><Badge tone={fence.localAdjustment ? 'amber' : 'green'}>{fence.localAdjustment ?? '标准模板'}</Badge></div>
          ))}
        </div>
      </Card>
    </div>
  );
}
