/* 1.5 Context switch */
topic('1', { no:'1.5', title:'Context switching: saving and restoring a process',
idea:`To run P2, the kernel must freeze P1 mid-instruction-stream so precisely that P1 never notices. Step through a context switch: the interrupt, saving registers into P1's PCB, switching address spaces, restoring P2's registers, and what it all costs.`,
actors:'Processes', dgTitle:'Where the CPU state goes', stateTitle:'CPU registers',
nodes:{
  cpu:{x:220,y:40,label:'CPU registers\nPC · SP · rax … · flags',w:220,h:50},
  pcb1:{x:90,y:170,label:'P1 PCB\nsaved registers',w:150,h:50,kind:'mem'},
  pcb2:{x:350,y:170,label:'P2 PCB\nsaved registers',w:150,h:50,kind:'mem'},
  mmu:{x:220,y:110,label:'MMU: page table root (CR3)',w:220,h:30,kind:'lock'}
},
edges:[['cpu','pcb1'],['pcb2','cpu']],
vb:'0 0 440 220',
codes:{a:`// P1 is running user code
x = x + 1;                         // timer interrupt arrives here

// kernel: switch from P1 to P2 (simplified Linux schedule())
save_user_regs(&P1->regs);         // PC, SP, general registers, flags
next = pick_next_task();           // scheduler chooses P2
switch_mm(P1->mm, P2->mm);         // load P2's page table (CR3)
switch_to(P1, P2);                 // swap kernel stacks + callee-saved regs
restore_user_regs(&P2->regs);      // P2's PC, SP, registers
return_to_user();                  // P2 continues where it stopped

// P2 resumes, unaware it was ever paused
y = y * 2;`},
steps:[
{hl:{P1:[2]}, th:[['P1','RUN:ok','user mode'],['P2','READY:info','waiting for CPU']], d:{on:['cpu'], e:[]}, g:[G('CPU registers',['PC','0x4011a0 (in P1)','hot'],['SP','P1 stack'],['CR3','P1 page table'])], gt:GT(10,['P1',0,10]),
 say:`P1 is running. Its whole execution state is in the CPU right now: the program counter (next instruction), stack pointer, general registers and flags. The timer interrupt fires between two of its instructions.`},
{hl:{kernel:[5]}, th:[['P1','RUN:warn','in kernel (interrupt)'],['P2','READY:info','']], d:{on:['cpu','pcb1'], e:[['cpu','pcb1','save','hot']]}, g:[G('CPU registers',['PC','kernel interrupt handler'],['saved','P1\'s PC, SP, registers → P1 PCB','hot'])], gt:GT(10,['P1',0,10],['kernel',10,10.4]), log:['timer IRQ: P1 slice expired'],
 say:`The CPU enters the kernel. First the kernel <b>saves P1's state</b> (all registers, including PC and SP) into P1's PCB / kernel stack. This must be complete: if a single register were lost, P1 would compute wrong results when it resumed.`},
{hl:{kernel:[6,7]}, d:{on:['mmu'], e:[['cpu','pcb1','saved','ok']]}, g:[G('CPU registers',['scheduler','picks P2','hot'],['CR3','P1 → P2 page table','hot'],['TLB','P1\'s cached translations now useless (unless ASIDs/PCIDs)','bad'])], gt:GT(10.6,['P1',0,10],['kernel',10,10.6]),
 say:`The scheduler picks P2. Because P2 is a different process, its memory is different: the kernel loads P2's page table root into the MMU (<code>CR3</code> on x86). This makes the TLB's cached address translations for P1 useless (tagged TLBs with PCIDs soften this).`},
{hl:{kernel:[8,9,10]}, th:[['P1','READY:info','state saved in PCB'],['P2','RUN:ok','restored']], d:{on:['pcb2','cpu'], e:[['cpu','pcb1','saved','ok'],['pcb2','cpu','restore','hot']]}, g:[G('CPU registers',['PC','0x4022f0 (in P2)','hot'],['SP','P2 stack'],['CR3','P2 page table'])], gt:GT(11,['P1',0,10],['kernel',10,11]),
 say:`<code>switch_to</code> swaps kernel stacks, then P2's saved registers are <b>restored</b> into the CPU and the kernel returns to user mode. The CPU continues at P2's saved PC, exactly where P2 was interrupted last time.`},
{hl:{P2:[13]}, th:[['P1','READY:info',''],['P2','RUN:ok','user mode']], d:{on:['cpu'], e:[]}, gt:GT(15,['P1',0,10],['kernel',10,11],['P2',11,15]), g:[G('Cost of a switch',['direct','~1–5 µs: save/restore, scheduler','hot'],['indirect','cold caches and TLB afterwards: often bigger','bad'],['thread switch (same process)','cheaper: no page-table change','ok'])],
 say:`P2 runs as if nothing happened. The direct cost is small (a microsecond or a few), but the <b>indirect</b> cost is often larger: P2 starts with caches and TLB full of P1's data and runs slower until they warm up. Switching between threads of the same process skips the page-table change.`},
{hl:{}, th:[], d:null, gt:null, g:[G('Triggers',['timer interrupt','preemption'],['blocking syscall','read, lock, sleep'],['yield','voluntary']),G('Too many switches?',['symptom','high cs/s in vmstat, low throughput','bad'],['fixes','fewer threads, bigger time slices, batching, async I/O','ok'])],
 say:`<b>Say it:</b> "A context switch saves the running process's CPU state, its registers, program counter and stack pointer, into its PCB, picks another process, switches the address space by loading its page table, and restores that process's saved registers. It's pure overhead: the direct cost is microseconds, and the indirect cost of cold caches and TLB is often larger. Thread switches within a process are cheaper because the address space stays."`}
],
keep:[`Context switch = save regs to PCB → pick next → switch page table → restore regs.`,`Triggered by timer interrupt, blocking syscall, or yield.`,`Direct cost ~µs; indirect (cache/TLB misses) often bigger.`,`Thread switch is cheaper: same address space.`,`Too many switches = overhead; watch vmstat cs.`]}, {
  imp: 'must',
  theory: TH(`A context switch is the kernel saving one process's CPU state and restoring another's, so many processes can share a CPU; it is necessary overhead that we try to minimise.`,
`<p>Reading several books at once: before switching books you put a bookmark in (save the PC) and remember what you were thinking (registers). Picking up the other book you find its bookmark and continue. Switching too often means you spend more time finding your place than reading.</p>
<p>The CPU state is small (a few hundred bytes of registers), so saving it is fast. The hidden cost is that caches and the TLB were tuned for the previous process; the new one starts cold.</p>`,
[[`Context`,`Everything needed to resume: registers, PC, SP, flags, address-space pointer.`],[`Context switch`,`Saving one context and loading another.`],[`Dispatcher`,`Kernel code that performs the switch.`],[`Dispatch latency`,`Time from deciding to switch until the new process runs.`],[`TLB flush`,`Invalidating cached translations when the address space changes.`],[`PCID / ASID`,`Tags that let TLB entries from several processes coexist.`]],
[`An interrupt or syscall enters the kernel and saves user registers.`,`The scheduler picks the next task.`,`If it's a different process, the kernel switches page tables (CR3).`,`Kernel stacks are swapped and the new task's registers restored.`,`Return to user mode at the new task's saved PC.`],
[`High context-switch rates (vmstat cs) often mean too many threads contending.`,`Latency-sensitive systems pin threads to cores to avoid switches and cache loss.`,`Event loops (Node, nginx, epoll) handle many connections with few threads to avoid switching.`],
[`Assuming more threads always means more throughput.`,`Ignoring the indirect cache cost.`,`Confusing a mode switch (user→kernel) with a context switch (process→process).`])
  ,
  examples: [
    {lv:'basic', title:'Watch context switches per second', code:`$ vmstat 1
procs  ----system----  ------cpu-----
 r  b    in     cs     us sy id wa
 2  0  1200   2800     12  3 85  0
18  0  9100  95000     40 45 15  0     # 95k switches/s, 45% system time`, why:`<code>cs</code> is context switches per second. The second line shows thrashing between many runnable threads (r=18): much time goes to the kernel.`},
    {lv:'mid', title:'Small quantum = more switches', sim:'sched', input:`algo: RR
quantum: 1          # try 1, 4, 10
A 0 10
B 0 10
C 0 10`, why:`With quantum 1 there are 29 switches; with 10 just 2. Each switch costs real time (not modelled here), so very small quanta waste CPU on switching. Too large, and response time suffers.`},
    {lv:'adv', title:'Cost of switching, roughly measured', code:`// two processes ping-pong one byte through two pipes, 1,000,000 times
$ ./pingpong
1000000 round trips in 4.1 s  → ~2 µs per switch (incl. syscalls)
$ taskset -c 0 ./pingpong      # both pinned to one core
1000000 round trips in 2.9 s  → caches stay warm`, why:`The classic way to measure switch cost (lmbench lat_ctx). Real cost depends heavily on cache footprint.`},
  ],
  tips: {
    say:`"A context switch saves the current process's registers, PC and stack pointer into its PCB, picks the next process, switches the address space by loading its page table, and restores its registers. It's triggered by timer interrupts, blocking calls or yields. It's overhead: microseconds directly, plus cache and TLB misses afterwards. Threads in the same process switch more cheaply."`,
    points:[`List what's saved.`,`Mention the page-table/TLB effect.`,`Discuss direct vs indirect cost.`],
    traps:[`Saying context switches are free.`,`Mixing up mode switch and context switch.`],
    qa:[[`Why is a thread switch cheaper than a process switch?`,`Threads share the address space, so there's no page-table switch and no TLB flush; caches may still hold shared data.`],
        [`What is the difference between a mode switch and a context switch?`,`A mode switch is user → kernel and back within the same process (e.g. a syscall). A context switch changes which process/thread runs.`],
        [`How do you reduce context switches?`,`Fewer runnable threads (thread pools sized to cores), async/event-driven I/O, batching, longer time slices for batch work, CPU pinning.`]]
  },
  exercises: [
    {lv:'E', q:`Round robin with quantum 1, three processes of 10 units each: how many process switches occur?`, sim:'sched', key:'switches', input:`algo: RR
quantum: 1
A 0 10
B 0 10
C 0 10`, hint:`Count changes between consecutive Gantt segments.`, answer:`<p>30 slices, each different from the previous: 29 switches.</p>`},
    {lv:'M', q:`Same three processes with quantum 5: how many switches?`, sim:'sched', key:'switches', input:`algo: RR
quantum: 5
A 0 10
B 0 10
C 0 10`, hint:`A B C A B C.`, answer:`<p>Six segments → 5 switches.</p>`},
    {lv:'H', q:`Each switch costs 5 µs. With a 1 ms quantum, what percentage of CPU time is switching overhead? Give a number rounded to 2 decimals.`, ans:'0.5', hint:`overhead / (quantum + overhead).`, answer:`<p>5 / (1000 + 5) ≈ 0.498% ≈ 0.5%. With a 50 µs quantum it would be 9%.</p>`},
  ],
  quiz: [
    [`During a context switch the kernel saves…`,[`Only the PC`,`The CPU registers, PC, SP and flags of the old process`,`The whole RAM`,`The disk`],1,`Into the PCB/kernel stack.`,'E'],
    [`Switching to a different process also requires…`,[`Rebooting`,`Switching the page table (address space)`,`Recompiling`,`Closing files`],1,`CR3 on x86.`,'E'],
    [`Which is cheaper?`,[`Process switch`,`Thread switch within the same process`,`They're identical`,`Neither happens`],1,`No address-space change.`,'M'],
    [`An indirect cost of context switching is…`,[`Disk wear`,`Cache and TLB misses after the switch`,`Lost files`,`More RAM`],1,`Cold caches.`,'M'],
    [`A system call by itself is…`,[`Always a context switch`,`A mode switch; a context switch only if the process blocks or is preempted`,`Impossible`,`A page fault`],1,`Don't confuse the two.`,'M'],
    [`vmstat's cs column shows…`,[`CPU speed`,`Context switches per second`,`Cache size`,`Swap`],1,`Watch for spikes.`,'E'],
  ],
  quizAdv: [
    [`PCID/ASID tags help because…`,[`They encrypt memory`,`TLB entries of several address spaces can coexist, avoiding full flushes`,`They speed up disks`,`They remove page tables`],1,`Less TLB cold start.`,'H'],
    [`Too small a time quantum mostly hurts…`,[`Response time`,`Throughput, due to switching overhead`,`Memory`,`Disk`],1,`Overhead dominates.`,'H'],
    [`Event-driven servers use few threads mainly to…`,[`Save disk`,`Avoid context-switch and per-thread memory overhead at high connection counts`,`Avoid TCP`,`Simplify logging`],1,`C10k problem.`,'H'],
  ],
});
