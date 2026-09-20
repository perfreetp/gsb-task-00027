import { useEffect, useMemo, useRef, useState } from 'react';
import { CityScene, type SceneLayers } from '../scene/CityScene';
import { useStore } from '../domain/store';
import type { Campus } from '../domain/types';
import { CampusDetail } from './CampusDetail';
import { Badge, Card } from './ui';

export function CitySandbox() {
  const store = useStore();
  const { state } = store;
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<CityScene | null>(null);
  const [layers, setLayers] = useState<SceneLayers>({ boundaries: true, vehicles: true, routes: true, fences: true });
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [detailCampus, setDetailCampus] = useState<Campus>();
  const allowed = store.visibleCampusIds();
  const allowedVehicles = store.visibleVehicleIds();

  useEffect(() => {
    if (!mountRef.current) return;
    const visibleState = { ...state, vehicles: state.vehicles.filter((vehicle) => allowedVehicles.includes(vehicle.id)) };
    const scene = new CityScene(mountRef.current, visibleState, {
      onSelectVehicle: (id) => setSelectedVehicle(id),
      onSelectCampus: (id) => setDetailCampus(state.campuses.find((campus) => campus.id === id))
    });
    sceneRef.current = scene;
    return () => scene.dispose();
  }, []);

  useEffect(() => {
    const visibleState = { ...state, vehicles: state.vehicles.filter((vehicle) => allowedVehicles.includes(vehicle.id)) };
    sceneRef.current?.renderState(visibleState, layers);
  }, [state, layers, allowedVehicles]);
  useEffect(() => { sceneRef.current?.setLayers(layers); }, [layers]);
  useEffect(() => { if (selectedVehicle) sceneRef.current?.selectVehicle(selectedVehicle); }, [selectedVehicle]);

  const selected = useMemo(() => state.vehicles.find((vehicle) => vehicle.id === selectedVehicle), [state.vehicles, selectedVehicle]);
  const activeTransfer = state.transfers.find((transfer) => transfer.status === 'in_transit');
  const visibleCampuses = state.campuses.filter((campus) => allowed.includes(campus.id));

  if (detailCampus && allowed.includes(detailCampus.id)) {
    return <CampusDetail campus={detailCampus} vehicles={state.vehicles} fences={state.fences} onClose={() => setDetailCampus(undefined)} />;
  }

  return (
    <div className="sandbox-layout">
      <div className="scene-toolbar">
        <div>
          <strong>城市级三维沙盘</strong>
          <span>{visibleCampuses.length} 个校区 · {state.vehicles.length} 台教练车 · 实时位置 / 调车路线 / 电子围栏</span>
        </div>
        {(['boundaries', 'vehicles', 'routes', 'fences'] as const).map((key) => (
          <label key={key}><input type="checkbox" checked={layers[key]} onChange={(event) => setLayers({ ...layers, [key]: event.target.checked })} />{layerName[key]}</label>
        ))}
        <button className="ghost" onClick={() => sceneRef.current?.resetView()}>全域视角</button>
      </div>
      <div className="scene-wrap">
        <div ref={mountRef} className="three-mount" />
      </div>
      <aside className="scene-side">
        <Card title="校区视角">
          <div className="campus-jump-list">
            {visibleCampuses.map((campus) => <button key={campus.id} onClick={() => setDetailCampus(campus)}>{campus.shortName}<small>{campus.name}</small></button>)}
          </div>
        </Card>
        <Card title="路线漫游">
          {activeTransfer ? (
            <>
              <p className="muted">当前在途：{activeTransfer.code}，进度 {Math.round(activeTransfer.progress * 100)}%</p>
              <div className="progress"><i style={{ width: `${activeTransfer.progress * 100}%` }} /></div>
              <button onClick={() => sceneRef.current?.startRoam(activeTransfer.id)}>沿调车路线漫游</button>
              <button className="ghost" onClick={() => sceneRef.current?.stopRoam()}>停止跟随</button>
            </>
          ) : <p className="muted">暂无在途车辆</p>}
        </Card>
        <Card title={selected ? selected.plate : '点击车辆'}>
          {selected ? (
            <div className="selected-vehicle">
              <div><Badge tone={selected.status === 'transferring' ? 'amber' : selected.status === 'training' ? 'green' : 'red'}>{statusText[selected.status]}</Badge></div>
              <dl>
                <dt>车型</dt><dd>{selected.model} / {selected.carType}</dd>
                <dt>车属校区</dt><dd>{campusName(selected.ownerCampusId)}</dd>
                <dt>当前位置</dt><dd>{campusName(selected.currentCampusId)} 或城市道路</dd>
                <dt>定位终端</dt><dd>{selected.terminalOnline ? '在线' : '离线'}</dd>
              </dl>
            </div>
          ) : <p className="muted">在沙盘中点击车辆可聚焦并查看档案摘要。</p>}
        </Card>
      </aside>
    </div>
  );

  function campusName(id: string) {
    return state.campuses.find((campus) => campus.id === id)?.shortName ?? id;
  }
}


const layerName: Record<keyof SceneLayers, string> = { boundaries: '校区边界', vehicles: '车辆位置', routes: '调车路线', fences: '电子围栏' };
const statusText: Record<string, string> = { training: '在训', idle: '闲置', transferring: '调车中', maintenance: '维修', offline: '离线' };
