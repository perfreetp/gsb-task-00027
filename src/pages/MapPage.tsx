import { useEffect, useMemo, useState } from 'react';
import ThreeCity from '../ThreeCity';
import type { DispatchRequest } from '../types';
import { campusName, queuePosition } from '../engine';
import { accessibleCampuses, accessibleRequests, accessibleVehicles } from '../access';
import { Badge, Card, PageProps, Progress, statusText, statusTone, vlabel } from '../ui';

interface Layers { boundaries: boolean; vehicles: boolean; routes: boolean; alerts: boolean; }

export default function MapPage(props: PageProps & { roamRequestId: string | null; onRoamEnd: () => void; externalFocusId: string | null }) {
  const { state, focusCampus: openCampus, selectedVehicleId, setSelectedVehicleId } = props;
  const [layers, setLayers] = useState<Layers>({ boundaries: true, vehicles: true, routes: true, alerts: true });
  const [focusId, setFocusId] = useState<string | null>(props.externalFocusId);
  const selectedVehicle = state.vehicles.find((vehicle) => vehicle.id === selectedVehicleId);
  const activeRequests = useMemo(() => accessibleRequests(state).filter((request) => ['destination_pending', 'queued', 'destination_approved', 'hq_approved', 'in_transit'].includes(request.status)), [state]);
  const focus = (id: string) => { setFocusId(id); };
  const resetView = () => setFocusId(null);
  const enterCampus = (id: string) => openCampus(id);
  const selectedCampus = state.campuses.find((campus) => campus.id === focusId);

  useEffect(() => setFocusId(props.externalFocusId), [props.externalFocusId]);

  return (
    <div className="map-layout">
      <Card className="map-panel">
        <ThreeCity state={state} layers={layers} focusCampusId={focusId} roamRequestId={props.roamRequestId} selectedVehicleId={selectedVehicleId} onSelectCampus={focus} onSelectVehicle={setSelectedVehicleId} onRoamEnd={props.onRoamEnd} />
        <div className="map-overlay">
          <div className="layer-switch">
            {Object.entries({ boundaries: '校区边界', vehicles: '实时车辆', routes: '调车路线', alerts: '风险闪烁' }).map(([key, label]) => (
              <label key={key}><input type="checkbox" checked={layers[key as keyof Layers]} onChange={(event) => setLayers({ ...layers, [key]: event.target.checked })} />{label}</label>
            ))}
          </div>
          <div className="map-tools"><button className="secondary" onClick={() => { resetView(); }}>全城视角</button></div>
        </div>
      </Card>
      <div className="grid" style={{ gridTemplateRows: 'auto auto 1fr' }}>
        <Card title="沙盘对象">
          <div className="muted small">点击蓝色校区切入场地视角；点击车辆查看档案与在途状态。</div>
          <div className="actions">{accessibleCampuses(state).map((campus) => <button key={campus.id} className={focusId === campus.id ? '' : 'secondary'} onClick={() => focus(campus.id)}>{campus.name}</button>)}</div>
        </Card>
        <Card title={selectedVehicle ? '车辆详情' : selectedCampus ? '校区精模入口' : '在途与排队'}>
          {selectedVehicle ? <VehicleDetail {...props} vehicleId={selectedVehicle.id} /> : selectedCampus ? <CampusBrief {...props} campusId={selectedCampus.id} /> : <RequestBrief {...props} />}
        </Card>
        <Card title={`在途与队列（${activeRequests.length}）`}>
          <div style={{ overflow: 'auto', maxHeight: '100%' }}>{activeRequests.map((request) => <RequestCard key={request.id} request={request} {...props} />)}</div>
        </Card>
      </div>
    </div>
  );
}

function CampusBrief(props: PageProps & { campusId: string }) {
  const { state, campusId, focusCampus } = props;
  const campus = state.campuses.find((item) => item.id === campusId)!;
  return <div>
    <div className="entity-title"><span>{campus.name}</span><Badge tone="blue">{campus.geofenceVersion}</Badge></div>
    <div className="entity-meta">校长：{campus.principal}<br />库位占用：{campus.occupiedSlots}/{campus.trainingSlots}<br />围栏模板：{campus.templateVersion}</div>
    <div className="actions"><button onClick={() => focusCampus(campus.id)}>进入校区精模</button></div>
  </div>;
}

function VehicleDetail({ state, setSelectedVehicleId, vehicleId }: PageProps & { vehicleId: string }) {
  const vehicle = state.vehicles.find((item) => item.id === vehicleId)!;
  return <div>
    <div className="entity-title"><span>{vehicle.plate}</span><Badge tone={statusTone(vehicle.status)}>{vehicle.status}</Badge></div>
    <div className="entity-meta">{vehicle.brand} / {vehicle.type}<br />车属：{campusName(state, vehicle.ownerCampusId)}；当前：{campusName(state, vehicle.currentCampusId)}<br />终端：{vehicle.terminalOnline ? '在线' : '离线'}；年检：{vehicle.inspectionDue}<br />保险：{vehicle.insuranceDue}；保养：{vehicle.maintenanceDue}</div>
    <div className="actions"><button className="secondary" onClick={() => setSelectedVehicleId(null)}>返回列表</button></div>
  </div>;
}

function RequestBrief({ state }: PageProps) {
  const request = state.requests.find((item) => item.status === 'in_transit');
  if (!request) return <div className="muted small">当前没有在途车辆，可在“跨校区调车”创建申请。</div>;
  return <div><div className="entity-title"><span>{request.id}</span><Badge tone="blue">在途 {Math.round(request.progress * 100)}%</Badge></div><div className="entity-meta">{vlabel(state, request.vehicleId)}：{campusName(state, request.fromCampusId)} → {campusName(state, request.toCampusId)}</div><div className="section-gap"><Progress value={request.progress} /></div></div>;
}

function RequestCard(props: PageProps & { request: DispatchRequest }) {
  const { state, request, startRoam } = props;
  const queue = queuePosition(state, request);
  return <div className="entity-card">
    <div className="entity-title"><span className="code">{request.id}</span><Badge tone={statusTone(request.status)}>{statusText(request.status)}</Badge></div>
    <div className="entity-meta">{vlabel(state, request.vehicleId)}<br />{campusName(state, request.fromCampusId)} → {campusName(state, request.toCampusId)}{request.status === 'queued' && <><br />队列：优先级 {request.priority}，第 {queue.rank}/{queue.total} 位</>}</div>
    <Progress value={request.progress} />
    {request.alerts.length > 0 && <div className="diff">⚠ {request.alerts[0]}</div>}
    <div className="actions"><button className="secondary" disabled={request.status !== 'in_transit'} onClick={() => startRoam(request.id)}>沿路线漫游</button></div>
  </div>;
}
