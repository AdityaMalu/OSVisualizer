/* 0.3 Interrupts, traps and exceptions */
topic('0', { no:'0.3', title:'Interrupts, traps and exceptions',
idea:`The kernel doesn't run in a loop watching everything; it is <i>woken up</i>. Watch a program get interrupted by the timer, then by a disk that finished reading, then trap on a divide-by-zero, and see how the CPU finds the right handler each time.`,
actors:'Execution', dgTitle:'Interrupt vector table', stateTitle:'What happened',
nodes:{
  cpu:{x:90,y:120,label:'CPU',w:110,h:50},
  idt:{x:270,y:120,label:'vector table (IDT)',w:150,h:150,kind:'mem'},
  h0:{x:440,y:50,label:'#0 divide error',w:150,h:34},
  h14:{x:440,y:100,label:'#14 page fault',w:150,h:34},
  h32:{x:440,y:150,label:'#32 timer',w:150,h:34},
  h46:{x:440,y:200,label:'#46 disk',w:150,h:34},
  timer:{x:90,y:30,label:'timer chip',w:110,h:34,kind:'lock'},
  disk:{x:90,y:215,label:'disk controller',w:120,h:34,kind:'lock'}
},
edges:[['cpu','idt']],
vb:'0 0 530 250',
codes:{a:`// user program
for (int i = 0; i < n; i++)
    sum += a[i];             // ← timer interrupt can arrive between any two instructions
int avg = sum / count;       // count == 0 → divide error (exception)

// kernel side (simplified)
void timer_handler(void) {   // vector 32
    ticks++;
    if (--current->slice == 0) need_resched = 1;
}
void disk_handler(void) {    // vector 46
    wake_up(waiting_process);
}
void divide_error(void) {    // vector 0
    send_signal(current, SIGFPE);
}`},
steps:[
{hl:{prog:[2,3]}, th:[['prog','RUN:ok','summing an array'],['reader','BLOCKED:warn','waiting for disk']], d:{on:['cpu'], e:[]}, g:[G('What happened',['nothing yet','the CPU runs user code'])],
 say:`A program is summing an array. Another process, <code>reader</code>, is blocked waiting for a disk read. The kernel is not running at all right now. It only gets control back when something <b>interrupts</b> the CPU.`},
{hl:{prog:[3], kernel:[7,8,9]}, th:[['prog','READY:info','preempted mid-loop'],['reader','BLOCKED:warn','waiting for disk']], d:{on:['timer','cpu','idt','h32'], e:[['timer','cpu','IRQ','hot'],['cpu','idt','vector 32','hot'],['idt','h32','','hot']]}, gt:GT(null,['prog',0,10],['kernel',10,11]), g:[G('What happened',['source','timer chip (hardware)','hot'],['type','interrupt: asynchronous'],['CPU did','finish current instruction, save state, switch to kernel, jump via vector 32'])], log:['IRQ0 timer → vector 32'],
 say:`The <b>timer</b> fires. This is a hardware <b>interrupt</b>: asynchronous, unrelated to what the program is doing. The CPU finishes the current instruction, saves the program's registers, switches to kernel mode and looks up entry 32 in the <b>interrupt vector table</b>. The handler counts a tick; if the time slice is used up it asks for a reschedule. This is how preemption works.`},
{hl:{kernel:[11,12,13]}, th:[['prog','READY:info','waiting for a turn'],['reader','READY:ok','woken: data arrived']], d:{on:['disk','cpu','h46'], e:[['disk','cpu','IRQ','hot'],['cpu','idt','vector 46','hot'],['idt','h46','','hot']]}, gt:GT(null,['prog',0,10],['kernel',10,11],['prog',11,16],['kernel',16,17]), g:[G('What happened',['source','disk controller','hot'],['type','interrupt: I/O completion'],['effect','reader: BLOCKED → READY','ok'])], log:['IRQ disk → vector 46: wake reader'],
 say:`Later the disk finishes the read (it worked by itself, using DMA, while the CPU did other things). The disk controller raises an interrupt; vector 46's handler marks <code>reader</code> as <b>ready</b>. Interrupts are why the CPU never has to <i>poll</i> devices in a loop.`},
{hl:{prog:[4], kernel:[14,15]}, th:[['prog','TERM:bad','killed by SIGFPE'],['reader','RUN:ok','running']], d:{on:['cpu','h0'], e:[['cpu','idt','vector 0','bad'],['idt','h0','','bad']]}, g:[G('What happened',['source','the current instruction (idiv by 0)','bad'],['type','exception (fault): synchronous'],['effect','kernel sends SIGFPE → default action kills the process','bad'])], log:['#DE divide error → SIGFPE','Floating point exception (core dumped)'],
 say:`Now <code>count</code> is 0 and the program divides by it. This time the <b>instruction itself</b> causes the event: a synchronous <b>exception</b>. Vector 0's handler can't fix it, so it sends <code>SIGFPE</code>, and the process dies. A page fault is also an exception, but usually a fixable one: the kernel loads the page and re-runs the instruction.`},
{hl:{}, th:[], d:null, gt:null, g:[G('Kinds of event',['interrupt','async, from devices/timer (IRQ)','hot'],['trap','sync, deliberate (syscall, breakpoint)'],['fault','sync, maybe fixable, instruction re-runs (page fault)'],['abort','sync, unrecoverable (machine check)','bad']),G('Handler rules',['keep it short','do the minimum, defer the rest (bottom halves / softirqs)','ok'],['save/restore state','the interrupted code must never notice','ok'])],
 say:`<b>Say it:</b> "Interrupts are asynchronous signals from hardware like the timer or a disk; exceptions are synchronous events caused by the current instruction, such as a page fault or divide by zero; a trap is a deliberate exception, such as a system call. In all cases the CPU saves state, switches to kernel mode and jumps through a vector table to a handler. Timer interrupts give the OS preemption, device interrupts avoid polling."`}
],
keep:[`Interrupt = async, from hardware (timer, disk, NIC).`,`Exception = sync, caused by the instruction (page fault, divide by 0).`,`Trap = deliberate exception (system call, breakpoint).`,`CPU: save state → kernel mode → vector table → handler → restore.`,`Timer interrupts make preemptive scheduling possible.`]}, {
  imp: 'good',
  theory: TH(`Interrupts and exceptions are how control returns to the kernel: hardware events and faulting instructions make the CPU save its state and jump to a kernel handler chosen from a vector table.`,
`<p>Picture working at a desk. You don't check your phone every second (polling); you wait for it to ring (interrupt). When it rings you bookmark your page (save state), take the call (handler) and come back to the same line. Separately, sometimes the thing you're doing goes wrong by itself: you divide by zero on your worksheet (exception).</p>
<p>Every OS feature that seems to run "in the background" — preemptive scheduling, I/O completion, demand paging — is driven by these events. The kernel is essentially a big collection of event handlers.</p>`,
[[`Interrupt (IRQ)`,`Asynchronous signal from a device or timer.`],[`Exception`,`Synchronous event caused by the executing instruction.`],[`Trap`,`Deliberate exception, e.g. syscall or int3 breakpoint.`],[`Fault`,`Recoverable exception; the instruction re-executes after the handler (page fault).`],[`Vector table / IDT`,`Table of handler addresses indexed by interrupt/exception number.`],[`Top/bottom half`,`Split of an interrupt handler into an urgent short part and deferred work.`],[`Interrupt masking`,`Temporarily disabling (some) interrupts, a privileged operation.`]],
[`An event occurs: a device asserts an IRQ line, or an instruction faults.`,`The CPU finishes (or aborts) the current instruction and saves PC, flags and registers.`,`It switches to kernel mode and indexes the vector table with the event number.`,`The handler does the minimum urgent work and schedules any longer work for later.`,`The kernel may switch to another process; eventually the saved state is restored and execution resumes.`],
[`High interrupt rates (network cards) are tuned with interrupt coalescing or NAPI polling.`,`/proc/interrupts shows which CPU handles which IRQs; IRQ affinity spreads load.`,`Page faults (an exception) are a main source of latency in memory-heavy services.`],
[`Calling a page fault an "error": most are normal and fixed transparently.`,`Doing heavy work inside an interrupt handler, which blocks other interrupts.`,`Confusing signals (a process-level notification) with hardware interrupts.`])
  ,
  examples: [
    {lv:'basic', title:'An exception becomes a signal', code:`#include <stdio.h>
int main(void) {
    int count = 0;
    printf("%d\\n", 10 / count);   // CPU raises a divide error
}`, out:`Floating point exception (core dumped)`, why:`The hardware exception (#DE, vector 0) is handled by the kernel, which converts it into the <code>SIGFPE</code> signal; its default action terminates the process.`},
    {lv:'mid', title:'Watch interrupts arrive', code:`$ watch -n1 "grep -E 'timer|eth0|nvme' /proc/interrupts"
           CPU0       CPU1
 LOC:   8823114    8790221   Local timer interrupts
 45:     120331          0   nvme0q1
 52:          0     884213   eth0-rx-0`, why:`Each row is an interrupt source and how many times each CPU handled it. The local timer ticks constantly; the network card's interrupts are pinned to CPU1.`},
    {lv:'adv', title:'Preemption needs the timer', sim:'sched', input:`# with a timer (preemptive round robin, 3 ms slices)
algo: RR
quantum: 3
spin    0 20    # an infinite-ish loop
editor  1 2`, why:`Thanks to timer interrupts, <code>editor</code> gets the CPU at time 3 even though <code>spin</code> never yields. Change <code>algo: FCFS</code> (no preemption, like a system without a timer): editor waits until spin finishes at 20.`},
  ],
  tips: {
    say:`"An interrupt is an asynchronous signal from hardware, like the timer or a disk finishing I/O. An exception is synchronous, caused by the current instruction, like a page fault or divide by zero; a trap such as a system call is a deliberate one. The CPU saves state, enters kernel mode and jumps through the vector table to a handler, which does minimal work and returns. Timer interrupts give us preemption."`,
    points:[`Distinguish asynchronous vs synchronous.`,`Explain the vector table and state save/restore.`,`Connect timer interrupts to preemptive scheduling.`],
    traps:[`Saying page faults always mean a crash.`,`Saying the kernel polls devices.`],
    qa:[[`Why should interrupt handlers be short?`,`While a handler runs, the same (or lower-priority) interrupts may be masked, so long handlers add latency for every other device. Linux splits work into a fast top half and deferred softirqs/workqueues.`],
        [`What is the difference between a fault and an abort?`,`After a fault the instruction can re-run (page fault fixed). An abort is unrecoverable (hardware machine check), so the process or system is stopped.`],
        [`What is interrupt coalescing?`,`The device waits to batch several events into one interrupt, trading a little latency for much less CPU overhead at high packet rates.`]]
  },
  exercises: [
    {lv:'E', q:`Classify each as interrupt (I) or exception (E): keyboard press, page fault, syscall, network packet arrival. Answer like <code>I E E I</code>.`, ans:'I E E I', hint:`Who caused it: the running instruction or a device?`, answer:`<p>Keyboard and network are devices (interrupts). Page fault and syscall are caused by the instruction (exceptions; syscall is a trap).</p>`},
    {lv:'M', q:`Without timer interrupts (plain FCFS), when does <code>editor</code> first get the CPU?`, sim:'sched', key:'rt.editor', input:`algo: FCFS
spin    0 20
editor  1 2`, hint:`Response time = start − arrival; editor arrives at 1.`, answer:`<p>spin runs 0–20; editor starts at 20, so its response time is 19.</p>`},
    {lv:'H', q:`A 10 Gbit/s NIC receives 1 million small packets per second. Each interrupt costs 2 µs of CPU. What fraction of one CPU (in %) goes to interrupts alone, and what would you do?`, ans:'200', hint:`1,000,000 × 2 µs per second.`, answer:`<p>2 seconds of CPU per second = 200%: more than a whole core. Use interrupt coalescing, NAPI polling under load, and spread queues across CPUs (RSS).</p>`},
  ],
  quiz: [
    [`A hardware timer firing is a(n)…`,[`Exception`,`Interrupt`,`System call`,`Signal handler`],1,`Asynchronous, from hardware.`,'E'],
    [`A page fault is a(n)…`,[`Interrupt from the disk`,`Exception caused by the current instruction`,`System call`,`Abort always`],1,`Synchronous, usually recoverable.`,'E'],
    [`The interrupt vector table maps…`,[`Files to inodes`,`Interrupt/exception numbers to handler addresses`,`Pages to frames`,`PIDs to processes`],1,`Hardware indexes it.`,'E'],
    [`Device interrupts mainly save the CPU from…`,[`Crashing`,`Polling devices in a loop`,`Paging`,`Scheduling`],1,`Event-driven instead of busy-waiting.`,'M'],
    [`After a page fault is handled, the faulting instruction…`,[`Is skipped`,`Re-executes`,`Is killed`,`Moves to another CPU`],1,`That's what makes it a fault.`,'M'],
    [`Preemptive scheduling depends on…`,[`System calls`,`Timer interrupts`,`DMA`,`Signals`],1,`The timer returns control to the kernel.`,'M'],
  ],
  quizAdv: [
    [`Linux splits interrupt handling into…`,[`User and kernel halves`,`A fast top half and deferred bottom halves (softirqs, tasklets, workqueues)`,`Two CPUs`,`Read and write halves`],1,`Keep handlers short.`,'H'],
    [`Interrupt coalescing trades…`,[`Security for speed`,`A little latency for fewer interrupts (less CPU)`,`Memory for disk`,`Nothing`],1,`Batching.`,'H'],
    [`Which can NOT be masked by the OS?`,[`Timer IRQ`,`Disk IRQ`,`Non-maskable interrupt (NMI)`,`Keyboard IRQ`],2,`NMIs are for critical hardware events and watchdogs.`,'H'],
  ],
});
