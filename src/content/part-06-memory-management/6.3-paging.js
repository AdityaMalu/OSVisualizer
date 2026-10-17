/* 6.3 Paging */
topic('6', { no:'6.3', title:'Paging: pages, frames and page tables',
idea:`Paging splits virtual memory into fixed-size pages and physical memory into frames of the same size, so a process's pages can sit in any frames. Translate a few addresses by hand: split into page number and offset, look up the page table, glue the frame number to the offset.`,
actors:'Process', tbTitle:'Page table (process P)', stateTitle:'Translation',
codes:{a:`// page size 4 KB = 2^12 → the low 12 bits are the offset
virtual address  0x00003A7C
  page number = addr >> 12      = 0x3
  offset      = addr & 0xFFF    = 0xA7C
page_table[0x3] = frame 0x2 (present)
physical = (frame << 12) | offset = 0x2A7C

// each page-table entry (PTE) also holds bits:
present · writable · user-accessible · accessed · dirty · no-execute`},
steps:[
{hl:{tr:[1,2]}, tb:[TB('page table (process P)',['page','frame','present'],[['0','5','1'],['1','9','1'],['2','—','0'],['3','2','1']])], g:[G('Translation',['page size','4 KB = 2¹²'],['offset bits','12'],['virtual address','0x3A7C','hot'])],
 say:`Virtual memory is cut into <b>pages</b> and physical memory into <b>frames</b>, both 4 KB here. Any page can go in any frame, so there's no external fragmentation and no need for contiguous RAM. The OS keeps a <b>page table</b> per process: page number → frame number.`},
{hl:{tr:[3,4]}, tb:[TB('page table (process P)',['page','frame','present'],[['0','5','1'],['1','9','1'],['2','—','0'],['3','2','1']],{3:'hot'})], g:[G('Translation',['address','0x3A7C = 0011 1010 0111 1100'],['page number (high bits)','0x3','hot'],['offset (low 12 bits)','0xA7C','hot'])],
 say:`Because the page size is a power of two, splitting an address is just cutting bits: the low 12 bits are the <b>offset</b> within the page (0xA7C), and the remaining high bits are the <b>page number</b> (0x3). No division needed in hardware.`},
{hl:{tr:[5,6]}, tb:[TB('page table (process P)',['page','frame','present'],[['0','5','1'],['1','9','1'],['2','—','0'],['3','2','1']],{3:'ok'})], g:[G('Translation',['page_table[3]','frame 2','ok'],['physical','frame 2, offset 0xA7C = 0x2A7C','hot'])], log:['0x3A7C → page 3 → frame 2 → 0x2A7C'],
 say:`The MMU indexes the page table with 3, finds frame 2, and replaces the page number with the frame number while keeping the offset: physical address <b>0x2A7C</b>. The offset never changes; only the "which page" part is translated.`},
{tb:[TB('page table (process P)',['page','frame','present'],[['0','5','1'],['1','9','1'],['2','—','0'],['3','2','1']],{2:'bad'})], g:[G('Translation',['address','0x2010 → page 2'],['present bit','0','bad'],['result','page fault → kernel (7.1)','bad'])], log:['0x2010 → page 2 → not present → PAGE FAULT'],
 say:`Address 0x2010 is on page 2, whose <b>present</b> bit is 0: it isn't in RAM (maybe never loaded, maybe swapped out, maybe invalid). The MMU raises a <b>page fault</b> and the kernel decides what to do: load the page from disk, or kill the process if the address is illegal. That's demand paging (Part 7).`},
{hl:{tr:[8,9]}, tb:[TB('a page-table entry',['bit','meaning'],[['present','page is in a frame'],['R/W','writable? write to read-only → fault (COW, protection)'],['U/S','user may access? kernel pages: no'],['accessed','set by hardware on use (for page replacement)'],['dirty','set on write (must be saved before eviction)'],['NX','no-execute (data pages)']])], g:[G('Translation',['frame number','+ these control bits = one PTE (8 bytes on x86-64)'])],
 say:`Each <b>page-table entry</b> holds the frame number plus control bits that make paging much more than relocation: protection (read-only, user/kernel, no-execute), the <b>accessed</b> and <b>dirty</b> bits that page replacement relies on, and present. Sharing is easy too: two processes' tables can point at the same frame (shared libraries, shared memory).`},
{tb:[], g:[G('Costs',['page table size','2²⁰ entries × 4 B = 4 MB per process (32-bit, 4 KB pages)','bad'],['speed','each access needs an extra memory access for the PTE','bad'],['fixes','TLB (6.4), multi-level tables (6.5)','ok'],['internal fragmentation','last page half empty on average'])],
 say:`<b>Say it:</b> "Paging divides virtual memory into fixed-size pages and physical memory into equal-size frames, so a process's pages can be scattered anywhere and there's no external fragmentation. An address splits into a page number and an offset; the page table maps page to frame, and the physical address is the frame number joined with the same offset. Entries also carry present, protection, accessed and dirty bits. Naively each access needs an extra memory read for the page table, which the TLB solves, and flat tables are big, which multi-level tables solve."`}
],
keep:[`Page (virtual) and frame (physical) are the same size, a power of 2.`,`address = page number | offset; offset bits = log2(page size).`,`physical = frame × page size + offset.`,`PTE: frame + present, R/W, U/S, accessed, dirty, NX.`,`No external fragmentation; small internal (last page).`]}, {
  imp: 'must',
  theory: TH(`Paging maps fixed-size virtual pages to physical frames through a per-process page table, removing the need for contiguous memory.`,
`<p>A book split into numbered pages that can be stored in any order in a filing cabinet. To read "page 3, line 20" you check an index card (page table) saying page 3 is in drawer 2, then read line 20 there. The line number (offset) is the same in the original and the drawer.</p>
<p>Paging is the foundation of virtual memory: on top of it the OS builds demand paging, copy-on-write, memory-mapped files and shared libraries.</p>`,
[[`Page`,`Fixed-size block of virtual memory (4 KB typical).`],[`Frame`,`Physical memory block of the same size.`],[`Page table`,`Per-process map from page number to frame (+ bits).`],[`PTE`,`Page-table entry.`],[`Offset`,`Position within a page: low log2(page size) bits.`],[`Present / valid bit`,`Whether the page is in memory.`],[`Dirty bit`,`Page modified since loaded.`],[`Huge pages`,`2 MB / 1 GB pages to reduce table size and TLB misses.`]],
[`Split the virtual address: page = addr / page size, offset = addr mod page size.`,`Look up the PTE for that page in the current process's table.`,`If not present or not permitted, page fault.`,`Physical = frame × page size + offset.`],
[`/proc/PID/pagemap and pmap show mappings; RSS counts resident pages.`,`Huge pages (THP, hugetlbfs) speed up databases and JVMs with large heaps.`,`Shared libraries are mapped once in RAM and shared by every process's page table.`],
[`Getting the number of offset bits wrong.`,`Forgetting the page number indexes the table (it isn't stored in the PTE).`,`Thinking pages of a process must be in consecutive frames.`])
  ,
  examples: [
    {lv:'basic', title:'Translate with 1 KB pages', sim:'addr', input:`page-size: 1KB
table: 0:3 1:7 2:1 3:-
addresses: 1030 2049 512 3100`, why:`1030 = page 1, offset 6 → frame 7 → 7174. Edit the table and addresses and run again; hex works too (0x40C).`},
    {lv:'mid', title:'4 KB pages and hex addresses', sim:'addr', input:`page-size: 4KB
table: 0:5 1:9 2:- 3:2
addresses: 0x1A2C 0x3004 0x2000 100`, why:`With 4 KB pages the last three hex digits are the offset: 0x1A2C → page 1, offset 0xA2C → frame 9 → 0x9A2C. 0x2000 hits a non-present page.`},
    {lv:'adv', title:'Sizing a page table', code:`32-bit addresses, 4 KB pages:
  offset bits = 12, page-number bits = 20 → 2^20 = 1,048,576 entries
  4 bytes per entry → 4 MB per process for a flat table
48-bit addresses (x86-64), 4 KB pages, 8-byte entries:
  2^36 entries × 8 B = 512 GB (!) per process → flat tables are impossible
  → multi-level page tables (6.5)`, why:`The arithmetic every paging question starts from: bits for offset, bits for page number, entries × entry size.`},
  ],
  tips: {
    say:`"Paging splits virtual memory into fixed-size pages and physical memory into frames of the same size. A virtual address is a page number plus an offset; the page table maps the page number to a frame, and the physical address is that frame with the same offset. It eliminates external fragmentation and makes sharing and protection per page easy. The costs are an extra memory access per translation, fixed by the TLB, and large tables, fixed with multi-level tables."`,
    points:[`Split an address correctly.`,`Show the lookup and recombination.`,`Name PTE bits and costs.`],
    traps:[`Wrong offset bit count.`,`Saying paging has no fragmentation at all.`],
    qa:[[`Why are page sizes powers of two?`,`So splitting an address into page number and offset is a bit shift and mask, not a division.`],
        [`Bigger or smaller pages?`,`Bigger: smaller tables and fewer TLB misses, more internal fragmentation and I/O per fault. Smaller: the reverse. 4 KB is standard; huge pages for big memory workloads.`],
        [`How do two processes share memory with paging?`,`Both page tables have entries pointing to the same physical frame, possibly with different permissions.`]]
  },
  exercises: [
    {lv:'E', q:`Page size 2 KB. How many bits is the offset?`, ans:'11', hint:`2 KB = 2^?`, answer:`<p>2048 = 2¹¹ → 11 bits.</p>`},
    {lv:'M', q:`Translate the addresses (physical, or <code>fault</code>), space separated.`, sim:'addr', key:'phys', input:`page-size: 4KB
table: 0:5 1:9 2:- 3:2
addresses: 0x1A2C 0x3004 0x2000 100`, hint:`Last 3 hex digits = offset for 4 KB pages.`, answer:`<p>0x1A2C → 0x9A2C = 39468; 0x3004 → 0x2004 = 8196; 0x2000 → fault; 100 → frame 5 → 20580.</p>`},
    {lv:'H', q:`A 32-bit system with 8 KB pages and 4-byte PTEs. How many KB is a flat page table for one process?`, ans:'2048', hint:`Page-number bits = 32 − 13.`, answer:`<p>2¹⁹ entries × 4 B = 2 MB = 2048 KB.</p>`},
  ],
  quiz: [
    [`Pages and frames are…`,[`Different sizes`,`The same size`,`Variable size`,`Only on disk`],1,`Any page fits any frame.`,'E'],
    [`With 4 KB pages, the offset is…`,[`4 bits`,`12 bits`,`20 bits`,`32 bits`],1,`2¹² = 4096.`,'E'],
    [`Paging eliminates…`,[`Internal fragmentation`,`External fragmentation`,`Page faults`,`The TLB`],1,`No contiguity needed.`,'E'],
    [`The physical address is…`,[`page + offset`,`frame number combined with the same offset`,`page × frame`,`offset only`],1,`Offset unchanged.`,'M'],
    [`The dirty bit tells the OS…`,[`The page is invalid`,`The page was modified and must be written back before eviction`,`The page is shared`,`The page is executable`],1,`Saves writes for clean pages.`,'M'],
    [`If a PTE's present bit is 0, an access causes…`,[`A TLB hit`,`A page fault`,`A segfault always`,`Nothing`],1,`Kernel decides.`,'M'],
  ],
  quizAdv: [
    [`A flat page table for 32-bit addresses with 4 KB pages and 4 B entries is…`,[`4 KB`,`4 MB`,`4 GB`,`1 MB`],1,`2²⁰ × 4 B.`,'H'],
    [`The NX bit prevents…`,[`Reading`,`Executing code from data pages`,`Writing`,`Swapping`],1,`Mitigates code injection.`,'H'],
    [`Shared libraries save RAM because…`,[`They're compressed`,`Many page tables map the same physical frames`,`They live on disk only`,`They have no code`],1,`One copy in memory.`,'H'],
  ],
});
