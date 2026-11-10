'use strict';
const $ = selector => document.querySelector(selector);
const targets = [...document.querySelectorAll('.target')];
const startButton = $('#start');
const mouseButton = $('#mouse');
const ink = $('#ink');
const board = $('#board');
const status = $('#status');
const gazeCursor = $('#gaze-cursor');
const calibration = $('#calibration');
const guide = $('#guide');
const linePreview = $('#line-preview');
const lineStartMarker = $('#line-start');
const lineSnapMarker = $('#line-snap');
const points = [[25, 25], [75, 25], [25, 75], [75, 75]];
const calibrationPoints = [12, 50, 88].flatMap(y => [12, 50, 88].map(x => [x, y]));
const faceMeshAssets = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619';
const storageKey = 'bn5213-gaze-studio-v1';
const maxSampleGapMs = 250;
const lineSampleWindowMs = 200;
const lineDriftGraceMs = 120;
const colors = [...document.querySelectorAll('[data-color]')];
let path = [];
let history = [];
let future = [];
let mode = 'idle';
let paused = false;
let gaze;
let startingTracker;
let startupPending = false;
let startupGeneration = 0;
let hasCalibration = false;
let activeTarget = -1;
let dwellStarted = 0;
let lastSample = 0;
let confirmed = false;
let pointer = null;
let color = '#287263';
let width = 5;
let dwellMs = 800;
let lineDwellMs = 600;
let tool = 'points';
const lineSamples = [];
let lineStart = null;
let lineLock = null;
let lineAnchor = null;
let calibrationBounds;
let calibrationIndex = 0;
let calibrationClicks = 0;
let mouseFrameId;
let webGazerPromise;

function say(message) { status.textContent = message; }
function isDrawing() { return (mode === 'mouse' || mode === 'gaze') && !paused && !guide.open && calibration.hidden && !document.hidden; }
function showProgress(progress) {
  targets.forEach((target, index) => {
    target.classList.toggle('active', index === activeTarget);
    target.style.setProperty('--progress', index === activeTarget ? progress : 0);
  });
}
function resetDwell() {
  activeTarget = -1;
  confirmed = false;
  lastSample = 0;
  gazeCursor.hidden = true;
  showProgress(0);
  resetLineTracking();
}
function updateUI() {
  const active = mode === 'mouse' || mode === 'gaze';
  const cameraOn = Boolean(gaze);
  startButton.disabled = startupPending || mode === 'calibration';
  mouseButton.disabled = mode === 'mouse' || startupPending;
  $('#start-label').textContent = startupPending ? 'Connecting camera…' : cameraOn ? 'Recalibrate eye tracking' : 'Enable eye tracking';
  $('#stop').hidden = !cameraOn && !startupPending;
  $('#stop').textContent = startupPending ? 'Cancel camera setup' : 'Stop eye tracking & turn camera off';
  $('#camera-state').textContent = cameraOn ? 'Camera is on' : startupPending ? 'Connecting…' : 'Camera is off';
  $('#camera-led').classList.toggle('live', cameraOn);
  $('#camera-title').textContent = cameraOn ? 'Connected to your perspective' : mode === 'mouse' ? 'Explore at your own pace' : 'A new point of view';
  $('#camera-description').textContent = cameraOn ? 'Keep your head still and your eyes on the screen.' : mode === 'mouse' ? 'No camera needed. Hover on the canvas to draw.' : 'Your webcam is all you need. No special equipment required.';
  $('#setup-badge').textContent = startupPending ? 'CONNECTING' : mode === 'calibration' ? 'CALIBRATING' : active ? 'YOUR SPACE' : 'LET’S BEGIN';
  const pill = $('#mode-label');
  pill.replaceChildren(document.createElement('span'), document.createTextNode(startupPending ? 'Connecting camera' : paused && active ? 'Drawing paused' : mode === 'gaze' ? 'Eye tracking' : mode === 'mouse' ? 'Mouse mode' : mode === 'calibration' ? 'Calibrating' : 'Ready when you are'));
  pill.classList.toggle('live', active && !paused);
  $('#status-dot').classList.toggle('live', active && !paused);
  $('#pause').disabled = !active || (mode === 'gaze' && !hasCalibration);
  $('#pause').textContent = paused ? 'Resume' : 'Pause';
  $('#step-camera').classList.toggle('done', cameraOn);
  $('#step-camera').classList.toggle('current', startupPending);
  $('#step-calibrate').classList.toggle('done', cameraOn && hasCalibration);
  $('#step-calibrate').classList.toggle('current', mode === 'calibration');
  $('#step-create').classList.toggle('current', active);
}
function persist() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ version: 1, path, title: $('#drawing-title').value, color, width, dwellMs, lineDwellMs, grid: board.classList.contains('show-grid') }));
    $('#save-state').textContent = 'Saved in this browser';
  } catch {
    $('#save-state').textContent = 'Browser storage unavailable · export to keep';
  }
}
// Keep the existing four-point draft format. Both kinds of strokes share rendering and export.
function* drawingStrokes() {
  let previous;
  for (const entry of path) {
    if (entry.from) {
      yield entry;
    } else {
      const to = points[entry.point];
      yield {from: previous, to, color: entry.color, width: entry.width};
      previous = to;
    }
  }
}

