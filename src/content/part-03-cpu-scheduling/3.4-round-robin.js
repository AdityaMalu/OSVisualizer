/* 3.4 Round robin */
topic('3', { no:'3.4', title:'Round robin and choosing the time quantum',
idea:`Round robin gives each ready process a fixed slice of CPU time in turn. Trace the ready queue slice by slice (including the classic tie: a new arrival and a preempted process joining at the same moment), then see how the quantum size swings RR between FCFS and pure overhead.`,
actors:'Processes', tbTitle:'Ready queue', stateTitle:'Quantum',
codes:{a:`// Round robin with quantum q
while (true) {
    p = ready_queue.pop_front();
    run p for min(q, p.remaining);
    enqueue(newly arrived processes);      // arrivals first …
    if (p.remaining > 0)
        ready_queue.push_back(p);          // … then the preempted process
}`},
steps:[
{hl:{sched:[3,4]}, th:[['P1','RUN:ok','arr 0, burst 5'],['P2','NEW:dim','arr 1, burst 3'],['P3','NEW:dim','arr 2, burst 1'],['P4','NEW:dim','arr 3, burst 2']], gt:GT(2,['P1',0,2]), tb:[TB('ready queue at t = 2 (front → back)',['position','process','remaining'],[['1','P2','3'],['2','P3','1'],['3','P1','3']],{0:'hot'})], g:[G('Quantum',['q','2'])], log:['t=1 P2 arrives','t=2 P3 arrives, then P1 re-queued'],
 say:`Quantum q = 2. P1 runs 0–2. During its slice P2 (t = 1) and P3 (t = 2) arrive. At t = 2 the slice ends and P1 still needs 3. Convention: arrivals join the queue <b>before</b> the preempted process, so the queue is P2, P3, P1.`},
{hl:{sched:[3,4,5,6,7]}, th:[['P1','READY:info','3 left'],['P2','RUN:ok','2–4'],['P3','READY:info',''],['P4','NEW:dim','arrives 3']], gt:GT(4,['P1',0,2],['P2',2,4]), tb:[TB('ready queue at t = 4',['position','process','remaining'],[['1','P3','1'],['2','P1','3'],['3','P4','2'],['4','P2','1']],{0:'hot'})], log:['t=3 P4 arrives','t=4 P2 re-queued (1 left)'],
 say:`P2 runs 2–4. P4 arrives at 3 and joins behind P1. P2's slice ends with 1 unit left, so it goes to the back. Queue: P3, P1, P4, P2.`},
{th:[['P1','RUN:ok','5–7'],['P2','READY:info','1 left'],['P3','TERM:dim','done at 5'],['P4','READY:info','2 left']], gt:GT(7,['P1',0,2],['P2',2,4],['P3',4,5],['P1',5,7]), tb:[TB('ready queue at t = 7',['position','process','remaining'],[['1','P4','2'],['2','P2','1'],['3','P1','1']],{0:'hot'})],
 say:`P3 needs only 1 unit: it finishes at 5 without using its whole quantum, and the next process starts immediately (no idle time). P1 runs 5–7 and goes back with 1 left.`},
{th:[['P1','TERM:dim','done at 11'],['P2','TERM:dim','done at 10'],['P3','TERM:dim','done at 5'],['P4','TERM:dim','done at 9']], gt:GT(11,['P1',0,2],['P2',2,4],['P3',4,5],['P1',5,7],['P4',7,9],['P2',9,10],['P1',10,11]), tb:[TB('result',['proc','finish','turnaround','waiting','response'],[['P1','11','11','6','0'],['P2','10','9','6','1'],['P3','5','3','2','2'],['P4','9','6','4','4'],['average','','7.25','4.5','1.75']],{4:'ok'})],
 say:`P4 7–9, P2 9–10, P1 10–11. Average waiting 4.5, but look at <b>response time</b>: 1.75 on average, and nobody waited more than 4 units to start. RR trades a bit of turnaround for great responsiveness and fairness: every process gets 1/n of the CPU.`},
{gt:{title:'quantum 4 vs quantum 1 for P1 = 24, P2 = 3, P3 = 3', lanes:[{name:'q = 4', segs:[['P1',0,4],['P2',4,7],['P3',7,10],['P1',10,30]]},{name:'q = 1', segs:[['P1',0,1],['P2',1,2],['P3',2,3],['P1',3,4],['P2',4,5],['P3',5,6],['P1',6,7],['P2',7,8],['P3',8,9],['P1',9,30]]}]}, tb:[], th:[], g:[G('Quantum size',['very large q','becomes FCFS (convoy effect returns)','bad'],['very small q','great response, but switching overhead dominates','bad'],['rule of thumb','~80% of CPU bursts should finish within one quantum','ok'],['typical','10–100 ms; switch cost ~µs'])],
 say:`Choosing <b>q</b> is the key decision. If q is larger than every burst, RR degenerates into FCFS. If q is tiny, response is great but every switch costs time (a 1 µs switch per 10 µs slice wastes 10%). Rule of thumb: most CPU bursts (≈80%) should complete within one quantum; typical values are 10–100 ms.`},
{g:[G('RR properties',['preemptive','yes (timer)'],['starvation','none: everyone waits at most (n−1)·q','ok'],['average turnaround','often worse than SJF'],['response time','good and predictable','ok'])],
 say:`<b>Say it:</b> "Round robin is FCFS with preemption: each process runs for at most one time quantum, then goes to the back of the ready queue. With n processes, nobody waits more than (n−1)·q to run, so it's fair and responsive and can't starve anyone. Too large a quantum turns it into FCFS; too small and context-switch overhead dominates. A common rule is to make most CPU bursts fit in one quantum."`}
],
keep:[`Each process gets ≤ q, then back of the queue.`,`Tie rule: new arrivals enqueue before the preempted process (state it!).`,`Max wait to start: (n−1)·q. No starvation.`,`q → ∞ = FCFS; q → 0 = overhead dominates.`,`Choose q so ~80% of bursts finish in one slice.`]}, {
  imp: 'must',
  theory: TH(`Round robin cycles through ready processes giving each a fixed time quantum, which makes it fair and responsive; the quantum size controls the balance between responsiveness and overhead.`,
`<p>A teacher answering questions from a queue of students, but limiting each student to two minutes before moving to the next and letting them rejoin the back of the queue. Nobody monopolises the teacher, and everyone gets an answer started quickly.</p>
<p>RR is the backbone of time-sharing. Real schedulers combine it with priorities (round robin within each priority level) and adapt the slice length.</p>`,
[[`Time quantum / slice`,`Maximum CPU time per turn.`],[`Ready queue (FIFO)`,`Processes waiting for their turn.`],[`Preemption`,`The timer interrupt ends a slice.`],[`Context-switch overhead`,`Time lost per slice change.`],[`Fairness`,`Each of n processes gets ~1/n of the CPU.`]],
[`Take the process at the front of the ready queue.`,`Run it for one quantum or until it finishes/blocks.`,`Add any processes that arrived during the slice to the back.`,`If it still has work, put it at the back too.`,`Repeat.`],
[`Linux's SCHED_RR real-time policy is literally this.`,`Interactive systems choose slices of a few ms to stay responsive.`,`Load balancers (round-robin DNS, nginx upstreams) use the same idea for requests.`],
[`Getting the arrival vs re-queue order wrong in exam traces (state your assumption).`,`Counting the full quantum for a process that finishes early.`,`Thinking RR minimises average waiting time.`])
  ,
  examples: [
    {lv:'basic', title:'Galvin\'s classic: quantum 4', sim:'sched', input:`algo: RR
quantum: 4
P1 0 24
P2 0 3
P3 0 3`, why:`P1 0–4, P2 4–7, P3 7–10, then P1 alone. Average waiting 5.67 vs 17 for FCFS.`},
    {lv:'mid', title:'Arrivals during a slice', sim:'sched', input:`algo: RR
quantum: 2
P1 0 5
P2 1 3
P3 2 1
P4 3 2`, why:`The walkthrough's example. Change the quantum to 1 and 5 and watch the order and averages change.`},
    {lv:'adv', title:'Quantum sweep', sim:'sched', input:`algo: RR
quantum: 3        # try 1, 3, 6, 20
A 0 10
B 0 4
C 0 6
D 0 2`, why:`Small quanta give low response times but many switches; q = 20 is exactly FCFS. Look at "process switches" and "average response" in the result.`},
  ],
  tips: {
    say:`"Round robin is preemptive FCFS: each process gets one quantum, then goes to the back of the queue. It's fair, has bounded waiting of (n−1)·q, and good response time, but average turnaround is usually worse than SJF. The quantum matters: too large becomes FCFS, too small wastes time switching; typically 10–100 ms so most bursts fit in one slice."`,
    points:[`Trace the queue correctly.`,`Bounded wait and no starvation.`,`Quantum trade-off.`],
    traps:[`Wrong tie-break between arrival and re-queue.`,`Assuming RR is always better than FCFS.`],
    qa:[[`When is RR worse than FCFS?`,`When all jobs are the same length: RR finishes all of them near the end (turnaround of each ≈ total), while FCFS finishes them one by one, with lower average turnaround, plus RR adds switch overhead.`],
        [`What's the maximum wait before a process first runs?`,`(n−1)·q with n processes in the queue.`],
        [`How does quantum relate to context-switch cost?`,`Overhead fraction ≈ s / (q + s) for switch cost s, so q should be much larger than s.`]]
  },
  exercises: [
    {lv:'E', q:`RR, quantum 2: what is the average waiting time?`, sim:'sched', key:'avgWT', input:`algo: RR
quantum: 2
A 0 3
B 0 4
C 0 2`, hint:`A 0–2, B 2–4, C 4–6, A 6–7, B 7–9.`, answer:`<p>A waits 7−3 = 4, B 9−4 = 5, C 6−2 = 4 → 13/3 ≈ 4.33.</p>`},
    {lv:'M', q:`RR, quantum 3: give the Gantt order (names separated by spaces).`, sim:'sched', key:'order', input:`algo: RR
quantum: 3
P1 0 5
P2 1 4
P3 3 2
P4 5 3`, hint:`At each slice end, add arrivals first, then the preempted process.`, answer:`<p>P1 0–3, P2 3–6, P3 6–8, P1 8–10, P4 10–13, P2 13–14.</p>`},
    {lv:'H', q:`For the same input, what is P2's completion time?`, sim:'sched', key:'ct.P2', input:`algo: RR
quantum: 3
P1 0 5
P2 1 4
P3 3 2
P4 5 3`, hint:`Use the order from the previous exercise.`, answer:`<p>P2's last unit runs 13–14: completion 14.</p>`},
  ],
  quiz: [
    [`Round robin is…`,[`Non-preemptive`,`Preemptive with a fixed time quantum`,`Priority-only`,`SJF`],1,`Timer-driven slices.`,'E'],
    [`With a very large quantum, RR behaves like…`,[`SJF`,`FCFS`,`Priority`,`MLFQ`],1,`No preemption happens.`,'E'],
    [`A very small quantum causes…`,[`Starvation`,`High context-switch overhead`,`Convoy effect`,`Deadlock`],1,`Overhead dominates.`,'E'],
    [`RR's main strength is…`,[`Minimum turnaround`,`Fairness and good response time`,`No context switches`,`Optimal waiting`],1,`Everyone gets turns.`,'M'],
    [`With n processes and quantum q, the maximum wait before a process runs is…`,[`q`,`n·q`,`(n−1)·q`,`Unbounded`],2,`Bounded wait.`,'M'],
    [`Can RR starve a process?`,[`Yes, often`,`No`,`Only with priorities`,`Only on multicore`],1,`Everyone cycles.`,'M'],
  ],
  quizAdv: [
    [`Equal-length jobs under RR vs FCFS: average turnaround is…`,[`Lower with RR`,`Higher with RR`,`The same`,`Unrelated`],1,`All finish near the end.`,'H'],
    [`Rule of thumb for q is that…`,[`q = 1 µs`,`~80% of CPU bursts should be shorter than q`,`q = context-switch time`,`q should equal the longest job`],1,`Galvin's guideline.`,'H'],
    [`With switch cost s and quantum q, overhead fraction ≈…`,[`q/s`,`s/(q+s)`,`s·q`,`1/q`],1,`Time lost per cycle.`,'H'],
  ],
});
