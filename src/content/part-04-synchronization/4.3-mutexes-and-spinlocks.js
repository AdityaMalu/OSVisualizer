/* 4.3 Mutexes and spinlocks */
topic('4', { no:'4.3', title:'Mutex locks and spinlocks',
idea:`A lock turns a critical section into "one thread at a time". Protect the racy counter with a mutex and see every interleaving now give the right answer. Then compare the two ways to wait for a held lock: spinning on the CPU or sleeping in the kernel.`,
actors:'Threads', tbTitle:'Lock state', stateTitle:'Spin vs sleep',
codes:{a:`pthread_mutex_t m = PTHREAD_MUTEX_INITIALIZER;
int count = 0;

void *worker(void *_) {
    pthread_mutex_lock(&m);       // acquire: blocks if another thread holds m
    count++;                      // critical section
    pthread_mutex_unlock(&m);     // release: wake one waiter
    return NULL;
}

// a spinlock: wait by looping instead of sleeping
void spin_lock(atomic_bool *l)   { while (atomic_exchange(l, true)) ; }
void spin_unlock(atomic_bool *l) { atomic_store(l, false); }`},
steps:[
{hl:{A:[5,6]}, th:[['A','RUN:ok','holds m'],['B','READY:info','']], tb:[TB('lock m',['field','value'],[['owner','A'],['waiters','—']],{0:'new'})], g:[G('Spin vs sleep',['mutex','only the owner may unlock'])],
 say:`A calls <code>pthread_mutex_lock</code>. The mutex is free, so A becomes its <b>owner</b> (an atomic CAS from 0 to 1 in user space; no system call needed when uncontended) and enters the critical section.`},
{hl:{B:[5]}, th:[['A','RUN:ok','in critical section'],['B','BLOCKED:warn','sleeps in the kernel (futex wait)']], tb:[TB('lock m',['field','value'],[['owner','A'],['waiters','B']],{1:'hot'})], log:['B: lock(m) contended → futex(WAIT)'],
 say:`B tries to lock the same mutex. It's held, so B can't enter. A mutex makes B <b>sleep</b>: on Linux, after a brief spin, it calls <code>futex(FUTEX_WAIT)</code> and the kernel moves B to a wait queue. B uses no CPU while it waits.`},
{hl:{A:[7], B:[6]}, th:[['A','RUN:ok','unlocked'],['B','RUN:ok','woken, now owns m']], tb:[TB('lock m',['field','value'],[['owner','B'],['waiters','—']],{0:'ok'})], log:['A: unlock → futex(WAKE) B'],
 say:`A increments and unlocks. Since someone is waiting, unlock calls <code>futex(FUTEX_WAKE)</code>; B becomes ready, acquires the lock and increments. The increments are now <b>serialised</b>: count is always 2. The explorer below proves it over every interleaving.`},
{hl:{spin:[12]}, th:[['A','RUN:ok','holds spinlock (core 0)'],['B','RUN:warn','spinning on core 1 (100% CPU)']], tb:[TB('spinlock',['field','value'],[['locked','true (A)'],['B','looping: exchange → true, retry …']],{1:'hot'})], g:[G('Spinlock',['wait','busy loop on an atomic exchange','hot'],['good when','hold time < cost of sleeping + waking (a few µs), multicore','ok'],['bad when','holder is descheduled or holds for long: burns CPU','bad'],['single core','pointless: the holder can\'t run while you spin','bad'])],
 say:`A <b>spinlock</b> waits differently: B loops on an atomic exchange, burning its core until the lock frees. That sounds wasteful, but if the lock is held for a few hundred nanoseconds, spinning beats the microseconds a sleep + wake costs. The kernel uses spinlocks for short sections, and never sleeps while holding one.`},
{tb:[], th:[], g:[G('Spin vs sleep',['spinlock','no context switch; wastes CPU while waiting'],['mutex (sleeping)','no CPU while waiting; switch cost'],['adaptive / futex mutex','spin briefly, then sleep','ok']),G('Lock hygiene',['keep critical sections short','ok'],['never block (I/O) while holding a spinlock','bad'],['always unlock on every path','try/finally, RAII lock_guard','ok'],['one lock per piece of shared data','document it'])],
 say:`Modern mutexes are <b>adaptive</b>: spin a little in case the owner releases soon, then sleep. Whatever lock you use: keep critical sections short, release on every path (exceptions!), and know exactly which lock protects which data.`},
{g:[G('Remember',['mutex','mutual exclusion; owner unlocks; waiters sleep'],['spinlock','waiters busy-wait; for very short holds on multicore'],['cost','uncontended lock ≈ tens of ns; contention is what hurts'])],
 say:`<b>Say it:</b> "A mutex enforces mutual exclusion: lock before the critical section, unlock after; only the owner can unlock, and a thread that finds it held sleeps until woken. A spinlock instead busy-waits on an atomic test-and-set or exchange, which avoids a context switch and is good for very short critical sections on multicore, but wastes CPU otherwise. Real mutexes like Linux futexes spin briefly and then sleep."`}
],
keep:[`Mutex: lock → critical section → unlock; waiters sleep.`,`Spinlock: waiters loop on an atomic; no context switch.`,`Spin when holds are very short and you're on multicore; otherwise sleep.`,`Futex: fast user-space path, kernel only on contention.`,`Short critical sections; unlock on every path.`]}, {
  imp: 'must',
  theory: TH(`A lock guarantees that only one thread at a time runs a critical section; spinlocks wait by busy-looping, mutexes by sleeping, and practical locks combine both.`,
`<p>A single-occupancy bathroom with a lock: whoever's inside holds the lock. Someone arriving can either keep trying the handle every second (spinning) or sit down and ask to be called when it's free (sleeping). If the occupant will be out in two seconds, trying the handle is fine; if it'll be twenty minutes, sit down.</p>
<p>Locks are built from atomic instructions (previous topic). The kernel's job is only to provide efficient sleeping and waking, which is why uncontended locks never enter the kernel at all.</p>`,
[[`Mutex`,`Mutual-exclusion lock; waiters block (sleep).`],[`Spinlock`,`Lock whose waiters busy-wait.`],[`Futex`,`Linux "fast user-space mutex": CAS in user space, syscall only on contention.`],[`Owner`,`The thread holding the mutex; only it may unlock.`],[`Contention`,`Several threads competing for the same lock.`],[`Recursive (reentrant) lock`,`Can be re-acquired by its owner (Java synchronized, ReentrantLock).`],[`Lock granularity`,`How much data one lock protects (coarse vs fine).`]],
[`Acquire: atomically change the lock word from free to taken.`,`If that fails: spin a little, then ask the kernel to sleep until the word changes.`,`Run the critical section.`,`Release: mark free; if there are waiters, wake one.`],
[`Java synchronized and ReentrantLock; C++ std::mutex with lock_guard; Go sync.Mutex.`,`Lock contention shows up as threads in BLOCKED/WAITING state in thread dumps.`,`Fine-grained locking (per bucket) or lock striping improves scalability.`],
[`Forgetting to unlock on an error path.`,`Holding a lock during I/O or a network call.`,`Spinlocks on a single core.`,`One giant lock that serialises everything.`])
  ,
  examples: [
    {lv:'basic', title:'With a lock, only the right answer survives', sim:'race', input:`shared: count=0 m=0
A: lock m; load r count; add r 1; store count r; unlock m
B: lock m; load r count; add r 1; store count r; unlock m`, why:`The explorer finds only count=2. Delete the lock/unlock steps from B (an "I forgot to lock" bug) and run again: the lost update is back, because a lock only works if <i>everyone</i> uses it.`},
    {lv:'mid', title:'Unlock on every path', code:`// Java
lock.lock();
try {
    balance -= amount;
    if (balance < 0) throw new InsufficientFunds();   // still unlocks
} finally {
    lock.unlock();
}
// C++: RAII guard unlocks in its destructor
{ std::lock_guard<std::mutex> g(m); balance -= amount; }`, why:`An exception between lock and unlock would otherwise leave the lock held forever, deadlocking every later caller.`},
    {lv:'adv', title:'Contention, measured', code:`$ perf stat -e syscalls:sys_enter_futex ./bench-one-lock
   2,481,920  syscalls:sys_enter_futex          # threads constantly sleeping/waking
$ perf stat -e syscalls:sys_enter_futex ./bench-striped   # 64 locks, one per bucket
       3,118  syscalls:sys_enter_futex`, why:`Uncontended futex locks never make a syscall. A flood of futex calls means contention; splitting one hot lock into many (lock striping) removes it.`},
  ],
  tips: {
    say:`"A mutex provides mutual exclusion: lock before a critical section and unlock after, and a thread that finds it held sleeps until it's released. A spinlock busy-waits instead, which avoids context switches and suits very short critical sections on multicore, but wastes CPU when held long. Linux mutexes are futex-based: an atomic in user space when uncontended, spin briefly, then sleep in the kernel."`,
    points:[`Mutex vs spinlock and when to use each.`,`Futex fast path.`,`Lock hygiene: short sections, always unlock.`],
    traps:[`Spinlocks on uniprocessors.`,`Holding locks across I/O.`],
    qa:[[`Why is a spinlock pointless on a single core?`,`While you spin, the holder can't run to release it; you waste your whole time slice.`],
        [`What's a reentrant lock?`,`One its owner can acquire again without deadlocking itself, keeping a hold count; Java synchronized is reentrant.`],
        [`How do you reduce lock contention?`,`Shorter critical sections, finer-grained or striped locks, read-write locks for read-heavy data, lock-free/atomic structures, or per-thread data merged later.`]]
  },
  exercises: [
    {lv:'E', q:`Both threads lock m around count++. What final values of count are possible? (space separated)`, sim:'race', key:'values', input:`shared: count=0 m=0
A: lock m; load r count; add r 1; store count r; unlock m
B: lock m; load r count; add r 1; store count r; unlock m`, hint:`The lock serialises them.`, answer:`<p>Only 2.</p>`},
    {lv:'M', q:`A locks around count++ but B doesn't. Which final values are possible now?`, sim:'race', key:'values', input:`shared: count=0 m=0
A: lock m; load r count; add r 1; store count r; unlock m
B: load r count; add r 1; store count r`, hint:`A lock doesn't stop a thread that ignores it.`, answer:`<p>1 or 2: B can interleave freely.</p>`},
    {lv:'H', q:`A lock is held for 200 ns on average. Sleeping and waking costs 5 µs. On a 16-core server, spin or sleep? Explain.`, hint:`Compare costs.`, answer:`<p>Spin (or adaptive: spin briefly first). Waiting ~200 ns spinning is far cheaper than a 5 µs sleep/wake, and other cores keep running. If hold times were milliseconds or the holder could be preempted often, sleep.</p>`},
  ],
  quiz: [
    [`A mutex guarantees…`,[`Speed`,`Only one thread in the critical section at a time`,`No context switches`,`Fair scheduling`],1,`Mutual exclusion.`,'E'],
    [`A spinlock's waiter…`,[`Sleeps`,`Busy-waits in a loop`,`Is killed`,`Moves to another core`],1,`Burns CPU.`,'E'],
    [`Spinlocks are a good choice when…`,[`Critical sections are long`,`Holds are very short and there are multiple cores`,`On a single core`,`While doing disk I/O`],1,`Spin < sleep cost.`,'M'],
    [`An uncontended futex lock…`,[`Always makes a syscall`,`Needs no syscall (atomic in user space)`,`Sleeps`,`Spins forever`],1,`Kernel only on contention.`,'M'],
    [`Who may unlock a mutex?`,[`Any thread`,`Its owner`,`The kernel only`,`The last waiter`],1,`Ownership.`,'E'],
    [`Why use try/finally around a lock?`,[`Speed`,`To release it even if an exception is thrown`,`Required by the compiler`,`To make it reentrant`],1,`Avoid leaked locks.`,'M'],
  ],
  quizAdv: [
    [`The Linux kernel must not do what while holding a spinlock?`,[`Read a variable`,`Sleep (block)`,`Increment a counter`,`Return`],1,`Others would spin indefinitely.`,'H'],
    [`Lock striping means…`,[`One global lock`,`Several locks each covering part of the data`,`Spinning in stripes`,`Using CAS`],1,`Less contention.`,'H'],
    [`An adaptive mutex…`,[`Changes its owner`,`Spins briefly, then sleeps`,`Never sleeps`,`Uses interrupts`],1,`Best of both.`,'H'],
  ],
});
