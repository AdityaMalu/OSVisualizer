/* 6.5 Multi-level, hashed and inverted page tables */
topic('6', { no:'6.5', title:'Multi-level, hashed and inverted page tables',
idea:`A flat page table for a 48-bit address space would be 512 GB per process. Multi-level tables only allocate the parts that are used. Walk a 2-level translation on a 32-bit system step by step, see how much memory a sparse process saves, then meet the alternatives: hashed and inverted page tables.`,
actors:'MMU', dgTitle:'Two-level page walk (32-bit, 4 KB pages)', stateTitle:'Sizes',
nodes:{
  va:{x:240,y:24,label:'10 bits | 10 bits | 12 bits',w:300,h:30,kind:'mem'},
  cr3:{x:60,y:110,label:'CR3',w:70,h:34,kind:'lock'},
  dir:{x:190,y:110,label:'page directory\n1024 entries',w:150,h:50},
  pt:{x:350,y:110,label:'page table\n1024 entries',w:140,h:50},
  frame:{x:350,y:205,label:'frame + offset',w:140,h:36,kind:'db'},
  none:{x:190,y:205,label:'missing tables:\nnot allocated',w:150,h:40,kind:'mem'}
},
edges:[['cr3','dir'],['dir','pt'],['pt','frame']],
vb:'0 0 460 240',
codes:{a:`// 32-bit virtual address, 4 KB pages, 4-byte entries, two levels
| p1 (10 bits) | p2 (10 bits) | offset (12 bits) |
pde   = page_directory[p1]          // directory base from CR3
table = pde.frame                   // one 4 KB page of 1024 PTEs
pte   = table[p2]
phys  = pte.frame << 12 | offset

// x86-64: 48-bit addresses = 9 + 9 + 9 + 9 + 12  (4 levels; 5 with 57-bit LA57)
// inverted table: ONE table for the whole machine, one entry per physical frame
//   lookup by (pid, page) → frame, usually through a hash table`},
steps:[
{hl:{mmu:[1,2]}, d:{on:['va'], e:[]}, g:[G('Sizes',['flat table','2²⁰ entries × 4 B = 4 MB per process','bad'],['typical process','uses a few MB of its 4 GB space','hot'])],
 say:`A flat table for 32-bit addresses with 4 KB pages needs 2²⁰ entries (4 MB) per process, even though a typical process uses only a few scattered regions (code at the bottom, stack at the top). Most entries would say "not present". Idea: <b>page the page table</b>. Split the 20-bit page number into two 10-bit indexes.`},
{hl:{mmu:[3]}, d:{on:['cr3','dir'], e:[['cr3','dir','base','hot']]}, g:[G('Sizes',['address','0x0040 3A7C'],['p1 (top 10 bits)','1','hot'],['p2 (next 10)','3'],['offset','0xA7C'])],
 say:`The CPU's <code>CR3</code> register points to the process's <b>page directory</b>: one 4 KB page with 1024 entries. The top 10 bits of the address (p1 = 1) pick a directory entry.`},
{hl:{mmu:[4,5]}, d:{on:['dir','pt'], e:[['cr3','dir','','ok'],['dir','pt','pde[1]','hot']]},
 say:`That directory entry holds the frame of a second-level <b>page table</b>, again 1024 entries in one page. The next 10 bits (p2 = 3) select the PTE inside it.`},
{hl:{mmu:[6]}, d:{on:['frame'], e:[['cr3','dir','','ok'],['dir','pt','','ok'],['pt','frame','pte[3]','hot']]}, g:[G('Sizes',['memory accesses on a TLB miss','2 (directory + table)','bad'])], log:['0x00403A7C: pde[1] → table, pte[3] → frame → physical'],
 say:`The PTE gives the frame; append the 12-bit offset for the physical address. Cost: <b>two</b> memory accesses per translation instead of one on a TLB miss. With four levels (x86-64) it's four, which is why the TLB (and caches of upper levels) matter so much.`},
{d:{on:['none','dir'], e:[['dir','none','null entries','dash']]}, g:[G('Sizes',['directory','4 KB'],['tables actually needed','e.g. 3 (code, heap, stack)'],['total','4 KB + 3 × 4 KB = 16 KB','ok'],['flat','4 MB','bad'])],
 say:`The payoff: if a whole 4 MB region of the address space is unused, its directory entry is simply marked not-present and the 4 KB table behind it is <b>never allocated</b>. A process using code, heap and stack needs a directory plus three tables: 16 KB instead of 4 MB.`},
{hl:{mmu:[8,9,10]}, d:null, g:[G('Alternatives',['hashed page table','hash(page) → chain of (page, frame); good for sparse 64-bit spaces'],['inverted page table','one entry per physical frame: size ∝ RAM, not address space','ok'],['inverted downside','lookup by (pid, page) needs a hash; sharing pages is awkward','bad'],['used by','PowerPC, IA-64 (inverted/hashed); x86, ARM (multi-level)'])],
 say:`Two alternatives. A <b>hashed page table</b> hashes the page number into buckets of (page, frame) pairs. An <b>inverted page table</b> flips the mapping: one global table with one entry per <i>physical frame</i>, saying which (process, page) is there. Its size depends only on RAM, but finding a translation means searching (via a hash), and shared memory is harder.`},
{g:[G('Remember',['multi-level','split page number; allocate only used parts; k levels = k accesses per miss'],['x86-64','4 levels: 9+9+9+9+12 bits'],['inverted','one entry per frame; hash lookup'])],
 say:`<b>Say it:</b> "Flat page tables are too big for large address spaces, so we page the page table: the page number is split into several indexes, each selecting an entry in a table at that level, and tables for unused regions are never allocated. x86-64 uses four levels of 9 bits each over a 12-bit offset. The cost is one memory access per level on a TLB miss. Alternatives are hashed page tables and inverted page tables, which have one entry per physical frame and need a hash lookup."`}
],
keep:[`Multi-level: split the page number; unused regions need no tables.`,`32-bit 2-level: 10 + 10 + 12. x86-64: 9 + 9 + 9 + 9 + 12.`,`k levels → k memory accesses per TLB miss.`,`Hashed: hash(page) → chain. Inverted: one entry per frame, size ∝ RAM.`,`Inverted tables make sharing and lookups harder.`]}, {
  imp: 'good',
  theory: TH(`Multi-level page tables save memory by allocating table pages only for used parts of the address space; hashed and inverted tables trade lookup speed for size in other ways.`,
`<p>A phone book for a city of a billion possible numbers but only a million subscribers would be mostly blank. Instead, there's a directory of area codes, and a local book only exists for area codes with subscribers. Looking someone up takes two steps, but blank areas cost nothing.</p>
<p>The "inverted" idea turns it around: instead of a book listing each possible number, keep one entry per actual phone line saying who owns it, and search it via an index.</p>`,
[[`Multi-level page table`,`Tree of tables indexed by successive parts of the page number.`],[`Page directory`,`Top-level table (x86 32-bit).`],[`Page walk`,`Following the levels to find a PTE.`],[`Hashed page table`,`Hash of the page number → list of mappings.`],[`Inverted page table`,`One entry per physical frame: (pid, page).`],[`PML4 / 4-level paging`,`x86-64's 4-level structure; LA57 adds a fifth.`]],
[`Split the virtual page number into k fields.`,`Start at the root table (address in CR3).`,`Each field indexes the current table; the entry points to the next table.`,`The last level holds the frame; append the offset.`,`If any entry along the way is not present → page fault.`],
[`Linux allocates page-table pages lazily as memory is touched.`,`Page-walk caches in CPUs cache upper-level entries.`,`Huge pages stop the walk one level early (the entry maps 2 MB directly).`],
[`Assuming more levels save time (they save space and cost time).`,`Wrong bit splits in exam questions: check the table fits in one page.`,`Forgetting that every level's table is itself a page.`])
  ,
  examples: [
    {lv:'basic', title:'Bit split for x86-64', code:`48-bit virtual address, 4 KB pages, 8-byte entries:
  offset = 12 bits                         (4096)
  entries per 4 KB table = 4096 / 8 = 512  → 9 bits per level
  48 − 12 = 36 bits of page number = 4 levels × 9
  |  PML4 9  |  PDPT 9  |  PD 9  |  PT 9  |  offset 12  |`, why:`Each table is exactly one page; each level consumes as many bits as it has entries.`},
    {lv:'mid', title:'Memory saved for a sparse process', code:`32-bit, 2-level, 4 KB pages, 4 B entries
process uses: 8 MB code+data at the bottom, 1 MB stack at the top
  flat table:                         4 MB
  2-level: directory 4 KB + tables:
    8 MB / 4 MB per table = 2 tables, stack = 1 table → 3 × 4 KB
    total = 16 KB                    (≈ 250× smaller)`, why:`Each second-level table maps 1024 × 4 KB = 4 MB. Only regions in use get a table.`},
    {lv:'adv', title:'Inverted table sizing', code:`8 GB RAM, 4 KB frames → 2^21 frames = 2,097,152 entries
entry = pid (4 B) + page number (8 B) + chain pointer (4 B) = 16 B
inverted table = 32 MB for the WHOLE machine, regardless of process count
vs per-process multi-level tables: grows with each process's mapped memory`, why:`The inverted table's size depends only on physical memory, which is why it suited 64-bit systems with huge sparse spaces (PowerPC, IA-64).`},
  ],
  tips: {
    say:`"A flat page table needs one entry per possible page, which is huge for large address spaces. Multi-level tables split the page number into indexes for each level, so only tables covering used regions exist; x86-64 uses four levels of 9 bits over a 12-bit offset. The cost is extra memory accesses per TLB miss, one per level. Alternatives are hashed page tables and inverted page tables, which have one entry per physical frame and look up translations by hashing (pid, page)."`,
    points:[`Why flat tables are too big (with numbers).`,`How the walk works and what's saved.`,`Inverted/hashed trade-offs.`],
    traps:[`Claiming multi-level is faster.`,`Wrong bit splits.`],
    qa:[[`Why 9 bits per level on x86-64?`,`A table must fit in one 4 KB page; with 8-byte entries that's 512 entries = 9 bits.`],
        [`How does a multi-level table handle huge pages?`,`A level-2 entry (PD) can map a 2 MB page directly instead of pointing to a table, ending the walk early.`],
        [`Why are inverted tables bad for shared memory?`,`Each frame entry records one (pid, page) owner; mapping the same frame into several processes needs extra structures.`]]
  },
  exercises: [
    {lv:'E', q:`32-bit addresses, 4 KB pages, two levels with equal-size indexes. How many bits per index?`, ans:'10', hint:`(32 − 12) / 2.`, answer:`<p>10 bits each.</p>`},
    {lv:'M', q:`With 4 levels and no TLB hit, how many memory accesses does one load instruction need in total (walk + data)?`, ans:'5', hint:`One per level plus the data.`, answer:`<p>4 + 1 = 5.</p>`},
    {lv:'H', q:`A 2-level 32-bit table (4 KB pages, 4 B PTEs). A process uses 12 MB at the bottom and 2 MB of stack at the top. How many KB of page tables does it need (directory included)?`, ans:'20', hint:`Each second-level table covers 4 MB.`, answer:`<p>12 MB → 3 tables, 2 MB of stack → 1 table, plus the directory: 5 × 4 KB = 20 KB.</p>`},
  ],
  quiz: [
    [`Multi-level page tables mainly save…`,[`Time`,`Memory for page tables`,`Disk space`,`TLB entries`],1,`Unused regions need no tables.`,'E'],
    [`x86-64 normally uses how many page-table levels?`,[`1`,`2`,`4`,`8`],2,`5 with LA57.`,'E'],
    [`The cost of more levels is…`,[`More internal fragmentation`,`More memory accesses on a TLB miss`,`Fewer pages`,`No protection`],1,`One per level.`,'E'],
    [`An inverted page table has one entry per…`,[`Virtual page`,`Physical frame`,`Process`,`Segment`],1,`Size ∝ RAM.`,'M'],
    [`Looking up an inverted table usually requires…`,[`Indexing by page number`,`A hash on (pid, page)`,`A tree walk`,`The TLB only`],1,`It's indexed by frame.`,'M'],
    [`Each level's table is sized to fit in…`,[`A cache line`,`One page`,`The TLB`,`A register`],1,`That fixes the bits per level.`,'M'],
  ],
  quizAdv: [
    [`With 8-byte PTEs and 4 KB pages, bits per level are…`,[`8`,`9`,`10`,`12`],1,`512 entries.`,'H'],
    [`A 2 MB huge page on x86-64 ends the walk at…`,[`PML4`,`PDPT`,`PD (level 2)`,`PT`],2,`The PD entry maps it.`,'H'],
    [`Which architectures used inverted/hashed page tables?`,[`x86 and ARM`,`PowerPC and IA-64`,`MIPS only`,`RISC-V only`],1,`Classic examples.`,'H'],
  ],
});
