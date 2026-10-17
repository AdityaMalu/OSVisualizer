/* 3.2 SJF and SRTF */
topic('3', { no:'3.2', title:'Shortest job first (SJF) and shortest remaining time (SRTF)',
idea:`Running the shortest job next provably minimises average waiting time. Step through non-preemptive SJF and its preemptive version SRTF on the same four processes, watch a newly arrived short job kick out a longer one, and see why real systems can only <i>estimate</i> burst lengths.`,
actors:'Processes', tbTitle:'Ready queue / metrics', stateTitle:'Decision',
codes:{a:`// SJF (non-preemptive): when the CPU is free, pick the shortest burst
p = argmin(ready, burst);  run(p) to completion;

// SRTF (preemptive SJF): re-decide whenever a process arrives
on arrival(q):
    if (q.remaining < running.remaining)
        preempt(running);  run(q);

// bursts aren't known in advance: predict with an exponential average
tau_next = alpha * last_burst + (1 - alpha) * tau_prev    // alpha ≈ 0.5`},
steps:[
{hl:{sched:[2]}, th:[['P1','RUN:ok','arrives 0, burst 8'],['P2','NEW:dim','arrives 1, burst 4'],['P3','NEW:dim','arrives 2, burst 9'],['P4','NEW:dim','arrives 3, burst 5']], gt:GT(0), g:[G('Decision',['t = 0','only P1 is ready → run P1'])],
 say:`Four processes: P1 (arrives 0, burst 8), P2 (1, 4), P3 (2, 9), P4 (3, 5). First, <b>non-preemptive SJF</b>. At time 0 only P1 has arrived, so it starts and, being non-preemptive, keeps the CPU until it finishes at 8, even though shorter jobs arrive meanwhile.`},
{hl:{sched:[2]}, th:[['P1','TERM:dim','done at 8'],['P2','RUN:ok','shortest: 4'],['P3','READY:info','9'],['P4','READY:info','5']], gt:GT(8,['P1',0,8]), tb:[TB('ready at t = 8',['proc','burst'],[['P2','4'],['P4','5'],['P3','9']],{0:'hot'})],
 say:`At 8 the ready queue holds P2 (4), P3 (9) and P4 (5). SJF picks the <b>shortest burst</b>: P2. Then P4, then P3.`},
{th:[['P1','TERM:dim',''],['P2','TERM:dim',''],['P3','TERM:dim',''],['P4','TERM:dim','']], gt:GT(26,['P1',0,8],['P2',8,12],['P4',12,17],['P3',17,26]), tb:[TB('SJF result',['proc','arrival','burst','finish','waiting'],[['P1','0','8','8','0'],['P2','1','4','12','7'],['P4','3','5','17','9'],['P3','2','9','26','15'],['average','','','','7.75']],{4:'hot'})],
 say:`SJF order P1, P2, P4, P3. Waiting times 0, 7, 9, 15: average <b>7.75</b>. (FCFS on the same input gives 8.75.) Still, P2 waited 7 units behind P1 although it was much shorter: non-preemption hurts.`},
{hl:{sched:[5,6,7,8]}, th:[['P1','READY:warn','preempted, 7 left'],['P2','RUN:ok','4 < 7: takes the CPU'],['P3','NEW:dim',''],['P4','NEW:dim','']], gt:GT(1,['P1',0,1]), g:[G('Decision',['t = 1','P2 arrives: remaining 4 < P1\'s 7','hot'],['action','preempt P1, run P2'])], log:['t=1 P2 preempts P1'],
 say:`Now <b>SRTF</b> (shortest remaining time first), the preemptive version. P1 starts at 0. At t = 1 P2 arrives with burst 4, while P1 still needs 7. 4 &lt; 7, so the scheduler <b>preempts</b> P1 and runs P2.`},
{th:[['P1','READY:info','7 left'],['P2','TERM:dim','done at 5'],['P3','READY:info','9 left'],['P4','RUN:ok','5 left: shortest']], gt:GT(5,['P1',0,1],['P2',1,5]), tb:[TB('ready at t = 5',['proc','remaining'],[['P4','5'],['P1','7'],['P3','9']],{0:'hot'})], log:['t=2 P3 (9) arrives: no preemption','t=3 P4 (5) arrives: P2 has 2 left, no preemption'],
 say:`P3 (9) arrives at 2 and P4 (5) at 3; neither is shorter than P2's remaining time, so P2 continues and finishes at 5. Now remaining times are P4 = 5, P1 = 7, P3 = 9: P4 runs, then P1, then P3.`},
{th:[['P1','TERM:dim',''],['P2','TERM:dim',''],['P3','TERM:dim',''],['P4','TERM:dim','']], gt:GT(26,['P1',0,1],['P2',1,5],['P4',5,10],['P1',10,17],['P3',17,26]), tb:[TB('SRTF result',['proc','arrival','burst','finish','waiting'],[['P1','0','8','17','9'],['P2','1','4','5','0'],['P3','2','9','26','15'],['P4','3','5','10','2'],['average','','','','6.5']],{4:'ok'})],
 say:`SRTF: P1 0–1, P2 1–5, P4 5–10, P1 10–17, P3 17–26. Waiting times 9, 0, 15, 2: average <b>6.5</b>, better than SJF's 7.75. SRTF is optimal for average waiting time among all policies, if you know the bursts.`},
{hl:{sched:[9,10]}, gt:null, tb:[], g:[G('The catch',['burst lengths','unknown in advance','bad'],['estimate','exponential average of past bursts','ok'],['starvation','a long job may wait forever if short ones keep coming','bad']),G('Prediction example (α = 0.5)',['τ₀ = 10, burst 6','τ₁ = 0.5·6 + 0.5·10 = 8'],['burst 4','τ₂ = 0.5·4 + 0.5·8 = 6'])],
 say:`<b>Say it:</b> "SJF runs the job with the shortest next CPU burst; SRTF is its preemptive form, switching whenever a new arrival has less remaining time. They minimise average waiting time, which makes them the benchmark. But the OS doesn't know burst lengths, so it predicts them with an exponential average of past bursts, and long jobs can starve if short ones keep arriving."`}
],
keep:[`SJF: shortest burst next, non-preemptive.`,`SRTF: preempt if a newcomer's burst < current remaining.`,`Optimal average waiting time (provably).`,`Needs burst prediction: τₙ₊₁ = α·tₙ + (1−α)·τₙ.`,`Risk: starvation of long jobs.`]}, {
  imp: 'must',
  theory: TH(`Shortest-job-first runs the process with the smallest next CPU burst; its preemptive version, SRTF, minimises average waiting time but needs burst estimates and can starve long jobs.`,
`<p>Back at the supermarket: letting the customer with the fewest items go first minimises the average wait. Someone with one item makes three people wait a few seconds; the full-trolley customer would make them wait minutes. SRTF goes further: if someone with one item walks up while a big order is being scanned, the cashier pauses the big order.</p>
<p>The OS can't see the "items" (future burst lengths), so it guesses from history. Processes that recently used short bursts (interactive ones) are predicted to keep doing so.</p>`,
[[`SJF`,`Non-preemptive: shortest next burst runs to completion.`],[`SRTF / SRTN`,`Preemptive SJF: shortest remaining time runs.`],[`Burst prediction`,`τₙ₊₁ = α·tₙ + (1−α)·τₙ, an exponential moving average.`],[`Starvation`,`A process waits indefinitely while others keep being preferred.`],[`Optimality`,`SJF/SRTF minimise average waiting time for a given set of jobs.`]],
[`When the CPU is free (SJF) or a process arrives (SRTF), look at all ready processes.`,`Pick the one with the smallest (remaining) burst; break ties by arrival.`,`In SRTF, preempt the running process if the new one is shorter.`,`After each burst, update the process's prediction.`],
[`Batch schedulers ask users for job length estimates (and kill jobs that exceed them).`,`Interactive-favouring schedulers effectively approximate SJF by boosting processes that block quickly.`,`Exam questions love SRTF Gantt charts: practise preemption points.`],
[`Preempting on equal remaining time (ties usually keep the current process).`,`Forgetting that SJF can't preempt even a long running job.`,`Ignoring starvation in the analysis.`])
  ,
  examples: [
    {lv:'basic', title:'SJF when everyone arrives together', sim:'sched', input:`algo: SJF
P1 0 6
P2 0 8
P3 0 7
P4 0 3`, why:`With equal arrivals SJF just sorts by burst: P4, P1, P3, P2. Average waiting 7 (FCFS would give 10.25).`},
    {lv:'mid', title:'SJF vs SRTF on the same input', sim:'sched', input:`algo: SRTF      # change to SJF and compare
P1 0 8
P2 1 4
P3 2 9
P4 3 5`, why:`SRTF averages 6.5, SJF 7.75. The difference is P2: SRTF lets it preempt P1 at t = 1.`},
    {lv:'adv', title:'Starvation of a long job', sim:'sched', input:`algo: SRTF
long  0 10
s1    1 2
s2    3 2
s3    5 2
s4    7 2
s5    9 2`, why:`Each short job arrives just as the previous finishes, so <code>long</code> barely runs until all short ones are done. Keep adding short jobs and it never finishes. Aging (next topic) fixes this.`},
  ],
  tips: {
    say:`"SJF schedules the process with the shortest next CPU burst; SRTF is the preemptive version that preempts when a new process has less remaining time than the current one. They give the minimum average waiting time, but burst lengths aren't known in advance, so they're estimated with an exponential average of past bursts, and long processes can starve."`,
    points:[`Distinguish preemptive and non-preemptive versions.`,`State optimality.`,`Name both problems: prediction and starvation.`],
    traps:[`Claiming the OS knows burst times.`,`Preempting in SJF.`],
    qa:[[`Why is SJF optimal for average waiting time?`,`Exchange argument: if a longer job runs before a shorter one, swapping them reduces the shorter job's wait by more than it increases the longer job's, so any order that isn't shortest-first can be improved.`],
        [`How does α affect prediction?`,`α near 1 trusts the most recent burst (reacts fast, noisy); α near 0 trusts history (smooth, slow to adapt). α = 0.5 is the textbook default.`],
        [`What's the difference between SRTF and preemptive priority?`,`SRTF is priority scheduling where the priority is the remaining burst time.`]]
  },
  exercises: [
    {lv:'E', q:`Non-preemptive SJF, all arriving at 0: what is the average waiting time?`, sim:'sched', key:'avgWT', input:`algo: SJF
A 0 7
B 0 2
C 0 4
D 0 1`, hint:`Order D, B, C, A.`, answer:`<p>Waits 0 (D), 1 (B), 3 (C), 7 (A) → 11/4 = 2.75.</p>`},
    {lv:'M', q:`SRTF: give the Gantt order as process names separated by spaces (e.g. <code>P1 P2 P1</code>).`, sim:'sched', key:'order', input:`algo: SRTF
P1 0 7
P2 2 4
P3 4 1
P4 5 4`, hint:`Check at every arrival whether the newcomer is shorter than what's left.`, answer:`<p>P1 0–2, P2 2–4, P3 4–5, P2 5–7, P4 7–11, P1 11–16.</p>`},
    {lv:'H', q:`For the same input, what is the average waiting time under SRTF?`, sim:'sched', key:'avgWT', input:`algo: SRTF
P1 0 7
P2 2 4
P3 4 1
P4 5 4`, hint:`Waiting = finish − arrival − burst.`, answer:`<p>P1 16−0−7 = 9, P2 7−2−4 = 1, P3 0, P4 11−5−4 = 2 → 12/4 = 3.</p>`},
    {lv:'M', q:`Predicted burst τ₀ = 10, α = 0.5, actual bursts 6 then 4. What is τ₂?`, ans:'6', hint:`Apply the formula twice.`, answer:`<p>τ₁ = 0.5·6 + 0.5·10 = 8; τ₂ = 0.5·4 + 0.5·8 = 6.</p>`},
  ],
  quiz: [
    [`SJF picks the process with…`,[`Earliest arrival`,`Shortest next CPU burst`,`Highest priority`,`Most memory`],1,`Shortest job.`,'E'],
    [`SRTF is…`,[`Non-preemptive SJF`,`Preemptive SJF`,`Round robin`,`FCFS`],1,`Shortest remaining time first.`,'E'],
    [`SJF/SRTF minimise…`,[`Response time for long jobs`,`Average waiting time`,`Context switches`,`Memory use`],1,`Provably optimal.`,'E'],
    [`The main practical problem with SJF is…`,[`Too slow`,`Burst lengths aren't known in advance`,`Needs more memory`,`Can't handle arrivals`],1,`Must be predicted.`,'M'],
    [`Which can starve?`,[`FCFS`,`SRTF`,`Round robin`,`All equally`],1,`Long jobs behind a stream of short ones.`,'M'],
    [`In SRTF, a new process with burst 3 arrives while the current one has 5 left. The scheduler…`,[`Ignores it`,`Preempts the current process`,`Kills the current process`,`Waits for a timer`],1,`3 < 5.`,'M'],
  ],
  quizAdv: [
    [`Exponential averaging with α = 1 means…`,[`Only history matters`,`Only the last burst matters`,`Prediction is constant`,`Random`],1,`τ = last burst.`,'H'],
    [`SRTF with all processes arriving at time 0 behaves like…`,[`RR`,`Non-preemptive SJF`,`FCFS`,`Priority`],1,`No arrivals → no preemption points.`,'H'],
    [`SRTF can be seen as priority scheduling where priority =…`,[`Arrival time`,`Remaining burst time`,`Process ID`,`Memory size`],1,`Smaller = higher.`,'H'],
  ],
});
