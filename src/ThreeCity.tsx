import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { AppState, Campus, DispatchRequest, Vehicle } from './types';
import { accessibleRequests, accessibleVehicles } from './access';

interface LayerState {
  boundaries: boolean;
  vehicles: boolean;
  routes: boolean;
  alerts: boolean;
}

interface Props {
  state: AppState;
  layers: LayerState;
  focusCampusId: string | null;
  roamRequestId: string | null;
  selectedVehicleId: string | null;
  onSelectCampus: (id: string) => void;
  onSelectVehicle: (id: string) => void;
  onRoamEnd: () => void;
}

const campusPosition = (campus: Campus) => new THREE.Vector3(campus.x, 0, campus.z);

function makeLabel(text: string, color = '#ffffff') {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 80;
  const context = canvas.getContext('2d')!;
  context.fillStyle = 'rgba(10, 18, 34, .78)';
  context.roundRect(8, 10, 304, 58, 16);
  context.fill();
  context.strokeStyle = color;
  context.lineWidth = 3;
  context.stroke();
  context.font = 'bold 28px system-ui, sans-serif';
  context.fillStyle = '#f8fafc';
  context.textAlign = 'center';
  context.fillText(text, 160, 49);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(8.8, 2.2, 1);
  return sprite;
}

export default function ThreeCity({ state, layers, focusCampusId, roamRequestId, selectedVehicleId, onSelectCampus, onSelectVehicle, onRoamEnd }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({ state, layers, focusCampusId, roamRequestId, selectedVehicleId, onSelectCampus, onSelectVehicle, onRoamEnd });
  propsRef.current = { state, layers, focusCampusId, roamRequestId, selectedVehicleId, onSelectCampus, onSelectVehicle, onRoamEnd };

  useEffect(() => {
    const mount = mountRef.current!;
    const width = mount.clientWidth;
    const height = mount.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x08111f);
    scene.fog = new THREE.Fog(0x08111f, 75, 145);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 300);
    camera.position.set(38, 42, 54);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.46;
    controls.minDistance = 8;
    controls.maxDistance = 120;
    controls.target.set(2, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(24, 42, 18);
    sun.castShadow = true;
    scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 92),
      new THREE.MeshStandardMaterial({ color: 0x111c2e, roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(120, 48, 0x2b4c7d, 0x1d304f);
    (grid.material as THREE.Material).opacity = 0.38;
    (grid.material as THREE.Material).transparent = true;
    scene.add(grid);

    const roads = [
      { x: 0, z: 0, w: 92, h: 4 }, { x: 0, z: -18, w: 88, h: 3 },
      { x: 0, z: 18, w: 88, h: 3 }, { x: -22, z: 0, w: 4, h: 70 },
      { x: 5, z: 0, w: 4, h: 70 }, { x: 27, z: 0, w: 3, h: 70 }
    ];
    roads.forEach((road) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(road.w, 0.08, road.h),
        new THREE.MeshStandardMaterial({ color: 0x263449, roughness: 0.72 })
      );
      mesh.position.set(road.x, 0.04, road.z);
      scene.add(mesh);
    });

    const city = new THREE.Group();
    scene.add(city);
    const boundaries = new THREE.Group();
    const dynamic = new THREE.Group();
    scene.add(boundaries, dynamic);

    const clickableCampus: THREE.Object3D[] = [];
    const campusMap = new Map<string, { group: THREE.Group; ring: THREE.Mesh; label: THREE.Sprite }>();

    state.campuses.forEach((campus, index) => {
      const group = new THREE.Group();
      group.position.copy(campusPosition(campus));
      group.userData = { kind: 'campus', id: campus.id };

      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(6.2, 6.7, 0.36, 48),
        new THREE.MeshStandardMaterial({ color: campus.color, roughness: 0.55, metalness: 0.05 })
      );
      pad.position.y = 0.22;
      pad.castShadow = true;
      group.add(pad);

      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 + index;
        const building = new THREE.Mesh(
          new THREE.BoxGeometry(1.5 + (i % 2) * 0.5, 1.1 + (i % 3) * 0.45, 1.8),
          new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.8 })
        );
        building.position.set(Math.cos(angle) * 3.5, building.geometry.parameters.height / 2 + 0.4, Math.sin(angle) * 3.2);
        building.castShadow = true;
        group.add(building);
      }

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(7.2, 0.08, 8, 96),
        new THREE.MeshBasicMaterial({ color: campus.color, transparent: true, opacity: 0.65 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.55;
      boundaries.add(ring);

      const label = makeLabel(campus.name, `#${campus.color.toString(16).padStart(6, '0')}`);
      label.position.set(0, 4.2, 0);
      group.add(label);
      group.add(ring.clone());
      clickableCampus.push(pad);
      city.add(group);
      campusMap.set(campus.id, { group, ring, label });
    });

    const addPoi = (x: number, z: number, text: string, color: number) => {
      const marker = new THREE.Mesh(
        new THREE.OctahedronGeometry(1.1),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.7 })
      );
      marker.position.set(x, 1.2, z);
      scene.add(marker);
      const label = makeLabel(text, '#fbbf24');
      label.position.set(x, 3.2, z);
      label.scale.set(5.2, 1.3, 1);
      scene.add(label);
    };
    addPoi(-8, -4, '加油站', 0xfacc15);
    addPoi(14, 7, '维修点', 0xfb7185);
    addPoi(31, 18, '考点', 0xef4444);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const vehicleHits = raycaster.intersectObjects(dynamic.children, true);
      const vehicle = vehicleHits.find((hit) => hit.object.userData.vehicleId || hit.object.parent?.userData.vehicleId);
      if (vehicle) {
        propsRef.current.onSelectVehicle(vehicle.object.userData.vehicleId || vehicle.object.parent?.userData.vehicleId);
        return;
      }
      const campusHits = raycaster.intersectObjects(clickableCampus, false);
      const hit = campusHits[0];
      if (hit) propsRef.current.onSelectCampus(hit.object.parent!.userData.id);
    };
    renderer.domElement.addEventListener('click', onClick);

    const routeLines: Record<string, THREE.Line> = {};
    const vehicleGroups: Record<string, THREE.Group> = {};
    const requestById = new Map<string, DispatchRequest>();
    const campusById = new Map(state.campuses.map((campus) => [campus.id, campus]));

    accessibleRequests(state).filter((request) => request.status === 'in_transit').forEach((request) => {
      const from = campusPosition(campusById.get(request.fromCampusId)!);
      const to = campusPosition(campusById.get(request.toCampusId)!);
      const mid = new THREE.Vector3((from.x + to.x) / 2 + 5, 0, (from.z + to.z) / 2 - 6);
      const curve = new THREE.CatmullRomCurve3([from, mid, to]);
      const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(80));
      const line = new THREE.Line(geometry, new THREE.LineDashedMaterial({
        color: request.alerts.length ? 0xfb7185 : 0x38bdf8,
        dashSize: 0.9,
        gapSize: 0.45,
        transparent: true,
        opacity: 0.9
      }));
      line.position.y = 0.35;
      line.computeLineDistances();
      line.userData.requestId = request.id;
      scene.add(line);
      routeLines[request.id] = line;
      requestById.set(request.id, request);
    });

    const vehicleById = new Map(state.vehicles.map((vehicle) => [vehicle.id, vehicle]));
    accessibleVehicles(state).forEach((vehicle) => {
      const group = new THREE.Group();
      group.userData = { kind: 'vehicle', vehicleId: vehicle.id };
      const active = state.requests.find((request) => request.vehicleId === vehicle.id && request.status === 'in_transit');
      const baseCampus = campusById.get(vehicle.currentCampusId);
      if (baseCampus && !active) {
        const angle = vehicle.id.charCodeAt(3) * 0.8;
        group.position.set(baseCampus.x + Math.cos(angle) * 4.4, 0.8, baseCampus.z + Math.sin(angle) * 4.2);
      }

      const color = vehicle.status === '离线' ? 0x64748b : vehicle.status === '维修' ? 0xf97316 : vehicle.status === '调车中' ? 0x38bdf8 : vehicle.terminalOnline ? 0x86efac : 0xf87171;
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 0.42, 0.68),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.18 })
      );
      body.castShadow = true;
      body.userData.vehicleId = vehicle.id;
      group.add(body);
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.28, 0.52),
        new THREE.MeshStandardMaterial({ color: 0xe0f2fe })
      );
      roof.position.y = 0.32;
      roof.userData.vehicleId = vehicle.id;
      group.add(roof);
      if (!vehicle.terminalOnline) {
        const warning = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        warning.position.y = 0.7;
        warning.userData.vehicleId = vehicle.id;
        group.add(warning);
      }
      dynamic.add(group);
      vehicleGroups[vehicle.id] = group;
    });

    let cameraTween: { start: number; from: THREE.Vector3; to: THREE.Vector3; targetFrom: THREE.Vector3; targetTo: THREE.Vector3 } | null = null;
    const focusCampus = (id: string | null) => {
      if (!id) return;
      const campus = campusById.get(id);
      if (!campus) return;
      cameraTween = {
        start: performance.now(),
        from: camera.position.clone(),
        to: new THREE.Vector3(campus.x + 13, 13, campus.z + 12),
        targetFrom: controls.target.clone(),
        targetTo: new THREE.Vector3(campus.x, 0, campus.z)
      };
    };
    focusCampus(focusCampusId);

    let roam: { requestId: string; progress: number; from: THREE.Vector3; to: THREE.Vector3 } | null = null;
    const startRoam = (requestId: string | null) => {
      if (!requestId) return;
      const request = requestById.get(requestId);
      const vehicle = vehicleById.get(request?.vehicleId ?? '');
      if (!request || !vehicle) {
        propsRef.current.onRoamEnd();
        return;
      }
      const from = campusPosition(campusById.get(request.fromCampusId)!);
      const to = campusPosition(campusById.get(request.toCampusId)!);
      roam = { requestId, progress: Math.max(0.05, request.progress - 0.25), from, to };
      controls.enabled = false;
    };
    startRoam(roamRequestId);

    let frame = 0;
    let animationFrame = 0;
    const clock = new THREE.Clock();
    const ease = (value: number) => 1 - Math.pow(1 - value, 3);

    const animate = () => {
      animationFrame = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      frame += delta;
      const currentProps = propsRef.current;
      boundaries.visible = currentProps.layers.boundaries;
      dynamic.visible = currentProps.layers.vehicles;
      Object.entries(routeLines).forEach(([id, line]) => {
        line.visible = currentProps.layers.routes;
        const hasAlert = requestById.get(id)?.alerts.length;
        if (currentProps.layers.routes && hasAlert && currentProps.layers.alerts) {
          (line.material as THREE.LineDashedMaterial).color.setHex(Math.sin(frame * 4) > 0 ? 0xfb7185 : 0xfbbf24);
        }
      });

      campusMap.forEach(({ group, ring }, id) => {
        ring.rotation.z += delta * 0.25;
        group.scale.setScalar(id === currentProps.focusCampusId ? 1.08 : 1);
      });

      Object.entries(vehicleGroups).forEach(([id, group]) => {
        const vehicle = vehicleById.get(id) as Vehicle;
        const request = state.requests.find((item) => item.vehicleId === id && item.status === 'in_transit');
        if (request) {
          const from = campusPosition(campusById.get(request.fromCampusId)!);
          const to = campusPosition(campusById.get(request.toCampusId)!);
          const mid = new THREE.Vector3((from.x + to.x) / 2 + 5, 0, (from.z + to.z) / 2 - 6);
          const curve = new THREE.CatmullRomCurve3([from, mid, to]);
          const point = curve.getPoint(Math.min(1, request.progress + Math.sin(frame * 0.45) * 0.006));
          group.position.lerp(new THREE.Vector3(point.x, 0.85, point.z), 0.12);
          group.lookAt(new THREE.Vector3(to.x, 0.85, to.z));
        } else {
          group.rotation.y += delta * 0.55;
        }
        const selected = id === currentProps.selectedVehicleId;
        group.scale.setScalar(selected ? 1.65 : 1);
        if (vehicle.alertCount > 0 && currentProps.layers.alerts) {
          group.position.y = 0.85 + Math.sin(frame * 3) * 0.08;
        }
      });

      if (cameraTween) {
        const t = Math.min(1, (performance.now() - cameraTween.start) / 750);
        camera.position.lerpVectors(cameraTween.from, cameraTween.to, ease(t));
        controls.target.lerpVectors(cameraTween.targetFrom, cameraTween.targetTo, ease(t));
        if (t === 1) cameraTween = null;
      }

      if (roam) {
        roam.progress += delta * 0.075;
        const from = roam.from;
        const to = roam.to;
        const mid = new THREE.Vector3((from.x + to.x) / 2 + 5, 0, (from.z + to.z) / 2 - 6);
        const curve = new THREE.CatmullRomCurve3([from, mid, to]);
        const p = curve.getPoint(Math.min(1, roam.progress));
        const ahead = curve.getPoint(Math.min(1, roam.progress + 0.03));
        camera.position.set(p.x - 4.5, 4.2, p.z - 4.5);
        camera.lookAt(ahead.x, 0.8, ahead.z);
        const group = vehicleGroups[requestById.get(roam.requestId)?.vehicleId ?? ''];
        group?.position.set(p.x, 0.85, p.z);
        if (roam.progress >= 1) {
          roam = null;
          controls.enabled = true;
          currentProps.onRoamEnd();
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const resize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      renderer.domElement.removeEventListener('click', onClick);
      controls.dispose();
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite) {
          object.geometry?.dispose();
          const material = object.material as THREE.Material | THREE.Material[];
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material?.dispose();
        }
      });
      mount.removeChild(renderer.domElement);
    };
  }, [state.campuses, state.requests, state.vehicles, focusCampusId, roamRequestId]);

  return <div ref={mountRef} className="three-canvas" aria-label="城市级三维沙盘" />;
}
