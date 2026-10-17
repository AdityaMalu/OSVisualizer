/* 4.1 Race conditions and critical sections */
topic('4', { no:'4.1', title:'Race conditions and the critical-section problem',
idea:`<code>count++</code> looks like one step but is three machine instructions: load, add, store. Interleave two threads instruction by instruction and watch an update vanish. Then state the three requirements any fix must meet: mutual exclusion, progress and bounded waiting.`,
actors:'Threads', tbTitle:'Memory and registers', stateTitle:'Critical-section requirements',
codes:{a:`int count = 5;                  // shared

// thread A: count++            // thread B: count++
load  r1, count                 load  r2, count
add   r1, 1                     add   r2, 1
store count, r1                 store count, r2

// general shape of a solution
while (true) {
    entry section               // ask permission (lock)
        critical section        // touch shared data
    exit section                // release (unlock)
    remainder section
}`},
steps:[
{hl:{A:[4]}, th:[['A','RUN:ok','r1 = 5'],['B','READY:info','']], tb:[TB('state',['where','value'],[['count (memory)','5'],['A.r1','5'],['B.r2','—']],{1:'new'})], g:[G('Critical-section requirements',['race condition','outcome depends on the interleaving','bad'])],
 say:`<code>count</code> is 5 and both threads want to increment it. In machine code <code>count++</code> is three steps: <b>load</b> into a register, <b>add</b> 1, <b>store</b> back. Thread A loads 5 into its register r1.`},
{hl:{B:[4]}, th:[['A','READY:info','preempted after load'],['B','RUN:ok','r2 = 5']], tb:[TB('state',['where','value'],[['count (memory)','5'],['A.r1','5'],['B.r2','5']],{2:'new'})], log:['context switch A → B'],
 say:`A timer interrupt switches to B <i>before</i> A stores. B also loads <code>count</code>: still 5, because A's new value exists only in A's register. Each thread has its own registers (saved in its PCB on a switch).`},
{hl:{B:[5,6]}, th:[['A','READY:info',''],['B','RUN:ok','stores 6']], tb:[TB('state',['where','value'],[['count (memory)','6'],['A.r1','5'],['B.r2','6']],{0:'hot'})],
 say:`B adds 1 and stores: count = 6. So far fine.`},
{hl:{A:[5,6]}, th:[['A','RUN:ok','stores 6 (stale)'],['B','TERM:dim','done']], tb:[TB('state',['where','value'],[['count (memory)','6  (should be 7)'],['A.r1','6'],['B.r2','6']],{0:'bad'})], log:['context switch B → A','A stores 6: B\'s update is lost'],
 say:`A resumes from where it was: adds 1 to its stale 5 and stores 6. Two increments ran, but count went from 5 to 6. B's update was <b>lost</b>. This is a <b>race condition</b>: the result depends on the exact timing of the interleaving, which is why such bugs appear rarely, under load, and disappear in the debugger.`},
{hl:{gen:[9,10,11,12,13,14]}, th:[], tb:[], g:[G('Critical-section requirements',['1. mutual exclusion','at most one thread in its critical section at a time','hot'],['2. progress','if none is inside, one of those wanting in gets in (no needless blocking)','hot'],['3. bounded waiting','a limit on how many times others can enter before you (no starvation)','hot']),G('Assumptions',['no assumptions about speed','or the number of CPUs'])],
 say:`The code that touches shared data is a <b>critical section</b>. A correct protocol (entry and exit sections around it) must guarantee <b>mutual exclusion</b> (one at a time), <b>progress</b> (if nobody's inside, someone who wants in gets in; outsiders can't block it) and <b>bounded waiting</b> (nobody waits forever), without assuming anything about thread speeds.`},
{g:[G('Where races hide',['x++, x += n','read-modify-write','bad'],['check-then-act','if (!map.contains(k)) map.put(k, v)','bad'],['lazy init','if (inst == null) inst = new …','bad'],['iterating while another thread modifies','ConcurrentModificationException','bad']),G('Tools (next topics)',['atomics','CAS, fetch-and-add'],['locks','mutex, spinlock'],['semaphores, monitors','condition variables'])],
 say:`<b>Say it:</b> "A race condition is when the result depends on the interleaving of threads accessing shared data, like two threads doing count++ as load-add-store and losing an update. The code accessing shared state is the critical section, and a solution must give mutual exclusion, progress and bounded waiting. Common race shapes are read-modify-write and check-then-act; fixes are atomics, locks, semaphores or monitors."`}
],
keep:[`count++ = load, add, store: not atomic.`,`Race condition: result depends on timing of the interleaving.`,`Critical section: code touching shared data.`,`Requirements: mutual exclusion, progress, bounded waiting.`,`Watch for read-modify-write and check-then-act.`]}, {
  imp: 'must',
  theory: TH(`A race condition happens when threads access shared data without coordination and the outcome depends on their interleaving; critical sections must be protected so only one thread runs them at a time.`,
`<p>Two people share a bank account with £100. Both check the balance on their phones at the same moment, see £100, and each withdraws £80. Each "check then withdraw" was fine alone; interleaved, the account goes negative. The check and the withdrawal needed to happen as one indivisible step.</p>
<p>Races are hard because they're nondeterministic: the bad interleaving might happen once in a million runs, only on a busy machine, and vanish when you add a print statement. That's why we reason about all possible interleavings instead of testing a few.</p>`,
[[`Race condition`,`Outcome depends on the relative timing of threads.`],[`Critical section`,`Code that accesses shared mutable state.`],[`Atomic operation`,`Executes as one indivisible step.`],[`Mutual exclusion`,`At most one thread in the critical section.`],[`Progress`,`If none is inside, the choice of who enters can't be postponed forever.`],[`Bounded waiting`,`Limit on how often others can enter ahead of a waiting thread.`],[`Data race`,`Unsynchronised concurrent accesses where at least one is a write (undefined behaviour in C/C++).`]],
[`Identify shared mutable data.`,`Find every code path that reads and writes it: those are critical sections.`,`Wrap them with an entry protocol (acquire) and an exit protocol (release).`,`Check the three requirements, for all interleavings.`],
[`Counters, caches, connection pools and "if absent then create" logic in servers.`,`Java's ConcurrentHashMap.computeIfAbsent and AtomicLong exist to make check-then-act and read-modify-write atomic.`,`ThreadSanitizer and Java's jcstress help find races.`],
[`Believing x++ or i += 1 is atomic.`,`Protecting writes but not reads.`,`Using different locks for the same data.`,`Assuming a single-core machine can't race (preemption still interleaves).`])
  ,
  examples: [
    {lv:'basic', title:'Every interleaving of two increments', sim:'race', input:`shared: count=5
A: load r count; add r 1; store count r
B: load r count; add r 1; store count r`, why:`Of the 20 possible interleavings, some end with 7 (correct) and some with 6 (lost update). Add <code>schedule: A B B B A A</code> to trace the walkthrough's interleaving.`},
    {lv:'mid', title:'Three threads: more ways to lose', sim:'race', input:`shared: count=0
A: load r count; add r 1; store count r
B: load r count; add r 1; store count r
C: load r count; add r 1; store count r`, why:`Final values 1, 2 or 3 are all possible. With more threads and more increments, the expected loss grows. Most interleavings are still correct, which is why races slip through tests.`},
    {lv:'adv', title:'Check-then-act (lazy initialisation)', code:`// Java: two threads may both see null and create two instances
class Config {
    private static Config inst;
    static Config get() {
        if (inst == null)            // check
            inst = new Config();     // act: another thread can slip in between
        return inst;
    }
}
// fixes: synchronized get(), an eager static final field,
// or the holder idiom: class Holder { static final Config I = new Config(); }`, why:`Not every race is arithmetic. Any decision based on shared state that can change before you act on it is a race.`},
  ],
  tips: {
    say:`"A race condition is when the correctness of a result depends on how threads interleave. count++ is a load, an add and a store, so two threads can both load the old value and one update is lost. The code that touches shared state is the critical section; a correct solution must ensure mutual exclusion, progress and bounded waiting, regardless of thread speeds."`,
    points:[`Show the load/add/store interleaving.`,`Name the three requirements.`,`Mention check-then-act as another race shape.`],
    traps:[`Saying races only happen on multicore.`,`Saying volatile fixes count++.`],
    qa:[[`Does volatile make count++ safe in Java?`,`No. volatile guarantees visibility and ordering, not atomicity. Use AtomicInteger.incrementAndGet or a lock.`],
        [`Can a race happen on a single core?`,`Yes: preemption can switch threads between the load and the store.`],
        [`What's the difference between a race condition and a data race?`,`A data race is unsynchronised concurrent access with a write (a memory-model concept). A race condition is a logic bug about timing; you can have one without a data race (e.g. check-then-act with atomic but separate operations).`]]
  },
  exercises: [
    {lv:'E', q:`Two threads each do count++ once, starting from 0, with no synchronisation. Which final values are possible? Answer like <code>1 2</code>.`, sim:'race', key:'values', input:`shared: count=0
A: load r count; add r 1; store count r
B: load r count; add r 1; store count r`, hint:`Can both load 0?`, answer:`<p>1 or 2.</p>`},
    {lv:'M', q:`Trace this schedule. What is count at the end?`, sim:'race', key:'final.count', input:`shared: count=10
A: load r count; add r 5; store count r
B: load r count; sub r 3; store count r
schedule: A B A B B A`, hint:`Both load 10 before anyone stores.`, answer:`<p>A loads 10, B loads 10, A computes 15, B computes 7, B stores 7, A stores 15. Final 15 (B's −3 is lost).</p>`},
    {lv:'H', q:`Thread A runs <code>x = 1; y = x + 1</code>, thread B runs <code>x = 2</code>. Model it and give all possible final values of y.`, sim:'race', key:'values', input:`shared: y=0 x=0
A: set x 1; load r x; add r 1; store y r
B: set x 2`, hint:`B's write can land before or after A's load.`, answer:`<p>y can be 2 (B before A's set, or after A's load) or 3 (B between A's set and A's load).</p>`},
  ],
  quiz: [
    [`A race condition occurs when…`,[`Threads run too fast`,`The result depends on the timing/interleaving of threads`,`A thread deadlocks`,`The CPU overheats`],1,`Nondeterministic outcome.`,'E'],
    [`count++ in C compiles to roughly…`,[`One atomic instruction`,`Load, add, store`,`A system call`,`A lock`],1,`Read-modify-write.`,'E'],
    [`A critical section is…`,[`A kernel function`,`Code that accesses shared data`,`A crash handler`,`A CPU mode`],1,`Must be protected.`,'E'],
    [`Which is NOT a critical-section requirement?`,[`Mutual exclusion`,`Progress`,`Bounded waiting`,`Highest throughput`],3,`Throughput is nice, not required.`,'M'],
    [`Bounded waiting prevents…`,[`Deadlock only`,`Starvation of a waiting thread`,`Context switches`,`Page faults`],1,`Limit on bypasses.`,'M'],
    [`Can a race occur on a single-core CPU?`,[`No`,`Yes, via preemption between instructions`,`Only with SMT`,`Only in the kernel`],1,`Interleaving needs no parallelism.`,'M'],
  ],
  quizAdv: [
    [`In Java, volatile int count; count++ is…`,[`Atomic`,`Still a race (visibility, not atomicity)`,`A compile error`,`Locked automatically`],1,`Use AtomicInteger.`,'H'],
    [`A data race in C/C++ is…`,[`A performance issue only`,`Undefined behaviour`,`Always harmless for ints`,`Detected by the compiler`],1,`The compiler may assume none exist.`,'H'],
    [`if (!map.containsKey(k)) map.put(k, v) on a shared map is an example of…`,[`Deadlock`,`Check-then-act race`,`Priority inversion`,`Livelock`],1,`Use putIfAbsent / computeIfAbsent.`,'H'],
  ],
});
