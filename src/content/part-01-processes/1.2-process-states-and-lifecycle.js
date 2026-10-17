/* 1.2 Process states and lifecycle */
topic('1', { no:'1.2', title:'Process states and the lifecycle',
idea:`A process spends most of its life not running. Follow three processes through the five-state model (new, ready, running, waiting, terminated) as they get the CPU, block on disk, get preempted and finish, and watch the ready and wait queues change.`,
actors:'Processes', dgTitle:'Five-state model', stateTitle:'Kernel queues',
nodes:{
  new:{x:60,y:60,label:'new',w:90,h:36,kind:'circle'},
  ready:{x:200,y:60,label:'ready',w:90,h:36,kind:'circle'},
  run:{x:360,y:60,label:'running',w:100,h:36,kind:'circle'},
  wait:{x:280,y:180,label:'waiting',w:100,h:36,kind:'circle'},
  term:{x:470,y:150,label:'terminated',w:110,h:36,kind:'circle'}
},
edges:[['new','ready','admit'],['ready','run','dispatch'],['run','ready','preempt'],['run','wait','I/O or event wait'],['wait','ready','I/O done'],['run','term','exit']],
vb:'0 0 540 220',
codes:{a:`// P1: an editor         // P2: a compiler           // P3: a backup job
read(keyboard)            compile(file)                read(disk)
                          compile(file)                write(network)
                          exit(0)                      exit(0)

// the kernel's view
//   ready queue:  processes that could run right now
//   wait queues:  one per event (disk, keyboard, network, timer …)
//   running:      one per CPU core`},
steps:[
{hl:{P1:[2],P2:[2],P3:[2]}, th:[['P1','NEW:dim','being created'],['P2','NEW:dim','being created'],['P3','NEW:dim','being created']], d:{on:['new'], e:[]}, g:[G('Kernel queues',['ready','—'],['running (1 CPU)','—'],['waiting','—'])],
 say:`Three processes are being created (<b>new</b>): the kernel is building their PCBs and address spaces. They aren't eligible to run until they're admitted.`},
{th:[['P1','RUN:ok','on the CPU'],['P2','READY:info','in ready queue'],['P3','READY:info','in ready queue']], d:{on:['ready','run'], e:[['new','ready','admit','ok'],['ready','run','dispatch','hot']]}, g:[G('Kernel queues',['ready',C('ready',['P2','P3'])],['running (1 CPU)','P1','hot'],['waiting','—'])], gt:GT(0),
 say:`All three are admitted to the <b>ready</b> queue: they could run if they had a CPU. The scheduler <b>dispatches</b> P1. With one core, exactly one process is <b>running</b>; the others wait their turn.`},
{hl:{P1:[2]}, th:[['P1','WAITING:warn','waits for a keypress'],['P2','RUN:ok','on the CPU'],['P3','READY:info','in ready queue']], d:{on:['wait','run'], e:[['run','wait','read(keyboard)','hot'],['ready','run','dispatch','hot']]}, g:[G('Kernel queues',['ready',C('ready',['P3'])],['running (1 CPU)','P2','hot'],['waiting',C('keyboard',['P1'])])], gt:GT(2,['P1',0,2]), log:['t=2 P1 blocks on keyboard'],
 say:`P1 calls <code>read()</code> on the keyboard. No key yet, so P1 moves to <b>waiting</b> (blocked) on the keyboard's wait queue. It would be wasteful to keep it on the CPU, so the scheduler dispatches P2. Blocking is voluntary: the process gave up the CPU.`},
{hl:{P2:[3]}, th:[['P1','WAITING:warn','still waiting'],['P2','READY:info','preempted: slice used up'],['P3','RUN:ok','on the CPU']], d:{on:['ready','run'], e:[['run','ready','timer: preempt','hot'],['ready','run','dispatch','hot']]}, g:[G('Kernel queues',['ready',C('ready',['P2'])],['running (1 CPU)','P3','hot'],['waiting',C('keyboard',['P1'])])], gt:GT(6,['P1',0,2],['P2',2,6]), log:['t=6 timer: P2 preempted'],
 say:`P2 is compiling and never blocks, but its time slice runs out. The timer interrupt makes the kernel <b>preempt</b> it: running → <b>ready</b> (not waiting! it can run, it just isn't its turn). P3 is dispatched.`},
{hl:{P3:[2], P1:[2]}, th:[['P1','READY:ok','key pressed: ready again'],['P2','RUN:ok','on the CPU'],['P3','WAITING:warn','waits for disk']], d:{on:['wait','ready'], e:[['run','wait','read(disk)','hot'],['wait','ready','key arrived','ok']]}, g:[G('Kernel queues',['ready',C('ready',['P1'])],['running (1 CPU)','P2','hot'],['waiting',C('disk',['P3'])])], gt:GT(7,['P1',0,2],['P2',2,6],['P3',6,7]), log:['t=7 P3 blocks on disk','t=7 keypress → P1 ready'],
 say:`P3 starts a disk read and blocks on the disk queue. Meanwhile a key is pressed: the keyboard interrupt moves P1 from waiting to <b>ready</b>. Note: it goes to ready, not straight to running. The scheduler picks P2 next.`},
{hl:{P2:[4], P1:[2]}, th:[['P1','RUN:ok','handles the key'],['P2','TERM:dim','exited'],['P3','WAITING:warn','waits for disk']], d:{on:['term','run'], e:[['run','term','exit(0)','hot'],['ready','run','dispatch','hot']]}, g:[G('Kernel queues',['ready','—'],['running (1 CPU)','P1','hot'],['waiting',C('disk',['P3'])])], gt:GT(9,['P1',0,2],['P2',2,6],['P3',6,7],['P2',7,9]), log:['t=9 P2 exits'],
 say:`P2 finishes and calls <code>exit</code>: <b>terminated</b>. Its resources are released (its PCB lingers briefly so the parent can collect the exit status). P1 runs to handle the keypress. The disk is still busy for P3.`},
{th:[['P1','RUN:ok',''],['P2','TERM:dim',''],['P3','WAITING:warn','']], d:{on:[], e:[]}, gt:null, g:[G('Transitions',['ready → running','dispatch (scheduler)'],['running → ready','preempted (timer) or yield','hot'],['running → waiting','blocks on I/O, lock, sleep','hot'],['waiting → ready','event happened (interrupt)'],['running → terminated','exit or killed']),G('Never happens',['waiting → running directly','must go through ready','bad'],['ready → waiting','only a running process can block','bad'])],
 say:`<b>Say it:</b> "A process is new, ready, running, waiting or terminated. Ready processes sit in the ready queue; the scheduler dispatches one per core. A running process goes to waiting when it blocks on I/O or a lock, back to ready when preempted, and to terminated when it exits. When the event it waits for happens, it moves from waiting to ready, not directly to running."`}
],
keep:[`Five states: new, ready, running, waiting (blocked), terminated.`,`Preempted → ready. Blocked on I/O → waiting.`,`Waiting → ready → running (never waiting → running).`,`One running process per core; the rest are queued.`,`Linux adds stopped (SIGSTOP) and zombie (exited, not reaped).`]}, {
  imp: 'must',
  theory: TH(`A process moves between new, ready, running, waiting and terminated; the scheduler moves ready processes onto the CPU, and events move waiting processes back to ready.`,
`<p>Think of a doctor's office with one doctor (CPU). Patients in the waiting room are <b>ready</b>. The one with the doctor is <b>running</b>. A patient sent for an X-ray is <b>waiting</b>: they can't see the doctor until the result comes back, and then they return to the waiting room, not straight into the office.</p>
<p>The OS keeps these as queues of PCBs: one ready queue (or several, by priority) and one wait queue per event or device. State changes are just moving a PCB from one queue to another.</p>`,
[[`New`,`Being created.`],[`Ready`,`Could run; waiting for a CPU.`],[`Running`,`Executing on a CPU.`],[`Waiting / blocked`,`Waiting for an event (I/O, lock, timer).`],[`Terminated`,`Finished; waiting to be cleaned up.`],[`Dispatch`,`Scheduler gives a ready process the CPU.`],[`Preemption`,`Kernel takes the CPU away from a running process.`],[`Suspended`,`Swapped out of memory (extended 7-state model).`]],
[`Creation puts the process in new, then ready.`,`The scheduler dispatches a ready process: it becomes running.`,`If it blocks (I/O, lock), it moves to a wait queue.`,`An interrupt for that event moves it back to ready.`,`A timer interrupt can preempt it back to ready.`,`exit makes it terminated until the parent collects its status.`],
[`top/ps show states: R (running or runnable), S (sleeping), D (uninterruptible I/O wait), T (stopped), Z (zombie).`,`Many processes in D state means storage trouble.`,`Load average counts R and D processes.`],
[`Saying a preempted process goes to waiting.`,`Thinking a woken process runs immediately.`,`Confusing waiting (blocked on an event) with ready (waiting for CPU).`])
  ,
  examples: [
    {lv:'basic', title:'Process states in ps', code:`$ ps -eo pid,stat,comm | head
  PID STAT COMMAND
    1 Ss   systemd        # S = sleeping (waiting for an event)
  812 Ss   sshd
 2210 R+   ps             # R = running or runnable (ready)
 3301 D    rsync          # D = uninterruptible wait (disk I/O)
 3399 Z    worker         # Z = zombie: exited, not yet reaped`, why:`Linux merges ready and running into R. S and D are both "waiting"; D can't be interrupted by signals (usually disk I/O).`},
    {lv:'mid', title:'Blocking frees the CPU for others', sim:'sched', input:`# think of each burst as CPU work between blocking calls
algo: RR
quantum: 4
editor   0 2
compiler 0 8
backup   0 3`, why:`The short editor burst finishes quickly and (in real life) blocks for the next key, letting the compiler and backup use the CPU. Look at the response times column: everyone gets the CPU early.`},
    {lv:'adv', title:'Seeing state transitions with a tracer', code:`$ sudo perf sched record -- sleep 1
$ sudo perf sched timehist | head -4
 time      cpu  task         wait time  sch delay  run time
 1.000110  [1]  bash[2210]       0.000      0.004     0.120
 1.000300  [1]  sleep[2290]     999.8      0.006     0.010   # waited ~1 s (sleeping), then ready
`, why:`<i>wait time</i> is time blocked (waiting state); <i>sch delay</i> is time ready but not yet running. Splitting the two is how you tell "slow I/O" from "CPU starved".`},
  ],
  tips: {
    say:`"Processes are new, ready, running, waiting or terminated. The scheduler dispatches ready processes. A running process blocks into waiting on I/O or locks, gets preempted back to ready by the timer, or exits. Events like I/O completion move a waiting process to ready, and it runs when the scheduler picks it."`,
    points:[`Draw the five-state diagram with labelled transitions.`,`Distinguish preemption (→ ready) from blocking (→ waiting).`,`Mention queues of PCBs.`],
    traps:[`Waiting → running directly.`,`Ready → waiting.`],
    qa:[[`What is the difference between S and D states in Linux?`,`S (interruptible sleep) can be woken by a signal; D (uninterruptible) cannot, typically during disk I/O, so kill -9 waits until the I/O finishes.`],
        [`What is a suspended state?`,`In the seven-state model, a ready or blocked process can be swapped out to disk (suspended ready / suspended blocked) to free memory.`],
        [`What does load average measure?`,`On Linux, the average number of processes in R (running or ready) plus D (uninterruptible wait) states over 1, 5 and 15 minutes.`]]
  },
  exercises: [
    {lv:'E', q:`A running process's time slice expires. Which state does it go to?`, ans:'ready', hint:`It still could run.`, answer:`<p>Ready: it's preempted, not blocked.</p>`},
    {lv:'M', q:`A process blocked on disk gets its data. List the states it passes through until it runs again, like <code>waiting ready running</code>.`, ans:'waiting ready running', hint:`No shortcuts.`, answer:`<p>waiting → ready (I/O interrupt) → running (when dispatched).</p>`},
    {lv:'H', q:`On a 4-core machine, the load average is 12 but CPU usage is only 20%. What's likely going on?`, hint:`What else counts in load average?`, answer:`<p>Load counts D-state (uninterruptible I/O wait) processes. Many processes blocked on slow storage or NFS raise load without using CPU. Check <code>iostat</code>, <code>vmstat</code> (b column) and <code>ps</code> for D states.</p>`},
  ],
  quiz: [
    [`A process waiting for a disk read is in state…`,[`Ready`,`Running`,`Waiting/blocked`,`Terminated`],2,`Blocked on an event.`,'E'],
    [`A process preempted by the timer goes to…`,[`Waiting`,`Ready`,`Terminated`,`New`],1,`It can still run.`,'E'],
    [`How many processes can be running at once on a 4-core CPU?`,[`1`,`Up to 4`,`Unlimited`,`2`],1,`One per core.`,'E'],
    [`When an awaited I/O completes, the process moves to…`,[`Running`,`Ready`,`Terminated`,`New`],1,`Must be dispatched first.`,'M'],
    [`Which transition is impossible?`,[`Running → waiting`,`Waiting → ready`,`Ready → waiting`,`Running → ready`],2,`Only a running process can block.`,'M'],
    [`In Linux ps, state D means…`,[`Dead`,`Uninterruptible sleep (usually I/O)`,`Daemon`,`Debugging`],1,`Can't be killed until the I/O ends.`,'M'],
  ],
  quizAdv: [
    [`Linux load average includes processes in states…`,[`R only`,`R and D`,`S only`,`Z`],1,`That's why I/O stalls raise load.`,'H'],
    [`In the 7-state model, "suspended" means…`,[`Stopped by SIGSTOP`,`Swapped out to secondary storage`,`Zombie`,`Running in kernel mode`],1,`Memory pressure.`,'H'],
    [`perf sched's "sch delay" measures time a task was…`,[`Blocked on I/O`,`Ready but waiting for a CPU`,`Running`,`Zombie`],1,`Scheduling latency.`,'H'],
  ],
});
