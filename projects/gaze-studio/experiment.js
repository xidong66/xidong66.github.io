'use strict';

const experimentTasks = {
  horizontal: {
    points: [[25, 50], [75, 50]], sequence: [0, 1], line: true, dwell: 600,
    zones: [[5, 25, 45, 75], [55, 25, 95, 75]],
  },
  triangle: {points: [[26, 24], [79, 69], [21, 77]], sequence: [0, 1, 1, 2, 2, 0], line: true},
  quadrilateral: {points: [[22, 24], [78, 24], [78, 76], [22, 76]], sequence: [0, 1, 1, 2, 2, 3, 3, 0], line: true},
  fixed: {points: [[25, 25], [75, 25], [25, 75], [75, 75]], sequence: [0, 1, 3, 2, 0]},
  fixation: {points: [[22, 24], [49, 24], [78, 24], [22, 76], [49, 76], [78, 76]], sequence: [0, 4, 2, 3, 1, 5]},
};

const experimentProtocol = {
  shapeLimitMs: 60000,
  toleranceFraction: .05,
  settleMs: 500,
  fixationMs: 2000,
  minFixationSamples: 5,
};

function experimentPointError(target, actual, bounds) {
  return Math.hypot((actual[0] - target[0]) * bounds.width / 100, (actual[1] - target[1]) * bounds.height / 100);
}

function experimentFixationStats(target, samples, bounds) {
  if (!samples.length) return {count: 0};
  const mean = [0, 1].map(axis => samples.reduce((sum, sample) => sum + sample.point[axis], 0) / samples.length);
  const jitter = samples.reduce((sum, sample) => sum + experimentPointError(mean, sample.point, bounds), 0) / samples.length;
  return {count: samples.length, mean, error: experimentPointError(target, mean, bounds), jitter};
}

function makeExperimentCsv(trials) {
  const columns = [
    'protocol', 'trial_id', 'participant_id', 'task', 'input', 'trial_start_utc', 'status', 'task_success',
    'duration_ms', 'time_limit_ms', 'dwell_ms', 'canvas_width_css_px', 'canvas_height_css_px', 'tolerance_css_px',
    'tolerance_diagonal_pct', 'fixation_window_ms', 'fixation_settle_ms', 'min_fixation_samples', 'planned_steps', 'accepted_steps',
    'wrong_selections', 'mean_endpoint_error_css_px', 'row_type', 'step', 'edge', 'endpoint', 'target_label', 'region',
    'target_x_pct', 'target_y_pct', 'actual_x_pct', 'actual_y_pct', 'actual_label', 'offset_x_css_px',
    'offset_y_css_px', 'error_css_px', 'error_diagonal_pct', 'jitter_css_px', 'sample_count', 'within_tolerance',
    'event_ms', 'step_ms', 'outcome', 'minimum_dwell_ms', 'extra_time_ms',
  ];
  const round = value => Number.isFinite(value) ? Number(value.toFixed(3)) : '';
  const escape = value => '"' + String(value ?? '').replaceAll('"', '""') + '"';
  const rows = [columns];
  for (const trial of trials) {
    const {width, height} = trial.bounds;
    const diagonal = Math.hypot(width, height);
    const task = experimentTasks[trial.task];
    const minimumDwell = trial.task === 'horizontal' ? task.sequence.length * trial.dwell : undefined;
    const base = {
      protocol: 'gaze-studio-v1', trial_id: trial.id, participant_id: trial.participant, task: trial.task,
      input: trial.input, trial_start_utc: trial.utc, status: trial.status, task_success: trial.success,
      duration_ms: round(trial.duration), time_limit_ms: trial.limit, dwell_ms: trial.dwell,
      canvas_width_css_px: round(width), canvas_height_css_px: round(height), tolerance_css_px: round(trial.tolerance),
      tolerance_diagonal_pct: trial.tolerance == null ? '' : experimentProtocol.toleranceFraction * 100,
      fixation_window_ms: trial.task === 'fixation' ? experimentProtocol.fixationMs : '',
      fixation_settle_ms: trial.task === 'fixation' ? experimentProtocol.settleMs : '',
      min_fixation_samples: trial.task === 'fixation' ? experimentProtocol.minFixationSamples : '',
      planned_steps: task.sequence.length, accepted_steps: trial.accepted, wrong_selections: trial.wrong,
      mean_endpoint_error_css_px: round(trial.meanError),
    };
    const addRow = details => rows.push(columns.map(column => details[column] ?? base[column]));
    addRow({row_type: 'trial', minimum_dwell_ms: round(minimumDwell),
      extra_time_ms: trial.status === 'complete' ? round(trial.duration - minimumDwell) : ''});
    for (const event of trial.events) {
      const target = task.points[event.target];
      const [x, y] = event.point ?? [];
      const [tx, ty] = target;
      addRow({
        row_type: event.type, step: event.step + 1,
        edge: task.line ? Math.floor(event.step / 2) + 1 : '', endpoint: task.line ? (event.step % 2 ? 'end' : 'start') : '',
        target_label: trial.task === 'fixed' ? event.target + 1 : String.fromCharCode(65 + event.target),
        region: (ty < 50 ? 'upper-' : 'lower-') + (tx < 40 ? 'left' : tx > 60 ? 'right' : 'center'),
        target_x_pct: tx, target_y_pct: ty, actual_x_pct: round(x), actual_y_pct: round(y),
        actual_label: event.actual == null ? '' : event.actual + 1,
        offset_x_css_px: minimumDwell === undefined ? round((x - tx) * width / 100) : '',
        offset_y_css_px: minimumDwell === undefined ? round((y - ty) * height / 100) : '',
        error_css_px: round(event.error), error_diagonal_pct: round(event.error / diagonal * 100),
        jitter_css_px: round(event.jitter), sample_count: event.count, within_tolerance: event.within,
        event_ms: round(event.time), step_ms: round(event.stepTime), outcome: event.outcome,
      });
    }
  }
  return rows.map(row => row.map(escape).join(',')).join('\r\n') + '\r\n';
}

