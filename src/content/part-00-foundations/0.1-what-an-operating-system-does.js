/* 0.1 What an operating system does */
topic('0', { no:'0.1', title:'What an operating system does',
idea:`An OS is the layer of software that turns one shared, messy machine into many clean, private-looking ones. Follow a tiny program that prints a line and see which parts the OS quietly provides: a process, memory, a file, a CPU turn and protection from everyone else.`,
actors:'Programs', dgTitle:'Layers of a computer system', stateTitle:'What the OS provides',
nodes:{
  app:{x:110,y:34,label:'hello (your program)',w:180,h:36},
  app2:{x:330,y:34,label:'browser, shell, …',w:180,h:36},
  lib:{x:220,y:92,label:'C library (libc)',w:300,h:32},
  sys:{x:220,y:146,label:'system call interface',w:300,h:30,kind:'lock'},
  k:{x:220,y:200,label:'kernel: processes · memory · files · devices',w:400,h:38},
  hw:{x:220,y:258,label:'hardware: CPU · RAM · disk · network',w:400,h:36,kind:'mem'}
},
edges:[['app','lib'],['app2','lib'],['lib','sys'],['sys','k'],['k','hw']],
vb:'0 0 440 290',
codes:{a:`#include <stdio.h>

int main(void) {
    printf("hello\\n");          // libc buffers the text
    return 0;                    // exit: the OS reclaims everything
}

// what really happens underneath (simplified)
write(1, "hello\\n", 6);         // system call: ask the kernel
exit_group(0);                   // system call: end the process`},
steps:[
{hl:{hello:[3]}, th:[['hello','RUN:ok','a process: has its own memory'],['shell','WAITING:warn','waits for hello to finish']], d:{on:['app'], e:[]}, g:[G('What the OS provides',['a process','the running program + its resources','hot'])],
 say:`You type <code>./hello</code>. The shell asks the OS to create a <b>process</b>: a running instance of the program with its own memory, its own CPU registers and an ID. The shell then waits. The program believes it has the machine to itself. That illusion is the OS's first job.`},
{hl:{hello:[4]}, d:{on:['app','lib'], e:[['app','lib','printf','hot']]}, g:[G('What the OS provides',['a process','the running program + its resources'],['memory','private virtual address space','hot'])],
 say:`<code>printf</code> is a library function, not the OS. libc formats the text into a buffer in the process's own memory. That memory is <b>virtual</b>: addresses the program sees are translated by hardware the OS controls, so it can't see or scribble on other programs' memory.`},
{hl:{hello:[9]}, th:[['hello','RUN:warn','in kernel mode (system call)'],['shell','WAITING:warn','waits']], d:{on:['sys','k'], e:[['app','lib','printf','ok'],['lib','sys','write()','hot'],['sys','k','trap','hot']]}, g:[G('What the OS provides',['a process','the running program + its resources'],['memory','private virtual address space'],['I/O','write(fd 1) → terminal device','hot'],['protection','only the kernel touches devices','hot'])], log:['syscall write(1, "hello\\n", 6)'],
 say:`To actually show text, libc calls <code>write(1, …)</code>, a <b>system call</b>. The CPU switches to <b>kernel mode</b>, the only mode allowed to talk to devices. File descriptor 1 is "standard output", which the kernel maps to your terminal. Programs never drive hardware directly; they ask.`},
{hl:{}, th:[['hello','READY:info','paused: its time slice ended'],['browser','RUN:ok','gets the CPU now'],['shell','WAITING:warn','waits']], d:{on:['k','hw'], e:[['k','hw','timer interrupt','hot']]}, gt:GT(null,['hello',0,4],['browser',4,8],['hello',8,10]), g:[G('What the OS provides',['CPU sharing','each program gets turns (time slices)','hot'])], log:['timer interrupt → scheduler picks browser'],
 say:`Meanwhile, other programs are running too. A hardware timer interrupts the CPU every few milliseconds; the kernel's <b>scheduler</b> decides who runs next. Switching fast enough makes many programs appear to run at once on few cores. The timeline shows <code>hello</code> and the browser taking turns.`},
{hl:{hello:[5,10]}, th:[['hello','TERM:dim','exited with status 0'],['shell','RUN:ok','wakes up, prints the prompt']], d:{on:['k'], e:[['sys','k','exit','hot']]}, gt:null, g:[G('What the OS provides',['clean-up','memory, files, ID released','ok'],['exit status','0 handed back to the shell','ok'])], log:['hello','syscall exit_group(0)','shell: wait() returns 0'],
 say:`<code>return 0</code> becomes the <code>exit</code> system call. The OS frees the process's memory, closes its files, and hands the exit status to the waiting shell. Nothing the program forgot to free leaks past its death: the OS owns all resources and takes them back.`},
{hl:{}, th:[], d:{on:['k'], e:[]}, g:[G('Two views of an OS',['resource manager','shares CPU, memory, disk, devices fairly and safely','ok'],['extended machine','processes, files, sockets instead of raw hardware','ok']),G('Its main parts',['process & thread management','scheduling, creation, signals'],['memory management','virtual memory, paging'],['file systems & storage','files, directories, caching'],['I/O & devices','drivers, interrupts'],['protection & security','user/kernel mode, permissions'])],
 say:`<b>Say it:</b> "An operating system manages the hardware and gives programs clean abstractions. As a <b>resource manager</b> it shares the CPU (scheduling), memory (virtual memory) and devices safely between programs. As an <b>extended machine</b> it offers processes, files and sockets instead of raw hardware. The kernel runs in a privileged mode; programs ask it for things through system calls."`}
],
keep:[`OS = resource manager + extended machine (abstractions).`,`Kernel = the privileged core; programs reach it through system calls.`,`Key abstractions: process, virtual memory, file, socket.`,`Timer interrupts + scheduler = many programs share few CPUs.`,`The OS reclaims everything when a process exits.`]}, {
  imp: 'must',
  theory: TH(`An operating system is the software layer that manages hardware resources and gives programs simple, safe abstractions like processes, files and virtual memory.`,
`<p>Think of a hotel. Guests (programs) want rooms, electricity, water and room service. They don't wire their own power or plumb their own pipes; the hotel staff (the OS) shares these resources between guests, keeps guests out of each other's rooms, and cleans up when someone checks out.</p>
<p>Without an OS, every program would need its own disk driver, would have to agree with every other program about who uses which memory, and one buggy program could crash the whole machine. The OS solves this with two ideas: <b>abstraction</b> (a "file" instead of disk sectors, a "process" instead of raw CPU) and <b>protection</b> (programs run in a restricted mode and must ask the kernel for anything sensitive).</p>`,
[[`Kernel`,`The core of the OS that runs in privileged (kernel) mode and is always resident in memory.`],[`Process`,`A program in execution, with its own memory, registers and resources.`],[`System call`,`A controlled entry into the kernel, e.g. read, write, fork.`],[`Virtual memory`,`Each process sees its own private address space, mapped to real RAM by the OS.`],[`Scheduler`,`The kernel part that decides which ready process runs next.`],[`Multiprogramming`,`Keeping several programs in memory so the CPU always has work.`],[`Time sharing`,`Switching the CPU between programs so fast they appear simultaneous.`]],
[`Hardware boots and loads the kernel, which takes control of the CPU, memory and devices.`,`The kernel starts the first user process, which starts others (shell, services, apps).`,`Programs run in user mode; when they need a resource they make a system call.`,`Timer and device interrupts return control to the kernel regularly, so it can schedule and handle I/O.`,`When a program exits, the kernel reclaims its memory, files and other resources.`],
[`Servers run hundreds of processes; the OS isolates them so one crash doesn't take down the rest.`,`Performance work (latency, throughput) is often about understanding OS behaviour: scheduling, page faults, I/O waits.`,`Containers and VMs are OS features built on the same isolation ideas.`],
[`Thinking printf talks to the hardware: it goes through libc and then a system call.`,`Confusing the kernel with the whole OS distribution (shell, utilities, GUI).`,`Assuming a program's memory addresses are physical RAM addresses.`])
  ,
  examples: [
    {lv:'basic', title:'See the system calls a program makes', code:`$ strace ./hello
execve("./hello", ["./hello"], ...) = 0
brk(NULL)                          = 0x55d0c3a2b000
...
write(1, "hello\\n", 6)             = 6
exit_group(0)                      = ?`, why:`<code>strace</code> (Linux) lists every system call. Even a one-line program makes dozens: loading itself (<code>execve</code>, <code>mmap</code>), getting memory (<code>brk</code>), printing (<code>write</code>) and exiting.`},
    {lv:'mid', title:'Two programs share one CPU', sim:'sched', input:`# two programs, one CPU, the OS gives turns of 2 ms
algo: RR
quantum: 2
# name arrival burst
hello   0 3
browser 0 5`, why:`A round-robin scheduler alternates between the programs. Neither waits for the other to finish: both make progress, which is what "time sharing" means. Change the quantum to 10 and see the programs run one after the other instead.`},
    {lv:'adv', title:'Where a process\'s time goes: user vs kernel', code:`$ time dd if=/dev/zero of=/dev/null bs=1 count=5000000
5000000+0 records in
real    0m2.91s
user    0m0.84s       # running the program's own code
sys     0m2.06s       # inside the kernel, doing 10 million read/write syscalls`, why:`Copying one byte at a time makes 10 million system calls, so most time is spent in the kernel (<code>sys</code>). With <code>bs=1M</code> the same copy takes a few milliseconds: fewer, bigger system calls. Syscall overhead is real.`},
  ],
  tips: {
    say:`"An OS manages hardware resources and gives programs abstractions. It shares the CPU through scheduling, memory through virtual memory, and storage and devices through files and drivers, while protecting programs from each other with user/kernel mode. Programs request services through system calls."`,
    points:[`Two roles: resource manager and abstraction provider.`,`Mention protection: user vs kernel mode.`,`Name the core subsystems: process, memory, file system, I/O.`],
    traps:[`Describing the OS as "the GUI".`,`Saying programs access hardware directly.`],
    qa:[[`What is the difference between the kernel and the OS?`,`The kernel is the privileged core (scheduler, memory manager, drivers). The OS usually also includes system libraries, the shell and utilities that run in user mode.`],
        [`Why can't a program just disable interrupts to keep the CPU?`,`Disabling interrupts is a privileged instruction. In user mode the CPU traps, and the kernel kills or signals the program. That is exactly what protection is for.`],
        [`What does multiprogramming buy you?`,`CPU utilisation: while one program waits for I/O, another runs, instead of the CPU sitting idle.`]]
  },
  exercises: [
    {lv:'E', q:`In the round-robin run below, at what time does <code>hello</code> finish?`, sim:'sched', key:'ct.hello', input:`algo: RR
quantum: 2
hello   0 3
browser 0 5`, hint:`hello runs 0–2, browser 2–4, then hello needs 1 more unit.`, answer:`<p>hello runs 0–2, browser 2–4, hello 4–5 and is done at time 5.</p>`},
    {lv:'M', q:`A program spends 30 ms computing, then 70 ms waiting for disk, repeatedly. With only this program, what percentage of the time is the CPU busy? (number only)`, ans:'30', hint:`Busy time / total time.`, answer:`<p>30 / (30 + 70) = 30%. Multiprogramming lets other programs use the 70% idle time.</p>`},
    {lv:'H', q:`List three things that would go wrong on a machine with no OS where two programs run at once.`, hint:`Memory, devices, CPU.`, answer:`<ul><li>They could overwrite each other's memory: no isolation.</li><li>Both could drive the disk at once and corrupt it: no coordination of devices.</li><li>A program in an infinite loop would hold the CPU forever: nothing preempts it.</li></ul>`},
  ],
  quiz: [
    [`The kernel is…`,[`The shell`,`The privileged core of the OS that manages hardware`,`A C library`,`The bootloader`],1,`It runs in kernel mode and is always resident.`,'E'],
    [`How does a user program ask the OS to write to a file?`,[`Writes to the disk controller directly`,`A system call`,`Calls the scheduler`,`Edits the page table`],1,`System calls are the only entry into the kernel.`,'E'],
    [`Which is NOT a core OS abstraction?`,[`Process`,`File`,`Virtual address space`,`Spreadsheet`],3,`Spreadsheets are applications.`,'E'],
    [`What lets the OS regain the CPU from a program stuck in a loop?`,[`The program yielding`,`A hardware timer interrupt`,`The disk`,`The C library`],1,`Timer interrupts make preemption possible.`,'M'],
    [`Multiprogramming mainly improves…`,[`Security`,`CPU utilisation`,`Disk capacity`,`Screen resolution`],1,`Run something else while one program waits for I/O.`,'M'],
    [`Why are a process's memory addresses not physical RAM addresses?`,[`Performance only`,`They are virtual and translated by the MMU, which gives isolation`,`RAM has no addresses`,`The compiler randomises them`],1,`Virtual memory isolates processes.`,'M'],
  ],
  quizAdv: [
    [`printf("hi") in C ultimately becomes…`,[`A direct write to video memory`,`A write() system call (possibly after buffering)`,`An interrupt handler`,`A fork()`],1,`libc buffers, then calls write.`,'H'],
    [`Time spent in "sys" in the output of time is…`,[`Waiting for disk`,`CPU time spent in the kernel on behalf of the process`,`Sleep time`,`Time in other processes`],1,`user = own code, sys = kernel on its behalf.`,'H'],
    [`Which event does NOT enter the kernel?`,[`A system call`,`A page fault`,`A timer interrupt`,`Calling a function in the same program`],3,`Ordinary function calls stay in user mode.`,'H'],
  ],
});
