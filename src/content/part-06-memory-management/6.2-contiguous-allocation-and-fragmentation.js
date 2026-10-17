/* 6.2 Contiguous allocation and fragmentation */
topic('6', { no:'6.2', title:'Contiguous allocation: first, best, worst fit and fragmentation',
idea:`If each process needs one contiguous block, the OS must pick a hole for it. Place four processes into five holes with first fit, best fit and worst fit, watch one request fail although enough memory is free in total (external fragmentation), and contrast it with internal fragmentation.`,
actors:'Requests', tbTitle:'Holes (KB)', stateTitle:'Strategy',
codes:{a:`// free memory = a list of holes; place each request in one hole
first fit:  the first hole that is big enough           (fast)
best fit:   the smallest hole that is big enough        (least leftover)
worst fit:  the largest hole                            (leftover stays usable?)
next fit:   first fit, starting where the last search ended

// holes: 100 500 200 300 600        requests: 212 417 112 426

// fixes for external fragmentation
compaction: move processes together (needs execution-time binding)
paging: stop needing contiguity at all`},
steps:[
{hl:{alg:[2]}, th:[['R1','RUN:ok','212 KB → hole 2 (500)'],['R2','READY:info','417 KB'],['R3','READY:info','112 KB'],['R4','READY:info','426 KB']], tb:[TB('holes after R1, first fit',['hole 1','hole 2','hole 3','hole 4','hole 5'],[['100','500 → 288','200','300','600']],{0:'hot'})], g:[G('Strategy',['first fit','scan from the start, take the first that fits'])],
 say:`Free memory consists of five <b>holes</b>: 100, 500, 200, 300 and 600 KB. Four processes arrive needing 212, 417, 112 and 426 KB. <b>First fit</b> scans from the start: 100 is too small, 500 fits, so R1 goes into hole 2, leaving 288.`},
{hl:{alg:[2]}, th:[['R1','RUN:ok','hole 2'],['R2','RUN:ok','417 → hole 5 (600)'],['R3','RUN:ok','112 → hole 2 (288)'],['R4','BLOCKED:bad','426: no hole big enough']], tb:[TB('first fit result',['hole 1','hole 2','hole 3','hole 4','hole 5'],[['100','176','200','300','183']],{0:'bad'})], g:[G('Strategy',['free in total','959 KB','hot'],['largest hole','300 KB','bad'],['R4 (426)','fails','bad'])],
 say:`R2 (417) skips to hole 5 (600 → 183). R3 (112) fits in what's left of hole 2 (288 → 176). R4 needs 426, but the biggest hole is 300. It <b>fails</b>, although 959 KB are free in total. Free memory is split into pieces too small to use: <b>external fragmentation</b>.`},
{hl:{alg:[3]}, th:[['R1','RUN:ok','212 → hole 4 (300)'],['R2','RUN:ok','417 → hole 2 (500)'],['R3','RUN:ok','112 → hole 3 (200)'],['R4','RUN:ok','426 → hole 5 (600)']], tb:[TB('best fit result',['hole 1','hole 2','hole 3','hole 4','hole 5'],[['100','83','88','88','174']],{0:'ok'})], g:[G('Strategy',['best fit','smallest hole that fits'],['result','all four placed','ok'],['leftovers','83, 88, 88: tiny, often useless slivers','bad'])],
 say:`<b>Best fit</b> picks the smallest hole that fits: R1 → 300, R2 → 500, R3 → 200, R4 → 600. All four fit here. But it tends to leave many tiny slivers (83, 88, 88 KB) that nothing will ever fit into, and it must search the whole list (or keep it sorted).`},
{hl:{alg:[4]}, th:[['R1','RUN:ok','212 → hole 5 (600)'],['R2','RUN:ok','417 → hole 2 (500)'],['R3','RUN:ok','112 → hole 5 (388)'],['R4','BLOCKED:bad','426 fails']], tb:[TB('worst fit result',['hole 1','hole 2','hole 3','hole 4','hole 5'],[['100','83','200','300','276']],{0:'bad'})], g:[G('Strategy',['worst fit','largest hole'],['idea','leftover stays large enough to be useful'],['in practice','usually worst of the three','bad'])],
 say:`<b>Worst fit</b> always takes the largest hole, hoping the leftover stays useful: R1 → 600 (388 left), R2 → 500, R3 → 388. R4 (426) fails again. Simulations generally show first fit and best fit beat worst fit, and first fit is fastest. On average, about a third of memory can be lost to fragmentation (the <b>50-percent rule</b>: N allocated blocks leave ~0.5 N lost to fragments).`},
{hl:{fix:[10,11]}, th:[], tb:[TB('internal fragmentation (fixed 4 KB blocks)',['request','allocated','wasted inside'],[['5 KB','8 KB (2 blocks)','3 KB'],['1 byte','4 KB','4095 bytes']],{0:'hot',1:'hot'})], g:[G('Two kinds',['external','free space between allocations is too fragmented','bad'],['internal','space wasted inside an allocated block (rounding up)','bad']),G('Fixes',['compaction','slide processes together; costly, needs relocation'],['paging','no contiguity needed: no external fragmentation','ok'])],
 say:`Contrast <b>internal fragmentation</b>: if memory is handed out in fixed-size units (pages, blocks), a 5 KB request gets 8 KB and the 3 KB inside is wasted. External fragmentation can be fixed by <b>compaction</b> (shuffling processes together, expensive) or avoided altogether by <b>paging</b>, which trades it for a little internal fragmentation in each process's last page.`},
{g:[G('Remember',['first fit','fast, good'],['best fit','good utilisation, slivers, slow search'],['worst fit','usually worst'],['external vs internal','between blocks vs inside blocks'])],
 say:`<b>Say it:</b> "With contiguous allocation the OS keeps a list of holes. First fit takes the first big-enough hole and is fast; best fit takes the smallest that fits and leaves tiny slivers; worst fit takes the largest and usually performs worst. All suffer external fragmentation: enough free memory in total but no single hole large enough. Compaction fixes it at a cost; paging avoids it, accepting a little internal fragmentation, which is waste inside allocated units."`}
],
keep:[`First fit: first hole that fits (fast). Best: smallest that fits. Worst: largest.`,`Next fit: first fit from where the last search stopped.`,`External fragmentation: total free is enough, no single hole is.`,`Internal fragmentation: waste inside an allocated unit.`,`Fixes: compaction, or paging (no contiguity).`]}, {
  imp: 'must',
  theory: TH(`Contiguous allocation places each process in one free hole, chosen by first, best or worst fit, and inevitably leaves external fragmentation that compaction or paging must address.`,
`<p>Parking cars of different lengths along a kerb with no marked bays: as cars come and go, the free space breaks into gaps. A lorry may not fit anywhere although the gaps would add up to three lorries. Marking fixed bays (paging) stops that, but a small car in a big bay wastes space inside the bay (internal fragmentation).</p>
<p>The same problem appears in malloc implementations, file systems and GPU memory, so these strategies are worth knowing beyond OS memory.</p>`,
[[`Hole`,`A contiguous block of free memory.`],[`First fit`,`Allocate the first hole large enough.`],[`Best fit`,`Allocate the smallest hole large enough.`],[`Worst fit`,`Allocate the largest hole.`],[`Next fit`,`First fit resuming from the last allocation point.`],[`External fragmentation`,`Free memory split into unusable small holes.`],[`Internal fragmentation`,`Unused memory inside an allocated block.`],[`Compaction`,`Moving allocations to merge free space.`],[`50-percent rule`,`With first fit, about half as many blocks are lost as are allocated.`]],
[`Keep a list of holes (address, size).`,`On a request, choose a hole by the strategy; split it, keeping the remainder as a smaller hole.`,`On release, return the block and merge it with adjacent holes (coalescing).`,`If no hole fits, wait, compact, or swap something out.`],
[`malloc implementations (dlmalloc, jemalloc) use size classes and best-fit-like bins.`,`Long-running services can fragment the heap; RSS grows although live data doesn't.`,`Disk allocation for contiguous files faces the same choices.`],
[`Confusing internal and external fragmentation.`,`Forgetting to merge adjacent free holes on release.`,`Assuming best fit is always best.`])
  ,
  examples: [
    {lv:'basic', title:'First fit (Galvin\'s exercise)', sim:'alloc', input:`algo: first
holes: 100 500 200 300 600
requests: 212 417 112 426`, why:`The 426 KB request fails with 959 KB free: external fragmentation. Change <code>algo</code> to best, worst and next and compare which requests fit and what's left over.`},
    {lv:'mid', title:'Best fit leaves slivers', sim:'alloc', input:`algo: best
holes: 100 500 200 300 600
requests: 212 417 112 426`, why:`Everything fits, but the leftovers are 83, 88, 88 and 174 KB: lots of small holes.`},
    {lv:'adv', title:'Enough memory, wrong shape', sim:'alloc', input:`algo: first
holes: 50 30 40
requests: 60`, why:`120 KB free, a 60 KB request fails. Only compaction (merge into one 120 KB hole) or non-contiguous allocation (paging) can help.`},
  ],
  tips: {
    say:`"With contiguous allocation the OS tracks free holes and places each process in one. First fit takes the first hole that's large enough and is fast; best fit takes the smallest that fits, giving good utilisation but tiny leftover slivers; worst fit takes the largest and generally performs worst. Over time memory suffers external fragmentation, where the free total is enough but no single hole is. Compaction fixes it at a cost, paging avoids it, at the price of some internal fragmentation."`,
    points:[`Define each strategy.`,`Define both fragmentation types with examples.`,`Name the fixes.`],
    traps:[`Saying paging has no fragmentation at all.`,`Mixing up internal and external.`],
    qa:[[`Why can't we always compact?`,`It requires moving processes, so addresses must be bound at execution time; and copying memory takes time during which processes stall.`],
        [`Which strategy is usually best in practice?`,`First fit: as good as best fit for utilisation in simulations and faster. Best fit leaves slivers; worst fit destroys large holes.`],
        [`Does paging eliminate fragmentation?`,`It eliminates external fragmentation; internal fragmentation remains in the last page of each region (half a page on average).`]]
  },
  exercises: [
    {lv:'E', q:`First fit: which hole (1-based) does each request go into? Answer like <code>2 5 2 -</code> (- = doesn't fit).`, sim:'alloc', key:'place', input:`algo: first
holes: 100 500 200 300 600
requests: 212 417 112 426`, hint:`Scan from hole 1 each time; holes shrink.`, answer:`<p>212 → 2, 417 → 5, 112 → 2 (288 left), 426 → none.</p>`},
    {lv:'M', q:`Worst fit on the same input: which holes?`, sim:'alloc', key:'place', input:`algo: worst
holes: 100 500 200 300 600
requests: 212 417 112 426`, hint:`Always the currently largest hole.`, answer:`<p>212 → 5 (600 → 388), 417 → 2 (500), 112 → 5 (388 → 276), 426 → none.</p>`},
    {lv:'H', q:`Next fit (search starts at the hole used last): what are the hole sizes at the end? (space separated)`, sim:'alloc', key:'holes', input:`algo: next
holes: 100 500 200 300 600
requests: 212 417 112 426`, hint:`After 417 goes in hole 5, the search for 112 starts at hole 5.`, answer:`<p>212 → hole 2 (288), 417 → hole 5 (183), 112 → hole 5 (71), 426 fails: 100 288 200 300 71.</p>`},
  ],
  quiz: [
    [`First fit chooses…`,[`The largest hole`,`The first hole that is big enough`,`The smallest hole`,`A random hole`],1,`Fast.`,'E'],
    [`Best fit chooses…`,[`The first hole`,`The smallest hole that fits`,`The largest hole`,`The last hole`],1,`Least leftover.`,'E'],
    [`External fragmentation is…`,[`Waste inside a block`,`Free memory split into holes too small to use`,`Disk errors`,`Paging overhead`],1,`Between allocations.`,'E'],
    [`Internal fragmentation is…`,[`Waste inside an allocated block due to rounding up`,`Holes between processes`,`TLB misses`,`Swapping`],0,`Inside blocks.`,'M'],
    [`Compaction requires…`,[`Static binding`,`Execution-time (dynamic) relocation`,`A TLB`,`No MMU`],1,`Processes move.`,'M'],
    [`Which typically performs worst?`,[`First fit`,`Best fit`,`Worst fit`,`They're equal`],2,`Breaks up large holes.`,'M'],
  ],
  quizAdv: [
    [`The 50-percent rule says that with N allocated blocks, about…`,[`N holes`,`0.5N blocks are lost to fragmentation`,`2N holes`,`No loss`],1,`~1/3 of memory unusable.`,'H'],
    [`Paging trades external fragmentation for…`,[`Nothing`,`Some internal fragmentation in the last page`,`More external fragmentation`,`Compaction`],1,`Half a page per region on average.`,'H'],
    [`When a block is freed next to free holes, the allocator should…`,[`Leave them separate`,`Coalesce them into one hole`,`Compact all memory`,`Zero them only`],1,`Fights fragmentation.`,'H'],
  ],
});
