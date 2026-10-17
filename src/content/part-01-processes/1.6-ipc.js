/* 1.6 Inter-process communication */
topic('1', { no:'1.6', title:'IPC: pipes, shared memory, message queues, sockets',
idea:`Processes have separate memory, so how do they talk? Run <code>ls | wc -l</code> and watch bytes flow through a pipe (and block when it's full or empty), then compare it with shared memory, where two processes see the same page and must synchronise themselves.`,
actors:'Processes', dgTitle:'Data path', stateTitle:'Pipe buffer (in the kernel)',
nodes:{
  ls:{x:70,y:60,label:'ls',w:90,h:40,kind:'actor'},
  pipe:{x:240,y:60,label:'pipe buffer\n(kernel, 64 KB)',w:170,h:50,kind:'mem'},
  wc:{x:410,y:60,label:'wc -l',w:90,h:40,kind:'actor'},
  pa:{x:70,y:180,label:'process A',w:100,h:40,kind:'actor'},
  shm:{x:240,y:180,label:'shared page\n(mapped in both)',w:170,h:50,kind:'mem'},
  pb:{x:410,y:180,label:'process B',w:100,h:40,kind:'actor'}
},
edges:[],
vb:'0 0 480 230',
codes:{a:`// the shell, for:  ls | wc -l
int fd[2];
pipe(fd);                       // fd[0] = read end, fd[1] = write end
if (fork() == 0) { dup2(fd[1], 1); close(fd[0]); execlp("ls", "ls", NULL); }
if (fork() == 0) { dup2(fd[0], 0); close(fd[1]); execlp("wc", "wc", "-l", NULL); }
close(fd[0]); close(fd[1]);     // parent must close both, or wc never sees EOF

// shared memory: both map the same object
int s = shm_open("/counter", O_CREAT | O_RDWR, 0600);
ftruncate(s, 4096);
int *p = mmap(NULL, 4096, PROT_READ | PROT_WRITE, MAP_SHARED, s, 0);
*p += 1;                        // no copy, no syscall… and no synchronisation!`},
steps:[
{hl:{shell:[2,3]}, th:[['shell','RUN:ok','creates a pipe']], d:{hide:['pa','shm','pb'], on:['pipe'], e:[]}, g:[G('Pipe buffer',['contents','empty'],['fd[0]','read end'],['fd[1]','write end'])],
 say:`<code>pipe()</code> asks the kernel for a small buffer (64 KB on Linux) with two file descriptors: one for writing, one for reading. Data written to one end comes out the other, in order, like a one-way tube.`},
{hl:{shell:[4,5,6]}, th:[['shell','WAITING:warn','waits for both'],['ls','RUN:ok','stdout → pipe'],['wc','RUN:ok','stdin ← pipe']], d:{hide:['pa','shm','pb'], on:['ls','wc'], e:[['ls','pipe','write','hot'],['pipe','wc','read','hot']]}, g:[G('Pipe buffer',['writer','ls (fd 1 = pipe)'],['reader','wc (fd 0 = pipe)'])],
 say:`The shell forks twice. In the first child it makes stdout (fd 1) the write end and execs <code>ls</code>; in the second it makes stdin (fd 0) the read end and execs <code>wc</code>. Neither program knows about pipes: they just write to stdout and read from stdin. Unused ends are closed.`},
{th:[['shell','WAITING:warn',''],['ls','RUN:ok','writing names'],['wc','WAITING:warn','read() blocks: pipe empty']], d:{hide:['pa','shm','pb'], on:['pipe'], e:[['ls','pipe','write','hot'],['pipe','wc','read (blocked)','bad']]}, g:[G('Pipe buffer',['contents','"a.txt\\nb.txt\\n…" 3 KB','hot'],['empty → reader blocks','yes'],['full → writer blocks','yes'])], log:['wc: read() blocked until data arrives'],
 say:`If <code>wc</code> reads before <code>ls</code> writes, <code>read()</code> <b>blocks</b>. If <code>ls</code> wrote faster than <code>wc</code> reads and the 64 KB buffer filled, <code>write()</code> would block. The pipe gives <b>flow control</b> for free: the fast side waits for the slow side.`},
{hl:{shell:[6]}, th:[['shell','RUN:ok','reaps both'],['ls','TERM:dim','exited, write end closed'],['wc','TERM:dim','got EOF, printed 12']], d:{hide:['pa','shm','pb'], on:['wc'], e:[['pipe','wc','EOF','ok']]}, g:[G('Pipe buffer',['contents','drained'],['EOF','when every write end is closed','ok'])], log:['12'],
 say:`When <code>ls</code> exits, its write end closes. Once <i>all</i> write ends are closed and the buffer is empty, <code>read()</code> returns 0: <b>end of file</b>. That's why the parent must close its copies too; otherwise <code>wc</code> would wait forever.`},
{hl:{shell:[9,10,11,12]}, th:[['A','RUN:ok','*p += 1'],['B','RUN:ok','*p += 1']], d:{hide:['ls','pipe','wc'], on:['shm'], bad:['shm'], e:[['pa','shm','load/store','hot'],['pb','shm','load/store','hot']]}, g:[G('Shared memory',['copies','none: both map the same physical page','ok'],['speed','fastest IPC: plain loads and stores','ok'],['danger','concurrent updates race (lost updates)','bad'])],
 say:`<b>Shared memory</b> is the opposite trade-off. Both processes map the same physical page, so communicating is just reading and writing memory: no copies, no system calls. But the kernel no longer orders anything: two processes doing <code>*p += 1</code> at once can lose an update. You must add a mutex or semaphore (Part 4).`},
{hl:{}, th:[], d:null, g:[G('IPC options',['pipe','one-way byte stream, related processes'],['named pipe (FIFO)','pipe with a file name, unrelated processes'],['message queue','discrete messages, kernel-buffered'],['shared memory','fastest, needs your own synchronisation','hot'],['socket','bidirectional, works across machines'],['signal','tiny notification, no data'])],
 say:`<b>Say it:</b> "Processes have isolated memory, so they communicate through the kernel. Message passing (pipes, FIFOs, message queues, sockets) copies data through kernel buffers and gives you ordering and blocking for free. Shared memory maps the same physical pages into both processes: fastest, but you must synchronise with locks or semaphores. Sockets are the general choice when processes may be on different machines."`}
],
keep:[`Pipe: one-way kernel buffer; reader blocks when empty, writer when full.`,`EOF only when all write ends are closed.`,`Shared memory: zero-copy, fastest, must synchronise yourself.`,`Message passing = copies + built-in sync; shared memory = no copies + DIY sync.`,`Sockets: bidirectional, local or across the network.`]}, {
  imp: 'must',
  theory: TH(`IPC lets isolated processes exchange data, either by passing messages through the kernel (pipes, queues, sockets) or by sharing memory pages directly.`,
`<p>Two people in separate offices can pass notes through a mail slot (message passing) or share a whiteboard in the corridor (shared memory). Notes are slower but naturally ordered and nobody overwrites anyone. The whiteboard is instant but two people can write over each other unless they agree on rules.</p>
<p>That's the main design choice. Message passing is simpler and safer; shared memory is faster for large data and is how databases, browsers and video pipelines move big buffers between processes.</p>`,
[[`Pipe`,`Unidirectional byte stream between related processes.`],[`FIFO (named pipe)`,`A pipe with a path in the file system.`],[`Message queue`,`Kernel-managed queue of discrete messages (POSIX mq, System V).`],[`Shared memory`,`Same physical pages mapped into several address spaces.`],[`Socket`,`Endpoint for bidirectional communication (Unix-domain or network).`],[`Blocking`,`A read on an empty channel waits until data arrives.`]],
[`Create the channel (pipe, socket, shm object).`,`Share its handle: inherit across fork, or open it by name.`,`Message passing: write copies data into the kernel; read copies it out.`,`Shared memory: map the region; read and write directly; protect with a lock.`,`Close/unmap when done; a pipe reader sees EOF after all writers close.`],
[`Shell pipelines; Docker and systemd talk to daemons over Unix-domain sockets.`,`PostgreSQL uses shared memory for its buffer cache across backend processes.`,`Chrome's renderer processes talk to the browser process over IPC channels.`],
[`Forgetting to close unused pipe ends (reader never gets EOF, or deadlock).`,`Using shared memory without synchronisation.`,`Assuming a pipe write of any size is atomic (only up to PIPE_BUF, 4 KB on Linux).`])
  ,
  examples: [
    {lv:'basic', title:'Pipelines in the shell', code:`$ ps aux | grep nginx | wc -l
4
# three processes run at the same time, connected by two pipes:
# ps → [pipe] → grep → [pipe] → wc`, why:`All three run concurrently; each blocks when its input pipe is empty. That's why <code>yes | head -1</code> stops <code>yes</code> instantly: when <code>head</code> exits, <code>yes</code> gets SIGPIPE.`},
    {lv:'mid', title:'A pipe between parent and child', code:`int fd[2]; pipe(fd);
if (fork() == 0) {
    close(fd[1]);
    char buf[32]; ssize_t n = read(fd[0], buf, sizeof buf);   // blocks until data
    printf("child got: %.*s\\n", (int)n, buf);
    return 0;
}
close(fd[0]);
write(fd[1], "hello", 5);
close(fd[1]);
wait(NULL);`, out:`child got: hello`, why:`The child inherits both ends through fork, closes the one it doesn't use, and blocks in read until the parent writes.`},
    {lv:'adv', title:'Shared memory without a lock loses updates', sim:'race', input:`# two processes each add 1 to a shared counter (load, add, store)
shared: counter=0
A: load r counter; add r 1; store counter r
B: load r counter; add r 1; store counter r`, why:`The explorer tries every interleaving. Some end with counter=1: both loaded 0 before either stored. Shared memory gives speed, not safety. Add <code>lock m; … unlock m</code> (and <code>m=0</code> to shared) around each and run again: only counter=2 remains.`},
  ],
  tips: {
    say:`"Processes can't see each other's memory, so they use IPC. Message passing, like pipes, message queues and sockets, copies data through the kernel and gives ordering and blocking for free. Shared memory maps the same pages into both processes: fastest for large data, but you need your own synchronisation. I'd use pipes for simple parent-child streams, Unix sockets for local client-server, and shared memory plus a semaphore for high-volume data."`,
    points:[`Two families: message passing vs shared memory.`,`Trade-off: copies + safety vs speed + DIY sync.`,`Mention blocking/EOF semantics of pipes.`],
    traps:[`Calling shared memory "safe".`,`Forgetting sockets work locally too.`],
    qa:[[`Why might a pipeline hang?`,`A write end was left open somewhere (often the parent), so the reader never sees EOF; or both sides block writing to full pipes waiting for each other.`],
        [`Pipe vs FIFO?`,`A pipe has no name and is shared by inheritance; a FIFO has a path, so unrelated processes can open it.`],
        [`When is shared memory worth it?`,`Large or frequent data (video frames, database buffers) where copying through the kernel would dominate. For small messages the sync complexity isn't worth it.`]]
  },
  exercises: [
    {lv:'E', q:`A process reads from an empty pipe whose writer is still open. What happens to the reader? (one word)`, ans:'blocks', hint:`Flow control.`, answer:`<p>It blocks until data arrives or all writers close (then read returns 0 = EOF).</p>`},
    {lv:'M', q:`Two processes increment an unprotected shared counter once each (load, add, store). What final values are possible? Answer like <code>1 2</code>.`, sim:'race', key:'values', input:`shared: counter=0
A: load r counter; add r 1; store counter r
B: load r counter; add r 1; store counter r`, hint:`What if both load before either stores?`, answer:`<p>1 or 2. A lost update happens when both read 0.</p>`},
    {lv:'H', q:`Design IPC between a video-capture process producing 30 MB/s of frames and an encoder process. Justify.`, hint:`Copies vs synchronisation.`, answer:`<p>Shared memory ring buffer of frame slots (zero-copy), with semaphores or futexes (or an eventfd/pipe for notification only) to signal "slot full"/"slot free". Copying 30 MB/s through a pipe works but wastes CPU and memory bandwidth; shared memory avoids it.</p>`},
  ],
  quiz: [
    [`A pipe is…`,[`Bidirectional`,`A one-way kernel buffer between processes`,`Shared memory`,`A network socket`],1,`Use two pipes or a socketpair for two-way.`,'E'],
    [`The fastest IPC mechanism is usually…`,[`Pipes`,`Shared memory`,`Signals`,`Files`],1,`No copying, no syscalls per access.`,'E'],
    [`Shared memory requires…`,[`Nothing else`,`Explicit synchronisation (mutex/semaphore)`,`A network`,`Root`],1,`Races otherwise.`,'E'],
    [`A pipe reader gets EOF when…`,[`The buffer is empty`,`All write ends are closed and the buffer is empty`,`The writer sleeps`,`Never`],1,`Close unused ends!`,'M'],
    [`Which IPC works across machines?`,[`Pipes`,`Shared memory`,`Sockets`,`Signals`],2,`TCP/UDP sockets.`,'M'],
    [`ls | wc runs ls and wc…`,[`One after the other`,`Concurrently, connected by a pipe`,`In the same process`,`Only if wc starts first`],1,`Pipelines are concurrent.`,'M'],
  ],
  quizAdv: [
    [`Writes to a pipe are atomic only up to…`,[`1 byte`,`PIPE_BUF (4096 bytes on Linux)`,`64 KB`,`Unlimited`],1,`Larger writes may interleave with other writers.`,'H'],
    [`yes | head -1 terminates yes because…`,[`yes finishes`,`Writing to a pipe with no reader raises SIGPIPE`,`head kills it`,`The shell times out`],1,`Default SIGPIPE action terminates.`,'H'],
    [`Unix-domain sockets differ from TCP on localhost by…`,[`Being slower`,`Skipping the network stack and supporting fd passing and peer credentials`,`Being one-way`,`Needing root`],1,`Docker, X11, systemd use them.`,'H'],
  ],
});
