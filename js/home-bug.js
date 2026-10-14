/* Original wireframe crawler inspired by rybinfx's Web Crawlers.
 * Words are painted in a separate layer; links, text and layout are never rewritten.
 */
const $ = selector => document.querySelector(selector);
const layer = $('#homepage-bug-layer'), canvas = $('#homepage-bug-canvas');
const ctx = canvas?.getContext('2d'), damageLayer = $('#homepage-bug-damage'), pigeon = $('#homepage-bug-pigeon');
const summon = $('#bug-summon'), fix = $('#bug-fix'), status = $('#homepage-bug-status');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const t = key => window.SitePreferences?.t(key) ?? key;
const random = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const mix = (a, b, value) => a + (b - a) * value;
const ease = value => value < .5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
const cubic = (a, b, c, d, value) => (1 - value) ** 3 * a + 3 * (1 - value) ** 2 * value * b + 3 * (1 - value) * value ** 2 * c + value ** 3 * d;
let state = 'idle', frameId = 0, lastTime = 0, clock = 0, dirty = true, target = null, nextAttack = 0, phaseStart = 0;
let messageKey = '', capture = null, bird = null;
const wounds = [], bug = { x: 0, y: 0, angle: 0, scale: 1, legs: [] };
const canHighlight = Boolean(globalThis.Highlight && globalThis.CSS?.highlights);
const highlight = canHighlight ? new Highlight() : null;
function setState(value, message) {
  state = value; document.documentElement.dataset.bugState = value;
  summon.setAttribute('aria-pressed', String(value === 'rampaging'));
  summon.disabled = ['rescuing', 'restoring'].includes(value); fix.disabled = value !== 'rampaging';
  if (message) { messageKey = message; status.textContent = t(message); }
}
function resize() {
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(innerWidth * ratio); canvas.height = Math.round(innerHeight * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0); dirty = true;
  if (state === 'rampaging' || (state === 'rescuing' && (bird.reduced || clock - phaseStart < 1400))) {
    bug.x = clamp(bug.x, 25, innerWidth - 25); bug.y = clamp(bug.y, 45, innerHeight - 35); resetLegs();
  }
  if (state === 'rescuing') {
    bird.width = innerWidth < 600 ? 155 : 210; pigeon.style.setProperty('--bug-bird-width', `${bird.width}px`);
    if (bird.reduced || clock - phaseStart < 1400) {
      const head = rotated(0, -17);
      Object.assign(capture, { x: head.x - bird.width * 211 / 220, y: head.y - bird.width * 61 / 220, bugX: bug.x, bugY: bug.y, bugAngle: bug.angle });
    } else {
      capture.x = clamp(capture.x, -bird.width * .75, innerWidth - bird.width * .7);
      capture.y = clamp(capture.y, 20, innerHeight - bird.width * .9);
    }
  }
}
function requestFrame() { if (!frameId && state !== 'idle' && !document.hidden) frameId = requestAnimationFrame(frame); }
function clearWounds() {
  wounds.splice(0).forEach(wound => wound.node.remove()); highlight?.clear();
  if (canHighlight) CSS.highlights.delete('homepage-bug');
}
function finish() {
  cancelAnimationFrame(frameId); frameId = 0; clearWounds();
  target = null; capture = null; bird = null; pigeon.hidden = true; layer.hidden = true;
  ctx.clearRect(0, 0, innerWidth, innerHeight); lastTime = 0; setState('idle', 'bug.done');
  if (document.activeElement === fix) summon.focus({ preventScroll: true });
}
function candidate() {
  const choices = [], top = $('.home-preferences').getBoundingClientRect().bottom + 16;
  const roots = [...document.querySelectorAll('.posts .post:not(#visitors), .sidebar .brand-title, .sidebar .brand-tagline')];
  const segmenter = globalThis.Intl?.Segmenter ? new Intl.Segmenter(document.documentElement.lang, { granularity: 'word' }) : null;
  for (const root of roots) {
    const bounds = root.getBoundingClientRect();
    if (bounds.bottom < 15 || bounds.top > innerHeight - 15) continue;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.textContent.trim() || node.parentElement.closest('script,style,button,input,textarea,dialog,[aria-hidden="true"],.visitor-map,.publication>a')) continue;
      const words = segmenter ? [...segmenter.segment(node.textContent)].filter(word => word.isWordLike && word.segment.length >= 2).map(word => ({ text: word.segment, index: word.index })) : [...node.textContent.matchAll(/[\p{L}\p{N}][\p{L}\p{N}.'-]+/gu)].map(word => ({ text: word[0], index: word.index }));
      for (const word of words) {
        if (word.text.length > 35 || wounds.some(wound => wound.range.startContainer === node && wound.range.startOffset === word.index)) continue;
        const range = document.createRange(); range.setStart(node, word.index); range.setEnd(node, word.index + word.text.length);
        const rects = range.getClientRects(), rect = rects[0];
        if (rects.length !== 1 || !rect || rect.width < 12 || rect.height > 65 || rect.left < 8 || rect.right > innerWidth - 8 || rect.top < Math.max(12, top) || rect.bottom > innerHeight - 18) continue;
        choices.push({ range, text: word.text, element: node.parentElement });
      }
    }
  }
  if (!choices.length) return null;
  // Prefer nearby words, with enough randomness to roam through the visible page.
  const sample = choices.sort(() => Math.random() - .5).slice(0, 22);
  sample.sort((a, b) => { const ar = a.range.getBoundingClientRect(), br = b.range.getBoundingClientRect(); return Math.hypot(ar.x - bug.x, ar.y - bug.y) - Math.hypot(br.x - bug.x, br.y - bug.y); });
  return sample[Math.floor(random(0, Math.min(4, sample.length)))];
}
function paperColor(element) {
  for (let node = element; node; node = node.parentElement) {
    const color = getComputedStyle(node).backgroundColor;
    if (color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)') return color;
  }
  return getComputedStyle(document.body).backgroundColor;
}
function woundAt(choice) {
  if (!choice.range.startContainer.isConnected) return;
  const rect = choice.range.getBoundingClientRect(), style = getComputedStyle(choice.element);
  const node = document.createElement('div'); node.className = 'bug-wound';
  Object.assign(node.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
  const word = document.createElement('span'); word.className = 'bug-word'; word.textContent = choice.text;
  word.style.font = style.font; word.style.lineHeight = `${rect.height}px`;
  const hue = [190, 315, 265, 25][Math.floor(random(0, 4))], kind = Math.floor(random(0, 4)), filled = Math.random() < .55;
  const values = {
    '--bug-paper': paperColor(choice.element), '--bug-original-ink': style.color, '--bug-original-spacing': style.letterSpacing,
    '--bug-ink': filled ? '#142332' : `hsl(${hue} 85% 48%)`, '--bug-fill': filled ? `hsl(${hue} 95% 64%)` : 'transparent',
    '--bug-border': `hsl(${hue} 85% 62%)`, '--bug-glow': `hsl(${hue} 85% 65% / .15)`,
    '--bug-x': `${reduced.matches ? 0 : random(-18, 24)}px`, '--bug-y': `${reduced.matches ? 0 : random(-16, 24)}px`,
    '--bug-turn': `${reduced.matches ? random(-6, 6) : kind === 1 ? random(45, 82) : random(-24, 24)}deg`,
    '--bug-skew': `${reduced.matches ? 0 : random(-15, 15)}deg`, '--bug-scale': String(reduced.matches ? 1.08 : kind === 2 ? random(1.6, 2.25) : random(.8, 1.4)),
    '--bug-spacing': `${kind === 3 && !reduced.matches ? random(2, 4) : 0}px`,
  };
  for (const [name, value] of Object.entries(values)) node.style.setProperty(name, value);
  if (canHighlight) { highlight.add(choice.range); CSS.highlights.set('homepage-bug', highlight); }
  else { const cover = document.createElement('span'); cover.className = 'bug-cover'; node.append(cover); }
  node.append(word); damageLayer.append(node); wounds.push({ ...choice, node });
  if (!reduced.matches) {
    const final = getComputedStyle(word);
    word.animate([
      { transform: 'none', color: style.color, backgroundColor: 'transparent', outlineColor: 'transparent', letterSpacing: style.letterSpacing },
      { transform: final.transform, color: final.color, backgroundColor: final.backgroundColor, outlineColor: final.outlineColor, letterSpacing: final.letterSpacing },
    ], { duration: 600, easing: 'cubic-bezier(.2,.75,.3,1)' });
  }
  if (wounds.length > 36) { const old = wounds.shift(); highlight?.delete(old.range); old.node.remove(); }
  dirty = true;
}
function placeWounds() {
  const boxes = wounds.map(wound => ({ wound, rect: wound.range.getBoundingClientRect() }));
  for (const { wound, rect } of boxes) {
    const visible = wound.range.startContainer.isConnected && rect.width > 0 && rect.bottom > -80 && rect.top < innerHeight + 80;
    wound.node.hidden = !visible;
    if (visible) Object.assign(wound.node.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
  }
  dirty = false;
}
function rotated(x, y) { return { x: bug.x + Math.cos(bug.angle) * x - Math.sin(bug.angle) * y, y: bug.y + Math.sin(bug.angle) * x + Math.cos(bug.angle) * y }; }
function legRest(index) {
  const side = index < 4 ? -1 : 1, row = index % 4;
  return rotated(side * (72 + Math.sin(row * 1.4) * 22), (row - 1.5) * 43);
}
function resetLegs() { bug.legs = Array.from({ length: 8 }, (_, index) => ({ ...legRest(index), from: null, to: null, start: 0 })); }
function drawBug(delta) {
  const dark = document.documentElement.dataset.theme === 'dark', wire = dark ? '#3de5ff' : '#087fa8', joint = '#f45598';
  ctx.strokeStyle = wire; ctx.lineWidth = 1.55; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const carried = state === 'rescuing' && (bird?.reduced || clock - phaseStart >= 1400);
  for (let index = 0; index < 8; index++) {
    const side = index < 4 ? -1 : 1, row = index % 4, root = rotated(side * 6 * bug.scale, (row - 1.5) * 7 * bug.scale), leg = bug.legs[index];
    let foot;
    if (carried) {
      const fold = bird?.reduced ? 1 : clamp((clock - phaseStart - 1400) / 450, 0, 1);
      foot = rotated(side * mix(75, 24, ease(fold)) * bug.scale, (row - 1.5) * mix(40, 13, ease(fold)) * bug.scale);
    } else {
      const rest = legRest(index);
      if (!reduced.matches && state === 'rampaging' && !leg.to && Math.hypot(rest.x - leg.x, rest.y - leg.y) > 24 && Math.sin(clock / 180 + index * 2.4) > -.1) { leg.from = { x: leg.x, y: leg.y }; leg.to = rest; leg.start = clock; }
      if (leg.to) { const step = clamp((clock - leg.start) / 210, 0, 1); leg.x = mix(leg.from.x, leg.to.x, ease(step)); leg.y = mix(leg.from.y, leg.to.y, ease(step)) - Math.sin(step * Math.PI) * 6; if (step === 1) leg.to = null; }
      foot = leg;
    }
    const dx = foot.x - root.x, dy = foot.y - root.y, length = Math.hypot(dx, dy) || 1;
    const elbow = { x: root.x + dx * .25 + dy / length * side * 14 * bug.scale, y: root.y + dy * .25 - dx / length * side * 14 * bug.scale };
    const knee = { x: root.x + dx * .65 - dy / length * side * 16 * bug.scale, y: root.y + dy * .65 + dx / length * side * 16 * bug.scale };
    ctx.beginPath(); ctx.moveTo(root.x, root.y); ctx.lineTo(elbow.x, elbow.y); ctx.lineTo(knee.x, knee.y); ctx.lineTo(foot.x, foot.y); ctx.stroke();
    ctx.fillStyle = joint;
    for (const point of [elbow, knee, foot]) { ctx.beginPath(); ctx.arc(point.x, point.y, 2.4 * bug.scale, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.save(); ctx.translate(bug.x, bug.y); ctx.rotate(bug.angle); ctx.scale(bug.scale, bug.scale);
  ctx.fillStyle = dark ? '#111d24' : '#f4f2eb'; ctx.strokeStyle = wire; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.rect(-6, -17, 12, 32); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ed5797'; ctx.beginPath(); ctx.arc(0, -9, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function attack(delta) {
  if (document.querySelector('dialog[open]')) return;
  if (target) {
    const rect = target.range.getBoundingClientRect();
    if (!target.range.startContainer.isConnected || rect.bottom < 15 || rect.top > innerHeight - 15) target = null;
    else {
      const x = clamp(rect.left + rect.width / 2, 30, innerWidth - 30), y = clamp(rect.top + rect.height / 2 + 25, 45, innerHeight - 35);
      const dx = x - bug.x, dy = y - bug.y, distance = Math.hypot(dx, dy);
      if (reduced.matches) { bug.x = x; bug.y = y; resetLegs(); }
      else if (distance > 3) {
        const speed = Math.min(distance, delta * 230); bug.x += dx / distance * speed; bug.y += dy / distance * speed;
        const heading = Math.atan2(dy, dx) + Math.PI / 2, angle = Math.atan2(Math.sin(heading - bug.angle), Math.cos(heading - bug.angle)); bug.angle += angle * Math.min(1, delta * 5);
      }
      if ((distance < 16 || reduced.matches) && clock >= nextAttack) { woundAt(target); target = null; nextAttack = clock + 350; }
    }
  }
  if (!target && clock >= nextAttack) { target = candidate(); if (!target) nextAttack = clock + 700; }
}
function rescue() {
  const elapsed = clock - phaseStart, width = bird.width;
  if (bird.reduced) {
    pigeon.style.transform = `translate(${capture.x}px,${capture.y}px)`;
    bug.x = capture.x + width * 211 / 220; bug.y = capture.y + width * 61 / 220 + 9;
    bug.angle = 0; bug.scale = .6;
    if (elapsed >= 350) finish();
    return;
  }
  let x, y, scale = 1;
  if (elapsed < 1400) {
    const progress = ease(elapsed / 1400);
    x = cubic(-width - 60, innerWidth * .1, capture.x - 120, capture.x, progress);
    y = cubic(Math.max(30, capture.y - 170), capture.y - 180, capture.y - 40, capture.y, progress);
  } else if (elapsed < 1850) {
    const progress = ease((elapsed - 1400) / 450); x = capture.x; y = capture.y - progress * 18;
    bug.x = mix(capture.bugX, x + width * 211 / 220, progress); bug.y = mix(capture.bugY, y + width * 61 / 220 + 9, progress);
    bug.angle = mix(capture.bugAngle, 0, progress); bug.scale = mix(1, .6, progress);
  } else {
    const progress = ease(clamp((elapsed - 1850) / 1800, 0, 1)); scale = mix(1, .68, progress);
    x = cubic(capture.x, capture.x + 140, innerWidth + 30, innerWidth + width, progress);
    y = cubic(capture.y - 18, capture.y - 100, 25, -width, progress);
    bug.x = x + width * 211 / 220 * scale; bug.y = y + width * 61 / 220 * scale + 9 * scale; bug.scale = .6 * scale;
  }
  pigeon.style.transform = `translate(${x}px,${y}px) scale(${scale})`;
  if (elapsed >= 3650) startRestoring();
}
function startRestoring() {
  pigeon.hidden = true; bird = null; setState('restoring', 'bug.restoring'); phaseStart = clock;
  for (const wound of wounds) wound.node.classList.add('is-restoring');
}
function startBug() {
  if (state !== 'idle') { if (state === 'rampaging') { target = null; nextAttack = clock; } return; }
  resize(); layer.hidden = false; pigeon.hidden = true; clock = 0; lastTime = 0; nextAttack = 0;
  const button = summon.getBoundingClientRect(); bug.x = clamp(button.left + button.width / 2, 40, innerWidth - 40); bug.y = clamp(button.bottom + 35, 45, innerHeight - 45); bug.angle = Math.PI; bug.scale = 1; resetLegs();
  setState('rampaging', 'bug.active'); requestFrame();
}
function startFix() {
  if (state !== 'rampaging') return;
  target = null;
  const width = innerWidth < 600 ? 155 : 210, head = rotated(0, -17);
  bird = { width, reduced: reduced.matches }; capture = { x: head.x - width * 211 / 220, y: head.y - width * 61 / 220, bugX: bug.x, bugY: bug.y, bugAngle: bug.angle };
  pigeon.style.setProperty('--bug-bird-width', `${width}px`); pigeon.hidden = false; phaseStart = clock;
  setState('rescuing', 'bug.rescue'); requestFrame();
}
function frame(now) {
  frameId = 0;
  const delta = lastTime ? Math.min((now - lastTime) / 1000, .05) : 1 / 60; lastTime = now; clock += delta * 1000;
  if (dirty) placeWounds(); ctx.clearRect(0, 0, innerWidth, innerHeight);
  if (state === 'rampaging') attack(delta); else if (state === 'rescuing') rescue();
  if (state === 'rampaging' || state === 'rescuing') drawBug(delta);
  if (state === 'restoring' && clock - phaseStart >= 650) { finish(); return; }
  requestFrame();
}
if (ctx && layer && summon && fix && pigeon) {
  summon.addEventListener('click', startBug); fix.addEventListener('click', startFix);
  window.addEventListener('scroll', () => { dirty = true; requestFrame(); }, { passive: true });
  window.addEventListener('resize', () => { resize(); requestFrame(); });
  window.addEventListener('xw:languagechange', () => { clearWounds(); target = null; nextAttack = clock; dirty = true; if (messageKey) status.textContent = t(messageKey); requestFrame(); });
  window.addEventListener('xw:themechange', () => { for (const wound of wounds) { wound.node.style.setProperty('--bug-paper', paperColor(wound.element)); wound.node.style.setProperty('--bug-original-ink', getComputedStyle(wound.element).color); } requestFrame(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !event.defaultPrevented && !document.querySelector('dialog[open]')) startFix(); });
  document.addEventListener('visibilitychange', () => { cancelAnimationFrame(frameId); frameId = 0; lastTime = 0; if (!document.hidden) { dirty = true; requestFrame(); } });
  window.addEventListener('pagehide', finish);
  reduced.addEventListener('change', event => { if (event.matches && state !== 'idle') finish(); });
  $('#bug-controls').hidden = false; setState('idle');
}
