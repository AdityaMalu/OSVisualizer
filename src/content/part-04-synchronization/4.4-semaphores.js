/* 4.4 Semaphores */
topic('4', { no:'4.4', title:'Semaphores: counting, binary and signalling',
idea:`A semaphore is a counter with two atomic operations: <code>wait</code> (decrement, block if it would go below zero) and <code>signal</code> (increment, wake a waiter). Use one to cap a pool at 2 concurrent users, then use a zero-initialised one to force "A before B" ordering between threads.`,
actors:'Threads', tbTitle:'Semaphore', stateTitle:'Semaphore rules',
codes:{a:`sem_t slots;
sem_init(&slots, 0, 2);          // counting semaphore: 2 database connections

void *client(void *_) {
    sem_wait(&slots);            // P(): take a slot, block if none left
    use_connection();
    sem_post(&slots);            // V(): give it back, wake a waiter
    return NULL;
}

// ordering: B must run after A's step
sem_t ready;  sem_init(&ready, 0, 0);    // starts at 0
// thread A:  produce(); sem_post(&ready);
// thread B:  sem_wait(&ready); consume();   // waits until A posts`},
steps:[
{hl:{C1:[5,6], C2:[5,6]}, th:[['C1','RUN:ok','got a slot'],['C2','RUN:ok','got a slot'],['C3','READY:info','about to wait']], tb:[TB('slots',['field','value'],[['value','0'],['waiting','—']],{0:'hot'})], g:[G('Semaphore rules',['wait / P','value−−; if it was 0, block','hot'],['signal / V','value++; if anyone is waiting, wake one'],['both','atomic'])],
 say:`The semaphore <code>slots</code> starts at 2 (two database connections). C1 and C2 each call <code>sem_wait</code>: 2 → 1 → 0. Both proceed. (Dijkstra called these operations P and V, from Dutch <i>proberen</i>, to try, and <i>verhogen</i>, to raise.)`},
{hl:{C3:[5]}, th:[['C1','RUN:ok','using'],['C2','RUN:ok','using'],['C3','BLOCKED:warn','value is 0: blocks']], tb:[TB('slots',['field','value'],[['value','0'],['waiting','C3']],{1:'hot'})], log:['C3: sem_wait blocks'],
 say:`C3 calls <code>sem_wait</code> with the value at 0: no slot, so C3 <b>blocks</b> on the semaphore's wait queue. A counting semaphore admits up to N threads, not just one: it's a mutex generalised to N.`},
{hl:{C1:[7], C3:[6]}, th:[['C1','TERM:dim','released'],['C2','RUN:ok','using'],['C3','RUN:ok','woken, got the slot']], tb:[TB('slots',['field','value'],[['value','0'],['waiting','—']])], log:['C1: sem_post → wakes C3'],
 say:`C1 finishes and calls <code>sem_post</code>. A waiter exists, so C3 is woken and takes the slot (the value stays 0). Unlike a mutex, any thread may post: there's no owner. That's what makes semaphores useful for <b>signalling</b>, not just locking.`},
{hl:{ord:[11,12,14]}, th:[['A','READY:info','hasn\'t produced yet'],['B','BLOCKED:warn','sem_wait(ready): 0 → blocks']], tb:[TB('ready',['field','value'],[['value','0'],['waiting','B']],{1:'hot'})],
 say:`Second use: <b>ordering</b>. <code>ready</code> starts at <b>0</b>. If B gets to <code>sem_wait(&amp;ready)</code> first, it blocks: there's nothing to consume yet.`},
{hl:{ord:[13,14]}, th:[['A','TERM:dim','produced, posted'],['B','RUN:ok','consumes A\'s result']], tb:[TB('ready',['field','value'],[['value','0'],['waiting','—']])], log:['A: produce(); sem_post(ready)','B wakes, consume()'],
 say:`A produces and posts; B wakes and consumes. If A had run first, its post would have raised the value to 1 and B's wait would pass straight through. Either way, consume never runs before produce. A semaphore remembers signals, unlike a condition variable.`},
{th:[], tb:[], g:[G('Kinds',['counting','value 0…N: resource pools, bounded buffers'],['binary','value 0/1: like a mutex, but no owner'],['init 0','for ordering / signalling']),G('Pitfalls',['forgetting a post','permanent block','bad'],['wrong order of waits','deadlock (see producer-consumer)','bad'],['using a binary semaphore as a mutex','anyone can "unlock" it','bad'])],
 say:`<b>Say it:</b> "A semaphore is an integer with atomic wait and signal. Wait decrements and blocks if the value would go negative; signal increments and wakes a waiter. A counting semaphore initialised to N limits concurrent access to N resources; one initialised to 0 is used to signal or order events between threads. Unlike a mutex there's no owner, so any thread can signal."`}
],
keep:[`wait/P: decrement, block at 0. signal/V: increment, wake one.`,`Counting (init N): limit concurrency to N.`,`Binary (init 1): mutual exclusion, but no ownership.`,`Init 0: ordering/signalling ("A before B").`,`Semaphores remember signals; condition variables don't.`]}, {
  imp: 'must',
  theory: TH(`A semaphore is a counter with atomic wait and signal operations; it can limit access to N resources or let one thread signal another.`,
`<p>A car park with a sign showing free spaces. Each car entering decrements it; when it shows 0, cars queue at the barrier. Each car leaving increments it and lets one queued car in. That's a counting semaphore. A zero-initialised semaphore is like a "your table is ready" pager: the restaurant signals it, and you wait until it buzzes, even if it buzzed before you looked at it.</p>
<p>Dijkstra introduced semaphores in 1965; they're powerful but low-level. Getting the order of waits and signals wrong easily causes deadlocks, which is why higher-level monitors and condition variables were invented.</p>`,
[[`Semaphore`,`Integer + atomic wait (P) and signal (V).`],[`Counting semaphore`,`Value can range over 0…N.`],[`Binary semaphore`,`Value 0 or 1.`],[`P / wait / down`,`Decrement; block if unavailable.`],[`V / signal / post / up`,`Increment; wake one waiter.`],[`No ownership`,`Any thread may signal, unlike a mutex.`]],
[`Initialise to the number of available units (or 0 for signalling).`,`Before using a unit, wait; this blocks when none are left.`,`After finishing, signal; this wakes a blocked waiter or increments the count.`,`The kernel keeps a queue of blocked threads per semaphore.`],
[`Limiting concurrent calls to a rate-limited API or database (Java Semaphore, Go buffered channel).`,`Bounded buffers between producer and consumer threads.`,`Signalling completion from an interrupt handler or callback.`],
[`Calling signal without a matching wait (count drifts up, lets too many in).`,`Using a binary semaphore where a mutex's ownership checks would catch bugs.`,`Wrong nesting order of waits causing deadlock.`])
  ,
  examples: [
    {lv:'basic', title:'Ordering with a semaphore initialised to 0', sim:'race', input:`# B must read x only after A has set it
shared: x=0 seen=0 ready=0
A: set x 42; signal ready
B: wait ready; load r x; store seen r`, why:`In every interleaving <code>seen</code> ends as 42. Remove <code>wait ready</code> from B and run again: B can read 0.`},
    {lv:'mid', title:'Limit concurrency to N in Java', code:`Semaphore permits = new Semaphore(10);       // at most 10 concurrent calls
void callApi() throws InterruptedException {
    permits.acquire();                       // wait/P
    try { httpClient.send(request); }
    finally { permits.release(); }           // signal/V
}`, why:`A classic bulkhead: no matter how many request threads exist, at most 10 hit the downstream API at once.`},
    {lv:'adv', title:'A semaphore used as a mutex', sim:'race', input:`shared: count=0 s=1
A: wait s; load r count; add r 1; store count r; signal s
B: wait s; load r count; add r 1; store count r; signal s`, why:`A binary semaphore initialised to 1 gives mutual exclusion: only count=2. But nothing stops a third thread from calling <code>signal s</code> by mistake and letting two threads in; a mutex would reject an unlock by a non-owner.`},
  ],
  tips: {
    say:`"A semaphore is a counter with atomic wait and signal. Wait decrements and blocks when nothing is available; signal increments and wakes a waiter. Initialised to N it limits concurrent use of N resources; initialised to 1 it acts like a lock; initialised to 0 it lets one thread wait for an event signalled by another. It has no owner, which is what distinguishes it from a mutex."`,
    points:[`Define wait and signal precisely.`,`Three uses: counting, mutual exclusion, signalling.`,`Mutex vs semaphore: ownership.`],
    traps:[`Saying a binary semaphore is identical to a mutex.`,`Forgetting that signals are remembered.`],
    qa:[[`Mutex vs binary semaphore?`,`A mutex has an owner (only it can unlock, can support priority inheritance and recursion); a binary semaphore can be signalled by any thread, which suits signalling but hides locking bugs.`],
        [`What happens if a thread signals before anyone waits?`,`The count increases, so the next wait passes immediately: the signal is remembered.`],
        [`How can semaphores cause deadlock?`,`Two threads each wait on two semaphores in opposite orders, or a producer waits on mutex then empty while the consumer holds mutex and waits on full.`]]
  },
  exercises: [
    {lv:'E', q:`A semaphore starts at 3. Five threads call wait and nobody signals. How many threads are blocked?`, ans:'2', hint:`Three get through.`, answer:`<p>3 pass (3 → 0), 2 block.</p>`},
    {lv:'M', q:`With the semaphore, what values can <code>seen</code> end with?`, sim:'race', key:'values', input:`shared: seen=0 x=0 ready=0
A: set x 42; signal ready
B: wait ready; load r x; store seen r`, hint:`B can't read before the signal.`, answer:`<p>Only 42.</p>`},
    {lv:'H', q:`Thread A runs <code>A1; A2</code> and thread B runs <code>B1</code>. Using semaphores, force the order A1 → B1 → A2. Which semaphores (with initial values) do you need, and where do the waits and signals go?`, hint:`Two semaphores, both initialised to 0.`, answer:`<p>s1 = 0, s2 = 0. A: A1; signal s1; wait s2; A2. B: wait s1; B1; signal s2. B1 can't start before A1 (needs s1) and A2 can't start before B1 (needs s2).</p>`},
  ],
  quiz: [
    [`sem_wait on a semaphore with value 0…`,[`Returns an error`,`Blocks until another thread signals`,`Sets it to -1 and continues`,`Kills the thread`],1,`Wait for a unit.`,'E'],
    [`A counting semaphore initialised to 5 allows…`,[`Unlimited threads`,`Up to 5 threads in at once`,`1 thread`,`0 threads`],1,`N resources.`,'E'],
    [`Signal (V) does…`,[`Decrement`,`Increment and wake a waiter`,`Nothing if nobody waits`,`Reset to 0`],1,`Remembered if nobody waits.`,'E'],
    [`To make thread B wait for thread A's event, initialise the semaphore to…`,[`1`,`0`,`N`,`-1`],1,`B blocks until A signals.`,'M'],
    [`Key difference between a mutex and a binary semaphore?`,[`Speed`,`A mutex has an owner; a semaphore can be signalled by any thread`,`Semaphores can't block`,`None`],1,`Ownership.`,'M'],
    [`If signal happens before wait, the waiter…`,[`Blocks forever`,`Passes immediately (count was raised)`,`Crashes`,`Waits for the next signal`],1,`State persists.`,'M'],
  ],
  quizAdv: [
    [`P and V come from…`,[`Process and Variable`,`Dutch words (proberen, verhogen)`,`Pascal`,`POSIX`],1,`Dijkstra.`,'H'],
    [`A Go buffered channel of capacity N used with empty sends behaves like…`,[`A mutex`,`A counting semaphore`,`A condition variable`,`A spinlock`],1,`Send = acquire, receive = release.`,'H'],
    [`Priority inheritance is easier with mutexes than semaphores because…`,[`Mutexes are faster`,`A mutex has a known owner to boost`,`Semaphores can't block`,`It isn't`],1,`Who to boost.`,'H'],
  ],
});
