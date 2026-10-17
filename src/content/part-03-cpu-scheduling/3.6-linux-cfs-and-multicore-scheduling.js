/* 3.6 Linux CFS and multicore scheduling */
topic('3', { no:'3.6', title:'Real schedulers: Linux CFS, fair share and multicore',
idea:`Linux's Completely Fair Scheduler doesn't use fixed queues or quanta: it tracks how much CPU each task has had (virtual runtime) and always runs the one that has had the least. Step through vruntime accounting with different nice values, then spread tasks over cores with per-CPU run queues, load balancing and affinity.`,
actors:'Tasks', tbTitle:'Run queue (sorted by vruntime)', stateTitle:'CFS',
codes:{a:`// CFS (simplified): a red-black tree ordered by vruntime
pick_next():  return leftmost task in the tree   // smallest vruntime

on tick for running task t:
    t.vruntime += delta_exec * (1024 / t.weight)  // nice 0 → weight 1024
    if (t.vruntime > leftmost.vruntime + granularity) reschedule()

slice(t) = sched_latency * t.weight / total_weight // e.g. 6 ms shared by all
// nice -1 ≈ weight ×1.25: each nice step ≈ 10% more/less CPU

// multicore: one run queue per CPU, periodic load balancing,
// tasks prefer to stay on their CPU (warm cache); taskset sets affinity`},
steps:[
{hl:{cfs:[2]}, th:[['A','RUN:ok','nice 0, vruntime 0'],['B','READY:info','nice 0, vruntime 0']], tb:[TB('run queue',['task','nice','weight','vruntime'],[['A','0','1024','0'],['B','0','1024','0']],{0:'hot'})], g:[G('CFS',['idea','run the task that has had the least CPU','hot'],['data structure','red-black tree keyed by vruntime'],['pick','leftmost node: O(1) cached'])],
 say:`CFS models an "ideal fair CPU" on which n tasks each get exactly 1/n of the time. It keeps each task's <b>virtual runtime</b> (vruntime): how much CPU it has had, scaled by its weight. Runnable tasks sit in a red-black tree ordered by vruntime, and CFS always runs the <b>leftmost</b> one, the task that has had the least.`},
{hl:{cfs:[4,5,6]}, th:[['A','READY:info','vruntime 3'],['B','RUN:ok','now the smallest']], gt:GT(3,['A',0,3]), tb:[TB('run queue',['task','nice','weight','vruntime'],[['B','0','1024','0'],['A','0','1024','3']],{0:'hot'})],
 say:`A runs 3 ms; with weight 1024 (nice 0) its vruntime grows by exactly 3. Now B has the smaller vruntime, so B runs. Two equal tasks alternate and get 50% each. No fixed quantum: the slice is the target latency (e.g. 6 ms) divided among runnable tasks, with a minimum granularity.`},
{hl:{cfs:[5,8,9]}, th:[['A','READY:info','nice 0'],['C','RUN:ok','nice 5: vruntime grows ~3× faster']], gt:GT(12,['A',0,3],['B',3,6],['A',6,9],['C',9,12]), tb:[TB('run queue after C ran 3 ms',['task','nice','weight','vruntime'],[['A','0','1024','6'],['B','0','1024','6'],['C','5','335','+9.2']],{2:'hot'})], g:[G('Weights',['nice 0','1024'],['nice 5','335 (≈ 1/3 of the CPU of nice 0)'],['nice −5','3121'])],
 say:`Now add C with <code>nice 5</code> (weight 335). When C runs 3 ms, its vruntime grows by 3 × 1024/335 ≈ 9.2, three times faster than a nice-0 task. So C is picked about a third as often: nice changes the <b>share</b> of CPU, not a strict order. Each nice step is about 10% difference.`},
{th:[['editor','RUN:ok','woke up after sleeping'],['compile','READY:info','vruntime high']], gt:null, tb:[TB('run queue',['task','vruntime','note'],[['editor','≈ min_vruntime − bonus','woke from sleep: placed near the left','ok'],['compile','high','has used lots of CPU']],{0:'ok'})], g:[G('Interactive tasks',['sleepers','accumulate little vruntime','ok'],['on wakeup','placed near the left → run soon','ok'],['no explicit','interactivity heuristics needed'])],
 say:`Interactivity falls out naturally: an editor that mostly sleeps accumulates little vruntime, so when a keypress wakes it, it's near the left of the tree and runs almost immediately. (On wakeup its vruntime is set close to the queue's minimum so it can't hoard credit from a long sleep.) Linux 6.6 replaced CFS's picking rule with EEVDF, which adds latency deadlines, but the fairness idea is the same.`},
{hl:{cfs:[11,12]}, th:[['T1','RUN:ok','CPU 0'],['T2','RUN:ok','CPU 1'],['T3','READY:info','CPU 0 queue'],['T4','READY:info','CPU 0 queue']], gt:{title:'per-CPU run queues before balancing', lanes:[{name:'CPU 0', segs:[['T1',0,2],['T3',2,4],['T4',4,6]]},{name:'CPU 1', segs:[['T2',0,2],['idle',2,6]]}]}, g:[G('Multicore',['one run queue per CPU','no global lock','ok'],['imbalance','CPU 0 has 3 tasks, CPU 1 idles','bad'])],
 say:`On multicore machines a single shared queue would need a global lock and would bounce tasks between caches. So each CPU has its <b>own run queue</b>. That creates <b>imbalance</b>: here CPU 0 has three tasks while CPU 1 sits idle.`},
{th:[['T1','RUN:ok','CPU 0'],['T2','RUN:ok','CPU 1'],['T3','RUN:ok','migrated to CPU 1'],['T4','READY:info','CPU 0']], gt:{title:'after load balancing (pull migration)', lanes:[{name:'CPU 0', segs:[['T1',0,2],['T4',2,4]]},{name:'CPU 1', segs:[['T2',0,2],['T3',2,4]]}]}, g:[G('Balancing',['pull','idle CPU steals work','ok'],['push','periodic balancer moves tasks from busy CPUs'],['affinity','prefer staying: warm caches; taskset pins'],['NUMA','prefer the node holding the task\'s memory'])],
 say:`<b>Load balancing</b> fixes it: an idle CPU <b>pulls</b> a task from a busy one, and a periodic balancer <b>pushes</b> when queues are uneven. Migration has a cost (cold caches), so the scheduler prefers to keep a task where it ran (<b>soft affinity</b>); <code>taskset</code> sets <b>hard affinity</b>. On NUMA machines it also tries to keep tasks near their memory.`},
{gt:null, th:[], tb:[], g:[G('Linux classes (highest first)',['SCHED_DEADLINE','EDF real-time'],['SCHED_FIFO / SCHED_RR','fixed real-time priorities'],['SCHED_NORMAL','CFS/EEVDF, nice −20…19','hot'],['SCHED_IDLE','only when nothing else runs'])],
 say:`<b>Say it:</b> "Linux's CFS gives each task a virtual runtime, the CPU time it has received scaled by its weight from nice, and always runs the task with the smallest vruntime from a red-black tree. That gives proportional fair sharing and naturally favours tasks that sleep a lot. On multicore, each CPU has its own run queue; load balancing migrates tasks between them while respecting cache and NUMA affinity. Real-time classes sit above CFS."`}
],
keep:[`CFS: run the task with the smallest vruntime (red-black tree, leftmost).`,`vruntime += runtime × 1024 / weight; nice changes weight (~10%/step).`,`No fixed quantum: target latency split among runnable tasks.`,`Sleepers get low vruntime → good interactivity.`,`Multicore: per-CPU queues + load balancing; affinity keeps caches warm.`]}, {
  imp: 'good',
  theory: TH(`Linux's CFS shares the CPU in proportion to task weights by always running the task with the least weighted CPU time so far; on multicore systems per-CPU run queues are kept balanced while preserving cache affinity.`,
`<p>Imagine kids sharing a games console, each with a stopwatch that measures how long they've played. Whoever has played least gets the controller next. If one kid is younger (higher weight), their stopwatch runs slower, so they get more turns. A kid who was off playing outside comes back with little time on their stopwatch and gets the controller quickly.</p>
<p>That's CFS. With several consoles (cores), each has its own queue of kids, and a parent occasionally moves kids from the long queue to the short one, preferring not to move a kid who's in the middle of a game (cache affinity).</p>`,
[[`CFS`,`Completely Fair Scheduler, Linux's default 2.6.23–6.5.`],[`EEVDF`,`Earliest eligible virtual deadline first, CFS's successor (6.6+).`],[`vruntime`,`Weighted CPU time received.`],[`Weight`,`Derived from nice; nice 0 = 1024.`],[`Target latency`,`Period within which every runnable task should run once.`],[`Load balancing`,`Moving tasks between CPU run queues.`],[`Affinity`,`Preference (soft) or restriction (hard) to run on certain CPUs.`],[`NUMA`,`Memory is closer to some CPUs than others.`]],
[`Each CPU keeps runnable tasks in a red-black tree by vruntime.`,`The leftmost task runs; its vruntime increases as it runs, weighted by nice.`,`When it's no longer the smallest (beyond a granularity), the scheduler switches.`,`Waking tasks get a vruntime near the queue minimum.`,`Periodically and when idle, CPUs balance load by migrating tasks.`],
[`nice/renice and cgroups cpu.weight control CPU shares for services and containers.`,`cgroup cpu.max (quota) enforces hard limits; throttling shows up as latency spikes.`,`Pinning with taskset/isolcpus for latency-critical workloads.`],
[`Thinking nice is a strict priority under CFS.`,`Ignoring cgroup throttling when diagnosing latency in containers.`,`Over-pinning threads and preventing load balancing.`])
  ,
  examples: [
    {lv:'basic', title:'Two nice values sharing one CPU', code:`$ taskset -c 0 sh -c 'yes > /dev/null' &            # nice 0
$ taskset -c 0 nice -n 5 sh -c 'yes > /dev/null' &  # nice 5
$ top -p $(pgrep -d, yes)
  PID  NI  %CPU  COMMAND
 5001   0  75.3  yes
 5002   5  24.6  yes`, why:`Weights 1024 vs 335: shares are 1024/1359 ≈ 75% and 335/1359 ≈ 25%. Both run; nice changes proportions.`},
    {lv:'mid', title:'CPU limits for containers', code:`# cgroup v2: give the container half the CPU weight and at most 1.5 CPUs
$ echo 50 > /sys/fs/cgroup/app/cpu.weight          # default 100
$ echo "150000 100000" > /sys/fs/cgroup/app/cpu.max # 150 ms per 100 ms period
$ cat /sys/fs/cgroup/app/cpu.stat | grep throttled
nr_throttled 4120
throttled_usec 98123000`, why:`Kubernetes CPU requests map to weights and limits to cpu.max. Many throttled periods mean the quota is too tight, a common cause of p99 latency spikes.`},
    {lv:'adv', title:'Affinity and migration', code:`$ taskset -pc 2,3 4242           # restrict pid 4242 to CPUs 2 and 3
$ perf stat -e migrations,context-switches -p 4242 -- sleep 10
      1,204  migrations
     88,310  context-switches
$ numactl --cpunodebind=0 --membind=0 ./db    # keep CPU and memory on NUMA node 0`, why:`Migrations cost cache warmth; NUMA misplacement can cost far more (remote memory). Pin carefully: pinning too tightly prevents the balancer from helping.`},
  ],
  tips: {
    say:`"CFS tracks each task's virtual runtime, its CPU time scaled by its weight from the nice value, and always runs the task with the smallest vruntime from a red-black tree. This gives proportional fairness and interactive tasks, which sleep a lot, naturally run soon after waking. On multicore, each CPU has a run queue and the kernel balances load, preferring to keep tasks on the same CPU for cache affinity. Linux 6.6 moved to EEVDF, which keeps the fairness and adds latency deadlines."`,
    points:[`vruntime and the red-black tree.`,`nice → weight → share.`,`Per-CPU queues, balancing and affinity.`],
    traps:[`Describing CFS with fixed time quanta.`,`Saying nice 19 never runs.`],
    qa:[[`Why a red-black tree?`,`Insert/remove in O(log n) and the leftmost (minimum) node is cached, so picking the next task is O(1).`],
        [`Why per-CPU run queues instead of one global queue?`,`A global queue needs a lock contended by every CPU and loses cache affinity; per-CPU queues scale, at the cost of balancing.`],
        [`What is processor affinity?`,`A task's preference (soft) or restriction (hard, via taskset/sched_setaffinity) to run on particular CPUs, to keep caches warm or isolate workloads.`]]
  },
  exercises: [
    {lv:'E', q:`Under CFS, which task runs next: A (vruntime 120), B (95), C (101)?`, ans:'B', hint:`Leftmost in the tree.`, answer:`<p>B, the smallest vruntime.</p>`},
    {lv:'M', q:`Two CPU-bound tasks share one CPU: weights 1024 (nice 0) and 3121 (nice −5). What percentage of the CPU does the nice 0 task get? (round to whole number)`, ans:'25', hint:`1024 / (1024 + 3121).`, answer:`<p>1024 / 4145 ≈ 24.7% ≈ 25%.</p>`},
    {lv:'H', q:`A container has cpu.max "50000 100000" and its service needs 80 ms of CPU to handle a burst that arrives at the start of a period. When does it finish, in ms after the burst?`, ans:'130', hint:`50 ms per 100 ms period.`, answer:`<p>It runs 50 ms, is throttled for the remaining 50 ms of the period, then runs 30 ms in the next period: 100 + 30 = 130 ms. Throttling turns an 80 ms job into 130 ms of latency.</p>`},
  ],
  quiz: [
    [`CFS always runs the task with…`,[`The highest nice`,`The smallest virtual runtime`,`The oldest PID`,`The most memory`],1,`Least CPU received so far.`,'E'],
    [`CFS keeps runnable tasks in…`,[`A FIFO`,`A red-black tree`,`A hash table`,`A stack`],1,`Ordered by vruntime.`,'E'],
    [`A higher nice value…`,[`Gives more CPU`,`Gives a smaller CPU share`,`Makes it real-time`,`Pins it`],1,`Lower weight.`,'E'],
    [`Why does CFS favour interactive tasks?`,[`Explicit heuristics`,`They sleep a lot, so their vruntime stays low`,`They have lower PIDs`,`They use less memory`],1,`Falls out of fairness.`,'M'],
    [`Multicore Linux uses…`,[`One global run queue`,`A run queue per CPU plus load balancing`,`No queues`,`One queue per process`],1,`Scalability.`,'M'],
    [`Processor affinity mainly preserves…`,[`Disk space`,`Warm caches`,`File handles`,`Priorities`],1,`Migration is costly.`,'M'],
  ],
  quizAdv: [
    [`In CFS, vruntime grows faster for…`,[`Lower-weight (higher nice) tasks`,`Higher-weight tasks`,`Real-time tasks`,`Sleeping tasks`],0,`delta × 1024/weight.`,'H'],
    [`Linux 6.6 replaced CFS's picking logic with…`,[`MLFQ`,`EEVDF`,`O(1)`,`BFS`],1,`Earliest eligible virtual deadline first.`,'H'],
    [`cgroup cpu.max throttling usually shows up as…`,[`High memory`,`Tail latency spikes`,`Disk errors`,`More page faults`],1,`Quota exhausted mid-period.`,'H'],
  ],
});
