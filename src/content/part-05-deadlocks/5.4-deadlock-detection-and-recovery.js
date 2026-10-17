/* 5.4 Deadlock detection and recovery */
topic('5', { no:'5.4', title:'Deadlock detection and recovery',
idea:`Instead of preventing deadlocks, let them happen, find them, and clean up. Run the detection algorithm on a system with multi-instance resources, watch one extra request tip it into deadlock, then choose how to recover: kill a victim, roll it back, or preempt resources.`,
actors:'Processes', tbTitle:'Detection run', stateTitle:'Recovery options',
codes:{a:`// like the safety algorithm, but with CURRENT requests instead of max needs
Work = Available;
for each i: Finish[i] = (Allocation[i] == 0);
while (exists i: !Finish[i] && Request[i] <= Work) {
    Work += Allocation[i];          // optimistic: assume i finishes and releases
    Finish[i] = true;
}
deadlocked = { i : !Finish[i] };

// when to run it: every request (expensive), periodically, or when CPU use drops
// recovery: abort all deadlocked, or abort one at a time, or preempt + roll back`},
steps:[
{hl:{det:[2,3]}, tb:[TB('state (A B C), available 0 0 0',['proc','allocation','request (now)'],[['P0','0 1 0','0 0 0'],['P1','2 0 0','2 0 2'],['P2','3 0 3','0 0 0'],['P3','2 1 1','1 0 0'],['P4','0 0 2','0 0 2']])], g:[G('Recovery options',['question','is anyone deadlocked right now?'])],
 say:`Detection uses <b>current requests</b> (what each process is blocked waiting for), not maximum claims, so it needs no advance knowledge. Available is 0 0 0. With multiple instances per resource we can't just look for a cycle; we run an algorithm much like the safety check.`},
{hl:{det:[4,5,6]}, tb:[TB('detection run',['finishes','request','work after'],[['P0','0 0 0','0 1 0'],['P2','0 0 0','3 1 3'],['P1','2 0 2','5 1 3'],['P3','1 0 0','7 2 4'],['P4','0 0 2','7 2 6']],{0:'ok',1:'ok',2:'ok',3:'ok',4:'ok'})], g:[G('Recovery options',['result','no deadlock','ok'])],
 say:`P0 and P2 request nothing, so they can finish and release (work 3 1 3). Then P1's request 2 0 2 fits, then P3, then P4. Every process can complete: <b>no deadlock</b>, even though nothing is available right now.`},
{tb:[TB('P2 now requests one more C (0 0 1)',['finishes','request','work after'],[['P0','0 0 0','0 1 0'],['P1','2 0 2','stuck'],['P2','0 0 1','stuck'],['P3','1 0 0','stuck'],['P4','0 0 2','stuck']],{0:'ok',1:'bad',2:'bad',3:'bad',4:'bad'})], g:[G('Recovery options',['deadlocked','P1, P2, P3, P4','bad'])], log:['detector: P1 P2 P3 P4 deadlocked'],
 say:`Now P2 requests one more instance of C. Rerun: P0 can finish (work 0 1 0), but then nobody's request fits: P1 needs 2 A, P2 needs a C, P3 needs an A, P4 needs 2 C. <b>P1, P2, P3 and P4 are deadlocked.</b> With single-instance resources the same question reduces to finding a cycle in the wait-for graph.`},
{hl:{det:[10,11]}, th:[['P1','TERM:bad','victim: aborted'],['P2','BLOCKED:warn',''],['P3','RUN:ok','got A from P1'],['P4','BLOCKED:warn','']], g:[G('Recovery options',['abort all deadlocked','simple, loses lots of work','bad'],['abort one at a time','rerun detection after each','ok'],['victim choice','priority, CPU used, resources held, how close to done, how many times already chosen'])], log:['abort P1 → releases 2 0 0 → P3 can proceed'],
 say:`<b>Recovery by termination.</b> Either abort all deadlocked processes (simple, wasteful) or abort one victim at a time and rerun detection. Aborting P1 frees 2 0 0: P3's request (1 0 0) now fits, P3 finishes, and the chain unblocks. Pick the victim by cost: lowest priority, least work done, fewest resources held, and not the same victim every time (or it <b>starves</b>).`},
{th:[['P1','READY:info','rolled back to checkpoint'],['P3','RUN:ok','']], g:[G('Recovery options',['preemption + rollback','take resources from a victim, roll it back to a safe point','ok'],['needs','checkpoints or transactions (undo logs)'],['databases','abort a victim transaction; the client retries','ok'])],
 say:`<b>Recovery by preemption.</b> Take resources away from a victim and <b>roll it back</b> to an earlier checkpoint (or restart it). This needs state that can be undone. Databases do exactly this: the deadlock detector aborts one transaction, which rolls back via its undo log, and the application retries.`},
{th:[], tb:[], g:[G('When to detect',['every request','catches it at once, costly'],['periodically (e.g. 1 s)','cheap, deadlocked processes wait meanwhile'],['on symptoms','CPU utilisation drops, requests time out']),G('In practice',['databases','yes: wait-for graph + victim abort','ok'],['JVM','detects & reports (jstack), doesn\'t recover'],['OS for user locks','no: ostrich algorithm'])],
 say:`<b>Say it:</b> "Detection lets deadlocks happen and finds them: with single-instance resources by finding cycles in the wait-for graph; with multiple instances by an algorithm like Banker's safety check that uses current requests, marking as deadlocked whoever can't finish. Recovery means aborting processes, all or one victim at a time chosen by cost, or preempting resources and rolling the victim back. Databases detect deadlocks and abort a victim transaction; general-purpose OSes mostly don't bother for user locks."`}
],
keep:[`Detection uses current requests (no max needed).`,`Single instance: cycle in wait-for graph. Multi: Banker-like algorithm.`,`Whoever can't finish in the simulation is deadlocked.`,`Recover: abort all / abort victims one by one / preempt + roll back.`,`Pick victims by cost; avoid starving the same victim.`]}, {
  imp: 'good',
  theory: TH(`Deadlock detection periodically checks whether some processes can never finish given current requests, and recovery breaks the deadlock by aborting or rolling back victims.`,
`<p>Instead of strict traffic rules, a city lets cars drive freely and sends a tow truck when it spots gridlock. That's cheaper day-to-day if gridlocks are rare, but each one costs the towed driver their journey.</p>
<p>Detection is attractive when deadlocks are rare and work can be undone cheaply, which is exactly the situation in databases (transactions can be rolled back). It's unattractive for operations with side effects that can't be undone.</p>`,
[[`Detection algorithm`,`Determines which processes are deadlocked now.`],[`Wait-for graph`,`Single-instance detection: a cycle means deadlock.`],[`Request matrix`,`What each blocked process currently waits for.`],[`Victim`,`Process chosen to be aborted or rolled back.`],[`Rollback`,`Returning a process to an earlier safe state.`],[`Checkpoint`,`Saved state to roll back to.`],[`Starvation (of victims)`,`Same process chosen as victim repeatedly.`]],
[`Work = Available; processes holding nothing are finished.`,`Find an unfinished process whose current request fits in Work.`,`Assume it finishes: Work += its allocation; repeat.`,`Processes left unfinished are deadlocked.`,`Recover: abort/rollback a victim, release its resources, rerun detection.`],
[`PostgreSQL runs deadlock detection after deadlock_timeout (1 s); MySQL InnoDB checks immediately.`,`jstack/JMC report Java monitor deadlocks.`,`Distributed systems use timeouts as a crude detector.`],
[`Using max claims instead of current requests in detection.`,`Always picking the same victim.`,`Detecting deadlocks but having no way to undo the victim's work.`])
  ,
  examples: [
    {lv:'basic', title:'Detection: no deadlock', sim:'banker', input:`mode: detect
resources: A B C
available: 0 0 0
# proc allocation | current request
P0 0 1 0 | 0 0 0
P1 2 0 0 | 2 0 2
P2 3 0 3 | 0 0 0
P3 2 1 1 | 1 0 0
P4 0 0 2 | 0 0 2`, why:`Everyone can finish (P0, P2, P1, P3, P4), so nobody is deadlocked, even with nothing available.`},
    {lv:'mid', title:'One more request: deadlock', sim:'banker', input:`mode: detect
resources: A B C
available: 0 0 0
P0 0 1 0 | 0 0 0
P1 2 0 0 | 2 0 2
P2 3 0 3 | 0 0 1
P3 2 1 1 | 1 0 0
P4 0 0 2 | 0 0 2`, why:`P2 asks for one more C. Only P0 can finish; P1–P4 are deadlocked. Change P1's allocation to 0 0 0 (as if it were aborted, giving 2 0 0 back to available) and rerun.`},
    {lv:'adv', title:'Database detection and victim choice', code:`-- PostgreSQL
SET deadlock_timeout = '1s';      -- wait this long before running the (expensive) detector
-- session 1: UPDATE accounts SET … WHERE id = 1;  then  … WHERE id = 2;
-- session 2: UPDATE accounts SET … WHERE id = 2;  then  … WHERE id = 1;
ERROR:  deadlock detected
DETAIL:  Process 4242 waits for ShareLock on transaction 901; blocked by process 4243.
         Process 4243 waits for ShareLock on transaction 900; blocked by process 4242.
HINT:  See server log for query details.        -- one transaction rolled back`, why:`Detect-and-recover in production: the wait-for graph cycle is found, one transaction is the victim and is rolled back, the application must retry.`},
  ],
  tips: {
    say:`"Detection lets deadlocks occur and finds them. For single-instance resources I'd search the wait-for graph for a cycle; for multiple instances, run a Banker-style algorithm on current requests: repeatedly let a process whose request fits finish and release, and whoever's left is deadlocked. To recover, abort a victim chosen by cost and rerun detection, or preempt resources and roll the victim back to a checkpoint. Databases do exactly this and the app retries."`,
    points:[`Detection algorithm with current requests.`,`Recovery options and victim selection.`,`When to run detection.`],
    traps:[`Using max needs.`,`Ignoring starvation of victims.`],
    qa:[[`How often should detection run?`,`It's a trade-off: on every blocked request is immediate but costly; periodically or when throughput drops is cheap but deadlocked processes wait meanwhile.`],
        [`How do you choose a victim?`,`Minimise cost: lowest priority, least CPU time used, fewest resources held, least work to redo, and include a count of previous victimisations to avoid starvation.`],
        [`Why is rollback easier in databases than in OS processes?`,`Transactions log their changes (undo log) and have no external side effects until commit, so aborting is safe. OS processes may have already printed, sent packets or written files.`]]
  },
  exercises: [
    {lv:'E', q:`Which processes are deadlocked? (space separated, or <code>none</code>)`, sim:'banker', key:'deadlocked', input:`mode: detect
available: 0 0 0
P0 0 1 0 | 0 0 0
P1 2 0 0 | 2 0 2
P2 3 0 3 | 0 0 1
P3 2 1 1 | 1 0 0
P4 0 0 2 | 0 0 2`, hint:`After P0 finishes, work is 0 1 0.`, answer:`<p>P1 P2 P3 P4.</p>`},
    {lv:'M', q:`Which processes are deadlocked here?`, sim:'banker', key:'deadlocked', input:`mode: detect
resources: A B
available: 1 0
P0 1 0 | 0 1
P1 0 1 | 1 0
P2 0 0 | 1 1`, hint:`P1's request 1 0 fits the available 1 0.`, answer:`<p>P1 can finish (work 1 1), then P0 (2 1), then P2. None.</p>`},
    {lv:'H', q:`Single-instance resources: T1 holds R1 and waits for R2, T2 holds R2 and waits for R3, T3 holds R3 and waits for nothing. Is there a deadlock? (yes/no)`, ans:'no', hint:`Draw the wait-for graph: T1 → T2 → T3.`, answer:`<p>No cycle: T3 will finish and release R3, then T2, then T1.</p>`},
  ],
  quiz: [
    [`Deadlock detection uses each process's…`,[`Maximum need`,`Current outstanding request`,`Priority`,`Burst time`],1,`No advance knowledge needed.`,'E'],
    [`With single-instance resources, detection looks for…`,[`A safe sequence`,`A cycle in the wait-for graph`,`Starvation`,`Free memory`],1,`Cycle ⇔ deadlock.`,'E'],
    [`A common recovery method is…`,[`Adding RAM`,`Aborting a victim process/transaction`,`Increasing the quantum`,`Ignoring it`],1,`Release its resources.`,'E'],
    [`Aborting all deadlocked processes is…`,[`Optimal`,`Simple but wastes work`,`Impossible`,`Used by Banker's`],1,`Lots of lost computation.`,'M'],
    [`Running detection on every request…`,[`Is cheap`,`Detects immediately but is expensive`,`Is impossible`,`Prevents deadlock`],1,`Trade-off.`,'M'],
    [`Victim starvation is avoided by…`,[`Picking randomly`,`Including the number of past rollbacks in the cost`,`Never aborting`,`Aborting the oldest always`],1,`Fair victim selection.`,'M'],
  ],
  quizAdv: [
    [`In detection, processes with zero allocation are initially…`,[`Deadlocked`,`Marked finished (they can't be part of a deadlock)`,`Ignored entirely`,`Aborted`],1,`They hold nothing.`,'H'],
    [`PostgreSQL's deadlock_timeout controls…`,[`Lock wait limit`,`How long to wait before running the deadlock detector`,`Transaction length`,`Checkpoint interval`],1,`Detection is costly.`,'H'],
    [`Rollback recovery requires…`,[`More CPUs`,`Checkpoints or undo logs`,`Banker's algorithm`,`Spinlocks`],1,`Something to roll back to.`,'H'],
  ],
});
