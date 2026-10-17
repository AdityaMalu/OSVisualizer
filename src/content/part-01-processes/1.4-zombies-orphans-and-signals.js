/* 1.4 Zombies, orphans and signals */
topic('1', { no:'1.4', title:'Zombies, orphans and signals',
idea:`A child that exits before its parent waits becomes a <b>zombie</b>; a child whose parent dies first becomes an <b>orphan</b> and is adopted by PID 1. Signals are how the kernel tells processes about these events. Watch both happen, then fix the zombie with a SIGCHLD handler.`,
actors:'Processes', dgTitle:'Process tree', stateTitle:'Process table',
nodes:{
  init:{x:240,y:30,label:'PID 1 (init)',w:130,h:36,kind:'actor'},
  par:{x:120,y:110,label:'parent 500',w:120,h:36,kind:'actor'},
  c1:{x:60,y:200,label:'child 501',w:110,h:36,kind:'actor'},
  c2:{x:200,y:200,label:'child 502',w:110,h:36,kind:'actor'}
},
edges:[['init','par'],['par','c1'],['par','c2']],
vb:'0 0 400 230',
codes:{a:`// zombie: parent never waits
if (fork() == 0) exit(0);          // child 501 exits at once
sleep(60);                         // parent busy, ignores the child

// orphan: parent exits first
if (fork() == 0) { sleep(5); printf("ppid=%d\\n", getppid()); exit(0); }
exit(0);                           // parent 500 dies → child 502 adopted by PID 1

// fix: reap children when SIGCHLD arrives
void on_chld(int sig) {
    while (waitpid(-1, NULL, WNOHANG) > 0) ;   // reap every dead child
}
signal(SIGCHLD, on_chld);`},
steps:[
{hl:{c501:[2], parent:[3]}, th:[['parent','TIMED:info','sleeping 60 s'],['c501','ZOMBIE:bad','exited, not reaped']], d:{on:['c1'], bad:['c1'], hide:['c2'], e:[['par','c1','','bad']]}, tb:[TB('process table',['pid','ppid','state','holds'],[['500','1','S (sleeping)','everything'],['501','500','Z (zombie)','only pid + exit status']],{1:'bad'})], log:['501 exits(0) → SIGCHLD sent to 500 (ignored)'],
 say:`Child 501 exits immediately. Its memory and files are freed, but the kernel must keep a tiny record (pid, exit status, CPU usage) until the parent asks for it with <code>wait</code>. Until then 501 is a <b>zombie</b> (<code>Z</code> in ps, "&lt;defunct&gt;"). The kernel sent the parent <code>SIGCHLD</code>, but the default action is to ignore it.`},
{hl:{parent:[3]}, tb:[TB('process table',['pid','ppid','state','holds'],[['500','1','S (sleeping)','everything'],['501','500','Z','pid + status'],['…','500','Z','×1000 if the parent keeps forking']],{1:'bad',2:'bad'})], g:[G('Why zombies matter',['memory','tiny','ok'],['pid','one per zombie: the pid table can fill up','bad'],['kill -9 a zombie?','no effect: it is already dead','bad'],['cure','parent waits, or the parent dies'])],
 say:`One zombie is harmless. A long-running server that forks per request and never waits accumulates thousands, and eventually <code>fork</code> fails because pids run out. You can't <code>kill</code> a zombie: it's already dead. Only the parent can reap it (or the parent's death hands it to PID 1, which reaps it).`},
{hl:{c502:[6], parent:[7]}, th:[['parent','TERM:dim','exited'],['c502','TIMED:info','sleeping 5 s, parent gone']], d:{on:['c2'], hide:['c1'], dim:['par'], e:[['init','c2','adopts','hot']]}, tb:[TB('process table',['pid','ppid','state'],[['502','500 → 1','S (sleeping)']],{0:'hot'})], log:['500 exits → 502 reparented to PID 1'],
 say:`Now the opposite: parent 500 exits while child 502 is still running. 502 is an <b>orphan</b>. The kernel <b>reparents</b> it to PID 1 (or a designated "subreaper" such as a container's init). Orphans are not a problem: they keep running normally.`},
{hl:{c502:[6]}, th:[['c502','TERM:dim','exited, reaped by PID 1'],['init','RUN:ok','calls wait()']], d:{on:['init'], hide:['c1','par'], e:[['init','c2','wait()','ok']]}, tb:[TB('process table',['pid','ppid','state'],[['502','1','gone']],{0:'dim'})], log:['ppid=1','PID 1 reaps 502'],
 say:`502 prints <code>ppid=1</code>, then exits. PID 1 loops calling <code>wait</code>, so it reaps adopted children immediately: an orphan never stays a zombie for long. That's one of PID 1's jobs.`},
{hl:{parent:[10,11,12,13]}, th:[['parent','RUN:ok','SIGCHLD handler reaps'],['c501','TERM:dim','reaped']], d:{on:['par'], hide:['c2'], dim:['c1'], e:[['c1','par','SIGCHLD','hot']]}, tb:[TB('process table',['pid','ppid','state'],[['500','1','R (in handler)'],['501','500','gone']],{1:'dim'})], log:['SIGCHLD → on_chld → waitpid(-1, WNOHANG) = 501'],
 say:`The fix for zombies: install a <b>SIGCHLD handler</b> that reaps. A <b>signal</b> is an asynchronous notification delivered to a process; when it arrives, the kernel interrupts the process's normal flow and runs the handler. The loop with <code>WNOHANG</code> matters: several children may exit while one signal is pending, and signals of one type don't queue.`},
{hl:{}, th:[], d:null, tb:[], g:[G('Common signals',['SIGINT (2)','Ctrl-C, default: terminate'],['SIGTERM (15)','polite "please exit"; can be handled'],['SIGKILL (9)','cannot be caught or ignored','bad'],['SIGSEGV (11)','invalid memory access'],['SIGCHLD','a child stopped or exited'],['SIGSTOP / SIGCONT','pause / resume (Ctrl-Z)'])],
 say:`<b>Say it:</b> "A zombie is a process that has exited but whose parent hasn't called wait, so its exit status and pid are kept. Fix it by waiting, typically in a SIGCHLD handler. An orphan is a running process whose parent died; it's adopted by init, which reaps it. Signals are asynchronous notifications like SIGINT, SIGTERM, SIGKILL and SIGCHLD; processes can handle most of them, except SIGKILL and SIGSTOP."`}
],
keep:[`Zombie: exited, parent hasn't waited. Holds pid + status. Can't be killed.`,`Orphan: parent died first; adopted (and later reaped) by PID 1.`,`Fix zombies: wait/waitpid, e.g. in a SIGCHLD handler with WNOHANG loop.`,`SIGKILL and SIGSTOP can't be caught or ignored.`,`SIGTERM first, SIGKILL only if it doesn't exit.`]}, {
  imp: 'must',
  theory: TH(`A zombie is an exited child not yet reaped by its parent; an orphan is a living child whose parent died; signals are the asynchronous notifications that tie these events together.`,
`<p>When a process dies, its parent may want to know how (exit code, killed by which signal). So the kernel keeps a small "death certificate" until the parent picks it up with <code>wait</code>. A process in that state is a zombie. It uses almost no memory but does hold a pid.</p>
<p>If the parent dies first, nobody would ever pick up the children's certificates, so the kernel gives the children a new parent: PID 1, whose job includes reaping adopted children. Signals (<code>SIGCHLD</code>, <code>SIGTERM</code>, <code>SIGKILL</code>…) are how the kernel and processes notify each other of such events.</p>`,
[[`Zombie (defunct)`,`Terminated process whose status hasn't been collected.`],[`Orphan`,`Process whose parent has exited; reparented to init.`],[`Reaping`,`Calling wait to collect a child's status and free its entry.`],[`Signal`,`Asynchronous software notification to a process.`],[`Signal handler`,`Function run when a caught signal arrives.`],[`SIGCHLD`,`Sent to a parent when a child stops or exits.`],[`Subreaper`,`Process that adopts orphans in its subtree instead of PID 1 (prctl).`]],
[`Child calls exit: kernel frees its resources, keeps pid + status, sends SIGCHLD to the parent.`,`If the parent calls wait, the entry is removed (reaped).`,`If the parent never waits, the zombie remains until the parent exits.`,`When a parent exits, its living children are reparented to init or a subreaper.`,`init reaps them when they exit.`],
[`Servers that fork workers must reap them (SIGCHLD handler or a wait loop).`,`Containers need an init (tini, dumb-init) as PID 1 to reap and forward signals.`,`Graceful shutdown: handle SIGTERM, finish work, exit; orchestrators send SIGKILL after a timeout.`],
[`Trying to kill -9 a zombie.`,`Calling waitpid once per SIGCHLD (signals coalesce; loop with WNOHANG).`,`Doing unsafe work (printf, malloc) inside signal handlers.`,`Sending SIGKILL first and losing in-flight work.`])
  ,
  examples: [
    {lv:'basic', title:'Make and spot a zombie', code:`$ cat zombie.c
int main(void) { if (fork() == 0) return 0; sleep(30); }
$ ./zombie & sleep 1; ps -o pid,ppid,stat,comm --ppid $!
  PID  PPID STAT COMMAND
 4243  4242 Z+   zombie <defunct>`, why:`The child exited at once; the parent sleeps without waiting, so the child shows <code>Z</code> / <code>&lt;defunct&gt;</code> until the parent exits after 30 s.`},
    {lv:'mid', title:'Graceful shutdown with SIGTERM', code:`volatile sig_atomic_t stop = 0;
void on_term(int s) { stop = 1; }          // only set a flag: async-signal-safe
int main(void) {
    signal(SIGTERM, on_term);
    while (!stop) do_work();
    flush_and_close();                     // clean exit
}
$ kill 4242        # SIGTERM: exits cleanly
$ kill -9 4242     # SIGKILL: no handler, no cleanup`, why:`Handlers should do almost nothing; setting a flag is the safe pattern. Kubernetes and systemd send SIGTERM, wait a grace period, then SIGKILL.`},
    {lv:'adv', title:'Reap all children, even if signals coalesce', code:`void on_chld(int sig) {
    int saved = errno;                       // handlers must not clobber errno
    while (waitpid(-1, NULL, WNOHANG) > 0)
        ;                                    // 3 children may die → maybe 1 SIGCHLD
    errno = saved;
}
struct sigaction sa = { .sa_handler = on_chld, .sa_flags = SA_RESTART | SA_NOCLDSTOP };
sigaction(SIGCHLD, &sa, NULL);`, why:`Standard signals don't queue: if three children exit while SIGCHLD is pending, the handler runs once. The WNOHANG loop reaps all of them. <code>SA_RESTART</code> restarts interrupted syscalls.`},
  ],
  tips: {
    say:`"A zombie is a child that has exited but whose parent hasn't called wait, so the kernel keeps its pid and exit status. You fix it by having the parent wait, usually from a SIGCHLD handler looping waitpid with WNOHANG. An orphan is a child whose parent exited; it's reparented to init, which reaps it. Signals are asynchronous notifications; SIGKILL and SIGSTOP can't be caught."`,
    points:[`Define both precisely and contrast them.`,`Explain why a zombie can't be killed.`,`Give the SIGCHLD + WNOHANG loop fix.`],
    traps:[`Saying zombies use lots of memory.`,`Saying orphans are a problem.`],
    qa:[[`How do you get rid of a zombie if you can't change the parent?`,`Make the parent reap (send it SIGCHLD, if it has a handler) or kill the parent; the zombie is reparented to init, which reaps it.`],
        [`Why is SIGKILL uncatchable?`,`So an administrator can always stop a process, no matter how it's written.`],
        [`What can you safely do in a signal handler?`,`Only async-signal-safe functions (write, _exit, setting a volatile sig_atomic_t flag). printf and malloc can deadlock if the signal interrupted them.`]]
  },
  exercises: [
    {lv:'E', q:`A child exits; its parent is still running and never calls wait. What is the child now?`, ans:'zombie', hint:`Dead but not reaped.`, answer:`<p>A zombie (defunct) until the parent waits or exits.</p>`},
    {lv:'M', q:`A parent exits while its child is still sleeping. What does <code>getppid()</code> return in the child afterwards on a typical Linux system without subreapers?`, ans:'1', hint:`Who adopts orphans?`, answer:`<p>1: the child is reparented to init.</p>`},
    {lv:'H', q:`A server forks a worker per request and has a SIGCHLD handler that calls <code>wait(NULL)</code> once. Under load, zombies still pile up. Why, and what's the fix?`, hint:`Do signals queue?`, answer:`<p>Standard signals aren't queued: several children exiting close together produce one SIGCHLD delivery, so one wait reaps one child. Loop: <code>while (waitpid(-1, NULL, WNOHANG) &gt; 0);</code>. Alternatively set SIGCHLD to SIG_IGN (children are then reaped automatically on Linux).</p>`},
  ],
  quiz: [
    [`A zombie process is…`,[`Using 100% CPU`,`Terminated but not yet reaped by its parent`,`An orphan`,`Stopped with SIGSTOP`],1,`Status waits for wait().`,'E'],
    [`An orphan is adopted by…`,[`The kernel scheduler`,`PID 1 (or a subreaper)`,`Its sibling`,`Nobody`],1,`Reparenting.`,'E'],
    [`kill -9 on a zombie…`,[`Removes it`,`Has no effect`,`Kills its parent`,`Reboots`],1,`It's already dead.`,'E'],
    [`Which signal cannot be caught?`,[`SIGTERM`,`SIGINT`,`SIGKILL`,`SIGCHLD`],2,`Also SIGSTOP.`,'M'],
    [`The parent is notified of a child's exit by…`,[`SIGTERM`,`SIGCHLD`,`SIGSEGV`,`SIGHUP`],1,`Default action: ignore.`,'M'],
    [`Why can many zombies break a system?`,[`They use all RAM`,`They hold pids, so fork can fail when pids run out`,`They hold locks`,`They use CPU`],1,`PID exhaustion.`,'M'],
  ],
  quizAdv: [
    [`Why loop waitpid(-1, …, WNOHANG) in a SIGCHLD handler?`,[`Style`,`Several exits can produce one SIGCHLD; the loop reaps them all without blocking`,`To kill children`,`To restart children`],1,`Signals coalesce.`,'H'],
    [`Setting SIGCHLD to SIG_IGN on Linux…`,[`Does nothing`,`Makes exited children be reaped automatically (no zombies)`,`Kills children`,`Blocks fork`],1,`POSIX-specified behaviour.`,'H'],
    [`Which is async-signal-safe?`,[`printf`,`malloc`,`write`,`fopen`],2,`write is on the safe list.`,'H'],
  ],
});
