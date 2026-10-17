/* 3.7 Real-time scheduling: RM and EDF */
topic('3', { no:'3.7', title:'Real-time scheduling: rate-monotonic and EDF',
idea:`Real-time systems care about deadlines, not averages: an airbag that fires late is useless. Schedule two periodic tasks with rate-monotonic (fixed priorities) and earliest-deadline-first (dynamic), check utilisation bounds, and watch RM miss a deadline that EDF meets.`,
actors:'Tasks', tbTitle:'Task set', stateTitle:'Schedulability',
codes:{a:`// periodic task: (C = compute time, T = period = deadline)
T1: C = 25, T = 50      // utilisation 25/50 = 0.50
T2: C = 35, T = 80      // utilisation 35/80 = 0.4375   total U = 0.9375

// Rate-monotonic (RM): static priority, shorter period = higher priority
//   guaranteed if U ≤ n(2^(1/n) − 1)   (n=2: 0.828)
// Earliest deadline first (EDF): run the job whose deadline is soonest
//   guaranteed if U ≤ 1`},
steps:[
{hl:{rt:[2,3]}, th:[['T1','READY:info','C 25, period 50'],['T2','READY:info','C 35, period 80']], tb:[TB('task set',['task','C','T (= deadline)','U = C/T'],[['T1','25','50','0.50'],['T2','35','80','0.44'],['total','','','0.94']])], g:[G('Schedulability',['hard real-time','missing a deadline = failure','bad'],['periodic task','released every T, must finish C units before the next release'])],
 say:`Two periodic tasks. T1 needs 25 ms of CPU every 50 ms; T2 needs 35 ms every 80 ms. Each job's deadline is the start of its next period. Total CPU <b>utilisation</b> U = 25/50 + 35/80 = 0.94: under 100%, so there's enough CPU in principle.`},
{hl:{rt:[5,6]}, th:[['T1','RUN:ok','RM priority: high (period 50)'],['T2','READY:warn','priority low (period 80)']], gt:GT(50,['T1',0,25],['T2',25,50]), g:[G('RM',['priority','fixed: shorter period wins'],['t = 50','T1\'s second job arrives and preempts T2','hot'],['T2 progress','25 of 35'])],
 say:`<b>Rate-monotonic</b> gives fixed priorities by period: shorter period = higher priority, so T1 always beats T2. T1 runs 0–25, T2 runs 25–50. At 50 T1 releases its next job and <b>preempts</b> T2, which still needs 10 ms.`},
{th:[['T1','RUN:ok','done at 75'],['T2','TERM:bad','missed deadline 80']], gt:GT(80,['T1',0,25],['T2',25,50],['T1',50,75],['T2',75,80]), g:[G('RM',['T2 at t = 80','needs 35, got 30','bad'],['bound for n = 2','U ≤ 0.828 guaranteed'],['this set','U = 0.94 > 0.828: no guarantee, and it fails','bad'])], log:['t=80 T2 DEADLINE MISS (5 ms short)'],
 say:`T1 runs 50–75, T2 gets only 75–80: 30 of its 35 ms by its deadline at 80. <b>Deadline miss.</b> RM is guaranteed to succeed only if U ≤ n(2^(1/n) − 1), which is 0.828 for two tasks (and tends to ln 2 ≈ 0.69 for many). Our set is above the bound and indeed fails.`},
{hl:{rt:[7,8]}, th:[['T1','READY:info','deadline 100'],['T2','RUN:ok','deadline 80: earliest']], gt:GT(80,['T1',0,25],['T2',25,60],['T1',60,85]), g:[G('EDF',['t = 50','T1 job 2 deadline 100 vs T2 deadline 80 → keep T2','ok'],['t = 60','T2 done, meets 80','ok'],['T1 job 2','runs 60–85, meets 100','ok'])],
 say:`<b>Earliest deadline first</b> picks whichever job's deadline is soonest, re-deciding at each release. At 50, T1's new job has deadline 100 but T2's deadline is 80, so T2 <b>keeps</b> the CPU and finishes at 60. T1 runs 60–85, well before 100.`},
{gt:GT(150,['T1',0,25],['T2',25,60],['T1',60,85],['T2',85,100],['T1',100,125],['T2',125,145]), th:[['T1','RUN:ok','all deadlines met'],['T2','RUN:ok','all deadlines met']], g:[G('EDF',['bound','U ≤ 1 is enough (optimal on one CPU)','ok'],['cost','dynamic priorities; overload behaviour is chaotic','bad']),G('RM',['bound','≈ 0.69–0.83','bad'],['benefit','simple fixed priorities, predictable under overload','ok'])],
 say:`EDF keeps meeting deadlines (at 100, T1's third job, deadline 150, preempts T2's second job, deadline 160). It's <b>optimal</b> on a single CPU and succeeds whenever U ≤ 1. RM is still popular because fixed priorities are simple to implement and certify, and under overload RM drops the lowest-priority task predictably, whereas EDF can cascade misses across all tasks.`},
{gt:null, th:[], tb:[], g:[G('Real-time vocabulary',['hard','deadline miss = failure (airbag, ABS)'],['soft','misses degrade quality (video, audio)'],['latency matters','interrupt & dispatch latency, priority inversion'],['Linux','SCHED_FIFO/RR (fixed prio), SCHED_DEADLINE (EDF + CBS)'])],
 say:`<b>Say it:</b> "Real-time scheduling is about meeting deadlines. Rate-monotonic assigns fixed priorities by period, shorter period higher, and is guaranteed when utilisation is below about 69–83% depending on task count. Earliest deadline first runs the job with the nearest deadline and is optimal on one CPU, meeting all deadlines whenever utilisation is at most 100%. Hard real-time means a miss is a failure; soft means it degrades quality."`}
],
keep:[`Hard RT: miss = failure. Soft RT: miss = degraded.`,`U = Σ Cᵢ/Tᵢ.`,`RM: fixed priority by period; safe if U ≤ n(2^(1/n)−1) (0.828 for 2, → 0.69).`,`EDF: nearest deadline first; safe if U ≤ 1 (optimal on 1 CPU).`,`Linux: SCHED_FIFO/RR, SCHED_DEADLINE.`]}, {
  imp: 'extra',
  theory: TH(`Real-time schedulers guarantee deadlines for periodic tasks; rate-monotonic uses fixed priorities by period, while earliest-deadline-first uses dynamic priorities and can use the CPU fully.`,
`<p>An air-traffic controller doesn't care about average landing delay; every plane must land before it runs out of fuel. Real-time systems likewise care about the worst case: will every job finish before its deadline?</p>
<p>For periodic tasks we can answer that mathematically from utilisation (how much of the CPU each task needs), which is why these two algorithms show up in embedded and automotive work.</p>`,
[[`Hard real-time`,`Missing a deadline is a system failure.`],[`Soft real-time`,`Occasional misses are tolerable.`],[`Period (T)`,`Time between job releases; often also the deadline.`],[`Compute time (C)`,`Worst-case execution time per job.`],[`Utilisation (U)`,`Σ C/T.`],[`Rate-monotonic (RM)`,`Fixed priority by period.`],[`EDF`,`Dynamic priority by absolute deadline.`],[`Liu & Layland bound`,`U ≤ n(2^(1/n) − 1) for RM.`]],
[`Measure each task's worst-case execution time and period.`,`Compute utilisation; check the algorithm's bound.`,`RM: assign priorities once, by period; preempt on release of a higher-priority job.`,`EDF: at each release or completion, run the job with the earliest deadline.`,`If above the RM bound, run an exact response-time analysis or simulate.`],
[`Automotive ECUs and avionics (AUTOSAR, ARINC 653) use fixed-priority schedulers.`,`Audio pipelines on Linux use SCHED_FIFO threads.`,`SCHED_DEADLINE gives EDF with bandwidth reservation for robotics and media.`],
[`Using average execution time instead of worst case.`,`Ignoring blocking on shared resources (priority inversion).`,`Assuming U < 1 is enough for RM.`])
  ,
  examples: [
    {lv:'basic', title:'Is it schedulable? Utilisation', code:`tasks:  (C=1, T=4), (C=2, T=6), (C=1, T=8)
U = 1/4 + 2/6 + 1/8 = 0.25 + 0.333 + 0.125 = 0.708
RM bound for n=3: 3·(2^(1/3) − 1) = 0.780
0.708 ≤ 0.780 → RM guaranteed; EDF guaranteed too (≤ 1)`, why:`First check for any real-time interview question: compute U, compare with the bound.`},
    {lv:'mid', title:'Fixed-priority real-time in Linux', code:`struct sched_param sp = { .sched_priority = 80 };      // 1..99
sched_setscheduler(0, SCHED_FIFO, &sp);               // root or CAP_SYS_NICE
// this thread now preempts every normal (CFS) task and runs until it blocks.
// safety net: /proc/sys/kernel/sched_rt_runtime_us = 950000 (RT may use 95% of each second)`, why:`SCHED_FIFO is fixed priority with no time slice. A runaway RT thread would freeze the box without the RT throttling safety net.`},
    {lv:'adv', title:'EDF reservations with SCHED_DEADLINE', code:`$ chrt -d --sched-runtime 5000000 --sched-deadline 10000000 \\
        --sched-period 16666666 0 ./render-frame
# runtime 5 ms, deadline 10 ms, period 16.67 ms (60 fps)
# the kernel admits it only if total reserved bandwidth stays ≤ the RT limit`, why:`SCHED_DEADLINE does admission control (it refuses tasks that would make the system unschedulable) and isolates tasks with a constant-bandwidth server.`},
  ],
  tips: {
    say:`"Real-time scheduling guarantees deadlines rather than optimising averages. Rate-monotonic gives fixed priorities by period and is guaranteed if utilisation is below n(2^(1/n) − 1), around 69–83%. EDF picks the job with the nearest deadline and is optimal on a uniprocessor, guaranteed up to 100% utilisation. RM is simpler and degrades predictably under overload; EDF uses the CPU fully."`,
    points:[`Utilisation calculation.`,`Bounds for RM and EDF.`,`Hard vs soft real-time.`],
    traps:[`Saying real-time means "fast".`,`Ignoring worst-case execution time.`],
    qa:[[`Why does RM fail above its bound sometimes but not always?`,`The bound is sufficient, not necessary. Some task sets above it are schedulable (e.g. harmonic periods up to 100%); exact response-time analysis decides.`],
        [`What happens to EDF under overload?`,`Deadlines can be missed in a cascade, by tasks that would have been fine under fixed priorities. RM sheds the lowest-priority tasks first.`],
        [`How does priority inversion threaten real-time systems?`,`A high-priority task blocked by a low-priority lock holder, which is preempted by medium tasks, can miss its deadline (Mars Pathfinder, 1997). Priority inheritance fixes it.`]]
  },
  exercises: [
    {lv:'E', q:`Tasks (C=10, T=40) and (C=15, T=60). What is the total utilisation? (2 decimals)`, ans:'0.5', hint:`10/40 + 15/60.`, answer:`<p>0.25 + 0.25 = 0.50.</p>`},
    {lv:'M', q:`What is the RM utilisation bound for 3 tasks? (3 decimals)`, ans:'0.78', hint:`3·(2^(1/3) − 1).`, answer:`<p>2^(1/3) ≈ 1.2599 → 3 × 0.2599 ≈ 0.780.</p>`},
    {lv:'H', q:`Is the set (C=20, T=50), (C=30, T=75), (C=10, T=100) guaranteed schedulable by RM? By EDF? Answer like <code>RM no, EDF yes</code>.`, ans:'RM no EDF yes', hint:`U = 0.4 + 0.4 + 0.1.`, answer:`<p>U = 0.9. RM bound for 3 is 0.780, so RM is not guaranteed (it may or may not work; analyse exactly). EDF bound is 1.0, so EDF is guaranteed.</p>`},
  ],
  quiz: [
    [`Hard real-time means…`,[`Very fast`,`Missing a deadline is a failure`,`Uses hardware threads`,`High throughput`],1,`Correctness depends on timing.`,'E'],
    [`Rate-monotonic assigns higher priority to…`,[`Longer periods`,`Shorter periods`,`Larger C`,`Older tasks`],1,`Fixed by rate.`,'E'],
    [`EDF runs the job with…`,[`Shortest period`,`Earliest absolute deadline`,`Highest nice`,`Smallest PID`],1,`Dynamic priority.`,'E'],
    [`EDF on one CPU is guaranteed to meet all deadlines when U ≤…`,[`0.69`,`0.83`,`1.0`,`2.0`],2,`Optimal.`,'M'],
    [`The RM bound for two tasks is about…`,[`0.5`,`0.69`,`0.83`,`1.0`],2,`2(√2 − 1).`,'M'],
    [`Utilisation of a task with C=5, T=20 is…`,[`0.25`,`4`,`0.2`,`5`],0,`5/20.`,'E'],
  ],
  quizAdv: [
    [`As n → ∞, the RM bound tends to…`,[`0.5`,`ln 2 ≈ 0.693`,`1`,`0`],1,`Liu & Layland.`,'H'],
    [`Linux's EDF policy is…`,[`SCHED_FIFO`,`SCHED_RR`,`SCHED_DEADLINE`,`SCHED_IDLE`],2,`With CBS bandwidth reservation.`,'H'],
    [`The Mars Pathfinder resets were caused by…`,[`A cosmic ray`,`Priority inversion`,`Out of memory`,`Disk failure`],1,`Fixed by enabling priority inheritance.`,'H'],
  ],
});
