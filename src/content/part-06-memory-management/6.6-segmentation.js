/* 6.6 Segmentation */
topic('6', { no:'6.6', title:'Segmentation (and segmentation with paging)',
idea:`Paging chops memory into equal pieces that mean nothing to the programmer. Segmentation instead divides it into logical units: code, data, stack, heap, each with its own base, limit and permissions. Translate (segment, offset) pairs, hit a limit violation, and see why x86-64 mostly abandoned segments for paging.`,
actors:'Process', tbTitle:'Segment table', stateTitle:'Translation',
codes:{a:`// a logical address is a pair: <segment, offset>
seg_table[s] = { base, limit, perms }
if (offset >= seg_table[s].limit) trap(SEGMENTATION_FAULT);
physical = seg_table[s].base + offset;

// segment table for one process
seg 0 code   base 1400  limit 1000  r-x
seg 1 data   base 6300  limit  400  rw-
seg 2 stack  base 4300  limit 1100  rw-
seg 3 heap   base 3200  limit  600  rw-`},
steps:[
{hl:{seg:[1,2]}, tb:[TB('segment table',['seg','name','base','limit','perms'],[['0','code','1400','1000','r-x'],['1','data','6300','400','rw-'],['2','stack','4300','1100','rw-'],['3','heap','3200','600','rw-']])], g:[G('Translation',['address','<segment, offset>'],['each segment','variable size, own permissions'])],
 say:`In <b>segmentation</b>, a program's address space is a set of variable-sized <b>segments</b> matching its logical structure: code, data, stack, heap. An address is a pair <code>&lt;segment, offset&gt;</code>, and each segment has its own base, limit and permissions in a <b>segment table</b>.`},
{hl:{seg:[3,4]}, tb:[TB('segment table',['seg','name','base','limit','perms'],[['0','code','1400','1000','r-x'],['1','data','6300','400','rw-'],['2','stack','4300','1100','rw-'],['3','heap','3200','600','rw-']],{2:'ok'})], g:[G('Translation',['address','<2, 53>'],['check','53 < 1100 ✓','ok'],['physical','4300 + 53 = 4353','hot'])], log:['<2, 53> → 4353'],
 say:`Translate <code>&lt;2, 53&gt;</code>: segment 2 is the stack; 53 is below its limit 1100, so the physical address is 4300 + 53 = <b>4353</b>. It's base-and-limit (6.1), but with one pair per logical segment instead of one per process.`},
{tb:[TB('segment table',['seg','name','base','limit','perms'],[['0','code','1400','1000','r-x'],['1','data','6300','400','rw-'],['2','stack','4300','1100','rw-'],['3','heap','3200','600','rw-']],{1:'bad'})], g:[G('Translation',['address','<1, 500>'],['check','500 ≥ 400 ✗','bad'],['result','trap: segmentation fault','bad'])], log:['<1, 500> → TRAP (offset beyond limit)'],
 say:`<code>&lt;1, 500&gt;</code>: the data segment is only 400 bytes long, so offset 500 traps. This is where the term <b>segmentation fault</b> comes from. Writing to segment 0 (code, read-only) would also trap: per-segment permissions give natural protection, and sharing a whole code segment between processes is easy.`},
{tb:[TB('physical memory over time',['range','contents'],[['1400–2399','P1 code'],['2400–3199','hole (800)'],['3200–3799','P1 heap'],['3800–4299','hole (500)'],['…','new 900-byte segment fits nowhere']],{1:'bad',3:'bad',4:'bad'})], g:[G('Translation',['problem','segments are variable-size, contiguous','bad'],['result','external fragmentation again (like 6.2)','bad'])],
 say:`The catch: each segment must be <b>contiguous</b> in physical memory and segments vary in size, so we're back to the hole-fitting problem of 6.2 and <b>external fragmentation</b>. Holes of 800 and 500 can't hold a 900-byte segment.`},
{tb:[TB('segmentation + paging (e.g. 32-bit x86)',['step','what happens'],[['1','segment selector + offset → linear address (base + offset, limit check)'],['2','linear address → page tables → physical address'],['benefit','logical protection of segments + no external fragmentation']])], g:[G('Translation',['x86-64 today','segment bases forced to 0 (except FS/GS for thread-local storage)'],['so','protection and translation are done by paging','ok'])],
 say:`The fix is to combine both: each segment is itself <b>paged</b>, so segments give logical units and permissions while paging handles placement. 32-bit x86 did exactly this. In practice OSes set all segment bases to 0 (a "flat" model) and used paging alone, so x86-64 removed most segmentation; only FS and GS survive, used to find thread-local storage.`},
{tb:[], g:[G('Compare',['paging','fixed size, invisible to programmer, internal fragmentation only'],['segmentation','variable size, logical units, external fragmentation'],['both','segments for structure, pages for placement'])],
 say:`<b>Say it:</b> "Segmentation divides a process's address space into variable-size logical segments such as code, data and stack, each with base, limit and protection; an address is a segment number plus an offset, checked against the limit and added to the base. It matches the program's structure and makes protection and sharing natural, but variable-size contiguous segments cause external fragmentation. Combining segmentation with paging fixes that; modern x86-64 effectively uses a flat model with paging only."`}
],
keep:[`Address = <segment, offset>; check offset < limit; physical = base + offset.`,`Segments = logical units (code, data, stack) with own permissions.`,`Variable size + contiguous → external fragmentation.`,`Segmentation + paging: segments for structure, pages for placement.`,`x86-64: flat model; FS/GS used for thread-local storage.`]}, {
  imp: 'good',
  theory: TH(`Segmentation splits an address space into variable-size logical segments, each with its own base, limit and protection, which matches program structure but brings back external fragmentation unless combined with paging.`,
`<p>A book organised into chapters (segments) instead of fixed-size sheets: "chapter 3, line 53" is natural for a reader, and you can lend someone chapter 1 (sharing) or mark chapter 2 as read-only. But storing chapters of very different lengths on shelves leaves awkward gaps.</p>
<p>Today segmentation lives on mostly in terminology (segmentation fault, text/data segments) and in thread-local storage, while paging does the real work.</p>`,
[[`Segment`,`Variable-size logical region (code, data, stack, heap).`],[`Segment table`,`Per-process table of base, limit and permissions.`],[`Segment selector`,`x86 register value naming a segment.`],[`Segmentation fault`,`Offset beyond the limit or a permission violation.`],[`Flat memory model`,`All segments base 0, limit max: segmentation effectively off.`],[`FS / GS`,`x86-64 segment registers still used for thread-local data.`]],
[`Address = (segment s, offset d).`,`Look up entry s in the segment table.`,`If d ≥ limit, or the access violates permissions, trap.`,`Physical (or linear, if paged) = base + d.`],
[`ELF files still describe text/data/BSS segments; the loader maps them with paging.`,`Thread-local storage on x86-64 Linux is addressed via FS.`,`Older systems (Burroughs, Multics, 286) were heavily segmented.`],
[`Saying modern Linux uses segmentation for protection (it uses paging).`,`Confusing segments with pages.`,`Forgetting that segmentation also has external fragmentation.`])
  ,
  examples: [
    {lv:'basic', title:'Translate segment addresses', code:`seg  base  limit
 0   1400  1000
 1   6300   400
 2   4300  1100
<0, 430> → 1400 + 430 = 1830
<2, 53>  → 4300 + 53  = 4353
<1, 500> → 500 ≥ 400 → trap`, why:`The classic exam drill: check the limit first, then add the base.`},
    {lv:'mid', title:'Thread-local storage uses a segment register', code:`__thread int counter;          // one copy per thread
counter++;
// compiles to (x86-64 Linux):
mov  eax, DWORD PTR fs:counter@tpoff   ; FS base = this thread's TLS block
add  eax, 1
mov  DWORD PTR fs:counter@tpoff, eax`, why:`Each thread's FS base points to its own TLS block, so the same instruction reaches a different variable per thread: the last everyday use of x86 segmentation.`},
    {lv:'adv', title:'Segments of an ELF binary (mapped by paging)', code:`$ readelf -lW /bin/ls | grep LOAD
  LOAD  0x000000 0x0000000000000000 … 0x003510 0x003510 R   0x1000
  LOAD  0x004000 0x0000000000004000 … 0x013091 0x013091 R E 0x1000   # code
  LOAD  0x018000 0x0000000000018000 … 0x007e30 0x007e30 R   0x1000   # read-only data
  LOAD  0x020ff0 0x0000000000021ff0 … 0x001278 0x002568 RW  0x1000   # data + BSS`, why:`"Segments" here are logical regions with permissions, the spirit of segmentation, but the kernel maps them page by page (alignment 0x1000 = 4 KB).`},
  ],
  tips: {
    say:`"Segmentation splits a process's address space into variable-size logical segments, like code, data and stack, each with a base, a limit and permissions. An address is a segment number plus an offset; the hardware checks the offset against the limit and adds the base. It mirrors program structure and makes sharing and protection natural, but because segments are variable-size and contiguous it suffers external fragmentation. Combining it with paging solves that; x86-64 effectively uses only paging."`,
    points:[`Address format and translation.`,`Pros: logical units, protection, sharing.`,`Cons: external fragmentation; modern flat model.`],
    traps:[`Saying segments are fixed size.`,`Saying Linux protects memory with segments.`],
    qa:[[`Paging vs segmentation in one line?`,`Paging: fixed-size, invisible to the program, no external fragmentation. Segmentation: variable-size logical units visible to the program, with external fragmentation.`],
        [`Why do we still say "segmentation fault"?`,`Historical: the error originally came from segment-limit violations; today it's usually a page-level protection fault.`],
        [`What did segmentation + paging look like on 32-bit x86?`,`Selector + offset → linear address via the segment descriptor, then linear → physical via the page tables.`]]
  },
  exercises: [
    {lv:'E', q:`Segment 0 has base 1400, limit 1000. What physical address is <0, 430>?`, ans:'1830', hint:`base + offset.`, answer:`<p>1400 + 430 = 1830.</p>`},
    {lv:'M', q:`Segment 1 has base 6300, limit 400. Does <1, 399> trap? (yes/no)`, ans:'no', hint:`Valid offsets are 0…399.`, answer:`<p>No: 399 &lt; 400 → physical 6699.</p>`},
    {lv:'H', q:`Segment 3 has base 3200, limit 600. Give the physical address for <3, 599>, or <code>trap</code>.`, ans:'3799', hint:`Check the limit first.`, answer:`<p>599 &lt; 600 → 3200 + 599 = 3799.</p>`},
  ],
  quiz: [
    [`A segmented address consists of…`,[`Page and frame`,`Segment number and offset`,`Base and limit only`,`Virtual and physical`],1,`<s, d>.`,'E'],
    [`Segments are…`,[`Fixed size`,`Variable size logical units`,`Always 4 KB`,`Hardware cache lines`],1,`Code, data, stack…`,'E'],
    [`Pure segmentation suffers from…`,[`Internal fragmentation only`,`External fragmentation`,`No fragmentation`,`TLB thrashing`],1,`Variable-size contiguous blocks.`,'E'],
    [`If offset ≥ limit…`,[`It wraps`,`The hardware traps`,`It goes to the next segment`,`Nothing`],1,`Protection.`,'M'],
    [`Segmentation makes it easy to…`,[`Avoid fragmentation`,`Share and protect logical units like code`,`Remove the MMU`,`Speed up I/O`],1,`Whole segments.`,'M'],
    [`Modern x86-64 Linux uses segmentation for…`,[`All memory protection`,`Little beyond FS/GS for thread-local storage`,`Paging`,`Swapping`],1,`Flat model.`,'M'],
  ],
  quizAdv: [
    [`On 32-bit x86 with segmentation + paging, the segment unit produces a…`,[`Physical address`,`Linear address, then translated by paging`,`Disk address`,`TLB entry`],1,`Two stages.`,'H'],
    [`A flat memory model means…`,[`No paging`,`All segment bases 0 and limits maximal`,`One process only`,`No stack`],1,`Segmentation neutralised.`,'H'],
    [`Multics is famous for…`,[`No virtual memory`,`Combining segmentation with paging and named segments`,`Inverted page tables`,`Being a microkernel`],1,`Historical influence on Unix.`,'H'],
  ],
});
