import { travelPlaces } from './travel-data.js';
import { createStudioEntrance } from './studio-entrance.js';
import { createLetterComposer } from './studio-letter.js';

const $ = selector => document.querySelector(selector);
const t = (key, fallback) => window.SitePreferences?.t(key) ?? fallback;
$('.visitor-details')?.addEventListener('toggle', event => {
  // The external widget checks viewport visibility on scroll, including when its menu opens.
  if (event.target.open) window.dispatchEvent(new Event('scroll'));
});
const scene = $('#desk-scene'), status = $('#scene-status'), hint = $('#object-hint');
const atlasDialog = $('#atlas-dialog'), signalDialog = $('#signal-dialog');
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const educationPlaces = {
  singapore: { lat: 1.3521, lon: 103.8198, countryKey: 'atlas.countrySingapore', cityKey: 'atlas.singapore', descriptionKey: 'atlas.descriptionSingapore',
    country: 'SINGAPORE', city: 'Singapore', description: 'National University of Singapore (NUS) · PhD student · 2027 – Present.', url: 'https://www.nus.edu.sg/' },
  shenyang: { lat: 41.8057, lon: 123.4315, country: 'CHINA', city: 'Shenyang',
    countryKey: 'atlas.countryChina', cityKey: 'atlas.shenyang', descriptionKey: 'atlas.descriptionShenyang', description: 'Northeastern University · Degree of Bachelor of Engineering, Biomedical Engineering · 2022 – 2026 · Grade: 88/100. Joint training with Dundee.', url: 'https://www.neu.edu.cn/' },
  dundee: { lat: 56.462, lon: -2.9707, country: 'UNITED KINGDOM', city: 'Dundee',
    countryKey: 'atlas.countryUK', cityKey: 'atlas.dundee', descriptionKey: 'atlas.descriptionDundee', description: 'University of Dundee · Degree of Bachelor of Engineering, Biomedical Engineering · 2022 – 2026 · First Class Honours. Joint training with Northeastern University.', url: 'https://www.dundee.ac.uk/' },
};
const places = Object.fromEntries(travelPlaces.map(place => [place.id, { ...place, ...educationPlaces[place.id], education: Boolean(educationPlaces[place.id]) }]));
const benchUrl = new URL('../studio/', import.meta.url), globeUrl = new URL('globe/', benchUrl);
const directAtlas = document.documentElement.dataset.atlasPage === 'true';
const photoDialog = $('#photo-dialog');
let galleryPlace = null, photoIndex = 0, atlasOrigin = null, closingAtlas = false;
let desk, atlas, graphics, earth, deskLost = false, atlasLost = false;
let paused = motionQuery.matches, lampOn = false, frozen = false;
let elapsed = 0, signalTime = 0, lastTime = 0, frameId = 0, selectedPlace = 'singapore';
let heightHoldSource = null;
const returnFocus = new WeakMap();
const dialogs = [...document.querySelectorAll('dialog')];
let viewToken = 0, portalPanel = null, viewBusy = false;
let returningFromAtlas = false;
try { returningFromAtlas = sessionStorage.getItem('xw.studioReturn') === '1'; sessionStorage.removeItem('xw.studioReturn'); } catch { /* Navigation works without storage. */ }
const entrance = createStudioEntrance({ dialog: $('#studio-entrance'), motion: motionQuery,
  skip: directAtlas || location.hash === '#atlas' || returningFromAtlas, requestFrame, translate: t });

