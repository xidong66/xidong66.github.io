import * as THREE from './vendor/three/three.module.js';

const C = { ink: 0x3f5258, ivory: 0xd8d7c9, blue: 0x8eacb4, dark: 0x263e49, metal: 0xb0b8b4, paper: 0xebe5d4 };
const outlines = new Map();
const rad = THREE.MathUtils.degToRad;

function material(color) { return new THREE.MeshStandardMaterial({ color, roughness: .78 }); }
function outlined(geometry, color, parent, position = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material(color));
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  // Geometry objects are shared by identical keys where possible.
  const key = `${geometry.type}:${JSON.stringify(geometry.parameters)}`;
  if (!outlines.has(key)) outlines.set(key, new THREE.EdgesGeometry(geometry, 28));
  const edges = new THREE.LineSegments(outlines.get(key), new THREE.LineBasicMaterial({ color: C.ink, transparent: true, opacity: .4 }));
  mesh.add(edges);
  return mesh;
}
function box(parent, size, position, color = C.ivory) { return outlined(new THREE.BoxGeometry(...size), color, parent, position); }
function cylinder(parent, radius, height, position, color = C.metal) { return outlined(new THREE.CylinderGeometry(radius, radius, height, 24), color, parent, position); }
function rod(parent, start, end, radius = .04, color = C.ink) {
  const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
  const mesh = cylinder(parent, radius, a.distanceTo(b), a.clone().add(b).multiplyScalar(.5).toArray(), color);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  return mesh;
}
function cable(parent, points, color = C.ink) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, .023, 6, false), material(color));
  parent.add(mesh);
}
function drawing(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { canvas, ctx: canvas.getContext('2d'), texture };
}
function panel(parent, size, position, texture) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), new THREE.MeshBasicMaterial({ map: texture }));
  mesh.position.set(...position); parent.add(mesh); return mesh;
}

export function ecgValue(phase) {
  const p = ((phase % 1) + 1) % 1;
  const gaussian = (center, width, amplitude) => amplitude * Math.exp(-(((p - center) / width) ** 2));
  return gaussian(.16, .045, .12) + gaussian(.35, .016, -.14) + gaussian(.39, .014, 1)
    + gaussian(.43, .018, -.23) + gaussian(.65, .08, .25);
}

