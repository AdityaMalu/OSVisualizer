/* 5.2 Deadlock prevention */
topic('5', { no:'5.2', title:'Deadlock prevention: break one condition',
idea:`Prevention means designing the system so one of the four conditions can never hold. Take the deadlocking transfer code and fix it four different ways, one per condition, and weigh what each costs: lost concurrency, wasted resources, rollbacks or just a little discipline.`,
actors:'Threads', stateTitle:'Condition broken',
codes:{a:`// the deadlock: transfer(a, b) locks a then b; transfer(b, a) locks b then a

// 1. circular wait → lock in a global order
void transfer(Acct *x, Acct *y, int amt) {
    Acct *first = x->id < y->id ? x : y, *second = x->id < y->id ? y : x;
    lock(first); lock(second);   move(x, y, amt);   unlock(second); unlock(first);
}
// 2. hold and wait → take everything at once (or nothing)
lock(global_transfer_lock);  lock(x); lock(y); unlock(global_transfer_lock); …
// 3. no preemption → if you can't get the next lock, release what you hold
while (true) { lock(x); if (trylock(y)) break; unlock(x); backoff(); }
// 4. mutual exclusion → avoid exclusive locks: atomics, immutable data, one owner thread
atomic_fetch_sub(&x->bal, amt); atomic_fetch_add(&y->bal, amt);   // (if invariants allow)`},
steps:[
{hl:{fix:[4,5,6,7]}, th:[['T1','RUN:ok','transfer(a=3, b=7): locks 3 then 7'],['T2','WAITING:warn','transfer(b=7, a=3): also locks 3 first']], g:[G('Condition broken',['circular wait','all threads acquire locks in increasing id order','ok'],['cost','almost none; needs a total order on locks','ok'])],
 say:`<b>1. Break circular wait.</b> Give every lock a global order (account id, memory address) and always acquire in increasing order. Both transfers lock account 3 before 7, so T2 waits for T1 holding <i>nothing</i>, and a cycle can't form. Cheapest and most common fix.`},
{hl:{fix:[8,9]}, th:[['T1','RUN:ok','got both locks up front'],['T2','WAITING:warn','waits before holding anything']], g:[G('Condition broken',['hold and wait','request all resources before starting (or none)','ok'],['cost','must know needs in advance; holds resources longer; less concurrency','bad'])],
 say:`<b>2. Break hold-and-wait.</b> A thread must request <i>all</i> its resources at once and only proceed when it has them all, or hold none while waiting. The global lock here makes "lock x and y" atomic. Downsides: you must know your needs up front, and resources sit idle while held early. Database "conservative 2PL" works this way.`},
{hl:{fix:[10,11]}, th:[['T1','RUN:ok','holds a, got b'],['T2','RUN:warn','trylock failed: released b, backing off']], g:[G('Condition broken',['no preemption','give up held locks when you can\'t get the next one','ok'],['cost','work must be undoable; retries; risk of livelock','bad'])],
 say:`<b>3. Break no-preemption.</b> If a thread can't get the next lock, it <b>releases</b> what it holds and retries later (try-lock + back-off), or the system takes resources away and rolls the thread back. Works for things whose state can be saved and restored (CPU registers, memory pages, database transactions), not printers halfway through a page. Without random back-off, threads can <b>livelock</b>.`},
{hl:{fix:[12,13]}, th:[['T1','RUN:ok','no locks at all'],['T2','RUN:ok','no locks at all']], g:[G('Condition broken',['mutual exclusion','make the resource shareable','ok'],['how','atomics, immutable data, single owner thread + message passing, spooling'],['cost','not always possible: some things are inherently exclusive','bad'])],
 say:`<b>4. Break mutual exclusion.</b> If the resource can be shared, there's nothing to wait for: read-only data, atomic counters, immutable objects, or a single owner thread that others send messages to (actor model). Printers are made shareable by <b>spooling</b>: jobs go to a queue owned by one daemon. Often not possible: a lock exists because the data must be exclusive.`},
{th:[], g:[G('Choosing',['first choice','lock ordering (circular wait)','ok'],['when ordering is impossible','try-lock with timeout + back-off'],['high level','avoid holding locks while calling unknown code / doing I/O','ok'],['detect in tests','lockdep, ThreadSanitizer, jstack'])],
 say:`<b>Say it:</b> "Deadlock prevention ensures at least one of the four conditions can't hold. Mutual exclusion can be avoided for shareable resources; hold-and-wait by acquiring everything at once; no-preemption by releasing held resources when a request fails; circular wait by acquiring resources in a global order. Lock ordering is the most practical; the others cost concurrency, need advance knowledge, or need rollback."`}
],
keep:[`Prevention = make one Coffman condition impossible.`,`Circular wait → global lock order (best default).`,`Hold & wait → acquire all at once (needs advance knowledge).`,`No preemption → release on failure / roll back (try-lock + back-off).`,`Mutual exclusion → share: atomics, immutability, single owner, spooling.`]}, {
  imp: 'must',
  theory: TH(`Deadlock prevention removes the possibility of deadlock by guaranteeing that at least one of the four necessary conditions never holds.`,
`<p>Back at the four-way junction: you could make the junction wide enough for everyone (no mutual exclusion), forbid entering unless your whole path is clear (no hold-and-wait), let a tow truck remove a car (preemption), or add a rule like "the car on the right always goes first", which orders everyone (no circular wait).</p>
<p>Each is a real engineering choice with a price. Ordering is usually cheapest because it constrains only the order of operations, not what you can do.</p>`,
[[`Prevention`,`Design-time guarantee that one condition can't hold.`],[`Lock ordering / hierarchy`,`All threads acquire locks in a fixed global order.`],[`All-or-nothing allocation`,`Request every needed resource at once.`],[`Preemption / rollback`,`Taking resources away and undoing work.`],[`Spooling`,`Making an exclusive device shareable through a queue.`],[`Livelock`,`Threads repeatedly back off and retry without progress.`]],
[`Identify all resources a code path may hold at once.`,`Pick the condition to break.`,`For ordering: define the order (ids, addresses, lock levels) and enforce it everywhere.`,`For try-lock: release everything on failure and back off randomly.`,`Verify with tooling (lockdep, deadlock detectors, model checking).`],
[`Bank transfers ordered by account id; Linux kernel lock hierarchies documented per subsystem.`,`Actor systems (Akka, Erlang) avoid shared locks entirely.`,`tryLock(timeout) for multi-resource operations in Java.`],
[`Ordering by something unstable (hash codes can collide: need a tie-breaker lock).`,`Back-off without randomness → livelock.`,`Acquiring "all at once" but forgetting a lock taken deep in a callee.`])
  ,
  examples: [
    {lv:'basic', title:'Lock ordering by id', sim:'race', input:`# transfer(3 → 7) and transfer(7 → 3) both lock the lower id (a3) first
shared: done=0 a3=0 a7=0
T1: lock a3; lock a7; set done 1; unlock a7; unlock a3
T2: lock a3; lock a7; set done 2; unlock a7; unlock a3`, why:`No schedule can deadlock. Swap T2's locks (lock a7 first) and the explorer finds deadlocks again.`},
    {lv:'mid', title:'Java: ordering with a tie-breaker', code:`private static final Object tieLock = new Object();
void transfer(Account from, Account to, long amt) {
    int h1 = System.identityHashCode(from), h2 = System.identityHashCode(to);
    if (h1 < h2)      { synchronized (from) { synchronized (to) { move(from, to, amt); } } }
    else if (h1 > h2) { synchronized (to) { synchronized (from) { move(from, to, amt); } } }
    else synchronized (tieLock) { synchronized (from) { synchronized (to) { move(from, to, amt); } } }
}`, why:`From "Java Concurrency in Practice": when objects have no natural order, order by identity hash and break the rare tie with a third lock.`},
    {lv:'adv', title:'Try-lock with timeout', code:`boolean transfer(Account a, Account b, long amt) throws InterruptedException {
    long deadline = System.nanoTime() + 1_000_000_000L;
    while (System.nanoTime() < deadline) {
        if (a.lock.tryLock()) try {
            if (b.lock.tryLock()) try { move(a, b, amt); return true; }
            finally { b.lock.unlock(); }
        } finally { a.lock.unlock(); }
        Thread.sleep(ThreadLocalRandom.current().nextInt(1, 10));   // random back-off
    }
    return false;                                                    // give up: caller decides
}`, why:`Breaks no-preemption: never waits while holding a lock. The random sleep prevents two threads retrying in lockstep.`},
  ],
  tips: {
    say:`"Prevention means making one of the four conditions impossible. I usually break circular wait by acquiring locks in a global order, for example by account id. Alternatives: acquire all resources at once to break hold-and-wait, release held locks when a try-lock fails to break no-preemption, or avoid exclusive locks with atomics, immutability or a single owner. Each alternative costs concurrency, advance knowledge or retries."`,
    points:[`Map each technique to the condition it breaks.`,`Lock ordering as the default.`,`Costs of each.`],
    traps:[`Saying "use timeouts" without back-off (livelock).`,`Claiming mutual exclusion can always be removed.`],
    qa:[[`Why not always acquire all locks up front?`,`You often don't know which you'll need until you run; holding them early reduces concurrency and may starve others.`],
        [`What if two objects have the same order key?`,`Use a tie-breaking global lock, or a guaranteed unique key (ids, not hash codes).`],
        [`Is a timeout a prevention technique?`,`It's a form of breaking no-preemption if you release held locks on timeout and retry; a plain long timeout just converts deadlock into a slow failure.`]]
  },
  exercises: [
    {lv:'E', q:`"Always lock the account with the smaller id first" breaks which condition?`, ans:'circular wait', hint:`Can a cycle form if everyone goes up the order?`, answer:`<p>Circular wait.</p>`},
    {lv:'M', q:`A thread uses try-lock on its second lock and, on failure, releases the first and retries. Which condition is broken?`, ans:'no preemption', hint:`It gives up what it holds.`, answer:`<p>No preemption (and hold-and-wait while it waits).</p>`},
    {lv:'H', q:`With ordering in place, can this deadlock? (yes/no)`, sim:'race', key:'deadlock', input:`shared: x=0 A=0 B=0 C=0
T1: lock A; lock B; unlock B; unlock A
T2: lock B; lock C; unlock C; unlock B
T3: lock A; lock C; unlock C; unlock A`, hint:`Everyone acquires in A < B < C order.`, answer:`<p>No: all acquire in increasing order, so no cycle.</p>`},
  ],
  quiz: [
    [`Global lock ordering prevents deadlock by breaking…`,[`Mutual exclusion`,`Hold and wait`,`No preemption`,`Circular wait`],3,`No cycle possible.`,'E'],
    [`Requesting all resources at once breaks…`,[`Circular wait`,`Hold and wait`,`Mutual exclusion`,`Preemption`],1,`Never hold while waiting.`,'E'],
    [`Spooling a printer breaks…`,[`Mutual exclusion (from the clients' view)`,`Circular wait`,`No preemption`,`Starvation`],0,`Clients share the spool queue.`,'M'],
    [`Releasing held locks when a request fails breaks…`,[`No preemption`,`Mutual exclusion`,`Circular wait`,`Bounded waiting`],0,`Voluntary preemption.`,'E'],
    [`A drawback of all-at-once allocation is…`,[`Deadlocks`,`Low utilisation and needing to know needs in advance`,`Livelock`,`Race conditions`],1,`Resources idle while held early.`,'M'],
    [`Try-lock + immediate retry by all threads risks…`,[`Deadlock`,`Livelock`,`Data races`,`Page faults`],1,`Add random back-off.`,'M'],
  ],
  quizAdv: [
    [`Ordering locks by System.identityHashCode needs…`,[`Nothing else`,`A tie-breaking lock for equal hashes`,`Reentrant locks`,`Spinlocks`],1,`Hashes can collide.`,'H'],
    [`Conservative two-phase locking in databases prevents deadlock by…`,[`Ordering`,`Acquiring all locks before starting`,`Timeouts`,`Preemption`],1,`Hold-and-wait broken.`,'H'],
    [`Which resource is easiest to preempt?`,[`A printer mid-job`,`CPU (save/restore registers)`,`A mutex in mid-update`,`A tape drive`],1,`State can be saved.`,'H'],
  ],
});
