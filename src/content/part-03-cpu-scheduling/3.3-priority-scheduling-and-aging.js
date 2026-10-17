/* 3.3 Priority scheduling, starvation and aging */
topic('3', { no:'3.3', title:'Priority scheduling, starvation and aging',
idea:`Give each process a priority and always run the most important one. Step through non-preemptive and preemptive priority scheduling, watch a low-priority job starve behind a stream of important ones, and fix it with aging.`,
actors:'Processes', tbTitle:'Processes', stateTitle:'Rules',
codes:{a:`// convention here: a LOWER number = HIGHER priority (as in Linux nice / Galvin)
p = argmin(ready, priority);       // non-preemptive: when the CPU is free
run(p);

// preemptive: on every arrival
if (new.priority < running.priority) preempt(running);

// aging: every tick, waiting processes become more important
for (q in ready) if (++q.waited % 10 == 0) q.priority--;`},
steps:[
{hl:{sched:[2,3]}, th:[['P1','READY:info','burst 10, prio 3'],['P2','RUN:ok','burst 1, prio 1'],['P3','READY:info','burst 2, prio 4'],['P4','READY:info','burst 1, prio 5'],['P5','READY:info','burst 5, prio 2']], gt:GT(1,['P2',0,1]), g:[G('Rules',['priority','lower number = more important (here)'],['all arrive','t = 0'])],
 say:`Five processes all arrive at 0. Each has a <b>priority</b>; here a lower number means more important (Unix convention; some books use the opposite, so always state it). The scheduler runs the highest-priority ready process: P2 (priority 1).`},
{th:[['P1','TERM:dim',''],['P2','TERM:dim',''],['P3','TERM:dim',''],['P4','TERM:dim',''],['P5','TERM:dim','']], gt:GT(19,['P2',0,1],['P5',1,6],['P1',6,16],['P3',16,18],['P4',18,19]), tb:[TB('non-preemptive priority',['proc','prio','burst','finish','waiting'],[['P2','1','1','1','0'],['P5','2','5','6','1'],['P1','3','10','16','6'],['P3','4','2','18','16'],['P4','5','1','19','18'],['average','','','','8.2']],{4:'hot'})],
 say:`Then P5 (2), P1 (3), P3 (4), P4 (5). Average waiting time <b>8.2</b>. Priority scheduling is general: SJF is just priority = burst length, FCFS is priority = arrival time.`},
{hl:{sched:[6]}, th:[['P1','READY:warn','preempted at 1'],['P2','RUN:ok','prio 1 arrives'],['P3','NEW:dim','']], gt:GT(1,['P1',0,1]), tb:[TB('preemptive example',['proc','arrival','burst','prio'],[['P1','0','4','3'],['P2','1','3','1'],['P3','2','2','2']])], log:['t=1 P2 (prio 1) preempts P1 (prio 3)'],
 say:`With <b>preemptive</b> priority, a newly arrived process that's more important than the running one takes the CPU at once. P1 (priority 3) starts at 0; P2 (priority 1) arrives at 1 and preempts it.`},
{th:[['P1','TERM:dim','finishes last'],['P2','TERM:dim',''],['P3','TERM:dim','']], gt:GT(9,['P1',0,1],['P2',1,4],['P3',4,6],['P1',6,9]), tb:[TB('preemptive priority result',['proc','finish','waiting','response'],[['P1','9','5','0'],['P2','4','0','0'],['P3','6','2','2']])],
 say:`P3 (priority 2) arrives at 2 but P2 is more important, so it waits; it runs 4–6, and P1 finally resumes at 6 and finishes at 9. Important work gets excellent response time, which is why OSes boost interactive and real-time tasks.`},
{th:[['low','READY:bad','prio 9: never chosen'],['hi-1','RUN:ok','prio 1'],['hi-2','READY:info','prio 1, arriving'],['hi-3','READY:info','prio 1, arriving']], gt:GT(12,['hi-1',0,3],['hi-2',3,6],['hi-3',6,9],['hi-4',9,12]), g:[G('Starvation',['low','ready since t = 0, never runs','bad'],['cause','a steady stream of higher-priority work','bad'],['legend','MIT\'s IBM 7094 (1973) had a job waiting since 1967'])],
 say:`The danger is <b>starvation</b> (indefinite blocking): if high-priority processes keep arriving, a low-priority one may <i>never</i> run. Legend has it that when MIT shut down its IBM 7094 in 1973 they found a low-priority job submitted in 1967 that had never run.`},
{hl:{sched:[8,9]}, th:[['low','RUN:ok','aged to prio 1: runs'],['hi-5','READY:info','prio 1']], gt:GT(15,['hi-1',0,3],['hi-2',3,6],['hi-3',6,9],['hi-4',9,12],['low',12,15]), tb:[TB('aging (−1 every 10 ms waited… sped up here)',['time','low\'s priority'],[['0','9'],['3','7'],['6','5'],['9','3'],['12','1  → ties win by waiting longest']],{4:'ok'})], log:['t=12 low has aged to priority 1 and runs'],
 say:`<b>Aging</b> fixes it: the longer a process waits, the more its priority improves. Eventually even the lowest-priority job becomes the most important and runs. Once it runs, its priority resets. Linux's scheduler and Windows' priority boosts implement variants of this idea.`},
{gt:null, tb:[], th:[], g:[G('Remember',['priority','static (set by user/nice) or dynamic (OS adjusts)'],['preemptive','new higher-priority arrival preempts'],['problem','starvation of low priority','bad'],['fix','aging','ok'],['also','priority inversion (Part 5)'])],
 say:`<b>Say it:</b> "Priority scheduling runs the highest-priority ready process, either non-preemptively or preempting when a higher-priority one arrives. SJF and FCFS are special cases. Its weakness is starvation: low-priority processes may never run if higher ones keep coming. Aging fixes that by gradually raising the priority of processes that have waited a long time."`}
],
keep:[`Run the highest-priority ready process (state the convention!).`,`Preemptive: higher-priority arrival preempts immediately.`,`SJF = priority by burst; FCFS = priority by arrival.`,`Starvation: low priority may never run.`,`Aging: raise priority with waiting time.`]}, {
  imp: 'must',
  theory: TH(`Priority scheduling always runs the most important ready process; it can starve low-priority work, which aging prevents by raising priority over time.`,
`<p>A hospital emergency room triages: heart attacks before sprained ankles. That's priority scheduling. If ambulances keep arriving, the sprained ankle could wait all day: starvation. A good ER bumps patients up the list the longer they've waited: aging.</p>
<p>Priorities can be <b>static</b> (set by the user, like Unix <code>nice</code>) or <b>dynamic</b> (the OS raises the priority of interactive processes that block a lot and lowers CPU hogs). Most real schedulers are dynamic-priority schedulers underneath.</p>`,
[[`Priority`,`Number expressing importance; convention varies (low = high in Unix).`],[`Static priority`,`Fixed by the user/admin.`],[`Dynamic priority`,`Adjusted by the OS based on behaviour.`],[`nice value`,`Unix priority hint, −20 (most favoured) to +19 (least).`],[`Starvation`,`A process never gets the CPU.`],[`Aging`,`Increasing priority with waiting time.`],[`Priority inversion`,`A high-priority task waits for a low-priority one holding a lock.`]],
[`Each process has a priority.`,`The scheduler always picks the best-priority ready process; ties are broken FCFS (or RR).`,`Preemptive version: re-check on every arrival/wakeup.`,`Aging periodically improves the priority of waiting processes.`],
[`nice / renice to deprioritise batch jobs: nice -n 19 ./backup.sh.`,`Real-time priorities (SCHED_FIFO) for audio and control loops; beware of starving the system.`,`Kubernetes PriorityClass decides which pods get evicted first: priority scheduling at cluster level.`],
[`Not stating whether low numbers mean high priority.`,`Giving a real-time priority to a CPU-bound loop (freezes the machine).`,`Forgetting ties.`])
  ,
  examples: [
    {lv:'basic', title:'Non-preemptive priority (Galvin\'s example)', sim:'sched', input:`algo: PRIO
# name arrival burst priority (lower = more important)
P1 0 10 3
P2 0 1 1
P3 0 2 4
P4 0 1 5
P5 0 5 2`, why:`Order P2, P5, P1, P3, P4; average waiting 8.2. Add <code>priority: high</code> to flip the convention and see the order reverse.`},
    {lv:'mid', title:'Preemptive priority', sim:'sched', input:`algo: PRIO-P
P1 0 4 3
P2 1 3 1
P3 2 2 2`, why:`P2 preempts P1 at t = 1. P1, the least important, finishes last at 9 even though it started first.`},
    {lv:'adv', title:'Being nice in Linux', code:`$ nice -n 19 ./encode-video &        # lowest priority: runs when nothing else wants the CPU
$ renice -n 10 -p 4242               # lower an existing process's priority
$ chrt -f 50 ./audio-mixer           # real-time FIFO priority 50 (root): preempts all normal tasks
$ ps -o pid,ni,pri,comm -p 4242
  PID  NI PRI COMMAND
 4242  10   9 encode-video`, why:`<code>nice</code> affects the weight in CFS (a share, not an absolute order). Real-time classes (SCHED_FIFO/RR) are true strict priorities and can starve everything else.`},
  ],
  tips: {
    say:`"Priority scheduling picks the highest-priority ready process, preemptively or not. It generalises SJF and FCFS. The risk is starvation of low-priority processes, which aging solves by raising priority as a process waits. In Linux, nice values adjust weights for normal tasks and real-time policies give strict priorities."`,
    points:[`State the priority convention.`,`Preemptive vs non-preemptive.`,`Starvation and aging.`],
    traps:[`Saying aging lowers the priority of waiting tasks.`,`Ignoring ties.`],
    qa:[[`How is SJF a priority scheduler?`,`Priority = predicted next burst; smaller burst = higher priority.`],
        [`What's priority inversion?`,`A high-priority task blocks on a lock held by a low-priority task, which is preempted by medium-priority tasks, so the high one waits indefinitely. Fix: priority inheritance.`],
        [`What does nice actually do in Linux CFS?`,`Changes the task's weight; each nice step is ~10% CPU share relative to neighbours. It isn't a strict ordering.`]]
  },
  exercises: [
    {lv:'E', q:`Non-preemptive priority (lower = higher). What is the average waiting time?`, sim:'sched', key:'avgWT', input:`algo: PRIO
A 0 4 2
B 0 3 1
C 0 5 3`, hint:`Order B, A, C.`, answer:`<p>B waits 0, A waits 3, C waits 7 → 10/3 ≈ 3.33.</p>`},
    {lv:'M', q:`Preemptive priority: at what time does P1 finish?`, sim:'sched', key:'ct.P1', input:`algo: PRIO-P
P1 0 6 4
P2 2 2 1
P3 3 3 2
P4 5 1 3`, hint:`Every arrival here is more important than P1.`, answer:`<p>P1 0–2, P2 2–4, P3 4–7, P4 7–8, P1 8–12. P1 finishes at 12.</p>`},
    {lv:'H', q:`A low-priority job starts at priority 20. Aging improves priority by 1 every 5 seconds of waiting, and priority 0 jobs keep arriving forever. After how many seconds of waiting does it reach priority 0 (and can then compete)?`, ans:'100', hint:`20 steps × 5 s.`, answer:`<p>20 × 5 = 100 seconds. Without aging, it would wait forever.</p>`},
  ],
  quiz: [
    [`Priority scheduling picks…`,[`Shortest job`,`The highest-priority ready process`,`The oldest process`,`Randomly`],1,`By definition.`,'E'],
    [`The main problem with priority scheduling is…`,[`Convoy effect`,`Starvation of low-priority processes`,`Too many switches`,`Thrashing`],1,`Indefinite blocking.`,'E'],
    [`Aging…`,[`Lowers priority over time`,`Raises the priority of processes that have waited long`,`Kills old processes`,`Is a memory technique`],1,`Prevents starvation.`,'E'],
    [`SJF is priority scheduling with priority =…`,[`Arrival time`,`Predicted next burst`,`Process size`,`PID`],1,`Shorter = higher.`,'M'],
    [`In Unix, nice 19 means…`,[`Highest priority`,`Lowest priority (most "nice" to others)`,`Real-time`,`Root only`],1,`−20 is most favoured.`,'M'],
    [`In preemptive priority, a higher-priority arrival…`,[`Waits for the running one`,`Preempts the running process`,`Is rejected`,`Runs on another machine`],1,`Immediately.`,'M'],
  ],
  quizAdv: [
    [`SCHED_FIFO tasks in Linux…`,[`Share CPU fairly`,`Run until they block or yield, preempting all normal tasks`,`Are time-sliced at 1 ms`,`Can be starved by nice -20 tasks`],1,`Strict real-time priority.`,'H'],
    [`Priority inversion is fixed by…`,[`Aging`,`Priority inheritance`,`Round robin`,`Larger quantum`],1,`Lock holder inherits the waiter's priority.`,'H'],
    [`FCFS is priority scheduling where priority is…`,[`Burst`,`Arrival time (earlier = higher)`,`Random`,`Memory`],1,`Oldest first.`,'H'],
  ],
});
