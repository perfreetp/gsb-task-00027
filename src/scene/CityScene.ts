import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { AppState, Campus, Fence, GeoPoint, TransferRequest, Vehicle } from '../domain/types';
import { pointAlong } from '../domain/transfers';

export interface SceneLayers {
  boundaries: boolean;
  vehicles: boolean;
  routes: boolean;
  fences: boolean;
}

interface SceneOptions {
  onSelectVehicle: (vehicleId: string) => void;
  onSelectCampus: (campusId: string) => void;
}

const statusColor: Record<Vehicle['status'], number> = {
  training: 0x22c55e,
  idle: 0x94a3b8,
  transferring: 0xf59e0b,
  maintenance: 0xef4444,
  offline: 0x64748b
};

function makeLine(points: GeoPoint[], color: number, loop = false, opacity = 1) {
  const vectors = points.map((point) => new THREE.Vector3(point.x, 0.12, point.z));
  const geometry = new THREE.BufferGeometry().setFromPoints(vectors);
  const material = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
  return loop ? new THREE.LineLoop(geometry, material) : new THREE.Line(geometry, material);
}

function createLabel(text: string, color = '#e2e8f0') {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 80;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = 'rgba(15,23,42,.82)';
    context.roundRect(8, 10, 304, 58, 14);
    context.fill();
    context.font = 'bold 30px sans-serif';
    context.fillStyle = color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 160, 40);
  }
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(28, 7, 1);
  return sprite;
}

