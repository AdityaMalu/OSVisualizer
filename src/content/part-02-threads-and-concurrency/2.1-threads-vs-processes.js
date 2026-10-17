/* 2.1 Threads vs processes */
topic('2', { no:'2.1', title:'Threads vs processes',
idea:`A thread is a second flow of execution inside the same process. Start two threads and see what they share (code, heap, globals, open files) and what each has to itself (stack, registers, thread ID), then compare the cost and the risks with two processes.`,
actors:'Threads', dgTitle:'One process, two threads', stateTitle:'Shared vs private',
nodes:{
  code:{x:240,y:30,label:'code · globals · heap · open files',w:330,h:34,kind:'mem'},
  s1:{x:140,y:120,label:'T1 stack\nregs, PC',w:130,h:50},
  s2:{x:340,y:120,label:'T2 stack\nregs, PC',w:130,h:50},
  p2:{x:240,y:205,label:'another process: everything separate',w:330,h:34,kind:'lock'}
},
edges:[['s1','code','shares'],['s2','code','shares']],
vb:'0 0 480 240',
codes:{a:`#include <pthread.h>
int hits = 0;                          // global: shared by all threads
void *worker(void *arg) {
    int id = *(int *)arg;              // local: on this thread's own stack
    char *buf = malloc(64);            // heap: shared space (pointer is private)
    hits++;                            // shared → needs a lock (race!)
    printf("thread %d\\n", id);
    free(buf);
    return NULL;
}
int main(void) {
    pthread_t t1, t2; int a = 1, b = 2;
    pthread_create(&t1, NULL, worker, &a);
    pthread_create(&t2, NULL, worker, &b);
    pthread_join(t1, NULL);            // wait for each thread to finish
    pthread_join(t2, NULL);
    printf("hits = %d\\n", hits);
}`},
steps:[
{hl:{main:[12,13]}, th:[['main','RUN:ok','creates T1'],['T1','READY:info','new thread']], d:{on:['code','s1'], hide:['s2','p2'], e:[['s1','code','shares','hot']]}, g:[G('Shared vs private',['T1 gets','its own stack + registers','hot'],['T1 shares','everything else with main'])], log:['pthread_create → clone(CLONE_VM|CLONE_FILES|…)'],
 say:`<code>pthread_create</code> starts a new <b>thread</b> in the same process. On Linux it's the <code>clone</code> system call asked to share the address space, file table and signal handlers. Creating it is cheap: just a stack and a kernel task, no copy of memory.`},
{hl:{main:[14], T1:[4]}, th:[['main','RUN:ok','creates T2'],['T1','RUN:ok','id = 1'],['T2','READY:info','new thread']], d:{on:['s1','s2'], hide:['p2'], e:[['s1','code','shares','ok'],['s2','code','shares','hot']]}, g:[G('Private per thread',['stack (locals: id, buf)','own','ok'],['registers, PC, SP','own','ok'],['thread id, errno, signal mask','own','ok'])],
 say:`A second thread starts. Each thread has its <b>own stack</b> (so <code>id</code> and <code>buf</code> are per-thread locals), its own registers and program counter, and its own thread ID and <code>errno</code>. That's all a thread is: an independent execution path.`},
{hl:{T1:[5,6], T2:[5,6]}, th:[['main','WAITING:warn','pthread_join(T1)'],['T1','RUN:ok','hits++'],['T2','RUN:ok','hits++ (same variable!)']], d:{on:['code'], bad:['code'], hide:['p2'], e:[['s1','code','hits++','bad'],['s2','code','hits++','bad']]}, g:[G('Shared by all threads',['globals (hits)','shared','bad'],['heap','shared'],['code','shared'],['open files, cwd','shared'],['pid','same pid'])],
 say:`Both threads increment the <b>same</b> global <code>hits</code>, and their heap blocks come from the same heap. Sharing is the point of threads (no IPC needed to exchange data), and also the danger: <code>hits++</code> is load-add-store, so two threads can interleave and lose an update. This is a <b>race condition</b> (Part 4).`},
{hl:{main:[15,16,17]}, th:[['main','RUN:ok','both joined'],['T1','TERM:dim',''],['T2','TERM:dim','']], d:{on:['code'], hide:['p2'], e:[]}, log:['thread 1','thread 2','hits = 2   (or 1 if they raced)'], g:[G('Joining',['pthread_join','wait for a thread and get its return value'],['main returns','whole process exits, killing all threads','bad'])],
 say:`<code>pthread_join</code> is the thread version of <code>wait</code>. If <code>main</code> returned without joining, the whole process would exit and kill the other threads. Note also: a crash (SIGSEGV) in any thread kills the <b>entire process</b>.`},
{hl:{}, th:[], d:{on:['p2'], e:[]}, g:[G('Process',['memory','separate (isolated)','ok'],['create','fork: ms, copies page tables'],['switch','change page table'],['crash','only that process dies','ok'],['communicate','IPC (pipes, sockets, shm)']),G('Thread',['memory','shared','hot'],['create','µs','ok'],['switch','cheaper, same address space','ok'],['crash','whole process dies','bad'],['communicate','just memory (+ locks)','ok'])],
 say:`Contrast with processes: separate memory means isolation (a crash stays contained, Chrome uses one process per site for this) but communication needs IPC and creation and switching cost more. Threads are cheap and share data easily, at the cost of needing synchronisation and sharing a fate.`},
{hl:{}, d:null, g:[G('Rule of thumb',['need isolation / security','processes','ok'],['need fast shared data / many workers','threads','ok'])],
 say:`<b>Say it:</b> "A process is a unit of resource ownership with its own address space; a thread is a unit of execution inside a process. Threads share code, globals, heap and open files but each has its own stack, registers and program counter. Threads are cheaper to create and switch and communicate through shared memory, but need synchronisation and a crash in one kills the process. Processes give isolation at the cost of IPC."`}
],
keep:[`Process = resources + address space. Thread = execution (stack, regs, PC).`,`Threads share: code, globals, heap, open files, pid.`,`Each thread owns: stack, registers, PC, thread-local storage.`,`Threads: cheap, fast to share, need locks, one crash kills all.`,`Processes: isolated, safer, communicate via IPC.`]}, {
  imp: 'must',
  theory: TH(`A thread is an independent execution path within a process; threads share the process's memory and resources but each has its own stack and registers.`,
`<p>A process is a kitchen; threads are cooks in it. All cooks share the fridge, the stove and the recipe book (heap, globals, code), but each has their own hands and their own place in the recipe (registers, program counter) and their own cutting board (stack). Adding a cook is far cheaper than building a second kitchen, but cooks can bump into each other over shared ingredients.</p>
<p>Operating systems schedule threads, not processes: a single-threaded process is just a process with one thread. On Linux both are "tasks"; the difference is what they share.</p>`,
[[`Thread`,`Unit of CPU scheduling within a process.`],[`Thread-local storage`,`Per-thread variables (errno, __thread / ThreadLocal).`],[`pthread_create / join`,`Start a thread / wait for it to finish.`],[`Detached thread`,`A thread whose resources are freed automatically on exit (no join).`],[`clone()`,`Linux syscall underlying both fork and threads, with share flags.`],[`Race condition`,`Result depends on unpredictable interleaving of shared accesses.`]],
[`The process starts with one thread (main).`,`pthread_create allocates a stack and a kernel task sharing the address space.`,`The scheduler runs threads independently, possibly in parallel on several cores.`,`Threads communicate through shared memory, protected by locks.`,`join waits for a thread; when main exits, all threads die.`],
[`Web servers and databases use thread pools to serve many requests.`,`GUI apps keep a UI thread responsive and do work on background threads.`,`Browsers use processes for isolation and threads inside each for parallelism.`],
[`Sharing data without locks.`,`Returning from main before joining workers.`,`Passing a pointer to a loop variable that changes before the thread reads it.`,`Creating a thread per request without limit.`])
  ,
  examples: [
    {lv:'basic', title:'Threads share a global; processes don\'t', code:`int g = 0;
void *inc(void *x) { g = 42; return NULL; }
int main(void) {
    pthread_t t; pthread_create(&t, NULL, inc, NULL); pthread_join(t, NULL);
    printf("after thread:  g = %d\\n", g);    // 42: same memory
    g = 0;
    if (fork() == 0) { g = 42; exit(0); }
    wait(NULL);
    printf("after process: g = %d\\n", g);    // 0: child had a copy
}`, out:`after thread:  g = 42
after process: g = 0`, why:`The thread wrote the parent's own memory; the forked child wrote its private copy.`},
    {lv:'mid', title:'Threads in ps', code:`$ ps -eLf | grep java | head -3      # -L: one line per thread (LWP)
me  9001  9001  ... 41  java -jar app.jar
me  9001  9002  ... 41  java -jar app.jar
me  9001  9003  ... 41  java -jar app.jar
# same PID 9001, different thread IDs; NLWP = 41 threads`, why:`The kernel sees each thread as a task with its own ID (LWP), grouped under one process ID.`},
    {lv:'adv', title:'The lost update, explored exhaustively', sim:'race', input:`shared: hits=0
T1: load r hits; add r 1; store hits r
T2: load r hits; add r 1; store hits r
schedule: T1 T2 T1 T2 T1 T2`, why:`The given schedule interleaves the two increments step by step and ends with hits=1. The table also shows every possible interleaving: only some give the correct 2.`},
  ],
  tips: {
    say:`"A process owns resources: an address space, open files. A thread is an execution context inside a process with its own stack, registers and program counter. Threads share heap, globals, code and files, so they're cheap to create and communicate through memory, but they need synchronisation and a crash in one takes down the process. Processes are isolated and communicate through IPC."`,
    points:[`List shared vs private precisely.`,`Compare cost of creation and switching.`,`Mention isolation and failure modes.`],
    traps:[`Saying threads have their own heap.`,`Saying threads never run in parallel.`],
    qa:[[`If threads share the heap, how does each have its own stack?`,`Each stack is a separate region in the same address space. Other threads could technically access it via a pointer, but by convention each uses only its own.`],
        [`Why did Chrome choose processes per site?`,`Isolation: a renderer crash or exploit can't reach other sites' memory, and the sandbox restricts each process. Threads couldn't give that.`],
        [`What happens when a thread calls fork()?`,`The child gets a copy of the whole address space but only the calling thread. Locks held by other threads stay locked forever in the child, so only exec-like work is safe after fork in multithreaded programs.`]]
  },
  exercises: [
    {lv:'E', q:`Which of these are private to each thread: heap, stack, globals, registers, open files? Answer like <code>x y</code>.`, ans:'stack registers', hint:`What do you need to run independently?`, answer:`<p>Stack and registers (plus PC, thread ID, TLS). Heap, globals and files are shared.</p>`},
    {lv:'M', q:`Two threads each run <code>hits++</code> once (load, add, store) with no lock. How many interleavings of their six steps are possible in total?`, sim:'race', key:'schedules', input:`shared: hits=0
T1: load r hits; add r 1; store hits r
T2: load r hits; add r 1; store hits r`, hint:`Choose which 3 of the 6 slots belong to T1.`, answer:`<p>C(6,3) = 20 interleavings; only some produce 2.</p>`},
    {lv:'H', q:`You're building a plugin system where third-party plugins may crash. Threads or processes for plugins? Argue it.`, hint:`Failure isolation.`, answer:`<p>Processes: a crashing plugin in a thread would kill the host. Run plugins in separate (sandboxed) processes and talk over IPC; accept the higher communication cost. Browsers and IDEs (VS Code extension host) do this.</p>`},
  ],
  quiz: [
    [`Threads of the same process share…`,[`Stacks`,`Registers`,`The heap and globals`,`Program counters`],2,`Each has its own stack, regs, PC.`,'E'],
    [`Each thread has its own…`,[`Heap`,`Address space`,`Stack`,`Open file table`],2,`For its function frames.`,'E'],
    [`Creating a thread vs a process is usually…`,[`Slower`,`Much cheaper`,`Identical`,`Impossible on Linux`],1,`No address-space copy.`,'E'],
    [`If one thread segfaults…`,[`Only it dies`,`The whole process dies`,`Nothing happens`,`The OS reboots`],1,`Shared fate.`,'M'],
    [`pthread_join is analogous to…`,[`fork`,`exec`,`wait`,`kill`],2,`Wait for completion.`,'M'],
    [`Why do threads need locks more than processes?`,[`They don't`,`They share memory by default, so concurrent writes can race`,`Locks are faster`,`Processes can't use locks`],1,`Sharing → races.`,'M'],
  ],
  quizAdv: [
    [`On Linux, threads are created with…`,[`fork`,`clone with sharing flags`,`exec`,`vfork`],1,`CLONE_VM, CLONE_FILES, …`,'H'],
    [`errno in a multithreaded C program is…`,[`One global`,`Thread-local`,`Per process only`,`Not available`],1,`Otherwise it would be useless.`,'H'],
    [`After fork() in a multithreaded process, the child has…`,[`All threads`,`Only the thread that called fork`,`No threads`,`Two threads`],1,`Beware locks held by others.`,'H'],
  ],
});
