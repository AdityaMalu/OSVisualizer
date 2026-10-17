/* 7.1 Demand paging and page faults */
topic('7', { no:'7.1', title:'Demand paging and handling a page fault',
idea:`Virtual memory lets a process be bigger than RAM: pages are loaded only when first touched. Follow a page fault from the faulting instruction to the disk read and back, see what "minor" and "major" faults cost, and compute the effective access time when even 1 in 1000 accesses faults.`,
actors:'Process', dgTitle:'Handling a page fault', stateTitle:'Page fault',
nodes:{
  cpu:{x:70,y:50,label:'1. load M',w:110,h:40},
  pt:{x:230,y:50,label:'2. PTE: invalid\n→ trap',w:130,h:46,kind:'lock'},
  os:{x:400,y:50,label:'3. kernel:\nvalid address?',w:130,h:46},
  disk:{x:400,y:170,label:'4. read page\nfrom disk/swap',w:130,h:46,kind:'db'},
  frame:{x:230,y:170,label:'5. free frame\n← page',w:130,h:46,kind:'mem'},
  rest:{x:70,y:170,label:'6. update PTE,\nrestart instr.',w:120,h:46}
},
edges:[['cpu','pt'],['pt','os'],['os','disk'],['disk','frame'],['frame','rest'],['rest','cpu']],
vb:'0 0 480 220',
codes:{a:`char *big = mmap(NULL, 1 << 30, PROT_READ | PROT_WRITE,
                 MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);   // 1 GB reserved, 0 bytes in RAM
big[0] = 'x';          // first touch of page 0 → page fault → kernel allocates a frame
big[4096] = 'y';       // first touch of page 1 → another fault
big[1] = 'z';          // page 0 is present now → no fault

// page-fault handler (simplified)
void handle_fault(addr) {
    vma = find_vma(current, addr);
    if (!vma || !allowed(vma, access)) { send_signal(SIGSEGV); return; }
    frame = get_free_frame();                // may evict another page (7.2)
    if (vma is file-backed or page swapped) read_from_disk(frame);   // MAJOR fault
    else zero_fill(frame);                   // MINOR fault
    map(addr, frame); restart_instruction();
}`},
steps:[
{hl:{P:[1,2]}, th:[['P','RUN:ok','1 GB mapped, nothing resident']], d:{on:[], e:[]}, g:[G('Page fault',['virtual size','1 GB'],['resident (RSS)','0 KB','hot'],['present bits','all 0'])],
 say:`<code>mmap</code> reserves 1 GB of virtual address space, but no RAM is used yet: every PTE is marked not present. This is <b>demand paging</b>: pages are brought into memory only when they're first accessed. Programs can be larger than physical memory, and pages that are never used never cost RAM or disk reads.`},
{hl:{P:[3]}, th:[['P','RUN:warn','page fault on page 0']], d:{on:['cpu','pt'], e:[['cpu','pt','','hot']]}, g:[G('Page fault',['access','big[0] (page 0)'],['PTE','not present','bad'],['MMU','raises a page-fault exception'])],
 say:`<code>big[0] = 'x'</code> touches page 0. The MMU finds the present bit clear and raises a <b>page fault</b>, an exception that traps into the kernel with the faulting address (CR2 on x86).`},
{hl:{K:[8,9,10]}, d:{on:['os'], e:[['cpu','pt','','ok'],['pt','os','trap','hot']]}, g:[G('Page fault',['find_vma','address is in the mmap region: valid','ok'],['invalid would mean','SIGSEGV','bad'])],
 say:`The kernel looks up which mapped region (VMA) the address belongs to. If none, or the access isn't permitted (write to read-only), it's a genuine error: <code>SIGSEGV</code>. Here it's inside the 1 GB region we mapped, so the fault is legitimate: the page just isn't there yet.`},
{hl:{K:[11,12,13]}, d:{on:['frame'], e:[['cpu','pt','','ok'],['pt','os','','ok'],['os','frame','zero page','hot']]}, g:[G('Page fault',['type','minor (anonymous memory: zero-fill)','ok'],['cost','~1 µs'],['major fault','must read from disk: ~100 µs (SSD) – 10 ms (HDD)','bad'])],
 say:`The kernel gets a free frame (possibly evicting another page, next topic). Anonymous memory just needs a zero-filled frame: a <b>minor fault</b>, about a microsecond. If the page lived in a file or in swap, the kernel would have to read it from disk: a <b>major fault</b>, and the process <b>blocks</b> while other processes run.`},
{hl:{K:[14], P:[4,5]}, th:[['P','RUN:ok','instruction restarted']], d:{on:['rest','cpu'], e:[['cpu','pt','','ok'],['pt','os','','ok'],['os','frame','','ok'],['frame','rest','map','ok'],['rest','cpu','restart','hot']]}, g:[G('Page fault',['RSS','8 KB after two faults'],['big[1]','page 0 present: no fault','ok'])], log:['fault page 0 (minor)','fault page 1 (minor)','big[1]: hit'],
 say:`The PTE is filled in (frame, present = 1) and the <b>faulting instruction is restarted</b>; this time it succeeds and the program never notices. <code>big[4096]</code> faults page 1 in the same way; <code>big[1]</code> is on page 0, now present: no fault.`},
{d:null, g:[G('Effective access time',['memory 100 ns, fault service 8 ms, p = fault rate'],['EAT','(1 − p) × 100 + p × 8,000,000 ns'],['p = 1/1000','≈ 8.1 µs: 81× slower','bad'],['for < 10% slowdown','p < 1 / 800,000','hot'])],
 say:`<b>Say it:</b> "Demand paging loads a page only when it's first accessed. Access to a non-present page triggers a page fault; the kernel checks the address is valid, finds a free frame (evicting a page if needed), zero-fills it or reads it from disk, updates the page table and restarts the instruction. Minor faults are cheap; major faults need disk I/O and are thousands of times slower than memory, so the fault rate must be tiny: EAT = (1 − p) × memory time + p × fault time."`}
],
keep:[`Demand paging: load a page on first touch.`,`Page fault → validate address → get frame → load/zero → update PTE → restart instruction.`,`Invalid address → SIGSEGV; valid but absent → load.`,`Minor fault (no I/O) ~µs; major fault (disk) ~0.1–10 ms.`,`EAT = (1−p)·t_mem + p·t_fault: p must be tiny.`]}, {
  imp: 'must',
  theory: TH(`Demand paging keeps only the pages a process actually uses in memory, loading others on a page fault, so processes can be larger than RAM and start faster.`,
`<p>A library doesn't hand you every book in a series when you join; it fetches a volume the first time you ask for it. The first request for a volume is slow (it comes from the archive), later reads are instant. If you constantly ask for volumes that aren't on the shelf, you spend all your time waiting: that's the effective-access-time problem.</p>
<p>Page faults are therefore normal, not errors. Every program start causes thousands of minor faults as code and data pages are touched for the first time.</p>`,
[[`Demand paging`,`Pages loaded only when accessed.`],[`Page fault`,`Exception on access to a non-present (or protected) page.`],[`Minor fault`,`Resolved without disk I/O (zero page, page already in page cache).`],[`Major fault`,`Requires reading from disk or swap.`],[`VMA`,`Kernel record of a mapped region and its permissions.`],[`RSS`,`Resident set size: pages actually in RAM.`],[`Pure demand paging`,`Start with zero pages resident.`],[`Prefetching / readahead`,`Loading pages before they're requested.`]],
[`The MMU traps on a non-present PTE.`,`The kernel finds the VMA; invalid → SIGSEGV.`,`Pick a free frame (or evict a victim via page replacement).`,`Fill it: zero, copy from the page cache, or read from file/swap (process blocks).`,`Set the PTE present; restart the faulting instruction.`],
[`Startup time and memory use of big apps depend on how many pages they touch.`,`Major-fault spikes (sar -B, perf, /proc/vmstat pgmajfault) indicate memory pressure or cold caches.`,`Databases use mlock or pre-touch to avoid faults on latency-critical paths.`],
[`Calling every page fault an error.`,`Forgetting that the faulting instruction is restarted, not skipped.`,`Ignoring how expensive major faults are.`])
  ,
  examples: [
    {lv:'basic', title:'Count your page faults', code:`$ /usr/bin/time -v python3 -c "x = bytearray(500_000_000)"
  Maximum resident set size (kbytes): 497356
  Major (requiring I/O) page faults: 0
  Minor (reclaiming a frame) page faults: 122153`, why:`Allocating and zeroing 500 MB touches ~122,000 4 KB pages, each a minor fault (no disk). Major faults appear when pages come from disk.`},
    {lv:'mid', title:'Effective access time', code:`memory access = 200 ns, average fault service time = 8 ms
EAT = (1 − p) × 200 + p × 8,000,000
p = 0.001     → 199.8 + 8000   ≈ 8,200 ns   (41× slower)
p = 0.000001  → ≈ 208 ns                     (4% slower)
want EAT < 220 ns (10%):  p < 20 / 7,999,800 ≈ 1 in 400,000`, why:`Galvin's classic calculation: page-fault rates must be extraordinarily low for virtual memory to perform.`},
    {lv:'adv', title:'Avoid faults on a hot path', code:`// pre-fault and pin a buffer so latency-critical code never faults
void *buf = mmap(NULL, SIZE, PROT_READ | PROT_WRITE,
                 MAP_PRIVATE | MAP_ANONYMOUS | MAP_POPULATE, -1, 0);   // populate now
mlock(buf, SIZE);                         // never swap it out
// JVM equivalent: -XX:+AlwaysPreTouch (touch every heap page at startup)`, why:`Trading startup time and memory for predictable latency: no first-touch faults and no swap-ins later.`},
  ],
  tips: {
    say:`"With demand paging, a page is brought into memory only on first access. Touching a non-present page causes a page fault: the kernel checks the address is valid, otherwise sends SIGSEGV; gets a frame, evicting one if needed; zero-fills it or reads it from the file or swap; updates the page table; and restarts the instruction. Minor faults cost microseconds, major faults milliseconds, so effective access time is very sensitive to the fault rate."`,
    points:[`The sequence of fault handling.`,`Valid vs invalid faults.`,`Minor vs major and the EAT formula.`],
    traps:[`Saying the instruction is skipped.`,`Saying page faults always read from disk.`],
    qa:[[`Why must the faulting instruction be restartable?`,`It may have partially executed; the CPU must be able to undo or redo it so that after the page arrives it runs as if nothing happened. CPUs are designed so instructions are restartable.`],
        [`What's the difference between a page fault and a segfault?`,`A page fault is a hardware exception; the kernel resolves most of them. A segfault (SIGSEGV) is the signal sent when the fault is for an invalid address or forbidden access.`],
        [`Why does a program start faster with demand paging?`,`Only the pages actually used during startup are read, not the whole executable and libraries.`]]
  },
  exercises: [
    {lv:'E', q:`Memory access 100 ns, page-fault service 10 ms, fault rate 0. What is the EAT in ns?`, ans:'100', hint:`No faults.`, answer:`<p>100 ns.</p>`},
    {lv:'M', q:`Memory 100 ns, fault service 10 ms (10,000,000 ns), fault rate 1 in 10,000. EAT in ns? (round to whole number)`, ans:'1100', hint:`0.9999 × 100 + 0.0001 × 10,000,000.`, answer:`<p>99.99 + 1000 ≈ 1100 ns: 11× slower.</p>`},
    {lv:'H', q:`Same numbers: what is the maximum fault rate (as "1 in N", give N) for at most 10% slowdown (EAT ≤ 110 ns)? Round N to a whole number.`, ans:'999990', hint:`(1 − p)·100 + p·10⁷ ≤ 110 → p ≤ 10 / (10⁷ − 100).`, answer:`<p>p ≤ 10 / 9,999,900 ≈ 1 / 999,990: about one fault per million accesses.</p>`},
  ],
  quiz: [
    [`Demand paging loads a page…`,[`At program start`,`When it is first accessed`,`Every second`,`Never`],1,`Lazily.`,'E'],
    [`A page fault on a valid but non-present page leads to…`,[`SIGSEGV`,`The kernel loading the page and restarting the instruction`,`A reboot`,`Skipping the instruction`],1,`Transparent to the program.`,'E'],
    [`A major page fault…`,[`Needs disk I/O`,`Needs no I/O`,`Is a segfault`,`Is a TLB miss`],0,`Minor faults don't.`,'E'],
    [`Accessing an address outside any mapping causes…`,[`A minor fault`,`SIGSEGV`,`A major fault`,`Nothing`],1,`Invalid access.`,'M'],
    [`During a major fault the process…`,[`Spins`,`Blocks while the disk read happens; others run`,`Is killed`,`Runs in kernel mode the whole time`],1,`I/O wait.`,'M'],
    [`Even a fault rate of 1/1000 makes memory roughly…`,[`1% slower`,`Tens of times slower`,`Faster`,`Unchanged`],1,`Disk is ~10⁵× slower.`,'M'],
  ],
  quizAdv: [
    [`MAP_POPULATE does what?`,[`Prefaults the mapping at mmap time`,`Locks pages`,`Shares pages`,`Disables paging`],0,`No first-touch faults.`,'H'],
    [`On x86 the faulting address is placed in…`,[`RAX`,`CR2`,`CR3`,`RIP`],1,`CR3 holds the page-table root.`,'H'],
    [`A page fault on a page that's already in the page cache is…`,[`Major`,`Minor`,`A segfault`,`Impossible`],1,`No disk I/O needed.`,'H'],
  ],
});
