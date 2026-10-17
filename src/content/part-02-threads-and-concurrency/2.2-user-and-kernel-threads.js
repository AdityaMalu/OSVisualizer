/* 2.2 User-level vs kernel-level threads */
topic('2', { no:'2.2', title:'User threads vs kernel threads: 1:1, N:1, M:N',
idea:`Who schedules a thread: your language runtime or the kernel? Run the same three threads under the many-to-one model (green threads), one-to-one (pthreads, Java platform threads) and many-to-many (Go goroutines, Java virtual threads) and watch what happens when one of them blocks on I/O.`,
actors:'Threads', dgTitle:'Mapping user threads to kernel threads', stateTitle:'Model',
nodes:{
  u1:{x:80,y:40,label:'U1',w:70,h:34,kind:'actor'},
  u2:{x:200,y:40,label:'U2',w:70,h:34,kind:'actor'},
  u3:{x:320,y:40,label:'U3',w:70,h:34,kind:'actor'},
  k1:{x:80,y:160,label:'K1',w:70,h:34,kind:'lock'},
  k2:{x:200,y:160,label:'K2',w:70,h:34,kind:'lock'},
  k3:{x:320,y:160,label:'K3',w:70,h:34,kind:'lock'},
  cpu:{x:420,y:160,label:'2 CPUs',w:80,h:34,kind:'mem'}
},
edges:[],
vb:'0 0 480 200',
codes:{a:`// three tasks; U2 does a blocking read()
U1: compute()
U2: read(socket)        // blocks for 50 ms
U3: compute()

// N:1  green threads: runtime switches U1..U3 on ONE kernel thread
// 1:1  pthreads / Java platform threads: each Ux is its own kernel thread
// M:N  goroutines / Java virtual threads: many Ux multiplexed on a few Kx;
//      a blocking call parks Ux and frees its Kx for another`},
steps:[
{hl:{U1:[2],U2:[3],U3:[4]}, th:[['U1','READY:info',''],['U2','READY:info',''],['U3','READY:info','']], d:{on:['u1','u2','u3'], hide:['k2','k3'], e:[['u1','k1','','hot'],['u2','k1','','hot'],['u3','k1','','hot']]}, g:[G('Model',['N:1','many user threads → 1 kernel thread','hot'],['scheduled by','the user-space runtime library'])],
 say:`A <b>user-level thread</b> is managed by a library inside the process; the kernel doesn't know it exists. In the <b>many-to-one</b> model (early Java "green threads", GNU Pth), all user threads run on a single kernel thread. Switching between them is just a function call in user space: extremely cheap.`},
{hl:{U2:[3]}, th:[['U1','READY:bad','stuck'],['U2','BLOCKED:bad','read() blocked the kernel thread'],['U3','READY:bad','stuck']], d:{on:['k1'], bad:['k1'], hide:['k2','k3'], e:[['u1','k1','','dim'],['u2','k1','blocks','bad'],['u3','k1','','dim']]}, g:[G('N:1 problems',['one blocking syscall','blocks every thread','bad'],['multicore','no parallelism: 1 kernel thread = 1 CPU at a time','bad'])], log:['U2: read() → whole process sleeps 50 ms'],
 say:`Then U2 calls a blocking <code>read()</code>. The kernel sees only one thread, so it puts the whole thing to sleep: U1 and U3 are stuck although they're ready. And with one kernel thread, the process can never use two CPUs. These two flaws killed pure N:1.`},
{hl:{U2:[3]}, th:[['U1','RUN:ok','on CPU 0'],['U2','BLOCKED:warn','only U2 waits'],['U3','RUN:ok','on CPU 1']], d:{on:['k1','k2','k3','cpu'], e:[['u1','k1','','ok'],['u2','k2','blocks','bad'],['u3','k3','','ok']]}, g:[G('Model',['1:1','each user thread = one kernel thread','hot'],['used by','Linux pthreads, Windows, Java platform threads'],['pros','blocking is per thread; true parallelism','ok'],['cons','kernel creation/switch cost; ~1 MB stack each; thousands, not millions','bad'])],
 say:`In <b>one-to-one</b> (Linux pthreads, Windows threads, classic Java threads), every thread is a kernel thread. U2's <code>read()</code> blocks only U2; U1 and U3 run in parallel on two CPUs. The cost: creation and switching go through the kernel, and each thread reserves a big stack, so 10,000 threads is fine but a million isn't.`},
{hl:{U2:[3]}, th:[['U1','RUN:ok','on K1'],['U2','WAITING:warn','parked by runtime'],['U3','RUN:ok','moved onto K2']], d:{on:['k1','k2','cpu'], hide:['k3'], e:[['u1','k1','','ok'],['u2','k2','parked','dim'],['u3','k2','','hot']]}, g:[G('Model',['M:N','many user threads on a few kernel threads','hot'],['used by','Go goroutines, Java 21 virtual threads, Erlang'],['blocking call','runtime parks the user thread, reuses the kernel thread','ok'],['scale','millions of tiny threads (KB stacks)','ok'])], log:['U2 parked on netpoller; K2 picks up U3'],
 say:`<b>Many-to-many</b> (Go, Java 21 virtual threads, Erlang) gets both benefits. The runtime multiplexes many cheap user threads over a few kernel threads (about one per core). When U2 does network I/O, the runtime <b>parks</b> U2 (using non-blocking I/O + epoll underneath) and runs U3 on that kernel thread. Millions of goroutines are routine.`},
{hl:{}, th:[], d:null, g:[G('Compare',['N:1','cheap, but no parallelism; one block blocks all'],['1:1','simple, parallel; heavier threads'],['M:N','cheap + parallel; complex runtime (needs non-blocking I/O everywhere)','ok']),G('Gotcha in M:N',['a blocking call the runtime can\'t intercept','pins the carrier thread (e.g. JNI, synchronized in early Loom)','bad'])],
 say:`<b>Say it:</b> "User threads are managed by a runtime in user space; kernel threads are scheduled by the OS. Many-to-one is cheap but one blocking call blocks all and there's no parallelism. One-to-one, used by pthreads and Java platform threads, gives parallelism and independent blocking but threads are heavyweight. Many-to-many, like Go goroutines and Java virtual threads, multiplexes many lightweight threads on a few kernel threads and parks them on blocking I/O."`}
],
keep:[`User threads: runtime-scheduled, kernel unaware. Kernel threads: OS-scheduled.`,`N:1: cheap but one block blocks all, no multicore.`,`1:1: pthreads/Java platform threads; parallel, heavier.`,`M:N: goroutines/virtual threads; cheap + parallel, smart runtime.`,`Virtual threads shine for I/O-bound work, not CPU-bound.`]}, {
  imp: 'good',
  theory: TH(`Threads can be scheduled by the kernel, by a user-space runtime, or both; the mapping (1:1, N:1, M:N) decides cost, parallelism and what happens when a thread blocks.`,
`<p>Picture a restaurant with a few waiters (kernel threads) and many tables (user threads). In N:1 there's one waiter; if they go to the kitchen and wait for a dish, every table waits. In 1:1 every table gets its own waiter: great service, huge payroll. In M:N a few waiters serve many tables and never stand idle at the kitchen; they drop an order and serve someone else until it's ready.</p>
<p>The OS only schedules kernel threads. Anything lighter must be scheduled by a runtime, which needs to avoid blocking the kernel thread underneath, usually by turning blocking calls into non-blocking ones plus an event loop (epoll).</p>`,
[[`User-level thread`,`Thread managed by a user-space library/runtime.`],[`Kernel-level thread`,`Thread known to and scheduled by the OS.`],[`Many-to-one (N:1)`,`All user threads on one kernel thread.`],[`One-to-one (1:1)`,`Each user thread is a kernel thread.`],[`Many-to-many (M:N)`,`User threads multiplexed onto a pool of kernel threads.`],[`Carrier thread`,`Kernel thread currently running a virtual thread (Java).`],[`Pinning`,`A virtual thread blocking its carrier so it can't be reused.`]],
[`The runtime keeps its own run queue of user threads.`,`It runs them on carrier (kernel) threads, switching in user space at yield points.`,`On a blocking I/O call, M:N runtimes park the user thread and register the I/O with epoll.`,`When I/O is ready, the user thread is put back in the runtime's run queue.`,`The kernel only sees the carrier threads.`],
[`Java 21 virtual threads let thread-per-request servers scale to millions of concurrent requests.`,`Go servers spawn a goroutine per connection.`,`Thread pools in 1:1 systems exist because kernel threads are expensive.`],
[`Using virtual threads for CPU-heavy work and expecting speedups.`,`Blocking a carrier with native calls or long synchronized blocks.`,`Assuming green threads give multicore parallelism.`])
  ,
  examples: [
    {lv:'basic', title:'Java: platform vs virtual threads', code:`// 1:1  platform thread: a real OS thread
Thread t = new Thread(() -> handle(request));
t.start();

// M:N  virtual thread (Java 21): scheduled by the JVM on carrier threads
Thread v = Thread.ofVirtual().start(() -> handle(request));

try (var ex = Executors.newVirtualThreadPerTaskExecutor()) {
    for (int i = 0; i < 1_000_000; i++) ex.submit(() -> sleepAndReply());
}   // a million concurrent tasks on ~#cores carrier threads`, why:`A million platform threads would need ~1 TB of stack reservations; a million virtual threads are fine because they park on blocking calls and have small, growable stacks.`},
    {lv:'mid', title:'Go: goroutines on GOMAXPROCS kernel threads', code:`func main() {
    runtime.GOMAXPROCS(4)                 // at most 4 threads run Go code at once
    for i := 0; i < 100000; i++ {
        go func(n int) { time.Sleep(time.Second); _ = n }(i)
    }
    time.Sleep(2 * time.Second)
    fmt.Println(runtime.NumGoroutine())   // 100000 goroutines existed concurrently
}`, why:`100k goroutines start in milliseconds with ~2 KB stacks each. The runtime parks sleeping ones and schedules the rest across 4 OS threads.`},
    {lv:'adv', title:'Pinning a virtual thread', code:`// early Java 21: blocking inside synchronized pins the carrier
synchronized (lock) {
    socket.getInputStream().read(buf);    // carrier can't be released → fewer carriers for others
}
// fix (pre JDK 24): use ReentrantLock instead of synchronized around blocking I/O
lock.lock(); try { socket.getInputStream().read(buf); } finally { lock.unlock(); }
// diagnose: -Djdk.tracePinnedThreads=full`, why:`M:N only works if blocking calls can be intercepted. Monitors (synchronized) in early versions and native code can't be, so they hold the kernel thread hostage. JDK 24 removed most synchronized pinning.`},
  ],
  tips: {
    say:`"User threads are scheduled by a runtime in user space and the kernel doesn't see them; kernel threads are scheduled by the OS. Many-to-one is cheap but can't use multiple cores and one blocking call blocks everything. One-to-one, as with pthreads and Java platform threads, gives true parallelism but each thread is expensive. Many-to-many, like goroutines and Java virtual threads, multiplexes millions of cheap threads onto a few kernel threads and parks them on blocking I/O."`,
    points:[`Define both kinds of thread.`,`Name each model with a real example.`,`Explain the blocking problem and how M:N solves it.`],
    traps:[`Saying virtual threads make CPU-bound code faster.`,`Calling Linux pthreads user-level threads.`],
    qa:[[`When are virtual threads not helpful?`,`CPU-bound work: you still have only as many cores. They help when most time is spent waiting (I/O-bound, high concurrency).`],
        [`Why is a kernel thread "heavy"?`,`Kernel data structures, a fixed stack reservation (often 1–8 MB virtual), and every switch goes through the kernel scheduler.`],
        [`How does an M:N runtime avoid blocking on I/O?`,`It uses non-blocking sockets and an event mechanism (epoll/kqueue/IOCP); the user thread is parked until the fd is ready, then rescheduled.`]]
  },
  exercises: [
    {lv:'E', q:`Which model do Linux pthreads use: N:1, 1:1 or M:N?`, ans:'1:1', hint:`Each pthread is a task in the kernel.`, answer:`<p>1:1 (NPTL).</p>`},
    {lv:'M', q:`A process uses N:1 threads with 8 user threads on a 4-core machine. At most how many can execute at the same instant?`, ans:'1', hint:`How many kernel threads?`, answer:`<p>1: there's a single kernel thread.</p>`},
    {lv:'H', q:`A Java service handles 50,000 concurrent requests, each waiting ~200 ms on a database. Compare a 200-thread pool of platform threads with virtual threads.`, hint:`Little's law: concurrency = throughput × latency.`, answer:`<p>200 platform threads × (1 / 0.2 s) = at most ~1,000 requests/s; the rest queue. Virtual threads let all 50,000 wait concurrently (the DB pool becomes the limit), so throughput is bounded by the database, not threads. Memory: 50k platform threads would need GBs of stack; virtual threads need far less.</p>`},
  ],
  quiz: [
    [`User-level threads are scheduled by…`,[`The kernel`,`A runtime/library in user space`,`The CPU`,`The disk`],1,`Kernel is unaware.`,'E'],
    [`In many-to-one, a blocking syscall…`,[`Blocks one thread`,`Blocks all user threads of the process`,`Is impossible`,`Speeds up`],1,`One kernel thread.`,'E'],
    [`Linux pthreads are…`,[`N:1`,`1:1`,`M:N`,`Not threads`],1,`NPTL.`,'E'],
    [`Go goroutines use…`,[`1:1`,`N:1`,`M:N`,`Processes`],2,`GOMAXPROCS kernel threads.`,'M'],
    [`Java virtual threads mainly help…`,[`CPU-bound code`,`I/O-bound code with high concurrency`,`GPU code`,`Startup time`],1,`Waiting is cheap.`,'M'],
    [`A drawback of 1:1 is…`,[`No parallelism`,`Each thread is relatively expensive`,`One block blocks all`,`No preemption`],1,`Kernel structures, big stacks.`,'M'],
  ],
  quizAdv: [
    [`"Pinning" a virtual thread means…`,[`Pinning to a CPU`,`It can't unmount from its carrier during a blocking call`,`It never runs`,`It's garbage collected`],1,`Carrier blocked.`,'H'],
    [`M:N runtimes avoid blocking carriers by…`,[`Busy-waiting`,`Using non-blocking I/O plus epoll/kqueue and parking`,`Disabling I/O`,`Using signals`],1,`Event-driven under the hood.`,'H'],
    [`Why did early Solaris/Java drop green threads?`,[`Licensing`,`No multicore parallelism and blocking problems`,`Too fast`,`Unix forbids them`],1,`N:1 limits.`,'H'],
  ],
});
