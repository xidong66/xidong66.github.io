import { animate, wait } from './studio-animation.js';

export function createLetterComposer({ dialog, motion, translate: t }) {
  const $ = selector => dialog.querySelector(selector), form = $('#letter-form'), envelope = $('#postal-envelope');
  const foldLayer = $('#letter-fold-layer'), stampTool = $('#letter-stamp-tool'), wax = $('#wax-target'), bird = $('#carrier-pigeon');
  let controller, drag = null, activeMessage = 'letter.draftInstruction';
  const state = () => dialog.dataset.state;
  const busy = () => ['folding', 'stamping', 'flying'].includes(state());
  const text = () => `To: xidong03@163.com\nSubject: ${$('#letter-subject').value.trim()}\n\n${$('#letter-body').value}`;
  function message(key) { activeMessage = key; refresh(); }
  function setState(value) { dialog.dataset.state = value; dialog.setAttribute('aria-busy', String(busy())); }
  function refresh() {
    $('#letter-instruction').textContent = t(activeMessage, 'A little letter, made with care.');
    const feedback = $('#letter-feedback'); if (feedback.dataset.message) feedback.textContent = t(feedback.dataset.message, feedback.textContent);
  }
  function run() { controller?.abort(); controller = new AbortController(); return controller.signal; }
  const move = (element, frames, duration, signal) => animate(element, frames, duration, { reduced: motion.matches, signal });
  function clearVisuals() {
    $('#letter-feedback').textContent = ''; delete $('#letter-feedback').dataset.message;
    $('#letter-copy-text').hidden = true; $('#letter-copy-text').value = '';
    foldLayer.replaceChildren(); foldLayer.hidden = true; bird.hidden = true; $('#pigeon-cargo').setAttribute('opacity', '0');
    stampTool.style.transform = ''; stampTool.style.opacity = ''; stampTool.hidden = false;
    envelope.style.transform = ''; envelope.style.opacity = ''; $('#postal-flap').style.transform = '';
    $('#wax-impression').style.opacity = '0'; $('#postal-mark').style.opacity = '0';
    $('.seal-intro').hidden = false; $('#seal-actions').hidden = false; $('#seal-result').hidden = true;
  }
  function draft() {
    controller?.abort(); drag = null; clearVisuals(); setState('draft');
    form.hidden = false; form.style.visibility = ''; $('#letter-draft-layout').hidden = false; $('#letter-draft-actions').hidden = false;
    $('#sealed-letter').hidden = true; message('letter.draftInstruction');
    if (dialog.open) $('#letter-body').focus({ preventScroll: true });
  }
  function settledEnvelope() {
    clearVisuals(); setState('sealed'); form.hidden = true; form.style.visibility = '';
    $('#letter-draft-layout').hidden = true; $('#letter-draft-actions').hidden = true; $('#sealed-letter').hidden = false;
    wax.style.opacity = '1'; message('stationery.sealInstruction');
  }
  function makeFoldingSheet(rect) {
    const sheet = document.createElement('div'); sheet.className = 'folding-sheet';
    Object.assign(sheet.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    for (let index = 0; index < 3; index++) {
      const strip = document.createElement('div'); strip.className = 'fold-strip';
      Object.assign(strip.style, { top: `${index * rect.height / 3}px`, height: `${rect.height / 3}px`, transformOrigin: index === 0 ? '50% 100%' : '50% 0', zIndex: String(index === 1 ? 1 : 3) });
      const clip = document.createElement('div'); clip.className = 'fold-clip';
      const print = form.cloneNode(true); print.classList.add('fold-print'); print.inert = true;
      for (const node of [print, ...print.querySelectorAll('*')]) { node.removeAttribute('id'); node.removeAttribute('for'); node.removeAttribute('name'); }
      print.querySelectorAll('input,textarea,button').forEach(node => { node.disabled = true; });
      Object.assign(print.style, { width: `${rect.width}px`, height: `${rect.height}px`, top: `${-index * rect.height / 3}px`, visibility: 'visible' });
      clip.append(print); strip.append(clip); sheet.append(strip);
    }
    foldLayer.append(sheet); foldLayer.hidden = false; return sheet;
  }
  async function fold() {
    if (state() !== 'draft') return;
    const subject = $('#letter-subject').value.trim(), body = $('#letter-body').value;
    if (!subject || !body.trim()) { const field = !subject ? $('#letter-subject') : $('#letter-body'); field.setCustomValidity(t('letter.validation', 'Please write a few words.')); field.reportValidity(); return; }
    $('#sealed-subject').textContent = subject;
    $('#letter-mailto').href = `mailto:xidong03@163.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const signal = run(), rect = form.getBoundingClientRect(); clearVisuals(); const sheet = makeFoldingSheet(rect);
    form.style.visibility = 'hidden'; $('#sealed-letter').hidden = false; setState('folding'); wax.style.opacity = '0';
    $('#postal-flap').style.transform = 'rotateX(-180deg)'; envelope.style.opacity = '0'; message('stationery.folding');
    try {
      await move(sheet.children[0], [{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-180deg) translateZ(2px)' }], 700, signal);
      await move(sheet.children[2], [{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(180deg) translateZ(-4px)' }], 700, signal);
      const target = envelope.getBoundingClientRect(), dx = target.left + target.width / 2 - rect.left - rect.width / 2;
      const dy = target.top - 28 - rect.top - rect.height / 2, scale = Math.min(.55, target.width * .8 / rect.width);
      const above = `translate(${dx}px,${dy}px) scale(${scale})`, inside = `translate(${dx}px,${dy + target.height * .72}px) scale(${scale})`;
      message('stationery.inserting');
      await Promise.all([move(sheet, [{ transform: 'translate(0,0) scale(1)' }, { transform: above }], 500, signal), move(envelope, [{ opacity: 0 }, { opacity: 1 }], 500, signal)]);
      await move(sheet, [{ transform: above, opacity: 1 }, { transform: inside, opacity: 0 }], 650, signal); foldLayer.hidden = true;
      await move($('#postal-flap'), [{ transform: 'rotateX(-180deg)' }, { transform: 'rotateX(0deg)' }], 650, signal);
      await move(envelope, [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(180deg)' }], 600, signal);
      if (!motion.matches) await wait(300, signal);
      await move(envelope, [{ transform: 'rotateY(180deg)' }, { transform: 'rotateY(360deg)' }], 600, signal);
      message('stationery.wax'); await move(wax, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.2)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }], 350, signal);
      settledEnvelope(); stampTool.focus({ preventScroll: true });
    } catch (error) { if (!signal.aborted) { console.warn('The paper sequence was shortened.', error.message); settledEnvelope(); } }
  }
  async function fly(signal) {
    setState('flying'); message('stationery.flying'); $('.seal-intro').hidden = true; $('#seal-actions').hidden = true; stampTool.hidden = true; $('#seal-result').hidden = true;
    const rect = envelope.getBoundingClientRect(), size = bird.getBoundingClientRect();
    // Hidden elements have no box; use the matching responsive SVG dimensions.
    const width = size.width || (innerWidth <= 600 ? 180 : 220), height = width * 170 / 220;
    const x = rect.left + rect.width / 2 - width * .47, y = rect.top + rect.height * .57 - height * .88;
    bird.hidden = false; $('#pigeon-cargo').setAttribute('opacity', '0');
    const perched = `translate(${x}px,${y}px) scale(1)`, lifted = `translate(${x + 12}px,${y - 38}px) scale(1)`;
    await move(bird, [{ transform: `translate(${-width - 30}px,${y - 90}px) scale(.85)`, opacity: 0 }, { transform: perched, opacity: 1 }], 1000, signal);
    // Keep the 3D group opaque during pickup; opacity would flatten its two faces.
    await Promise.all([move(envelope, [{ transform: 'rotateY(180deg) scale(1)' }, { transform: 'rotateY(180deg) translateY(-32px) scale(.13)' }], 550, signal), move(bird, [{ transform: perched }, { transform: lifted }], 550, signal)]);
    envelope.style.opacity = '0';
    $('#pigeon-cargo').setAttribute('opacity', '1');
    await move(bird, [{ transform: lifted, opacity: 1 }, { transform: `translate(${innerWidth * .76}px,${Math.max(20, y - 150)}px) scale(.8) rotate(-7deg)`, opacity: 1, offset: .48 }, { transform: `translate(${innerWidth + width}px,${-height}px) scale(.5) rotate(-17deg)`, opacity: 0 }], 1750, signal);
    bird.hidden = true; setState('dispatched'); $('#seal-result').hidden = false; message('stationery.departed');
    $('#letter-mailto').focus({ preventScroll: true });
  }
  async function stamp() {
    if (state() !== 'sealed') return;
    const signal = run(); setState('stamping'); message('stationery.stamping');
    const a = stampTool.getBoundingClientRect(), b = wax.getBoundingClientRect();
    const computed = getComputedStyle(stampTool).transform, translation = computed === 'none' ? { m41: 0, m42: 0 } : new DOMMatrix(computed);
    const dx = b.left + b.width / 2 - a.left - a.width / 2 + translation.m41;
    const dy = b.top + b.height / 2 - a.top - a.height * .91 + translation.m42;
    const above = `translate(${dx}px,${dy - 28}px)`, pressed = `translate(${dx}px,${dy + 4}px) scale(.95)`;
    try {
      await move(stampTool, [{ transform: stampTool.style.transform || 'translate(0,0)' }, { transform: above }], 450, signal);
      await move(stampTool, [{ transform: above }, { transform: pressed }], 220, signal);
      await move($('#wax-impression'), [{ opacity: 0 }, { opacity: 1 }], 200, signal);
      $('#letter-post-date').textContent = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Singapore', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()).toUpperCase();
      $('#postal-mark').style.opacity = '1';
      await move(stampTool, [{ transform: pressed, opacity: 1 }, { transform: 'translate(0,0)', opacity: 0 }], 450, signal);
      await move(envelope, [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(180deg)' }], 600, signal);
      if (!motion.matches) await wait(350, signal); await fly(signal);
    } catch (error) { if (!signal.aborted) { console.warn('The sealing sequence was shortened.', error.message); settledEnvelope(); } }
  }
  form.addEventListener('submit', event => { event.preventDefault(); fold(); });
  $('#letter-body').addEventListener('input', event => { $('#letter-count').value = `${event.target.value.length} / 2000`; });
  for (const selector of ['#letter-subject', '#letter-body']) $(selector).addEventListener('input', event => event.target.setCustomValidity(''));
  for (const selector of ['#letter-edit', '#letter-edit-again']) $(selector).addEventListener('click', draft);
  $('#letter-stamp').addEventListener('click', stamp);
  $('#letter-replay').addEventListener('click', async () => {
    if (state() !== 'dispatched') return;
    envelope.style.opacity = '1'; envelope.style.transform = 'rotateY(180deg)'; const signal = run();
    try { await fly(signal); } catch { if (!signal.aborted) settledEnvelope(); }
  });
  stampTool.addEventListener('pointerdown', event => {
    if (state() !== 'sealed' || event.button !== 0 || !event.isPrimary) return;
    event.preventDefault(); stampTool.getAnimations().forEach(animation => animation.cancel()); stampTool.focus({ preventScroll: true });
    stampTool.style.transform = 'translate(0,0)'; drag = { x: event.clientX, y: event.clientY, id: event.pointerId };
    stampTool.setPointerCapture(event.pointerId);
  });
  stampTool.addEventListener('pointermove', event => {
    if (drag?.id === event.pointerId) stampTool.style.transform = `translate(${event.clientX - drag.x}px,${event.clientY - drag.y}px)`;
  });
  function release(event, cancel = false) {
    if (drag?.id !== event.pointerId) return;
    drag = null; if (stampTool.hasPointerCapture(event.pointerId)) stampTool.releasePointerCapture(event.pointerId);
    const a = stampTool.getBoundingClientRect(), b = wax.getBoundingClientRect();
    if (!cancel && Math.hypot(a.left + a.width / 2 - b.left - b.width / 2, a.top + a.height * .91 - b.top - b.height / 2) < Math.max(42, b.width * 1.15)) stamp();
    else animate(stampTool, [{ transform: stampTool.style.transform }, { transform: 'translate(0,0)' }], 250, { reduced: motion.matches }).catch(() => {});
  }
  stampTool.addEventListener('pointerup', event => release(event));
  stampTool.addEventListener('pointercancel', event => release(event, true));
  stampTool.addEventListener('lostpointercapture', event => release(event, true));
  stampTool.addEventListener('click', event => { if (event.detail === 0) stamp(); });
  $('#letter-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(text()); $('#letter-feedback').dataset.message = 'letter.copied'; }
    catch { const field = $('#letter-copy-text'); field.value = text(); field.hidden = false; field.focus(); field.select(); $('#letter-feedback').dataset.message = 'letter.manual'; }
    refresh();
  });
  dialog.addEventListener('close', () => {
    controller?.abort(); drag = null;
    if (state() === 'folding') draft(); else if (state() === 'stamping' || state() === 'flying') settledEnvelope();
  });
  motion.addEventListener('change', event => { if (event.matches && busy()) { controller?.abort(); settledEnvelope(); } });
  refresh(); return { refresh };
}
