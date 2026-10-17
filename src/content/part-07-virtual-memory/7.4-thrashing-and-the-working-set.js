/* 7.4 Thrashing and the working-set model */
topic('7', { no:'7.4', title:'Thrashing and the working-set model',
idea:`Add more processes and CPU utilisation rises… until it suddenly collapses, the disk is pegged, and the machine crawls. That's thrashing: processes spend their time paging, not computing. See why it happens, measure working sets, and fix it by giving each process enough frames or running fewer of them.`,
actors:'Processes', tbTitle:'Working sets (Δ = 10 references)', stateTitle:'System',
codes:{a:`// working set of a process at time t = the distinct pages it used
// in its last Δ references
WS(t, Δ) = { pages referenced in (t − Δ, t] }

D = Σ |WS_i|            // total frames demanded by all processes
if (D > available frames) → thrashing → suspend (swap out) a process
if (D < available frames) → room to admit another process

// page-fault-frequency control: per process
if (fault rate > upper bound) give it more frames
if (fault rate < lower bound) take some frames away`},
steps:[
{th:[['P1','RUN:ok',''],['P2','RUN:ok',''],['P3','RUN:ok','']], tb:[TB('CPU utilisation vs processes',['processes','CPU %','paging'],[['1','35','low'],['3','80','low'],['5','92','moderate']],{2:'ok'})], g:[G('System',['more processes','more overlap of I/O and CPU','ok'])],
 say:`With more processes in memory (higher <b>degree of multiprogramming</b>), the CPU is busier: while one waits for I/O, another computes. Utilisation climbs from 35% to 92%. So far, adding processes helps.`},
{th:[['P1','BLOCKED:bad','page fault'],['P2','BLOCKED:bad','page fault'],['P3','BLOCKED:bad','page fault'],['P4','BLOCKED:bad','page fault'],['P5','BLOCKED:bad','page fault'],['P6','RUN:warn','evicts P3\'s pages to make room']], tb:[TB('CPU utilisation vs processes',['processes','CPU %','paging'],[['1','35','low'],['3','80','low'],['5','92','moderate'],['6','25','disk 100% busy'],['7','8','everyone waits for the disk']],{3:'bad',4:'bad'})], g:[G('System',['frames per process','below what each needs','bad'],['faults','each fault evicts a page another process is about to use','bad'])], log:['page-in queue length: 48','CPU idle: waiting on paging'],
 say:`Add a sixth process and frames per process drop below what each actively needs. Every process faults constantly; each fault evicts a page that some other process needs next, causing <i>its</i> fault. The disk is saturated, processes wait in the paging queue, and <b>CPU utilisation collapses</b>. This is <b>thrashing</b>.`},
{th:[], tb:[TB('CPU utilisation vs processes',['processes','CPU %','paging'],[['7','8','thrashing']],{0:'bad'})], g:[G('System',['naive scheduler','sees idle CPU → admits MORE processes','bad'],['result','even fewer frames each → worse','bad'])],
 say:`It gets worse: a naive long-term scheduler sees the idle CPU and admits <i>more</i> processes, cutting frames further. Thrashing is a positive-feedback collapse. The fix is the opposite: give each process the frames it actually needs, and run fewer processes if they don't all fit.`},
{hl:{ws:[1,2,3]}, tb:[TB('page references of P1 (time →)',['t','… 2 6 1 5 7 7 7 7 5 1','6 2 3 4 4 4 3 4 3 4 …'],[['working set (Δ = 10)','at t1: {1, 2, 5, 6, 7} → 5 frames','at t2: {3, 4} → 2 frames']],{0:'hot'})], g:[G('System',['locality','a process uses a small set of pages for a while, then moves on','ok'],['working set','pages used in the last Δ references'])],
 say:`Programs exhibit <b>locality</b>: for a while they use a small set of pages (a function and its data), then move to another set. The <b>working set</b> WS(Δ) is the set of distinct pages referenced in the last Δ references. Here P1's working set is {1, 2, 5, 6, 7} at t1 and just {3, 4} later. That's how many frames it needs right now.`},
{hl:{ws:[5,6,7]}, tb:[TB('working sets now',['process','|WS|'],[['P1','5'],['P2','12'],['P3','8'],['P4','9'],['total D','34']]),TB('decision (30 frames available)',['check','result'],[['D = 34 > 30','would thrash','bad'],['action','suspend P2 (swap it out) → D = 22','ok']],{1:'ok'})], g:[G('System',['policy','admit processes only while Σ|WS| fits in memory','ok'])],
 say:`The <b>working-set model</b>: add up everyone's working-set size D. If D exceeds available frames, thrashing is coming: <b>suspend</b> a process (swap it out entirely) and give its frames to the others. If there's slack, admit another process. The choice of Δ matters: too small misses the locality, too large merges several localities.`},
{hl:{ws:[9,10,11]}, tb:[], g:[G('Page-fault frequency (PFF)',['fault rate too high','process needs more frames → give some','ok'],['fault rate too low','it has spare frames → take some'],['no frames to give','suspend a process']),G('In practice',['Linux','no explicit WS; reclaim + OOM killer + PSI memory pressure'],['symptoms','high si/so in vmstat, major faults, iowait, load ↑ CPU ↓'],['fixes','more RAM, fewer/lighter processes, memory limits (cgroups)','ok'])],
 say:`<b>Say it:</b> "Thrashing happens when processes don't have enough frames for their working sets, so they page constantly: each fault evicts a page someone else needs, the disk saturates and CPU utilisation collapses; adding processes makes it worse. The working-set model tracks the pages each process used in the last Δ references; if the sum exceeds memory, suspend processes. Page-fault-frequency control does the same by adjusting each process's frames to keep its fault rate in a band."`}
],
keep:[`Thrashing: more time paging than computing; CPU ↓ while disk is pegged.`,`Cause: Σ working sets > physical memory.`,`Working set WS(Δ) = distinct pages in the last Δ references.`,`Fix: give each process its WS or suspend processes; don't add more.`,`PFF: keep each process's fault rate between bounds.`]}, {
  imp: 'must',
  theory: TH(`Thrashing occurs when the active pages of running processes don't fit in memory, so the system spends its time paging; keeping each process's working set resident, or running fewer processes, prevents it.`,
`<p>A kitchen with too little counter space for the number of cooks: every cook constantly puts ingredients away to make room and fetches them back from the pantry a minute later. Everybody is busy, nobody cooks. Adding cooks makes it worse. The fix is fewer cooks or more counter.</p>
<p>Locality is what makes virtual memory work at all: at any moment a program needs only a small set of pages. Thrashing is what happens when memory can't even hold those sets.</p>`,
[[`Thrashing`,`High paging activity with little useful work.`],[`Degree of multiprogramming`,`Number of processes in memory.`],[`Locality`,`Programs reference a small set of pages for a period.`],[`Working set`,`Pages referenced in the most recent Δ references.`],[`Working-set window (Δ)`,`Size of the window.`],[`Page-fault frequency (PFF)`,`Control frames per process by its fault rate.`],[`Swapping out / suspending`,`Removing a whole process from memory to relieve pressure.`]],
[`Track each process's working set (approximated with reference bits and timer interrupts).`,`Allocate at least |WS| frames to each process.`,`If Σ|WS| > total frames, suspend a process.`,`Or monitor each process's fault rate and adjust its frame count.`],
[`Linux reports memory pressure via PSI (/proc/pressure/memory); systemd-oomd acts on it.`,`Containers with memory limits thrash or get OOM-killed when limits are below the working set.`,`JVM heaps larger than physical RAM cause GC-driven thrashing.`],
[`Responding to low CPU utilisation by adding more work.`,`Confusing a large virtual size with a large working set.`,`Choosing Δ arbitrarily large.`])
  ,
  examples: [
    {lv:'basic', title:'Too few frames for a loop', sim:'page', input:`# a process cycling through 4 pages
algo: LRU
frames: 3          # its working set is 4: try 4
refs: 1 2 3 4 1 2 3 4 1 2 3 4`, why:`With 3 frames every reference faults (100% fault rate): thrashing in miniature. With 4 frames, only the 4 compulsory faults.`},
    {lv:'mid', title:'Computing a working set', code:`references: 2 6 1 5 7 7 7 7 5 1 6 2 3 4 4 4 3 4 3 4 4 4 1 3 2 3 4 4 4 3
Δ = 10
WS at t = 10 (refs 1–10):  {2, 6, 1, 5, 7}       |WS| = 5
WS at t = 26 (refs 17–26): {3, 4, 1, 2}          |WS| = 4
WS at t = 20 (refs 11–20): {6, 2, 3, 4}          |WS| = 4`, why:`Count distinct pages in the last Δ references. The size varies as the program moves between localities.`},
    {lv:'adv', title:'Spotting thrashing on Linux', code:`$ vmstat 1
 r  b   swpd   free   si    so    bi    bo   us sy id wa
 1 14 3950000  9800  8400  9100  8500  9300  3  6  4 87
#   b = 14 blocked, si/so = KB/s swapped in/out, wa = 87% waiting on I/O
$ cat /proc/pressure/memory
some avg10=78.40 avg60=71.10 avg300=40.02 total=…
full avg10=61.90 …    # 62% of the time ALL tasks were stalled on memory`, why:`Huge swap-in/out, many blocked processes, high iowait and low user CPU: classic thrashing. PSI quantifies time lost to memory stalls.`},
  ],
  tips: {
    say:`"Thrashing is when processes lack enough frames for their working sets, so they fault continuously; each fault evicts a page another process needs, the paging disk saturates, and CPU utilisation collapses. A scheduler that adds processes when it sees idle CPU makes it worse. The working-set model gives each process the pages it used in the last Δ references and suspends processes if the total exceeds memory; page-fault-frequency control adjusts frames to keep each fault rate in a target range."`,
    points:[`Explain the collapse and the feedback loop.`,`Define working set with Δ.`,`Give the remedies.`],
    traps:[`Suggesting more processes to use the idle CPU.`,`Blaming the CPU.`],
    qa:[[`How do you approximate a working set in practice?`,`Use the reference bit: on a timer interrupt, record which pages had R set and clear the bits; pages referenced in the last few intervals are in the working set.`],
        [`What's the difference between local and global replacement here?`,`Global replacement lets one process steal frames from others, spreading thrashing; local replacement confines a process to its own frames, isolating it.`],
        [`What does Linux do instead of a working-set scheduler?`,`It reclaims pages via LRU lists, swaps if configured, and if memory can't be freed it invokes the OOM killer; PSI and cgroup memory limits help contain pressure.`]]
  },
  exercises: [
    {lv:'E', q:`Δ = 5, recent references (oldest → newest): 3 3 4 7 3. What is the working-set size?`, ans:'3', hint:`Distinct pages.`, answer:`<p>{3, 4, 7} → 3.</p>`},
    {lv:'M', q:`Working sets of 4 processes are 10, 15, 8 and 12 frames; memory has 40 frames. Will the system thrash if all four run? (yes/no)`, ans:'yes', hint:`Compare the sum with 40.`, answer:`<p>Σ = 45 &gt; 40: yes. Suspend one (e.g. the 8-frame one leaves 37 ≤ 40).</p>`},
    {lv:'H', q:`A process loops over 4 pages but has only 3 frames (LRU). How many of these 12 references fault?`, sim:'page', key:'faults', input:`algo: LRU
frames: 3
refs: 1 2 3 4 1 2 3 4 1 2 3 4`, hint:`Which page does LRU evict each time, and which page is needed next?`, answer:`<p>All 12: LRU always evicts the page needed next. With 4 frames only the first 4 would fault.</p>`},
  ],
  quiz: [
    [`Thrashing is…`,[`A CPU bug`,`Spending more time paging than executing`,`A disk failure`,`Deadlock`],1,`Paging dominates.`,'E'],
    [`A sign of thrashing is…`,[`High CPU, low disk`,`Low CPU utilisation with the paging disk saturated`,`No page faults`,`High network use`],1,`Everyone waits on paging.`,'E'],
    [`The working set is…`,[`All pages of a process`,`Pages referenced in the last Δ references`,`Pages on disk`,`The heap`],1,`Recent locality.`,'E'],
    [`If the sum of working sets exceeds memory, the OS should…`,[`Add processes`,`Suspend a process`,`Increase the quantum`,`Disable paging`],1,`Reduce multiprogramming.`,'M'],
    [`Page-fault-frequency control gives a process more frames when…`,[`Its fault rate is too low`,`Its fault rate is too high`,`It's idle`,`It's new`],1,`Keep the rate in a band.`,'M'],
    [`Why does adding processes during thrashing make it worse?`,[`It doesn't`,`Each gets even fewer frames, so faults rise further`,`The CPU overheats`,`The TLB fills up`],1,`Positive feedback.`,'M'],
  ],
  quizAdv: [
    [`Choosing Δ too large means…`,[`Missing the current locality`,`Overlapping several localities, overestimating needs`,`No effect`,`More thrashing always`],1,`Too small misses locality.`,'H'],
    [`Local replacement helps with thrashing because…`,[`It's faster`,`A thrashing process can't steal frames from others`,`It avoids page faults`,`It uses OPT`],1,`Isolation.`,'H'],
    [`Linux PSI "full" memory pressure measures…`,[`Free memory`,`Time during which all non-idle tasks were stalled on memory`,`Swap size`,`Page cache size`],1,`Pressure stall information.`,'H'],
  ],
});