const experiment = (() => {
  const panel = document.querySelector('#experiment-controls');
  const taskInput = panel.querySelector('#experiment-task');
  const participant = panel.querySelector('#experiment-participant');
  const start = panel.querySelector('#experiment-start');
  const end = panel.querySelector('#experiment-end');
  const download = panel.querySelector('#experiment-export');
  const instructions = panel.querySelector('#experiment-instructions');
  const results = document.querySelector('#experiment-results');
  const markers = document.querySelector('#experiment-markers');
  const drawing = document.querySelector('#experiment-ink');
  const storage = 'bn5213-gaze-experiment-v1';
  let trials = [];
  let current = null;
  let reviewed = null;
  let timer;
  let inputMode = null;
  let visible = false;
  try {
    const saved = JSON.parse(localStorage.getItem(storage) || '[]');
    if (Array.isArray(saved)) trials = saved.filter(trial =>
      trial && Object.hasOwn(experimentTasks, trial.task) && Array.isArray(trial.events) && trial.bounds?.width > 0 && trial.bounds?.height > 0);
  } catch { /* Experiment can still be run and downloaded in this tab. */ }

  const kind = () => taskInput.value;
  const horizontal = () => kind() === 'horizontal';
  const config = () => experimentTasks[kind()];
  const shape = () => config().line;
  const active = () => current !== null;
  const label = index => kind() === 'fixed' ? String(index + 1) : String.fromCharCode(65 + index);
  const target = () => config().sequence[current?.step ?? 0];

  function sync(nextVisible, nextInput) {
    visible = nextVisible;
    inputMode = nextInput;
    panel.hidden = markers.hidden = !visible;
    drawing.toggleAttribute('hidden', !visible);
    results.hidden = !visible || !results.textContent;
    participant.disabled = taskInput.disabled = Boolean(current);
    start.disabled = Boolean(current) || !inputMode || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,23}$/.test(participant.value.trim());
    end.disabled = !current;
    download.disabled = Boolean(current) || !trials.length;
    if (!current) {
      const taskNote = horizontal() ? 'Hold in A, then B. Each area needs a 0.6 s hold. Timing starts when you press Start trial.' :
        shape() ? 'Follow the highlighted vertex for each endpoint. At a shared vertex, keep looking to start the next edge. Snap is off.' :
        kind() === 'fixed' ? 'Hold on the highlighted numbered area. Incorrect selections are counted; keep trying the highlighted area.' :
        'Look at each dot until the next one appears. Each dot lasts 2.5 seconds.';
      instructions.textContent = taskNote + (inputMode ? ' Start when ready.' : ' Calibrate eye tracking here, or use mouse mode for practice.');
    }
  }

  function line(parent, from, to, className) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    for (const [key, value] of Object.entries({x1: from[0], y1: from[1], x2: to[0], y2: to[1], class: className})) {
      element.setAttribute(key, value);
    }
    parent.append(element);
  }

  function render(fixedTargets) {
    markers.replaceChildren();
    drawing.replaceChildren();
    const task = config();
    const selected = current ? target() : -1;
    fixedTargets.forEach((element, index) => element.classList.toggle('experiment-expected', visible && kind() === 'fixed' && index === selected));
    if (!visible) return;
    if (shape()) {
      const edgeCount = task.sequence.length / 2;
      for (let i = 0; i < edgeCount; i++) {
        line(drawing, task.points[task.sequence[i * 2]], task.points[task.sequence[i * 2 + 1]], 'experiment-reference');
      }
      const endpoints = (current ?? reviewed)?.events.filter(event => event.type === 'endpoint') ?? [];
      const drawnPoint = event => horizontal() ? task.points[event.target] : event.point;
      for (let i = 1; i < endpoints.length; i += 2) line(drawing, drawnPoint(endpoints[i - 1]), drawnPoint(endpoints[i]), 'experiment-stroke');
    } else if (kind() === 'fixed') {
      const chosen = (current ?? reviewed)?.events.filter(event => event.type === 'selection' && event.outcome === 'correct') ?? [];
      for (let i = 1; i < chosen.length; i++) line(drawing, task.points[chosen[i - 1].target], task.points[chosen[i].target], 'experiment-stroke');
      return;
    }
    task.points.forEach(([x, y], index) => {
      if (kind() === 'fixation' && index !== selected) return;
      if (horizontal()) {
        const [left, top, right, bottom] = task.zones[index];
        const zone = document.createElement('span');
        zone.className = 'experiment-zone' + (index === selected ? ' current' : '');
        Object.assign(zone.style, {left: left + '%', top: top + '%', width: (right - left) + '%', height: (bottom - top) + '%'});
        markers.append(zone);
      }
      const marker = document.createElement('span');
      marker.className = 'experiment-marker' + (index === selected ? ' current' : '') + (kind() === 'fixation' ? ' fixation' : '');
      marker.style.left = x + '%';
      marker.style.top = y + '%';
      marker.textContent = kind() === 'fixation' ? '' : label(index);
      markers.append(marker);
    });
  }

  function prompt(now) {
    const step = current.step;
    current.stepStarted = now;
    if (horizontal()) return step === 0 ? 'Hold in A to select the start.' : 'Hold in B to finish the line.';
    const part = shape() ? (step % 2 ? 'end' : 'start') + ' of edge ' + (Math.floor(step / 2) + 1) : 'target ' + (step + 1) + ' of ' + config().sequence.length;
    return 'Look at ' + label(target()) + ' · ' + part + '.';
  }

  function begin(bounds, now, dwell) {
    if (start.disabled) return false;
    const utc = new Date().toISOString();
    reviewed = null;
    current = {
      id: globalThis.crypto.randomUUID(), utc, participant: participant.value.trim(), task: kind(), input: inputMode,
      bounds, start: now, step: 0, limit: kind() === 'fixation'
        ? config().sequence.length * (experimentProtocol.settleMs + experimentProtocol.fixationMs)
        : experimentProtocol.shapeLimitMs,
      dwell: kind() === 'fixation' ? null : dwell,
      tolerance: shape() && !horizontal() ? Math.hypot(bounds.width, bounds.height) * experimentProtocol.toleranceFraction : null,
      events: [], samples: [], wrong: 0,
    };
    results.textContent = '';
    sync(visible, inputMode);
    return prompt(now);
  }

  function finish(status, now) {
    if (!current) return '';
    clearTimeout(timer);
    const {start: started, step, stepStarted, samples, ...trial} = current;
    if (trial.task === 'fixation' && status !== 'complete' && samples.length) {
      const result = experimentFixationStats(config().points[target()], samples, trial.bounds);
      trial.events.push({type: 'fixation', step, target: target(), point: result.mean, error: result.error,
        jitter: result.jitter, count: result.count, time: now - started, stepTime: now - stepStarted, outcome: 'interrupted'});
    }
    trial.status = status;
    trial.duration = now - started;
    trial.accepted = step;
    const endpoints = trial.events.filter(event => event.type === 'endpoint');
    if (shape() && !horizontal() && endpoints.length) {
      trial.meanError = endpoints.reduce((sum, event) => sum + event.error, 0) / endpoints.length;
    }
    trial.success = status === 'complete' && (shape() && !horizontal() ? endpoints.every(event => event.within) :
      kind() === 'fixation' ? trial.events.every(event => event.outcome === 'valid') : true);
    current = null;
    reviewed = trial;
    trials.push(trial);
    let storageNote = '';
    try { localStorage.setItem(storage, JSON.stringify(trials)); }
    catch { storageNote = ' Download the CSV before closing this tab.'; }
    const time = (trial.duration / 1000).toFixed(horizontal() ? 2 : 1) + ' s';
    const verdict = {complete: trial.success ? 'Complete' : 'Complete · criteria not met', timeout: 'Timed out',
      ended: 'Ended early', interrupted: 'Interrupted'}[status];
    let details = '';
    if (horizontal()) {
      const minimumDwell = config().sequence.length * trial.dwell;
      details = ' · Minimum hold time ' + (minimumDwell / 1000).toFixed(1) + ' s';
      if (trial.success) details += ' · Extra time ' + ((trial.duration - minimumDwell) / 1000).toFixed(2) + ' s';
      details += ' · Missed holds ' + trial.wrong;
    } else if (shape() && endpoints.length) details = ' · Mean endpoint error ' + trial.meanError.toFixed(1) + ' px';
    if (kind() === 'fixed') details = ' · ' + trial.wrong + ' incorrect selections';
    if (kind() === 'fixation') details = ' · ' + trial.events.filter(event => event.outcome === 'valid').length + '/' + config().sequence.length + ' valid targets';
    results.textContent = verdict + ' · ' + time + details + storageNote;
    sync(visible, inputMode);
    return results.textContent;
  }

  function record(type, value, now) {
    const step = current.step;
    const index = target();
    const event = {type, step, target: index, time: now - current.start, stepTime: now - current.stepStarted};
    if (type === 'endpoint') {
      event.point = value;
      if (horizontal()) {
        const [left, top, right, bottom] = config().zones[index];
        const [x, y] = value;
        const hit = x >= left && x <= right && y >= top && y <= bottom;
        event.type = hit ? 'endpoint' : 'endpoint_attempt';
        event.outcome = hit ? 'correct' : 'wrong_target';
      } else {
        event.error = experimentPointError(config().points[index], value, current.bounds);
        event.within = event.error <= current.tolerance;
        event.outcome = event.within ? 'within_tolerance' : 'outside_tolerance';
        if (!event.within) current.wrong++;
      }
    } else if (type === 'selection') {
      event.actual = value;
      event.outcome = value === index ? 'correct' : 'wrong_target';
    } else {
      const result = experimentFixationStats(config().points[index], current.samples, current.bounds);
      Object.assign(event, {point: result.mean, error: result.error, jitter: result.jitter, count: result.count,
        outcome: result.count >= experimentProtocol.minFixationSamples ? 'valid' : 'insufficient_samples'});
      current.samples = [];
    }
    current.events.push(event);
    if (event.outcome === 'wrong_target') {
      current.wrong++;
      return 'Wrong target. Keep looking at ' + label(index) + '.';
    }
    current.step++;
    return current.step === config().sequence.length ? finish('complete', now) : prompt(now);
  }

  function sample(point, now) {
    const elapsed = now - current.stepStarted;
    if (elapsed >= experimentProtocol.settleMs && elapsed < experimentProtocol.settleMs + experimentProtocol.fixationMs) {
      const {left, top, width, height} = current.bounds;
      current.samples.push({point: [(point.x - left) / width * 100, (point.y - top) / height * 100]});
    }
  }

  function deadline() {
    return kind() === 'fixation'
      ? current.stepStarted + experimentProtocol.settleMs + experimentProtocol.fixationMs
      : current.start + current.limit;
  }

  function schedule(onTick) {
    clearTimeout(timer);
    if (current) timer = setTimeout(onTick, Math.max(1, Math.ceil(deadline() - performance.now())));
  }

  function exportCsv() {
    if (!trials.length) return;
    const url = URL.createObjectURL(new Blob(['\uFEFF', makeExperimentCsv(trials)], {type: 'text/csv;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gaze-studio-trials-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function resetReview() {
    reviewed = null;
    results.textContent = '';
    results.hidden = true;
  }

  return {kind, shape, active, sync, render, begin, record, sample, finish, schedule, exportCsv, resetReview,
    horizontal, fixedDwell: () => config().dwell,
    pendingEndpoint: () => current?.step % 2
      ? (horizontal() ? config().points[0] : current.events.findLast(event => event.type === 'endpoint').point) : null,
    bounds: () => current?.bounds, due: now => Boolean(current) && now >= deadline()};
})();
