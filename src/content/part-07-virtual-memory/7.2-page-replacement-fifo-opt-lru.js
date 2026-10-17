/* 7.2 Page replacement: FIFO, OPT, LRU and Belady's anomaly */
topic('7', { no:'7.2', title:'Page replacement: FIFO, OPT, LRU and Belady\'s anomaly',
idea:`When memory is full and a page fault needs a frame, which page should go? Run the same reference string through FIFO, the optimal algorithm and LRU with 3 frames, count the faults, and watch FIFO get <i>worse</i> with more memory: Belady's anomaly.`,
actors:'Algorithms', tbTitle:'Frames after each reference', stateTitle:'Faults',
codes:{a:`reference string: 7 0 1 2 0 3 0 4      frames: 3

FIFO: evict the page that has been in memory longest
OPT:  evict the page whose next use is farthest in the future   (needs the future!)
LRU:  evict the page that was used least recently              (looks at the past)

// LRU in hardware/software:
//   counter: stamp each PTE with the time of last use, evict the smallest
//   stack:   move a page to the top on every use, evict the bottom`},
steps:[
{hl:{alg:[1,3]}, th:[['FIFO','RUN:ok','oldest goes first']], tb:[TB('FIFO, 3 frames',['ref','7','0','1','2','0','3','0','4'],[['frame 0','7','7','7','2','2','2','2','4'],['frame 1','','0','0','0','0','3','3','3'],['frame 2','','','1','1','1','1','0','0'],['fault?','F','F','F','F','hit','F','F','F']],{3:'hot'})], g:[G('Faults',['FIFO','7 of 8'])],
 say:`3 frames, references 7 0 1 2 0 3 0 4. The first three are <b>compulsory</b> faults (empty frames). <b>FIFO</b> evicts the page loaded longest ago: 2 replaces 7, then 3 replaces 0 (oldest now), but 0 is needed again immediately, so 0 replaces 1, then 4 replaces 2. 7 faults. FIFO ignores how pages are used.`},
{hl:{alg:[4]}, th:[['OPT','RUN:ok','looks into the future']], tb:[TB('OPT, 3 frames',['ref','7','0','1','2','0','3','0','4'],[['frame 0','7','7','7','2','2','2','2','2'],['frame 1','','0','0','0','0','0','0','4'],['frame 2','','','1','1','1','3','3','3'],['fault?','F','F','F','F','hit','F','hit','F']],{3:'ok'})], g:[G('Faults',['FIFO','7'],['OPT','6 (best possible)','ok'])],
 say:`<b>OPT</b> (Bélády's optimal algorithm) evicts the page whose next use is farthest away. At "2", the future is 0 3 0 4 2 3 0 3 2 1 2 0 1 7…: 7 isn't needed for a long time, so 7 goes. At "3", 1 is used latest, so 1 goes. It's provably optimal but needs future knowledge, so it's used as a <b>benchmark</b>.`},
{hl:{alg:[5]}, th:[['LRU','RUN:ok','uses the recent past']], tb:[TB('LRU, 3 frames',['ref','7','0','1','2','0','3','0','4'],[['frame 0','7','7','7','2','2','2','2','4'],['frame 1','','0','0','0','0','0','0','0'],['frame 2','','','1','1','1','3','3','3'],['fault?','F','F','F','F','hit','F','hit','F']],{3:'ok'})], g:[G('Faults',['FIFO','7'],['OPT','6'],['LRU','6','ok'])],
 say:`<b>LRU</b> uses the past as a predictor of the future: evict the page not used for the longest time. At "3", page 1 was last used longest ago, so 1 goes (and the 0 that FIFO threw out stays). At "4", 2 is least recent. 6 faults here, matching OPT. Over Galvin's full 20-reference string: FIFO 15, LRU 12, OPT 9.`},
{hl:{alg:[7,8,9]}, th:[], tb:[], g:[G('Implementing LRU',['counter','time stamp per page; evict min: search cost','bad'],['stack','doubly linked list, move to top on every access: 6 pointer updates per access','bad'],['problem','updates on EVERY memory access: too slow without hardware support','bad'],['real systems','approximate it (clock, next topic)','ok'])],
 say:`Exact LRU is expensive: it must update a timestamp or a linked list on <i>every</i> memory access, not just on faults. No mainstream hardware does that, so OSes <b>approximate</b> LRU using the accessed bit set by the MMU (clock algorithm, next topic). LRU and OPT are <b>stack algorithms</b>: the pages in memory with n frames are always a subset of those with n+1, so more frames never hurt.`},
{th:[['FIFO 3','RUN:ok','9 faults'],['FIFO 4','RUN:bad','10 faults!']], tb:[TB('Belady\'s anomaly: 1 2 3 4 1 2 5 1 2 3 4 5',['frames','FIFO faults','LRU faults'],[['3','9','10'],['4','10','8']],{1:'bad'})], g:[G('Belady\'s anomaly',['FIFO','more frames can mean MORE faults','bad'],['why','FIFO is not a stack algorithm'],['LRU, OPT','never anomalous','ok'])],
 say:`<b>Belady's anomaly</b>: on the string 1 2 3 4 1 2 5 1 2 3 4 5, FIFO makes 9 faults with 3 frames but <b>10 with 4</b>. Adding memory made it worse! FIFO isn't a stack algorithm: the set of pages it keeps with 4 frames isn't a superset of the 3-frame set. LRU goes from 10 to 8, as you'd hope.`},
{tb:[], th:[], g:[G('Remember',['FIFO','simple; ignores usage; Belady\'s anomaly'],['OPT','evict farthest next use; optimal; impossible in practice (benchmark)'],['LRU','evict least recently used; great, but costly exactly → approximations'],['dirty pages','evicting a modified page costs a write-back too'])],
 say:`<b>Say it:</b> "On a fault with no free frame we must evict a page. FIFO evicts the oldest, which is simple but ignores usage and suffers Belady's anomaly, where more frames can cause more faults. OPT evicts the page used farthest in the future; it's optimal but needs the future, so it's a benchmark. LRU evicts the least recently used page, approximating OPT using the past; it's a stack algorithm with no anomaly, but exact LRU is too expensive, so systems approximate it with reference bits."`}
],
keep:[`FIFO: evict oldest. OPT: evict farthest next use. LRU: evict least recently used.`,`Galvin's string, 3 frames: FIFO 15, LRU 12, OPT 9.`,`Belady's anomaly: FIFO can fault more with more frames.`,`LRU and OPT are stack algorithms: no anomaly.`,`Exact LRU is too costly → approximations (clock).`]}, {
  imp: 'must',
  theory: TH(`Page replacement chooses which resident page to evict on a fault; OPT is optimal but unrealisable, LRU approximates it well, and FIFO is simple but can behave badly.`,
`<p>Your desk fits three books. When you need a fourth, one goes back on the shelf. Putting back the one you took out first (FIFO) might mean returning the dictionary you use constantly. Putting back the one you won't need for the longest time (OPT) is perfect if you can see the future. Putting back the one you haven't touched for the longest time (LRU) is the practical best guess, because what you used recently you'll probably use again soon.</p>
<p>Fault counts on a reference string are the standard exam and interview exercise. The simulator below does the bookkeeping so you can check your hand traces.</p>`,
[[`Reference string`,`Sequence of page numbers accessed.`],[`Page fault rate`,`Faults / references.`],[`FIFO`,`Evict the earliest loaded page.`],[`OPT / MIN`,`Evict the page with the farthest next use.`],[`LRU`,`Evict the least recently used page.`],[`Belady's anomaly`,`More frames → more faults (FIFO).`],[`Stack algorithm`,`Pages kept with n frames ⊆ pages kept with n+1 frames.`],[`Compulsory fault`,`First reference to a page (unavoidable).`]],
[`Process the reference string one page at a time.`,`If the page is resident: hit (update recency for LRU).`,`Otherwise fault: use a free frame if any.`,`Else pick the victim by the algorithm; write it back first if dirty.`,`Count faults.`],
[`Database buffer pools use LRU variants (LRU-K, clock-sweep in Postgres).`,`CPU caches use pseudo-LRU.`,`Redis offers allkeys-lru / LFU eviction.`],
[`Forgetting compulsory faults.`,`In LRU, not updating recency on hits.`,`In OPT, breaking ties inconsistently (any choice among never-used-again pages is fine).`])
  ,
  examples: [
    {lv:'basic', title:'FIFO on Galvin\'s string', sim:'page', input:`algo: FIFO
frames: 3
refs: 7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1`, why:`15 faults. Change the algorithm to LRU (12) and OPT (9). The table shows every frame after every reference; * marks a just-loaded page.`},
    {lv:'mid', title:'Belady\'s anomaly', sim:'page', input:`algo: FIFO
frames: 3          # then try 4
refs: 1 2 3 4 1 2 5 1 2 3 4 5`, why:`9 faults with 3 frames, 10 with 4. Switch to LRU: 10 with 3 frames, 8 with 4. Only FIFO is anomalous.`},
    {lv:'adv', title:'LRU\'s worst case: a loop one page too big', sim:'page', input:`algo: LRU
frames: 3
refs: 1 2 3 4 1 2 3 4 1 2 3 4`, why:`Every access faults: LRU always evicts exactly the page needed next. With <code>frames: 4</code> only the 4 compulsory faults remain. MRU or OPT do far better on cyclic scans, which is why databases treat sequential scans specially.`},
  ],
  tips: {
    say:`"When a fault occurs and no frame is free we evict a victim. FIFO evicts the page loaded first: simple, but it ignores usage and suffers Belady's anomaly. OPT evicts the page that won't be used for the longest time: optimal, but it needs the future, so it's a benchmark. LRU evicts the page unused for the longest time, using the past to predict the future; it's a stack algorithm so more frames never hurt, but exact LRU is expensive, so OSes approximate it with reference bits."`,
    points:[`Trace a reference string correctly.`,`State optimality of OPT and why it's impractical.`,`Explain Belady's anomaly and stack algorithms.`],
    traps:[`Claiming LRU suffers Belady's anomaly.`,`Forgetting to count the initial loads as faults.`],
    qa:[[`Why is exact LRU rarely implemented?`,`It needs bookkeeping on every memory access, not just on faults; hardware provides only a referenced bit, so OSes approximate LRU.`],
        [`When does LRU perform terribly?`,`Cyclic access to slightly more pages than frames (e.g. scanning a large table repeatedly): it always evicts the next page needed.`],
        [`What is a stack algorithm?`,`One where the set of pages in memory with n frames is always a subset of the set with n+1 frames; such algorithms can't exhibit Belady's anomaly.`]]
  },
  exercises: [
    {lv:'E', q:`How many page faults does FIFO make?`, sim:'page', key:'faults', input:`algo: FIFO
frames: 3
refs: 2 3 2 1 5 2 4 5 3 2 5 2`, hint:`Count the 3 compulsory faults too.`, answer:`<p>9 faults.</p>`},
    {lv:'M', q:`Same string with LRU: how many faults?`, sim:'page', key:'faults', input:`algo: LRU
frames: 3
refs: 2 3 2 1 5 2 4 5 3 2 5 2`, hint:`Update recency on every hit.`, answer:`<p>7 faults.</p>`},
    {lv:'H', q:`Same string with OPT: how many faults?`, sim:'page', key:'faults', input:`algo: OPT
frames: 3
refs: 2 3 2 1 5 2 4 5 3 2 5 2`, hint:`At each eviction, look ahead for the page used farthest away.`, answer:`<p>6 faults: the lower bound for this string and 3 frames.</p>`},
  ],
  quiz: [
    [`FIFO evicts…`,[`The least recently used page`,`The page loaded earliest`,`The most used page`,`A random page`],1,`Oldest in memory.`,'E'],
    [`OPT evicts the page…`,[`Loaded earliest`,`Whose next use is farthest in the future`,`Used least often`,`With the dirty bit set`],1,`Optimal, needs the future.`,'E'],
    [`LRU evicts…`,[`The page not used for the longest time`,`The newest page`,`The biggest page`,`A random page`],0,`Past predicts future.`,'E'],
    [`Belady's anomaly can occur with…`,[`LRU`,`OPT`,`FIFO`,`All algorithms`],2,`Not a stack algorithm.`,'M'],
    [`Why is OPT not used in real OSes?`,[`It's too slow`,`It requires knowing future references`,`It has Belady's anomaly`,`It wastes memory`],1,`Benchmark only.`,'M'],
    [`Galvin's 20-reference string with 3 frames: LRU faults =`,[`9`,`12`,`15`,`20`],1,`FIFO 15, OPT 9.`,'M'],
  ],
  quizAdv: [
    [`A stack algorithm guarantees that…`,[`It's fast`,`More frames never increase faults`,`It uses a stack data structure`,`It never faults`],1,`Inclusion property.`,'H'],
    [`LRU on a cyclic scan of n+1 pages with n frames gives…`,[`n faults`,`A fault on every reference`,`One fault`,`No faults`],1,`Pathological case.`,'H'],
    [`Evicting a dirty page costs extra because…`,[`It must be zeroed`,`It must be written back to disk first`,`It's in the TLB`,`It's shared`],1,`Prefer clean victims.`,'H'],
  ],
});
