/* 3.5 Multilevel queues and MLFQ */
topic('3', { no:'3.5', title:'Multilevel queues and the multilevel feedback queue (MLFQ)',
idea:`How can a scheduler favour short interactive jobs without knowing burst lengths? MLFQ learns from behaviour: every job starts at the top priority, and jobs that use their whole slice sink. Watch a CPU hog sink while short jobs zip through, then see why a periodic priority boost is needed.`,
actors:'Processes', tbTitle:'Queues', stateTitle:'MLFQ rules',
codes:{a:`// MLFQ with 3 levels: Q0 (q=4), Q1 (q=8), Q2 (FCFS)
rule 1: if prio(A) > prio(B), run A
rule 2: equal priority → round robin within the level
rule 3: a new job enters the top queue (Q0)
rule 4: used its whole quantum at a level → move down one level
        gave up the CPU before the quantum ended → stay
rule 5: every S ms, move ALL jobs back to Q0 (priority boost)`},
steps:[
{hl:{rules:[4]}, th:[['A','RUN:ok','CPU hog, burst 20, Q0']], gt:GT(2,['A',0,2]), tb:[TB('queues',['level','quantum','jobs'],[['Q0','4','A (running)'],['Q1','8','—'],['Q2','FCFS','—']],{0:'hot'})], g:[G('MLFQ rules',['new job','starts in Q0 (highest)','hot'])],
 say:`A plain <b>multilevel queue</b> puts each process permanently in a class (system, interactive, batch) with its own queue and policy. <b>MLFQ</b> adds <b>feedback</b>: processes move between levels based on how they behave. Every new job starts in the top queue Q0. Job A (a long CPU hog) arrives at 0.`},
{hl:{rules:[5,6]}, th:[['A','READY:warn','used full quantum → Q1'],['B','RUN:ok','arrived 2, Q0']], gt:GT(4,['A',0,4]), tb:[TB('queues',['level','quantum','jobs'],[['Q0','4','B'],['Q1','8','A'],['Q2','FCFS','—']],{1:'hot'})], log:['t=2 B arrives in Q0','t=4 A used its full 4 → demoted to Q1'],
 say:`B arrives at 2 into Q0 (A and B are both in Q0, so B waits for A's slice). At 4, A has used its <b>entire quantum</b>: that looks like CPU-bound behaviour, so A is <b>demoted</b> to Q1. B now runs: Q0 beats Q1.`},
{th:[['A','READY:info','Q1'],['B','TERM:dim','done at 7'],['C','RUN:ok','arrived 6, Q0']], gt:GT(9,['A',0,4],['B',4,7],['C',7,9]), tb:[TB('queues',['level','quantum','jobs'],[['Q0','4','C → done at 9'],['Q1','8','A'],['Q2','FCFS','—']],{0:'ok'})], log:['t=6 C arrives in Q0','t=7 B done (3 < 4: never demoted)','t=9 C done'],
 say:`B needed only 3 units, less than its quantum, so it finished in Q0. C (2 units) arrives at 6 and also finishes in Q0. Short jobs get <b>SJF-like</b> treatment without the scheduler ever knowing burst lengths: they finish before they'd sink.`},
{th:[['A','RUN:ok','Q1, then Q2']], gt:GT(25,['A',0,4],['B',4,7],['C',7,9],['A',9,17],['A',17,25]), tb:[TB('queues',['level','quantum','jobs'],[['Q0','4','—'],['Q1','8','—'],['Q2','FCFS','A (bottom)']],{2:'hot'})], log:['t=17 A used its full 8 → demoted to Q2','t=25 A done'],
 say:`With Q0 empty, A runs in Q1 for 8 units (9–17), uses it all, and sinks to Q2 (FCFS), where it finishes at 25. Long CPU-bound jobs drift to the bottom and run whenever nobody more interactive needs the CPU. B and C had response times of 2 and 1.`},
{hl:{rules:[7]}, th:[['A','READY:bad','starving in Q2'],['I1','RUN:ok','interactive, Q0'],['I2','READY:info','Q0']], gt:{title:'without a boost, a stream of short jobs starves A', segs:[['I1',30,32],['I2',32,34],['I3',34,36],['I4',36,38],['I5',38,40]]}, g:[G('Problems',['starvation','A in Q2 never runs while Q0 is busy','bad'],['gaming','a job that yields just before its quantum ends stays in Q0 forever','bad'],['phase change','a hog that turns interactive is stuck at the bottom','bad'])],
 say:`Two problems. <b>Starvation</b>: if interactive jobs keep arriving, A in Q2 never runs. <b>Gaming</b>: a clever process can do an I/O just before its slice ends and stay at the top forever. Also, a process that changes behaviour (CPU phase → interactive phase) stays stuck low.`},
{hl:{rules:[7]}, th:[['A','RUN:ok','boosted to Q0'],['I1','READY:info','Q0']], gt:{title:'priority boost every S: A gets a turn', segs:[['I1',30,32],['I2',32,34],['A',34,38],['I3',38,40]]}, g:[G('Fixes',['priority boost','every S ms move everyone to Q0','ok'],['accounting','count total CPU used at a level, not per slice (anti-gaming)','ok'],['choosing S','too large: starvation; too small: hogs crowd Q0'])],
 say:`<b>Rule 5</b>: every S milliseconds, <b>boost</b> every job to Q0. A gets a turn, and a job whose behaviour changed is re-evaluated. Anti-gaming: charge a job for the total CPU used at its level, regardless of how many times it yielded, and demote it once the allotment is spent.`},
{gt:null, th:[], tb:[], g:[G('Summary',['learns','burst behaviour from history'],['short / interactive','stay high, fast response','ok'],['CPU-bound','sink, get long slices at low priority'],['used in','Windows, Solaris, macOS, BSD; Linux O(1) was similar'])],
 say:`<b>Say it:</b> "A multilevel feedback queue has several ready queues of decreasing priority, often with larger quanta lower down. New jobs start at the top. A job that uses its whole quantum is demoted; one that blocks early stays. So short and interactive jobs get quick response like SJF without knowing burst lengths, while CPU-bound jobs sink. A periodic priority boost prevents starvation and lets jobs that change behaviour move back up."`}
],
keep:[`Multilevel queue: fixed class per process. MLFQ: processes move between levels.`,`New job → top. Used full quantum → down. Yielded early → stay.`,`Short jobs finish high up: SJF-like without knowing bursts.`,`Priority boost every S prevents starvation.`,`Account total CPU per level to stop gaming.`]}, {
  imp: 'good',
  theory: TH(`MLFQ approximates shortest-job-first without knowing job lengths by observing behaviour: jobs start at high priority and are demoted when they use full time slices.`,
`<p>A new employee gets quick answers from their manager. If they turn out to need hours of help per question, they get scheduled into longer, less frequent sessions. Someone who needs a quick word stays on the fast track. Every so often everyone's priority is reset so nobody is ignored forever.</p>
<p>MLFQ is the classic answer to "how do you get good response time for interactive work and good throughput for batch work at the same time, without knowing which is which in advance?"</p>`,
[[`Multilevel queue`,`Separate queues per process class, with fixed assignment.`],[`MLFQ`,`Multilevel queue where processes move between levels based on behaviour.`],[`Demotion`,`Moving a job to a lower-priority queue after it uses its full quantum.`],[`Priority boost`,`Periodically moving all jobs to the top queue.`],[`Allotment`,`Total CPU a job may use at a level before demotion (anti-gaming).`]],
[`All new jobs enter the top queue.`,`Always run a job from the highest non-empty queue; RR within a queue.`,`If a job uses up its quantum (allotment), demote it one level.`,`If it blocks before that, it keeps its level.`,`Every S ms, move all jobs to the top.`],
[`Windows and macOS dynamic priority boosts for foreground and I/O-completing threads follow this idea.`,`Linux's old O(1) scheduler used interactivity heuristics like MLFQ; CFS replaced them with fair shares.`,`Tuning parameters (levels, quanta, S) is notoriously workload-dependent.`],
[`Forgetting the boost and claiming MLFQ can't starve.`,`Thinking lower queues have smaller quanta (usually larger).`,`Confusing MLQ (fixed classes) with MLFQ (feedback).`])
  ,
  examples: [
    {lv:'basic', title:'The walkthrough\'s run', sim:'sched', input:`algo: MLFQ
levels: 4 8 FCFS
A 0 20     # CPU hog
B 2 3      # short
C 6 2      # short`, why:`B and C finish in Q0 with response times 2 and 1; A sinks to Q2. Change <code>levels</code> to <code>2 4 FCFS</code> and watch B get demoted too.`},
    {lv:'mid', title:'MLFQ vs RR for a mixed workload', sim:'sched', input:`algo: MLFQ     # compare with algo: RR and quantum: 4
levels: 4 8 FCFS
batch1 0 30
batch2 0 30
quick1 5 2
quick2 9 3
quick3 14 1`, why:`MLFQ keeps the quick jobs' response and turnaround low because the batch jobs have already sunk; under RR the quick jobs wait behind both batch jobs' slices.`},
    {lv:'adv', title:'Priority boost', sim:'sched', input:`algo: MLFQ
levels: 2 4 FCFS
boost: 10      # every 10 units, everyone back to the top
hog 0 30
i1 1 2
i2 4 2
i3 8 2
i4 12 2
i5 16 2`, why:`Remove the <code>boost</code> line and compare <code>hog</code>'s timeline: without boosts it sits in the bottom queue while interactive jobs keep arriving.`},
  ],
  tips: {
    say:`"MLFQ has multiple ready queues with decreasing priority and usually increasing quantum. New jobs start at the top; using a full quantum demotes a job, blocking early keeps its level. That gives interactive and short jobs SJF-like treatment without knowing burst times, while CPU-bound jobs sink. A periodic boost to the top prevents starvation and adapts to behaviour changes, and charging total CPU per level stops processes gaming the rules."`,
    points:[`Explain the feedback rules.`,`Why it approximates SJF.`,`Starvation and gaming fixes.`],
    traps:[`Forgetting the boost.`,`Mixing up MLQ and MLFQ.`],
    qa:[[`Why do lower levels get larger quanta?`,`Jobs there are CPU-bound; longer slices reduce switching overhead and they don't need responsiveness.`],
        [`How could a process game MLFQ and how do you prevent it?`,`By issuing a trivial I/O just before its quantum expires, staying at the top. Prevent it by charging the total CPU used at a level (allotment) regardless of yields.`],
        [`How do you pick the boost period S?`,`Large enough that hogs don't crowd interactive jobs constantly, small enough that starvation is bounded. Usually tuned empirically ("voodoo constants" in OSTEP).`]]
  },
  exercises: [
    {lv:'E', q:`In MLFQ, a job uses its entire quantum in Q0. Where does it go? (answer with the queue name)`, ans:'Q1', hint:`Demotion.`, answer:`<p>Down one level, to Q1.</p>`},
    {lv:'M', q:`MLFQ with levels 2, 4, FCFS: at what time does job A finish?`, sim:'sched', key:'ct.A', input:`algo: MLFQ
levels: 2 4 FCFS
A 0 8
B 1 3`, hint:`A 0–2 (demoted), B 2–4 (demoted), A 4–8 in Q1 uses all 4 → Q2 with 2 left… check who runs next.`, answer:`<p>A 0–2, B 2–4, A 4–8 (Q1, demoted with 2 left), B 8–9 (Q1, done), A 9–11. A finishes at 11.</p>`},
    {lv:'H', q:`What is the average response time for this MLFQ run?`, sim:'sched', key:'avgRT', input:`algo: MLFQ
levels: 4 8 FCFS
batch1 0 30
batch2 0 30
quick1 5 2
quick2 9 3
quick3 14 1`, hint:`Response = first run − arrival.`, answer:`<p>Run it and read the response column: the quick jobs start soon after arriving because the batch jobs are already in lower queues.</p>`},
  ],
  quiz: [
    [`In MLFQ, new jobs start…`,[`At the bottom`,`At the top (highest priority)`,`Randomly`,`In the middle`],1,`Assume short until proven otherwise.`,'E'],
    [`A job that uses its whole quantum is…`,[`Promoted`,`Demoted`,`Killed`,`Kept`],1,`Looks CPU-bound.`,'E'],
    [`MLFQ approximates…`,[`FCFS`,`SJF without knowing burst times`,`Random scheduling`,`EDF`],1,`Short jobs finish high up.`,'E'],
    [`The priority boost prevents…`,[`Deadlock`,`Starvation`,`Page faults`,`Convoy effect`],1,`Everyone returns to the top.`,'M'],
    [`A multilevel queue (without feedback) differs from MLFQ because…`,[`It has one queue`,`Processes stay in a fixed queue`,`It's non-preemptive`,`It has no priorities`],1,`No movement.`,'M'],
    [`Lower MLFQ levels usually have…`,[`Smaller quanta`,`Larger quanta`,`No quanta`,`Higher priority`],1,`CPU-bound jobs, fewer switches.`,'M'],
  ],
  quizAdv: [
    [`Gaming MLFQ by yielding just before the quantum ends is stopped by…`,[`Smaller quanta`,`Charging total CPU used at a level (allotment)`,`Removing the boost`,`FCFS`],1,`Better accounting.`,'H'],
    [`Without a boost, a CPU-bound job that becomes interactive…`,[`Moves up immediately`,`Stays at low priority`,`Is killed`,`Moves to Q0 on next arrival`],1,`Can't climb back.`,'H'],
    [`Which OS family historically uses MLFQ-style dynamic priorities?`,[`Only Linux CFS`,`Windows NT, Solaris, BSD`,`MS-DOS`,`None`],1,`Many classic schedulers.`,'H'],
  ],
});
