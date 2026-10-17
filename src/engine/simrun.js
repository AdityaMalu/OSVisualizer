/* ---------- simulator output: the summary, a Gantt chart or head-movement chart, then tables ---------- */
function simHTML(r, t){
  const sum = `<div class="grp sim-sum"><h4>result</h4>${r.summary.map(([k, v]) => `<div class="row"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`).join('')}</div>`;
  const chart = r.gantt ? `<div class="sim-chart">${ganttSVG(r.gantt, t ? t.colors : {})}</div>` : r.chart ? `<div class="sim-chart">${diskSVG(r.chart)}</div>` : '';
  return sum + chart + r.tables.map(tableHTML).join('');
}
function runSim(name, input){
  const s = SIMS[name];
  if (!s) throw new Error(`unknown simulator "${name}"`);
  return s.run(input);
}
const errHTML = e => `<p class="res-err"><b>Error:</b> ${esc(e.message || e)}</p>`;
/* run into a result box; returns the result or null */
function runInto(box, name, input){
  try { const r = runSim(name, input); box.innerHTML = simHTML(r); return r; }
  catch(e){ box.innerHTML = errHTML(e); return null; }
}
