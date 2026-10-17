/* 5.1 Deadlock conditions and resource-allocation graphs */
topic('5', { no:'5.1', title:'Deadlock: the four conditions and resource-allocation graphs',
idea:`A deadlock needs four things at once: mutual exclusion, hold-and-wait, no preemption and circular wait. Build a resource-allocation graph for two threads and two locks, watch the cycle appear, and see why with multiple instances per resource a cycle is necessary but not sufficient.`,
actors:'Threads', dgTitle:'Resource-allocation graph', stateTitle:'Coffman conditions',
nodes:{
  T1:{x:90,y:60,label:'T1',w:70,h:40,kind:'actor'},
  T2:{x:390,y:60,label:'T2',w:70,h:40,kind:'actor'},
  A:{x:90,y:190,label:'lock A',w:90,h:40,kind:'lock'},
  B:{x:390,y:190,label:'lock B',w:90,h:40,kind:'lock'},
  T3:{x:240,y:125,label:'T3',w:70,h:40,kind:'actor'}
},
edges:[],
vb:'0 0 480 230',
codes:{a:`// T1: transfer(a → b)            // T2: transfer(b → a)
lock(A);                          lock(B);
lock(B);   // waits for T2        lock(A);   // waits for T1
debit(a); credit(b);              debit(b); credit(a);
unlock(B); unlock(A);             unlock(A); unlock(B);

// RAG edges:  request  T → R  (T waits for R)
//             assignment R → T  (R is held by T)
// single instance per resource: cycle ⇔ deadlock
// several instances:           cycle ⇒ maybe deadlock`},
steps:[
{hl:{T1:[2]}, th:[['T1','RUN:ok','holds A'],['T2','READY:info','']], d:{hide:['T3'], on:['T1','A'], e:[['A','T1','held','ok']]}, g:[G('Coffman conditions',['1. mutual exclusion','A can be held by one thread','hot'])],
 say:`T1 transfers money from account a to b, locking A then B. It takes A. In a <b>resource-allocation graph</b> (RAG), an <b>assignment edge</b> points from the resource to the thread holding it: A → T1.`},
{hl:{T2:[2]}, th:[['T1','RUN:ok','holds A'],['T2','RUN:ok','holds B']], d:{hide:['T3'], on:['T2','B'], e:[['A','T1','held','ok'],['B','T2','held','ok']]}, g:[G('Coffman conditions',['1. mutual exclusion','✓'])],
 say:`At the same time T2 transfers from b to a, locking in the opposite order: it takes B first.`},
{hl:{T1:[3]}, th:[['T1','BLOCKED:warn','waits for B'],['T2','RUN:ok','holds B']], d:{hide:['T3'], on:['T1'], e:[['A','T1','held','ok'],['B','T2','held','ok'],['T1','B','requests','hot']]}, g:[G('Coffman conditions',['1. mutual exclusion','✓'],['2. hold and wait','T1 holds A while waiting for B','hot'])],
 say:`T1 now requests B and blocks. A <b>request edge</b> points from the thread to the resource it waits for: T1 → B. T1 is <b>holding</b> A while <b>waiting</b> for B: condition 2.`},
{hl:{T2:[3]}, th:[['T1','BLOCKED:bad','waits for B (T2)'],['T2','BLOCKED:bad','waits for A (T1)']], d:{hide:['T3'], bad:['T1','T2'], e:[['A','T1','held','bad'],['B','T2','held','bad'],['T1','B','requests','bad'],['T2','A','requests','bad']]}, g:[G('Coffman conditions',['1. mutual exclusion','✓','bad'],['2. hold and wait','✓','bad'],['3. no preemption','locks can\'t be taken away','bad'],['4. circular wait','T1 → B → T2 → A → T1','bad'])], log:['DEADLOCK: cycle T1 → B → T2 → A → T1'],
 say:`T2 requests A. Follow the arrows: T1 → B → T2 → A → T1. A <b>cycle</b>. Locks can't be forcibly taken (<b>no preemption</b>), so nobody can proceed: <b>deadlock</b>. All four Coffman conditions hold. With one instance of each resource, a cycle in the RAG means deadlock, full stop.`},
{th:[['T1','RUN:ok','holds a printer'],['T2','BLOCKED:warn','waits for a printer'],['T3','RUN:ok','holds a printer, will finish']], d:{hide:['B'], on:['T3'], e:[['A','T1','held',''],['A','T3','held','ok'],['T2','A','requests','hot']], labels:{A:'printers ×2'}}, g:[G('Multiple instances',['resource','2 printers'],['cycle?','possible, but T3 will finish and free one','ok'],['so','cycle ⇒ deadlock only with single instances'])],
 say:`If a resource has <b>several instances</b> (two printers, a pool of connections), a cycle doesn't guarantee deadlock: a thread outside the cycle may finish and release an instance, breaking it. Then you need a detection algorithm (like the Banker's matrices) instead of just looking for cycles.`},
{th:[], d:null, g:[G('Break any one condition',['mutual exclusion','share where possible (read-only data)'],['hold and wait','acquire everything at once, or release before waiting'],['no preemption','try-lock / timeouts; roll back'],['circular wait','global lock order (most practical)','ok']),G('Strategies (next topics)',['prevention','design so a condition can\'t hold'],['avoidance','Banker\'s: only grant safe requests'],['detection + recovery','find cycles, kill/roll back'],['ignore','ostrich algorithm: most OSes for user locks'])],
 say:`<b>Say it:</b> "Deadlock requires four conditions simultaneously: mutual exclusion, hold and wait, no preemption, and circular wait. In a resource-allocation graph with request and assignment edges, a cycle means deadlock when each resource has a single instance, and possible deadlock with multiple instances. We handle it by prevention, breaking one condition, usually circular wait with lock ordering; by avoidance like the Banker's algorithm; by detection and recovery; or by ignoring it."`}
],
keep:[`Four conditions: mutual exclusion, hold & wait, no preemption, circular wait.`,`RAG: request T→R, assignment R→T.`,`Single instance: cycle ⇔ deadlock. Multiple: cycle ⇒ maybe.`,`Break one condition to prevent deadlock (lock ordering is easiest).`,`Strategies: prevent, avoid, detect+recover, ignore.`]}, {
  imp: 'must',
  theory: TH(`A deadlock is a set of threads each waiting for a resource another holds; it requires mutual exclusion, hold-and-wait, no preemption and circular wait, and a resource-allocation graph makes the cycle visible.`,
`<p>Four cars arrive at a four-way junction with no lights and each pulls halfway in, blocking the car to its left. Each holds its piece of road (hold), waits for the next piece (wait), nobody can be lifted out of the way (no preemption), and the waits form a loop (circular wait). Remove any one of those and traffic flows.</p>
<p>That's why the four conditions matter: every deadlock-handling technique works by making one of them impossible, or by making sure the system never enters a state from which they could all hold.</p>`,
[[`Deadlock`,`Permanent blocking of a set of threads, each waiting for another.`],[`Mutual exclusion`,`A resource can be used by only one thread at a time.`],[`Hold and wait`,`A thread holds resources while waiting for more.`],[`No preemption`,`Resources are released only voluntarily.`],[`Circular wait`,`A cycle of threads each waiting for the next.`],[`RAG`,`Graph of threads, resources, request and assignment edges.`],[`Wait-for graph`,`RAG with resources collapsed: T1 → T2 if T1 waits for something T2 holds.`]],
[`Draw a node per thread and per resource (dots for instances).`,`Add assignment edges (resource → holder) and request edges (thread → resource).`,`Look for a cycle.`,`Single-instance resources: a cycle is a deadlock.`,`Multi-instance: run a detection algorithm (does some order let everyone finish?).`],
[`Database engines build wait-for graphs and abort a victim on a cycle.`,`Java thread dumps (jstack) report "Found one Java-level deadlock".`,`Lock-ordering rules in code reviews: always lock lower account id first.`],
[`Confusing deadlock with starvation (deadlock: nobody progresses; starvation: someone is overlooked).`,`Claiming any RAG cycle means deadlock with multi-instance resources.`,`Thinking deadlock needs many threads: two and two locks suffice.`])
  ,
  examples: [
    {lv:'basic', title:'Two transfers, opposite order', sim:'race', input:`shared: done=0 A=0 B=0
T1: lock A; lock B; set done 1; unlock B; unlock A
T2: lock B; lock A; set done 2; unlock A; unlock B`, why:`Some schedules finish (one transfer goes entirely first); others end in DEADLOCK. That's what makes deadlocks intermittent.`},
    {lv:'mid', title:'Same code, consistent order', sim:'race', input:`shared: done=0 A=0 B=0
T1: lock A; lock B; set done 1; unlock B; unlock A
T2: lock A; lock B; set done 2; unlock B; unlock A`, why:`Both lock A first: no cycle can form, so no schedule deadlocks. Circular wait is broken by design.`},
    {lv:'adv', title:'Reading a Java deadlock report', code:`$ jstack 4242
Found one Java-level deadlock:
"transfer-2": waiting to lock monitor 0x7f..a8 (object Account@1b6d, id=7),
  which is held by "transfer-1"
"transfer-1": waiting to lock monitor 0x7f..c0 (object Account@4554, id=3),
  which is held by "transfer-2"
  at Bank.transfer(Bank.java:21)   // synchronized (from) { synchronized (to) { … } }`, why:`The JVM builds the wait-for graph for you. The fix is in the code: lock the account with the smaller id first.`},
  ],
  tips: {
    say:`"Deadlock is when a set of threads each wait for a resource held by another, so none can proceed. It needs four conditions together: mutual exclusion, hold and wait, no preemption, and circular wait. In a resource-allocation graph a cycle means deadlock if each resource has one instance, and only possible deadlock with several instances. In practice I prevent it by imposing a global lock order."`,
    points:[`List all four conditions.`,`Draw the RAG and the cycle.`,`Single vs multiple instances.`],
    traps:[`Forgetting no preemption.`,`Mixing deadlock with livelock/starvation.`],
    qa:[[`Can a deadlock involve just one thread?`,`Yes: a thread re-locking a non-reentrant mutex it already holds waits for itself.`],
        [`What's a wait-for graph?`,`A RAG with resource nodes removed: an edge Ti → Tj means Ti waits for a resource Tj holds. Databases use it to detect deadlocks.`],
        [`Why is circular wait the condition usually broken?`,`The others are inherent (locks must be exclusive), costly (acquiring everything up front) or hard (preempting locks safely). Ordering locks is cheap and local.`]]
  },
  exercises: [
    {lv:'E', q:`Which of these are necessary conditions for deadlock? 1 mutual exclusion, 2 preemption, 3 hold and wait, 4 circular wait, 5 starvation, 6 no preemption. Answer with the numbers, e.g. <code>1 2 5</code>.`, ans:'1 3 4 6', hint:`Preemption would prevent deadlock.`, answer:`<p>Mutual exclusion, hold and wait, no preemption, circular wait: 1 3 4 6.</p>`},
    {lv:'M', q:`Opposite lock orders: can it deadlock? (yes/no)`, sim:'race', key:'deadlock', input:`shared: done=0 A=0 B=0
T1: lock A; lock B; set done 1; unlock B; unlock A
T2: lock B; lock A; set done 2; unlock A; unlock B`, hint:`Run the explorer.`, answer:`<p>Yes, if each takes its first lock before the other takes its second.</p>`},
    {lv:'H', q:`Three threads: T1 locks A then B, T2 locks B then C, T3 locks C then A. Can it deadlock? (yes/no)`, sim:'race', key:'deadlock', input:`shared: x=0 A=0 B=0 C=0
T1: lock A; lock B; unlock B; unlock A
T2: lock B; lock C; unlock C; unlock B
T3: lock C; lock A; unlock A; unlock C`, hint:`Draw T1 → B → T2 → C → T3 → A → T1.`, answer:`<p>Yes: a three-way cycle. Fix: global order A &lt; B &lt; C, so T3 locks A before C.</p>`},
  ],
  quiz: [
    [`Which is NOT a necessary condition for deadlock?`,[`Mutual exclusion`,`Hold and wait`,`Preemption`,`Circular wait`],2,`It's NO preemption.`,'E'],
    [`In a RAG, an edge from resource R to thread T means…`,[`T requests R`,`R is assigned to (held by) T`,`T released R`,`R is free`],1,`Assignment edge.`,'E'],
    [`With single-instance resources, a cycle in the RAG means…`,[`Possible deadlock`,`Deadlock`,`No deadlock`,`Starvation`],1,`Necessary and sufficient.`,'E'],
    [`With multi-instance resources, a cycle means…`,[`Certain deadlock`,`Deadlock is possible, not certain`,`No deadlock`,`A bug in the graph`],1,`Others may release.`,'M'],
    [`The most practical way to prevent lock deadlocks in code is…`,[`More threads`,`A consistent global lock order`,`Larger timeouts`,`Fewer CPUs`],1,`Breaks circular wait.`,'M'],
    [`Minimum number of threads for a lock deadlock?`,[`1 (self-deadlock on a non-reentrant lock)`,`3`,`4`,`5`],0,`Or 2 with two locks.`,'M'],
  ],
  quizAdv: [
    [`A wait-for graph is obtained from a RAG by…`,[`Adding edges`,`Removing resource nodes and connecting waiter to holder`,`Reversing edges`,`Counting instances`],1,`Used for single-instance detection.`,'H'],
    [`The "ostrich algorithm" means…`,[`Bury the deadlocked process`,`Ignore deadlocks because they're rare and handling them is costly`,`Kill all processes`,`Use timeouts`],1,`What most OSes do for user locks.`,'H'],
    [`Databases resolve detected deadlocks by…`,[`Waiting longer`,`Aborting a victim transaction`,`Rebooting`,`Ignoring them`],1,`Victim rolled back, app retries.`,'H'],
  ],
});
