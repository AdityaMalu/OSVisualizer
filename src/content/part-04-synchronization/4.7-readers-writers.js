/* 4.7 Readers-writers */
topic('4', { no:'4.7', title:'Readers–writers and read-write locks',
idea:`Many threads can safely read shared data at once; a writer needs it alone. Walk through the classic "readers-preference" solution, see three readers share the data while a writer waits, then watch the writer starve as readers keep arriving, and how writer-preference and fair locks fix it.`,
actors:'Threads', tbTitle:'Lock state', stateTitle:'Policy',
codes:{a:`sem_t rw = 1;        // held by a writer, or by the readers as a group
sem_t mutex = 1;     // protects readcount
int readcount = 0;

void reader(void) {
    sem_wait(&mutex);
    if (++readcount == 1) sem_wait(&rw);   // first reader locks out writers
    sem_post(&mutex);
    read_data();                           // many readers here at once
    sem_wait(&mutex);
    if (--readcount == 0) sem_post(&rw);   // last reader lets writers in
    sem_post(&mutex);
}
void writer(void) {
    sem_wait(&rw);                         // exclusive
    write_data();
    sem_post(&rw);
}`},
steps:[
{hl:{R1:[6,7,8,9]}, th:[['R1','RUN:ok','reading'],['W','READY:info','']], tb:[TB('state',['field','value'],[['readcount','1'],['rw','held by readers']],{0:'new',1:'hot'})], g:[G('Policy',['readers','may share'],['writer','needs exclusive access'])],
 say:`Reader R1 locks <code>mutex</code>, increments <code>readcount</code> to 1 and, as the <b>first</b> reader, takes <code>rw</code> on behalf of all readers. Then it releases <code>mutex</code> and reads.`},
{hl:{R2:[6,7,8,9], R3:[6,7,8,9]}, th:[['R1','RUN:ok','reading'],['R2','RUN:ok','reading'],['R3','RUN:ok','reading'],['W','READY:info','']], tb:[TB('state',['field','value'],[['readcount','3'],['rw','held by readers']],{0:'hot'})],
 say:`R2 and R3 arrive. <code>readcount</code> is already ≥ 1, so they skip <code>rw</code> and go straight in. Three readers read <b>concurrently</b>: for read-heavy data (caches, configuration, routing tables) this is a big win over a plain mutex.`},
{hl:{W:[15]}, th:[['R1','RUN:ok','reading'],['R2','RUN:ok','reading'],['R3','RUN:ok','reading'],['W','BLOCKED:warn','waits on rw']], tb:[TB('state',['field','value'],[['readcount','3'],['rw','held by readers'],['waiting on rw','W']],{2:'hot'})],
 say:`A writer arrives and waits on <code>rw</code>, held by the readers as a group. It must wait until <b>every</b> reader has left.`},
{hl:{R4:[6,7,8,9]}, th:[['R1','TERM:dim','left'],['R2','RUN:ok','reading'],['R4','RUN:ok','new reader: walks in'],['W','BLOCKED:bad','still waiting']], tb:[TB('state',['field','value'],[['readcount','2 (R1 left, R4 joined)'],['rw','held by readers'],['waiting on rw','W']],{2:'bad'})], g:[G('Policy',['readers-preference','new readers enter while a writer waits','bad'],['risk','writer starvation if readers overlap continuously','bad'])],
 say:`Here's the flaw. R1 leaves but R4 arrives; since <code>readcount</code> never drops to 0, R4 walks right in past the waiting writer. If readers keep overlapping, the writer <b>starves</b>. This version is "readers-preference".`},
{hl:{R2:[11,12,13], W:[15,16]}, th:[['R2','TERM:dim','last reader: posts rw'],['R4','TERM:dim',''],['W','RUN:ok','writing alone'],['R5','BLOCKED:warn','waits (rw held by writer)']], tb:[TB('state',['field','value'],[['readcount','0'],['rw','held by W'],['waiting','R5']],{1:'hot'})], log:['last reader posts rw → W enters'],
 say:`Only when the last reader leaves (<code>readcount</code> → 0) does it post <code>rw</code>, letting W in. While W writes, new readers block: the first one waits on <code>rw</code> while holding <code>mutex</code>, and the rest queue on <code>mutex</code>.`},
{th:[], tb:[], g:[G('Policies',['readers-preference','max read throughput; writers can starve'],['writers-preference','once a writer waits, new readers wait; readers can starve'],['fair (FIFO)','arrival order; no starvation','ok']),G('In libraries',['pthread_rwlock_t','often writer-preferring'],['Java ReentrantReadWriteLock','fair or unfair mode; StampedLock for optimistic reads'],['when NOT to use','short critical sections: rwlock overhead > mutex','bad'])],
 say:`<b>Say it:</b> "Readers-writers lets many readers share access but gives writers exclusive access. The classic solution keeps a reader count protected by a mutex; the first reader locks out writers and the last lets them in. That's readers-preference, which can starve writers; writers-preference blocks new readers once a writer waits, and fair locks serve in arrival order. Libraries provide read-write locks, but they only pay off when reads dominate and critical sections are long enough."`}
],
keep:[`Many readers OR one writer.`,`First reader takes rw; last reader releases it.`,`Readers-preference → writers can starve.`,`Writers-preference → readers can starve; fair lock = FIFO.`,`RW locks help only for read-heavy, longer sections.`]}, {
  imp: 'good',
  theory: TH(`The readers-writers problem allows concurrent reads but exclusive writes; solutions differ in whom they favour, trading throughput against starvation.`,
`<p>A museum painting: any number of visitors can look at it at once, but the restorer needs the room empty. If the guard always lets new visitors in as long as anyone is already looking, the restorer might wait all day (readers-preference). If the guard stops admitting visitors as soon as the restorer is waiting, visitors queue instead (writers-preference).</p>
<p>A read-write lock is the library version. It's worth it when reads are much more common than writes and each read holds the lock for a while; for tiny critical sections the extra bookkeeping makes it slower than a plain mutex.</p>`,
[[`Shared (read) lock`,`Held by any number of readers.`],[`Exclusive (write) lock`,`Held by one writer, no readers.`],[`readcount`,`Number of active readers.`],[`Readers-preference`,`New readers enter while a writer waits.`],[`Writers-preference`,`Waiting writers block new readers.`],[`Lock upgrade`,`Turning a read lock into a write lock (deadlock-prone if two readers try).`]],
[`Reader: lock the counter mutex; if first reader, acquire the write lock; unlock the counter.`,`Read the data.`,`Reader exit: lock counter; if last, release the write lock; unlock counter.`,`Writer: acquire the write lock exclusively; write; release.`],
[`In-memory caches and config read by every request but updated rarely.`,`Database shared/exclusive row locks are the same idea.`,`Linux uses RCU and seqlocks for extreme read-mostly cases.`],
[`Using a read lock and then writing.`,`Trying to upgrade read → write without a special API (two upgraders deadlock).`,`RW locks for tiny critical sections.`])
  ,
  examples: [
    {lv:'basic', title:'Java ReentrantReadWriteLock', code:`private final ReadWriteLock rw = new ReentrantReadWriteLock(true);   // fair mode
private final Map<String, Route> routes = new HashMap<>();
Route lookup(String k) {
    rw.readLock().lock();
    try { return routes.get(k); } finally { rw.readLock().unlock(); }   // concurrent
}
void update(String k, Route r) {
    rw.writeLock().lock();
    try { routes.put(k, r); } finally { rw.writeLock().unlock(); }      // exclusive
}`, why:`Lookups run in parallel; updates wait for readers to drain. The <code>true</code> argument selects fair ordering, preventing writer starvation.`},
    {lv:'mid', title:'Starvation timeline (readers-preference)', code:`time   0    10   20   30   40   50
R1     ████████
R2          ████████
R3               ████████
R4                    ████████          ← readers always overlap
W      wait……………………………………………………………  never enters`, why:`readcount never reaches 0, so the writer never acquires rw. A fair or writer-preferring lock stops admitting readers once W is waiting.`},
    {lv:'adv', title:'Optimistic reads with StampedLock', code:`StampedLock sl = new StampedLock();
double distance() {
    long stamp = sl.tryOptimisticRead();     // no lock taken at all
    double x = this.x, y = this.y;
    if (!sl.validate(stamp)) {               // a writer intervened: fall back
        stamp = sl.readLock();
        try { x = this.x; y = this.y; } finally { sl.unlockRead(stamp); }
    }
    return Math.hypot(x, y);
}`, why:`For very read-heavy data, readers don't even write to a shared counter; they just check afterwards that no writer ran. Linux seqlocks work the same way.`},
  ],
  tips: {
    say:`"Readers-writers allows concurrent readers but exclusive writers. The classic solution tracks the number of readers under a mutex; the first reader acquires the write lock for the group and the last releases it. That favours readers and can starve writers; writer-preference or fair locks fix that at some cost. In practice I'd use a read-write lock, and only when reads dominate and hold the lock long enough to matter."`,
    points:[`Explain the first-reader / last-reader trick.`,`Name the starvation problem and the policies.`,`When an RW lock isn't worth it.`],
    traps:[`Claiming readers-writers can't starve anyone.`,`Upgrading a read lock naively.`],
    qa:[[`Why can't two readers both upgrade to writers?`,`Each holds a read lock and waits for all readers to leave before getting the write lock; each waits for the other: deadlock. APIs either forbid upgrade or allow only one upgrader.`],
        [`When is a plain mutex better?`,`When critical sections are short or writes are frequent: the RW lock's extra atomic operations and cache-line bouncing on the reader count cost more than the parallelism gains.`],
        [`What is RCU?`,`Read-copy-update: readers take no locks; writers publish a new copy and free the old one after all pre-existing readers finish. Used heavily in the Linux kernel.`]]
  },
  exercises: [
    {lv:'E', q:`Three readers are reading. Can a fourth reader enter immediately under readers-preference? (yes/no)`, ans:'yes', hint:`readcount > 0.`, answer:`<p>Yes: only the first reader takes rw.</p>`},
    {lv:'M', q:`In the classic solution, which reader releases the rw lock: the first or the last?`, ans:'last', hint:`Writers need the room empty.`, answer:`<p>The last reader (readcount drops to 0).</p>`},
    {lv:'H', q:`A cache gets 10,000 reads/s and 1 write/s; each read holds the lock for 50 µs. Mutex or RW lock? Estimate the utilisation of a single mutex.`, hint:`10,000 × 50 µs per second.`, answer:`<p>10,000 × 50 µs = 0.5 s of lock hold time per second: a mutex would be 50% utilised by reads alone, causing heavy queuing. An RW lock lets reads overlap; with 1 write/s, writer starvation is the risk to manage (use a fair lock).</p>`},
  ],
  quiz: [
    [`Readers-writers allows…`,[`One reader at a time`,`Many readers or one writer`,`Many writers`,`Readers and writers together`],1,`Shared vs exclusive.`,'E'],
    [`In the classic solution, the first reader…`,[`Does nothing special`,`Acquires the write lock on behalf of all readers`,`Blocks other readers`,`Signals writers`],1,`Locks out writers.`,'E'],
    [`Readers-preference can starve…`,[`Readers`,`Writers`,`Nobody`,`The kernel`],1,`Readers keep overlapping.`,'E'],
    [`A fair RW lock…`,[`Prefers readers`,`Serves requests roughly in arrival order`,`Prefers writers always`,`Is a spinlock`],1,`No starvation.`,'M'],
    [`RW locks are NOT worth it when…`,[`Reads dominate`,`Critical sections are tiny or writes are frequent`,`There are many cores`,`Data is large`],1,`Overhead.`,'M'],
    [`Two readers both trying to upgrade to write locks…`,[`Works`,`Can deadlock`,`Is faster`,`Starves writers`],1,`Each waits for the other.`,'M'],
  ],
  quizAdv: [
    [`StampedLock's optimistic read…`,[`Takes an exclusive lock`,`Takes no lock and validates afterwards`,`Blocks writers`,`Is only for writes`],1,`Seqlock-like.`,'H'],
    [`Linux RCU readers…`,[`Take a spinlock`,`Take no locks; writers wait for a grace period before freeing`,`Block writers`,`Use semaphores`],1,`Read-copy-update.`,'H'],
    [`Database shared and exclusive row locks implement…`,[`Producer-consumer`,`Readers-writers`,`Dining philosophers`,`Banker's algorithm`],1,`Same compatibility matrix.`,'H'],
  ],
});
