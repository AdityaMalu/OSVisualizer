/* 4.2 Peterson's algorithm and hardware atomics */
topic('4', { no:'4.2', title:'Peterson\'s algorithm and hardware atomics (TAS, CAS)',
idea:`Can two threads achieve mutual exclusion with nothing but ordinary loads and stores? Peterson's algorithm says yes, in theory. Step through it, see why it breaks on modern CPUs that reorder memory, and how atomic instructions like test-and-set and compare-and-swap solve the problem in hardware.`,
actors:'Threads', tbTitle:'Shared variables', stateTitle:'Why it works',
codes:{a:`// Peterson's algorithm for threads 0 and 1 (i = me, j = other)
bool flag[2] = {false, false};
int  turn;

flag[i] = true;                 // I want to enter
turn = j;                       // but you go first if you also want to
while (flag[j] && turn == j)    // wait while you want in AND it's your turn
    ;                           // busy-wait
/* critical section */
flag[i] = false;                // done

// hardware atomics: one indivisible read-modify-write
bool test_and_set(bool *p) { bool old = *p; *p = true; return old; }
bool cas(int *p, int expect, int new_) { if (*p != expect) return false; *p = new_; return true; }`},
steps:[
{hl:{T0:[5,6]}, th:[['T0','RUN:ok','flag[0] = true, turn = 1'],['T1','READY:info','']], tb:[TB('shared',['variable','value'],[['flag[0]','true'],['flag[1]','false'],['turn','1']],{0:'new',2:'new'})], g:[G('Why it works',['flag','"I want in"'],['turn','"who yields"'])],
 say:`Two shared variables: <code>flag[i]</code> says "thread i wants to enter", <code>turn</code> says whose turn it is to <i>yield</i>. T0 raises its flag and politely sets <code>turn = 1</code>: "if you want in too, go first".`},
{hl:{T0:[7,9]}, th:[['T0','RUN:ok','flag[1] false → enters'],['T1','READY:info','']], tb:[TB('shared',['variable','value'],[['flag[0]','true'],['flag[1]','false'],['turn','1']])],
 say:`T0 checks: does T1 want in (<code>flag[1]</code>) and is it T1's turn? <code>flag[1]</code> is false, so the loop exits immediately and T0 enters its critical section.`},
{hl:{T1:[5,6,7,8]}, th:[['T0','RUN:ok','in critical section'],['T1','WAITING:warn','spins: flag[0] && turn == 0']], tb:[TB('shared',['variable','value'],[['flag[0]','true'],['flag[1]','true'],['turn','0']],{1:'new',2:'hot'})],
 say:`Now T1 arrives: <code>flag[1] = true</code>, <code>turn = 0</code>. Its loop condition is <code>flag[0] &amp;&amp; turn == 0</code>: both true, so T1 <b>spins</b>. Mutual exclusion holds.`},
{hl:{T0:[10], T1:[9]}, th:[['T0','RUN:ok','left, flag[0] = false'],['T1','RUN:ok','loop exits → enters']], tb:[TB('shared',['variable','value'],[['flag[0]','false'],['flag[1]','true'],['turn','0']],{0:'ok'})], g:[G('Why it works',['mutual exclusion','turn can only be one value: whoever wrote it last waits','ok'],['progress','a thread not wanting in has flag = false and never blocks the other','ok'],['bounded waiting','after T0 leaves, T1 enters before T0 can re-enter','ok'])],
 say:`T0 leaves and lowers its flag; T1's condition becomes false and it enters. If both had arrived simultaneously, both write <code>turn</code>, and whoever wrote it <b>last</b> waits: only one value survives. Peterson's satisfies mutual exclusion, progress and bounded waiting, using only loads and stores.`},
{th:[['T0','RUN:bad','in critical section'],['T1','RUN:bad','also in critical section!']], tb:[TB('what each core saw (store buffers)',['core','its own write','what it read'],[['core 0','flag[0] = true (still in store buffer)','flag[1] = false'],['core 1','flag[1] = true (still in store buffer)','flag[0] = false']],{0:'bad',1:'bad'})], g:[G('Modern hardware',['CPUs and compilers reorder','a later load may pass an earlier store','bad'],['result','both see the other\'s flag as false → both enter','bad'],['fix','memory fences, or just use atomics'])],
 say:`On real multicore CPUs Peterson's <b>breaks</b>. Each core has a store buffer: T0's write to <code>flag[0]</code> may not be visible yet when it reads <code>flag[1]</code>, and vice versa. Both read false and both enter. Compilers can also reorder these accesses. It works only with memory <b>fences</b> (or C11 seq_cst atomics) forcing order.`},
{hl:{hw:[13,14]}, th:[], tb:[TB('test-and-set spinlock',['step','lock','who'],[['A: TAS(lock) returns false','true','A enters'],['B: TAS(lock) returns true','true','B spins'],['A: lock = false','false','A leaves'],['B: TAS(lock) returns false','true','B enters']],{0:'ok',3:'ok'})], g:[G('Hardware atomics',['test-and-set','x86 XCHG'],['compare-and-swap','x86 LOCK CMPXCHG, ARM LDXR/STXR'],['fetch-and-add','x86 LOCK XADD'],['property','read + write as ONE indivisible step, visible to all cores','ok'])],
 say:`Hardware gives us <b>atomic</b> read-modify-write instructions. <b>Test-and-set</b> sets a flag to true and returns the old value in one indivisible step, so exactly one thread sees "false" and wins. <b>Compare-and-swap</b> writes a new value only if the current value is what you expected. These are the building blocks of every lock and lock-free data structure.`},
{tb:[], g:[G('Remember',['Peterson','2 threads, loads/stores only; correct in theory, needs fences in practice'],['TAS/CAS','atomic RMW instructions: the real foundation'],['spin with TAS','simple spinlock (next topic)'])],
 say:`<b>Say it:</b> "Peterson's algorithm solves two-thread mutual exclusion with two flags and a turn variable: each thread raises its flag, gives the turn away, and waits while the other wants in and has the turn. It meets all three requirements, but on modern hardware loads and stores can be reordered, so it needs memory fences. In practice we use atomic instructions like test-and-set and compare-and-swap, which read and write a location as one indivisible step."`}
],
keep:[`Peterson: flag[i] = true; turn = j; while (flag[j] && turn == j);`,`Meets mutual exclusion, progress, bounded waiting (2 threads).`,`Breaks on modern CPUs without fences (store buffers, reordering).`,`TAS: set true, return old, atomically. CAS: swap only if unchanged.`,`Locks and lock-free structures are built on atomic RMW.`]}, {
  imp: 'good',
  theory: TH(`Mutual exclusion can be built from plain loads and stores (Peterson's algorithm) in theory, but real systems rely on atomic hardware instructions such as test-and-set and compare-and-swap.`,
`<p>Two people at a narrow door: each says "I'd like to go through" (flag) and "but after you" (turn). If both say it, the last person to say "after you" waits. That's Peterson's algorithm.</p>
<p>The catch is that modern CPUs don't execute memory operations in program order as seen by other cores. Atomic instructions sidestep this: the hardware guarantees that the read and write happen as a single step that all cores agree on.</p>`,
[[`Peterson's algorithm`,`Two-thread mutual exclusion with flags and a turn variable.`],[`Busy waiting / spinning`,`Looping until a condition changes.`],[`Memory reordering`,`CPU or compiler executing memory operations out of program order.`],[`Memory fence / barrier`,`Instruction preventing reordering across it.`],[`Test-and-set (TAS)`,`Atomically set to true and return the old value.`],[`Compare-and-swap (CAS)`,`Atomically replace a value only if it equals the expected one.`],[`Fetch-and-add`,`Atomically add and return the old value.`]],
[`Peterson: set own flag, set turn to the other, wait while the other's flag is set and it's their turn.`,`Exit: clear own flag.`,`Hardware atomics: the CPU locks the cache line during the read-modify-write so no other core can interleave.`,`A spinlock loops on TAS/CAS until it succeeds.`],
[`Java's AtomicInteger, C++ std::atomic, C11 stdatomic all compile to CAS / fetch-and-add.`,`Lock-free queues and counters in high-performance systems are CAS loops.`,`Peterson's appears in exams and as a model-checking example, rarely in production.`],
[`Implementing Peterson's in C/Java without volatile/atomics/fences.`,`Assuming plain stores are seen in order by other cores.`,`Forgetting the ABA problem with CAS on pointers.`])
  ,
  examples: [
    {lv:'basic', title:'An atomic counter (no lock)', code:`#include <stdatomic.h>
atomic_int hits = 0;
void *worker(void *_) {
    for (int i = 0; i < 1000000; i++)
        atomic_fetch_add(&hits, 1);       // LOCK XADD on x86: indivisible
    return NULL;
}
// two threads → hits == 2000000 every time`, why:`<code>atomic_fetch_add</code> makes the read-modify-write indivisible. With a plain <code>int</code>, the result would usually be well below 2,000,000.`},
    {lv:'mid', title:'A CAS retry loop', code:`// atomically: x = max(x, v)
void atomic_max(atomic_int *x, int v) {
    int cur = atomic_load(x);
    while (cur < v && !atomic_compare_exchange_weak(x, &cur, v))
        ;   // failed: someone changed x; cur now holds the new value, retry
}`, why:`The CAS pattern: read, compute, try to install; if someone else changed the value meanwhile, retry with the fresh value. No thread ever blocks.`},
    {lv:'adv', title:'Peterson needs sequential consistency', code:`// C11: with memory_order_seq_cst (the default for atomic_store/load) it is correct
atomic_bool flag[2]; atomic_int turn;
void lock(int i) {
    int j = 1 - i;
    atomic_store(&flag[i], true);
    atomic_store(&turn, j);
    while (atomic_load(&flag[j]) && atomic_load(&turn) == j) ;
}
// with plain bool/int (or relaxed atomics) the store→load reordering breaks it`, why:`Sequentially consistent atomics insert the fences (e.g. MFENCE on x86) that stop a later load from overtaking an earlier store.`},
  ],
  tips: {
    say:`"Peterson's algorithm gives two threads mutual exclusion with a flag per thread and a shared turn: I set my flag, give you the turn, and wait while you want in and it's your turn. It satisfies mutual exclusion, progress and bounded waiting, but needs fences on modern hardware because loads can be reordered before stores. Real locks are built on atomic instructions: test-and-set, compare-and-swap, fetch-and-add."`,
    points:[`Write the three lines of Peterson's entry.`,`Explain why it fails without fences.`,`Define TAS and CAS.`],
    traps:[`Claiming Peterson's works as-is on x86.`,`Saying CAS blocks.`],
    qa:[[`What is the ABA problem?`,`With CAS on a pointer, a value can change A → B → A between your read and your CAS; the CAS succeeds although the structure changed. Fix with tagged pointers/version counters or hazard pointers.`],
        [`Why does x86 need a fence for Peterson's?`,`x86 allows a load to be reordered before an earlier store to a different address (store buffer forwarding). That's exactly Peterson's write-flag-then-read-other-flag pattern.`],
        [`TAS vs CAS?`,`TAS only sets a fixed value; CAS conditionally installs any value, which makes it universal for building lock-free structures.`]]
  },
  exercises: [
    {lv:'E', q:`In Peterson's algorithm, both threads set turn at nearly the same moment; T1 writes it last. Which thread enters first? (T0 or T1)`, ans:'T0', hint:`Whoever wrote turn last is the one being polite.`, answer:`<p>T1 wrote turn = 0 last, so T1 waits and T0 enters.</p>`},
    {lv:'M', q:`lock is false. Thread A calls test_and_set(&lock), then B does. What value does B's call return? (true/false)`, ans:'true', hint:`A already set it.`, answer:`<p>true: the lock was taken, so B must spin.</p>`},
    {lv:'H', q:`x = 5. Thread A does cas(&x, 5, 8); thread B then does cas(&x, 5, 9). What is x afterwards?`, ans:'8', hint:`B's expected value no longer matches.`, answer:`<p>A succeeds (5 → 8). B expects 5 but sees 8, so it fails; x stays 8.</p>`},
  ],
  quiz: [
    [`Peterson's algorithm works for…`,[`Any number of threads`,`Two threads`,`Only processes`,`Only kernels`],1,`Classic 2-thread solution.`,'E'],
    [`Test-and-set atomically…`,[`Reads a value`,`Sets a flag to true and returns its old value`,`Adds one`,`Locks memory forever`],1,`Basis of spinlocks.`,'E'],
    [`Compare-and-swap writes the new value only if…`,[`The lock is free`,`The current value equals the expected value`,`It's the first call`,`The thread has priority`],1,`Conditional atomic update.`,'E'],
    [`Why can Peterson's fail on modern multicore CPUs?`,[`It's too slow`,`Memory operations can be reordered/delayed (store buffers)`,`It uses too much memory`,`It needs interrupts`],1,`Needs fences.`,'M'],
    [`Peterson's turn variable ensures…`,[`Speed`,`Only one thread wins when both want in`,`Fairness only`,`Deadlock`],1,`Last writer yields.`,'M'],
    [`Atomic fetch-and-add is useful for…`,[`File I/O`,`Lock-free counters`,`Paging`,`Scheduling`],1,`Indivisible increment.`,'M'],
  ],
  quizAdv: [
    [`The ABA problem affects…`,[`TAS spinlocks`,`CAS-based lock-free structures`,`Semaphores`,`Monitors`],1,`Value looks unchanged but isn't.`,'H'],
    [`Which C11 ordering makes Peterson's correct?`,[`memory_order_relaxed`,`memory_order_seq_cst`,`memory_order_consume`,`None`],1,`Prevents store→load reordering.`,'H'],
    [`x86's XCHG with a memory operand is…`,[`Not atomic`,`Implicitly locked (atomic)`,`Only for registers`,`A fence-free load`],1,`Used for TAS.`,'H'],
  ],
});
