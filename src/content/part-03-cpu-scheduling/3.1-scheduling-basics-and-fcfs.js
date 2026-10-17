/* 3.1 Scheduling basics and FCFS */
topic('3', { no:'3.1', title:'Scheduling criteria and FCFS (the convoy effect)',
idea:`The scheduler decides which ready process gets the CPU next. Start with the simplest policy, first-come first-served, measure waiting and turnaround time, and see how one long job arriving first makes everyone wait: the convoy effect.`,
actors:'Processes', tbTitle:'Metrics', stateTitle:'Definitions',
codes:{a:`// FCFS: a FIFO ready queue, no preemption
while (true) {
    p = ready_queue.pop_front();    // earliest arrival first
    run(p) until p finishes or blocks;
}

// metrics, per process
turnaround = completion - arrival
waiting    = turnaround - burst      // time spent in the ready queue
response   = first_run - arrival`},
steps:[
{hl:{sched:[2,3]}, th:[['P1','READY:info','burst 24'],['P2','READY:info','burst 3'],['P3','READY:info','burst 3']], gt:GT(0), g:[G('Definitions',['CPU burst','time a process needs the CPU before it blocks or ends'],['arrival','when it enters the ready queue'],['all arrive at','t = 0, in order P1, P2, P3'])],
 say:`Three processes arrive at time 0 in the order P1, P2, P3, with CPU bursts of 24, 3 and 3 ms. <b>First-come first-served</b> (FCFS) keeps a FIFO ready queue and runs each process until it finishes or blocks. No preemption.`},
{hl:{sched:[3,4]}, th:[['P1','RUN:ok','runs 0–24'],['P2','READY:warn','waiting'],['P3','READY:warn','waiting']], gt:GT(24,['P1',0,24]), tb:[TB('so far',['proc','burst','finish','waiting'],[['P1','24','24','0']],{0:'new'})],
 say:`P1 arrived first, so it runs from 0 to 24. P2 and P3, which need just 3 ms each, sit in the ready queue for the whole time.`},
{gt:GT(30,['P1',0,24],['P2',24,27],['P3',27,30]), th:[['P1','TERM:dim',''],['P2','TERM:dim',''],['P3','TERM:dim','']], tb:[TB('FCFS order P1, P2, P3',['proc','burst','finish','turnaround','waiting'],[['P1','24','24','24','0'],['P2','3','27','27','24'],['P3','3','30','30','27'],['average','','','27','17']],{3:'bad'})], hl:{sched:[8,9]},
 say:`P2 runs 24–27 and P3 27–30. Turnaround = finish − arrival; waiting = turnaround − burst. Average waiting time is <b>(0 + 24 + 27) / 3 = 17 ms</b>. Two tiny jobs waited 24+ ms behind one big one.`},
{gt:GT(30,['P2',0,3],['P3',3,6],['P1',6,30]), tb:[TB('same jobs, order P2, P3, P1',['proc','burst','finish','turnaround','waiting'],[['P2','3','3','3','0'],['P3','3','6','6','3'],['P1','24','30','30','6'],['average','','','13','3']],{3:'ok'})],
 say:`If the short jobs had arrived first, the same work finishes at the same time (30), but average waiting drops to <b>(0 + 3 + 6) / 3 = 3 ms</b>. FCFS's performance depends entirely on arrival order. This is the <b>convoy effect</b>: short processes stuck behind a long one, like cars behind a truck on a one-lane road.`},
{gt:null, th:[], tb:[], g:[G('What schedulers optimise',['CPU utilisation','keep the CPU busy','ok'],['throughput','jobs finished per second','ok'],['turnaround','finish − arrival (batch jobs)'],['waiting','time in the ready queue'],['response','first run − arrival (interactive)','hot'],['fairness','no one starves'])],
 say:`Schedulers trade off several metrics: <b>utilisation</b> and <b>throughput</b> (system view), <b>turnaround</b> and <b>waiting</b> (batch jobs), <b>response time</b> (interactive users care when they first see output) and <b>fairness</b>. No policy wins all of them. FCFS is simple and fair in arrival order but terrible for response time when jobs vary in length.`},
{g:[G('FCFS',['preemptive?','no'],['overhead','minimal'],['starvation?','no (everyone eventually runs)','ok'],['weakness','convoy effect, poor response time','bad']),G('Preemptive vs not',['non-preemptive','process keeps the CPU until it blocks/exits'],['preemptive','scheduler can take the CPU away (timer)','hot'])],
 say:`<b>Say it:</b> "Schedulers aim for high utilisation and throughput, and low turnaround, waiting and response times. FCFS runs processes in arrival order without preemption. It's simple and starvation-free but suffers from the convoy effect: short jobs wait behind long ones, so average waiting time can be terrible. For the same jobs, running the short ones first cuts waiting time from 17 to 3."`}
],
keep:[`Turnaround = completion − arrival.`,`Waiting = turnaround − burst.`,`Response = first run − arrival.`,`FCFS: FIFO, non-preemptive, simple, no starvation.`,`Convoy effect: short jobs stuck behind a long one.`]}, {
  imp: 'must',
  theory: TH(`CPU scheduling picks the next ready process; FCFS simply runs them in arrival order, which is easy but can make short jobs wait behind long ones.`,
`<p>A supermarket with one till serving customers strictly in order of arrival is FCFS. If someone with a full trolley arrives just before you with your single bottle of milk, you wait. Express lanes ("10 items or fewer") exist precisely because ordering by job size helps average waiting time.</p>
<p>Scheduling questions in interviews are mostly arithmetic on a Gantt chart: draw who runs when, then compute completion, turnaround and waiting per process. Practise with the simulator below until it's mechanical.</p>`,
[[`CPU burst`,`Stretch of CPU use between I/O waits.`],[`Arrival time`,`When the process becomes ready.`],[`Completion time`,`When it finishes.`],[`Turnaround time`,`Completion − arrival.`],[`Waiting time`,`Turnaround − burst (time spent ready but not running).`],[`Response time`,`First run − arrival.`],[`Throughput`,`Processes completed per unit time.`],[`Convoy effect`,`Many short processes waiting behind one long one.`],[`Non-preemptive`,`Once running, a process keeps the CPU until it blocks or ends.`]],
[`Processes join the tail of a FIFO ready queue when they arrive or finish I/O.`,`The scheduler takes the head of the queue.`,`It runs until it blocks or finishes; then the next one starts.`,`If the queue is empty, the CPU is idle until something arrives.`],
[`Batch systems and simple embedded loops often behave like FCFS.`,`FIFO queues inside other policies (e.g. equal-priority processes) are FCFS.`,`Network and disk queues also show convoy effects.`],
[`Forgetting to subtract arrival time.`,`Computing waiting time as start time (wrong when processes are preempted).`,`Ignoring idle gaps when no process has arrived.`])
  ,
  examples: [
    {lv:'basic', title:'The convoy effect', sim:'sched', input:`algo: FCFS
# name arrival burst
P1 0 24
P2 0 3
P3 0 3`, why:`Average waiting 17. Swap the lines so P2 and P3 come first and run again: 3.`},
    {lv:'mid', title:'Different arrival times and an idle gap', sim:'sched', input:`algo: FCFS
A 0 4
B 2 3
C 10 2     # arrives after B is done: CPU idles 7–10`, why:`Look at the Gantt chart: the CPU is idle between 7 and 10 because nobody is ready. CPU utilisation drops below 100%.`},
    {lv:'adv', title:'Mixed workload: interactive jobs suffer', sim:'sched', input:`algo: FCFS
batch   0 50
editor  1 1
shell   2 1
browser 3 2`, why:`The three interactive jobs need 4 ms in total but wait ~50 ms each. Check the response-time column; change the algo to RR with quantum 2 and compare.`},
  ],
  tips: {
    say:`"Schedulers try to maximise CPU utilisation and throughput and minimise turnaround, waiting and response time. FCFS runs processes in arrival order without preemption. It's simple and starvation-free, but one long job ahead of many short ones causes the convoy effect and a high average waiting time."`,
    points:[`Define the metrics precisely.`,`Draw the Gantt chart and compute averages.`,`Name the convoy effect.`],
    traps:[`Mixing up turnaround and waiting time.`,`Forgetting arrival times.`],
    qa:[[`Is FCFS ever a good choice?`,`When jobs are similar in length, or for batch work where fairness in order matters and response time doesn't, or as the tie-breaker inside other policies.`],
        [`Can FCFS starve a process?`,`No: every process eventually reaches the head of the queue (assuming each burst ends).`],
        [`Why does response time matter more than turnaround for interactive work?`,`Users perceive the delay before anything happens; a fast first response feels responsive even if the whole job takes longer.`]]
  },
  exercises: [
    {lv:'E', q:`What is the average waiting time under FCFS?`, sim:'sched', key:'avgWT', input:`algo: FCFS
P1 0 5
P2 0 3
P3 0 8`, hint:`P1 waits 0, P2 waits 5, P3 waits 8.`, answer:`<p>(0 + 5 + 8) / 3 = 4.33.</p>`},
    {lv:'M', q:`With arrivals, what is the average turnaround time under FCFS?`, sim:'sched', key:'avgTAT', input:`algo: FCFS
P1 0 4
P2 1 3
P3 2 1
P4 3 2`, hint:`Completion: 4, 7, 8, 10. Subtract arrivals.`, answer:`<p>Turnarounds 4, 6, 6, 7 → average 5.75.</p>`},
    {lv:'H', q:`What is the CPU utilisation (in %) for this FCFS run?`, sim:'sched', key:'util', input:`algo: FCFS
A 0 3
B 5 2
C 6 4`, hint:`Busy time / finish time; the CPU idles 3–5.`, answer:`<p>Busy 9 out of 11 time units ≈ 81.82%.</p>`},
  ],
  quiz: [
    [`Turnaround time is…`,[`Burst time`,`Completion − arrival`,`Start − arrival`,`Waiting + arrival`],1,`Total time in the system.`,'E'],
    [`Waiting time equals…`,[`Turnaround − burst`,`Completion − burst`,`Burst − arrival`,`Response time always`],0,`Time spent ready, not running.`,'E'],
    [`FCFS is…`,[`Preemptive`,`Non-preemptive`,`Priority-based`,`Random`],1,`Runs to completion or block.`,'E'],
    [`The convoy effect means…`,[`Processes crash together`,`Short processes wait behind a long one`,`Too many context switches`,`Deadlock`],1,`Order-sensitive waiting.`,'M'],
    [`Response time is most important for…`,[`Batch payroll`,`Interactive applications`,`Backups`,`Compilers`],1,`Users notice the first reaction.`,'M'],
    [`FCFS with jobs 10, 1, 1 (all at 0) has average waiting…`,[`1`,`7`,`10`,`3.67`],1,`(0 + 10 + 11)/3 = 7.`,'M'],
  ],
  quizAdv: [
    [`Which metric does FCFS never worsen by causing starvation?`,[`Fairness: everyone eventually runs`,`Response time`,`Average waiting`,`Throughput`],0,`It's starvation-free.`,'H'],
    [`If all jobs have equal bursts, FCFS average waiting vs SJF is…`,[`Worse`,`The same`,`Better`,`Undefined`],1,`Order doesn't matter when lengths are equal.`,'H'],
    [`Throughput is…`,[`Average waiting`,`Number of processes completed per unit time`,`CPU speed`,`Context switches per second`],1,`System-level metric.`,'H'],
  ],
});
