/* 2.3 Concurrency vs parallelism, thread pools, Amdahl's law */
topic('2', { no:'2.3', title:'Concurrency vs parallelism, thread pools and Amdahl\'s law',
idea:`Concurrency is dealing with many things at once; parallelism is doing many things at once. Watch four tasks interleave on one core, run in parallel on two, and then see why a thread pool beats one thread per task, and why 8 cores rarely give 8× speedup.`,
actors:'Workers', dgTitle:'Thread pool', stateTitle:'Numbers',
nodes:{
  q:{x:90,y:110,label:'task queue\nT5 T6 T7 …',w:140,h:60,kind:'mem'},
  w1:{x:280,y:50,label:'worker 1',w:110,h:34,kind:'actor'},
  w2:{x:280,y:110,label:'worker 2',w:110,h:34,kind:'actor'},
  w3:{x:280,y:170,label:'worker 3',w:110,h:34,kind:'actor'},
  out:{x:430,y:110,label:'results',w:100,h:40}
},
edges:[['q','w1'],['q','w2'],['q','w3'],['w1','out'],['w2','out'],['w3','out']],
vb:'0 0 490 220',
codes:{a:`// concurrency on 1 core: tasks interleave
// parallelism on 2 cores: tasks really run at the same time

ExecutorService pool = Executors.newFixedThreadPool(3);   // 3 reusable workers
for (Request r : requests)
    pool.submit(() -> handle(r));        // queued; a free worker picks it up
pool.shutdown();

// Amdahl's law: speedup with N cores when a fraction p can run in parallel
//   S(N) = 1 / ((1 - p) + p / N)
//   p = 0.9, N = 8  →  S = 1 / (0.1 + 0.1125) = 4.7×`},
steps:[
{hl:{}, th:[['A','READY:info',''],['B','READY:info',''],['C','READY:info',''],['D','READY:info','']], d:null, gt:{title:'1 core: concurrency (interleaved)', segs:[['A',0,1],['B',1,2],['C',2,3],['D',3,4],['A',4,5],['B',5,6],['C',6,7],['D',7,8]]}, g:[G('Numbers',['cores','1'],['all 4 finish at','t = 8'],['at any instant','exactly 1 task runs','hot'])],
 say:`Four tasks of 2 units each on <b>one core</b>. The scheduler interleaves them, so all four make progress "at the same time": that's <b>concurrency</b>. But at any instant only one runs. Total time is still 8. Concurrency is about <i>structure</i> (handling many things); it doesn't need multiple cores.`},
{hl:{}, th:[['A','RUN:ok','core 0'],['B','RUN:ok','core 1'],['C','READY:info',''],['D','READY:info','']], gt:{title:'2 cores: parallelism', lanes:[{name:'core 0', segs:[['A',0,2],['C',2,4]]},{name:'core 1', segs:[['B',0,2],['D',2,4]]}]}, g:[G('Numbers',['cores','2'],['core 0','A then C'],['core 1','B then D'],['all finish at','t = 4','ok'])],
 say:`With <b>two cores</b>, two tasks run at literally the same time: <b>parallelism</b>. Core 0 runs A then C; core 1 runs B then D. Everything finishes at t = 4. Parallelism is about <i>execution</i>, and needs hardware with multiple cores.`},
{hl:{pool:[4,5,6]}, th:[['w1','RUN:ok','T1'],['w2','RUN:ok','T2'],['w3','RUN:ok','T3']], gt:null, d:{on:['q','w1','w2','w3'], e:[['q','w1','T1','hot'],['q','w2','T2','hot'],['q','w3','T3','hot']]}, g:[G('Thread per task',['10,000 requests','10,000 threads','bad'],['costs','creation, ~1 MB stack each, scheduler thrash','bad']),G('Thread pool',['threads','3, created once','ok'],['extra tasks','wait in the queue','ok'])],
 say:`A server could start a thread per request, but creating threads costs time, each needs a stack, and thousands of runnable threads mostly fight over the cores. A <b>thread pool</b> creates a fixed set of workers once; tasks go into a queue and free workers take them. The pool size bounds resource use.`},
{hl:{pool:[6]}, th:[['w1','RUN:ok','T4 (reused)'],['w2','RUN:ok','T2'],['w3','RUN:ok','T5 (reused)']], d:{on:['w1','w3','out'], e:[['w1','out','done T1','ok'],['w3','out','done T3','ok'],['q','w1','T4','hot'],['q','w3','T5','hot']]}, g:[G('Sizing',['CPU-bound','≈ number of cores','ok'],['I/O-bound','cores × (1 + wait/compute)','ok'],['e.g. 8 cores, 90% waiting','≈ 8 × (1 + 9) = 80 threads'])],
 say:`When a worker finishes, it takes the next task instead of dying: no creation cost per request. How big? For <b>CPU-bound</b> work, about one thread per core (more just adds switching). For <b>I/O-bound</b> work, threads spend time waiting, so more threads keep cores busy: roughly cores × (1 + wait time / compute time).`},
{hl:{pool:[9,10,11]}, th:[], d:null, g:[G("Amdahl's law (p = 90% parallel)",['2 cores','1.82×'],['4 cores','3.08×'],['8 cores','4.71×','hot'],['∞ cores','10× max','bad'])],
 say:`Why don't 8 cores give 8×? <b>Amdahl's law</b>: if a fraction <code>p</code> of the work can run in parallel and the rest is serial, speedup with N cores is <code>1 / ((1−p) + p/N)</code>. With 90% parallel code, 8 cores give only 4.7×, and even infinite cores cap at 10×. The serial part (locks, coordination, I/O) dominates.`},
{hl:{}, g:[G('Remember',['concurrency','structure: many tasks in progress'],['parallelism','execution: many tasks at once (multicore)'],['pool','bounded workers + queue'],['Amdahl','serial fraction caps speedup at 1/(1−p)'])],
 say:`<b>Say it:</b> "Concurrency is about structuring a program to handle many tasks that are in progress at once; parallelism is about executing several at the same instant on multiple cores. Concurrency is possible on one core. Thread pools reuse a bounded set of threads fed by a queue, avoiding per-task creation cost and oversubscription; size them near the core count for CPU-bound work and larger for I/O-bound work. Amdahl's law says the serial fraction limits speedup to 1/(1−p)."`}
],
keep:[`Concurrency = dealing with many things; parallelism = doing many at once.`,`Concurrency works on 1 core; parallelism needs several.`,`Thread pool = fixed workers + task queue: bounded, no per-task creation.`,`Size: CPU-bound ≈ cores; I/O-bound ≈ cores × (1 + wait/compute).`,`Amdahl: S = 1/((1−p) + p/N); max 1/(1−p).`]}, {
  imp: 'good',
  theory: TH(`Concurrency structures a program as many tasks in progress; parallelism runs tasks simultaneously on several cores; thread pools and Amdahl's law govern how much that actually helps.`,
`<p>One chef juggling four dishes (stir this, check that) is concurrency. Four chefs each cooking a dish is parallelism. A restaurant hires a fixed kitchen crew (thread pool) instead of hiring a new chef for every order and firing them after.</p>
<p>Even with infinite chefs, some steps are serial (one oven, one person plating), and that serial part limits how fast a meal can come out: Amdahl's law.</p>`,
[[`Concurrency`,`Multiple tasks in overlapping time periods (interleaved or parallel).`],[`Parallelism`,`Multiple tasks executing at the same instant.`],[`Thread pool`,`Reusable worker threads consuming a task queue.`],[`Oversubscription`,`More runnable threads than cores: switching overhead.`],[`Amdahl's law`,`Speedup = 1 / ((1−p) + p/N).`],[`Gustafson's law`,`With bigger problems, the parallel part grows, so scaled speedup is better.`]],
[`Split work into independent tasks.`,`Submit them to a pool's queue.`,`Idle workers take tasks; extra tasks wait.`,`Workers return results (futures) and pick up more.`,`Measure: serial parts (locks, shared I/O) bound the speedup.`],
[`Java ExecutorService, ForkJoinPool; Python concurrent.futures; Tomcat's request thread pool.`,`Database connection pools apply the same idea to connections.`,`Profiling lock contention often reveals the "serial fraction".`],
[`Unbounded thread creation under load.`,`Huge pools for CPU-bound work.`,`Expecting linear speedup from more cores.`,`Unbounded task queues hiding overload (latency grows silently).`])
  ,
  examples: [
    {lv:'basic', title:'Interleaving on one core', sim:'sched', input:`# 4 equal tasks, 1 core, small time slices
algo: RR
quantum: 1
A 0 2
B 0 2
C 0 2
D 0 2`, why:`All four progress together (concurrency) but the last finishes at 8: no task got faster. Concurrency improves responsiveness, not raw throughput, on one core.`},
    {lv:'mid', title:'A bounded pool in Java', code:`ThreadPoolExecutor pool = new ThreadPoolExecutor(
    8, 8,                                   // core = max = 8 workers
    0, TimeUnit.SECONDS,
    new ArrayBlockingQueue<>(1000),         // bounded queue
    new ThreadPoolExecutor.CallerRunsPolicy()); // when full: caller runs the task (back-pressure)
Future<Integer> f = pool.submit(() -> compute());
int result = f.get();`, why:`A bounded queue plus a rejection policy turns overload into back-pressure instead of unbounded memory growth. <code>Executors.newFixedThreadPool</code> uses an unbounded queue, a classic production pitfall.`},
    {lv:'adv', title:'Amdahl in numbers', code:`p (parallel)   N=2    N=4    N=8    N=16   N=∞
50%            1.33   1.60   1.78   1.88   2.0
90%            1.82   3.08   4.71   6.40   10
99%            1.98   3.88   7.48   13.9   100`, why:`Even 1% serial code caps speedup at 100×. That's why scalable systems obsess over removing shared locks and coordination.`},
  ],
  tips: {
    say:`"Concurrency is structuring work as multiple tasks in progress, which works even on one core by interleaving. Parallelism is executing tasks at the same instant on multiple cores. Thread pools reuse a bounded set of workers fed by a queue, avoiding thread-creation cost and oversubscription. Amdahl's law says the serial fraction bounds speedup: with 90% parallel code you can never exceed 10×."`,
    points:[`Crisp definitions with the one-core example.`,`Why pools and how to size them.`,`Amdahl's formula and its implication.`],
    traps:[`Using the two words interchangeably.`,`Sizing a CPU-bound pool at 200 threads.`],
    qa:[[`How would you size a thread pool?`,`CPU-bound: about the number of cores (maybe +1). I/O-bound: cores × (1 + wait/compute), then measure. Also respect downstream limits like DB connections.`],
        [`What's wrong with an unbounded queue?`,`Under overload it grows without limit: memory blows up and latency rises silently. Prefer bounded queues and explicit rejection or back-pressure.`],
        [`Gustafson vs Amdahl?`,`Amdahl fixes the problem size; Gustafson notes we usually grow the problem with more cores, so the parallel part dominates and scaled speedup is closer to linear.`]]
  },
  exercises: [
    {lv:'E', q:`Using Amdahl's law, what is the maximum speedup (infinite cores) for a program that is 75% parallel?`, ans:'4', hint:`1 / (1 − p).`, answer:`<p>1 / 0.25 = 4×.</p>`},
    {lv:'M', q:`Speedup with 4 cores if 80% is parallel? Round to 2 decimals.`, ans:'2.5', hint:`1 / (0.2 + 0.8/4).`, answer:`<p>1 / (0.2 + 0.2) = 2.5×.</p>`},
    {lv:'H', q:`A request spends 10 ms computing and 90 ms waiting on a remote service. On an 8-core server, about how many worker threads keep the CPUs busy?`, ans:'80', hint:`cores × (1 + wait/compute).`, answer:`<p>8 × (1 + 90/10) = 80 threads. Beyond that, threads just queue on the CPU.</p>`},
  ],
  quiz: [
    [`Concurrency on a single core is…`,[`Impossible`,`Possible by interleaving tasks`,`The same as parallelism`,`Only for GPUs`],1,`Time slicing.`,'E'],
    [`Parallelism requires…`,[`Threads only`,`Multiple execution units (cores)`,`A thread pool`,`Async I/O`],1,`Simultaneous execution.`,'E'],
    [`A thread pool's main benefit is…`,[`Unlimited threads`,`Reusing a bounded set of threads instead of creating one per task`,`Removing locks`,`Faster CPUs`],1,`Bounded resources.`,'E'],
    [`For CPU-bound tasks, a good pool size is about…`,[`1`,`The number of cores`,`1000`,`Number of tasks`],1,`More just adds switching.`,'M'],
    [`Amdahl's law says speedup is limited by…`,[`Memory`,`The serial fraction of the program`,`Disk speed`,`The compiler`],1,`1/(1−p).`,'M'],
    [`With p = 0.5, the maximum possible speedup is…`,[`2×`,`4×`,`10×`,`Unlimited`],0,`1/(1−0.5).`,'M'],
  ],
  quizAdv: [
    [`Executors.newFixedThreadPool's main pitfall is…`,[`Too few threads`,`An unbounded work queue`,`No reuse`,`It's single-threaded`],1,`LinkedBlockingQueue without bound.`,'H'],
    [`Gustafson's law argues…`,[`Speedup is always 1`,`Scaling the problem size with cores gives near-linear scaled speedup`,`Amdahl is wrong`,`Locks are free`],1,`Different assumption.`,'H'],
    [`CallerRunsPolicy provides…`,[`Faster tasks`,`Back-pressure by running the task on the submitting thread`,`Task dropping`,`Retries`],1,`Slows producers down.`,'H'],
  ],
});
