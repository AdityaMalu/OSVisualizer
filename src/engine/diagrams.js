/* ---------- diagrams: generic node/edge graphs (B-trees, replication, shards, lock waits …) ---------- */
/* generic node/edge diagram: topic.nodes {id:{x,y,label,kind,w,h}}, topic.edges (always drawn faint), step d.e (coloured overlay) */
function graphSVG(t, d){
  const N = t.nodes, hide = d.hide||[], lab = d.labels||{};
  const vis = id => N[id] && !hide.includes(id);
  const flagCol = f => /bad/.test(f)?'var(--bad-line)': /ok/.test(f)?'var(--ok-line)': /hot/.test(f)?'var(--accent)':'var(--muted)';
  const all = [...(t.edges||[]).filter(e=>!(d.e||[]).some(x=>x[0]===e[0]&&x[1]===e[1])).map(e=>[e[0],e[1],e[2]||'',(e[3]||'')+' base']), ...(d.e||[])];
  let out = `<svg viewBox="${t.vb||'0 0 440 250'}" role="img" aria-label="${esc(t.title)} diagram"><defs>`;
  ['m','b','o','h'].forEach((k,i)=> out += `<marker id="gm${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="${['var(--muted)','var(--bad-line)','var(--ok-line)','var(--accent)'][i]}"/></marker>`);
  out += `</defs>`;
  if (t.ring) out += `<circle cx="${t.ring.cx}" cy="${t.ring.cy}" r="${t.ring.r}" fill="none" stroke="var(--line)" stroke-width="2" stroke-dasharray="4 5"/>`;   // optional backdrop circle (hash rings)
  const box = id => { const n = N[id]; return {w:(n.w||120)/2, h:(n.h||40)/2}; };
  all.forEach(([a,b,l,f])=>{
    if (!vis(a) || !vis(b)) return;
    f = f||'';
    let x1=N[a].x, y1=N[a].y, x2=N[b].x, y2=N[b].y;
    const dx=x2-x1, dy=y2-y1, len=Math.hypot(dx,dy)||1, ux=dx/len, uy=dy/len;
    const A = box(a), B = box(b);
    const oa = Math.min(A.w/Math.abs(ux||1e-9), A.h/Math.abs(uy||1e-9)), ob = Math.min(B.w/Math.abs(ux||1e-9), B.h/Math.abs(uy||1e-9));
    const rev = all.some(e=>e[0]===b&&e[1]===a) ? 7 : 0;
    const px = -uy*rev, py = ux*rev;
    x1+=ux*oa+px; y1+=uy*oa+py; x2-=ux*(ob+2)-px; y2-=uy*(ob+2)-py;
    const base = /base/.test(f), col = base ? 'var(--line)' : flagCol(f);
    const mk = /line/.test(f) ? '' : `marker-end="url(#gm${base?'m':/bad/.test(f)?'b':/ok/.test(f)?'o':/hot/.test(f)?'h':'m'})"`;
    out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${base?1.5:2.5}" ${/dash/.test(f)?'stroke-dasharray="6 4"':''} ${mk}/>`;
    if (l) {
      const mx=(x1+x2)/2, my=(y1+y2)/2, nx=-uy, ny=ux, side = rev ? 1 : (Math.abs(uy)>0.7 ? 1 : -1);
      const tx = mx + nx*11*side*(ux>=0?1:-1), ty = my + ny*11*side*(ux>=0?1:-1) + 4;
      const anchor = Math.abs(uy)>0.7 ? ((nx*side*(ux>=0?1:-1))>0?'start':'end') : 'middle';
      out += `<text x="${tx}" y="${ty}" font-size="10.5" font-weight="${base?400:600}" text-anchor="${anchor}" fill="${base?'var(--muted)':col}" font-family="IBM Plex Sans, sans-serif">${esc(l)}</text>`;
    }
  });
  Object.entries(N).forEach(([k,n])=>{
    if (!vis(k)) return;
    const w = n.w||120, h = n.h||40, on = (d.on||[]).includes(k), bad = (d.bad||[]).includes(k), ok = (d.ok||[]).includes(k), dim = (d.dim||[]).includes(k);
    const kind = n.kind||'box', tc = t.colors[k];
    const stroke = bad?'var(--bad-line)': ok?'var(--ok-line)': on?'var(--accent)': kind==='actor'&&tc ? tc : 'var(--muted)';
    const fill = on?'var(--accent)': bad?'var(--bad)': ok?'var(--ok)': kind==='lock'||kind==='mem'?'var(--soft)':'var(--panel)';
    const rx = kind==='actor'||kind==='circle' ? h/2 : kind==='lock'||kind==='mem' ? 4 : 9;
    const txt = on ? 'var(--panel)' : kind==='actor'&&tc ? tc : 'var(--ink)';
    const sw = on||bad||ok?2.2:1.4;
    out += `<g opacity="${dim?0.4:1}">`;
    if (kind==='db') {                             // a cylinder: body, bottom curve, top ellipse
      const ry = Math.min(8, h/5), x0 = n.x-w/2, y0 = n.y-h/2;
      out += `<path d="M${x0},${y0+ry} L${x0},${y0+h-ry} A${w/2},${ry} 0 0 0 ${x0+w},${y0+h-ry} L${x0+w},${y0+ry}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/><ellipse cx="${n.x}" cy="${y0+ry}" rx="${w/2}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    } else out += `<rect x="${n.x-w/2}" y="${n.y-h/2}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    const text = String(lab[k] !== undefined ? lab[k] : (n.label||k)).split('\n'), ty0 = kind==='db' ? 4 : 0;
    text.forEach((tl,i)=> out += `<text x="${n.x}" y="${n.y + 4 + ty0 + (i-(text.length-1)/2)*14}" text-anchor="middle" font-size="${n.fs||12}" font-weight="600" fill="${txt}" font-family="JetBrains Mono, monospace">${esc(tl)}</text>`);
    if (n.sub) out += `<text x="${n.x}" y="${n.y+h/2+13}" text-anchor="middle" font-size="10" fill="var(--muted)" font-family="IBM Plex Sans, sans-serif">${esc(n.sub)}</text>`;
    out += `</g>`;
  });
  return out + '</svg>';
}
/* ---------- Gantt timeline: who had the CPU (or a resource) when. segs [label, start, end]; label 'idle' is drawn hollow ---------- */
function ganttSVG(g, colors = {}){
  // g.segs: one lane; g.lanes: [{name, segs}] for several CPUs/resources
  const lanes = g.lanes || [{ name: '', segs: g.segs || [] }], all = lanes.flatMap(l => l.segs);
  const end = Math.max(1, ...all.map(s => s[2]), g.now || 0), start = Math.min(0, ...all.map(s => s[1]));
  const named = lanes.some(l => l.name), W = 600, L = named ? 62 : 8, R = 8, H = 30, gap = 8, y0 = 10, span = end - start, x = v => L + (v - start) * (W - L - R) / span;
  const pal = {}, auto = ['--t0','--t1','--t2','--t3','--t4','--t5'];
  let k = 0; all.forEach(s => { if (s[0] !== 'idle' && !pal[s[0]]) pal[s[0]] = colors[s[0]] || `var(${auto[k++ % 6]})`; });
  const bottom = y0 + lanes.length * (H + gap) - gap;
  let out = `<svg viewBox="0 0 ${W} ${bottom + 24}" role="img" aria-label="Gantt chart: ${esc(lanes.map(l => (l.name ? l.name + ': ' : '') + l.segs.map(s => `${s[0]} ${s[1]} to ${s[2]}`).join(', ')).join('; '))}">`;
  lanes.forEach((ln, li) => {
    const y = y0 + li * (H + gap);
    if (named) out += `<text x="${L - 8}" y="${y + H / 2 + 4}" text-anchor="end" font-size="11" fill="var(--muted)" font-family="IBM Plex Sans, sans-serif">${esc(ln.name)}</text>`;
    ln.segs.forEach(([lab, a, b, f]) => {
      const x0 = x(a), w = Math.max(1, x(b) - x0), idle = lab === 'idle', c = pal[lab];
      out += `<rect x="${x0}" y="${y}" width="${w}" height="${H}" rx="3" fill="${idle ? 'var(--soft)' : c}" fill-opacity="${idle ? 1 : f === 'dim' ? .35 : .88}" stroke="${idle ? 'var(--line)' : 'var(--panel)'}" stroke-width="1.5" ${idle ? 'stroke-dasharray="3 3"' : ''}/>`;
      if (w > 18) out += `<text x="${x0 + w / 2}" y="${y + H / 2 + 4}" text-anchor="middle" font-size="${w > 34 ? 12 : 10}" font-weight="600" fill="${idle ? 'var(--muted)' : 'var(--panel)'}" font-family="JetBrains Mono, monospace">${esc(idle ? (w > 34 ? 'idle' : '·') : lab)}</text>`;
    });
  });
  const ticks = [...new Set([start, end, ...all.flatMap(s => [s[1], s[2]])])].sort((a, b) => a - b);
  let lastX = -99;
  ticks.forEach(v => { const tx = x(v); if (tx - lastX < 16 && v !== end) return; lastX = tx; out += `<line x1="${tx}" y1="${bottom}" x2="${tx}" y2="${bottom + 5}" stroke="var(--muted)"/><text x="${tx}" y="${bottom + 18}" text-anchor="middle" font-size="10.5" fill="var(--muted)" font-family="JetBrains Mono, monospace">${+v.toFixed(2)}</text>`; });
  if (g.now !== undefined && g.now !== null) out += `<line x1="${x(g.now)}" y1="${y0 - 6}" x2="${x(g.now)}" y2="${bottom + 4}" stroke="var(--bad-line)" stroke-width="2"/><text x="${Math.min(W - 30, x(g.now) + 3)}" y="${y0 - 2}" font-size="9.5" fill="var(--bad-line)" font-family="IBM Plex Sans, sans-serif">t=${g.now}</text>`;
  return out + '</svg>';
}
/* ---------- disk head movement: cylinder (x) against request order (y) ---------- */
function diskSVG(c){
  const W = 600, L = 14, R = 14, top = 14, row = 24, H = top + (c.path.length - 1) * row + 18, x = v => L + v * (W - L - R) / c.max;
  let out = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Disk head path: ${c.path.join(', ')}"><line x1="${L}" y1="6" x2="${W - R}" y2="6" stroke="var(--line)"/>`;
  [0, c.max].forEach(v => out += `<text x="${x(v)}" y="${H - 2}" text-anchor="${v ? 'end' : 'start'}" font-size="10" fill="var(--muted)" font-family="JetBrains Mono, monospace">${v}</text>`);
  c.path.forEach((v, i) => {
    const cy = top + i * row;
    if (i) out += `<line x1="${x(c.path[i - 1])}" y1="${cy - row}" x2="${x(v)}" y2="${cy}" stroke="${i === c.jumpAt ? 'var(--muted)' : 'var(--accent)'}" stroke-width="2" ${i === c.jumpAt ? 'stroke-dasharray="5 4"' : ''}/>`;
  });
  c.path.forEach((v, i) => { const cy = top + i * row; out += `<circle cx="${x(v)}" cy="${cy}" r="4.5" fill="${i ? 'var(--accent)' : 'var(--bad-line)'}"/><text x="${x(v) + (x(v) > W - 60 ? -8 : 8)}" y="${cy + 4}" text-anchor="${x(v) > W - 60 ? 'end' : 'start'}" font-size="11" font-weight="600" fill="var(--ink)" font-family="JetBrains Mono, monospace">${v}</text>`; });
  return out + '</svg>';
}
