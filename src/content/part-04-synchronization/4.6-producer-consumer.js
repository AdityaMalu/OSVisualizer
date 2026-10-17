/* 4.6 Producer-consumer (bounded buffer) */
topic('4', { no:'4.6', title:'Producer–consumer: the bounded buffer',
idea:`Producers add items to a fixed-size buffer, consumers remove them. Producers must wait when it's full, consumers when it's empty, and nobody may corrupt the buffer. Solve it with three semaphores, watch it run, then swap two lines and watch it deadlock.`,
actors:'Threads', tbTitle:'Buffer (size 3)', stateTitle:'Semaphores',
codes:{a:`#define N 3
item buf[N]; int in = 0, out = 0;
sem_t empty;  // = N   free slots
sem_t full;   // = 0   filled slots
sem_t mutex;  // = 1   protects buf, in, out

void producer(void) {                 void consumer(void) {
    item x = make();                      sem_wait(&full);     // wait for an item
    sem_wait(&empty);  // wait for space  sem_wait(&mutex);
    sem_wait(&mutex);                     item x = buf[out]; out = (out + 1) % N;
    buf[in] = x; in = (in + 1) % N;       sem_post(&mutex);
    sem_post(&mutex);                     sem_post(&empty);    // one more free slot
    sem_post(&full);   // one more item   use(x);
}                                     }`},
steps:[
{hl:{P:[9,10,11,12,13]}, th:[['P','RUN:ok','produced item 1'],['C','READY:info','']], tb:[TB('buffer',['slot 0','slot 1','slot 2'],[['1','','']],{0:'new'})], g:[G('Semaphores',['empty','3 → 2'],['full','0 → 1','hot'],['mutex','1 (free)'])],
 say:`Three semaphores. <code>empty</code> counts free slots (starts at N = 3), <code>full</code> counts filled slots (starts at 0), <code>mutex</code> (starts at 1) protects the buffer indices. The producer waits on <code>empty</code> (a free slot exists), locks, inserts, unlocks, then posts <code>full</code>.`},
{hl:{P:[9,10,11,12,13]}, th:[['P','BLOCKED:warn','sem_wait(empty): 0 → blocks'],['C','READY:info','']], tb:[TB('buffer',['slot 0','slot 1','slot 2'],[['1','2','3']],{0:'hot'})], g:[G('Semaphores',['empty','0','bad'],['full','3'],['mutex','1'])], log:['P: items 2 and 3 inserted','P: buffer full → blocks on empty'],
 say:`The producer is faster and fills all three slots. <code>empty</code> is now 0, so its next <code>sem_wait(&amp;empty)</code> <b>blocks</b>. It's not spinning or overwriting: it sleeps until a consumer frees a slot. The buffer absorbs bursts but caps memory.`},
{hl:{C:[8,9,10,11,12]}, th:[['P','RUN:ok','woken: a slot is free'],['C','RUN:ok','consumed item 1']], tb:[TB('buffer',['slot 0','slot 1','slot 2'],[['(free)','2','3']],{0:'ok'})], g:[G('Semaphores',['empty','0 → 1 → P takes it'],['full','3 → 2'],['mutex','1'])], log:['C: took item 1, posted empty → P wakes'],
 say:`The consumer waits on <code>full</code> (3 → 2, there's an item), locks, removes item 1 from <code>out</code>, unlocks and posts <code>empty</code>, which wakes the producer. The two counting semaphores do the <b>flow control</b>; the mutex only guards the tiny index update.`},
{hl:{P:[9,10], C:[8,9]}, th:[['P','RUN:ok',''],['C','RUN:ok','']], tb:[], g:[G('Why order matters',['producer','wait(empty) THEN wait(mutex)','ok'],['consumer','wait(full) THEN wait(mutex)','ok'],['never','sleep on empty/full while holding mutex','bad'])],
 say:`Notice the order of the waits: <b>first</b> the counting semaphore, <b>then</b> the mutex. A thread only takes the mutex when it knows it can make progress, and it never goes to sleep while holding it. Swapping these two lines is a famous bug.`},
{th:[['P','BLOCKED:bad','holds mutex, waits on empty'],['C','BLOCKED:bad','waits on mutex']], tb:[TB('buffer',['slot 0','slot 1','slot 2'],[['4','5','6']],{0:'bad'})], g:[G('Deadlock (swapped order)',['P','wait(mutex) ✓ then wait(empty) → sleeps holding mutex','bad'],['C','wait(full) ✓ then wait(mutex) → blocks forever','bad'],['result','neither can proceed','bad'])], log:['DEADLOCK: P holds mutex waiting for space; C needs mutex to make space'],
 say:`Swap the producer's two waits: it locks the mutex, then finds the buffer full and sleeps on <code>empty</code> <b>while holding the mutex</b>. The consumer has an item to take (<code>full</code> &gt; 0) but blocks on the mutex. The only thread that could free a slot can't get in: <b>deadlock</b>. The explorer below finds it automatically.`},
{th:[], tb:[], g:[G('Variants',['monitor version','lock + notFull / notEmpty conditions'],['many producers/consumers','same code works'],['in libraries','Java BlockingQueue, Go channels, Python queue.Queue','ok'])],
 say:`<b>Say it:</b> "The bounded buffer uses three semaphores: empty initialised to N counts free slots, full initialised to 0 counts items, and a mutex protects the buffer. The producer waits on empty then the mutex, inserts, releases the mutex and signals full; the consumer mirrors it. You must wait on the counting semaphore before the mutex; otherwise a thread can sleep holding the mutex and deadlock. In practice you'd use a BlockingQueue or a channel."`}
],
keep:[`empty = N (free slots), full = 0 (items), mutex = 1.`,`Producer: wait(empty); wait(mutex); insert; post(mutex); post(full).`,`Consumer: wait(full); wait(mutex); remove; post(mutex); post(empty).`,`Counting semaphore BEFORE mutex, or deadlock.`,`In real code: BlockingQueue / channels.`]}, {
  imp: 'must',
  theory: TH(`In the bounded-buffer problem, producers and consumers share a fixed-size queue; counting semaphores (or condition variables) make them wait when it's full or empty, and a mutex protects the queue itself.`,
`<p>A bakery's display shelf holds three trays. The baker (producer) can't put a fourth tray out until someone buys one; customers (consumers) can't buy from an empty shelf. And two people reaching for the same spot at the same time must not collide: only one person touches the shelf at a time.</p>
<p>The pattern is everywhere: logging pipelines, request queues in servers, audio buffers, Kafka partitions. It decouples a fast producer from a slow consumer while bounding memory.</p>`,
[[`Bounded buffer`,`Fixed-capacity queue shared by producers and consumers.`],[`empty semaphore`,`Counts free slots; producers wait on it.`],[`full semaphore`,`Counts filled slots; consumers wait on it.`],[`mutex`,`Protects the buffer and its indices.`],[`Back-pressure`,`A full buffer makes producers wait instead of using unbounded memory.`],[`Circular buffer`,`Array with wrapping in/out indices.`]],
[`Initialise empty = N, full = 0, mutex = 1.`,`Producer: wait for a free slot, lock, insert at in, unlock, signal full.`,`Consumer: wait for an item, lock, remove at out, unlock, signal empty.`,`The counting semaphores always add up to N.`],
[`java.util.concurrent.ArrayBlockingQueue, LinkedBlockingQueue.`,`Go channels with a buffer: make(chan T, N).`,`Linux pipes are bounded buffers between processes.`],
[`Taking the mutex before the counting semaphore.`,`Using if-checks with busy waiting instead of blocking.`,`Unbounded queues that hide overload.`])
  ,
  examples: [
    {lv:'basic', title:'One slot, semaphores in the right order', sim:'race', input:`# 1-slot buffer: empty=1 free slot, full=0 items
shared: got=0 buf=0 empty=1 full=0 m=0
P: wait empty; lock m; set buf 7; unlock m; signal full
C: wait full; lock m; load r buf; store got r; unlock m; signal empty`, why:`Every interleaving ends with got=7 and no deadlock: the consumer can't read before the producer has written.`},
    {lv:'mid', title:'Swap the producer\'s waits: deadlock', sim:'race', input:`# start with the slot already full so the producer must wait for space
shared: got=0 buf=5 empty=0 full=1 m=0
P: lock m; wait empty; set buf 7; unlock m; signal full
C: wait full; lock m; load r buf; store got r; unlock m; signal empty`, why:`If P locks m first, it sleeps on <code>empty</code> while holding m, and C can never lock m to free the slot. The explorer reports DEADLOCK for those schedules.`},
    {lv:'adv', title:'Go channels are bounded buffers', code:`jobs := make(chan Job, 100)           // capacity 100
go func() {                           // producer
    for _, j := range load() { jobs <- j }   // blocks when 100 are queued
    close(jobs)
}()
for w := 0; w < 4; w++ {               // 4 consumers
    go func() { for j := range jobs { handle(j) } }()   // blocks when empty
}`, why:`Channels package the whole semaphore dance: send blocks on full, receive blocks on empty, close signals the end. Java's equivalent is a BlockingQueue.`},
  ],
  tips: {
    say:`"For the bounded buffer I use three semaphores: empty initialised to N for free slots, full initialised to 0 for items, and a mutex for the buffer. The producer waits on empty, then the mutex, inserts, releases the mutex and posts full; the consumer waits on full, then the mutex, removes, releases and posts empty. The order matters: taking the mutex first can deadlock. In production I'd use a BlockingQueue or channel."`,
    points:[`Initial values and what each semaphore means.`,`The exact order of operations.`,`Why the swapped order deadlocks.`],
    traps:[`Initialising full to N.`,`Mutex before counting semaphore.`],
    qa:[[`Why do we need the mutex if we have empty and full?`,`With several producers, two could pass wait(empty) at once and write the same slot index. The mutex serialises the index updates.`],
        [`How would you write it with a monitor?`,`One lock with notFull and notEmpty conditions; producers while (count == N) notFull.await(), consumers while (count == 0) notEmpty.await(), and each signals the other condition.`],
        [`What does back-pressure mean here?`,`A full buffer blocks producers, slowing them to the consumers' pace instead of letting memory grow without limit.`]]
  },
  exercises: [
    {lv:'E', q:`For a buffer of size 8, what are the initial values of empty, full and mutex? Answer like <code>8 0 1</code>.`, ans:'8 0 1', hint:`Free slots, items, lock.`, answer:`<p>empty = 8, full = 0, mutex = 1.</p>`},
    {lv:'M', q:`In the correct one-slot version, can the system deadlock? (yes/no)`, sim:'race', key:'deadlock', input:`shared: got=0 buf=0 empty=1 full=0 m=0
P: wait empty; lock m; set buf 7; unlock m; signal full
C: wait full; lock m; load r buf; store got r; unlock m; signal empty`, hint:`Run it.`, answer:`<p>No: every schedule completes.</p>`},
    {lv:'H', q:`In the swapped version (producer locks m before waiting on empty, slot initially full), can the system deadlock? (yes/no)`, sim:'race', key:'deadlock', input:`shared: got=0 buf=5 empty=0 full=1 m=0
P: lock m; wait empty; set buf 7; unlock m; signal full
C: wait full; lock m; load r buf; store got r; unlock m; signal empty`, hint:`What if P runs its first step first?`, answer:`<p>Yes: P locks m, blocks on empty; C passes wait full, blocks on lock m.</p>`},
  ],
  quiz: [
    [`In the bounded buffer, "empty" is initialised to…`,[`0`,`N`,`1`,`-1`],1,`All slots free.`,'E'],
    [`"full" is initialised to…`,[`0`,`N`,`1`,`N-1`],0,`No items yet.`,'E'],
    [`A producer finding the buffer full…`,[`Overwrites`,`Blocks on empty`,`Spins on mutex`,`Exits`],1,`Waits for space.`,'E'],
    [`Why must the producer wait on empty before the mutex?`,[`Speed`,`Otherwise it can sleep holding the mutex and deadlock`,`Semaphores require it`,`To be fair`],1,`Never block while holding the lock.`,'M'],
    [`The mutex protects…`,[`The semaphores`,`The buffer and its indices`,`The CPU`,`Nothing`],1,`Index updates.`,'M'],
    [`A Go buffered channel behaves like…`,[`A mutex`,`A bounded buffer`,`A spinlock`,`A barrier`],1,`Blocks on full/empty.`,'M'],
  ],
  quizAdv: [
    [`At any moment (outside operations), empty + full equals…`,[`0`,`1`,`N`,`2N`],2,`Invariant.`,'H'],
    [`With a single producer and single consumer and a lock-free ring buffer, you can avoid the mutex because…`,[`It's illegal`,`Each index is written by only one thread`,`Semaphores are atomic`,`Never`],1,`SPSC queues.`,'H'],
    [`An unbounded producer-consumer queue risks…`,[`Deadlock`,`Unbounded memory growth and latency under overload`,`Starving the producer`,`Page faults only`],1,`No back-pressure.`,'H'],
  ],
});
