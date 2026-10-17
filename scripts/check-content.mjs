#!/usr/bin/env node
// Validates every topic file without a browser: loads the registry and content in a sandbox,
// then checks structure, file naming, study material, quiz banks and step references,
// and runs every simulator example and exercise so the computed answers exist. Exits 1 on any problem.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { topicFiles } from './build.mjs';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const problems = [];
const fail = (where, msg) => problems.push(`${where}: ${msg}`);

const ctx = vm.createContext({});
const load = rel => {
  try { vm.runInContext(readFileSync(join(SRC, rel), 'utf8'), ctx, { filename: `src/${rel}` }); }
  catch (e) { fail(`src/${rel}`, e.message); }
};
load('engine/registry.js');
load('engine/sims.js');
load('content/parts.js');
const files = topicFiles();
const fileOf = {};
for (const rel of files) {
  const before = vm.runInContext('PARTS.flatMap(p => p.topics).length', ctx);
  load(rel);
  const added = vm.runInContext(`PARTS.flatMap(p => p.topics.map(t => [p.no, t.no])).slice(${before})`, ctx);
  if (added.length !== 1) { fail(`src/${rel}`, `must register exactly one topic, registered ${added.length}`); continue; }
  const [partNo, no] = added[0];
  const [, dir, name] = rel.split('/');
  if (!name.startsWith(no + '-')) fail(`src/${rel}`, `file name should start with "${no}-"`);
  if (!dir.startsWith(`part-${partNo.padStart(2, '0')}-`)) fail(`src/${rel}`, `topic is in part ${partNo} but the folder is ${dir}`);
  fileOf[no] = `src/${rel}`;
}

const { PARTS, QUIZ, QUIZ_ADV, THEORY, IMP, EXAMPLES, TIPS, EXERCISES, SIMS } = vm.runInContext('({ PARTS, QUIZ, QUIZ_ADV, THEORY, IMP, EXAMPLES, TIPS, EXERCISES, SIMS })', ctx);
const EX_LEVELS = ['basic', 'mid', 'adv'];
let ran = 0;
// run a simulator on its input; returns the result or records a problem
function trySim(at, what, name, input) {
  if (!SIMS[name]) { fail(at, `${what} uses unknown simulator "${name}"`); return null; }
  if (typeof input !== 'string' || !input.trim()) { fail(at, `${what} has no simulator input`); return null; }
  try { ran++; return SIMS[name].run(input); }
  catch (e) { fail(at, `${what}: simulator ${name} fails: ${e.message}`); return null; }
}
const MIN_CORE = 3, MIN_ADV = 2;   // the quiz draws this many per attempt
const seenNo = new Set(), seenQ = new Map();

