/* 4.5 Monitors and condition variables */
topic('4', { no:'4.5', title:'Monitors and condition variables',
idea:`A lock gives mutual exclusion; a condition variable lets a thread wait <i>inside</i> it for some state to become true. Follow a consumer that finds a queue empty, waits (atomically releasing the lock), gets signalled, re-checks in a <code>while</code> loop, and see why <code>if</code> instead of <code>while</code> is a classic bug.`,
actors:'Threads', tbTitle:'Monitor state', stateTitle:'Rules',
codes:{a:`pthread_mutex_t m;   pthread_cond_t nonempty;   queue q;

item take(void) {                        // consumer
    pthread_mutex_lock(&m);
    while (q.empty())                    // WHILE, not if: re-check after waking
        pthread_cond_wait(&nonempty, &m); // atomically: unlock m + sleep; relock on wake
    item x = q.pop();
    pthread_mutex_unlock(&m);
    return x;
}
void put(item x) {                       // producer
    pthread_mutex_lock(&m);
    q.push(x);
    pthread_cond_signal(&nonempty);      // wake one waiter (if any)
    pthread_mutex_unlock(&m);
}
// Java monitor: synchronized + while (cond) wait(); … notifyAll();`},
steps:[
{hl:{C1:[4,5,6]}, th:[['C1','WAITING:warn','waits on nonempty'],['P','READY:info','']], tb:[TB('monitor',['field','value'],[['lock m','free (released by wait)'],['queue','empty'],['nonempty waiters','C1']],{0:'hot',2:'hot'})],
 say:`Consumer C1 locks <code>m</code> and finds the queue empty. It can't just spin holding the lock (the producer could never get in), and it can't unlock and then sleep (a signal could slip in between and be lost). <code>pthread_cond_wait</code> does both <b>atomically</b>: release <code>m</code> and sleep on the condition variable.`},
{hl:{P:[12,13,14]}, th:[['C1','READY:info','woken, needs m back'],['P','RUN:ok','holds m, pushed, signalled']], tb:[TB('monitor',['field','value'],[['lock m','held by P'],['queue','[x]'],['nonempty waiters','—']],{1:'new'})], log:['P: push x; signal(nonempty) → C1 woken'],
 say:`The producer takes the lock, pushes an item and <b>signals</b>. C1 is moved off the condition's wait queue, but it can't run inside the monitor yet: it must reacquire <code>m</code>, which P still holds. (This is <b>Mesa</b> semantics, used by pthreads and Java: signal is a hint, the signaller keeps running.)`},
{hl:{P:[15]}, th:[['C1','READY:info','waiting for m'],['C2','RUN:ok','grabbed m first, took x'],['P','TERM:dim','unlocked']], tb:[TB('monitor',['field','value'],[['lock m','held by C2'],['queue','empty again'],['nonempty waiters','—']],{1:'bad'})], log:['C2 (just arrived) locks m first and takes x'],
 say:`P unlocks. Before C1 gets the lock, another consumer C2 arrives, grabs <code>m</code>, sees one item and takes it. Nothing forbids this: between the signal and C1 actually running, the world can change. (Spurious wakeups, waking with no signal at all, are also allowed by POSIX.)`},
{hl:{C1:[5,6]}, th:[['C1','WAITING:warn','re-checks: empty → waits again'],['C2','TERM:dim','']], tb:[TB('monitor',['field','value'],[['lock m','free'],['queue','empty'],['nonempty waiters','C1']],{2:'ok'})],
 say:`C1 finally reacquires <code>m</code> and returns from <code>wait</code>. Because the check is a <b>while</b> loop, C1 re-tests <code>q.empty()</code>, finds it true and waits again. Correct. With <code>if</code>, C1 would call <code>q.pop()</code> on an empty queue: crash or garbage. <b>Always wait in a loop.</b>`},
{th:[], tb:[], g:[G('Monitor',['what','a lock + condition variables + the data they protect'],['in Java','every object: synchronized, wait(), notify(), notifyAll()'],['rule','check the condition, wait, and modify state only while holding the lock','ok']),G('signal vs broadcast',['signal / notify','wake one waiter'],['broadcast / notifyAll','wake all; safest when waiters wait for different conditions','ok']),G('vs semaphore',['condition variable','no memory: a signal with no waiter is lost','bad'],['semaphore','counts signals'])],
 say:`A <b>monitor</b> bundles a lock, the shared data and condition variables, so all access happens with the lock held. Unlike a semaphore, a condition variable has <b>no memory</b>: a signal with no waiter does nothing. That's fine, because the waiter always checks the actual state (the queue) under the lock before deciding to wait.`},
{g:[G('Remember',['wait','atomically unlock + sleep; relock before returning'],['loop','while (!condition) wait();','ok'],['signal','after changing the state, with or without the lock'],['Mesa vs Hoare','Mesa: signaller continues (re-check needed); Hoare: waiter runs immediately'])],
 say:`<b>Say it:</b> "A condition variable lets a thread wait for a condition while inside a critical section. wait atomically releases the mutex and sleeps, and reacquires the mutex before returning; signal wakes one waiter and broadcast wakes all. Because of Mesa semantics and spurious wakeups the waiter must re-check the condition in a while loop. A monitor packages the lock, condition variables and shared state together, as Java's synchronized, wait and notify do."`}
],
keep:[`CV = wait for a condition while using a mutex.`,`wait(cv, m): atomically unlock m + sleep; relock on wake.`,`ALWAYS: while (!condition) wait(); never if.`,`signal = wake one; broadcast/notifyAll = wake all.`,`CVs don't remember signals; the shared state is the truth.`]}, {
  imp: 'must',
  theory: TH(`Condition variables let threads sleep until shared state changes, always used with a mutex and a while loop; a monitor packages the lock, the state and its conditions together.`,
`<p>A waiter at a restaurant (consumer) checks the pass for a finished dish; none is there. Rather than staring at it (spinning) while blocking the chef's access to the pass (holding the lock), they step back and ask to be called (wait). When called, they walk back and look again, because another waiter may have grabbed the dish first (re-check in a loop).</p>
<p>The key subtlety is atomicity: releasing the lock and going to sleep must be one step, or the "dish ready" call could come in the gap and be missed. That is what <code>pthread_cond_wait</code> guarantees.</p>`,
[[`Condition variable`,`Queue of threads waiting for some condition.`],[`wait`,`Release the mutex and sleep atomically; reacquire on wakeup.`],[`signal / notify`,`Wake one waiting thread.`],[`broadcast / notifyAll`,`Wake all waiting threads.`],[`Monitor`,`Mutex + condition variables + protected data.`],[`Mesa semantics`,`Signalled thread just becomes runnable; must re-check.`],[`Spurious wakeup`,`Return from wait without a signal.`]],
[`Lock the mutex.`,`While the condition is false, wait on the condition variable.`,`Do the work on shared state.`,`If you changed something others wait for, signal or broadcast.`,`Unlock.`],
[`Blocking queues (Java ArrayBlockingQueue) use two conditions: notEmpty and notFull.`,`Thread pools wait on "queue not empty".`,`Java's Lock/Condition API gives several conditions per lock.`],
[`Using if instead of while.`,`Waiting without holding the lock (illegal / racy).`,`notify() when waiters wait for different conditions (wrong one woken: use notifyAll or separate CVs).`,`Assuming a signal sent before the wait will be remembered.`])
  ,
  examples: [
    {lv:'basic', title:'Java: a one-slot mailbox monitor', code:`class Mailbox {
    private String msg;                        // null = empty
    synchronized void put(String m) throws InterruptedException {
        while (msg != null) wait();            // wait until empty
        msg = m;
        notifyAll();                           // wake takers
    }
    synchronized String take() throws InterruptedException {
        while (msg == null) wait();            // wait until full
        String m = msg; msg = null;
        notifyAll();                           // wake putters
        return m;
    }
}`, why:`Every Java object is a monitor. Both waits are in while loops; notifyAll is used because putters and takers share the same wait set.`},
    {lv:'mid', title:'Two conditions, one lock (ReentrantLock)', code:`final Lock lock = new ReentrantLock();
final Condition notFull = lock.newCondition(), notEmpty = lock.newCondition();
void put(T x) throws InterruptedException {
    lock.lock();
    try {
        while (count == items.length) notFull.await();
        items[putIdx++ % items.length] = x; count++;
        notEmpty.signal();                     // only takers wait here: signal is enough
    } finally { lock.unlock(); }
}`, why:`Separate conditions mean signal() wakes the right kind of thread, avoiding notifyAll's thundering herd. This is how ArrayBlockingQueue is written.`},
    {lv:'adv', title:'The lost-wakeup bug', code:`// BROKEN: check and sleep are not atomic
if (queue_empty()) {         // 1. consumer sees empty
                             // 2. producer pushes and signals: nobody is waiting yet → lost
    sleep_until_signal();    // 3. consumer sleeps forever although the queue has an item
}
// correct: lock(m); while (queue_empty()) cond_wait(&cv, &m); …`, why:`This is why condition variables are always used together with a mutex, and why wait releases it atomically.`},
  ],
  tips: {
    say:`"A condition variable lets a thread wait inside a critical section for a condition on shared state. wait atomically releases the mutex and sleeps, then reacquires it before returning; signal wakes one waiter and broadcast wakes all. With Mesa semantics and spurious wakeups, you must re-check the condition in a while loop. A monitor combines the lock, condition variables and data, which is exactly Java's synchronized with wait and notifyAll."`,
    points:[`Why wait must release the lock atomically.`,`while vs if.`,`signal vs broadcast; Mesa vs Hoare.`],
    traps:[`if instead of while.`,`Calling wait without holding the lock.`],
    qa:[[`Why must the waiter hold the mutex when calling wait?`,`So checking the condition and going to sleep can't be interleaved with the signaller's update; otherwise the wakeup can be lost.`],
        [`When is notify() safe instead of notifyAll()?`,`When all waiters wait for the same condition and any one of them can make progress, and a single state change only enables one waiter.`],
        [`Condition variable vs semaphore?`,`A semaphore has a count and remembers signals; a CV has no state and only makes sense together with a predicate on shared data protected by a mutex.`]]
  },
  exercises: [
    {lv:'E', q:`What should surround <code>pthread_cond_wait</code>: an <code>if</code> or a <code>while</code>?`, ans:'while', hint:`Mesa semantics, spurious wakeups.`, answer:`<p>A while loop that re-checks the condition.</p>`},
    {lv:'M', q:`A producer signals a condition variable when no thread is waiting. Then a consumer calls wait without checking the queue first. Does the consumer wake up from that earlier signal? (yes/no)`, ans:'no', hint:`Do CVs remember?`, answer:`<p>No. The signal was lost; that's why consumers check the queue (under the lock) before waiting.</p>`},
    {lv:'H', q:`A bounded buffer uses ONE condition variable for both "not full" and "not empty", and uses signal (not broadcast). Describe a scenario where everyone ends up waiting.`, hint:`Signal can wake the wrong kind of thread.`, answer:`<p>Buffer size 1, two consumers waiting. A producer fills the buffer and signals, waking consumer C1. Before C1 runs, the producer tries again, sees full, and waits. C1 takes the item and signals, but wakes C2 (another consumer) instead of the producer; C2 sees empty and waits. Now producer, C2, and eventually C1 all wait: nobody will signal. Use broadcast or two condition variables.</p>`},
  ],
  quiz: [
    [`pthread_cond_wait(&cv, &m)…`,[`Spins`,`Atomically unlocks m and sleeps; relocks m before returning`,`Locks m`,`Signals other threads`],1,`Atomic release + sleep.`,'E'],
    [`Why wait in a while loop?`,[`Style`,`The condition may be false again by the time the thread runs (Mesa, spurious wakeups)`,`To avoid locking`,`Faster`],1,`Re-check.`,'E'],
    [`notifyAll() wakes…`,[`One thread`,`All threads waiting on that object`,`All threads in the JVM`,`Nobody`],1,`Broadcast.`,'E'],
    [`A monitor is…`,[`A debugger`,`A lock plus condition variables plus the data they protect`,`A hardware timer`,`A type of semaphore`],1,`High-level sync construct.`,'M'],
    [`If signal is called with no waiters…`,[`The next wait returns immediately`,`Nothing happens (signal is lost)`,`Deadlock`,`Error`],1,`CVs have no memory.`,'M'],
    [`In Java, calling wait() without holding the object's lock…`,[`Works`,`Throws IllegalMonitorStateException`,`Deadlocks`,`Is ignored`],1,`Must be in synchronized.`,'M'],
  ],
  quizAdv: [
    [`Under Hoare semantics, after signal…`,[`The signaller keeps running`,`The woken thread runs immediately and the condition is guaranteed true`,`Nobody runs`,`All threads wake`],1,`Mesa is what real systems use.`,'H'],
    [`ArrayBlockingQueue uses two Conditions so that…`,[`It's faster to compile`,`signal() wakes a thread of the right kind (producer vs consumer)`,`It needs no lock`,`It can be unbounded`],1,`No wrong wakeups.`,'H'],
    [`A "lost wakeup" happens when…`,[`A thread is killed`,`Checking the condition and sleeping aren't atomic, so a signal arrives in between`,`notifyAll is used`,`The lock is reentrant`],1,`Classic bug.`,'H'],
  ],
});
