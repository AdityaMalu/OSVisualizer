/* 9.2 Blocking, non-blocking, multiplexed and async I/O */
topic('9', { no:'9.2', title:'Blocking, non-blocking and async I/O; select, poll and epoll',
idea:`A server with 10,000 mostly idle connections: one thread per connection, or one thread watching them all? Step from blocking <code>read</code>, to non-blocking reads that return EAGAIN, to <code>epoll</code> telling a single thread exactly which sockets are ready, and see how Node.js, nginx and Netty are built.`,
actors:'Threads', tbTitle:'Sockets', stateTitle:'Model',
codes:{a:`// 1. blocking: read() sleeps until data arrives (one thread per connection)
n = read(sock, buf, sizeof buf);

// 2. non-blocking: read() returns -1 / EAGAIN immediately if nothing is there
fcntl(sock, F_SETFL, O_NONBLOCK);

// 3. readiness multiplexing with epoll: one thread, many sockets
int ep = epoll_create1(0);
epoll_ctl(ep, EPOLL_CTL_ADD, sock, &(struct epoll_event){ .events = EPOLLIN, .data.fd = sock });
for (;;) {
    int n = epoll_wait(ep, events, 64, -1);     // sleep until SOME socket is ready
    for (int i = 0; i < n; i++) handle(events[i].data.fd);   // read without blocking
}
// 4. completion-based async: io_uring / Windows IOCP: "tell me when the read is DONE"`},
steps:[
{hl:{s:[2]}, th:[['T1','BLOCKED:warn','read(s1): no data'],['T2','BLOCKED:warn','read(s2)'],['T3','BLOCKED:warn','read(s3)'],['T…','BLOCKED:warn','×10,000']], tb:[TB('sockets',['socket','data waiting?','handled by'],[['s1','no','thread 1 (asleep)'],['s2','no','thread 2 (asleep)'],['s3','yes','thread 3 (waking)']])], g:[G('Model',['blocking + thread per connection','simple sequential code','ok'],['10,000 connections','10,000 threads: memory for stacks, scheduler load','bad'])],
 say:`<b>Blocking I/O</b>: <code>read</code> puts the thread to sleep until data arrives. Code is simple and sequential, so the classic server uses one thread per connection. With 10,000 mostly idle clients, that's 10,000 sleeping threads: megabytes of stacks each, and lots of context switching when they wake.`},
{hl:{s:[4,5]}, th:[['T1','RUN:bad','loops: read → EAGAIN → read → EAGAIN …']], tb:[TB('sockets',['socket','read() result'],[['s1','-1, errno = EAGAIN'],['s2','-1, EAGAIN'],['s3','212 bytes'],['s4','-1, EAGAIN']],{2:'ok'})], g:[G('Model',['non-blocking','read never sleeps; returns EAGAIN if no data'],['naive loop','busy-polls every socket: burns CPU','bad'])],
 say:`<b>Non-blocking I/O</b>: with <code>O_NONBLOCK</code>, <code>read</code> returns immediately with <code>EAGAIN</code> if there's nothing to read. One thread could now handle many sockets, but only by trying each one in a loop, burning CPU on sockets that have nothing. We need the kernel to tell us <i>which</i> sockets are ready.`},
{hl:{s:[8,9]}, th:[['T1','RUN:ok','registers 10,000 sockets with epoll']], tb:[TB('epoll interest list',['socket','watching'],[['s1 … s10000','EPOLLIN (readable)']])], g:[G('Model',['select / poll','pass the whole fd list on every call: O(n)','bad'],['epoll (Linux), kqueue (BSD/macOS)','register once; kernel keeps a ready list: O(ready)','ok'])],
 say:`<b>I/O multiplexing</b>. <code>select</code> and <code>poll</code> take the full list of descriptors on every call and scan it: O(n) per call, painful at 10,000. <b>epoll</b> (Linux) and kqueue (BSD, macOS) let you register descriptors <b>once</b>; the kernel maintains a <b>ready list</b> as packets arrive.`},
{hl:{s:[10,11,12]}, th:[['T1','RUN:ok','epoll_wait → 2 ready: s3, s871']], tb:[TB('ready list returned by epoll_wait',['socket','event'],[['s3','readable'],['s871','readable']],{0:'ok',1:'ok'})], g:[G('Model',['one thread','sleeps in epoll_wait, wakes with only the ready sockets','ok'],['handlers','must never block (or everything stalls)','bad'])], log:['epoll_wait returned 2 events','read(s3) = 212 bytes','read(s871) = 64 bytes'],
 say:`The <b>event loop</b>: one thread sleeps in <code>epoll_wait</code>, wakes with just the ready sockets, reads them without blocking, and goes back to waiting. Thousands of connections cost one thread and a little kernel memory. This is nginx, Redis, Node.js, Netty and Go's netpoller. The rule: handlers must <b>never block</b>; a slow handler stalls every connection on that loop.`},
{hl:{s:[14]}, th:[], tb:[TB('models',['model','who waits','notified when'],[['blocking','the thread (sleeps)','—'],['non-blocking','nobody; you retry','—'],['readiness (epoll, kqueue)','event loop','fd is READY to read/write'],['completion (io_uring, IOCP)','nobody','operation is DONE, data in your buffer']])], g:[G('Model',['io_uring','submit reads/writes to a ring; kernel completes them; batch, few syscalls','ok'],['also works for files','epoll doesn\'t (files are always "ready")'])],
 say:`<b>Readiness</b> APIs say "you can read now without blocking"; <b>completion</b> APIs (Linux io_uring, Windows IOCP) say "your read has finished and the data is in your buffer". io_uring uses shared submission and completion rings, batching many operations per system call, and works for disk files too, where epoll can't help.`},
{tb:[], th:[], g:[G('Pick',['few connections, simple code','blocking threads (or virtual threads)','ok'],['many connections, I/O bound','event loop (epoll/kqueue) or M:N runtime','ok'],['max throughput, files + sockets','io_uring','ok'])],
 say:`<b>Say it:</b> "Blocking I/O suspends the thread until data arrives, which is simple but needs a thread per connection. Non-blocking I/O returns EAGAIN immediately, but polling every socket wastes CPU. Multiplexing with select or poll is O(n) per call; epoll and kqueue register descriptors once and return only ready ones, so one event-loop thread can serve tens of thousands of connections, as nginx and Node do, as long as handlers never block. Completion-based APIs like io_uring and IOCP notify when the operation is finished and also work for files."`}
],
keep:[`Blocking: thread sleeps in read(); one thread per connection.`,`Non-blocking: EAGAIN instead of sleeping; needs readiness info.`,`select/poll: O(n) per call. epoll/kqueue: register once, O(ready).`,`Event loop: one thread, many sockets; never block in handlers.`,`Readiness (epoll) vs completion (io_uring, IOCP).`]}, {
  imp: 'must',
  theory: TH(`Servers handle many connections either with blocking calls on many threads or with non-blocking descriptors and an event notification mechanism like epoll that tells one thread which descriptors are ready.`,
`<p>A restaurant could assign one waiter per table who stands there until the diners decide (blocking). Or one waiter could keep asking every table "ready yet?" (non-blocking polling). Better: tables press a buzzer and a board lights up showing which tables want attention (epoll), so one waiter serves the whole floor, provided they never stop to chat at one table for ten minutes (never block the event loop).</p>
<p>This is the C10k problem from 1999, solved by epoll/kqueue, and it's why Node.js, nginx and Redis can handle huge connection counts on few threads.</p>`,
[[`Blocking I/O`,`Call doesn't return until it can complete.`],[`Non-blocking I/O`,`Call returns immediately (EAGAIN) if it would block.`],[`I/O multiplexing`,`Waiting on many descriptors at once (select, poll, epoll).`],[`epoll / kqueue`,`Scalable readiness notification APIs.`],[`Event loop`,`Thread repeatedly waiting for events and dispatching handlers.`],[`Level vs edge triggered`,`Notify while ready / only on change to ready.`],[`io_uring / IOCP`,`Completion-based asynchronous I/O.`],[`C10k problem`,`Handling 10,000 concurrent connections efficiently.`]],
[`Put sockets in non-blocking mode.`,`Register them with epoll for the events you care about.`,`Loop: epoll_wait blocks until at least one is ready.`,`For each ready socket, read/write until EAGAIN (essential in edge-triggered mode).`,`Hand long work to worker threads so the loop never blocks.`],
[`nginx: a few worker processes, each an epoll event loop.`,`Node.js / libuv: one JS thread + epoll (and a thread pool for file I/O).`,`Java NIO Selector and Netty wrap epoll; Go's runtime parks goroutines on its netpoller.`],
[`Doing blocking work (disk, CPU-heavy, a synchronous DB call) inside an event-loop handler.`,`In edge-triggered mode, not draining a socket until EAGAIN, then never being notified again.`,`Expecting epoll to help with regular files.`])
  ,
  examples: [
    {lv:'basic', title:'Non-blocking read', code:`fcntl(sock, F_SETFL, fcntl(sock, F_GETFL) | O_NONBLOCK);
ssize_t n = read(sock, buf, sizeof buf);
if (n > 0)                    handle(buf, n);
else if (n == 0)              close_connection();          // peer closed
else if (errno == EAGAIN)     /* no data yet: try later */ ;
else                          perror("read");`, why:`The four outcomes every non-blocking reader must handle. EAGAIN (a.k.a. EWOULDBLOCK) isn't an error; it means "would block".`},
    {lv:'mid', title:'Why event loops must not block', code:`// Node.js: one slow synchronous call freezes ALL clients
app.get('/report', (req, res) => {
    const data = fs.readFileSync('/huge.csv');      // blocks the event loop for 2 s
    res.send(summarise(data));
});
// fix: async I/O (fs.promises.readFile) and move CPU work to a worker thread`, why:`During those 2 seconds no other request on this process is served, even trivial ones.`},
    {lv:'adv', title:'Edge-triggered epoll: drain until EAGAIN', code:`ev.events = EPOLLIN | EPOLLET;                 // notify only on transitions to readable
epoll_ctl(ep, EPOLL_CTL_ADD, sock, &ev);
// on each event:
for (;;) {
    ssize_t n = read(sock, buf, sizeof buf);
    if (n > 0) { consume(buf, n); continue; }
    if (n < 0 && errno == EAGAIN) break;       // drained: wait for the next edge
    close(sock); break;
}`, why:`With edge triggering, if you leave data unread you won't be told again until more arrives: a classic stall bug. Level-triggered (default) keeps reporting while data remains.`},
  ],
  tips: {
    say:`"Blocking I/O suspends the calling thread until the operation can complete, so you need a thread per connection. Non-blocking I/O returns EAGAIN instead, but you need to know when to retry. select and poll check a list of descriptors in O(n) each call; epoll and kqueue register interest once and return only the ready ones, so a single event-loop thread can serve tens of thousands of mostly idle connections, as nginx, Redis and Node do. Handlers must never block. Completion APIs like io_uring and IOCP notify when an operation has finished and also cover files."`,
    points:[`Distinguish the four models.`,`Why epoll scales better than select.`,`Event-loop rule: never block.`],
    traps:[`Calling non-blocking and asynchronous the same thing.`,`Using epoll for disk files.`],
    qa:[[`Why doesn't epoll work for regular files?`,`Regular files are always reported readable; a read may still block on disk. Use a thread pool or io_uring for files.`],
        [`Level-triggered vs edge-triggered?`,`Level reports a descriptor every time you wait while it's ready; edge reports only when it becomes ready, so you must drain it completely.`],
        [`Thread-per-connection vs event loop today?`,`With virtual threads/goroutines, thread-per-connection code runs on an event loop underneath (M:N), combining simple code with epoll's scalability.`]]
  },
  exercises: [
    {lv:'E', q:`A non-blocking read on a socket with no data returns -1 and sets errno to what?`, ans:'EAGAIN', hint:`"Try again".`, answer:`<p>EAGAIN (same value as EWOULDBLOCK on Linux).</p>`},
    {lv:'M', q:`10,000 connections, 1 MB stack per thread. How many GB of stack address space does thread-per-connection reserve? (decimal, 1 GB = 1024 MB, 2 decimals)`, ans:'9.77', hint:`10,000 MB / 1024.`, answer:`<p>≈ 9.77 GB of virtual stack (resident is less, but the scheduling overhead is real).</p>`},
    {lv:'H', q:`An event-loop server takes 50 µs of CPU per request but one handler does a 20 ms synchronous database call. With a single loop thread, what's the maximum requests per second it can serve if every request made that call? (whole number)`, ans:'50', hint:`Each request occupies the loop for 20.05 ms.`, answer:`<p>1 / 0.02005 s ≈ 49.9 → about 50 requests/s, versus 20,000/s without the blocking call. Move blocking calls off the loop.</p>`},
  ],
  quiz: [
    [`A blocking read on an empty socket…`,[`Returns 0`,`Puts the thread to sleep until data arrives`,`Returns EAGAIN`,`Crashes`],1,`Default behaviour.`,'E'],
    [`A non-blocking read with no data…`,[`Sleeps`,`Returns -1 with EAGAIN`,`Returns garbage`,`Closes the socket`],1,`Would block.`,'E'],
    [`epoll is preferred over select for many connections because…`,[`It's older`,`It registers fds once and returns only ready ones`,`It blocks less`,`It supports files`],1,`O(ready) vs O(n).`,'E'],
    [`The golden rule of an event loop is…`,[`Use many threads`,`Never block inside a handler`,`Always poll`,`Use select`],1,`One slow handler stalls everyone.`,'M'],
    [`io_uring is…`,[`A readiness API like epoll`,`A completion-based async I/O interface with shared rings`,`A file system`,`A scheduler`],1,`Linux 5.1+.`,'M'],
    [`nginx and Node.js handle many connections using…`,[`One thread per connection`,`Event loops over epoll/kqueue`,`Busy polling`,`fork per request`],1,`C10k solution.`,'M'],
  ],
  quizAdv: [
    [`In edge-triggered epoll you must…`,[`Read once per event`,`Read until EAGAIN`,`Use blocking sockets`,`Re-register after each event`],1,`Or you miss data.`,'H'],
    [`Windows' equivalent completion-based mechanism is…`,[`kqueue`,`IOCP`,`epoll`,`/dev/poll`],1,`I/O completion ports.`,'H'],
    [`Why does Node.js use a thread pool for fs operations?`,[`Speed`,`Regular file I/O can't be made non-blocking with epoll`,`Security`,`Licensing`],1,`libuv threadpool.`,'H'],
  ],
});
