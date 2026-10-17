/* 0.4 Kernel architectures */
topic('0', { no:'0.4', title:'Kernel architectures: monolithic, microkernel, hybrid',
idea:`Where should the file system and drivers live: inside the kernel or as ordinary processes? Trace one <code>read()</code> through a monolithic kernel (Linux) and a microkernel (seL4, QNX) and compare the cost and the blast radius of a buggy driver.`,
actors:'Components', dgTitle:'Kernel structure', stateTitle:'Trade-offs',
nodes:{
  app:{x:90,y:40,label:'app',w:110,h:34},
  fs:{x:250,y:40,label:'file server',w:120,h:34},
  drv:{x:400,y:40,label:'disk driver',w:120,h:34},
  mono:{x:250,y:150,label:'monolithic kernel\nsched · mm · fs · drivers · net',w:300,h:52},
  micro:{x:250,y:150,label:'microkernel\nIPC · scheduling · address spaces',w:300,h:52},
  hw:{x:250,y:225,label:'hardware',w:300,h:30,kind:'mem'}
},
edges:[['mono','hw']],
vb:'0 0 480 250',
codes:{a:`// Monolithic (Linux): one call, everything inside the kernel
read(fd, buf, n)
  → sys_read → vfs_read → ext4_read → block layer → nvme driver
  ← data copied to buf                      // 2 mode switches total

// Microkernel (e.g. QNX, seL4): services are processes
read(fd, buf, n)
  → IPC send to file server               // switch 1, 2
      file server → IPC send to disk driver  // switch 3, 4
      ← IPC reply with block
  ← IPC reply with data                   // more switches, more copies

// a driver bug:  monolithic → kernel panic;  microkernel → restart the driver`},
steps:[
{hl:{app:[2,3,4]}, d:{hide:['micro','fs','drv'], on:['app','mono'], e:[['app','mono','syscall','hot']]}, g:[G('Monolithic',['where services run','all in kernel space'],['call path','function calls inside the kernel','ok'])],
 say:`In a <b>monolithic</b> kernel (Linux, classic Unix), scheduling, memory management, file systems, network stack and drivers all live in one big program in kernel space. <code>read()</code> is one trap, then ordinary function calls down to the driver.`},
{hl:{app:[4]}, d:{hide:['micro','fs','drv'], on:['mono'], e:[['app','mono','syscall','ok'],['mono','hw','','hot']]}, g:[G('Monolithic',['mode switches','2 (in and out)','ok'],['speed','fast: shared memory, no message passing','ok'],['risk','a bug anywhere can crash or compromise the whole kernel','bad'])],
 say:`It's fast: two mode switches and no copying between components. The catch is the <b>blast radius</b>: any of the millions of lines (most of them drivers) runs with full privilege. A null-pointer bug in a webcam driver can panic the machine.`},
{hl:{app:[7,8,9,10,11]}, d:{hide:['mono'], on:['app','fs','drv','micro'], e:[['app','micro','IPC','hot'],['micro','fs','','hot'],['fs','micro','IPC',''],['micro','drv','','hot']]}, g:[G('Microkernel',['in the kernel','only IPC, scheduling, address spaces','hot'],['file system, drivers','ordinary user-space servers'],['call path','messages between processes'])],
 say:`A <b>microkernel</b> keeps only the minimum in kernel mode: address spaces, scheduling and <b>IPC</b> (message passing). The file system and drivers are separate user-space processes. <code>read()</code> becomes a message to the file server, which messages the disk driver, and replies flow back.`},
{hl:{app:[13]}, d:{hide:['mono'], on:['micro'], bad:['drv'], e:[['micro','drv','restart','ok']]}, g:[G('Microkernel',['mode switches','many (each IPC hop)','bad'],['speed','slower: messages and copies'],['risk','a driver crash kills one process; restart it','ok'],['verifiable','small kernel: seL4 is formally proven correct','ok'])], log:['disk driver crashed → restarted by supervisor'],
 say:`More hops means more mode switches and copies, so it's slower (modern designs like seL4 make IPC very cheap, narrowing the gap). In return, a buggy driver crashes only its own process and can be restarted, and the small kernel can be audited or even <b>formally verified</b>. That's why microkernels power cars, avionics and medical devices (QNX, seL4).`},
{hl:{}, d:null, g:[G('Who uses what',['Linux','monolithic + loadable modules'],['Windows NT, macOS XNU','hybrid: microkernel ideas, most services in kernel space for speed'],['QNX, seL4, MINIX 3','microkernel'],['unikernels','app + kernel in one image, for single-purpose VMs']),G('Middle ground',['loadable kernel modules','add drivers at run time (still privileged)'],['user-space drivers','FUSE file systems, DPDK, SPDK','ok'])],
 say:`<b>Say it:</b> "A monolithic kernel runs all OS services in kernel space: fast, but a bug anywhere can bring the system down. A microkernel keeps only IPC, scheduling and memory management in the kernel and runs drivers and file systems as user processes: more isolated and verifiable, but each request costs extra IPC. Linux is monolithic with loadable modules; Windows and macOS are hybrids."`}
],
keep:[`Monolithic: everything in kernel space → fast, big blast radius.`,`Microkernel: minimal kernel + user-space servers via IPC → robust, slower.`,`Hybrid (Windows NT, macOS): microkernel structure, services in kernel for speed.`,`Linux = monolithic + loadable modules.`,`Safety-critical systems favour microkernels (QNX, seL4).`]}, {
  imp: 'good',
  theory: TH(`Kernel architecture decides which OS services run with full privilege; monolithic kernels put everything inside for speed, microkernels move most services into user-space processes for isolation.`,
`<p>Imagine a company. In a monolithic company everyone sits in one open office with access to the safe: communication is instant, but one careless employee can lose everything. In a microkernel company only a tiny trusted team has the safe; everyone else works in separate rooms and passes notes through the trusted team. Slower, but a mistake in one room stays in that room.</p>
<p>Real systems blend the two. Linux is monolithic but loads drivers as modules, and moves some work to user space (FUSE, DPDK). Windows NT and macOS were designed around a microkernel but run most services in kernel space for performance: a <b>hybrid</b>.</p>`,
[[`Monolithic kernel`,`All OS services in one privileged address space.`],[`Microkernel`,`Minimal kernel (IPC, scheduling, address spaces); services as user processes.`],[`Hybrid kernel`,`Microkernel-style design with many services kept in kernel space.`],[`Loadable kernel module`,`Code (often a driver) inserted into a running kernel.`],[`IPC`,`Inter-process communication; the core primitive of microkernels.`],[`Exokernel / unikernel`,`Extreme designs: expose hardware almost directly / link app and kernel into one image.`]],
[`Decide which components need privilege: at minimum, memory protection, scheduling and IPC.`,`In a monolithic design, other services are linked into the kernel and called directly.`,`In a microkernel, they run as servers; clients send messages through the kernel.`,`Failure handling differs: monolithic panics, microkernel restarts the failed server.`],
[`Most driver bugs (the majority of kernel bugs) would be contained in a microkernel design.`,`Linux FUSE lets you write file systems in user space (sshfs, s3fs) at a performance cost.`,`Automotive and aerospace use QNX or seL4 for certification and fault isolation.`],
[`Assuming microkernels are always too slow: modern IPC is fast.`,`Calling Linux a microkernel because it has modules.`,`Thinking a hybrid kernel gets all the isolation benefits.`])
  ,
  examples: [
    {lv:'basic', title:'Load a driver into a running Linux kernel', code:`$ lsmod | head -3
Module                  Size  Used by
nvme                   57344  2
$ sudo modprobe usb_storage     # inserted into kernel space: fully privileged
$ dmesg | tail -1
usb-storage 1-1:1.0: USB Mass Storage device detected`, why:`Modules make a monolithic kernel extensible, but a loaded module runs with full kernel privilege: no isolation.`},
    {lv:'mid', title:'A file system in user space (FUSE)', code:`$ sshfs me@server:/data ~/remote     # file system implemented by a user process
$ ls ~/remote
reports  logs
# read(): app → kernel (FUSE) → sshfs process → network → back`, why:`FUSE is a microkernel-style escape hatch in Linux. If sshfs crashes, the mount fails but the kernel is fine. Each operation costs extra context switches.`},
    {lv:'adv', title:'Cost of extra hops, roughly', code:`monolithic read():   2 mode switches              ≈ 0.2 µs overhead
microkernel read():  app→fs→driver→fs→app        ≈ 4 IPCs × ~0.5 µs ≈ 2 µs
disk read itself:    NVMe ≈ 20–100 µs, page cache hit ≈ 0.1 µs
# overhead matters for cache hits and tiny I/O, not for slow devices`, why:`Back-of-envelope reasoning interviewers like: IPC overhead is noise next to device latency, but dominant for cached, tiny operations.`},
  ],
  tips: {
    say:`"Monolithic kernels like Linux run all services, including drivers and file systems, in kernel space: fast but a bug anywhere can crash the system. Microkernels like QNX or seL4 keep only IPC, scheduling and memory management privileged and run services as user processes: better isolation and verifiability, more IPC overhead. Windows and macOS are hybrids."`,
    points:[`Define both with what lives in kernel space.`,`Give the trade-off: performance vs isolation.`,`Name real examples.`],
    traps:[`Saying one design is strictly better.`,`Forgetting that most kernel code is drivers.`],
    qa:[[`Why didn't microkernels win on desktops?`,`Early ones (Mach) had slow IPC, and monolithic kernels already had drivers and momentum. Hybrids kept the structure but moved services back into the kernel for speed.`],
        [`What does formal verification of seL4 mean?`,`There is a machine-checked proof that the C implementation matches its specification, so whole classes of bugs (buffer overflows, null dereferences) cannot exist in the kernel.`],
        [`Is Linux moving any direction?`,`It stays monolithic, but adds user-space options (FUSE, io_uring, eBPF for safe in-kernel extensions, Rust for safer drivers).`]]
  },
  exercises: [
    {lv:'E', q:`In a microkernel, which of these run in user space: scheduler, file system, network driver, IPC? Answer like <code>file system, network driver</code>.`, ans:'file system network driver', hint:`What's the minimum the kernel must keep?`, answer:`<p>The microkernel keeps scheduling and IPC (plus address spaces); the file system and drivers are user-space servers.</p>`},
    {lv:'M', q:`A request makes 6 IPC hops at 0.5 µs each in a microkernel vs 0.2 µs total overhead in a monolithic kernel. If the device takes 50 µs, what is the microkernel's total latency in µs?`, ans:'53', hint:`6 × 0.5 + 50.`, answer:`<p>3 µs + 50 µs = 53 µs, vs 50.2 µs monolithic: about 6% slower for this request.</p>`},
    {lv:'H', q:`You're designing the OS for a car's braking controller. Argue for an architecture.`, hint:`Certification, fault isolation, real-time.`, answer:`<p>A microkernel (QNX, seL4): a small, verifiable trusted base; drivers and services isolated and restartable; predictable real-time IPC. Performance is not the bottleneck; correctness and containment are.</p>`},
  ],
  quiz: [
    [`Linux is a…`,[`Microkernel`,`Monolithic kernel with loadable modules`,`Exokernel`,`Unikernel`],1,`Modules still run in kernel space.`,'E'],
    [`A microkernel keeps in kernel space…`,[`Everything`,`Only essentials like IPC, scheduling, address spaces`,`Only drivers`,`Nothing`],1,`Minimal privileged core.`,'E'],
    [`The main advantage of a microkernel is…`,[`Raw speed`,`Fault isolation and a small trusted code base`,`Fewer processes`,`No IPC`],1,`Isolation.`,'E'],
    [`The main cost of a microkernel is…`,[`More IPC and mode switches`,`No drivers`,`No multitasking`,`Large kernel size`],0,`Messages between servers.`,'M'],
    [`Windows NT and macOS XNU are usually called…`,[`Monolithic`,`Hybrid`,`Microkernels`,`Exokernels`],1,`Microkernel structure, services in kernel for speed.`,'M'],
    [`A buggy driver in a monolithic kernel can…`,[`Only crash itself`,`Crash or compromise the whole system`,`Never run`,`Only slow the system`],1,`Full privilege.`,'M'],
  ],
  quizAdv: [
    [`FUSE allows…`,[`Kernel modules in Python`,`File systems implemented as user-space processes`,`Faster ext4`,`GPU drivers`],1,`Microkernel-like escape hatch.`,'H'],
    [`seL4 is notable because…`,[`It's the fastest Linux`,`Its implementation is formally verified against a specification`,`It has no IPC`,`It runs only on GPUs`],1,`Machine-checked proof.`,'H'],
    [`A unikernel…`,[`Runs many apps`,`Links one application with just the OS pieces it needs into a single image`,`Is a microkernel`,`Has no memory protection by design and runs on bare metal only`],1,`Single-purpose VM images.`,'H'],
  ],
});
