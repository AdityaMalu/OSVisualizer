/* ---------- study sections after the walkthrough: examples (simple → complex), interview tips, exercises.
   Simulator examples run in the browser and can be edited. Exercises with an answer are checked;
   simulator exercises compute the expected answer from the input, so the answer key can't drift. Finished exercises are remembered. ---------- */
const XKEY = 'osv-ex-done-v1';
const EX_LV = {basic:'Basic', mid:'Intermediate', adv:'Advanced'};
let studyFor = -1, xdone = {};
try { xdone = JSON.parse(localStorage.getItem(XKEY) || '{}') || {}; } catch(e){ xdone = {}; }
const saveDone = () => { try { localStorage.setItem(XKEY, JSON.stringify(xdone)); } catch(e){} };
const isDone = (t, i) => (xdone[t.id] || []).includes(i);
function setDone(t, i, on){
  const s = new Set(xdone[t.id] || []); on ? s.add(i) : s.delete(i);
  xdone[t.id] = [...s]; saveDone(); xrScore(); updateTicks();
}
/* the expected answer of an exercise: a fixed one, or the simulator's value for its key */
function expected(x){
  if (x.ans !== undefined) return String(x.ans);
  if (x.sim && x.key) { const k = runSim(x.sim, x.input).keys[x.key]; if (k === undefined) throw new Error(`simulator has no "${x.key}"`); return String(k); }
  return null;
}
const simTag = x => x.sim ? `<span class="tag">${esc(SIMS[x.sim].title)} · runs in your browser</span>` : '';

function renderStudy(){
  const t = T[ti];
  studyFor = ti;
  // examples
  $('exCard').hidden = !t.examples.length;
  $('examples').innerHTML = t.examples.map((x, i) => `<article class="ex" data-i="${i}"><div class="ex-h"><span class="lvl lvl-${x.lv}">${EX_LV[x.lv]}</span><b>${x.title}</b>${simTag(x)}</div>
      ${x.code ? `<pre class="sql">${hiBlock(x.code)}</pre>` : ''}
      ${x.out ? `<div class="out-l">Output</div><pre class="sql out">${esc(x.out)}</pre>` : ''}
      ${x.sim ? `<pre class="sql" data-src>${hiBlock(x.input)}</pre>` : ''}
      <div class="ex-why">${x.why}</div>
      ${x.sim ? `<div class="runbar"><button type="button" class="primary" data-run>▶ Run</button><button type="button" data-edit>✎ Edit input</button><span class="cm" title="${esc(SIMS[x.sim].help)}">change the numbers or the algorithm and run again</span></div><div class="res-box" data-out></div>` : ''}
    </article>`).join('');
  // interview tips
  const tp = t.tips;
  $('tipCard').hidden = !tp;
  if (tp) $('tips').innerHTML =
    `<div class="tip-say"><span class="tip-l">Say it in 30 seconds</span><p>${tp.say}</p></div>` +
    `<div class="th-grid">` +
      `<div class="th-box ok"><h4>What interviewers listen for</h4><ul>${tp.points.map(x=>`<li>${x}</li>`).join('')}</ul></div>` +
      `<div class="th-box warn"><h4>Traps and red flags</h4><ul>${tp.traps.map(x=>`<li>${x}</li>`).join('')}</ul></div>` +
    `</div>` +
    (tp.qa && tp.qa.length ? `<div class="tip-qa"><h4>Likely follow-up questions <span class="cm">(think first, then open)</span></h4>${tp.qa.map(([q,a])=>`<details><summary>${q}</summary><div>${a}</div></details>`).join('')}</div>` : '');
  // exercises
  $('xrCard').hidden = !t.exercises.length;
  $('exercises').innerHTML = t.exercises.map((x, i) => {
    const checked = x.ans !== undefined || (x.sim && x.key), done = isDone(t, i);
    return `<article class="xr${done?' done':''}" data-i="${i}"><div class="ex-h"><span class="qn">E${i+1}</span><span class="lvl lvl-${x.lv}">${LV[x.lv]}</span>${checked ? '<span class="tag">auto-checked</span>' : '<span class="tag">think / design</span>'}
        <label class="xr-done"><input type="checkbox" data-done${done?' checked':''}> done</label></div>
      <div class="xr-q">${x.q}</div>
      ${x.sim ? `<pre class="sql">${hiBlock(x.input)}</pre>` : ''}
      ${checked ? `<div class="ans-row"><input class="ans-in" type="text" spellcheck="false" autocomplete="off" aria-label="Your answer to exercise ${i+1}" placeholder="${x.fmt ? esc(x.fmt) : 'your answer'}"><button type="button" class="primary" data-check>✓ Check</button></div>` : ''}
      <div class="runbar">${x.hint ? `<button type="button" data-hint>Hint</button>` : ''}<button type="button" data-sol>Show solution</button></div>
      <div class="xr-status" aria-live="polite"></div>
      ${x.hint ? `<div class="xr-hint" hidden><b>Hint:</b> ${x.hint}</div>` : ''}
      <div class="xr-sol" hidden>${checked ? `<div><b>Answer:</b> <code data-ans></code></div>` : ''}${x.answer ? `<div>${x.answer}</div>` : ''}${x.sim ? '<div class="res-box" data-out></div>' : ''}</div>
    </article>`;
  }).join('');
  xrScore();
}
function xrScore(){
  const t = T[ti], n = t.exercises.length, d = t.exercises.filter((_, i) => isDone(t, i)).length;
  $('xrScore').textContent = n ? `${d} / ${n} done` : '';
}