export function drawSignal(ctx, width, height, time, rate = 72, detail = false) {
  ctx.fillStyle = '#152e35'; ctx.fillRect(0, 0, width, height);
  ctx.lineWidth = 1;
  const step = detail ? 24 : 22;
  for (let x = 0; x < width; x += step) {
    ctx.strokeStyle = x % (step * 5) === 0 ? '#345454' : '#244344';
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = 0; y < height; y += step) {
    ctx.strokeStyle = y % (step * 5) === 0 ? '#345454' : '#244344';
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }
  ctx.strokeStyle = '#b9dbbd'; ctx.lineWidth = detail ? 2 : 2.6;
  ctx.shadowColor = '#91c99c'; ctx.shadowBlur = 5; ctx.beginPath();
  for (let x = 0; x <= width; x += 1.5) {
    const value = ecgValue(x / width * 4.8 + time * rate / 60);
    const y = height * .63 - value * height * .44;
    if (!x) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke(); ctx.shadowBlur = 0;
}

function earthDrawing() {
  const result = drawing(2048, 1024);
  const { ctx, canvas } = result;
  ctx.fillStyle = '#c5dcda'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#819f9b55'; ctx.lineWidth = 1.2;
  for (let lon = -180; lon <= 180; lon += 30) {
    const x = (lon + 180) / 360 * canvas.width;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = (90 - lat) / 180 * canvas.height;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }
  return result;
}

export async function loadEarth() {
  const map = earthDrawing();
  try {
    const response = await fetch(new URL('../assets/studio/countries.geojson', import.meta.url));
    if (!response.ok) throw new Error(`Map HTTP ${response.status}`);
    const data = await response.json();
    const { ctx } = map;
    ctx.fillStyle = '#779795'; ctx.strokeStyle = '#d0dfd3'; ctx.lineWidth = 1.3;
    for (const feature of data.features) {
      const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
      if (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon') continue;
      for (const polygon of polygons) {
        ctx.beginPath();
        for (const ring of polygon) {
          ring.forEach(([lon, lat], index) => {
            const x = (lon + 180) / 360 * 2048, y = (90 - lat) / 180 * 1024;
            if (!index) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          });
          ctx.closePath();
        }
        ctx.fill('evenodd'); ctx.stroke();
      }
    }
    map.texture.needsUpdate = true;
    map.available = true;
  } catch (error) {
    console.warn('Using the coordinate-grid globe because map data is unavailable.', error.message);
    map.available = false;
  }
  return map;
}

function rendererFor(canvas, shadows = false) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

export function createDesk(canvas, earth, onAction, onHover, onLost) {
  const renderer = rendererFor(canvas, true);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-7, 7, 5, -5, .1, 100);
  camera.position.set(11, 9, 13); camera.lookAt(0, 2.25, 0);
  const ambient = new THREE.HemisphereLight(0xffffff, 0x87938d, 2.4); scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xfff8e7, 3.2);
  sun.position.set(-5, 12, 7); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 });
  sun.shadow.bias = -.001; sun.shadow.normalBias = .035; scene.add(sun);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: .12 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.position.y = .03; scene.add(floor);
  const desk = new THREE.Group(); scene.add(desk);
  box(desk, [8.5, .2, 4.25], [0, 2.75, 0], 0xd3d3c2);
  box(desk, [8.48, .045, 4.23], [0, 2.866, 0], 0xe6e1d0);
  for (const x of [-3.2, 3.2]) {
    box(desk, [.28, 2.6, .32], [x, 1.35, -.3], C.metal);
    box(desk, [.42, 1.2, .46], [x, .7, -.3], 0xc6ccc5);
    box(desk, [.55, .15, 2.7], [x, .12, -.3], C.metal);
    for (const z of [-1.5, .9]) box(desk, [.55, .07, .3], [x, .035, z], C.ink);
  }
  box(desk, [6.5, .22, .24], [0, 1.9, -.3], C.metal);

  function object(action, label, position) {
    const group = new THREE.Group(); group.position.set(...position);
    group.userData = { action, label }; desk.add(group); return group;
  }
  const computer = object('projects', 'Computer / research projects', [-.75, 2.89, -1.05]);
  cylinder(computer, .5, .1, [0, .05, .02], C.metal);
  box(computer, [.45, .35, .4], [0, .23, -.15], C.ivory);
  box(computer, [2.25, 1.75, 1.05], [0, 1.15, -.15], C.blue);
  box(computer, [2.1, 1.63, .1], [0, 1.15, .42], 0xb8cac9);
  box(computer, [1.83, 1.22, .04], [0, 1.22, .486], C.dark);
  const terminal = drawing(640, 420);
  panel(computer, [1.72, 1.11], [0, 1.24, .511], terminal.texture);
  for (let i = 0; i < 6; i++) box(computer, [.028, .15, .04], [-.66 + i * .065, .53, .49], C.ink);
  cylinder(computer, .045, .035, [.81, .55, .51], C.blue).rotation.x = Math.PI / 2;
  const keyboard = object('keyboard', 'Keyboard / research terminal', [-.6, 2.89, 1.35]);
  box(keyboard, [2.1, .13, .8], [0, .09, 0], 0xb7beb8).rotation.x = .09;
  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 13; column++) {
      box(keyboard, [.122, .065, .12], [-.9 + column * .148, .19, -.27 + row * .15], column < 2 && row === 0 ? C.blue : C.paper);
    }
  }
  box(keyboard, [.77, .05, .13], [0, .2, .35], C.paper);
  cable(desk, [[.35, 2.92, 1.15], [.7, 2.94, .5], [.6, 2.94, -.6], [-.4, 2.96, -1.05]]);

  const scope = object('signal', 'Oscilloscope / synthetic ECG', [1.4, 2.89, -.6]);
  box(scope, [2.05, 1.23, 1.13], [0, .66, 0], C.ivory);
  box(scope, [2.07, 1.13, .06], [0, .66, .596], 0xc2c8b9);
  box(scope, [1.42, .91, .035], [-.22, .69, .637], C.dark);
  const trace = drawing(512, 320);
  panel(scope, [1.27, .77], [-.22, .72, .66], trace.texture);
  for (const y of [.93, .58, .28]) {
    const knob = cylinder(scope, .1, .07, [.79, y, .66], C.ink); knob.rotation.x = Math.PI / 2;
    box(scope, [.023, .074, .02], [.79, y + .02, .7], C.paper);
  }
  for (const x of [-.7, .7]) box(scope, [.2, .06, .6], [x, .025, 0], C.ink);
  rod(scope, [-.63, 1.31, 0], [-.63, 1.46, 0], .045);
  rod(scope, [.63, 1.31, 0], [.63, 1.46, 0], .045);
  rod(scope, [-.63, 1.46, 0], [.63, 1.46, 0], .05);
  cable(desk, [[2.1, 3.1, .07], [2.6, 2.94, .4], [2.5, 2.94, 1.3], [1.8, 2.96, 1.2]], 0x637f7a);

  const notebook = object('notes', 'Notebook / research questions', [-3.1, 2.92, 1.1]);
  notebook.rotation.y = -.22;
  box(notebook, [1.17, .13, 1.6], [0, .065, 0], C.blue);
  box(notebook, [1.1, .075, 1.5], [.03, .055, 0], C.paper);
  const note = drawing(320, 440);
  note.ctx.fillStyle = '#839fab'; note.ctx.fillRect(0, 0, 320, 440);
  note.ctx.fillStyle = '#f1ebdb'; note.ctx.font = '18px monospace';
  note.ctx.fillText('FIELD NOTES', 34, 70); note.ctx.fillRect(34, 92, 250, 2);
  note.ctx.font = '32px Georgia'; note.ctx.fillText('Signals.', 34, 169); note.ctx.fillText('Images.', 34, 215); note.ctx.fillText('Ideas.', 34, 261);
  note.ctx.font = '13px monospace'; note.ctx.fillText('XIDONG WU', 34, 384); note.texture.needsUpdate = true;
  panel(notebook, [1.12, 1.54], [0, .135, 0], note.texture).rotation.x = -Math.PI / 2;
  rod(notebook, [.8, .12, -.65], [.8, .12, .6], .034, C.ink);

  const littleGlobe = object('atlas', 'Globe / connected places', [-3.35, 2.89, -.5]);
  cylinder(littleGlobe, .38, .1, [0, .05, 0], C.metal);
  rod(littleGlobe, [0, .1, 0], [0, .45, 0], .055, C.ink);
  const globeMount = new THREE.Group(); globeMount.position.set(0, 1.08, 0); globeMount.rotation.z = rad(-23.4); littleGlobe.add(globeMount);
  const smallEarth = new THREE.Mesh(new THREE.SphereGeometry(.65, 48, 32), new THREE.MeshStandardMaterial({ map: earth.texture, roughness: .85 }));
  globeMount.add(smallEarth);
  const meridian = new THREE.Mesh(new THREE.TorusGeometry(.73, .025, 8, 80), material(C.ink)); globeMount.add(meridian);
  rod(globeMount, [0, -.82, 0], [0, .82, 0], .025, C.ink);

  const lamp = object('lamp', 'Lamp / switch the light', [3.2, 2.89, -1]);
  cylinder(lamp, .38, .09, [0, .05, 0], C.ink);
  rod(lamp, [0, .1, 0], [.05, 1.25, -.3], .06, C.ink);
  rod(lamp, [.05, 1.25, -.3], [-.8, 2.15, -.15], .06, C.ink);
  for (const pos of [[.05, 1.25, -.3], [-.8, 2.15, -.15]]) cylinder(lamp, .1, .16, pos, C.metal).rotation.x = Math.PI / 2;
  const shade = outlined(new THREE.ConeGeometry(.44, .5, 32, 1, true), C.blue, lamp, [-.8, 1.93, -.15]);
  shade.rotation.z = -.15;
  const bulbMaterial = new THREE.MeshBasicMaterial({ color: 0xcfcfc0 });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.15, 16, 12), bulbMaterial); bulb.position.set(-.8, 1.76, -.15); lamp.add(bulb);
  const lampLight = new THREE.PointLight(0xffcc80, 0, 5, 2); lampLight.position.copy(bulb.position); lamp.add(lampLight);

  const pcb = new THREE.Group(); pcb.position.set(1.25, 2.92, .8); pcb.rotation.y = -.12; desk.add(pcb);
  box(pcb, [1.35, .065, .85], [0, .035, 0], 0x6e9290);
  box(pcb, [.48, .1, .45], [-.12, .115, 0], C.dark);
  for (let i = 0; i < 9; i++) for (const z of [-.29, .29]) box(pcb, [.024, .02, .12], [-.32 + i * .052, .09, z], C.paper);
  for (let i = 0; i < 5; i++) box(pcb, [.1, .14, .13], [.49, .11, -.28 + i * .14], C.metal);

  const envelope = object('letter', 'Envelope / write a little letter', [2.9, 2.93, 1.3]);
  envelope.rotation.y = -.15;
  box(envelope, [1.45, .035, .93], [0, .025, 0], C.paper);
  const stationery = drawing(600, 380);
  const letterContext = stationery.ctx;
  letterContext.fillStyle = '#eee4d2'; letterContext.fillRect(0, 0, 600, 380);
  letterContext.strokeStyle = '#a58f78'; letterContext.lineWidth = 3;
  letterContext.strokeRect(10, 10, 580, 360);
  letterContext.beginPath(); letterContext.moveTo(10, 10); letterContext.lineTo(300, 245); letterContext.lineTo(590, 10); letterContext.stroke();
  letterContext.beginPath(); letterContext.moveTo(10, 370); letterContext.lineTo(207, 178); letterContext.moveTo(590, 370); letterContext.lineTo(393, 178); letterContext.stroke();
  letterContext.fillStyle = '#b96e4e'; letterContext.beginPath(); letterContext.arc(300, 238, 28, 0, Math.PI * 2); letterContext.fill();
  letterContext.fillStyle = '#f7efdf'; letterContext.font = '23px Georgia'; letterContext.fillText('xw', 284, 246);
  stationery.texture.needsUpdate = true;
  panel(envelope, [1.43, .91], [0, .044, 0], stationery.texture).rotation.x = -Math.PI / 2;

  let terminalMessage = 'click to explore';
  function updateTerminal(time) {
    const { ctx } = terminal;
    ctx.fillStyle = '#213c48'; ctx.fillRect(0, 0, 640, 420);
    ctx.fillStyle = '#a9c6bf'; ctx.font = '17px monospace'; ctx.fillText('XW / RESEARCH TERMINAL', 35, 48);
    ctx.fillStyle = '#e0e9d4'; ctx.font = '38px monospace'; ctx.fillText('Hello, world.', 35, 132);
    ctx.fillStyle = '#a9c6bf'; ctx.font = '21px monospace';
    ['> BIOSIGNALS', '> MEDICAL IMAGING', '> OPEN QUESTIONS'].forEach((text, i) => ctx.fillText(text, 35, 208 + i * 47));
    ctx.font = '15px monospace'; ctx.fillText(terminalMessage, 35, 382);
    if (Math.floor(time * 1.4) % 2 === 0) ctx.fillRect(515, 367, 12, 18);
    terminal.texture.needsUpdate = true;
  }
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const surfaces = [];
  // Decorative LineSegments have a world-space picking tolerance much wider
  // than their drawn edges. Pick only visible mesh surfaces, including the
  // noninteractive desk/board, so neither outlines nor hidden objects steal hits.
  desk.traverse(node => { if (node.isMesh) surfaces.push(node); });
  let hovered = null;
  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    scene.updateMatrixWorld(true);
    const hits = raycaster.intersectObjects(surfaces, false);
    if (!hits.length) return null;
    let object = hits[0].object;
    while (object && !object.userData.action) object = object.parent;
    return object;
  }
  canvas.addEventListener('pointermove', event => {
    hovered = pick(event); canvas.style.cursor = hovered ? 'pointer' : '';
    onHover(hovered?.userData.label, event, hovered?.userData.action);
  });
  canvas.addEventListener('pointerleave', () => { hovered = null; onHover(null); });
  let pressed = null;
  canvas.addEventListener('pointerdown', event => { pressed = [event.clientX, event.clientY, pick(event)]; });
  canvas.addEventListener('pointerup', event => {
    if (pressed && Math.hypot(event.clientX - pressed[0], event.clientY - pressed[1]) < 10 && pressed[2] === pick(event)) {
      const action = pressed[2]?.userData.action;
      if (action) onAction(action);
    }
    pressed = null;
  });
  function resize() {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    const aspect = width / height;
    const horizontalSpan = aspect < 1.2 ? 12 : 17.5;
    camera.left = -horizontalSpan / 2; camera.right = horizontalSpan / 2;
    camera.top = horizontalSpan / aspect / 2; camera.bottom = -camera.top;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }
  new ResizeObserver(resize).observe(canvas); resize();
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); onLost(); });
  return {
    render(time, rate) {
      smallEarth.rotation.y = -1.8 + time * .07;
      updateTerminal(time); drawSignal(trace.ctx, 512, 320, time, rate); trace.texture.needsUpdate = true;
      renderer.render(scene, camera);
    },
    setLamp(on) { lampLight.intensity = on ? 13 : 0; bulbMaterial.color.set(on ? 0xffe6a7 : 0xcfcfc0); },
    setTerminal(text) { terminalMessage = text.replace(/[\r\n\t]/g, ' ').slice(0, 58); },
    setTheme(dark) { ambient.intensity = dark ? 1.2 : 2.4; sun.intensity = dark ? 1.6 : 3.2; floor.material.opacity = dark ? .28 : .12; renderer.render(scene, camera); },
    restore() { resize(); },
  };
}