export class CityScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private vehicleMeshes = new Map<string, THREE.Group>();
  private layerGroup = new THREE.Group();
  private boundaryGroup = new THREE.Group();
  private routeGroup = new THREE.Group();
  private fenceGroup = new THREE.Group();
  private vehicleGroup = new THREE.Group();
  private state: AppState;
  private options: SceneOptions;
  private selectedVehicleId?: string;
  private focusCampusId?: string;
  private roam?: { route: GeoPoint[]; startedAt: number; duration: number };
  private animationFrame = 0;
  private disposed = false;

  constructor(container: HTMLElement, state: AppState, options: SceneOptions) {
    this.state = state;
    this.options = options;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x08111f);
    this.scene.fog = new THREE.Fog(0x08111f, 180, 420);
    this.camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.camera.position.set(120, 150, 170);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.43;
    this.controls.minDistance = 28;
    this.controls.maxDistance = 360;
    this.controls.target.set(0, 0, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 1.1);
    const directional = new THREE.DirectionalLight(0xffffff, 2.4);
    directional.position.set(90, 140, 70);
    directional.castShadow = true;
    this.scene.add(ambient, directional);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(380, 340),
      new THREE.MeshStandardMaterial({ color: 0x102017, roughness: 0.95 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.layerGroup.add(this.boundaryGroup, this.fenceGroup, this.routeGroup, this.vehicleGroup);
    this.scene.add(this.layerGroup);
    this.renderStaticCity();
    this.renderState(state, { boundaries: true, vehicles: true, routes: true, fences: true });
    this.bindEvents(container);
    this.animate();
  }

  private bindEvents(container: HTMLElement) {
    const handler = (event: PointerEvent) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const vehicleHits = this.raycaster.intersectObjects([...this.vehicleGroup.children], true);
      const vehicle = vehicleHits.map((hit) => hit.object).map((object) => object.userData.vehicleId as string | undefined).find(Boolean);
      if (vehicle) {
        this.options.onSelectVehicle(vehicle);
        return;
      }
      const campusHits = this.raycaster.intersectObjects(this.scene.children.filter((child) => child.userData?.campusId), true);
      const campus = campusHits.map((hit) => hit.object.userData.campusId as string | undefined).find(Boolean);
      if (campus) this.options.onSelectCampus(campus);
    };
    this.renderer.domElement.addEventListener('click', handler);
    const resize = new ResizeObserver(() => {
      if (!container.clientWidth || !container.clientHeight) return;
      this.camera.aspect = container.clientWidth / container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(container.clientWidth, container.clientHeight);
    });
    resize.observe(container);
  }

  private renderStaticCity() {
    const roads = [
      [new THREE.Vector3(-170, 0.04, -126), new THREE.Vector3(170, 0.04, 12)],
      [new THREE.Vector3(-155, 0.04, 98), new THREE.Vector3(170, 0.04, -78)],
      [new THREE.Vector3(-86, 0.04, -160), new THREE.Vector3(76, 0.04, 158)],
      [new THREE.Vector3(-170, 0.03, -20), new THREE.Vector3(170, 0.03, -30)],
      [new THREE.Vector3(0, 0.03, -160), new THREE.Vector3(10, 0.03, 160)]
    ];
    roads.forEach(([a, b]) => {
      const road = new THREE.Mesh(new THREE.BoxGeometry(a.distanceTo(b), 0.08, 9), new THREE.MeshStandardMaterial({ color: 0x27364a, roughness: 0.8 }));
      road.position.copy(a).lerp(b, 0.5);
      road.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
      road.rotation.z = 0;
      road.rotation.x = 0;
      this.scene.add(road);
    });

    const fuel = this.marker(-18, -52, 0xef4444, '加油站');
    const repair = this.marker(76, 48, 0x06b6d4, '维修点');
    const station = this.marker(-145, -18, 0xf97316, '客运站');
    this.scene.add(fuel, repair, station);
  }

  private marker(x: number, z: number, color: number, label: string) {
    const group = new THREE.Group();
    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 0.5, 24), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25 }));
    cylinder.position.y = 0.3;
    const text = createLabel(label);
    text.position.set(0, 8, 0);
    group.add(cylinder, text);
    group.position.set(x, 0, z);
    return group;
  }

  private clearGroup(group: THREE.Group) {
    group.children.slice().forEach((child) => {
      group.remove(child);
      child.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
    });
  }

  private createCampus(campus: Campus) {
    const existing = this.scene.getObjectByName(`campus-${campus.id}`);
    if (existing) this.scene.remove(existing);
    const group = new THREE.Group();
    group.name = `campus-${campus.id}`;
    group.userData.campusId = campus.id;
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(48, 0.18, 30),
      new THREE.MeshStandardMaterial({ color: campus.color, transparent: true, opacity: 0.22, roughness: 0.8 })
    );
    pad.position.set(campus.position.x, 0.12, campus.position.z);
    pad.userData.campusId = campus.id;
    const label = createLabel(`${campus.shortName}${campus.examCenter ? '·考点' : ''}`, '#ffffff');
    label.position.set(campus.position.x, 13, campus.position.z - 2);
    group.add(pad, label);
    this.scene.add(group);
  }

  private createFence(fence: Fence) {
    const colors = { 'no-entry': 0xef4444, 'speed-limit': 0xf59e0b, 'training-area': 0x22d3ee };
    const group = new THREE.Group();
    const line = makeLine(fence.polygon, colors[fence.kind], true, 0.9);
    const center = fence.polygon.reduce((sum, point) => ({ x: sum.x + point.x / fence.polygon.length, z: sum.z + point.z / fence.polygon.length }), { x: 0, z: 0 });
    const text = createLabel(fence.limitKmh ? `${fence.name} ${fence.limitKmh}km/h` : fence.name, fence.kind === 'no-entry' ? '#fecaca' : '#fde68a');
    text.position.set(center.x, 10, center.z);
    text.scale.multiplyScalar(0.72);
    group.add(line, text);
    return group;
  }

  private createVehicle(vehicle: Vehicle) {
    const group = new THREE.Group();
    group.userData.vehicleId = vehicle.id;
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: statusColor[vehicle.status], roughness: 0.45, metalness: 0.1 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.1, 1.8), bodyMaterial);
    body.position.y = 0.8;
    body.userData.vehicleId = vehicle.id;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.8, 1.55), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2 }));
    cabin.position.set(-0.2, 1.65, 0);
    cabin.userData.vehicleId = vehicle.id;
    const halo = new THREE.Mesh(new THREE.RingGeometry(2.4, 2.8, 32), new THREE.MeshBasicMaterial({ color: statusColor[vehicle.status], side: THREE.DoubleSide, transparent: true, opacity: 0.42 }));
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.08;
    halo.userData.vehicleId = vehicle.id;
    const plate = createLabel(vehicle.plate, vehicle.terminalOnline ? '#bbf7d0' : '#fecaca');
    plate.position.set(0, 6.2, 0);
    plate.scale.set(11, 2.7, 1);
    group.add(body, cabin, halo, plate);
    group.position.set(vehicle.position.x, 0, vehicle.position.z);
    group.rotation.y = vehicle.heading;
    if (this.selectedVehicleId === vehicle.id) {
      const selected = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.12, 8, 48), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      selected.rotation.x = Math.PI / 2;
      selected.position.y = 0.16;
      group.add(selected);
    }
    return group;
  }

  private createRoute(transfer: TransferRequest) {
    const group = new THREE.Group();
    const line = makeLine(transfer.route, transfer.status === 'in_transit' ? 0xf59e0b : 0x38bdf8, false, 0.85);
    group.add(line);
    const completed: GeoPoint[] = [];
    for (let i = 0; i <= 20; i += 1) completed.push(pointAlong(transfer.route, (transfer.progress * i) / 20));
    if (completed.length > 1) group.add(makeLine(completed, 0xfbbf24, false, 1));
    const startLabel = createLabel(`${transfer.code} ${Math.round(transfer.progress * 100)}%`, '#fef3c7');
    const start = transfer.route[0];
    startLabel.position.set(start.x, 12, start.z);
    startLabel.scale.multiplyScalar(0.75);
    group.add(startLabel);
    return group;
  }

  renderState(state: AppState, layers: SceneLayers) {
    this.state = state;
    state.campuses.forEach((campus) => this.createCampus(campus));
    this.clearGroup(this.boundaryGroup);
    this.clearGroup(this.fenceGroup);
    this.clearGroup(this.routeGroup);
    this.clearGroup(this.vehicleGroup);
    this.vehicleMeshes.clear();

    state.campuses.forEach((campus) => this.boundaryGroup.add(makeLine(campus.boundary, campus.color, true, 0.95)));
    state.fences.filter((fence) => fence.enabled).forEach((fence) => this.fenceGroup.add(this.createFence(fence)));
    state.transfers.filter((transfer) => !['withdrawn', 'rejected', 'cancelled', 'timeout_closed', 'received'].includes(transfer.status)).forEach((transfer) => this.routeGroup.add(this.createRoute(transfer)));
    state.vehicles.forEach((vehicle) => {
      const mesh = this.createVehicle(vehicle);
      this.vehicleMeshes.set(vehicle.id, mesh);
      this.vehicleGroup.add(mesh);
    });
    this.setLayers(layers);
  }

  setLayers(layers: SceneLayers) {
    this.boundaryGroup.visible = layers.boundaries;
    this.vehicleGroup.visible = layers.vehicles;
    this.routeGroup.visible = layers.routes;
    this.fenceGroup.visible = layers.fences;
  }

  selectVehicle(vehicleId: string) {
    this.selectedVehicleId = vehicleId;
    const vehicle = this.state.vehicles.find((item) => item.id === vehicleId);
    if (vehicle) this.focusPoint(vehicle.position.x, vehicle.position.z, 38);
    this.renderState(this.state, {
      boundaries: this.boundaryGroup.visible,
      vehicles: this.vehicleGroup.visible,
      routes: this.routeGroup.visible,
      fences: this.fenceGroup.visible
    });
  }

  focusCampus(campusId: string) {
    this.focusCampusId = campusId;
    const campus = this.state.campuses.find((item) => item.id === campusId);
    if (campus) this.focusPoint(campus.position.x, campus.position.z, 58);
  }

  setCampusDetail(campusId: string | undefined) {
    this.focusCampusId = campusId;
  }

  private focusPoint(x: number, z: number, distance: number) {
    this.controls.target.set(x, 0, z);
    this.camera.position.set(x + distance * 0.65, distance * 0.85, z + distance * 0.75);
    this.controls.update();
  }

  resetView() {
    this.focusCampusId = undefined;
    this.roam = undefined;
    this.controls.target.set(0, 0, 0);
    this.camera.position.set(120, 150, 170);
    this.controls.update();
  }

  startRoam(transferId: string) {
    const transfer = this.state.transfers.find((item) => item.id === transferId);
    if (!transfer) return;
    this.roam = { route: transfer.route, startedAt: performance.now(), duration: 12000 };
  }

  stopRoam() {
    this.roam = undefined;
  }

  private updateVehicles(elapsed: number) {
    this.state.transfers.filter((transfer) => transfer.status === 'in_transit').forEach((transfer) => {
      const mesh = this.vehicleMeshes.get(transfer.vehicleId);
      if (!mesh) return;
      const next = pointAlong(transfer.route, Math.min(1, transfer.progress + elapsed / 220));
      mesh.position.set(next.x, 0, next.z);
      mesh.rotation.y = Math.atan2(next.z - mesh.position.z, next.x - mesh.position.x);
    });
  }

  private animate = () => {
    if (this.disposed) return;
    this.animationFrame = requestAnimationFrame(this.animate);
    const elapsed = 1 / 60;
    this.updateVehicles(elapsed);
    if (this.roam) {
      const progress = Math.min(1, (performance.now() - this.roam.startedAt) / this.roam.duration);
      const point = pointAlong(this.roam.route, progress);
      const lookIndex = Math.min(this.roam.route.length - 1, Math.floor(progress * this.roam.route.length) + 1);
      const look = this.roam.route[lookIndex];
      this.camera.position.set(point.x - 12, 9, point.z - 14);
      this.camera.lookAt(look.x, 0, look.z);
      if (progress >= 1) this.roam = undefined;
    } else {
      this.controls.update();
    }
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.animationFrame);
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