function alignMonitor() {
  if (portalPanel !== 'projects' || !desk || deskLost) return;
  const rect = desk.getScreenRect(), panel = $('#monitor-content');
  Object.assign(panel.style, { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px` });
}
async function returnCamera() {
  if (!portalPanel) return;
  const ticket = ++viewToken; viewBusy = true; portalPanel = null;
  $('#view-transition').hidden = true; const flight = desk?.returnToBench(motionQuery.matches || deskLost); requestFrame();
  await flight; if (ticket !== viewToken) return;
  scene.classList.remove('is-cinematic'); document.documentElement.classList.remove('studio-focus');
  $('#monitor-content').removeAttribute('style');
  desk?.endPortal(); document.documentElement.dataset.view = 'bench'; viewBusy = false; requestFrame();
}
async function cancelView() {
  if (!viewBusy || !portalPanel) return;
  await returnCamera();
}
$('#view-transition-cancel').addEventListener('click', cancelView);
document.addEventListener('keydown', event => { if (event.key === 'Escape' && viewBusy && portalPanel) { event.preventDefault(); cancelView(); } });

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

const localized = values => values[window.SitePreferences?.language === 'zh' ? 1 : 0];
const photoCount = place => `${place.photos.length} ${t('travel.photographs', 'PHOTOGRAPHS')}`;
const photoUrl = photo => new URL(`../${photo.path}`, import.meta.url).href;
function atlasTitle() { document.title = `${t('travel.atlas', 'Personal atlas')} · Xidong Wu`; }
function renderPlaceIndex() {
  const index = $('.place-buttons');
  if (index.children.length !== travelPlaces.length) index.replaceChildren(...travelPlaces.map(place => {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.place = place.id; return button;
  }));
  for (const button of index.children) button.textContent = `${localized(places[button.dataset.place].names)} · ${places[button.dataset.place].photos.length}`;
  $('#atlas-summary').textContent = `${travelPlaces.length} ${t('travel.places', 'PLACES')} · ${travelPlaces.reduce((count, place) => count + place.photos.length, 0)} ${t('travel.photographs', 'PHOTOGRAPHS')}`;
}
function renderPhoto() {
  const place = places[galleryPlace]; if (!place || !place.photos.length) return;
  const photo = place.photos[photoIndex], name = localized(place.names), src = photoUrl(photo);
  const image = $('#photo-image'); image.alt = `${name} · ${photoIndex + 1} / ${place.photos.length}`;
  if (image.src !== src) { $('#photo-error').hidden = true; image.src = src; }
  $('#photo-name').textContent = name;
  $('#photo-counter').textContent = `${String(photoIndex + 1).padStart(2, '0')} / ${String(place.photos.length).padStart(2, '0')}`;
  for (const id of ['photo-previous', 'photo-next', 'photo-full-previous', 'photo-full-next']) $(`#${id}`).disabled = place.photos.length < 2;
  const thumbnails = $('#photo-thumbnails');
  if (thumbnails.dataset.place !== place.id) {
    thumbnails.dataset.place = place.id;
    thumbnails.replaceChildren(...place.photos.map((item, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.photo = index;
      const thumb = document.createElement('img'); thumb.loading = 'lazy'; thumb.decoding = 'async'; thumb.src = photoUrl(item); thumb.alt = ''; button.append(thumb); return button;
    }));
  }
  for (const button of thumbnails.children) {
    button.setAttribute('aria-pressed', String(Number(button.dataset.photo) === photoIndex));
    button.setAttribute('aria-label', `${name} · ${Number(button.dataset.photo) + 1} / ${place.photos.length}`);
  }
  if (photoDialog.open) {
    $('#photo-full-image').src = src; $('#photo-full-image').alt = image.alt;
    $('#photo-full-title').textContent = image.alt; $('#photo-full-caption').textContent = image.alt;
  }
}
function changePhoto(delta) {
  const place = places[galleryPlace]; if (!place?.photos.length) return;
  photoIndex = (photoIndex + delta + place.photos.length) % place.photos.length; renderPhoto();
}
for (const id of ['photo-previous', 'photo-full-previous']) $(`#${id}`).addEventListener('click', () => changePhoto(-1));
for (const id of ['photo-next', 'photo-full-next']) $(`#${id}`).addEventListener('click', () => changePhoto(1));
$('#photo-thumbnails').addEventListener('click', event => {
  const button = event.target.closest('[data-photo]'); if (button) { photoIndex = Number(button.dataset.photo); renderPhoto(); }
});
$('#photo-open').addEventListener('click', () => {
  if (!places[galleryPlace]?.photos.length) return;
  returnFocus.set(photoDialog, $('#photo-open')); photoDialog.showModal(); renderPhoto();
});
photoDialog.addEventListener('keydown', event => {
  if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); changePhoto(event.key === 'ArrowRight' ? 1 : -1); }
});
$('#photo-image').addEventListener('error', () => { $('#photo-error').hidden = false; });
$('#photo-image').addEventListener('load', () => { $('#photo-error').hidden = true; });
$('#postcard-close').addEventListener('click', () => { galleryPlace = null; $('#atlas-postcard').hidden = true; $('#atlas-canvas').focus(); });
function syncPlace(id, immediate = false, reveal = false) {
  const place = places[id]; if (!place) return;
  selectedPlace = id;
  $('#place-country').textContent = localized(place.countries);
  $('#place-city').textContent = localized(place.names);
  $('#place-native').textContent = place.names[window.SitePreferences?.language === 'zh' ? 0 : 1];
  $('#place-coordinates').textContent = `${Math.abs(place.lat).toFixed(2)}° ${place.lat < 0 ? 'S' : 'N'} / ${Math.abs(place.lon).toFixed(2)}° ${place.lon < 0 ? 'W' : 'E'}`;
  $('#place-description').textContent = place.descriptionKey ? t(place.descriptionKey, place.description) : t('travel.albumDescription', 'A few moments from my travels, kept in photographs.');
  $('#place-link').hidden = !place.url; if (place.url) $('#place-link').href = place.url;
  $('#place-photo-count').textContent = photoCount(place);
  if (reveal) { if (galleryPlace !== id) photoIndex = 0; galleryPlace = id; $('#atlas-postcard').hidden = false; }
  if (galleryPlace === id) renderPhoto();
  document.querySelectorAll('[data-place]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.place === id)));
  atlas?.focus(id, immediate || motionQuery.matches); requestFrame();
}
function showPinHint(id, event) {
  const tooltip = $('#atlas-pin-hint'); tooltip.hidden = !id;
  if (!id || !event) return;
  tooltip.textContent = `${localized(places[id].names)} · ${photoCount(places[id])}`;
  const rect = $('.atlas-visual').getBoundingClientRect();
  tooltip.style.left = `${Math.max(8, Math.min(event.clientX - rect.left + 12, rect.width - tooltip.offsetWidth - 8))}px`;
  tooltip.style.top = `${Math.max(8, event.clientY - rect.top - 36)}px`;
}
async function animateAtlas(reverse = false) {
  if (motionQuery.matches) return;
  const canvas = $('#atlas-canvas'), rect = canvas.getBoundingClientRect();
  const origin = atlasOrigin || { x: rect.left + rect.width / 2, y: rect.top + rect.height * .47, size: rect.width * .48 };
  const small = { transform: `translate(${origin.x - rect.left - rect.width / 2}px, ${origin.y - rect.top - rect.height * .47}px) scale(${Math.min(1, origin.size / (rect.width * .6))})`, opacity: .15 };
  const full = { transform: 'translate(0, 0) scale(1)', opacity: 1 };
  const animation = canvas.animate(reverse ? [full, small] : [small, full], { duration: reverse ? 420 : 850, easing: 'cubic-bezier(.22,.8,.25,1)' });
  try { await animation.finished; } catch { /* A closed or resized panel may cancel the transition. */ }
}
async function closeAtlas() {
  if (closingAtlas || !atlasDialog.open) return;
  closingAtlas = true; await animateAtlas(true); atlasDialog.close(); closingAtlas = false;
}
atlasDialog.addEventListener('cancel', event => { event.preventDefault(); closeAtlas(); });

function initAtlas() {
  if (!atlas && graphics && earth) {
    try {
      atlas = graphics.createAtlas($('#atlas-canvas'), earth, places, id => syncPlace(id, false, true), () => {
        atlasLost = true; $('#atlas-fallback').hidden = false;
      }, showPinHint);
      $('#atlas-canvas').addEventListener('webglcontextrestored', () => { atlasLost = false; $('#atlas-fallback').hidden = true; atlas.resize(); requestFrame(); });
      syncPlace(selectedPlace, true);
      atlas.setTheme(window.SitePreferences?.theme === 'dark');
    } catch (error) { console.warn('The interactive globe is unavailable.', error.message); }
  }
  $('#atlas-fallback').hidden = Boolean(atlas && !atlasLost);
  if (!atlas) $('#atlas-canvas').style.visibility = 'hidden';
  else { $('#atlas-canvas').style.visibility = ''; atlas.resize(); }
  if (atlas && atlasDialog.dataset.entered !== 'true') { atlasDialog.dataset.entered = 'true'; animateAtlas(); }
  requestFrame();
}

async function openDialog(id, source) {
  const dialog = $(`#${id}-dialog`);
  if (!dialog || dialog.open || viewBusy) return;
  stopDeskHeight();
  entrance.skip();
  returnFocus.set(dialog, source || document.activeElement);
  // Only one panel is open at a time, preserving the native dialog focus trap.
  dialogs.forEach(item => { if (item.open) item.close(); });
  if (['projects', 'atlas', 'letter'].includes(id) && desk && !deskLost && !directAtlas) {
    const ticket = ++viewToken; viewBusy = true; portalPanel = id;
    desk.clearHover(); desk.beginPortal(); scene.classList.add('is-cinematic'); document.documentElement.classList.add('studio-focus');
    document.documentElement.dataset.view = `moving-${id}`; desk.matchPortal();
    $('#view-transition-label').textContent = t(`entrance.${id}`, 'Moving closer…'); $('#view-transition').hidden = false;
    const flight = desk.focusObject(id, motionQuery.matches); requestFrame(); await flight;
    if (ticket !== viewToken) return;
    $('#view-transition').hidden = true; viewBusy = false; document.documentElement.dataset.view = id;
    if (id === 'projects') alignMonitor();
  }
  if (id === 'atlas') { atlasOrigin = directAtlas ? null : desk?.getGlobeBounds(); atlasDialog.dataset.entered = 'false'; }
  dialog.showModal();
  if (id === 'letter') {
    const paper = $('#letter-form');
    if (!motionQuery.matches && !paper.hidden) paper.animate([{ opacity: 0, transform: 'perspective(1000px) rotateX(32deg) scale(.62) translateY(90px)' }, { opacity: 1, transform: 'perspective(1000px) rotateX(0) scale(1) translateY(0)' }], { duration: 900, easing: 'cubic-bezier(.22,.8,.25,1)' });
  }
  desk?.clearHover();
  hint.hidden = true;
  if (id === 'atlas') {
    if (location.pathname !== globeUrl.pathname) history.pushState(null, '', globeUrl.pathname);
    atlasTitle(); initAtlas();
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
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => {
  const dialog = button.closest('dialog'); if (dialog === atlasDialog) closeAtlas(); else dialog.close();
}));
dialogs.forEach(dialog => {
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    if (dialog === atlasDialog) {
      if (directAtlas) { try { sessionStorage.setItem('xw.studioReturn', '1'); } catch { /* Optional entrance skip. */ } location.assign(benchUrl.href); return; }
      if (location.pathname === globeUrl.pathname || location.hash === '#atlas') history.replaceState(null, '', benchUrl.pathname);
      document.title = `${t('studio.documentTitle', 'Research Workbench')} · Xidong Wu`;
    }
    if (portalPanel === dialog.id.replace('-dialog', '')) returnCamera().then(() => returnFocus.get(dialog)?.focus({ preventScroll: true }));
    if (dialog === photoDialog || !dialogs.some(item => item.open)) returnFocus.get(dialog)?.focus({ preventScroll: true });
    lastTime = 0; requestFrame();
  });
  dialog.addEventListener('click', event => {
    if (dialog !== atlasDialog && event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    }
  });
});
$('.place-buttons').addEventListener('click', event => {
  const button = event.target.closest('[data-place]'); if (button) syncPlace(button.dataset.place, false, true);
});
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