export function createAtlas(canvas, earth, places, onSelect, onLost) {
  const renderer = rendererFor(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 100); camera.position.z = 7.8;
  const ambient = new THREE.HemisphereLight(0xffffff, 0x697d7b, 2.5); scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffffff, 2.3); sun.position.set(-3, 4, 5); scene.add(sun);
  const world = new THREE.Group(); scene.add(world);
  world.add(new THREE.Mesh(new THREE.SphereGeometry(1.78, 80, 64), new THREE.MeshStandardMaterial({ map: earth.texture, roughness: .9 })));
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.81, 64, 48), new THREE.MeshBasicMaterial({ color: 0x86b1b7, transparent: true, opacity: .07, side: THREE.BackSide })); world.add(atmosphere);
  const pins = [];
  for (const [id, place] of Object.entries(places)) {
    const lat = rad(place.lat), lon = rad(place.lon);
    const direction = new THREE.Vector3(Math.cos(lon) * Math.cos(lat), Math.sin(lat), -Math.sin(lon) * Math.cos(lat));
    const group = new THREE.Group(); group.userData.place = id;
    const pin = new THREE.Mesh(new THREE.SphereGeometry(.037, 16, 12), new THREE.MeshBasicMaterial({ color: id === 'singapore' ? 0xb9694b : id === 'shenyang' ? 0x527986 : 0x294e69 }));
    pin.position.copy(direction).multiplyScalar(1.88); group.add(pin);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.082, .013, 8, 36), pin.material);
    ring.position.copy(direction).multiplyScalar(1.805); ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction); group.add(ring);
    rod(group, direction.clone().multiplyScalar(1.78).toArray(), direction.clone().multiplyScalar(1.88).toArray(), .012, C.ink);
    world.add(group); pins.push(group);
  }
  let zoom = 7.8, targetX = 0, targetY = 0;
  let dragging = false, moved = false, last = null;
  const pointers = new Map();
  let pinch = 0;
  function focus(id, immediate = false) {
    const place = places[id]; targetX = rad(place.lat * .65); targetY = rad(-place.lon - 90);
    // Choose the nearest equivalent rotation so city switching takes the shorter path.
    targetY = world.rotation.y + THREE.MathUtils.euclideanModulo(targetY - world.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
    if (immediate) { world.rotation.x = targetX; world.rotation.y = targetY; }
  }
  function changeZoom(delta) { zoom = THREE.MathUtils.clamp(zoom + delta, 5.5, 11); }
  canvas.addEventListener('pointerdown', event => {
    canvas.focus({ preventScroll: true }); canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, [event.clientX, event.clientY]);
    dragging = true; moved = false; last = [event.clientX, event.clientY]; pinch = 0;
  });
  canvas.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, [event.clientX, event.clientY]);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()]; const distance = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (pinch) changeZoom((pinch - distance) * .018);
      pinch = distance; moved = true; return;
    }
    const dx = event.clientX - last[0], dy = event.clientY - last[1];
    if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
    targetY += dx * .006; targetX = THREE.MathUtils.clamp(targetX + dy * .004, -1.1, 1.1);
    world.rotation.set(targetX, targetY, 0); last = [event.clientX, event.clientY];
  });
  const raycaster = new THREE.Raycaster();
  canvas.addEventListener('pointerup', event => {
    pointers.delete(event.pointerId); dragging = pointers.size > 0;
    if (dragging) last = [...pointers.values()][0];
    if (!moved) {
      const rect = canvas.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
      // Include the sphere so pins on the far hemisphere cannot be selected through it.
      const first = raycaster.intersectObjects(world.children, true).find(hit => hit.object.isMesh);
      let object = first?.object;
      while (object && !object.userData.place) object = object.parent;
      if (object?.userData.place) onSelect(object.userData.place);
    }
    pinch = 0;
  });
  canvas.addEventListener('pointercancel', event => { pointers.delete(event.pointerId); dragging = false; pinch = 0; });
  canvas.addEventListener('wheel', event => { event.preventDefault(); changeZoom(event.deltaY * .004); }, { passive: false });
  canvas.addEventListener('keydown', event => {
    const actions = { ArrowLeft: () => targetY -= .12, ArrowRight: () => targetY += .12,
      ArrowUp: () => targetX = Math.max(-1.1, targetX - .1), ArrowDown: () => targetX = Math.min(1.1, targetX + .1),
      '+': () => changeZoom(-.4), '=': () => changeZoom(-.4), '-': () => changeZoom(.4), Home: () => { focus('singapore'); zoom = 7.8; } };
    if (actions[event.key]) { event.preventDefault(); actions[event.key](); }
  });
  function resize() {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }
  new ResizeObserver(resize).observe(canvas);
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); onLost(); });
  focus('singapore', true);
  return {
    render(reduced) {
      const ease = reduced || dragging ? 1 : .12;
      world.rotation.x += (targetX - world.rotation.x) * ease;
      world.rotation.y += (targetY - world.rotation.y) * ease;
      camera.position.z += (zoom - camera.position.z) * ease;
      renderer.render(scene, camera);
    },
    focus,
    resize,
    control(action) { if (action === 'reset') { focus('singapore'); zoom = 7.8; } else changeZoom(action === 'in' ? -.5 : .5); },
    setTheme(dark) { ambient.intensity = dark ? 1.6 : 2.5; sun.intensity = dark ? 1.4 : 2.3; renderer.render(scene, camera); },
  };
}
