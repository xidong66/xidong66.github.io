const $ = selector => document.querySelector(selector);
const scene = $('#desk-scene'), status = $('#scene-status'), hint = $('#object-hint');
const atlasDialog = $('#atlas-dialog'), signalDialog = $('#signal-dialog');
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const places = {
  shenyang: { lat: 41.8057, lon: 123.4315, country: 'CHINA', city: 'Shenyang',
    description: 'Northeastern University · School of Medicine. Biomedical engineering and medical signal & image analysis.', url: 'https://www.neu.edu.cn/' },
  dundee: { lat: 56.462, lon: -2.9707, country: 'UNITED KINGDOM', city: 'Dundee',
    description: 'University of Dundee · Joint training programme with Northeastern University. A connection across disciplines and borders.', url: 'https://www.dundee.ac.uk/' },
};
let desk, atlas, graphics, earth, deskLost = false, atlasLost = false;
let paused = motionQuery.matches, lampOn = false, frozen = false;
let elapsed = 0, signalTime = 0, lastTime = 0, frameId = 0, selectedPlace = 'shenyang';
const returnFocus = new WeakMap();
const dialogs = [...document.querySelectorAll('dialog')];

function motionLabel() {
  $('#motion-toggle').textContent = paused ? 'Resume motion' : 'Pause motion';
  $('#motion-toggle').setAttribute('aria-pressed', String(paused));
}
motionLabel();
motionQuery.addEventListener('change', event => { paused = event.matches; motionLabel(); requestFrame(); });
$('#motion-toggle').addEventListener('click', () => { paused = !paused; motionLabel(); requestFrame(); });

function syncPlace(id, immediate = false) {
  selectedPlace = id;
  const place = places[id];
  $('#place-country').textContent = place.country;
  $('#place-city').textContent = place.city;
  $('#place-description').textContent = place.description;
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
  returnFocus.set(dialog, source || document.activeElement);
  // Only one panel is open at a time, preserving the native dialog focus trap.
  dialogs.forEach(item => { if (item.open) item.close(); });
  dialog.showModal();
  hint.hidden = true;
  if (id === 'atlas') {
    if (location.hash !== '#atlas') history.pushState(null, '', '#atlas');
    initAtlas();
  }
  requestFrame();
}

function action(name, source) {
  if (name === 'lamp') {
    lampOn = !lampOn; desk?.setLamp(lampOn);
    const button = $('[data-action="lamp"]'); button.setAttribute('aria-pressed', String(lampOn));
    status.textContent = lampOn ? 'A little more light.' : 'Lamp switched off.';
    requestFrame();
  } else openDialog(name, source || $(`[data-action="${name}"]`));
}
document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => action(button.dataset.action, button)));
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
  if (button.dataset.globe === 'reset') syncPlace('shenyang');
  atlas?.control(button.dataset.globe); requestFrame();
}));
$('#atlas-canvas').addEventListener('keydown', event => { if (event.key === 'Home') syncPlace('shenyang'); requestFrame(); });
$('#heart-rate').addEventListener('input', event => { $('#rate-output').value = event.target.value; requestFrame(); });
$('#signal-toggle').addEventListener('click', () => {
  frozen = !frozen;
  $('#signal-toggle').textContent = frozen ? 'Resume trace' : 'Freeze trace';
  $('#signal-toggle').setAttribute('aria-pressed', String(frozen)); requestFrame();
});

$('#terminal-form').addEventListener('submit', event => {
  event.preventDefault();
  const input = $('#terminal-input'), text = input.value.trim(), command = text.toLowerCase();
  const help = 'Available commands:\nprojects · globe · notes · email · clear';
  const output = $('#terminal-output');
  const destinations = { projects: 'projects', globe: 'atlas', notes: 'notes', email: 'letter' };
  if (command === 'clear') output.textContent = 'XW / RESEARCH TERMINAL';
  else {
    const answer = command === 'help' ? help : destinations[command] ? `Opening ${command}…` : `Unknown command. Type help to explore.`;
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
    field.setCustomValidity('Please write a few words.'); field.reportValidity(); return;
  }
  $('#sealed-subject').textContent = subject;
  $('#letter-mailto').href = `mailto:xidong03@163.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  $('#letter-dialog').dataset.state = 'sealed'; letterForm.hidden = true; sealedLetter.hidden = false;
  $('#letter-instruction').textContent = 'One last step: open your email app, review your letter, and send.';
  $('#letter-feedback').textContent = ''; $('#letter-copy-text').hidden = true;
  $('#letter-mailto').focus({ preventScroll: true });
});
['#letter-subject', '#letter-body'].forEach(selector => $(selector).addEventListener('input', event => event.target.setCustomValidity('')));
$('#letter-edit').addEventListener('click', () => {
  $('#letter-dialog').dataset.state = 'draft'; letterForm.hidden = false; sealedLetter.hidden = true;
  $('#letter-instruction').textContent = 'Write a note, fold it, then finish sending in your email app.';
  $('#letter-body').focus({ preventScroll: true });
});
$('#letter-copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(letterText());
    $('#letter-feedback').textContent = 'Letter copied. Paste it into your preferred email app.';
  } catch {
    const field = $('#letter-copy-text'); field.value = letterText(); field.hidden = false; field.focus(); field.select();
    $('#letter-feedback').textContent = 'Select and copy your letter below.';
  }
});

function showHint(label, event) {
  hint.hidden = !label;
  if (!label) return;
  hint.textContent = label;
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
  else if (desk && !deskLost && !dialogs.some(dialog => dialog.open)) desk.render(elapsed, Number($('#heart-rate').value));
  paintSignal();
  if ((atlasDialog.open && atlas && !atlasLost) || (!paused && ((desk && !deskLost && !dialogs.some(dialog => dialog.open)) || (graphics && signalDialog.open && !frozen)))) requestFrame();
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelAnimationFrame(frameId); frameId = 0; }
  lastTime = 0; requestFrame();
});
window.addEventListener('resize', requestFrame);
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
      status.textContent = '3D paused. Explore using the buttons below.';
    });
    $('#desk-canvas').addEventListener('webglcontextrestored', () => {
      deskLost = false; scene.classList.add('ready'); desk.restore(); status.textContent = 'Workbench restored.'; requestFrame();
    });
    scene.classList.add('ready');
    status.textContent = earth.available ? 'Made of questions & a few polygons.' : 'Coordinate globe / map data unavailable.';
    desk.setLamp(lampOn); requestFrame();
    if (atlasDialog.open) initAtlas();
  } catch (error) {
    console.warn('Using the illustrated workbench.', error.message);
    status.textContent = 'Explore using the buttons below. 3D is unavailable.';
    if (atlasDialog.open) initAtlas();
  }
}
if (location.hash === '#atlas') openDialog('atlas');
start();
