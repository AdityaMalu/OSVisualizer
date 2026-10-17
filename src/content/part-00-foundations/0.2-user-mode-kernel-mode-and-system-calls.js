/* 0.2 User mode, kernel mode and system calls */
topic('0', { no:'0.2', title:'User mode, kernel mode and system calls',
idea:`The CPU has a "privileged" switch. Programs run with it off; the kernel runs with it on. Step through a <code>read()</code> call: the trap into the kernel, the mode switch, the kernel doing the work on the program's behalf, and the return to user mode.`,
actors:'Execution', dgTitle:'Crossing the user/kernel boundary', stateTitle:'CPU state',
nodes:{
  u:{x:110,y:50,label:'user space\nyour program + libc',w:190,h:54},
  k:{x:110,y:190,label:'kernel space\nsys_read()',w:190,h:54},
  tbl:{x:340,y:190,label:'syscall table\n0 read · 1 write · 2 open …',w:190,h:54,kind:'mem'},
  dev:{x:340,y:50,label:'disk / page cache',w:190,h:40,kind:'db'}
},
edges:[['u','k'],['k','tbl'],['k','dev']],
vb:'0 0 450 240',
codes:{a:`char buf[64];
int fd = open("notes.txt", O_RDONLY);   // syscall 2
ssize_t n = read(fd, buf, sizeof buf);  // syscall 0

// inside libc's read() wrapper (x86-64 Linux)
mov  rax, 0          // system call number: read
mov  rdi, fd         // arg 1
mov  rsi, buf        // arg 2
mov  rdx, 64         // arg 3
syscall              // trap: switch to kernel mode
// … kernel runs sys_read(fd, buf, 64) …
// sysret: back in user mode, result in rax
if (n < 0) perror("read");`},
steps:[
{hl:{prog:[3]}, th:[['prog','RUN:ok','user mode (ring 3)']], d:{on:['u'], e:[]}, g:[G('CPU state',['mode','user','ok'],['can run','ordinary instructions only'],['cannot','touch devices, page tables, disable interrupts','bad'])],
 say:`Your program calls <code>read()</code>. It's running in <b>user mode</b> (ring 3 on x86): it can compute and touch its own memory, but privileged instructions (talk to the disk, change page tables, disable interrupts) are forbidden. Trying one causes a fault.`},
{hl:{prog:[6,7,8,9]}, g:[G('CPU state',['mode','user'],['rax','0 (read)','hot'],['rdi, rsi, rdx','fd, buf, 64','hot'])],
 say:`<code>read()</code> in libc is just a thin <b>wrapper</b>. It puts the system call number (0 = read on x86-64 Linux) in register <code>rax</code> and the arguments in <code>rdi, rsi, rdx</code>. Nothing special has happened yet: these are ordinary instructions.`},
{hl:{prog:[10]}, th:[['prog','RUN:warn','kernel mode (ring 0)']], d:{on:['k'], e:[['u','k','syscall (trap)','hot']]}, g:[G('CPU state',['mode','kernel','hot'],['jumped to','fixed kernel entry point (set at boot)'],['saved','user registers + return address'])], log:['trap → kernel entry'],
 say:`The <code>syscall</code> instruction is a deliberate <b>trap</b>. In one step the CPU switches to <b>kernel mode</b>, saves where the program was, and jumps to an entry point the kernel registered at boot. The program cannot choose where in the kernel it lands, which is what makes this safe.`},
{hl:{prog:[11]}, d:{on:['k','tbl','dev'], e:[['u','k','syscall','ok'],['k','tbl','look up 0','hot'],['k','dev','copy data','hot']]}, g:[G('Kernel checks',['fd 3 open for reading?','yes','ok'],['buf really in this process\'s memory?','yes','ok'],['work','read file data into buf','hot'])], log:['sys_read(3, buf, 64)'],
 say:`The kernel looks up handler 0 in the <b>system call table</b> and runs <code>sys_read</code>. It <b>validates everything</b>: is fd 3 open for reading? Is <code>buf</code> a valid user address? Then it copies data from the page cache or disk into the program's buffer. If the data must come from disk, the process blocks here and others run.`},
{hl:{prog:[12,13]}, th:[['prog','RUN:ok','back in user mode']], d:{on:['u'], e:[['k','u','sysret, rax = bytes','ok']]}, g:[G('CPU state',['mode','user','ok'],['rax','42 (bytes read) or −errno'])], log:['sysret → n = 42'],
 say:`The kernel puts the result (bytes read, or a negative error code that libc turns into <code>-1</code> + <code>errno</code>) in <code>rax</code> and executes <code>sysret</code>: back to user mode, right after the <code>syscall</code> instruction. To the program it looked like an ordinary function call; underneath it crossed a hardware protection boundary twice.`},
{hl:{}, th:[], d:null, g:[G('Ways into the kernel',['system call','deliberate (read, write, fork)','ok'],['exception / fault','error or page fault (divide by zero, missing page)'],['interrupt','device or timer, unrelated to the current program']),G('Costs',['mode switch','~100 ns, more with mitigations'],['so batch','fewer, larger syscalls','ok'],['vDSO','gettimeofday without a real trap','ok'])],
 say:`<b>Say it:</b> "The CPU has a privilege bit. User code runs unprivileged; the kernel runs privileged. A system call is a controlled trap: arguments go in registers, a special instruction switches to kernel mode at a fixed entry, the kernel validates and does the work, then returns to user mode. It's how programs get services without being able to break the machine. Because each crossing costs time, we batch I/O into fewer, larger calls."`}
],
keep:[`User mode can't run privileged instructions; kernel mode can.`,`System call = trap with a number + args in registers → kernel validates → returns.`,`The program can't pick the kernel entry point: that's the safety.`,`Three ways in: system calls, exceptions/faults, interrupts.`,`Syscalls cost ~100s of ns: batch work into fewer calls.`]}, {
  imp: 'must',
  theory: TH(`CPUs run code at two privilege levels; programs run unprivileged and reach the privileged kernel only through system calls, a controlled trap that the kernel validates.`,
`<p>A bank teller window: customers (programs) can't walk into the vault. They fill in a slip (put a syscall number and arguments in registers), pass it through the window (the trap), and the teller (kernel) checks it and does the work inside. The window only opens in one place, so nobody can sneak in.</p>
<p>Hardware enforces this with a mode bit (rings on x86, exception levels on ARM). In user mode, instructions that would let a program take over the machine (I/O, changing memory mappings, disabling interrupts) trap instead of running. That is what lets one machine safely run untrusted programs side by side.</p>`,
[[`User mode`,`Unprivileged CPU mode for applications (x86 ring 3).`],[`Kernel mode`,`Privileged mode where the kernel runs (ring 0).`],[`System call`,`Request for a kernel service via a trap instruction (syscall, svc, int 0x80).`],[`Trap`,`A synchronous, deliberate switch into the kernel.`],[`Syscall table`,`Array mapping syscall numbers to kernel handlers.`],[`errno`,`Thread-local error code set by libc when a syscall fails.`],[`vDSO`,`Kernel code mapped into user space so a few calls (clock_gettime) avoid a real trap.`]],
[`The library wrapper loads the syscall number and arguments into registers.`,`A trap instruction switches the CPU to kernel mode and jumps to the kernel's entry point.`,`The kernel saves user state, looks up the handler, and validates every argument.`,`The handler does the work (possibly blocking the process while I/O happens).`,`The result goes in a register and the CPU returns to user mode after the trap instruction.`],
[`strace / perf trace show syscall counts and latency when debugging slow programs.`,`Buffered I/O (stdio, BufferedWriter) exists to reduce syscall count.`,`Containers and sandboxes (seccomp) filter which syscalls a process may make.`],
[`Thinking library functions and system calls are the same thing (printf vs write).`,`Not checking syscall return values and errno.`,`Calling read/write with tiny buffers in a loop and wondering why it's slow.`])
  ,
  examples: [
    {lv:'basic', title:'A library call vs a system call', code:`#include <stdio.h>
#include <unistd.h>
int main(void) {
    printf("A");             // library: goes into a buffer, no syscall yet
    write(1, "B", 1);        // system call: printed immediately
    printf("C\\n");          // newline flushes the buffer: one write("AC\\n")
}`, out:`BAC`, why:`stdout is line-buffered on a terminal, so "A" waits in libc's buffer until the newline. The raw <code>write</code> syscall bypasses the buffer and appears first.`},
    {lv:'mid', title:'Count system calls with strace -c', code:`$ strace -c -f cp big.iso /tmp/
% time     seconds  usecs/call     calls  syscall
 61.20    0.412000          50      8192  write
 37.95    0.255000          31      8192  read
  0.85    0.005700          95        60  mmap`, why:`<code>cp</code> copies in chunks; 8192 reads and writes show the chunk size. A tool doing millions of tiny calls would stand out immediately here.`},
    {lv:'adv', title:'Make a system call without libc', code:`#include <unistd.h>
#include <sys/syscall.h>
int main(void) {
    const char msg[] = "raw\\n";
    syscall(SYS_write, 1, msg, sizeof msg - 1);   // number + args, nothing else
    return 0;
}`, out:`raw`, why:`<code>syscall()</code> exposes the bare mechanism: a number and up to six arguments. Every libc wrapper is a small layer over this.`},
  ],
  tips: {
    say:`"Programs run in user mode and can't execute privileged instructions. To get a service they make a system call: put a number and arguments in registers and execute a trap instruction. The CPU switches to kernel mode at a fixed entry point, the kernel validates and performs the request, then returns to user mode with the result. The fixed entry and validation are what make it safe."`,
    points:[`Explain why two modes exist (protection).`,`Describe the mechanics: number in register, trap, table lookup, return.`,`Mention cost and batching.`],
    traps:[`Saying a syscall is "just a function call".`,`Mixing up interrupts (asynchronous, from devices) and traps (synchronous, from the program).`],
    qa:[[`What happens if user code executes a privileged instruction?`,`The CPU raises a general protection fault; the kernel handles it, usually by sending SIGSEGV/SIGILL and killing the process.`],
        [`Why is a mode switch expensive?`,`Saving/restoring registers, pipeline flushes, and on modern CPUs security mitigations (e.g. KPTI page-table switches, speculation barriers). Hundreds of nanoseconds versus ~1 ns for a function call.`],
        [`How does the kernel stop a syscall from reading another process's memory?`,`It validates user pointers (they must lie in the caller's user address space) and copies with special routines (copy_from_user) that handle faults safely.`]]
  },
  exercises: [
    {lv:'E', q:`Which of these needs a system call: (a) adding two ints, (b) opening a file, (c) calling strlen, (d) sending a network packet? Answer with the letters, e.g. <code>b d</code>.`, ans:'b d', hint:`Does it touch something outside the process's own memory?`, answer:`<p>Opening a file and sending a packet need the kernel; arithmetic and strlen run entirely in user mode.</p>`},
    {lv:'M', q:`A program writes 1 MB, one byte per <code>write()</code> call. Each syscall costs 0.5 µs of overhead. How many milliseconds of pure syscall overhead is that? (1 MB = 1,048,576 bytes)`, ans:'524.29', hint:`1,048,576 × 0.5 µs.`, answer:`<p>1,048,576 × 0.5 µs = 524,288 µs ≈ 524.29 ms. With a 64 KB buffer it's 16 calls: 8 µs.</p>`},
    {lv:'H', q:`Why can't the kernel simply trust the pointer <code>buf</code> passed to <code>read()</code>? Describe an attack if it did.`, hint:`Where could buf point?`, answer:`<p>A malicious program could pass a kernel address as <code>buf</code>; the kernel would then overwrite its own memory with file contents, letting the program inject code or change credentials. So the kernel checks that the range lies in user space and uses fault-safe copy routines.</p>`},
  ],
  quiz: [
    [`Why do CPUs have a user mode and a kernel mode?`,[`Speed`,`To stop programs from executing instructions that could take over the machine`,`To save power`,`For debugging only`],1,`Protection.`,'E'],
    [`A system call is entered via…`,[`An ordinary function call`,`A trap instruction such as syscall`,`A device interrupt`,`A signal`],1,`Synchronous, deliberate trap.`,'E'],
    [`Where does the syscall number usually go on x86-64 Linux?`,[`The stack`,`rax`,`A file`,`The page table`],1,`Arguments in rdi, rsi, rdx, r10, r8, r9.`,'M'],
    [`printf is…`,[`A system call`,`A library function that eventually calls write()`,`A kernel thread`,`An interrupt`],1,`Library vs syscall.`,'E'],
    [`What does the kernel do first with syscall arguments?`,[`Trust them`,`Validate them`,`Ignore them`,`Send them to the scheduler`],1,`Never trust user input.`,'M'],
    [`Which reduces syscall overhead?`,[`Smaller buffers`,`Batching work into fewer, larger calls`,`More threads`,`Disabling caching`],1,`Fewer crossings.`,'M'],
  ],
  quizAdv: [
    [`The vDSO lets some calls like clock_gettime…`,[`Run in kernel mode faster`,`Avoid a real trap by reading kernel-maintained data mapped into user space`,`Bypass permissions`,`Run on the GPU`],1,`No mode switch needed.`,'H'],
    [`A failed syscall in C typically returns…`,[`0`,`-1 and sets errno`,`NULL always`,`It throws an exception`],1,`The kernel returns −errno; libc converts.`,'H'],
    [`seccomp is used to…`,[`Speed up syscalls`,`Restrict which syscalls a process may make`,`Encrypt memory`,`Schedule threads`],1,`Sandboxing (Docker, Chrome).`,'H'],
  ],
});
