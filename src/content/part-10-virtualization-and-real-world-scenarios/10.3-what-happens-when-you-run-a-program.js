/* 10.3 What happens when you run a program */
topic('10', { no:'10.3', title:'What happens when you type ./app and press Enter',
idea:`The classic end-to-end interview question, OS edition. Follow one command from the keyboard interrupt through the shell's fork and exec, the ELF loader, the dynamic linker, demand paging, scheduling and system calls, to exit and the shell's prompt. Every earlier part of this stepper appears once.`,
actors:'Processes', dgTitle:'The journey', stateTitle:'Which topic',
nodes:{
  kb:{x:60,y:40,label:'keyboard IRQ',w:110,h:34,kind:'lock'},
  sh:{x:200,y:40,label:'bash: fork()',w:120,h:34,kind:'actor'},
  ex:{x:340,y:40,label:'child: execve()',w:130,h:34,kind:'actor'},
  ld:{x:340,y:120,label:'ld.so: link libc',w:130,h:34},
  main:{x:200,y:120,label:'main(): faults,\nsyscalls',w:130,h:44},
  exit:{x:60,y:120,label:'exit → wait',w:110,h:34}
},
edges:[['kb','sh'],['sh','ex'],['ex','ld'],['ld','main'],['main','exit']],
vb:'0 0 420 160',
codes:{a:`$ ./app data.txt

1  keyboard interrupt → tty driver → bash's read() returns "./app data.txt\\n"
2  bash parses, finds ./app, fork()           (COW copy of bash)
3  child: execve("./app", argv, envp)         (kernel reads the ELF header)
4  kernel maps segments, sets up the stack, jumps to ld.so (the interpreter)
5  ld.so mmaps libc.so, resolves symbols, runs constructors, calls main()
6  main runs: page faults bring in code/data, read()/write() syscalls,
   the scheduler time-slices it with everything else
7  exit(0) → kernel frees memory, closes fds, child becomes a zombie, SIGCHLD
8  bash's waitpid() returns 0 → reaps the child → prints the next prompt`},
steps:[
{hl:{x:[3]}, th:[['bash','WAITING:warn','blocked in read() on the terminal']], d:{on:['kb'], e:[]}, g:[G('Which topic',['keyboard interrupt','0.3 interrupts'],['bash blocked in read()','1.2 process states, 9.2 blocking I/O'])],
 say:`bash is <b>blocked</b> in <code>read()</code> on the terminal. Each key press raises a <b>keyboard interrupt</b>; the terminal driver collects the line, and on Enter it wakes bash, which returns from <code>read</code> with <code>"./app data.txt\n"</code>. (Over SSH it's a network interrupt and a socket instead, same idea.)`},
{hl:{x:[4]}, th:[['bash','RUN:ok','parent'],['bash (child)','READY:info','fork returned 0']], d:{on:['sh'], e:[['kb','sh','line','ok']]}, g:[G('Which topic',['fork, return 0 in the child','1.3'],['copy-on-write','7.5'],['new PCB, PID','1.1'])],
 say:`bash parses the line and calls <code>fork()</code>. The kernel creates a child with a new PID and PCB, sharing bash's memory <b>copy-on-write</b>. The child sets up any redirections (none here) and is ready to exec.`},
{hl:{x:[5,6]}, th:[['bash','WAITING:warn','waitpid(child)'],['app','RUN:ok','execve: new image']], d:{on:['ex'], e:[['sh','ex','fork','ok']]}, g:[G('Which topic',['execve','1.3'],['ELF header → PT_LOAD segments','6.6 (segments), 6.3 (paging)'],['stack with argv, envp','1.1 address space'],['permissions check','8.2 inodes'])],
 say:`The child calls <code>execve("./app")</code>. The kernel resolves the path (8.2), checks execute permission, reads the <b>ELF header</b>, throws away the old address space, and <b>maps</b> the program's text and data segments (nothing is read yet: demand paging). It builds a new stack with <code>argv</code> and <code>envp</code>. Since the binary is dynamically linked, it also maps the interpreter <code>ld.so</code> and jumps there. bash, meanwhile, blocks in <code>waitpid</code>.`},
{hl:{x:[7]}, d:{on:['ld'], e:[['sh','ex','','ok'],['ex','ld','','hot']]}, g:[G('Which topic',['mmap shared libraries','7.5 (shared frames, page cache)'],['page faults while linking','7.1'])],
 say:`The dynamic linker <code>ld.so</code> <b>mmaps</b> <code>libc.so</code> and other libraries. Their code pages are already in the page cache and shared with every other process using libc (7.5), so this costs almost no I/O. It resolves symbols, applies relocations, runs constructors and finally calls <code>main(argc, argv)</code>.`},
{hl:{x:[8,9]}, th:[['bash','WAITING:warn',''],['app','RUN:ok','computing, faulting, syscalls']], d:{on:['main'], e:[['ld','main','','ok']]}, gt:GT(null,['app',0,3],['other',3,5],['app',5,7],['app',7,8,'dim']), g:[G('Which topic',['first-touch page faults','7.1 (minor/major)'],['open/read data.txt','8.2, 9.3 page cache'],['system calls','0.2'],['time slices, preemption','3.x scheduling, 1.5 context switch'],['malloc → brk/mmap','6.x memory'])],
 say:`<code>main</code> runs. Touching new code and data pages causes <b>page faults</b> (mostly minor). Opening and reading <code>data.txt</code> are <b>system calls</b> (0.2) served from the page cache if the file was used recently (9.3), otherwise the process blocks for disk I/O while others run. The scheduler time-slices it with every other task (3.x), with context switches on each change (1.5).`},
{hl:{x:[10]}, th:[['bash','READY:ok','woken by SIGCHLD / waitpid'],['app','ZOMBIE:bad','exited, waiting to be reaped']], d:{on:['exit'], e:[['main','exit','exit(0)','hot']]}, gt:null, g:[G('Which topic',['exit: free memory, close fds','1.1, 8.4'],['zombie + SIGCHLD','1.4'])],
 say:`<code>main</code> returns 0; libc flushes stdio buffers (9.3) and calls <code>exit_group(0)</code>. The kernel frees the address space, closes file descriptors and releases everything except a small record with the exit status: the process is briefly a <b>zombie</b>, and bash gets <code>SIGCHLD</code>.`},
{hl:{x:[11]}, th:[['bash','RUN:ok','prints prompt, read() again']], d:{on:['sh'], e:[]}, g:[G('Which topic',['wait reaps the zombie','1.3, 1.4'],['back to blocked read()','1.2'])],
 say:`<b>Say it:</b> "The keyboard interrupt wakes bash from its blocking read. bash forks a copy-on-write child, which calls execve: the kernel checks permissions, maps the ELF segments lazily, sets up the stack and starts the dynamic linker, which mmaps shared libraries and calls main. main runs under the scheduler, page-faulting code and data in on demand and making system calls for I/O, possibly blocking on disk. On exit the kernel frees its resources and leaves a zombie; bash's waitpid reaps it, gets the exit status and prints the prompt."`}
],
keep:[`Interrupt → bash read() returns → fork (COW) → execve.`,`execve: check perms, map ELF segments lazily, build stack, start ld.so.`,`ld.so: mmap shared libs (shared page-cache frames), call main.`,`Run: page faults, syscalls, scheduling, maybe blocking I/O.`,`exit → zombie + SIGCHLD → parent waitpid reaps → prompt.`]}, {
  imp: 'must',
  theory: TH(`Running a program ties together interrupts, process creation, program loading, virtual memory, scheduling, system calls and process exit.`,
`<p>This question is popular because it has no single right depth: a good answer touches every layer briefly and can zoom into any one when asked. Use the walkthrough as a checklist and the "Which topic" panel to jump back to the detailed topic for any step.</p>
<p>A strong structure: input (interrupt and shell), creation (fork), loading (exec, ELF, dynamic linking), execution (paging, syscalls, scheduling), termination (exit, zombie, wait).</p>`,
[[`ELF`,`Executable and Linkable Format: Linux binaries.`],[`PT_LOAD segment`,`Part of an ELF file to map into memory.`],[`Interpreter (ld.so)`,`Dynamic linker named in the ELF header.`],[`Dynamic linking`,`Resolving library symbols at load/run time.`],[`argv / envp / auxv`,`Arguments, environment and auxiliary info on the initial stack.`],[`exit_group`,`Syscall ending all threads of the process.`]],
[`Interrupt delivers input; the shell's read returns.`,`Shell forks; child sets up redirections.`,`execve loads the ELF: maps segments, builds the stack, starts ld.so.`,`ld.so maps libraries and calls main.`,`Program runs: faults, syscalls, scheduling.`,`exit: resources freed, zombie, SIGCHLD; the parent reaps it.`],
[`strace -f ./app shows execve, mmap of libraries, and every syscall in order.`,`ltrace shows library calls; LD_DEBUG=libs shows the dynamic linker at work.`,`Static binaries (Go, musl) skip ld.so entirely.`],
[`Saying the whole binary is read into memory at exec.`,`Forgetting the dynamic linker.`,`Forgetting the parent must wait.`])
  ,
  examples: [
    {lv:'basic', title:'Watch the whole journey with strace', code:`$ strace -f -e trace=process,execve,mmap,openat bash -c ./app 2>&1 | head
clone(child_stack=NULL, flags=CLONE_CHILD_SETTID|SIGCHLD) = 51234      # fork
[pid 51234] execve("./app", ["./app"], 0x7ffd… /* 23 vars */) = 0
[pid 51234] openat(AT_FDCWD, "/lib/x86_64-linux-gnu/libc.so.6", O_RDONLY|O_CLOEXEC) = 3
[pid 51234] mmap(NULL, 2125328, PROT_READ, MAP_PRIVATE|MAP_DENYWRITE, 3, 0) = 0x7f…
[pid 51234] exit_group(0)                = ?
+++ exited with 0 +++`, why:`fork (clone), exec, the dynamic linker opening and mapping libc, and exit, exactly as in the walkthrough.`},
    {lv:'mid', title:'The ELF segments exec maps', code:`$ readelf -l ./app | grep -E 'INTERP|LOAD' -A1
  INTERP   … [Requesting program interpreter: /lib64/ld-linux-x86-64.so.2]
  LOAD     0x000000 0x0000000000000000 … R   0x1000
  LOAD     0x001000 0x0000000000001000 … R E 0x1000
  LOAD     0x002000 0x0000000000002000 … R   0x1000
  LOAD     0x002db8 0x0000000000003db8 … RW  0x1000`, why:`INTERP names the dynamic linker; each LOAD becomes a mapping with its permissions. Nothing is read until page faults ask for it.`},
    {lv:'adv', title:'Where the time goes in startup', code:`$ perf stat -e page-faults,context-switches,task-clock ./app --version
           412      page-faults          # code, data, libc pages on first touch
             1      context-switches
          1.83 msec task-clock
$ LD_DEBUG=statistics ./app --version 2>&1 | grep 'total startup'
     total startup time in dynamic loader: 312 µs`, why:`For small programs, startup is dominated by dynamic linking and first-touch page faults, both topics from earlier parts.`},
  ],
  tips: {
    say:`"The keyboard interrupt wakes the shell, blocked in read. It forks a child, copy-on-write, which calls execve. The kernel checks permissions, discards the old address space, maps the ELF's segments without reading them, builds the stack with argv and envp, and starts the dynamic linker, which maps shared libraries and calls main. main runs as a scheduled process, page-faulting its code and data in on demand and making system calls for I/O, possibly blocking on disk. When it exits, the kernel frees its resources and leaves a zombie until the shell's waitpid reaps it, and the shell prints the next prompt."`,
    points:[`Cover all five phases in order.`,`Mention laziness: demand paging and COW.`,`Offer to deep-dive any step.`],
    traps:[`Saying exec reads the whole binary.`,`Skipping the shell's wait.`],
    qa:[[`What's different for a statically linked binary?`,`No interpreter: the kernel jumps straight to the program's entry point, and libraries are already inside the executable.`],
        [`Why is the second run of a program faster?`,`Its code and libraries are in the page cache, so page faults are minor and no disk reads are needed.`],
        [`What if ./app lacks execute permission?`,`execve fails with EACCES; the child prints an error and exits 126; bash reports "Permission denied".`]]
  },
  exercises: [
    {lv:'E', q:`Which system call replaces the child's program with ./app?`, ans:'execve', hint:`The exec family's real syscall.`, answer:`<p>execve.</p>`},
    {lv:'M', q:`After app exits but before bash calls waitpid, what state is app in? (one word)`, ans:'zombie', hint:`1.4.`, answer:`<p>Zombie.</p>`},
    {lv:'H', q:`List, in order, the three kernel objects/steps between Enter and main() that this walkthrough named: answer as <code>fork execve ld.so</code> style.`, ans:'fork execve ld.so', hint:`Clone, replace, link.`, answer:`<p>fork → execve → ld.so (dynamic linker) → main.</p>`},
  ],
  quiz: [
    [`The first thing that happens when you press Enter is…`,[`fork`,`A keyboard interrupt`,`exec`,`A page fault`],1,`Hardware event.`,'E'],
    [`The shell creates the new process with…`,[`exec`,`fork (then exec)`,`mmap`,`clone of the kernel`],1,`Then exec in the child.`,'E'],
    [`During execve, the program's code is…`,[`Fully read into RAM`,`Mapped, then loaded page by page on demand`,`Compiled`,`Copied from bash`],1,`Demand paging.`,'E'],
    [`The dynamic linker ld.so…`,[`Compiles code`,`Maps shared libraries and resolves symbols before main`,`Schedules the process`,`Reaps zombies`],1,`Named by PT_INTERP.`,'M'],
    [`Shared libraries load quickly because…`,[`They're small`,`Their pages are usually already in the page cache and shared`,`They're compiled at boot`,`They're on the GPU`],1,`7.5.`,'M'],
    [`The shell prints the next prompt after…`,[`fork returns`,`waitpid reaps the child`,`exec returns`,`The page cache flushes`],1,`Foreground job finished.`,'M'],
  ],
  quizAdv: [
    [`PT_INTERP in an ELF file names…`,[`The shell`,`The dynamic linker`,`libc`,`The kernel`],1,`/lib64/ld-linux-x86-64.so.2.`,'H'],
    [`A command that exists but isn't executable makes bash exit with…`,[`0`,`126`,`127`,`137`],1,`127 = not found, 137 = SIGKILL.`,'H'],
    [`The auxiliary vector (auxv) on the initial stack tells the program…`,[`Its source code`,`Things like page size, entry point, vDSO address`,`Its parent's memory`,`The scheduler policy`],1,`Kernel → process info.`,'H'],
  ],
});
