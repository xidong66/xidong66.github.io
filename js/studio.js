const $ = selector => document.querySelector(selector);
const t = (key, fallback) => window.SitePreferences?.t(key) ?? fallback;
const scene = $('#desk-scene'), status = $('#scene-status'), hint = $('#object-hint');
const atlasDialog = $('#atlas-dialog'), signalDialog = $('#signal-dialog');
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const places = {
  singapore: { lat: 1.3521, lon: 103.8198, countryKey: 'atlas.countrySingapore', cityKey: 'atlas.singapore', descriptionKey: 'atlas.descriptionSingapore',
    country: 'SINGAPORE', city: 'Singapore', description: 'National University of Singapore (NUS) · PhD student · 2027 – Present.', url: 'https://www.nus.edu.sg/' },
  shenyang: { lat: 41.8057, lon: 123.4315, country: 'CHINA', city: 'Shenyang',
    countryKey: 'atlas.countryChina', cityKey: 'atlas.shenyang', descriptionKey: 'atlas.descriptionShenyang', description: 'Northeastern University · Degree of Bachelor of Engineering, Biomedical Engineering · 2022 – 2026 · Grade: 88/100. Joint training with Dundee.', url: 'https://www.neu.edu.cn/' },
  dundee: { lat: 56.462, lon: -2.9707, country: 'UNITED KINGDOM', city: 'Dundee',
    countryKey: 'atlas.countryUK', cityKey: 'atlas.dundee', descriptionKey: 'atlas.descriptionDundee', description: 'University of Dundee · Degree of Bachelor of Engineering, Biomedical Engineering · 2022 – 2026 · First Class Honours. Joint training with Northeastern University.', url: 'https://www.dundee.ac.uk/' },
};
let desk, atlas, graphics, earth, deskLost = false, atlasLost = false;
let paused = motionQuery.matches, lampOn = false, frozen = false;
let elapsed = 0, signalTime = 0, lastTime = 0, frameId = 0, selectedPlace = 'singapore';
let heightHoldSource = null;
const returnFocus = new WeakMap();
const dialogs = [...document.querySelectorAll('dialog')];

function motionLabel() {
  $('#motion-toggle').textContent = paused ? t('studio.resume', 'Resume motion') : t('studio.pause', 'Pause motion');
  $('#motion-toggle').setAttribute('aria-pressed', String(paused));
}
motionLabel();
motionQuery.addEventListener('change', event => { paused = event.matches; motionLabel(); requestFrame(); });
$('#motion-toggle').addEventListener('click', () => { paused = !paused; motionLabel(); requestFrame(); });

function heightLabel(height = desk?.height ?? 75, target = desk?.targetHeight ?? 75) {
  $('#desk-height-output').value = height.toFixed(1);
  $('#desk-height-toggle').setAttribute('aria-label', `${t('desk.height', 'Desk height')}: ${height.toFixed(1)} cm. ${t('desk.toggleHelp', 'Switch sitting or standing; press again to stop.')}`);
  document.querySelectorAll('[data-desk-height]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.deskHeight) === target)));
  $('#desk-lower').disabled = target <= 75;
  $('#desk-raise').disabled = target >= 115;
}
function setDeskHeight(height) {
  if (!desk || deskLost) return;
  heightHoldSource = null;
  desk.setHeight(height, motionQuery.matches); heightLabel(); requestFrame();
}
function startDeskHeight(direction, source) {
  if (!desk || deskLost) return;
  heightHoldSource = source; desk.startHeight(direction); requestFrame();
}
function stopDeskHeight(source) {
  if (source && source !== heightHoldSource) return;
  if (!heightHoldSource) return;
  heightHoldSource = null; desk?.stopHeight(); requestFrame();
}
function adjustDeskHeight(action) {
  if (!desk || deskLost) return;
  if (action === 'desk-toggle') setDeskHeight(Math.abs(desk.height - desk.targetHeight) > .01 ? desk.height : desk.height < 95 ? 115 : 75);
}
$('#desk-height-toggle').addEventListener('click', () => adjustDeskHeight('desk-toggle'));
for (const [selector, direction] of [['#desk-lower', -1], ['#desk-raise', 1]]) {
  const button = $(selector);
  button.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !event.isPrimary) return;
    event.preventDefault(); button.focus({ preventScroll: true }); button.setPointerCapture(event.pointerId);
    startDeskHeight(direction, button);
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture', 'blur']) button.addEventListener(event, () => stopDeskHeight(button));
  button.addEventListener('keydown', event => {
    if (![' ', 'Enter'].includes(event.key)) return;
    event.preventDefault(); if (!event.repeat) startDeskHeight(direction, button);
  });
  button.addEventListener('keyup', event => {
    if ([' ', 'Enter'].includes(event.key)) { event.preventDefault(); stopDeskHeight(button); }
  });
  // Assistive technologies may activate a button without pointer or key events.
  button.addEventListener('click', event => { if (event.detail === 0 && desk && !deskLost) setDeskHeight(desk.height + direction); });
}
window.addEventListener('pointerup', () => stopDeskHeight());
window.addEventListener('pointercancel', () => stopDeskHeight());
window.addEventListener('blur', () => stopDeskHeight());
document.querySelectorAll('[data-desk-height]').forEach(button => button.addEventListener('click', () => setDeskHeight(Number(button.dataset.deskHeight))));

