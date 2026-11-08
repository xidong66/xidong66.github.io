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
const points = [[25, 25], [75, 25], [25, 75], [75, 75]];
const calibrationPoints = [12, 50, 88].flatMap(y => [12, 50, 88].map(x => [x, y]));
const faceMeshAssets = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619';
const storageKey = 'bn5213-gaze-studio-v1';
const maxSampleGapMs = 250;
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
  $('#camera-description').textContent = cameraOn ? 'Keep your head still and your eyes on the screen.' : mode === 'mouse' ? 'No camera needed. Hover, tap, or use keys 1–4.' : 'Your webcam is all you need. No special equipment required.';
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
    localStorage.setItem(storageKey, JSON.stringify({ version: 1, path, title: $('#drawing-title').value, color, width, dwellMs, grid: board.classList.contains('show-grid') }));
    $('#save-state').textContent = 'Saved in this browser';
  } catch {
    $('#save-state').textContent = 'Browser storage unavailable · export to keep';
  }
}
function renderPath(save = true) {
  const fragment = document.createDocumentFragment();
  path.forEach((entry, index) => {
    const [x, y] = points[entry.point];
    const previous = points[path[Math.max(0, index - 1)].point];
    const element = document.createElementNS('http://www.w3.org/2000/svg', index ? 'line' : 'circle');
    if (index) {
      for (const [attribute, value] of Object.entries({ x1: previous[0], y1: previous[1], x2: x, y2: y, stroke: entry.color, 'stroke-width': entry.width })) element.setAttribute(attribute, value);
    } else {
      for (const [attribute, value] of Object.entries({ cx: x, cy: y, r: .6, fill: entry.color })) element.setAttribute(attribute, value);
    }
    fragment.append(element);
  });
  ink.replaceChildren(fragment);
  targets.forEach((target, index) => target.classList.toggle('last', index === path.at(-1)?.point));
  $('#canvas-empty').hidden = path.length > 0;
  $('#point-count').textContent = `${path.length} point${path.length === 1 ? '' : 's'} connected`;
  $('#undo').disabled = history.length === 0;
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
  if (!isDrawing() || path.at(-1)?.point === index) return;
  if (path.length >= 2500) { say('This canvas is full. Export your drawing, then clear it to begin again.'); return; }
  remember();
  path.push({ point: index, color, width });
  renderPath();
  say(`Point ${index + 1} connected. Move to another point.`);
}
function updateDwell(point, now) {
  if (!isDrawing() || !point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
  gazeCursor.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%)`;
  gazeCursor.hidden = false;
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
  resetDwell();
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
  $('#calibration-dot').style.left = `${x}%`;
  $('#calibration-dot').style.top = `${y}%`;
  $('#calibration-count').textContent = `Point ${calibrationIndex + 1} of 9 · ${calibrationClicks} of 5 clicks`;
  $('#calibration-progress').value = calibrationIndex * 5 + calibrationClicks;
}
async function calibrate(generation) {
  mode = 'calibration';
  paused = false;
  hasCalibration = false;
  resetDwell();
  await gaze.clearData();
  if (generation !== startupGeneration) return;
  calibrationIndex = calibrationClicks = 0;
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
    updateUI();
    say('Follow the purple gaze ring. Hold it inside a numbered area to connect.');
    board.focus({ preventScroll: true });
  } else showCalibrationDot();
});
$('#cancel-calibration').addEventListener('click', () => { stopCamera('Calibration cancelled and camera turned off. Try mouse mode whenever you like.'); startButton.focus(); });
$('#stop').addEventListener('click', () => stopCamera());
mouseButton.addEventListener('click', () => {
  stopCamera('Mouse mode is ready. Hover over a point, tap it, or press 1–4.');
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
  say(paused ? `Drawing paused.${gaze ? ' Camera remains on; use the stop button to turn it off.' : ' Take your time.'}` : 'Ready to connect. Choose your next point.');
});
$('#undo').addEventListener('click', () => {
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
  resetDwell();
  renderPath();
  say('Change restored.');
});
$('#clear').addEventListener('click', () => {
  if (!path.length) return;
  remember();
  path = [];
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
$('#dwell-time').addEventListener('change', event => { dwellMs = Number(event.target.value); resetDwell(); persist(); say(`Hold a point for ${(dwellMs / 1000).toFixed(1)} seconds to connect it.`); });
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
    path.forEach((entry, index) => {
      const [x, y] = points[entry.point].map((value, axis) => value / 100 * (axis ? canvas.height : canvas.width));
      context.fillStyle = context.strokeStyle = entry.color;
      if (!index) {
        context.beginPath(); context.arc(x, y, entry.width * scale / 2, 0, Math.PI * 2); context.fill();
      } else {
        const [px, py] = points[path[index - 1].point].map((value, axis) => value / 100 * (axis ? canvas.height : canvas.width));
        context.lineWidth = entry.width * scale;
        context.lineCap = context.lineJoin = 'round';
        context.beginPath(); context.moveTo(px, py); context.lineTo(x, y); context.stroke();
      }
    });
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
try {
  const draft = JSON.parse(localStorage.getItem(storageKey) || 'null');
  if (draft?.version === 1 && Array.isArray(draft.path) && draft.path.length <= 2500 && draft.path.every(entry => Number.isInteger(entry.point) && entry.point >= 0 && entry.point < 4 && colors.some(button => button.dataset.color === entry.color) && [3, 5, 9].includes(entry.width))) {
    path = draft.path;
    if (typeof draft.title === 'string') $('#drawing-title').value = draft.title.slice(0, 60) || 'Untitled exploration';
    setColor(draft.color);
    if ([3, 5, 9].includes(draft.width)) { width = draft.width; $('#stroke-width').value = width; }
    if ([600, 800, 1200, 1800].includes(draft.dwellMs)) { dwellMs = draft.dwellMs; $('#dwell-time').value = dwellMs; }
    board.classList.toggle('show-grid', draft.grid !== false);
    $('#grid').setAttribute('aria-pressed', draft.grid !== false);
    // A restored drawing can be cleared, and that clear remains undoable.
    $('#save-state').textContent = 'Draft restored from this browser';
  }
} catch { $('#save-state').textContent = 'Start fresh · browser storage unavailable'; }
renderPath(false);
updateUI();
