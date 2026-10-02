import * as THREE from './vendor/three/three.module.js';

const rad = THREE.MathUtils.degToRad;
const directionAt = (lat, lon) => new THREE.Vector3(Math.cos(rad(lon)) * Math.cos(rad(lat)), Math.sin(rad(lat)), -Math.sin(rad(lon)) * Math.cos(rad(lat)));

export function createAtlas(canvas, earth, places, onSelect, onLost, onHover = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setClearColor(0, 0);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-4, 4, 3.25, -3.25, .1, 50);
  camera.position.set(0, 2.8, 12); camera.lookAt(0, 2.8, 0);
  const ambient = new THREE.HemisphereLight(0xffffff, 0x72806a, 2.2); scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xfffbee, 2.4); sun.position.set(-5, 9, 7); sun.castShadow = true;
  sun.shadow.mapSize.set(512, 512); Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 7, bottom: -3 }); sun.shadow.normalBias = .025; scene.add(sun);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.ShadowMaterial({ opacity: .1 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  function mesh(geometry, color, parent, position = [0, 0, 0]) {
    const result = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: .82 })); result.position.set(...position); result.castShadow = true; result.receiveShadow = true;
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 30), new THREE.LineBasicMaterial({ color: 0x56614f, transparent: true, opacity: .42 })); result.add(edge); parent.add(result); return result;
  }
  function rod(parent, a, b, radius, color = 0x6d7766) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), result = mesh(new THREE.CylinderGeometry(radius, radius, start.distanceTo(end), 12), color, parent, start.clone().add(end).multiplyScalar(.5).toArray());
    result.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize()); return result;
  }
  const stand = new THREE.Group(); scene.add(stand);
  mesh(new THREE.CylinderGeometry(1.3, 1.48, .16, 64), 0xd6d9c9, stand, [0, .09, 0]);
  mesh(new THREE.CylinderGeometry(1.21, 1.3, .12, 64), 0xbfc8b1, stand, [0, .23, 0]);
  mesh(new THREE.CylinderGeometry(.18, .34, .38, 32), 0xd9ddca, stand, [0, .46, 0]);
  const mount = new THREE.Group(); mount.position.y = 3.15; mount.rotation.z = rad(-23.4); scene.add(mount);
  const ring = mesh(new THREE.TorusGeometry(2.52, .037, 10, 100, Math.PI), 0x56634f, mount); ring.rotation.z = Math.PI / 2;
  const rail = mesh(new THREE.TorusGeometry(2.58, .012, 6, 100, Math.PI), 0xc1c8b6, mount); rail.rotation.z = Math.PI / 2;
  for (let angle = 90; angle <= 270; angle += 5) {
    const a = rad(angle); rod(mount, [Math.cos(a) * 2.54, Math.sin(a) * 2.54, .015], [Math.cos(a) * 2.62, Math.sin(a) * 2.62, .015], .006);
  }
  rod(mount, [0, -2.6, 0], [0, 2.6, 0], .035);
  for (const y of [-2.6, 2.6]) mesh(new THREE.SphereGeometry(.077, 16, 12), 0x4c5948, mount, [0, y, 0]);
  const bottom = new THREE.Vector3(0, -2.6, 0).applyQuaternion(mount.quaternion).add(mount.position);
  rod(stand, bottom.toArray(), [0, .68, 0], .065); mesh(new THREE.CylinderGeometry(.25, .25, .09, 32), 0x56634f, stand, [0, .67, 0]);
  const world = new THREE.Group(); mount.add(world);
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(2.35, 96, 64), new THREE.MeshStandardMaterial({ map: earth.texture, roughness: .92 })); sphere.castShadow = true; world.add(sphere);
  const pins = new Map(), headPositions = [];
  for (const [id, place] of Object.entries(places)) {
    const d = directionAt(place.lat, place.lon), group = new THREE.Group(); group.userData.place = id; group.name = id; world.add(group);
    // Nearby destinations get separated heads; each stem still starts at its true coordinate.
    const tangent = new THREE.Vector3().crossVectors(d, new THREE.Vector3(0, 1, 0)).normalize(), bitangent = new THREE.Vector3().crossVectors(d, tangent).normalize();
    let headPosition = d.clone().multiplyScalar(2.5);
    for (let step = 1; headPositions.some(p => p.distanceTo(headPosition) < .17) && step < 160; step++) {
      const angle = step * 2.39996, offset = .022 * Math.sqrt(step);
      headPosition = d.clone().addScaledVector(tangent, Math.cos(angle) * offset).addScaledVector(bitangent, Math.sin(angle) * offset).normalize().multiplyScalar(2.5);
    }
    headPositions.push(headPosition);
    rod(group, d.clone().multiplyScalar(2.35).toArray(), headPosition.toArray(), .009, 0x6e7868);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.034, 16, 12), new THREE.MeshStandardMaterial({ color: place.education ? 0x517984 : 0xb66150, roughness: .6 })); head.position.copy(headPosition); group.add(head);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(.075, 12, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); hit.position.copy(head.position); group.add(hit);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(.075, .011, 6, 32), new THREE.MeshBasicMaterial({ color: 0xb66150 })); halo.position.copy(d).multiplyScalar(2.362); halo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d); halo.visible = false; group.add(halo);
    pins.set(id, { group, head, halo });
  }
  let zoom = 1, targetX = 0, targetY = 0, velocity = 0, selected = 'singapore';
  let dragging = false, moved = false, last = null, start = null, pinch = 0;
  const pointers = new Map(), raycaster = new THREE.Raycaster();
  function focus(id, immediate = false) {
    if (!places[id]) return;
    selected = id; velocity = 0; targetX = rad(places[id].lat); targetY = rad(-places[id].lon - 90);
    targetY = world.rotation.y + THREE.MathUtils.euclideanModulo(targetY - world.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
    if (immediate) world.rotation.set(targetX, targetY, 0);
    pins.forEach((pin, key) => { pin.halo.visible = key === id; pin.head.scale.setScalar(key === id ? 1.3 : 1); });
  }
  function pick(event) {
    const rect = canvas.getBoundingClientRect(); scene.updateMatrixWorld(true);
    raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
    let object = raycaster.intersectObjects([mount], true).find(hit => hit.object.isMesh)?.object;
    while (object && !object.userData.place) object = object.parent;
    return object?.userData.place || null;
  }
  function changeZoom(delta) { zoom = THREE.MathUtils.clamp(zoom + delta, .75, 1.6); }
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    canvas.focus({ preventScroll: true }); canvas.setPointerCapture(event.pointerId); pointers.set(event.pointerId, [event.clientX, event.clientY]);
    dragging = true; moved = false; velocity = 0; last = [event.clientX, event.clientY]; start = last; pinch = 0; onHover(null);
  });
  canvas.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) {
      if (event.pointerType !== 'touch') { const id = pick(event); canvas.style.cursor = id ? 'pointer' : 'grab'; onHover(id, event); }
      return;
    }
    pointers.set(event.pointerId, [event.clientX, event.clientY]);
    if (pointers.size === 2) { const [a, b] = [...pointers.values()], distance = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) changeZoom((distance - pinch) * .004); pinch = distance; moved = true; return; }
    const dx = event.clientX - last[0], dy = event.clientY - last[1]; moved ||= Math.hypot(event.clientX - start[0], event.clientY - start[1]) > 6;
    velocity = dx * .006; targetY += velocity; targetX = THREE.MathUtils.clamp(targetX + dy * .004, -1.35, 1.35); world.rotation.set(targetX, targetY, 0); last = [event.clientX, event.clientY];
  });
  function release(event, cancel = false) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId); dragging = pointers.size > 0;
    if (dragging) { last = [...pointers.values()][0]; start = last; }
    if (!moved && !cancel && !dragging) { const id = pick(event); if (id) onSelect(id); }
    if (cancel) velocity = 0; pinch = 0;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  }
  canvas.addEventListener('pointerup', event => release(event)); canvas.addEventListener('pointercancel', event => release(event, true)); canvas.addEventListener('lostpointercapture', event => release(event, true));
  canvas.addEventListener('pointerleave', () => onHover(null));
  canvas.addEventListener('wheel', event => { event.preventDefault(); changeZoom(-event.deltaY * .0006); onHover(null); }, { passive: false });
  canvas.addEventListener('keydown', event => {
    const actions = { ArrowLeft: () => targetY -= .12, ArrowRight: () => targetY += .12, ArrowUp: () => targetX = Math.max(-1.35, targetX - .1), ArrowDown: () => targetX = Math.min(1.35, targetX + .1), '+': () => changeZoom(.1), '=': () => changeZoom(.1), '-': () => changeZoom(-.1), Home: () => { focus('singapore'); zoom = 1; } };
    if (actions[event.key]) { event.preventDefault(); velocity = 0; actions[event.key](); }
  });
  function resize() {
    const width = canvas.clientWidth, height = canvas.clientHeight; if (!width || !height) return;
    renderer.setSize(width, height, false); const aspect = width / height, span = Math.max(6.5, 5.9 / aspect);
    camera.top = span / 2; camera.bottom = -span / 2; camera.left = -span * aspect / 2; camera.right = span * aspect / 2; camera.updateProjectionMatrix(); renderer.render(scene, camera);
  }
  new ResizeObserver(resize).observe(canvas); canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); onLost(); }); focus(selected, true);
  return {
    render(reduced) { if (!dragging && !reduced && Math.abs(velocity) > .0001) { targetY += velocity; velocity *= .88; } else if (reduced) velocity = 0;
      const ease = reduced || dragging ? 1 : .13; world.rotation.x += (targetX - world.rotation.x) * ease; world.rotation.y += (targetY - world.rotation.y) * ease;
      camera.zoom += (zoom - camera.zoom) * ease; camera.updateProjectionMatrix(); renderer.render(scene, camera); },
    focus, resize,
    control(action) { velocity = 0; if (action === 'reset') { focus('singapore'); zoom = 1; } else changeZoom(action === 'in' ? .1 : -.1); },
    setTheme(dark) { ambient.intensity = dark ? 1.4 : 2.2; sun.intensity = dark ? 1.8 : 2.4; floor.material.opacity = dark ? .3 : .1; renderer.render(scene, camera); },
  };
}
