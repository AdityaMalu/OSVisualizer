/* 6.4 TLB and effective access time */
topic('6', { no:'6.4', title:'The TLB and effective access time',
idea:`With paging, every memory access needs a page-table lookup first, doubling memory traffic. The TLB, a tiny cache of recent translations, fixes that. Trace a sequence of accesses through a 2-entry TLB, count hits and misses, and compute the effective access time.`,
actors:'CPU', tbTitle:'TLB (2 entries, LRU)', stateTitle:'Timing',
codes:{a:`translate(vaddr):
    page = vaddr >> 10                // 1 KB pages
    if (TLB has page)                 // TLB hit: ~1 cycle, in parallel
        frame = TLB[page]
    else {                            // TLB miss: walk the page table in memory
        frame = page_table[page]      // +1 memory access (more with multi-level)
        TLB.insert(page, frame)       // evict LRU entry if full
    }
    return frame << 10 | (vaddr & 0x3FF)

// effective access time (one-level table)
EAT = h × (t_TLB + t_mem) + (1 − h) × (t_TLB + 2 × t_mem)`},
steps:[
{hl:{mmu:[2,5,6,7]}, tb:[TB('TLB',['page','frame'],[['0','3']],{0:'new'})], g:[G('Timing',['access 1','addr 100 → page 0: MISS','bad'],['cost','TLB 20 + page table 100 + data 100 = 220 ns'])], log:['100: page 0 miss → walk → frame 3'],
 say:`Access address 100: page 0. The TLB is empty, so it's a <b>miss</b>: the MMU reads the page-table entry from memory (100 ns), then the data (another 100 ns). The translation 0 → 3 is cached in the TLB. Times: TLB 20 ns, memory 100 ns.`},
{tb:[TB('TLB',['page','frame'],[['0','3'],['1','7']],{1:'new'})], g:[G('Timing',['access 2','1100 → page 1: MISS','bad'],['access 3','120 → page 0: HIT','ok'],['hit cost','20 + 100 = 120 ns','ok'])], log:['1100: page 1 miss → frame 7','120: page 0 HIT'],
 say:`Address 1100 is page 1: another miss, cached. Address 120 is page 0 again: <b>hit</b>. The frame comes straight from the TLB and only the data access touches memory: 120 ns instead of 220.`},
{tb:[TB('TLB',['page','frame'],[['0','3'],['2','1']],{1:'new'})], g:[G('Timing',['access 4','2100 → page 2: MISS, evict page 1 (LRU)','bad'])], log:['2100: page 2 miss → evicts page 1'],
 say:`Address 2100 (page 2) misses. The TLB holds only two entries, so the <b>least recently used</b> one (page 1) is evicted. Real TLBs have 64–1500 entries, organised like small caches.`},
{tb:[TB('TLB after all 8 accesses',['page','frame'],[['3','5'],['2','1']])], g:[G('Timing',['accesses','100 1100 120 2100 1200 140 3100 2200'],['TLB hits','1 of 8','bad'],['average','(1×120 + 7×220) / 8 = 207.5 ns','bad'])],
 say:`Continue with 1200 (page 1, miss), 140 (page 0, miss: evicted earlier), 3100 (page 3, miss), 2200 (page 2, miss). This access pattern jumps around too much for a 2-entry TLB: only 1 hit in 8, average 207.5 ns. Real programs have strong <b>locality</b>, so real TLB hit ratios are typically 99%+.`},
{hl:{eat:[11,12]}, tb:[], g:[G('EAT formula',['h = 0.80','0.8 × 120 + 0.2 × 220 = 140 ns'],['h = 0.98','0.98 × 120 + 0.02 × 220 = 122 ns','ok'],['no TLB','every access 200 ns','bad'])],
 say:`The <b>effective access time</b> weights the two cases by the hit ratio <i>h</i>: EAT = h·(TLB + mem) + (1−h)·(TLB + 2·mem). With 20 ns TLB and 100 ns memory, h = 0.8 gives 140 ns; h = 0.98 gives 122 ns, close to the 100 ns ideal. With a 4-level page table, a miss costs up to 4 extra memory accesses, so the TLB matters even more. (Some textbooks ignore the TLB lookup time when it's done in parallel.)`},
{g:[G('TLB details',['context switch','flush, or tag entries with an ASID/PCID','ok'],['TLB reach','entries × page size; huge pages raise it','ok'],['shootdown','changing a mapping requires invalidating other cores\' TLBs (IPI)','bad'],['who refills','hardware page walker (x86, ARM) or software (MIPS)'])],
 say:`<b>Say it:</b> "Every virtual address must be translated, and with page tables in memory that would double memory accesses. The TLB is a small, fast associative cache of recent page-to-frame translations. On a hit the frame comes immediately; on a miss the MMU walks the page table and caches the result. Effective access time is h times the hit cost plus 1−h times the miss cost; with typical hit ratios above 99% translation is nearly free. Context switches flush it unless entries are tagged with address-space IDs."`}
],
keep:[`TLB = cache of page → frame translations.`,`Hit: TLB + mem. Miss: TLB + (levels × mem) + mem.`,`EAT = h·(t_tlb + t_mem) + (1−h)·(t_tlb + 2·t_mem) for one level.`,`Locality makes hit ratios ≈ 99%.`,`Context switch flushes TLB unless ASID/PCID tags are used.`]}, {
  imp: 'must',
  theory: TH(`The TLB caches recent virtual-to-physical translations so that most memory accesses don't need an extra page-table lookup; its hit ratio determines the effective access time.`,
`<p>Imagine looking up every word in a dictionary before reading it. You'd quickly remember the words you just looked up and skip the dictionary for them. The TLB is that short-term memory of translations, and because programs touch the same pages repeatedly (loops, stack, nearby data), it's right almost every time.</p>
<p>TLB misses are a real performance factor for big-memory workloads (databases, JVMs with large heaps), which is why huge pages exist: one 2 MB entry covers what 512 regular entries would.</p>`,
[[`TLB`,`Translation lookaside buffer: associative cache of PTEs.`],[`TLB hit / miss`,`Translation found / not found in the TLB.`],[`Hit ratio (h)`,`Fraction of accesses that hit.`],[`EAT`,`Effective (average) memory access time.`],[`Page walk`,`Reading page-table levels on a miss.`],[`ASID / PCID`,`Address-space tag to avoid flushing on context switch.`],[`TLB reach`,`Memory covered by all TLB entries.`],[`TLB shootdown`,`Invalidating stale entries on other cores.`]],
[`The CPU emits a virtual address; the TLB is searched (in parallel) for its page.`,`Hit: use the cached frame.`,`Miss: walk the page table, then insert the translation, evicting one.`,`If the PTE isn't present: page fault.`,`On context switch: flush or switch ASID.`],
[`Huge pages for databases and JVM heaps reduce TLB misses dramatically.`,`perf stat -e dTLB-load-misses shows TLB pressure.`,`Spectre/Meltdown mitigations (KPTI) increased TLB flushing costs.`],
[`Forgetting the page-table access on a miss in EAT.`,`Using one memory access for multi-level tables.`,`Assuming the TLB survives context switches without tags.`])
  ,
  examples: [
    {lv:'basic', title:'Count TLB hits', sim:'addr', input:`page-size: 1KB
table: 0:3 1:7 2:1 3:5
addresses: 100 1100 120 2100 1200 140 3100 2200
tlb: 2
tlb-time: 20
mem-time: 100`, why:`1 hit out of 8 with a 2-entry TLB. Change <code>tlb: 4</code>: after the first touch of each page everything hits.`},
    {lv:'mid', title:'Locality makes the TLB work', sim:'addr', input:`# a loop walking an array that spans pages 0 and 1
page-size: 1KB
table: 0:3 1:7
addresses: 0 4 8 12 1020 1024 1028 1032 1036 1040
tlb: 2`, why:`Two misses (first touch of each page), eight hits. Sequential access is the TLB's best case.`},
    {lv:'adv', title:'EAT with a multi-level table', code:`t_TLB = 1 ns (in parallel, often ignored), t_mem = 100 ns, 4-level page table
hit:  1 + 100                  = 101 ns
miss: 1 + 4×100 + 100          = 501 ns
h = 0.99:  0.99×101 + 0.01×501 = 105 ns   (5% overhead)
h = 0.90:  0.90×101 + 0.10×501 = 141 ns   (41% overhead)`, why:`The deeper the page table, the more each miss costs, so the hit ratio dominates. Real CPUs also cache upper page-table levels to soften misses.`},
  ],
  tips: {
    say:`"The TLB is a small associative cache of recent page-to-frame translations. Without it, every memory access would need an extra memory access for the page table, or several with multi-level tables. On a hit we get the frame immediately; on a miss the hardware walks the page table and caches the entry. Effective access time is h × hit time + (1 − h) × miss time, and thanks to locality h is usually above 99%. Context switches flush it unless entries carry an address-space ID."`,
    points:[`Why the TLB is needed.`,`EAT formula and a worked number.`,`Context-switch behaviour and ASIDs.`],
    traps:[`Counting one memory access on a miss for multi-level tables.`,`Saying the TLB caches data.`],
    qa:[[`What does the TLB cache, exactly?`,`Page-table entries (translations plus permission bits), not data. Data lives in the L1/L2/L3 caches.`],
        [`Why do huge pages help?`,`One TLB entry covers 2 MB instead of 4 KB, so TLB reach grows 512× and misses drop for large working sets.`],
        [`What's a TLB shootdown?`,`When the kernel changes or removes a mapping that other cores may have cached, it sends inter-processor interrupts so they invalidate the stale entry. It's costly, so kernels batch them.`]]
  },
  exercises: [
    {lv:'E', q:`TLB 20 ns, memory 100 ns, one-level page table, hit ratio 80%. What is the EAT in ns?`, ans:'140', hint:`0.8 × 120 + 0.2 × 220.`, answer:`<p>96 + 44 = 140 ns.</p>`},
    {lv:'M', q:`How many TLB hits for this access sequence?`, sim:'addr', key:'tlbHits', input:`page-size: 1KB
table: 0:3 1:7 2:1 3:5
addresses: 100 1100 120 2100 1200 140 3100 2200
tlb: 3`, hint:`3 entries, LRU.`, answer:`<p>Run it: with three entries pages 0, 1, 2 stay cached until page 3 arrives.</p>`},
    {lv:'H', q:`Memory 100 ns, TLB lookup time negligible, 2-level page table. What hit ratio (as a percentage) is needed for an EAT of 110 ns?`, ans:'95', hint:`EAT = h·100 + (1−h)·300.`, answer:`<p>110 = 100h + 300(1 − h) = 300 − 200h → h = 0.95 = 95%.</p>`},
  ],
  quiz: [
    [`The TLB caches…`,[`Data`,`Page-table translations`,`Disk blocks`,`Instructions only`],1,`page → frame.`,'E'],
    [`On a TLB miss with a one-level table, an access costs…`,[`1 memory access`,`2 memory accesses (PTE + data)`,`No memory access`,`A disk read`],1,`Plus the TLB check.`,'E'],
    [`High TLB hit ratios come from…`,[`Large disks`,`Locality of reference`,`Many processes`,`Small pages`],1,`Programs reuse nearby pages.`,'E'],
    [`On a context switch without ASIDs, the TLB…`,[`Is kept`,`Must be flushed`,`Is doubled`,`Is written to disk`],1,`Old translations are wrong for the new process.`,'M'],
    [`Huge pages reduce TLB misses because…`,[`They're faster RAM`,`Each entry covers more memory (larger TLB reach)`,`They disable paging`,`They're cached in L1`],1,`2 MB vs 4 KB.`,'M'],
    [`EAT = 0.9×120 + 0.1×220 equals…`,[`130`,`140`,`120`,`200`],0,`108 + 22.`,'M'],
  ],
  quizAdv: [
    [`With a 4-level table and no page-walk caches, a TLB miss needs how many memory accesses before the data access?`,[`1`,`2`,`4`,`8`],2,`One per level.`,'H'],
    [`A TLB shootdown is…`,[`A TLB hardware failure`,`Invalidating stale translations on other CPUs via IPIs`,`A TLB flush on boot`,`Replacing the TLB`],1,`Needed after unmapping.`,'H'],
    [`MIPS-style software-managed TLBs handle misses by…`,[`Hardware page walk`,`A trap to the OS, which loads the entry`,`Ignoring them`,`Using segments`],1,`OS refills the TLB.`,'H'],
  ],
});