function lastFixedPoint() {
  return path.findLast(entry => Number.isInteger(entry.point))?.point;
}

function renderPath(save = true) {
  const fragment = document.createDocumentFragment();
  for (const entry of drawingStrokes()) {
    const [x, y] = entry.to;
    const element = document.createElementNS('http://www.w3.org/2000/svg', entry.from ? 'line' : 'circle');
    if (entry.from) {
      for (const [attribute, value] of Object.entries({ x1: entry.from[0], y1: entry.from[1], x2: x, y2: y, stroke: entry.color, 'stroke-width': entry.width })) element.setAttribute(attribute, value);
    } else {
      for (const [attribute, value] of Object.entries({ cx: x, cy: y, r: .6, fill: entry.color })) element.setAttribute(attribute, value);
    }
    fragment.append(element);
  }
  ink.replaceChildren(fragment);
  const lastPoint = lastFixedPoint();
  targets.forEach((target, index) => target.classList.toggle('last', index === lastPoint));
  $('#canvas-empty').hidden = path.length > 0;
  const lineCount = path.filter(entry => entry.from).length;
  const pointCount = path.length - lineCount;
  $('#point-count').textContent = tool === 'line' || lineCount
    ? `${lineCount} line${lineCount === 1 ? '' : 's'} · ${pointCount} fixed points`
    : `${pointCount} point${pointCount === 1 ? '' : 's'} connected`;
  $('#undo').disabled = history.length === 0 && !lineStart;
  $('#redo').disabled = future.length === 0;
  $('#clear').disabled = $('#export').disabled = path.length === 0;
  if (save) persist();
}
function remember() {
  history.push(path.slice());
  if (history.length > 100) history.shift();
  future = [];
}
function selectPoint(index) {
  if (!isDrawing() || tool !== 'points' || lastFixedPoint() === index) return;
  if (path.length >= 2500) { say('This canvas is full. Export your drawing, then clear it to begin again.'); return; }
  remember();
  path.push({ point: index, color, width });
  renderPath();
  say(`Point ${index + 1} connected. Move to another point.`);
}