for (const p of PARTS) {
  if (!p.topics.length) fail(`part ${p.no}`, 'has no topics');
  for (const t of p.topics) {
    const at = fileOf[t.no] || `topic ${t.no}`;
    if (seenNo.has(t.no)) fail(at, 'duplicate topic number');
    seenNo.add(t.no);
    for (const k of ['title', 'idea', 'codes', 'steps', 'keep'])
      if (!t[k] || (Array.isArray(t[k]) && !t[k].length)) fail(at, `missing "${k}"`);
    if (!['must', 'good', 'extra'].includes(IMP[t.no])) fail(at, `imp must be must, good or extra`);

    const th = THEORY[t.no];
    if (!th) fail(at, 'missing theory');
    else for (const k of ['one', 'intro', 'terms', 'steps', 'practice', 'mistakes'])
      if (!th[k] || (Array.isArray(th[k]) && !th[k].length)) fail(at, `theory is missing "${k}"`);

    // steps: code variant exists and highlighted lines are inside it
    let cv = 'a';
    (t.steps || []).forEach((s, i) => {
      cv = s.cv || cv;
      const code = t.codes && t.codes[cv];
      if (typeof s.say !== 'string' || !s.say) fail(at, `step ${i + 1} has no "say"`);
      (s.g || []).forEach(g => (g && Array.isArray(g.r) ? g.r : [null]).forEach(r => {
        if (!Array.isArray(r) && !(r && Array.isArray(r.c))) fail(at, `step ${i + 1} has a malformed key-facts row in "${g && g.t}": use [key, value, flag] or C(key, chips)`);
      }));
      if (typeof code !== 'string') { fail(at, `step ${i + 1} uses code variant "${cv}", which doesn't exist`); return; }
      const n = code.split('\n').length;
      Object.entries(s.hl || {}).forEach(([who, ls]) => ls.forEach(l => {
        if (!(l >= 1 && l <= n)) fail(at, `step ${i + 1} highlights line ${l} for ${who}, but variant "${cv}" has ${n} lines`);
      }));
    });

    // examples: at least 3, simple → complex; simulator ones must run
    const ex = EXAMPLES[t.no] || [];
    if (ex.length < 3) fail(at, `has ${ex.length} examples; needs at least 3 (simple → complex)`);
    ex.forEach((x, i) => {
      const w = `example ${i + 1}`;
      if (!EX_LEVELS.includes(x.lv)) fail(at, `${w} lv must be basic, mid or adv`);
      else if (i && EX_LEVELS.indexOf(x.lv) < EX_LEVELS.indexOf(ex[i - 1].lv)) fail(at, `${w} is easier than the one before it; order simple → complex`);
      for (const k of ['title', 'why']) if (typeof x[k] !== 'string' || !x[k].trim()) fail(at, `${w} has no "${k}"`);
      if (!x.code && !x.sim) fail(at, `${w} needs code or a simulator`);
      if (x.sim) trySim(at, w, x.sim, x.input);
    });
    if (ex.length && !ex.some(x => x.lv === 'basic')) fail(at, 'examples need at least one basic one');
    if (ex.length && !ex.some(x => x.lv !== 'basic')) fail(at, 'examples need at least one intermediate or advanced one');

    // interview tips
    const tp = TIPS[t.no];
    if (!tp) fail(at, 'missing interview tips');
    else {
      if (typeof tp.say !== 'string' || !tp.say.trim()) fail(at, 'tips need a "say" answer');
      if (!Array.isArray(tp.points) || tp.points.length < 2) fail(at, 'tips need at least 2 points');
      if (!Array.isArray(tp.traps) || tp.traps.length < 1) fail(at, 'tips need at least 1 trap');
      if (!Array.isArray(tp.qa) || tp.qa.length < 2 || tp.qa.some(q => !Array.isArray(q) || q.length !== 2 || !q[0] || !q[1])) fail(at, 'tips need at least 2 follow-up [question, answer] pairs');
    }

    // exercises: at least 3; checked ones need a fixed answer or a simulator key that exists
    const xr = EXERCISES[t.no] || [];
    if (xr.length < 3) fail(at, `has ${xr.length} exercises; needs at least 3`);
    xr.forEach((x, i) => {
      const w = `exercise ${i + 1}`;
      if (!['E', 'M', 'H'].includes(x.lv)) fail(at, `${w} level must be E, M or H`);
      if (typeof x.q !== 'string' || !x.q.trim()) fail(at, `${w} has no question`);
      if (x.ans === undefined && !x.key && !x.answer) fail(at, `${w} needs an answer: ans, a simulator key, or a written answer`);
      if (x.key && !x.sim) fail(at, `${w} has a key but no simulator`);
      if (x.sim) {
        const r = trySim(at, w, x.sim, x.input);
        if (r && x.key && r.keys[x.key] === undefined) fail(at, `${w}: simulator ${x.sim} has no key "${x.key}" (has ${Object.keys(r.keys).join(', ')})`);
        if (r && x.key && x.ans !== undefined && !vm.runInContext(`sameAnswer(${JSON.stringify(String(x.ans))}, ${JSON.stringify(String(r.keys[x.key]))})`, ctx)) fail(at, `${w}: ans ${x.ans} disagrees with the simulator (${r.keys[x.key]})`);
      }
    });

    // quiz banks
    [['core', QUIZ[t.no] || [], MIN_CORE], ['advanced', QUIZ_ADV[t.no] || [], MIN_ADV]].forEach(([set, qs, min]) => {
      if (qs.length < min) fail(at, `${set} bank has ${qs.length} questions; needs at least ${min}`);
      qs.forEach((q, i) => {
        const w = `${set} question ${i + 1}`;
        if (!Array.isArray(q) || q.length !== 5) return fail(at, `${w} must be [question, options, answer, why, level]`);
        const [text, opts, ans, why, lv] = q;
        if (typeof text !== 'string' || !text.trim()) fail(at, `${w} has no text`);
        if (!Array.isArray(opts) || opts.length !== 4 || opts.some(o => typeof o !== 'string' || !o.trim())) fail(at, `${w} needs 4 non-empty options`);
        else if (new Set(opts).size !== 4) fail(at, `${w} has duplicate options`);
        if (!Number.isInteger(ans) || ans < 0 || ans > 3) fail(at, `${w} answer index must be 0-3`);
        if (typeof why !== 'string' || !why.trim()) fail(at, `${w} has no explanation`);
        if (!['E', 'M', 'H'].includes(lv)) fail(at, `${w} level must be E, M or H`);
        const prev = seenQ.get(text);
        if (prev) fail(at, `${w} duplicates a question in ${prev}`);
        else seenQ.set(text, `${at} (${set} ${i + 1})`);
      });
    });
  }
}

const core = Object.values(QUIZ).flat().length, adv = Object.values(QUIZ_ADV).flat().length;
if (problems.length) {
  console.error(problems.map(p => '  ✗ ' + p).join('\n'));
  console.error(`\n${problems.length} problem(s) found.`);
  process.exit(1);
}
const nEx = Object.values(EXAMPLES).flat().length, nXr = Object.values(EXERCISES).flat().length;
console.log(`content ok: ${PARTS.length} parts, ${seenNo.size} topics, ${nEx} examples, ${nXr} exercises, ${core} core + ${adv} advanced questions, ${ran} simulator runs passed`);
