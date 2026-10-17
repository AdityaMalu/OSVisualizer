/* ---------- OS simulators: pure functions, no DOM, so the content check can run them in Node too.
   Each simulator reads a small text format the reader can edit:
     key: value         settings (algo, quantum, frames, …)
     anything else      data lines
     # …                comment
   run(text) returns { summary:[[label, value]], tables:[TB], gantt?, chart?, keys:{name: value} }.
   Exercises name one of the keys; the reader's answer is compared with the computed value. ---------- */
function parseSim(text){
  const cfg = {}, rows = [];
  String(text).split('\n').forEach((raw, n) => {
    const line = raw.replace(/(^|\s)#.*$/, '').trim();
    if (!line) return;
    const m = line.match(/^([A-Za-z][\w-]*)\s*:\s*(.*)$/);
    if (m && !/^[A-Z]/.test(m[1])) cfg[m[1].toLowerCase()] = m[2].trim();   // settings are lower-case; "A: …" lines are data (threads)
    else rows.push({ line, n: n + 1, f: line.split(/\s+/) });
  });
  return { cfg, rows };
}
const simErr = msg => { throw new Error(msg); };
const num = (v, what) => { const x = Number(v); if (!Number.isFinite(x)) simErr(`${what}: "${v}" is not a number`); return x; };
const int = (v, what, min = 0) => { const x = num(v, what); if (!Number.isInteger(x) || x < min) simErr(`${what} must be a whole number ≥ ${min} (got ${v})`); return x; };
const nums = (s, what) => String(s || '').split(/[\s,]+/).filter(Boolean).map(v => num(v, what));
const r2 = x => Math.round(x * 100) / 100;

/* ---- CPU scheduling ---- */
function simSched(text){
  const { cfg, rows } = parseSim(text);
  const algo = (cfg.algo || 'FCFS').toUpperCase();
  const ALGOS = ['FCFS', 'SJF', 'SRTF', 'PRIO', 'PRIO-P', 'RR', 'HRRN', 'MLFQ'];
  if (!ALGOS.includes(algo)) simErr(`algo must be one of ${ALGOS.join(', ')}`);
  const q = cfg.quantum !== undefined ? int(cfg.quantum, 'quantum', 1) : 2;
  const highWins = /^high/i.test(cfg.priority || '');
  const needPr = algo.startsWith('PRIO');
  if (!rows.length) simErr('add at least one process line: name arrival burst [priority]');
  const P = rows.map((r, i) => {
    const [name, at, bt, pr] = r.f;
    if (r.f.length < 3) simErr(`line ${r.n}: expected "name arrival burst${needPr ? ' priority' : ''}"`);
    if (needPr && pr === undefined) simErr(`line ${r.n}: ${algo} needs a priority column`);
    return { name, at: int(at, `${name} arrival`), bt: int(bt, `${name} burst`, 1), pr: pr === undefined ? null : num(pr, `${name} priority`), i, rem: int(bt, 'burst', 1), start: null, ct: null, lv: 0 };
  });
  if (new Set(P.map(p => p.name)).size !== P.length) simErr('process names must be unique');
  if (P.reduce((s, p) => s + p.bt, 0) + Math.max(...P.map(p => p.at)) > 5000) simErr('keep the total time under 5000 units');
  // MLFQ levels: "2 4 FCFS" = level 0 quantum 2, level 1 quantum 4, last level runs to completion
  const lv = (cfg.levels || '2 4 FCFS').split(/\s+/).map(x => /^fcfs$/i.test(x) ? Infinity : int(x, 'levels', 1));
  const boost = cfg.boost ? int(cfg.boost, 'boost', 1) : 0;
  const segs = [], push = (name, a, b) => { const l = segs[segs.length - 1]; if (l && l[0] === name && l[2] === a) l[2] = b; else segs.push([name, a, b]); };
  const queues = lv.map(() => []), queue = [];
  const arrive = t => P.filter(p => p.at === t).forEach(p => algo === 'MLFQ' ? queues[0].push(p) : queue.push(p));
  const prio = p => highWins ? -p.pr : p.pr;
  const cmp = {
    FCFS: (a, b) => a.at - b.at || a.i - b.i,
    SJF: (a, b) => a.rem - b.rem || a.at - b.at || a.i - b.i,
    PRIO: (a, b) => prio(a) - prio(b) || a.at - b.at || a.i - b.i,
  };
  cmp.SRTF = cmp.SJF; cmp['PRIO-P'] = cmp.PRIO;
  let t = 0, cur = null, slice = 0, done = 0, guard = 0;
  const ready = () => P.filter(p => p.at <= t && p.rem > 0);
  arrive(0);
  while (done < P.length) {
    if (++guard > 20000) simErr('simulation did not finish');
    if (algo === 'RR') { if (!cur) cur = queue.shift() || null; }
    else if (algo === 'MLFQ') {
      if (boost && t > 0 && t % boost === 0) {         // priority boost: everyone back to the top queue
        const all = queues.flat(); queues.forEach(x => x.length = 0);
        if (cur) { all.unshift(cur); cur = null; slice = 0; }
        all.sort((a, b) => a.lv - b.lv).forEach(p => { p.lv = 0; queues[0].push(p); });
      }
      const top = queues.findIndex(x => x.length);
      if (cur && top >= 0 && top < cur.lv) { queues[cur.lv].push(cur); cur = null; slice = 0; }   // preempted by a higher queue
      if (!cur && top >= 0) cur = queues[queues.findIndex(x => x.length)].shift();
    } else if (algo === 'SRTF' || algo === 'PRIO-P') {
      const best = ready().sort(cmp[algo])[0] || null;
      if (!cur || (best && cmp[algo](best, cur) < 0)) cur = best;
    } else if (!cur) {
      const r = ready();
      if (algo === 'HRRN') cur = r.sort((a, b) => ((b.bt + t - b.at) / b.bt) - ((a.bt + t - a.at) / a.bt) || a.at - b.at || a.i - b.i)[0] || null;
      else cur = r.sort(cmp[algo])[0] || null;
    }
    if (!cur) { push('idle', t, t + 1); t++; arrive(t); continue; }
    if (cur.start === null) cur.start = t;
    push(cur.name, t, t + 1); cur.rem--; slice++; t++;
    arrive(t);                                          // arrivals join the queue before a preempted process
    if (!cur.rem) { cur.ct = t; done++; cur = null; slice = 0; }
    else if (algo === 'RR' && slice === q) { queue.push(cur); cur = null; slice = 0; }
    else if (algo === 'MLFQ' && slice === lv[cur.lv]) { cur.lv = Math.min(cur.lv + 1, lv.length - 1); queues[cur.lv].push(cur); cur = null; slice = 0; }
  }
  const avg = f => r2(P.reduce((s, p) => s + f(p), 0) / P.length);
  const keys = { avgWT: avg(p => p.ct - p.at - p.bt), avgTAT: avg(p => p.ct - p.at), avgRT: avg(p => p.start - p.at),
    order: segs.filter(s => s[0] !== 'idle').map(s => s[0]).join(' '), makespan: t,
    util: r2(100 * P.reduce((s, p) => s + p.bt, 0) / t),
    switches: Math.max(0, segs.filter(s => s[0] !== 'idle').length - 1) };
  P.forEach(p => { keys['ct.' + p.name] = p.ct; keys['tat.' + p.name] = p.ct - p.at; keys['wt.' + p.name] = p.ct - p.at - p.bt; keys['rt.' + p.name] = p.start - p.at; });
  const cols = ['proc', 'arrival', 'burst', ...(P.some(p => p.pr !== null) ? ['prio'] : []), 'start', 'finish', 'turnaround', 'waiting', 'response'];
  const tb = TB('per process', cols, P.map(p => [p.name, p.at, p.bt, ...(P.some(x => x.pr !== null) ? [p.pr ?? '-'] : []), p.start, p.ct, p.ct - p.at, p.ct - p.at - p.bt, p.start - p.at]));
  const label = algo === 'RR' ? `Round robin, quantum ${q}` : algo === 'MLFQ' ? `MLFQ, levels ${lv.map(x => x === Infinity ? 'FCFS' : 'q=' + x).join(' → ')}${boost ? `, boost every ${boost}` : ''}` : algo;
  return { summary: [['algorithm', label], ['average waiting', keys.avgWT], ['average turnaround', keys.avgTAT], ['average response', keys.avgRT], ['finish time', t], ['CPU utilisation', keys.util + '%'], ['process switches', keys.switches]],
    gantt: { segs }, tables: [tb], keys };
}

/* ---- page replacement ---- */
function simPage(text){
  const { cfg } = parseSim(text);
  const algo = (cfg.algo || 'FIFO').toUpperCase();
  const ALGOS = ['FIFO', 'LRU', 'OPT', 'CLOCK', 'LFU', 'MRU'];
  if (!ALGOS.includes(algo)) simErr(`algo must be one of ${ALGOS.join(', ')}`);
  const n = int(cfg.frames ?? 3, 'frames', 1);
  const refs = String(cfg.refs || '').split(/[\s,]+/).filter(Boolean);
  if (!refs.length) simErr('add a reference string, e.g. "refs: 7 0 1 2 0 3"');
  if (refs.length > 60) simErr('keep the reference string to 60 pages or fewer');
  const fr = Array(n).fill(null), loaded = Array(n).fill(0), used = Array(n).fill(0), bit = Array(n).fill(0), cnt = {};
  let hand = 0, faults = 0;
  const cols = refs.map((r, i) => {
    cnt[r] = (cnt[r] || 0) + 1;
    let k = fr.indexOf(r), hit = k >= 0, victim = null;
    if (!hit) {
      faults++;
      k = fr.indexOf(null);
      if (k < 0) {
        if (algo === 'FIFO') k = loaded.indexOf(Math.min(...loaded));
        else if (algo === 'LRU') k = used.indexOf(Math.min(...used));
        else if (algo === 'MRU') k = used.indexOf(Math.max(...used));
        else if (algo === 'LFU') k = fr.map((p, j) => j).sort((a, b) => cnt[fr[a]] - cnt[fr[b]] || used[a] - used[b])[0];
        else if (algo === 'OPT') {
          const next = fr.map(p => { const j = refs.indexOf(p, i + 1); return j < 0 ? Infinity : j; });
          const far = Math.max(...next);
          k = next.map((x, j) => j).filter(j => next[j] === far).sort((a, b) => loaded[a] - loaded[b])[0];
        } else {                                        // CLOCK: skip frames whose reference bit is set, clearing it
          while (bit[hand]) { bit[hand] = 0; hand = (hand + 1) % n; }
          k = hand;
        }
        victim = fr[k];
        if (algo === 'LFU') delete cnt[victim];
      }
      if (algo === 'CLOCK') hand = (k + 1) % n;
      fr[k] = r; loaded[k] = i + 1; bit[k] = 1;
      if (algo === 'LFU') cnt[r] = 1;
    } else bit[k] = 1;
    used[k] = i + 1;
    return { r, snap: fr.slice(), k, hit, victim, bits: bit.slice() };
  });
  const rowsT = fr.map((_, j) => ['frame ' + j, ...cols.map(c => c.snap[j] === null ? '' : c.snap[j] + (algo === 'CLOCK' ? `·${c.bits[j]}` : '') + (c.k === j && !c.hit ? '*' : ''))]);
  rowsT.push(['result', ...cols.map(c => c.hit ? 'hit' : 'miss')]);
  rowsT.push(['evicted', ...cols.map(c => c.victim ?? '')]);
  const tb = TB(`${algo}, ${n} frames  (* = page just loaded${algo === 'CLOCK' ? ', ·b = reference bit' : ''})`, ['ref', ...refs], rowsT, { [n]: 'hot' });
  const hits = refs.length - faults;
  return { summary: [['algorithm', algo], ['frames', n], ['references', refs.length], ['page faults', faults], ['hits', hits], ['hit ratio', r2(100 * hits / refs.length) + '%']],
    tables: [tb], keys: { faults, hits, hitRatio: r2(hits / refs.length), final: fr.map(x => x ?? '-').join(' ') } };
}

/* ---- disk scheduling ---- */
function simDisk(text){
  const { cfg } = parseSim(text);
  const algo = (cfg.algo || 'FCFS').toUpperCase();
  const ALGOS = ['FCFS', 'SSTF', 'SCAN', 'C-SCAN', 'LOOK', 'C-LOOK'];
  if (!ALGOS.includes(algo)) simErr(`algo must be one of ${ALGOS.join(', ')}`);
  const head = int(cfg.head ?? 0, 'head'), max = int(cfg.cylinders ?? 200, 'cylinders', 1) - 1;
  const up = !/^(down|left|low)/i.test(cfg.direction || 'up');
  const jumpCounts = !/^skip/i.test(cfg.jump || 'count');
  const req = nums(cfg.requests, 'requests').map(x => int(x, 'request'));
  if (!req.length) simErr('add requests, e.g. "requests: 98 183 37"');
  if (req.some(x => x > max) || head > max) simErr(`cylinders are 0…${max}`);
  const path = [head], order = [];
  let pend = req.slice();
  if (algo === 'FCFS') { path.push(...pend); order.push(...pend); }
  else if (algo === 'SSTF') {
    let at = head;
    while (pend.length) { pend.sort((a, b) => Math.abs(a - at) - Math.abs(b - at) || a - b); at = pend.shift(); path.push(at); order.push(at); }
  } else {
    const hi = pend.filter(x => x >= head).sort((a, b) => a - b), lo = pend.filter(x => x < head).sort((a, b) => b - a);
    const first = up ? hi : lo, second = up ? lo : hi;
    path.push(...first); order.push(...first);
    if (second.length) {
      order.push(...(/^C-/.test(algo) ? second.slice().reverse() : second));
      if (algo === 'SCAN') path.push(up ? max : 0, ...second);
      else if (algo === 'LOOK') path.push(...second);
      else {                                            // circular: jump to the far end and keep going the same way
        const wrap = second.slice().reverse();
        if (algo === 'C-SCAN') path.push(up ? max : 0, up ? 0 : max, ...wrap);
        else path.push(...wrap);
      }
    }
  }
  const moves = []; let total = 0;
  const jumpAt = algo === 'C-SCAN' ? path.findIndex((x, i) => i && ((up && path[i - 1] === max && x === 0) || (!up && path[i - 1] === 0 && x === max))) : algo === 'C-LOOK' ? path.findIndex((x, i) => i > 1 && (up ? x < path[i - 1] : x > path[i - 1])) : -1;
  path.forEach((x, i) => { if (!i) return; const d = Math.abs(x - path[i - 1]), jump = i === jumpAt; if (!jump || jumpCounts) total += d; moves.push([path[i - 1], x, d, jump ? (jumpCounts ? 'return (counted)' : 'return (not counted)') : (algo === 'SCAN' || algo === 'C-SCAN') && (x === 0 || x === max) && i === path.indexOf(x) && !req.includes(x) ? 'travel to end' : 'serve']); });
  return { summary: [['algorithm', algo + (/SCAN|LOOK/.test(algo) ? `, moving ${up ? 'up' : 'down'}` : '')], ['start head', head], ['requests', req.length], ['total head movement', total + ' cylinders'], ['average seek', r2(total / req.length)]],
    chart: { path, max, jumpAt }, tables: [TB('head moves', ['from', 'to', 'distance', 'why'], moves)],
    keys: { total, order: order.join(' '), avg: r2(total / req.length) } };
}

/* ---- Banker's algorithm: safety check, a request, or deadlock detection ---- */
function simBanker(text){
  const { cfg, rows } = parseSim(text);
  const detect = /^detect/i.test(cfg.mode || '');
  const avail = nums(cfg.available, 'available').map(x => int(x, 'available'));
  const R = avail.length, names = (cfg.resources || '').split(/\s+/).filter(Boolean);
  if (!R) simErr('add "available: …" with one number per resource type');
  const res = names.length === R ? names : avail.map((_, i) => String.fromCharCode(65 + i));
  const P = rows.map(r => {
    const parts = r.line.split('|'); if (parts.length !== 2) simErr(`line ${r.n}: expected "name ${detect ? 'allocation | request' : 'allocation | max'}"`);
    const a = parts[0].trim().split(/\s+/), name = a.shift(), alloc = a.map(x => int(x, name)), b = parts[1].trim().split(/\s+/).map(x => int(x, name));
    if (alloc.length !== R || b.length !== R) simErr(`line ${r.n}: need ${R} numbers on each side of |`);
    return { name, alloc, max: detect ? null : b, req: detect ? b : null, need: detect ? b : b.map((m, j) => m - alloc[j]) };
  });
  if (!P.length) simErr('add one line per process');
  P.forEach(p => { if (p.need.some(x => x < 0)) simErr(`${p.name}: allocation exceeds max`); });
  const v = a => a.join(' '), le = (a, b) => a.every((x, j) => x <= b[j]);
  function safety(av, procs){
    const work = av.slice(), fin = procs.map(() => false), seq = [], trace = [];
    for (let changed = true; changed;) {
      changed = false;
      for (let i = 0; i < procs.length; i++) {
        if (fin[i] || !le(procs[i].need, work)) continue;
        const before = v(work); procs[i].alloc.forEach((x, j) => work[j] += x); fin[i] = true; seq.push(procs[i].name);
        trace.push([procs[i].name, v(procs[i].need), before, v(work)]); changed = true; break;   // restart from the lowest-numbered process
      }
    }
    return { ok: fin.every(Boolean), seq, trace, stuck: procs.filter((_, i) => !fin[i]).map(p => p.name) };
  }
  const tables = [TB(detect ? 'state' : 'state (need = max − allocation)', ['proc', 'allocation', detect ? 'request' : 'max', ...(detect ? [] : ['need'])].map(String),
    P.map(p => [p.name, v(p.alloc), v(detect ? p.req : p.max), ...(detect ? [] : [v(p.need)])]))];
  const keys = {}, summary = [['resources', res.join(' ')], ['available', v(avail)]];
  P.forEach(p => { if (!detect) keys['need.' + p.name] = v(p.need); });
  let work = avail, procs = P;
  if (cfg.request) {
    const f = cfg.request.split(/\s+/), who = f.shift(), rq = f.map(x => int(x, 'request')), p = P.find(x => x.name === who);
    if (!p || rq.length !== R) simErr(`request: expected "name ${res.join(' ')}" for an existing process`);
    summary.push(['request', `${who} asks for ${v(rq)}`]);
    if (!le(rq, p.need)) { keys.granted = 'no'; summary.push(['decision', 'error: asks for more than its declared need']); return { summary, tables, keys }; }
    if (!le(rq, avail)) { keys.granted = 'no'; summary.push(['decision', 'must wait: not enough available right now']); return { summary, tables, keys }; }
    work = avail.map((x, j) => x - rq[j]);
    procs = P.map(x => x !== p ? x : { ...x, alloc: x.alloc.map((a, j) => a + rq[j]), need: x.need.map((a, j) => a - rq[j]) });
    summary.push(['pretend to grant', `available → ${v(work)}`]);
  }
  const s = safety(work, procs);
  tables.push(TB(detect ? 'detection run (request ≤ work → can finish)' : 'safety run (need ≤ work → can finish)', ['finishes', detect ? 'request' : 'need', 'work before', 'work after'], s.trace));
  if (detect) {
    keys.deadlocked = s.stuck.length ? s.stuck.join(' ') : 'none';
    summary.push(['deadlocked', keys.deadlocked], ...(s.seq.length ? [['finish order', s.seq.join(' → ')]] : []));
  } else {
    keys.safe = s.ok ? 'yes' : 'no'; keys.sequence = s.ok ? s.seq.join(' ') : 'none';
    if (cfg.request) keys.granted = s.ok ? 'yes' : 'no';
    summary.push(['state', s.ok ? 'SAFE' : 'UNSAFE'], ['safe sequence', s.ok ? s.seq.join(' → ') : `none (stuck: ${s.stuck.join(', ')})`]);
    if (cfg.request) summary.push(['decision', s.ok ? 'grant it' : 'deny: the process waits (granting would be unsafe)']);
  }
  return { summary, tables, keys };
}

/* ---- contiguous allocation: first / best / worst / next fit ---- */
function simAlloc(text){
  const { cfg } = parseSim(text);
  const algo = (cfg.algo || 'first').toLowerCase().replace(/[\s-]*fit$/, '');
  if (!['first', 'best', 'worst', 'next'].includes(algo)) simErr('algo must be first, best, worst or next');
  const holes = nums(cfg.holes, 'holes').map(x => int(x, 'hole', 1)), req = nums(cfg.requests, 'requests').map(x => int(x, 'request', 1));
  if (!holes.length || !req.length) simErr('add "holes: …" and "requests: …"');
  const free = holes.slice(); let last = 0;
  const place = [], rowsT = [];
  req.forEach((r, i) => {
    const fit = free.map((h, j) => j).filter(j => free[j] >= r);
    let k = -1;
    if (fit.length) {
      if (algo === 'first') k = fit[0];
      else if (algo === 'best') k = fit.sort((a, b) => free[a] - free[b] || a - b)[0];
      else if (algo === 'worst') k = fit.sort((a, b) => free[b] - free[a] || a - b)[0];
      else { for (let s = 0; s < free.length; s++) { const j = (last + s) % free.length; if (free[j] >= r) { k = j; break; } } }
    }
    if (k < 0) { place.push('-'); rowsT.push([`R${i + 1}`, r, '-', '-', 'does not fit: waits']); return; }
    const before = free[k]; free[k] -= r; last = k; place.push(k + 1);
    rowsT.push([`R${i + 1}`, r, `hole ${k + 1}`, before, free[k]]);
  });
  const failed = req.filter((_, i) => place[i] === '-');
  const leftover = free.reduce((s, x) => s + x, 0);
  return { summary: [['strategy', algo + ' fit'], ['holes at start', holes.join(' ')], ['holes at end', free.join(' ')], ['unplaced requests', failed.length ? failed.join(' ') : 'none'],
      ['free memory left', leftover], ['largest hole left', Math.max(...free)], ...(failed.length && failed.some(f => f <= leftover) ? [['external fragmentation', `${failed.filter(f => f <= leftover).join(', ')} would fit in total free space, but no single hole is big enough`]] : [])],
    tables: [TB('placements', ['request', 'size', 'placed in', 'hole before', 'hole after'], rowsT, Object.fromEntries(place.map((p, i) => [i, p === '-' ? 'bad' : ''])))],
    keys: { place: place.join(' '), failed: failed.length ? failed.join(' ') : 'none', holes: free.join(' '), largest: Math.max(...free) } };
}

/* ---- paging address translation, optionally through a TLB ---- */
function simAddr(text){
  const { cfg } = parseSim(text);
  const unit = s => { const m = String(s).trim().match(/^(\d+)\s*(k|kb|m|mb)?$/i); if (!m) simErr(`page-size "${s}" should look like 4096 or 4KB`); return +m[1] * ({ k: 1024, kb: 1024, m: 1 << 20, mb: 1 << 20 }[(m[2] || '').toLowerCase()] || 1); };
  const ps = unit(cfg['page-size'] || '1KB');
  if (ps & (ps - 1)) simErr('page-size must be a power of two');
  const table = {};
  String(cfg.table || '').split(/[\s,]+/).filter(Boolean).forEach(e => { const [p, f] = e.split(/:|->/); if (f === undefined) simErr(`table entry "${e}" should be page:frame`); table[int(p, 'page')] = f === '-' ? null : int(f, 'frame'); });
  const addrs = String(cfg.addresses || '').split(/[\s,]+/).filter(Boolean).map(a => { const x = /^0x/i.test(a) ? parseInt(a, 16) : Number(a); if (!Number.isInteger(x) || x < 0) simErr(`address "${a}" is not valid`); return x; });
  if (!addrs.length) simErr('add "addresses: …"');
  const tlbN = cfg.tlb ? int(cfg.tlb, 'tlb', 1) : 0, tlb = [], memT = num(cfg['mem-time'] ?? 100, 'mem-time'), tlbT = num(cfg['tlb-time'] ?? 10, 'tlb-time');
  const bits = Math.log2(ps), hex = x => '0x' + x.toString(16).toUpperCase();
  let hits = 0, faults = 0, time = 0;
  const out = [], rowsT = addrs.map(a => {
    const p = Math.floor(a / ps), off = a % ps;
    let how = 'page table';
    if (tlbN) {
      const k = tlb.indexOf(p);
      if (k >= 0) { hits++; tlb.splice(k, 1); tlb.push(p); how = 'TLB hit'; time += tlbT + memT; }
      else { how = 'TLB miss → page table'; time += tlbT + 2 * memT; }
    }
    const f = table[p];
    if (f === undefined || f === null) { faults++; out.push('fault'); if (tlbN) time -= how === 'TLB hit' ? tlbT + memT : tlbT + 2 * memT; return [a + ` (${hex(a)})`, p, off, '-', 'PAGE FAULT', how]; }
    if (tlbN && how !== 'TLB hit') { tlb.push(p); if (tlb.length > tlbN) tlb.shift(); }
    const pa = f * ps + off; out.push(pa);
    return [a + ` (${hex(a)})`, p, off, f, `${pa} (${hex(pa)})`, how];
  });
  const keys = { phys: out.join(' '), faults, pages: addrs.map(a => Math.floor(a / ps)).join(' '), offsets: addrs.map(a => a % ps).join(' '), offsetBits: bits };
  const summary = [['page size', `${ps} bytes → offset is the low ${bits} bits`], ['translated', addrs.length - faults], ['page faults', faults]];
  if (tlbN) {
    const ok = addrs.length - faults;
    keys.tlbHits = hits; keys.eat = ok ? r2(time / ok) : 0;
    summary.push(['TLB', `${tlbN} entries, LRU`], ['TLB hits', `${hits} of ${addrs.length}`], ['average access time (translated ones)', `${keys.eat} ns (TLB ${tlbT} ns, memory ${memT} ns)`]);
  }
  return { summary, tables: [TB('translations: physical = frame × page size + offset', ['virtual address', 'page', 'offset', 'frame', 'physical address', 'lookup'], rowsT, Object.fromEntries(out.map((x, i) => [i, x === 'fault' ? 'bad' : ''])))], keys };
}

/* ---- interleavings: every possible schedule of a few threads' atomic steps ----
   shared: x=0 m=0          shared variables (locks and semaphores live here too)
   A: load r x; add r 1; store x r
   B: …
   schedule: A A B B A B    optional: also trace one particular interleaving
   ops: load R X | store X V | add R V | sub R V | set X V | lock M | unlock M | wait S | signal S
   (V is a number or a register; every op is one atomic step) */
function simRace(text){
  const { cfg, rows } = parseSim(text);
  const init = {};
  String(cfg.shared || '').split(/[\s,]+/).filter(Boolean).forEach(e => { const [k, v] = e.split('='); init[k] = int(v ?? 0, k, -1e9); });
  const TH = rows.map(r => {
    const m = r.line.match(/^(\w+)\s*:\s*(.+)$/); if (!m) simErr(`line ${r.n}: expected "Name: op; op; …"`);
    const ops = m[2].split(';').map(s => s.trim()).filter(Boolean).map(s => {
      const f = s.split(/[\s,]+/), op = f[0].toLowerCase();
      const ar = { load: 2, store: 2, add: 2, sub: 2, set: 2, lock: 1, unlock: 1, wait: 1, signal: 1 }[op];
      if (ar === undefined || f.length !== ar + 1) simErr(`${m[1]}: "${s}" is not a valid step (load R X, store X V, add R V, sub R V, set X V, lock M, unlock M, wait S, signal S)`);
      if (['load'].includes(op) && !(f[2] in init)) simErr(`${m[1]}: "${f[2]}" is not a shared variable; declare it in "shared:"`);
      if (['store', 'set', 'lock', 'unlock', 'wait', 'signal'].includes(op) && !(f[1] in init)) simErr(`${m[1]}: "${f[1]}" is not a shared variable; declare it in "shared:"`);
      return { op, a: f[1], b: f[2], s };
    });
    return { name: m[1], ops };
  });
  if (TH.length < 1 || TH.length > 4) simErr('use 1 to 4 threads');
  if (TH.reduce((s, t) => s + t.ops.length, 0) > 28) simErr('keep it to 28 steps in total');
  const vars = Object.keys(init);
  const val = (regs, v) => /^-?\d+$/.test(v) ? +v : v in regs ? regs[v] : simErr(`register "${v}" is used before it is loaded`);
  // can thread i take its next step in this state? returns the new state, or null if blocked
  function stepOf(st, i){
    const t = TH[i], pc = st.pc[i]; if (pc >= t.ops.length) return null;
    const o = t.ops[pc], sh = { ...st.sh }, regs = { ...st.regs[i] };
    switch (o.op) {
      case 'load': regs[o.a] = sh[o.b]; break;
      case 'store': case 'set': sh[o.a] = val(regs, o.b); break;
      case 'add': regs[o.a] = val(regs, o.a) + val(regs, o.b); break;
      case 'sub': regs[o.a] = val(regs, o.a) - val(regs, o.b); break;
      case 'lock': if (sh[o.a]) return null; sh[o.a] = i + 1; break;
      case 'unlock': sh[o.a] = 0; break;
      case 'wait': if (sh[o.a] <= 0) return null; sh[o.a]--; break;
      case 'signal': sh[o.a]++; break;
    }
    const pcs = st.pc.slice(); pcs[i]++;
    const rg = st.regs.slice(); rg[i] = regs;
    return { pc: pcs, sh, regs: rg };
  }
  const isLock = v => TH.some(t => t.ops.some(o => (o.op === 'lock' || o.op === 'unlock') && o.a === v));
  const shown = vars.filter(v => !isLock(v));
  const outKey = st => shown.map(v => `${v}=${st.sh[v]}`).join(' ');
  const memo = new Map();
  let states = 0;
  function explore(st){                                 // → Map(outcome → number of schedules)
    const k = JSON.stringify(st); if (memo.has(k)) return memo.get(k);
    if (++states > 200000) simErr('too many interleavings: make the threads shorter');
    const res = new Map(), done = st.pc.every((p, i) => p >= TH[i].ops.length);
    if (done) res.set(outKey(st), 1);
    else {
      let any = false;
      TH.forEach((_, i) => { const n = stepOf(st, i); if (!n) return; any = true; explore(n).forEach((c, o) => res.set(o, (res.get(o) || 0) + c)); });
      if (!any) res.set('DEADLOCK', 1);
    }
    memo.set(k, res); return res;
  }
  const start = { pc: TH.map(() => 0), sh: { ...init }, regs: TH.map(() => ({})) };
  const outs = [...explore(start)].sort((a, b) => a[0] === 'DEADLOCK' ? 1 : b[0] === 'DEADLOCK' ? -1 : a[0].localeCompare(b[0], undefined, { numeric: true }));
  const total = outs.reduce((s, [, c]) => s + c, 0);
  const first = shown[0];
  const values = [...new Set(outs.filter(o => o[0] !== 'DEADLOCK').map(([o]) => +o.split(' ')[0].split('=')[1]))].sort((a, b) => a - b);
  const keys = { outcomes: outs.length, values: values.join(' '), deadlock: outs.some(o => o[0] === 'DEADLOCK') ? 'yes' : 'no', schedules: total };
  const tables = [TB('every possible interleaving, grouped by final state', ['final shared state', 'schedules', 'share'], outs.map(([o, c]) => [o, c, r2(100 * c / total) + '%']), Object.fromEntries(outs.map(([o], i) => [i, o === 'DEADLOCK' ? 'bad' : ''])))];
  const summary = [['threads', TH.map(t => `${t.name} (${t.ops.length} steps)`).join(', ')], ['possible schedules', total], ['distinct outcomes', outs.length], [`possible values of ${first}`, values.join(', ') || '-'], ['can deadlock', keys.deadlock]];
  if (cfg.schedule) {
    let st = start; const tr = [];
    cfg.schedule.split(/[\s,]+/).filter(Boolean).forEach((nm, n) => {
      const i = TH.findIndex(t => t.name === nm); if (i < 0) simErr(`schedule: unknown thread "${nm}"`);
      if (st.pc[i] >= TH[i].ops.length) simErr(`schedule step ${n + 1}: ${nm} has already finished`);
      const nx = stepOf(st, i);
      if (!nx) { tr.push([n + 1, nm, TH[i].ops[st.pc[i]].s, 'BLOCKED: cannot run now', '']); return; }
      const o = TH[i].ops[st.pc[i]]; st = nx;
      tr.push([n + 1, nm, o.s, Object.entries(st.regs[i]).map(([r, v]) => `${r}=${v}`).join(' '), vars.map(v => `${v}=${st.sh[v]}`).join(' ')]);
    });
    const left = st.pc.some((p, i) => p < TH[i].ops.length);
    tables.unshift(TB(`your schedule${left ? ' (some threads did not finish)' : ''}`, ['#', 'thread', 'step', `${'registers'}`, 'shared after'], tr, Object.fromEntries(tr.map((r, i) => [i, /BLOCKED/.test(r[3]) ? 'bad' : '']))));
    vars.forEach(v => keys['final.' + v] = st.sh[v]);
    summary.push(['your schedule ends with', vars.map(v => `${v}=${st.sh[v]}`).join(' ')]);
  }
  return { summary, tables, keys };
}

const SIMS = {
  sched: { title: 'CPU scheduler', run: simSched, help: 'algo: FCFS | SJF | SRTF | PRIO | PRIO-P | RR | HRRN | MLFQ · quantum: n · priority: low|high (which number wins) · levels: 2 4 FCFS · lines: name arrival burst [priority]' },
  page: { title: 'Page replacement', run: simPage, help: 'algo: FIFO | LRU | OPT | CLOCK | LFU | MRU · frames: n · refs: pages…' },
  disk: { title: 'Disk scheduler', run: simDisk, help: 'algo: FCFS | SSTF | SCAN | C-SCAN | LOOK | C-LOOK · head · cylinders · direction: up|down · jump: count|skip · requests' },
  banker: { title: "Banker's algorithm", run: simBanker, help: 'available: … · lines: name allocation | max · request: name … (optional) · mode: detect (lines become allocation | request)' },
  alloc: { title: 'Memory allocator', run: simAlloc, help: 'algo: first | best | worst | next · holes: sizes… · requests: sizes…' },
  addr: { title: 'Address translation', run: simAddr, help: 'page-size: 1KB · table: page:frame … (- = not in memory) · addresses: … · tlb: n · tlb-time · mem-time' },
  race: { title: 'Interleaving explorer', run: simRace, help: 'shared: x=0 · Name: op; op; … (load R X, store X V, add R V, sub R V, set X V, lock M, unlock M, wait S, signal S) · schedule: A B … (optional)' },
};
/* compare a reader's answer with a computed one: numbers within 0.01, text ignoring case, commas, arrows and extra spaces */
function sameAnswer(mine, want){
  const norm = s => String(s).toLowerCase().replace(/[,→<>()\[\]{}]|->/g, ' ').replace(/\s+/g, ' ').trim();
  const a = norm(mine), b = norm(want);
  if (a === b) return true;
  const na = Number(a.replace(/%$/, '')), nb = Number(b);
  return a !== '' && Number.isFinite(na) && Number.isFinite(nb) && Math.abs(na - nb) < 0.011;
}