function syncPlace(id, immediate = false) {
  selectedPlace = id;
  const place = places[id];
  $('#place-country').textContent = t(place.countryKey, place.country);
  $('#place-city').textContent = t(place.cityKey, place.city);
  $('#place-description').textContent = t(place.descriptionKey, place.description);
  $('#place-link').href = place.url;
  document.querySelectorAll('[data-place]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.place === id)));
  atlas?.focus(id, immediate || motionQuery.matches);
  requestFrame();
}

function initAtlas() {
  if (!atlas && graphics && earth) {
    try {
      atlas = graphics.createAtlas($('#atlas-canvas'), earth, places, syncPlace, () => {
        atlasLost = true; $('#atlas-fallback').hidden = false;
      });
      $('#atlas-canvas').addEventListener('webglcontextrestored', () => { atlasLost = false; $('#atlas-fallback').hidden = true; atlas.resize(); requestFrame(); });
      syncPlace(selectedPlace, true);
      atlas.setTheme(window.SitePreferences?.theme === 'dark');
    } catch (error) { console.warn('The interactive globe is unavailable.', error.message); }
  }
  $('#atlas-fallback').hidden = Boolean(atlas && !atlasLost);
  if (!atlas) $('#atlas-canvas').style.visibility = 'hidden';
  else { $('#atlas-canvas').style.visibility = ''; atlas.resize(); }
  requestFrame();
}

function openDialog(id, source) {
  const dialog = $(`#${id}-dialog`);
  if (!dialog || dialog.open) return;
  stopDeskHeight();
  returnFocus.set(dialog, source || document.activeElement);
  // Only one panel is open at a time, preserving the native dialog focus trap.
  dialogs.forEach(item => { if (item.open) item.close(); });
  dialog.showModal();
  desk?.clearHover();
  hint.hidden = true;
  if (id === 'atlas') {
    if (location.hash !== '#atlas') history.pushState(null, '', '#atlas');
    initAtlas();
  }
  requestFrame();
}

function action(name, source) {
  if (name === 'desk-up' || name === 'desk-down') startDeskHeight(name === 'desk-up' ? 1 : -1, 'mesh');
  else if (name === 'desk-stop') stopDeskHeight('mesh');
  else if (name === 'desk-toggle') adjustDeskHeight(name);
  else if (name === 'lamp') {
    lampOn = !lampOn; desk?.setLamp(lampOn);
    const button = $('[data-action="lamp"]'); button.setAttribute('aria-pressed', String(lampOn));
    showStatus(lampOn ? 'status.lampOn' : 'status.lampOff');
    requestFrame();
  } else openDialog(name === 'board' ? 'projects' : name, source || $(`[data-action="${name}"]`));
}
document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => action(button.dataset.action, button)));
document.querySelectorAll('.object-controls [data-action]').forEach(button => {
  const activate = () => { desk?.setHover(button.dataset.action); requestFrame(); };
  const deactivate = () => { desk?.setHover(null); requestFrame(); };
  button.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') activate(); });
  button.addEventListener('pointerleave', deactivate);
  button.addEventListener('focus', activate); button.addEventListener('blur', deactivate);
});
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
dialogs.forEach(dialog => {
  dialog.addEventListener('close', () => {
    if (dialog === atlasDialog && location.hash === '#atlas') history.replaceState(null, '', `${location.pathname}${location.search}`);
    if (!dialogs.some(item => item.open)) returnFocus.get(dialog)?.focus({ preventScroll: true });
    lastTime = 0; requestFrame();
  });
  dialog.addEventListener('click', event => {
    if (dialog !== atlasDialog && event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    }
  });
});
document.querySelectorAll('[data-place]').forEach(button => button.addEventListener('click', () => syncPlace(button.dataset.place)));
document.querySelectorAll('[data-globe]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.globe === 'reset') syncPlace('singapore');
  atlas?.control(button.dataset.globe); requestFrame();
}));
$('#atlas-canvas').addEventListener('keydown', event => { if (event.key === 'Home') syncPlace('singapore'); requestFrame(); });
$('#heart-rate').addEventListener('input', event => { $('#rate-output').value = event.target.value; requestFrame(); });
$('#signal-toggle').addEventListener('click', () => {
  frozen = !frozen;
  signalLabel();
  $('#signal-toggle').setAttribute('aria-pressed', String(frozen)); requestFrame();
});