function showCursor(point) {
  gazeCursor.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%)`;
  gazeCursor.hidden = false;
}

function showMarker(marker, point) {
  marker.hidden = !point;
  if (point) {
    marker.style.left = `${point[0]}%`;
    marker.style.top = `${point[1]}%`;
  }
}

function resetLineTracking() {
  lineSamples.length = 0;
  lineAnchor = null;
  linePreview.setAttribute('visibility', 'hidden');
  lineSnapMarker.hidden = true;
  gazeCursor.style.setProperty('--line-progress', 0);
}

function clearPendingLine() {
  lineStart = lineLock = null;
  showMarker(lineStartMarker, null);
  resetLineTracking();
}

function medianCoordinate(key) {
  const values = lineSamples.map(sample => sample[key]).sort((a, b) => a - b);
  const middle = Math.floor(values.length / 2);
  return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
}

function lineDwellProgress(x, y, now, radius) {
  if (!lineAnchor) lineAnchor = {x, y, lastTime: now, elapsed: 0, outsideSince: null};
  const outside = Math.hypot(x - lineAnchor.x, y - lineAnchor.y) > radius;
  if (outside) lineAnchor.outsideSince ??= now;
  if (lineAnchor.outsideSince !== null && now - lineAnchor.outsideSince >= lineDriftGraceMs) {
    lineAnchor = {x, y, lastTime: now, elapsed: 0, outsideSince: null};
  } else {
    if (lineAnchor.outsideSince === null) lineAnchor.elapsed += now - lineAnchor.lastTime;
    if (!outside) lineAnchor.outsideSince = null;
    lineAnchor.lastTime = now;
  }
  return Math.min(1, lineAnchor.elapsed / lineDwellMs);
}

function findSnapPoint(distanceFrom, radius) {
  if (!$('#snap-endpoints').checked) return null;
  let closest = null;
  for (const stroke of drawingStrokes()) {
    for (const point of [stroke.from, stroke.to]) {
      if (!point || (lineStart && point[0] === lineStart[0] && point[1] === lineStart[1])) continue;
      const candidate = distanceFrom(point);
      if (candidate < radius) { closest = point; radius = candidate; }
    }
  }
  return closest;
}

function updateLine(point, now) {
  const {left, top, right, bottom, width: w, height: h} = ink.getBoundingClientRect();
  if (!w || !h || point.x < left || point.x >= right || point.y < top || point.y >= bottom) {
    showCursor(point);
    resetLineTracking();
    return;
  }
  lineSamples.push({...point, time: now});
  while (lineSamples[0].time < now - lineSampleWindowMs) lineSamples.shift();
  const x = medianCoordinate('x');
  const y = medianCoordinate('y');
  showCursor({x, y});
  const aim = [(x - left) / w * 100, (y - top) / h * 100];
  const radius = mode === 'mouse' ? 10 : Math.max(24, Math.min(48, Math.min(w, h) * 0.1));
  const distance = (a, b) => Math.hypot((a[0] - b[0]) * w / 100, (a[1] - b[1]) * h / 100);
  const snap = findSnapPoint(point => distance(aim, point), mode === 'mouse' ? 16 : radius * 1.2);
  const end = snap ?? aim;
  showMarker(lineSnapMarker, snap);
  if (lineStart) {
    for (const [key, value] of Object.entries({x1: lineStart[0], y1: lineStart[1], x2: end[0], y2: end[1], visibility: 'visible'})) linePreview.setAttribute(key, value);
  }
  if (lineLock && distance(aim, lineLock) <= radius) return;
  lineLock = null;
  const progress = lineDwellProgress(x, y, now, radius);
  gazeCursor.style.setProperty('--line-progress', progress);
  if (progress < 1) return;
  lineLock = aim;
  lineAnchor = null;
  gazeCursor.style.setProperty('--line-progress', 0);
  if (!lineStart) {
    lineStart = end;
    showMarker(lineStartMarker, lineStart);
    $('#undo').disabled = false;
    say('Start set. Move to the end point, then hold to draw the line.');
  } else if (distance(lineStart, end) >= 3) {
    if (path.length >= 2500) { say('This canvas is full. Export your drawing, then clear it to begin again.'); return; }
    remember();
    path.push({from: lineStart, to: end, color, width});
    lineStart = null;
    showMarker(lineStartMarker, null);
    linePreview.setAttribute('visibility', 'hidden');
    renderPath();
    say('Line drawn. Move to a new spot to start another.');
  }
}

function updateDwell(point, now) {
  if (!isDrawing() || !point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
  if (tool === 'line') {
    if (now - lastSample > maxSampleGapMs) resetLineTracking();
    lastSample = now;
    updateLine(point, now);
    return;
  }
  showCursor(point);
  const nextTarget = targets.findIndex(target => {
    const rect = target.getBoundingClientRect();
    return point.x >= rect.left && point.x < rect.right && point.y >= rect.top && point.y < rect.bottom;
  });
  if (nextTarget !== activeTarget || now - lastSample > maxSampleGapMs) {
    activeTarget = nextTarget;
    dwellStarted = now;
    confirmed = false;
  }
  lastSample = now;
  if (activeTarget < 0) { showProgress(0); return; }
  const progress = Math.min(1, (now - dwellStarted) / dwellMs);
  showProgress(progress);
  if (progress < 1 || confirmed) return;
  confirmed = true;
  selectPoint(activeTarget);
}
function releaseTracker(tracker) {
  if (!tracker) return;
  // WebGazer.end() does not stop media tracks in every release.
  const video = document.getElementById(tracker.params?.videoElementId || 'webgazerVideoFeed');
  video?.srcObject?.getTracks().forEach(track => track.stop());
  for (const method of ['pause', 'removeMouseEventListeners', 'stopVideo', 'end']) {
    try { tracker[method]?.(); } catch { /* Partial startup may not have created the stream yet. */ }
  }
  for (const id of [tracker.params?.videoContainerId, tracker.params?.gazeDotId]) if (id) document.getElementById(id)?.remove();
}
function stopCamera(message = 'Camera turned off. Your drawing is still here.') {
  startupGeneration++;
  releaseTracker(gaze || startingTracker);
  gaze = undefined;
  hasCalibration = false;
  calibration.hidden = true;
  mode = 'idle';
  paused = false;
  clearPendingLine();
  resetDwell();
  renderPath(false);
  updateUI();
  say(message);
}
function loadWebGazer() {
  if (window.webgazer) return Promise.resolve(window.webgazer);
  if (webGazerPromise) return webGazerPromise;
  webGazerPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    let finished = false;
    const finish = error => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      if (error) { script.remove(); reject(error); }
      else resolve(window.webgazer);
    };
    const timeout = setTimeout(() => finish(new Error('Loading took too long. Check your connection or try mouse mode.')), 30000);
    script.src = 'https://webgazer.cs.brown.edu/webgazer.js';
    script.onload = () => finish(window.webgazer ? null : new Error('The eye-tracking library did not initialize.'));
    script.onerror = () => finish(new Error('Could not load WebGazer. Check your connection or try mouse mode.'));
    document.head.append(script);
  }).catch(error => { webGazerPromise = undefined; throw error; });
  return webGazerPromise;
}
function showCalibrationDot() {
  const [x, y] = calibrationPoints[calibrationIndex];
  $('#calibration-dot').style.left = `${calibrationBounds.left + calibrationBounds.width * x / 100}px`;
  $('#calibration-dot').style.top = `${calibrationBounds.top + calibrationBounds.height * y / 100}px`;
  $('#calibration-count').textContent = `Point ${calibrationIndex + 1} of 9 · ${calibrationClicks} of 5 clicks`;
  $('#calibration-progress').value = calibrationIndex * 5 + calibrationClicks;
}
async function calibrate(generation) {
  mode = 'calibration';
  paused = false;
  hasCalibration = false;
  clearPendingLine();
  resetDwell();
  renderPath(false);
  await gaze.clearData();
  if (generation !== startupGeneration) return;
  calibrationIndex = calibrationClicks = 0;
  calibrationBounds = {left: 0, top: 0, width: window.innerWidth, height: window.innerHeight};
  if (tool === 'line') {
    board.scrollIntoView({block: 'center', behavior: 'instant'});
    const bounds = ink.getBoundingClientRect();
    const left = Math.max(0, bounds.left);
    const top = Math.max(0, bounds.top);
    const width = Math.min(window.innerWidth, bounds.right) - left;
    const height = Math.min(window.innerHeight, bounds.bottom) - top;
    if (width > 80 && height > 80) calibrationBounds = {left, top, width, height};
    for (const [key, value] of Object.entries(calibrationBounds)) $('#calibration-board').style[key] = `${value}px`;
  }
  calibration.classList.toggle('board-calibration', tool === 'line');
  $('#calibration-board').hidden = tool !== 'line';
  showCalibrationDot();
  calibration.hidden = false;
  updateUI();
  say('Look directly at each calibration dot and click it five times.');
  $('#calibration-dot').focus({ preventScroll: true });
}
startButton.addEventListener('click', async () => {
  if (startupPending) return;
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    say('Eye tracking needs HTTPS or localhost and a browser with camera support. You can still try mouse mode.');
    return;
  }
  const generation = ++startupGeneration;
  startupPending = true;
  mode = 'loading';
  paused = false;
  resetDwell();
  updateUI();
  say('Loading eye tracking. Allow camera access when your browser asks.');
  try {
    if (!gaze) {
      const tracker = await loadWebGazer();
      if (generation !== startupGeneration) return;
      startingTracker = tracker;
      tracker.params.faceMeshSolutionPath = faceMeshAssets;
      tracker.saveDataAcrossSessions(false).showVideoPreview(false).showPredictionPoints(false);
      tracker.setGazeListener(point => { if (mode === 'gaze') updateDwell(point, performance.now()); });
      await tracker.begin();
      if (generation !== startupGeneration) { releaseTracker(tracker); return; }
      tracker.removeMouseEventListeners();
      gaze = tracker;
    }
    await calibrate(generation);
  } catch (error) {
    if (generation !== startupGeneration) return;
    stopCamera(error.name === 'NotAllowedError' ? 'Camera access was blocked. Allow it in your browser settings, or try mouse mode.' : error.name === 'NotFoundError' ? 'No camera was found. Connect a webcam, or try mouse mode.' : `Could not start eye tracking. ${error.message || 'Please try again.'}`);
  } finally {
    startingTracker = undefined;
    startupPending = false;
    updateUI();
  }
});
$('#calibration-dot').addEventListener('click', () => {
  if (mode !== 'calibration' || !gaze) return;
  if (!gaze.getTracker().getPositions()?.length) {
    $('#calibration-count').textContent = 'Waiting for your face. Look towards the screen and try again.';
    return;
  }
  const dot = $('#calibration-dot').getBoundingClientRect();
  gaze.recordScreenPosition(dot.left + dot.width / 2, dot.top + dot.height / 2, 'click');
  calibrationClicks++;
  if (calibrationClicks === 5) { calibrationClicks = 0; calibrationIndex++; }
  if (calibrationIndex === calibrationPoints.length) {
    $('#calibration-progress').value = 45;
    calibration.hidden = true;
    hasCalibration = true;
    mode = 'gaze';
    resetDwell();
    if (tool === 'line') {
      const bounds = ink.getBoundingClientRect();
      lineLock = [(dot.left + dot.width / 2 - bounds.left) / bounds.width * 100,
        (dot.top + dot.height / 2 - bounds.top) / bounds.height * 100];
    }
    updateUI();
    say(tool === 'line' ? 'Hold the purple ring on a spot to set the start, then hold on the end.' : 'Follow the purple gaze ring. Hold it inside a numbered area to connect.');
    board.focus({ preventScroll: true });
  } else showCalibrationDot();
});
$('#cancel-calibration').addEventListener('click', () => { stopCamera('Calibration cancelled and camera turned off. Try mouse mode whenever you like.'); startButton.focus(); });
$('#stop').addEventListener('click', () => stopCamera());
mouseButton.addEventListener('click', () => {
  stopCamera(tool === 'line' ? 'Mouse mode is ready. Hover to set the start and end of a line.' : 'Mouse mode is ready. Hover over a point, tap it, or press 1–4.');
  mode = 'mouse';
  paused = false;
  pointer = null;
  cancelAnimationFrame(mouseFrameId);
  updateUI();
  function mouseFrame(now) {
    if (mode !== 'mouse') return;
    updateDwell(pointer, now);
    mouseFrameId = requestAnimationFrame(mouseFrame);
  }
  mouseFrameId = requestAnimationFrame(mouseFrame);
});
document.addEventListener('pointermove', event => { if (event.pointerType !== 'touch') pointer = { x: event.clientX, y: event.clientY }; });
document.documentElement.addEventListener('pointerleave', () => { pointer = null; if (mode === 'mouse') resetDwell(); });
board.addEventListener('pointerup', event => {
  if (mode !== 'mouse' || event.pointerType !== 'touch') return;
  const target = event.target.closest('.target');
  if (target) selectPoint(Number(target.dataset.point));
});
setInterval(() => {
  if (mode === 'gaze' && !gazeCursor.hidden && performance.now() - lastSample > maxSampleGapMs) resetDwell();
}, maxSampleGapMs);
$('#pause').addEventListener('click', () => {
  if ($('#pause').disabled) return;
  paused = !paused;
  pointer = null;
  resetDwell();
  updateUI();
  say(paused ? `Drawing paused.${gaze ? ' Camera remains on; use the stop button to turn it off.' : ' Take your time.'}` : tool === 'line' ? 'Ready to draw. Hold on a spot to select it.' : 'Ready to connect. Choose your next point.');
});
$('#undo').addEventListener('click', () => {
  if (lineStart) {
    clearPendingLine();
    renderPath(false);
    say('Start point cancelled.');
    return;
  }
  if (!history.length) return;
  future.push(path.slice());
  path = history.pop();
  resetDwell();
  renderPath();
  say('Last change undone.');
});
$('#redo').addEventListener('click', () => {
  if (!future.length) return;
  history.push(path.slice());
  path = future.pop();
  clearPendingLine();
  resetDwell();
  renderPath();
  say('Change restored.');
});
$('#clear').addEventListener('click', () => {
  if (!path.length) return;
  remember();
  path = [];
  clearPendingLine();
  resetDwell();
  renderPath();
  say('A fresh canvas. You can undo to bring your drawing back.');
});
function setColor(value) {
  const selected = colors.find(button => button.dataset.color === value);
  if (!selected) return;
  color = value;
  document.documentElement.style.setProperty('--ink', color);
  $('#color-name').textContent = selected.dataset.name;
  colors.forEach(button => { const active = button === selected; button.classList.toggle('selected', active); button.setAttribute('aria-pressed', active); });
}
colors.forEach(button => button.addEventListener('click', () => { setColor(button.dataset.color); persist(); }));
$('#stroke-width').addEventListener('change', event => { width = Number(event.target.value); persist(); });
$('#dwell-time').addEventListener('change', event => {
  const duration = Number(event.target.value);
  if (tool === 'line') lineDwellMs = duration;
  else dwellMs = duration;
  resetDwell(); persist();
  say(`Hold for ${(duration / 1000).toFixed(1)} seconds to select a point.`);
});

function selectTool(next) {
  if (tool === next || mode === 'calibration' || startupPending) return;
  tool = next;
  const lineMode = tool === 'line';
  board.classList.toggle('line-mode', lineMode);
  board.setAttribute('aria-label', lineMode ? 'Straight line drawing board. Hold on the start, then hold on the end.' : 'Four-point drawing board. Hover over a numbered area or press 1 to 4 in mouse mode.');
  $('#board-label').textContent = lineMode ? 'LINE CANVAS' : 'FOUR-POINT CANVAS';
  $('#point-tool').setAttribute('aria-pressed', !lineMode);
  $('#line-tool').setAttribute('aria-pressed', lineMode);
  $('#snap-option').hidden = !lineMode;
  $('#dwell-time').value = lineMode ? lineDwellMs : dwellMs;
  clearPendingLine();
  resetDwell();
  pointer = null;
  renderPath(false);
  if (mode === 'gaze') {
    paused = true;
    hasCalibration = false;
    updateUI();
    say('Tool changed. Recalibrate eye tracking to continue.');
  } else if (lineMode) {
    say('Hold on a spot to start, then move to preview the line. Hold again to finish.');
  } else {
    say('Hold inside a numbered area to connect to it.');
  }
}

$('#point-tool').addEventListener('click', () => selectTool('points'));
$('#line-tool').addEventListener('click', () => selectTool('line'));
$('#snap-endpoints').addEventListener('change', resetLineTracking);
$('#drawing-title').addEventListener('input', persist);
$('#drawing-title').addEventListener('change', () => { $('#drawing-title').value = $('#drawing-title').value.trim() || 'Untitled exploration'; persist(); });
$('#grid').addEventListener('click', () => { const visible = board.classList.toggle('show-grid'); $('#grid').setAttribute('aria-pressed', visible); persist(); });
function setFocus(enabled) {
  document.body.classList.toggle('focus-mode', enabled);
  $('#focus').setAttribute('aria-pressed', enabled);
  $('#focus').setAttribute('aria-label', enabled ? 'Exit focus mode' : 'Enter focus mode');
  resetDwell();
  pointer = null;
}
$('#focus').addEventListener('click', () => setFocus(!document.body.classList.contains('focus-mode')));
for (const button of document.querySelectorAll('[data-help]')) button.addEventListener('click', () => { resetDwell(); pointer = null; guide.showModal(); });
for (const id of ['#close-guide', '#guide-done']) $(id).addEventListener('click', () => guide.close());
guide.addEventListener('close', () => { pointer = null; resetDwell(); });
$('#export').addEventListener('click', async () => {
  if (!path.length) return;
  const button = $('#export');
  button.disabled = true;
  try {
    const canvas = document.createElement('canvas');
    const ratio = board.clientHeight / board.clientWidth;
    canvas.width = 1600;
    canvas.height = Math.round(canvas.width * ratio);
    const context = canvas.getContext('2d');
    context.fillStyle = '#fffefa';
    context.fillRect(0, 0, canvas.width, canvas.height);
    const scale = canvas.width / board.clientWidth;
    const exportPoint = point => [point[0] / 100 * canvas.width, point[1] / 100 * canvas.height];
    for (const entry of drawingStrokes()) {
      const [x, y] = exportPoint(entry.to);
      context.fillStyle = context.strokeStyle = entry.color;
      if (!entry.from) {
        context.beginPath(); context.arc(x, y, entry.width * scale / 2, 0, Math.PI * 2); context.fill();
      } else {
        const [px, py] = exportPoint(entry.from);
        context.lineWidth = entry.width * scale;
        context.lineCap = context.lineJoin = 'round';
        context.beginPath(); context.moveTo(px, py); context.lineTo(x, y); context.stroke();
      }
    }
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Your browser could not create the image.');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${($('#drawing-title').value.trim() || 'Gaze drawing').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').slice(0, 60)}.png`;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    say('Your drawing is ready as a PNG. Only the artwork is exported.');
  } catch (error) { say(`Could not export. ${error.message}`); }
  finally { button.disabled = path.length === 0; }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (!calibration.hidden) { $('#cancel-calibration').click(); return; }
    if (guide.open) return;
    setFocus(false);
    if (isDrawing()) $('#pause').click();
    return;
  }
  if (guide.open || !calibration.hidden || event.target.closest('input,select,textarea,[contenteditable]')) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault(); $(event.shiftKey ? '#redo' : '#undo').click();
  } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault(); $('#export').click();
  } else if (event.code === 'Space' && !event.target.closest('button,a')) {
    event.preventDefault(); if (!event.repeat) $('#pause').click();
  } else if (mode === 'mouse' && /^[1-4]$/.test(event.key) && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault(); selectPoint(Number(event.key) - 1);
  }
});
document.addEventListener('visibilitychange', () => {
  pointer = null; resetDwell();
  if (document.hidden && (mode === 'mouse' || mode === 'gaze')) { paused = true; updateUI(); say('Drawing paused while you were away. Resume when you are ready.'); }
});
window.addEventListener('pagehide', () => stopCamera());
let previousSize = `${board.clientWidth}:${board.clientHeight}`;
function invalidateGazeLayout() {
  resetDwell(); pointer = null;
  if (mode === 'gaze') {
    paused = true; hasCalibration = false; updateUI();
    say('Your canvas moved. Recalibrate eye tracking before continuing. Your drawing is safe.');
  }
}
new ResizeObserver(() => {
  const size = `${board.clientWidth}:${board.clientHeight}`;
  if (size === previousSize) return;
  previousSize = size;
  invalidateGazeLayout();
}).observe(board);
window.addEventListener('resize', invalidateGazeLayout);
const validCoordinate = point => Array.isArray(point) && point.length === 2 && point.every(value => Number.isFinite(value) && value >= 0 && value <= 100);
const validEntry = entry => entry && colors.some(button => button.dataset.color === entry.color) && [3, 5, 9].includes(entry.width) &&
  (entry.from ? validCoordinate(entry.from) && validCoordinate(entry.to) : Number.isInteger(entry.point) && entry.point >= 0 && entry.point < 4);
try {
  const draft = JSON.parse(localStorage.getItem(storageKey) || 'null');
  if (draft?.version === 1 && Array.isArray(draft.path) && draft.path.length <= 2500 && draft.path.every(validEntry)) {
    path = draft.path;
    if (typeof draft.title === 'string') $('#drawing-title').value = draft.title.slice(0, 60) || 'Untitled exploration';
    setColor(draft.color);
    if ([3, 5, 9].includes(draft.width)) { width = draft.width; $('#stroke-width').value = width; }
    if ([600, 800, 1200, 1800].includes(draft.dwellMs)) { dwellMs = draft.dwellMs; $('#dwell-time').value = dwellMs; }
    if ([600, 800, 1200, 1800].includes(draft.lineDwellMs)) lineDwellMs = draft.lineDwellMs;
    board.classList.toggle('show-grid', draft.grid !== false);
    $('#grid').setAttribute('aria-pressed', draft.grid !== false);
    // A restored drawing can be cleared, and that clear remains undoable.
    $('#save-state').textContent = 'Draft restored from this browser';
  }
} catch { $('#save-state').textContent = 'Start fresh · browser storage unavailable'; }
renderPath(false);
updateUI();
