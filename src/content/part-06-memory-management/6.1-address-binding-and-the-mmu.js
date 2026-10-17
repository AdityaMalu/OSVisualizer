/* 6.1 Address binding, logical vs physical addresses, the MMU */
topic('6', { no:'6.1', title:'Logical vs physical addresses and the MMU',
idea:`Programs use addresses that aren't real RAM locations. Follow a load instruction through the simplest MMU, a base and a limit register: the CPU generates logical address 346, the hardware checks it against the limit and adds the base, and an out-of-range address traps to the kernel.`,
actors:'Processes', dgTitle:'Translation with base + limit registers', stateTitle:'Registers',
nodes:{
  cpu:{x:70,y:70,label:'CPU\nlogical 346',w:110,h:50},
  cmp:{x:210,y:70,label:'< limit?',w:90,h:40,kind:'lock'},
  add:{x:340,y:70,label:'+ base',w:90,h:40,kind:'lock'},
  ram:{x:460,y:70,label:'RAM\n14346',w:100,h:50,kind:'db'},
  trap:{x:210,y:180,label:'trap: addressing error',w:180,h:40}
},
edges:[['cpu','cmp'],['cmp','add','yes'],['add','ram'],['cmp','trap','no']],
vb:'0 0 520 220',
codes:{a:`// compile time: the compiler doesn't know where in RAM the program will sit
int x;                         // x is at "offset 346 from the start of the program"
mov  eax, [346]                // the CPU emits LOGICAL (virtual) address 346

// hardware on every access (simplest MMU)
if (logical >= limit)  trap(ADDRESSING_ERROR);   // protection
physical = base + logical;                       // relocation

// context switch: the kernel loads the next process's base and limit
P1: base = 14000, limit = 3000      P2: base = 30000, limit = 5000`},
steps:[
{hl:{P1:[1,2,3]}, th:[['P1','RUN:ok','base 14000, limit 3000']], d:{on:['cpu'], e:[]}, g:[G('Registers',['base (relocation)','14000'],['limit','3000'],['logical address','346','hot'])],
 say:`The compiler laid out <code>x</code> at offset 346 within the program. It has no idea where in physical RAM the program will be loaded, and the program may even move. So instructions use <b>logical</b> (virtual) addresses, starting from 0 for each process.`},
{hl:{hw:[6]}, d:{on:['cpu','cmp'], e:[['cpu','cmp','346','hot']]}, g:[G('Registers',['base','14000'],['limit','3000'],['check','346 < 3000 ✓','ok'])],
 say:`The <b>memory-management unit (MMU)</b>, hardware between the CPU and memory, checks every single access. First <b>protection</b>: is the logical address below the <b>limit</b> register (the size of this process's memory)? 346 &lt; 3000: allowed.`},
{hl:{hw:[7]}, d:{on:['add','ram'], e:[['cpu','cmp','346','ok'],['cmp','add','yes','ok'],['add','ram','14346','hot']]}, g:[G('Registers',['physical','14000 + 346 = 14346','hot'])], log:['load [346] → physical 14346'],
 say:`Then <b>relocation</b>: the MMU adds the <b>base</b> register: 14000 + 346 = physical address 14346. The program never sees 14346; it only ever deals in logical addresses. This happens in hardware, on every access, with no software involved.`},
{hl:{hw:[6]}, d:{on:['trap'], bad:['cmp','trap'], e:[['cpu','cmp','3500','bad'],['cmp','trap','no','bad']]}, g:[G('Registers',['logical','3500'],['check','3500 ≥ 3000 ✗','bad'],['result','trap → kernel sends SIGSEGV','bad'])], log:['load [3500] → trap: out of bounds → SIGSEGV'],
 say:`A buggy pointer produces logical address 3500. It's beyond the limit, so the MMU raises a <b>trap</b> instead of touching memory; the kernel typically kills the process with a segmentation fault. P1 physically <i>cannot</i> address P2's memory: that's memory protection.`},
{hl:{sw:[10]}, th:[['P1','READY:info','base 14000, limit 3000'],['P2','RUN:ok','base 30000, limit 5000']], d:{on:['add'], e:[['cpu','cmp','346','ok'],['cmp','add','yes','ok'],['add','ram','30346','hot']], labels:{ram:'RAM\n30346'}}, g:[G('Registers',['base','30000 (P2)','hot'],['limit','5000 (P2)'],['same logical 346 →','physical 30346'])],
 say:`On a context switch the kernel loads P2's base and limit (only the kernel may set them: privileged instructions). The very same logical address 346 now maps to 30346. Each process gets its own private address space starting at 0, and the OS can move a process just by copying it and changing its base.`},
{th:[], d:null, g:[G('When are addresses bound?',['compile time','absolute code, fixed location (MS-DOS .COM)'],['load time','loader patches addresses (relocatable code)'],['execution time','MMU translates on every access: modern OSes','ok']),G('Beyond base/limit',['problem','each process needs one contiguous chunk → fragmentation','bad'],['solution','paging (6.3) and segmentation (6.6)','ok'])],
 say:`<b>Say it:</b> "Programs use logical addresses; the MMU translates them to physical addresses on every access. The simplest MMU has a base register added to every address for relocation and a limit register checked for protection, both reloaded on context switch. Binding at execution time lets processes be moved and isolated. Base and limit require contiguous memory, which causes fragmentation, so modern systems use paging."`}
],
keep:[`Logical (virtual) address: what the CPU emits. Physical: what RAM sees.`,`MMU translates on every access, in hardware.`,`Base + limit: check logical < limit, physical = base + logical.`,`Out of range → trap → SIGSEGV.`,`Execution-time binding enables relocation and isolation.`]}, {
  imp: 'must',
  theory: TH(`Processes use logical addresses that the MMU translates to physical memory on every access, which provides both relocation and protection.`,
`<p>A hotel guest is told "your room is number 12 on your corridor". Each guest's numbering starts at 1 and the receptionist (MMU) adds the corridor's starting room number to find the real door, refusing anything past the end of the guest's corridor. Guests can be moved to another corridor without learning new numbers.</p>
<p>Base-and-limit is the simplest version of this idea. Paging (next topics) generalises it so a process's memory doesn't have to be one contiguous block.</p>`,
[[`Logical / virtual address`,`Address generated by the CPU for a process.`],[`Physical address`,`Actual location in RAM.`],[`MMU`,`Hardware that translates logical to physical addresses.`],[`Base (relocation) register`,`Added to every logical address.`],[`Limit register`,`Size of the process's region; larger addresses trap.`],[`Address binding`,`When symbolic addresses become actual ones: compile, load or execution time.`],[`Segmentation fault`,`Access to an address the process may not use.`]],
[`The program is compiled with addresses relative to 0.`,`At load time the OS places it anywhere in RAM and sets base/limit.`,`Every access: if logical ≥ limit, trap; else physical = base + logical.`,`On context switch the kernel reloads base/limit for the next process.`],
[`Every segfault you've seen is the MMU refusing an access.`,`Modern CPUs use page tables instead of a single base/limit, but the idea is identical.`,`Embedded MCUs without an MMU (some use an MPU) have no isolation between tasks.`],
[`Thinking pointers in C hold physical addresses.`,`Believing the OS checks each access in software (the MMU does it).`,`Forgetting that only the kernel can change the translation registers.`])
  ,
  examples: [
    {lv:'basic', title:'Base + limit arithmetic', code:`base = 14000, limit = 3000
logical 0     → 14000
logical 346   → 14346
logical 2999  → 16999      (last valid byte)
logical 3000  → trap        (≥ limit)`, why:`Physical = base + logical, valid only for 0 ≤ logical &lt; limit.`},
    {lv:'mid', title:'Same address, different processes (with paging)', sim:'addr', input:`# two processes would have two page tables; here is one of them
page-size: 1KB
table: 0:3 1:7 2:1 3:-
addresses: 1030 2049 512 3100`, why:`Modern MMUs use page tables (6.3). Address 3100 is on page 3, which isn't mapped: a fault. A second process would have a different table, mapping the same logical addresses elsewhere.`},
    {lv:'adv', title:'A segfault is the MMU saying no', code:`int *p = (int *)0x10;    // a tiny address: page 0 is deliberately unmapped
*p = 42;
$ ./a.out
Segmentation fault (core dumped)
$ dmesg | tail -1
a.out[4242]: segfault at 10 ip 0000560c… sp 00007ffd… error 6 in a.out`, why:`Linux never maps the lowest pages, so NULL-pointer (and near-NULL) dereferences always fault. "error 6" means a user-mode write to a not-present page.`},
  ],
  tips: {
    say:`"The CPU generates logical addresses; the MMU translates each to a physical address in hardware. In the simplest scheme a limit register bounds the process's address space for protection and a base register is added for relocation; the kernel reloads them on every context switch. An out-of-range access traps, giving a segfault. Execution-time binding lets the OS place and move processes anywhere, and modern systems generalise this with paging."`,
    points:[`Logical vs physical.`,`Base/limit check and addition.`,`Who sets the registers and when.`],
    traps:[`Saying the OS translates addresses in software.`,`Saying base/limit avoids fragmentation.`],
    qa:[[`Why is execution-time binding needed?`,`It lets the OS move a process in memory (compaction, swapping) and load it anywhere, since translation happens on each access.`],
        [`What protects the base and limit registers themselves?`,`Loading them is a privileged instruction; only the kernel in kernel mode can change them.`],
        [`What's the downside of base and limit?`,`Each process needs one contiguous region, leading to external fragmentation, and sharing parts of memory between processes is hard.`]]
  },
  exercises: [
    {lv:'E', q:`base = 20000, limit = 4000. What physical address does logical 1234 map to?`, ans:'21234', hint:`base + logical.`, answer:`<p>20000 + 1234 = 21234.</p>`},
    {lv:'M', q:`Same registers: does logical address 4000 trap? (yes/no)`, ans:'yes', hint:`Valid range is 0 … limit − 1.`, answer:`<p>Yes: 4000 ≥ limit.</p>`},
    {lv:'H', q:`With 1 KB pages and the table below, translate the addresses and give the physical addresses (or <code>fault</code>) separated by spaces.`, sim:'addr', key:'phys', input:`page-size: 1KB
table: 0:3 1:7 2:1 3:-
addresses: 1030 2049 512 3100`, hint:`page = addr / 1024, offset = addr % 1024, physical = frame × 1024 + offset.`, answer:`<p>1030 → page 1 offset 6 → 7×1024+6 = 7174; 2049 → page 2 offset 1 → 1025; 512 → page 0 → 3584; 3100 → page 3 → fault.</p>`},
  ],
  quiz: [
    [`The CPU generates…`,[`Physical addresses`,`Logical (virtual) addresses`,`Disk addresses`,`Port numbers`],1,`MMU translates.`,'E'],
    [`The MMU is…`,[`Software in the kernel`,`Hardware that translates addresses`,`A compiler pass`,`A cache`],1,`On every access.`,'E'],
    [`With base and limit, the physical address is…`,[`limit + logical`,`base + logical`,`base × logical`,`logical − base`],1,`Relocation.`,'E'],
    [`Accessing logical address ≥ limit causes…`,[`Wrap-around`,`A trap (addressing error / segfault)`,`Nothing`,`A page swap`],1,`Protection.`,'M'],
    [`Who can change the base and limit registers?`,[`Any process`,`Only the kernel (privileged instructions)`,`The compiler`,`The MMU`],1,`Otherwise no protection.`,'M'],
    [`Execution-time binding allows…`,[`Faster compilation`,`Moving a process in memory while it runs`,`No MMU`,`Smaller programs`],1,`Relocation.`,'M'],
  ],
  quizAdv: [
    [`Load-time binding means…`,[`The MMU translates`,`The loader adjusts addresses when the program is placed in memory`,`Addresses are fixed at compile time`,`No binding`],1,`Can't move afterwards.`,'H'],
    [`The main weakness of base/limit is…`,[`Speed`,`Requires contiguous allocation → external fragmentation`,`No protection`,`Needs a TLB`],1,`Solved by paging.`,'H'],
    [`Linux leaves page 0 unmapped so that…`,[`It saves memory`,`NULL-pointer dereferences fault immediately`,`The kernel can use it`,`Paging is faster`],1,`mmap_min_addr.`,'H'],
  ],
});
