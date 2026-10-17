/* 10.4 Debugging a slow or stuck machine */
topic('10', { no:'10.4', title:'Debugging a slow machine: load, CPU, memory, I/O',
idea:`"The server is slow." Work the problem like an on-call engineer with the USE method (utilisation, saturation, errors): read load average correctly, split CPU time into user, system and iowait, spot memory pressure and the OOM killer, and find the disk that everything is waiting on.`,
actors:'Signals', tbTitle:'What the tools say', stateTitle:'Diagnosis',
codes:{a:`$ uptime                     # load average: runnable + uninterruptible tasks
 10:42  up 31 days,  load average: 18.20, 17.95, 9.10      (8 cores)
$ vmstat 1                   # r = runnable, b = blocked on I/O, si/so = swap
 r  b   swpd  free  si  so   bi    bo   us sy id wa
 2 16 410000  9800 900 1200 52000 31000  6  4  8 82
$ iostat -x 1                # per-disk utilisation and latency
Device  r/s   w/s  r_await w_await  aqu-sz  %util
nvme0n1 812  540    48.1    61.7     71.3   100.0
$ dmesg -T | grep -i -E 'oom|killed process'
$ top / pidstat 1 / ps -eo state,pid,cmd | grep '^D'`},
steps:[
{hl:{t:[1,2]}, tb:[TB('uptime',['1 min','5 min','15 min','cores'],[['18.2','17.95','9.1','8']],{0:'hot'})], g:[G('Diagnosis',['load 18 on 8 cores','more demand than capacity','hot'],['trend','1-min ≫ 15-min: it started recently'],['careful','Linux load counts D state (I/O wait), not just CPU'])],
 say:`Start with <code>uptime</code>. Load average is the average number of tasks that are <b>runnable</b> or in <b>uninterruptible sleep</b> (D state) over 1, 5 and 15 minutes. 18 on an 8-core box means demand exceeds capacity, and 1-min ≫ 15-min means it began in the last few minutes. But on Linux, high load can be <b>I/O</b>, not CPU (1.2). Don't stop here.`},
{hl:{t:[3,4,5]}, tb:[TB('vmstat 1',['r','b','si / so','us','sy','id','wa'],[['2','16','900 / 1200 KB/s','6%','4%','8%','82%']],{0:'bad'})], g:[G('Diagnosis',['r = 2','few tasks actually want CPU','ok'],['b = 16','16 tasks blocked on I/O','bad'],['wa = 82%','CPU idle, waiting for I/O','bad'],['si/so ≠ 0','swapping!','bad'])],
 say:`<code>vmstat</code> splits it: only 2 runnable (r) but 16 <b>blocked</b> (b), and the CPU is 82% <b>iowait</b> (idle while I/O is outstanding). Users and system time are tiny. This is not a CPU problem. Non-zero <b>si/so</b> means the machine is swapping pages in and out: memory pressure is generating disk I/O, the thrashing of 7.4.`},
{hl:{t:[6,7,8]}, tb:[TB('iostat -x',['device','r_await','w_await','aqu-sz','%util'],[['nvme0n1','48 ms','62 ms','71','100%']],{0:'bad'})], g:[G('Diagnosis',['utilisation','100% busy','bad'],['saturation','71 requests queued; 50–60 ms latency (normally < 1 ms)','bad'],['USE method','Utilisation, Saturation, Errors for every resource'])],
 say:`<code>iostat -x</code> confirms it: the disk is 100% utilised with a queue of 71 requests and ~50–60 ms latency, on an NVMe drive that normally answers in under a millisecond. This is the <b>USE method</b> in action: for each resource (CPU, memory, disk, network) check utilisation, saturation (queueing) and errors.`},
{hl:{t:[9,10]}, tb:[TB('memory',['signal','value'],[['free -h available','180 MB of 32 GB'],['swap in/out','~2 MB/s'],['dmesg','Out of memory: Killed process 9133 (java) anon-rss:21GB'],['PSI memory full','40%']],{2:'bad'})], g:[G('Diagnosis',['root cause','a java process grew to 21 GB','bad'],['chain','RAM exhausted → page cache evicted + swapping → disk saturated → everyone waits on I/O'],['OOM killer','eventually killed the biggest offender'])], log:['Out of memory: Killed process 9133 (java) total-vm:24.1GB, anon-rss:21.3GB'],
 say:`Now look at memory. Almost nothing is available, swap is active, and <code>dmesg</code> shows the <b>OOM killer</b> already killed a 21 GB java process. The story: one process's memory grew (a leak or an oversized heap), the kernel evicted page cache and swapped (so normal reads now hit the disk), the disk saturated, and every request blocked in D state, inflating load average. CPU was never the problem.`},
{hl:{t:[10]}, tb:[TB('other patterns',['symptom','likely cause','check'],[['high us, r ≫ cores','CPU-bound code','top, perf top, flame graph'],['high sy','syscall/lock storm, too many context switches','perf, pidstat -w, strace -c'],['high wa, b ≫ 0','slow or saturated storage','iostat -x, iotop'],['load high, CPU low, D-state procs','NFS/disk hang','ps state D, /proc/PID/stack'],['steal (st) > 0 in a VM','noisy neighbour on the host','vmstat st column']],{0:'hot'})], g:[G('Diagnosis',['always','read several signals before concluding'])],
 say:`Other common shapes: high <b>us</b> with many runnable tasks is CPU-bound code (profile it); high <b>sy</b> points at syscall storms, lock contention or too many context switches (1.5); high <b>wa</b> with blocked tasks is storage; high load with idle CPU and D-state processes is a hung disk or NFS mount; and in a VM, <b>steal</b> time means the hypervisor gave your CPU to someone else (10.1).`},
{tb:[], g:[G('Fixes for this incident',['now','restart / cap the leaking service (memory limit, -Xmx)','ok'],['soon','find the leak (heap dump), right-size limits','ok'],['prevent','alerts on memory pressure (PSI), swap usage, disk latency','ok'])],
 say:`<b>Say it:</b> "I'd check load average, remembering that on Linux it includes tasks blocked on I/O, then split CPU time with vmstat or top into user, system, iowait and steal. Low CPU with high iowait and blocked tasks points to I/O, so I'd check iostat for utilisation and queueing, and memory for swapping or OOM-killer events. Here a memory leak caused swapping and cache eviction, which saturated the disk and blocked everything. I'd mitigate by restarting or limiting the process, then find the leak, and add alerts on memory pressure and disk latency."`}
],
keep:[`Load average = runnable + D-state tasks (Linux): not just CPU.`,`vmstat: r vs b, us/sy/id/wa/st, si/so.`,`iostat -x: %util + queue + await → disk saturation.`,`Memory pressure → swapping/cache loss → I/O storm; dmesg for OOM kills.`,`USE method: utilisation, saturation, errors per resource.`]}, {
  imp: 'good',
  theory: TH(`Diagnosing a slow system means reading OS signals, load, CPU breakdown, memory pressure and I/O saturation, together, rather than trusting any single number.`,
`<p>A doctor doesn't diagnose from temperature alone. Load average is the temperature: it tells you something's wrong, not what. CPU breakdown, memory and disk statistics are the blood tests that locate the problem.</p>
<p>Almost every concept in this stepper shows up in these tools: process states (D and R), scheduling and context switches, page faults and swapping, the page cache, block I/O queues, cgroup throttling and VM steal time.</p>`,
[[`Load average`,`Moving average of runnable + uninterruptible tasks.`],[`iowait (wa)`,`CPU idle while I/O is outstanding.`],[`Steal (st)`,`Time a VM's vCPU wanted to run but the hypervisor didn't schedule it.`],[`Saturation`,`Work queued because a resource is full (run queue, disk queue).`],[`USE method`,`Utilisation, saturation, errors for each resource (Brendan Gregg).`],[`PSI`,`Pressure stall information: time lost waiting for CPU, memory, I/O.`],[`OOM killer`,`Kills a process when memory can't be reclaimed.`]],
[`uptime: is there excess demand, and since when?`,`vmstat/top: is it CPU (us/sy), I/O (wa, b), memory (si/so), or steal?`,`Drill into the resource: iostat -x, free/PSI, perf, pidstat.`,`Find the process responsible: top, iotop, pidstat, dmesg.`,`Mitigate, then fix the root cause and add monitoring.`],
[`Linux performance analysis in 60 seconds (Netflix): uptime, dmesg, vmstat, mpstat, pidstat, iostat, free, sar, top.`,`Kubernetes: kubectl top, cgroup throttling and OOMKilled events.`,`Flame graphs (perf + FlameGraph) for CPU-bound code.`],
[`Assuming high load = CPU bound.`,`Treating "free memory is low" as a problem when it's page cache.`,`Fixing symptoms (restart) without capturing evidence (heap dump, logs).`])
  ,
  examples: [
    {lv:'basic', title:'CPU-bound vs I/O-bound in vmstat', code:`# CPU-bound: many runnable, user time high, no iowait
 r  b   us sy id wa
14  0   92  6  2  0
# I/O-bound: few runnable, many blocked, iowait high
 r  b   us sy id wa
 1 12    3  2 10 85`, why:`The same load average (~14) can mean opposite problems. r vs b and us vs wa tell them apart.`},
    {lv:'mid', title:'Find who is doing the I/O', code:`$ sudo iotop -oPa
  PID  USER   DISK READ  DISK WRITE  COMMAND
 9133  app    1.2 G      310 M      java -jar app.jar
  812  root   0          120 M      jbd2/nvme0n1p2-8     # ext4 journal thread
$ pidstat -d 1 | head`, why:`Once iostat shows a busy disk, iotop or pidstat -d attributes the bytes to processes. A journal thread busy writing hints at fsync-heavy workloads.`},
    {lv:'adv', title:'Pressure stall information', code:`$ cat /proc/pressure/cpu /proc/pressure/memory /proc/pressure/io
some avg10=4.20  …          # cpu: 4% of time some task waited for CPU
some avg10=61.10 …          # memory: 61% of time some task stalled on memory
full avg10=40.37 …          #         40% of time ALL tasks were stalled
some avg10=78.00 …          # io: 78% of time some task waited on I/O`, why:`PSI directly measures time lost to each resource, so it shows which one is the bottleneck (memory here) instead of inferring it from utilisation.`},
  ],
  tips: {
    say:`"I start with load average but remember Linux counts tasks in uninterruptible I/O wait too. Then vmstat or top to split CPU into user, system, iowait and steal, and to compare runnable versus blocked tasks. If it's I/O I use iostat -x for utilisation, queue and latency; if memory, free, swap activity, PSI and dmesg for OOM kills. I apply the USE method to each resource, then attribute the load to a process with top, pidstat or iotop, mitigate, and fix the root cause."`,
    points:[`Load average caveat.`,`Systematic triage, tool by tool.`,`Connect symptoms to OS mechanisms.`],
    traps:[`Concluding from one metric.`,`Calling low free memory a problem by itself.`],
    qa:[[`Why can load be high while CPU is idle?`,`Load counts D-state tasks waiting on disk or NFS; they don't use CPU but are counted.`],
        [`What does high system time suggest?`,`Lots of kernel work: excessive syscalls, page faults, lock contention or context switching; profile with perf and strace -c.`],
        [`What is steal time?`,`In a VM, time the vCPU was ready to run but the hypervisor ran something else; persistent steal means an oversubscribed host.`]]
  },
  exercises: [
    {lv:'E', q:`On Linux, load average counts runnable tasks plus tasks in which state? (letter used by ps)`, ans:'D', hint:`Uninterruptible sleep.`, answer:`<p>D (uninterruptible, usually I/O).</p>`},
    {lv:'M', q:`vmstat shows r=1, b=20, us=3, wa=90. Is the bottleneck CPU or I/O?`, ans:'I/O', hint:`Who's waiting on what?`, answer:`<p>I/O: tasks are blocked and the CPU is mostly waiting.</p>`},
    {lv:'H', q:`A disk handles requests in 0.5 ms each when idle. With an average queue of 71 requests ahead, roughly how long (ms) does a new request wait before service, assuming one at a time?`, ans:'35.5', hint:`71 × 0.5 ms.`, answer:`<p>≈ 35.5 ms of queueing, which is why await jumps from &lt; 1 ms to tens of ms under saturation.</p>`},
  ],
  quiz: [
    [`High load average on Linux always means CPU saturation.`,[`True`,`False: it includes tasks blocked on I/O`,`True on SSDs`,`Only for VMs`],1,`D state counts.`,'E'],
    [`vmstat's wa column is…`,[`Write activity`,`CPU idle time while waiting for I/O`,`Swap usage`,`Wait queue length`],1,`iowait.`,'E'],
    [`iostat -x %util at 100% with a long queue suggests…`,[`CPU bound`,`A saturated disk`,`Too much RAM`,`A network issue`],1,`Utilisation + saturation.`,'E'],
    [`Non-zero si/so in vmstat means…`,[`Network traffic`,`Swapping pages in/out`,`System interrupts`,`Signals`],1,`Memory pressure.`,'M'],
    [`The USE method checks each resource's…`,[`Users, Services, Events`,`Utilisation, Saturation, Errors`,`Uptime, Swap, Entropy`,`Usage, Speed, Energy`],1,`Brendan Gregg.`,'M'],
    [`"free" shows little free memory but lots of buff/cache. This is…`,[`A memory leak`,`Normal: page cache is reclaimable`,`Swap exhaustion`,`A kernel bug`],1,`Check "available".`,'M'],
  ],
  quizAdv: [
    [`Persistent steal time in a VM indicates…`,[`A memory leak`,`The hypervisor host is oversubscribed`,`Disk failure`,`DNS problems`],1,`Noisy neighbours.`,'H'],
    [`PSI "full" pressure for memory means…`,[`Memory is full`,`All non-idle tasks were stalled on memory simultaneously`,`Swap is full`,`Cache is full`],1,`Pressure stall information.`,'H'],
    [`High sy time with many context switches often points to…`,[`Disk failure`,`Lock contention or too many runnable threads`,`Low RAM`,`Network latency`],1,`Kernel overhead.`,'H'],
  ],
});
