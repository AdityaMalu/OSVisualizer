/* 1.1 Process, PCB and address space */
topic('1', { no:'1.1', title:'The process: PCB and address-space layout',
idea:`A program is a file; a process is that program running. Watch one C program come alive and see where each piece lands: code in the text segment, globals in data/BSS, <code>malloc</code> on the heap, locals on the stack, and all the bookkeeping in the kernel's process control block.`,
actors:'Process', dgTitle:'Virtual address space (high addresses on top)', stateTitle:'Process control block (in the kernel)',
nodes:{
  ker:{x:150,y:20,label:'kernel space (not accessible)',w:260,h:26,kind:'lock'},
  stack:{x:150,y:62,label:'stack ↓  locals, return addresses',w:260,h:34},
  gap:{x:150,y:106,label:'… unmapped (grows into) …',w:260,h:26,kind:'mem'},
  heap:{x:150,y:146,label:'heap ↑  malloc / new',w:260,h:34},
  bss:{x:150,y:188,label:'BSS  uninitialised globals = 0',w:260,h:28},
  data:{x:150,y:222,label:'data  initialised globals',w:260,h:28},
  text:{x:150,y:256,label:'text  machine code (read-only)',w:260,h:28},
  pcb:{x:400,y:140,label:'PCB\npid · state · regs\npage table · files',w:150,h:80,kind:'mem'}
},
edges:[['pcb','stack','','dash'],['pcb','text','','dash']],
vb:'0 0 490 280',
codes:{a:`#include <stdlib.h>
int counter = 5;          // data segment (initialised)
int table[1000];          // BSS (zero-filled, takes no space in the file)
const char *msg = "hi";   // pointer in data, "hi" in read-only data

int square(int x) {       // code lives in the text segment
    int y = x * x;        // y lives on the stack, in square's frame
    return y;
}
int main(void) {
    int local = 7;                  // stack, main's frame
    int *p = malloc(4 * sizeof *p); // p on the stack, the 16 bytes on the heap
    p[0] = square(local);
    free(p);
    return 0;
}`},
steps:[
{hl:{proc:[6,7,8]}, th:[['proc','NEW:dim','being created by exec']], d:{on:['text'], e:[]}, g:[G('PCB',['pid','4242','hot'],['state','NEW'],['program','./demo'])],
 say:`A <b>program</b> is just an executable file on disk. When it's started, the kernel creates a <b>process</b>: it allocates a <b>process control block (PCB)</b> and maps the file's machine code into a fresh <b>virtual address space</b> as the read-only <b>text</b> segment.`},
{hl:{proc:[2,3,4]}, d:{on:['data','bss'], e:[]}, g:[G('PCB',['pid','4242'],['state','READY'],['memory map','text, data, BSS mapped','hot'])],
 say:`Global variables come next. <code>counter = 5</code> has an initial value, so it lives in the <b>data</b> segment (copied from the file). <code>table[1000]</code> has none, so it goes in <b>BSS</b>: the file just records its size and the kernel hands out zero-filled pages. String literals sit in read-only data.`},
{hl:{proc:[10,11]}, th:[['proc','RUN:ok','in main()']], d:{on:['stack'], e:[]}, g:[G('PCB',['pid','4242'],['state','RUNNING','hot'],['stack pointer','top of main\'s frame'])], tb:[TB('stack (grows down)',['frame','variable','value'],[['main','local','7']],{0:'new'})],
 say:`<code>main</code> starts and gets a <b>stack frame</b> at the top of the stack. Local variables like <code>local</code> live there. The stack grows <b>downward</b> toward lower addresses, and each function call pushes a new frame.`},
{hl:{proc:[12]}, d:{on:['heap','stack'], e:[]}, tb:[TB('stack (grows down)',['frame','variable','value'],[['main','local','7'],['main','p','→ heap 0x5591…a0']],{1:'new'}),TB('heap (grows up)',['block','size','contents'],[['0x5591…a0','16 bytes','? ? ? ?']],{0:'new'})], log:['malloc(16) → brk/mmap if the heap must grow'],
 say:`<code>malloc</code> carves 16 bytes out of the <b>heap</b>, which grows <b>upward</b>. The pointer <code>p</code> itself is a local on the stack; what it points to is on the heap. Heap memory outlives the function that allocated it until you <code>free</code> it.`},
{hl:{proc:[13,7,8]}, d:{on:['stack'], e:[]}, tb:[TB('stack (grows down)',['frame','variable','value'],[['main','local','7'],['main','p','→ heap'],['square','x','7'],['square','y','49']],{2:'hot',3:'hot'}),TB('heap (grows up)',['block','size','contents'],[['0x5591…a0','16 bytes','? ? ? ?']])],
 say:`Calling <code>square(7)</code> pushes a new frame holding its parameter <code>x</code>, local <code>y</code> and the return address. When it returns, the frame is popped and <code>y</code> is gone; that's why returning a pointer to a local is a bug.`},
{hl:{proc:[13,14]}, d:{on:['heap'], e:[]}, tb:[TB('stack (grows down)',['frame','variable','value'],[['main','local','7'],['main','p','→ freed (dangling!)']],{1:'bad'}),TB('heap (grows up)',['block','size','contents'],[['0x5591…a0','16 bytes','freed'] ],{0:'dim'})], g:[G('PCB',['pid','4242'],['state','RUNNING'],['registers','saved here on every context switch'],['open files','0 stdin, 1 stdout, 2 stderr'],['page table','maps this layout to physical frames'])],
 say:`<code>p[0] = 49</code>, then <code>free(p)</code> returns the block to the allocator; <code>p</code> still holds the old address (a <b>dangling pointer</b>). Throughout, the kernel's <b>PCB</b> tracks everything about the process: PID, state, saved registers, its page table, open files, parent, signals and accounting.`},
{hl:{}, th:[['proc','TERM:dim','exited']], d:null, tb:[], g:[G('PCB fields',['identity','pid, ppid, uid'],['CPU state','registers, PC, SP (saved when not running)'],['scheduling','state, priority, time used'],['memory','page table / mm_struct'],['files','file descriptor table'],['other','signals, cwd, limits'])],
 say:`<b>Say it:</b> "A process is a program in execution. It has a virtual address space laid out as text, data, BSS, heap growing up and stack growing down, plus kernel state in a process control block: PID, state, saved registers, memory mappings, open files and scheduling info. The PCB is what the kernel saves and restores when it switches between processes."`}
],
keep:[`Program = file; process = running instance with its own address space.`,`Layout (low → high): text, data, BSS, heap ↑ … ↓ stack, kernel.`,`Locals on the stack (die at return); malloc on the heap (until free).`,`PCB: pid, state, registers, page table, open files, signals.`,`Linux calls the PCB task_struct.`]}, {
  imp: 'must',
  theory: TH(`A process is a running program: a private virtual address space (text, data, heap, stack) plus kernel bookkeeping in a process control block.`,
`<p>A recipe is a program; actually cooking it is a process. Two people can cook the same recipe at once in their own kitchens: same instructions, separate ingredients and progress. Likewise two processes can run the same executable with completely separate memory.</p>
<p>The kernel tracks each process in a <b>process control block</b> (Linux: <code>task_struct</code>). When the process isn't on the CPU, its registers are saved in the PCB so it can resume exactly where it stopped.</p>`,
[[`Process`,`A program in execution with its own resources.`],[`PCB`,`Kernel structure holding a process's state (task_struct on Linux).`],[`Text segment`,`Read-only machine code.`],[`Data / BSS`,`Initialised / zero-initialised globals.`],[`Heap`,`Dynamically allocated memory, grows up.`],[`Stack`,`Function frames: locals, arguments, return addresses; grows down.`],[`Stack overflow`,`Stack runs into its limit (often deep recursion).`]],
[`exec maps the executable: text and data from the file, BSS as zero pages.`,`The kernel sets up a stack with argv/envp and jumps to the entry point.`,`Function calls push frames on the stack; malloc grows the heap with brk/mmap.`,`The PCB records state, registers, mappings and resources throughout.`,`On exit, the kernel frees the address space and most of the PCB.`],
[`Stack size limits (ulimit -s, thread stack size) matter for deep recursion.`,`Memory leaks are heap blocks never freed; /proc/PID/maps shows the layout.`,`ASLR randomises where stack, heap and libraries go, to frustrate exploits.`],
[`Returning a pointer to a local variable.`,`Thinking global arrays make the binary huge (BSS takes no file space).`,`Assuming two processes running the same program share variables.`])
  ,
  examples: [
    {lv:'basic', title:'Look at a live process\'s memory map', code:`$ cat /proc/self/maps
5591a2c00000-5591a2c02000 r-xp  /usr/bin/cat     # text
5591a2e01000-5591a2e02000 rw-p  /usr/bin/cat     # data/BSS
5591a3a10000-5591a3a31000 rw-p  [heap]
7f3c1e000000-7f3c1e1b0000 r-xp  /usr/lib/libc.so.6
7ffd5c8f0000-7ffd5c911000 rw-p  [stack]`, why:`Each line is a mapping with permissions. Text is r-x (read + execute), data and heap rw-, and the stack sits near the top of the user address space.`},
    {lv:'mid', title:'Same program, separate memory', code:`int counter = 0;
int main(void) {
    counter++;
    printf("pid %d counter %d at %p\\n", getpid(), counter, (void*)&counter);
}
$ ./demo & ./demo`, out:`pid 501 counter 1 at 0x55d1c2a04010
pid 502 counter 1 at 0x55d1c2a04010`, why:`Both print the <i>same virtual address</i> but each has its own <code>counter</code>: the addresses are virtual and map to different physical frames. (With ASLR on, the addresses usually differ too.)`},
    {lv:'adv', title:'Classic bug: pointer to a dead stack frame', code:`int *make(void) {
    int x = 42;
    return &x;              // x dies when make() returns
}
int main(void) {
    int *p = make();
    printf("%d\\n", *p);     // undefined: the frame may be reused
}`, why:`The compiler warns "address of local variable returned". Allocate on the heap (<code>malloc</code>) or let the caller pass a buffer instead.`},
  ],
  tips: {
    say:`"A process is a program in execution with its own virtual address space and kernel state. The address space has text for code, data and BSS for globals, a heap that grows up for dynamic allocation and a stack that grows down for function frames. The kernel's PCB holds the PID, state, saved registers, memory mappings, open files and scheduling info."`,
    points:[`Program vs process.`,`Draw the address-space layout.`,`List PCB contents and why registers are saved there.`],
    traps:[`Saying heap and stack are the same memory.`,`Forgetting BSS.`],
    qa:[[`What happens on stack overflow?`,`The stack grows into a guard page below its limit; the access faults and the process gets SIGSEGV.`],
        [`Why does the heap grow up and the stack down?`,`So both can grow into the same free gap without a fixed split between them.`],
        [`Where is the PCB stored?`,`In kernel memory, not in the process's address space, so the process can't tamper with it.`]]
  },
  exercises: [
    {lv:'E', q:`Where does each live: a local int, a global <code>int g = 3;</code>, a global <code>int z;</code>, memory from malloc? Answer like <code>stack data bss heap</code>.`, ans:'stack data bss heap', hint:`Initialised vs zero globals.`, answer:`<p>local → stack, initialised global → data, zero global → BSS, malloc → heap.</p>`},
    {lv:'M', q:`A recursive function uses 200 bytes per frame and the stack limit is 8 MB (8,388,608 bytes). Roughly how deep can it recurse before overflowing? (whole number, ignore other frames)`, ans:'41943', hint:`8,388,608 / 200.`, answer:`<p>8,388,608 / 200 ≈ 41,943 calls.</p>`},
    {lv:'H', q:`Name four fields you'd expect in a PCB and say why the scheduler needs each.`, hint:`Think about what's needed to stop and resume a process.`, answer:`<ul><li>State (ready/running/blocked): which list it's on.</li><li>Saved registers and PC: to resume exactly where it stopped.</li><li>Priority / CPU time used: to choose who runs next.</li><li>Page table pointer: to switch address spaces on a context switch.</li></ul>`},
  ],
  quiz: [
    [`Program vs process:`,[`Same thing`,`A program is a file; a process is a running instance of it`,`A process is a file`,`Programs run inside threads`],1,`Many processes can run one program.`,'E'],
    [`malloc'd memory comes from the…`,[`Stack`,`Heap`,`Text segment`,`BSS`],1,`Heap grows up.`,'E'],
    [`Local variables live on the…`,[`Heap`,`Stack`,`Data segment`,`Disk`],1,`In the function's frame.`,'E'],
    [`The text segment is usually…`,[`Writable`,`Read-only and executable`,`Zero-filled`,`On the heap`],1,`Code shouldn't change.`,'M'],
    [`Uninitialised globals go in…`,[`Data`,`BSS`,`Stack`,`Heap`],1,`Zero pages, no file space.`,'M'],
    [`Which is NOT normally in a PCB?`,[`PID`,`Saved registers`,`Open file table`,`The program's source code`],3,`Source code isn't part of a process.`,'M'],
  ],
  quizAdv: [
    [`On Linux the PCB is called…`,[`proc_t`,`task_struct`,`PCB_t`,`mm_area`],1,`Threads are task_structs too.`,'H'],
    [`ASLR randomises…`,[`Scheduling order`,`Base addresses of stack, heap, libraries`,`PIDs`,`File names`],1,`Makes exploits harder.`,'H'],
    [`Two processes print the same address for a global. This means…`,[`They share it`,`Nothing: virtual addresses can map to different physical memory`,`A kernel bug`,`They are threads`],1,`Separate address spaces.`,'H'],
  ],
});
