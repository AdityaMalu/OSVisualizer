/* ---------- DOM and text helpers, current position ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const STATE = {NEW:'NEW', READY:'READY', RUN:'RUNNING', BLOCKED:'BLOCKED', WAITING:'WAITING', TIMED:'SLEEPING', TERM:'DONE', ZOMBIE:'ZOMBIE'};
// C, shell and pseudo-code keywords, plus the simulator settings
const KW = /\b(int|char|void|long|short|unsigned|signed|size_t|ssize_t|pid_t|off_t|bool|struct|union|enum|typedef|static|const|volatile|extern|atomic_int|atomic_bool|_Atomic|if|else|for|while|do|switch|case|default|break|continue|return|goto|sizeof|NULL|true|false|pthread_t|pthread_mutex_t|pthread_cond_t|sem_t|FILE|include|define|ifdef|endif|algo|quantum|frames|refs|head|cylinders|direction|requests|available|resources|request|mode|holes|page-size|table|addresses|tlb|tlb-time|mem-time|shared|schedule|levels|priority|boost|jump|procedure|function|repeat|until|then|end|begin|loop|forever|wait|signal|acquire|release|lock|unlock|monitor|condition|entry)\b/g;
function hiCode(line){
  const ci = line.search(/\/\/|\/\*|(?:^|\s)#(?=\s|$)/);
  const code = ci>=0 ? line.slice(0,ci) : line, cm = ci>=0 ? line.slice(ci) : '';
  // strings first, then keywords outside strings
  const parts = code.split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)')/);
  const out = parts.map((p,i)=> i%2 ? `<span class="st">${esc(p)}</span>` : esc(p).replace(KW, m => `<span class="kw">${m}</span>`).replace(/^(\s*)(#\w+)/, '$1<span class="an">$2</span>')).join('');
  return out + (cm ? `<span class="cm">${esc(cm)}</span>` : '');
}
const hiBlock = src => String(src).split('\n').map(hiCode).join('\n');
let ti = 0, si = 0, timer = null;