$('examples').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  const art = b.closest('.ex'), t = T[ti], x = t.examples[+art.dataset.i];
  if (b.hasAttribute('data-edit')) {
    const pre = art.querySelector('[data-src]');
    if (pre) { const ta = document.createElement('textarea'); ta.className = 'sql-in'; ta.spellcheck = false; ta.value = x.input; ta.rows = Math.min(14, x.input.split('\n').length + 1); ta.setAttribute('aria-label', 'Edit the simulator input'); pre.replaceWith(ta); ta.focus(); b.textContent = '↺ Reset'; }
    else { const ta = art.querySelector('textarea'); const p = document.createElement('pre'); p.className = 'sql'; p.dataset.src = ''; p.innerHTML = hiBlock(x.input); ta.replaceWith(p); b.textContent = '✎ Edit input'; }
    return;
  }
  if (b.hasAttribute('data-run')) {
    const ta = art.querySelector('textarea'), box = art.querySelector('[data-out]');
    try { box.innerHTML = simHTML(runSim(x.sim, ta ? ta.value : x.input), t); } catch(err){ box.innerHTML = errHTML(err); }
  }
};
$('exercises').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  const art = b.closest('.xr'), t = T[ti], i = +art.dataset.i, x = t.exercises[i];
  const status = art.querySelector('.xr-status');
  if (b.hasAttribute('data-hint')) { const h = art.querySelector('.xr-hint'); h.hidden = !h.hidden; return; }
  if (b.hasAttribute('data-sol')) {
    const s = art.querySelector('.xr-sol'); s.hidden = !s.hidden; b.textContent = s.hidden ? 'Show solution' : 'Hide solution';
    if (!s.hidden) {
      try { const a = s.querySelector('[data-ans]'); if (a) a.textContent = expected(x); } catch(err){}
      const box = s.querySelector('[data-out]'); if (box && !box.innerHTML) try { box.innerHTML = simHTML(runSim(x.sim, x.input), t); } catch(err){ box.innerHTML = errHTML(err); }
    }
    return;
  }
  if (b.hasAttribute('data-check')) {
    const inp = art.querySelector('.ans-in'), mine = inp.value.trim();
    if (!mine) { status.className = 'xr-status bad'; status.textContent = 'Type an answer first.'; inp.focus(); return; }
    let want;
    try { want = expected(x); } catch(err){ status.className = 'xr-status bad'; status.textContent = 'Could not compute the answer: ' + err.message; return; }
    const ok = sameAnswer(mine, want);
    status.className = 'xr-status ' + (ok ? 'ok' : 'bad');
    status.innerHTML = ok ? '<b>Correct.</b> Open the solution to see the full working.' : `<b>Not yet.</b> ${x.why ? x.why : 'Re-trace it step by step (the hint helps), or open the solution to see the working.'}`;
    if (ok && !isDone(t, i)) { setDone(t, i, true); art.classList.add('done'); art.querySelector('[data-done]').checked = true; }
  }
};
$('exercises').onchange = e => {
  const c = e.target.closest('[data-done]'); if (!c) return;
  const art = c.closest('.xr'); setDone(T[ti], +art.dataset.i, c.checked); art.classList.toggle('done', c.checked);
};
$('exercises').addEventListener('keydown', e => {          // Enter checks the answer
  if (e.key === 'Enter' && e.target.classList.contains('ans-in')) { e.preventDefault(); e.target.closest('.xr').querySelector('[data-check]')?.click(); }
});
$('examples').addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target.tagName === 'TEXTAREA') { e.preventDefault(); e.target.closest('.ex').querySelector('[data-run]')?.click(); }
});