const letterComposer = createLetterComposer({ dialog: $('#letter-dialog'), motion: motionQuery, translate: t });

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
  else if (desk && !deskLost && (desk.isCameraAnimating || portalPanel === 'projects' || !dialogs.some(dialog => dialog.open))) { desk.render(elapsed, Number($('#heart-rate').value), delta, motionQuery.matches); alignMonitor(); }
  paintSignal();
  if ((atlasDialog.open && atlas && !atlasLost) || (desk && !deskLost && (desk.isCameraAnimating || portalPanel === 'projects' || (!dialogs.some(dialog => dialog.open) && (desk.isAnimating || !paused)))) || (!paused && graphics && signalDialog.open && !frozen)) requestFrame();
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
  letterComposer.refresh();
}
function refreshLanguage() {
  renderPlaceIndex(); motionLabel(); heightLabel(); signalLabel(); letterInstruction(); syncPlace(selectedPlace, true);
  if (atlasDialog.open) atlasTitle();
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
  if (location.hash === '#atlas' || location.pathname === globeUrl.pathname) openDialog('atlas');
  else if (atlasDialog.open) atlasDialog.close();
});
window.addEventListener('popstate', () => {
  if (location.pathname === globeUrl.pathname || location.hash === '#atlas') openDialog('atlas');
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
      entrance.skip();
      const pendingPanel = viewBusy && portalPanel;
      if (portalPanel) returnCamera().then(() => { if (pendingPanel) openDialog(pendingPanel); });
      else desk?.endPortal();
    }, heightLabel, places);
    $('#desk-canvas').addEventListener('webglcontextrestored', () => {
      deskLost = false; scene.classList.add('ready'); $('#desk-height-controls').hidden = false; desk.restore(); showStatus('status.restored'); requestFrame();
    });
    scene.classList.add('ready');
    $('#desk-height-controls').hidden = false; heightLabel();
    showStatus(earth.available ? 'status.ready' : 'status.mapless');
    desk.setLamp(lampOn); desk.setTheme(window.SitePreferences?.theme === 'dark'); requestFrame();
    await entrance.play(desk);
    if (atlasDialog.open) initAtlas();
  } catch (error) {
    console.warn('Using the illustrated workbench.', error.message);
    showStatus('status.unavailable');
    entrance.play(null);
    if (atlasDialog.open) initAtlas();
  }
}
if (directAtlas || location.hash === '#atlas') openDialog('atlas');
refreshLanguage();
start();
