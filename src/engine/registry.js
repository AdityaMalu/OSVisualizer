/* ---------- content registry: parts and topics register here.
   The engine reads PARTS and the per-topic STUDY material (theory, examples, tips, exercises, quizzes). ---------- */
const PARTS = [];
const QUIZ = {}, QUIZ_ADV = {}, THEORY = {}, IMP = {}, EXAMPLES = {}, TIPS = {}, EXERCISES = {};

function part(no, title) { PARTS.push({ no, title, topics: [] }); }

/* topic(partNo, walkthrough, study)
   walkthrough: { no, title, idea, codes, steps, keep, ... } drives the stepper.
     steps: [{ say, hl, th, g, tb, d, gt, log, cv }]  th = processes/threads, g = key facts, tb = tables,
            d = diagram overlay, gt = Gantt timeline {segs:[[label, start, end]], now?}, log = output lines
   study: {
     imp: 'must'|'good'|'extra',
     theory:    TH(...),
     examples:  [ {lv:'basic'|'mid'|'adv', title, why, code?, out?, sim?, input?} ]   simple → complex
                code: C / shell / pseudo-code shown as is (out: what it prints)
                sim + input: runs in one of the OS simulators (engine/sims.js); the reader can edit the input
     tips:      { say, points:[…], traps:[…], qa:[[question, answer], …] }
     exercises: [ {lv:'E'|'M'|'H', q, hint, sim?, input?, key?, ans?, answer?} ]
                sim + input + key: the answer is computed by the simulator and the reader's answer is checked against it
                ans: a fixed expected answer, checked the same way;  answer: worked solution (html)
     quiz:      [ [question, [a, b, c, d], answerIndex, why, 'E'|'M'|'H'], … ]   at least 3
     quizAdv:   [ … ]                                                            at least 2
   } */
function topic(partNo, walk, study = {}) {
  const p = PARTS.find(x => x.no === partNo);
  if (!p) throw new Error(`Topic ${walk.no}: unknown part ${partNo}`);
  p.topics.push(walk);
  if (study.imp) IMP[walk.no] = study.imp;
  if (study.theory) THEORY[walk.no] = study.theory;
  EXAMPLES[walk.no] = study.examples || [];
  TIPS[walk.no] = study.tips || null;
  EXERCISES[walk.no] = study.exercises || [];
  QUIZ[walk.no] = study.quiz || [];
  QUIZ_ADV[walk.no] = study.quizAdv || [];
}

/* ---------- helpers for building step state ---------- */
const G = (t, ...r) => ({ t, r });
const C = (k, c, f) => ({ k, c, f });
/* TB(title, columns, rows, flags): a table snapshot. flags maps a row index to hot | ok | bad | dim | new. */
const TB = (t, cols, rows, f = {}) => ({ t, cols, rows, f });
/* GT(now, ...segs): a Gantt timeline; each seg is [label, start, end]. now draws a "time" marker. */
const GT = (now, ...segs) => ({ now, segs });

/* ---------- theory: a from-zero explanation per topic.
   TH(one-line idea, intro html, [[term, meaning]], [how it works steps], [in real projects], [common mistakes]) ---------- */
const TH = (one, intro, terms, steps, practice, mistakes) => ({one, intro, terms, steps, practice, mistakes});