$('#terminal-form').addEventListener('submit', event => {
  event.preventDefault();
  const input = $('#terminal-input'), text = input.value.trim(), command = text.toLowerCase();
  const help = `${t('studio.available', 'Available commands:')}\nprojects · globe · notes · email · clear`;
  const output = $('#terminal-output');
  output.dataset.used = 'true';
  const destinations = { projects: 'projects', globe: 'atlas', notes: 'notes', email: 'letter' };
  if (command === 'clear') output.textContent = 'XW / RESEARCH TERMINAL';
  else {
    const answer = command === 'help' ? help : destinations[command] ? `${t('studio.opening', 'Opening')} ${command}…` : t('studio.unknown', 'Unknown command. Type help to explore.');
    output.textContent = `${output.textContent}\n\n> ${text}\n${answer}`.split('\n').slice(-18).join('\n');
    output.scrollTop = output.scrollHeight;
  }
  desk?.setTerminal(`> ${text || 'hello'}`); input.value = '';
  if (destinations[command]) action(destinations[command]);
  requestFrame();
});

const letterForm = $('#letter-form'), sealedLetter = $('#sealed-letter');
function letterText() { return `To: xidong03@163.com\nSubject: ${$('#letter-subject').value.trim()}\n\n${$('#letter-body').value}`; }
$('#letter-body').addEventListener('input', event => { $('#letter-count').value = `${event.target.value.length} / 2000`; });
letterForm.addEventListener('submit', event => {
  event.preventDefault();
  const subject = $('#letter-subject').value.trim(), body = $('#letter-body').value;
  if (!subject || !body.trim()) {
    const field = !subject ? $('#letter-subject') : $('#letter-body');
    field.setCustomValidity(t('letter.validation', 'Please write a few words.')); field.reportValidity(); return;
  }
  $('#sealed-subject').textContent = subject;
  $('#letter-mailto').href = `mailto:xidong03@163.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  $('#letter-dialog').dataset.state = 'sealed'; letterForm.hidden = true; sealedLetter.hidden = false;
  letterInstruction();
  $('#letter-feedback').textContent = ''; $('#letter-copy-text').hidden = true;
  $('#letter-mailto').focus({ preventScroll: true });
});
['#letter-subject', '#letter-body'].forEach(selector => $(selector).addEventListener('input', event => event.target.setCustomValidity('')));
$('#letter-edit').addEventListener('click', () => {
  $('#letter-dialog').dataset.state = 'draft'; letterForm.hidden = false; sealedLetter.hidden = true;
  letterInstruction();
  $('#letter-body').focus({ preventScroll: true });
});
$('#letter-copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(letterText());
    $('#letter-feedback').dataset.message = 'letter.copied';
    $('#letter-feedback').textContent = t('letter.copied', 'Letter copied. Paste it into your preferred email app.');
  } catch {
    const field = $('#letter-copy-text'); field.value = letterText(); field.hidden = false; field.focus(); field.select();
    $('#letter-feedback').dataset.message = 'letter.manual';
    $('#letter-feedback').textContent = t('letter.manual', 'Select and copy your letter below.');
  }
});

function showHint(label, event, action) {
  requestFrame();
  document.querySelectorAll('.object-controls [data-action]').forEach(button => {
    button.dataset.hovered = String(button.dataset.action === action);
  });
  hint.hidden = !label;
  if (!label) return;
  hint.dataset.objectAction = action || '';
  hint.textContent = action ? t(`hint.${action}`, label) : label;
  const rect = scene.getBoundingClientRect();
  hint.style.left = `${Math.max(8, Math.min(event.clientX - rect.left + 16, rect.width - hint.offsetWidth - 8))}px`;
  hint.style.top = `${Math.max(8, event.clientY - rect.top - 40)}px`;
}

function paintSignal() {
  if (!graphics || !signalDialog.open) return;
  const canvas = $('#signal-canvas'), width = Math.round(canvas.clientWidth * Math.min(devicePixelRatio, 2)), height = Math.round(canvas.clientHeight * Math.min(devicePixelRatio, 2));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  graphics.drawSignal(canvas.getContext('2d'), width, height, signalTime, Number($('#heart-rate').value), true);
}
function requestFrame() { if (!frameId && !document.hidden) frameId = requestAnimationFrame(frame); }
function frame(now) {
  frameId = 0;
  if (document.hidden) { lastTime = 0; return; }
  // Thirty frames per second is enough for the quiet desk and saves GPU work.
  const delta = lastTime ? Math.min((now - lastTime) / 1000, .1) : 0;
  if (lastTime && delta < 1 / 30) { requestFrame(); return; }
  lastTime = now;
  if (!paused) { elapsed += delta; if (!frozen) signalTime += delta; }
  if (atlasDialog.open && atlas && !atlasLost) atlas.render(motionQuery.matches);
  else if (desk && !deskLost && !dialogs.some(dialog => dialog.open)) desk.render(elapsed, Number($('#heart-rate').value), delta, motionQuery.matches);
  paintSignal();
  if ((atlasDialog.open && atlas && !atlasLost) || (desk && !deskLost && !dialogs.some(dialog => dialog.open) && (desk.isAnimating || !paused)) || (!paused && graphics && signalDialog.open && !frozen)) requestFrame();
}
document.addEventListener('visibilitychange', () => {
  stopDeskHeight();
  if (document.hidden) { cancelAnimationFrame(frameId); frameId = 0; }
  lastTime = 0; requestFrame();
});
window.addEventListener('resize', requestFrame);
function showStatus(key) { status.dataset.message = key; status.textContent = t(key, status.textContent); }
function signalLabel() { $('#signal-toggle').textContent = frozen ? t('studio.resumeTrace', 'Resume trace') : t('studio.freeze', 'Freeze trace'); }
function letterInstruction() {
  const key = $('#letter-dialog').dataset.state === 'sealed' ? 'letter.sealedInstruction' : 'letter.draftInstruction';
  $('#letter-instruction').textContent = t(key, $('#letter-instruction').textContent);
}
function refreshLanguage() {
  motionLabel(); heightLabel(); signalLabel(); letterInstruction(); syncPlace(selectedPlace, true);
  if (status.dataset.message) showStatus(status.dataset.message);
  else showStatus('status.loading');
  const feedback = $('#letter-feedback');
  if (feedback.textContent && feedback.dataset.message) feedback.textContent = t(feedback.dataset.message, feedback.textContent);
  if (!hint.hidden && hint.dataset.objectAction) hint.textContent = t(`hint.${hint.dataset.objectAction}`, hint.textContent);
  if (!$('#terminal-output').dataset.used) $('#terminal-output').textContent = t('studio.terminalInitial', $('#terminal-output').textContent);
}
window.addEventListener('xw:languagechange', refreshLanguage);
window.addEventListener('xw:themechange', () => {
  const dark = window.SitePreferences?.theme === 'dark';
  if (desk && !deskLost) desk.setTheme(dark);
  if (atlas && !atlasLost) atlas.setTheme(dark);
  requestFrame();
});
window.addEventListener('hashchange', () => {
  if (location.hash === '#atlas') openDialog('atlas');
  else if (atlasDialog.open) atlasDialog.close();
});

async function start() {
  try {
    graphics = await import('./studio-scene.js');
    earth = await graphics.loadEarth();
    desk = graphics.createDesk($('#desk-canvas'), earth, action, showHint, () => {
      deskLost = true; scene.classList.remove('ready');
      stopDeskHeight();
      $('#desk-height-controls').hidden = true;
      showStatus('status.lost');
    }, heightLabel);
    $('#desk-canvas').addEventListener('webglcontextrestored', () => {
      deskLost = false; scene.classList.add('ready'); $('#desk-height-controls').hidden = false; desk.restore(); showStatus('status.restored'); requestFrame();
    });
    scene.classList.add('ready');
    $('#desk-height-controls').hidden = false; heightLabel();
    showStatus(earth.available ? 'status.ready' : 'status.mapless');
    desk.setLamp(lampOn); desk.setTheme(window.SitePreferences?.theme === 'dark'); requestFrame();
    if (atlasDialog.open) initAtlas();
  } catch (error) {
    console.warn('Using the illustrated workbench.', error.message);
    showStatus('status.unavailable');
    if (atlasDialog.open) initAtlas();
  }
}
if (location.hash === '#atlas') openDialog('atlas');
refreshLanguage();
start();
