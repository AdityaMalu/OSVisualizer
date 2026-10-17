/* 5.5 Livelock, starvation and priority inversion */
topic('5', { no:'5.5', title:'Livelock, starvation and priority inversion',
idea:`Not every concurrency failure is a deadlock. In a livelock threads stay busy but make no progress; in starvation one thread is perpetually passed over; in priority inversion a high-priority task waits behind a low one. Replay the 1997 Mars Pathfinder bug and fix it with priority inheritance.`,
actors:'Tasks', stateTitle:'Diagnosis',
codes:{a:`// Mars Pathfinder (simplified): three tasks share a CPU
// H = bus manager (high prio)  M = comms (medium)  L = weather data (low)
L: lock(bus_mutex);  write_weather();  unlock(bus_mutex);
H: lock(bus_mutex);  manage_bus();     unlock(bus_mutex);
M: long_running_communications();      // doesn't need the mutex

// fix: priority inheritance. While L holds a mutex H waits for,
// L runs at H's priority, so M can't preempt it.
pthread_mutexattr_setprotocol(&attr, PTHREAD_PRIO_INHERIT);`},
steps:[
{hl:{L:[3]}, th:[['H','TIMED:info','asleep'],['M','TIMED:info','asleep'],['L','RUN:ok','low prio, locks bus_mutex']], gt:GT(2,['L',0,2]), g:[G('Diagnosis',['L','holds bus_mutex','hot'])],
 say:`Three tasks with strict priorities: H (high), M (medium), L (low). The low-priority weather task L locks <code>bus_mutex</code> and starts writing. Nothing wrong yet.`},
{hl:{H:[4]}, th:[['H','BLOCKED:warn','needs bus_mutex (held by L)'],['M','TIMED:info',''],['L','RUN:ok','continues critical section']], gt:GT(3,['L',0,2],['H',2,3]), g:[G('Diagnosis',['H waits for L','normal: bounded by L\'s short critical section','ok'])],
 say:`H wakes, preempts L, tries to lock <code>bus_mutex</code> and blocks: L holds it. That's expected and fine, as long as L finishes its short critical section quickly. H only has to wait for L. This is <i>bounded</i> inversion.`},
{hl:{M:[5]}, th:[['H','BLOCKED:bad','still waiting'],['M','RUN:ok','preempts L'],['L','READY:bad','preempted while holding the mutex']], gt:GT(10,['L',0,2],['H',2,3],['L',3,4],['M',4,10]), g:[G('Diagnosis',['priority inversion','H effectively waits for M, a lower-priority task','bad'],['unbounded','as long as M (or many M\'s) keep running','bad'])], log:['M preempts L; H stuck behind M'],
 say:`Then M wakes. M has higher priority than L, so it preempts L, which is still holding the mutex. Now H (highest priority) waits for L, which waits for M: a medium task is effectively blocking the most important one, for as long as M runs. This is <b>priority inversion</b>. On Pathfinder, the watchdog saw H miss its deadline and reset the whole spacecraft, repeatedly.`},
{hl:{fix:[7,8,9]}, th:[['H','RUN:ok','gets the mutex promptly'],['M','READY:info','waits: L now has H\'s priority'],['L','RUN:ok','inherits H\'s priority']], gt:GT(8,['L',0,2],['H',2,3],['L',3,5],['H',5,8]), g:[G('Diagnosis',['priority inheritance','lock holder temporarily runs at the highest waiter\'s priority','ok'],['priority ceiling','mutex has a ceiling priority; holder always runs at it','ok'])], log:['L inherits H prio → M cannot preempt → L unlocks → H runs'],
 say:`<b>Priority inheritance</b>: while L holds a mutex that H is waiting for, L runs at H's priority. M can no longer preempt it, L finishes and unlocks, drops back to low priority, and H proceeds. NASA fixed Pathfinder by uploading a patch that turned on the inheritance flag for that mutex. (Alternative: <b>priority ceiling</b> protocol.)`},
{th:[['A','RUN:warn','steps aside left'],['B','RUN:warn','steps aside right… both, again']], gt:null, g:[G('Livelock',['threads','active, changing state, no progress','bad'],['example','try-lock, both fail, both back off identically, retry forever','bad'],['fix','randomised back-off, ordering, an arbiter','ok'])],
 say:`<b>Livelock</b>: two people in a corridor both step aside to the same side, again and again. Threads are running (not blocked, so deadlock detectors don't see it) but making no progress. Typical cause: try-lock and retry with identical timing. Fix with <b>random</b> back-off or a deterministic tie-breaker.`},
{th:[['writer','READY:bad','never gets the lock'],['reader1','RUN:ok',''],['reader2','RUN:ok','']], g:[G('Starvation',['one thread','indefinitely postponed while others progress','bad'],['examples','low priority under strict priority; writers under readers-preference; unfair locks','bad'],['fix','aging, fair (FIFO) locks, bounded waiting','ok'])],
 say:`<b>Starvation</b>: the system as a whole progresses, but one thread never gets its turn: a low-priority process under strict priority scheduling, a writer under a readers-preference lock, an unlucky thread on an unfair lock. Fixes: aging, fair (FIFO) locks, designs with bounded waiting.`},
{th:[], g:[G('Compare',['deadlock','blocked, no progress, waiting in a cycle'],['livelock','running, no progress'],['starvation','some progress overall, one thread never served'],['priority inversion','high waits for low, made unbounded by medium'])],
 say:`<b>Say it:</b> "In deadlock threads are blocked in a cycle; in livelock they keep running and reacting to each other without progress, fixed with randomised back-off; in starvation one thread is perpetually overlooked, fixed with aging or fair locks. Priority inversion is when a high-priority task waits for a lock held by a low-priority one that's preempted by a medium-priority task; priority inheritance fixes it by temporarily raising the lock holder's priority, as on Mars Pathfinder."`}
],
keep:[`Livelock: busy, no progress. Fix: random back-off.`,`Starvation: one thread never served. Fix: aging, fair locks.`,`Priority inversion: H waits on L, L preempted by M.`,`Fix: priority inheritance (or priority ceiling).`,`Mars Pathfinder 1997: fixed by enabling inheritance on a mutex.`]}, {
  imp: 'good',
  theory: TH(`Livelock, starvation and priority inversion are liveness failures beyond deadlock; the standard fixes are randomised back-off, fairness/aging and priority inheritance.`,
`<p>Deadlock is a traffic jam where nobody moves. Livelock is two polite people endlessly stepping aside for each other. Starvation is the shy person at the bar who never gets served while everyone else does. Priority inversion is an ambulance stuck behind a slow car, which is itself stuck behind a parade: the most urgent vehicle waits for the least urgent ones.</p>
<p>These are called <b>liveness</b> problems: something good never happens, as opposed to <b>safety</b> problems like races, where something bad happens.</p>`,
[[`Livelock`,`Threads continuously change state in response to each other without progress.`],[`Starvation`,`A thread is indefinitely denied a resource.`],[`Priority inversion`,`A higher-priority task waits for a lower-priority one.`],[`Priority inheritance`,`A lock holder temporarily inherits the highest priority of its waiters.`],[`Priority ceiling`,`A lock's holder runs at a preassigned ceiling priority.`],[`Liveness vs safety`,`"Something good eventually happens" vs "nothing bad ever happens".`]],
[`Livelock: detect retries without progress; add randomised exponential back-off.`,`Starvation: make waiting bounded (FIFO queues, aging).`,`Priority inversion: use mutexes with inheritance or ceiling protocols in real-time code.`,`Keep critical sections short so any inversion stays brief.`],
[`Ethernet's random exponential back-off is a livelock fix.`,`Linux rt_mutex and futex PI support priority inheritance (PTHREAD_PRIO_INHERIT).`,`Fair locks (ReentrantLock(true)) prevent starvation at a throughput cost.`],
[`Calling every hang a deadlock.`,`Back-off with fixed delays (livelock persists).`,`Real-time systems using plain mutexes or binary semaphores (no owner → no inheritance).`])
  ,
  examples: [
    {lv:'basic', title:'Priority inversion on a timeline', code:`t=0   L (low) locks bus_mutex; it needs 5 ms inside the lock
t=2   H (high) arrives, needs bus_mutex → blocks
t=4   M (medium) arrives: no lock needed, 6 ms of work → preempts L
t=10  M done → L runs again
t=11  L unlocks → H finally runs        (H waited 9 ms, 6 of them for M)

with priority inheritance:
t=2   L runs at H's priority, M can't preempt it
t=5   L unlocks → H runs 5–11, then M`, why:`H's wait should be bounded by L's short critical section. Medium-priority work that doesn't even touch the lock stretches it without bound.`},
    {lv:'mid', title:'Enable priority inheritance (POSIX)', code:`pthread_mutexattr_t attr;
pthread_mutexattr_init(&attr);
pthread_mutexattr_setprotocol(&attr, PTHREAD_PRIO_INHERIT);   // or PTHREAD_PRIO_PROTECT (ceiling)
pthread_mutex_t bus_mutex;
pthread_mutex_init(&bus_mutex, &attr);
// now a SCHED_FIFO thread holding bus_mutex is boosted to the priority of its highest waiter`, why:`One attribute, the same change NASA uploaded to Pathfinder (VxWorks). Binary semaphores can't do this because they have no owner to boost.`},
    {lv:'adv', title:'Livelock vs randomised back-off', code:`// livelock: both threads always wait exactly 10 ms → retry in lockstep forever
while (!acquire_both()) { release_all(); sleep_ms(10); }

// fix: randomised exponential back-off breaks the symmetry
int delay = 1;
while (!acquire_both()) {
    release_all();
    sleep_ms(rand() % delay + 1);
    delay = delay < 1024 ? delay * 2 : delay;
}`, why:`Same idea as Ethernet collisions and HTTP client retries with jitter: randomness makes repeated collisions vanishingly unlikely.`},
  ],
  tips: {
    say:`"Deadlock means threads blocked in a cycle; livelock means threads keep running and reacting to each other but make no progress, usually fixed with randomised back-off; starvation means one thread never gets a resource while others proceed, fixed with aging or fair queues. Priority inversion is when a high-priority task waits for a lock held by a low-priority task, which a medium-priority task preempts, making the wait unbounded; priority inheritance raises the holder's priority temporarily. Mars Pathfinder kept resetting because of exactly this."`,
    points:[`Distinguish the four failure modes crisply.`,`Explain the three-task inversion scenario.`,`Give the fixes.`],
    traps:[`Calling priority inversion a deadlock.`,`Suggesting fixed back-off for livelock.`],
    qa:[[`Why is the medium task the real problem in priority inversion?`,`H waiting briefly for L's short critical section is bounded and acceptable. M preempting L makes H's wait as long as M's work, which is unbounded.`],
        [`Priority inheritance vs priority ceiling?`,`Inheritance boosts the holder only when a higher-priority task actually waits; ceiling boosts the holder to the lock's preset ceiling as soon as it locks, which also prevents some deadlocks but needs priorities known in advance.`],
        [`How would you detect livelock?`,`CPU is busy but throughput is zero; logs/metrics show retries or aborts climbing; threads are RUNNABLE, not BLOCKED, in thread dumps.`]]
  },
  exercises: [
    {lv:'E', q:`Two threads repeatedly acquire, fail, release and retry in perfect sync, both at 100% CPU, with no progress. What is this? (one word)`, ans:'livelock', hint:`Not blocked.`, answer:`<p>Livelock.</p>`},
    {lv:'M', q:`Which protocol fixes priority inversion by temporarily raising the lock holder's priority to that of its highest-priority waiter? (two words)`, ans:'priority inheritance', hint:`The holder inherits.`, answer:`<p>Priority inheritance.</p>`},
    {lv:'H', q:`H (priority 1) arrives at t = 2 and needs a lock that L (priority 3) holds; L needs 2 more ms of CPU to finish its critical section. M (priority 2, no lock) arrives at t = 3 and needs 6 ms. When does L release the lock without priority inheritance, and with it? Answer like <code>10 4</code>.`, ans:'10 4', hint:`Without: L runs 2–3, then M preempts it.`, answer:`<p>Without inheritance: L runs 2–3 (1 ms left), M preempts and runs 3–9, L runs 9–10 and releases at <b>10</b>. With inheritance L runs at H's priority from t = 2, so M can't preempt it: L runs 2–4 and releases at <b>4</b>.</p>`},
  ],
  quiz: [
    [`In a livelock, threads are…`,[`Blocked`,`Running but making no progress`,`Terminated`,`Sleeping forever`],1,`Busy, no progress.`,'E'],
    [`Starvation means…`,[`No thread runs`,`A particular thread is indefinitely denied service`,`A cycle of waits`,`Out of memory`],1,`Others progress.`,'E'],
    [`Priority inversion occurs when…`,[`Priorities are reversed by the user`,`A high-priority task waits for a resource held by a lower-priority task`,`All tasks have equal priority`,`A task lowers its own priority`],1,`Made worse by medium tasks.`,'E'],
    [`Priority inheritance…`,[`Lowers H's priority`,`Temporarily raises the lock holder's priority to the waiter's`,`Kills M`,`Uses aging`],1,`Bounded waiting for H.`,'M'],
    [`A good fix for livelock is…`,[`Fixed retry delays`,`Randomised back-off`,`More threads`,`Larger quantum`],1,`Breaks symmetry.`,'M'],
    [`Aging addresses…`,[`Livelock`,`Starvation`,`Priority inheritance`,`Deadlock detection`],1,`Waiting improves priority.`,'M'],
  ],
  quizAdv: [
    [`The Mars Pathfinder resets (1997) were due to…`,[`Memory leak`,`Priority inversion on a shared bus mutex`,`Disk failure`,`Integer overflow`],1,`Fixed by enabling inheritance.`,'H'],
    [`Binary semaphores can't support priority inheritance because…`,[`They're too slow`,`They have no owner to boost`,`They can't block`,`POSIX forbids it`],1,`Use a mutex.`,'H'],
    [`Liveness properties state that…`,[`Nothing bad happens`,`Something good eventually happens`,`Data is consistent`,`Locks are fair`],1,`Deadlock/livelock/starvation violate liveness.`,'H'],
  ],
});
