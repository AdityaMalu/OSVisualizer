/* 7.3 LRU approximations: clock / second chance */
topic('7', { no:'7.3', title:'LRU approximations: the clock (second-chance) algorithm',
idea:`Hardware gives each page just one "accessed" bit. The clock algorithm turns that bit into a good LRU approximation: a hand sweeps around the frames, giving recently used pages a second chance. Watch the hand move, bits clear, and a victim chosen; then add the dirty bit for the enhanced version.`,
actors:'Frames', tbTitle:'Frames (· = reference bit)', stateTitle:'Clock hand',
codes:{a:`// every page has a reference bit R, set to 1 by the MMU on access
evict():
    while (true) {
        if (frame[hand].R == 0) {          // not used since the hand last passed
            victim = hand;  hand = (hand + 1) % N;  return victim;
        }
        frame[hand].R = 0;                 // used recently: second chance
        hand = (hand + 1) % N;
    }

// enhanced clock: prefer (R, dirty) = (0,0) > (0,1) > (1,0) > (1,1)
// Linux: active/inactive lists, a two-handed variant of the same idea`},
steps:[
{hl:{clk:[1]}, tb:[TB('frames',['frame','page','R'],[['0 ← hand','A','1'],['1','B','1'],['2','C','0'],['3','D','1']],{0:'hot'})], g:[G('Clock hand',['position','frame 0'],['fault','page E needs a frame'])],
 say:`Four frames hold A, B, C, D, arranged in a circle with a <b>clock hand</b> pointing at frame 0. The MMU sets a page's <b>reference bit</b> R to 1 whenever it's accessed; only the OS clears it. Now page E faults in and needs a frame.`},
{hl:{clk:[4,8,9]}, tb:[TB('frames',['frame','page','R'],[['0','A','1 → 0'],['1 ← hand','B','1'],['2','C','0'],['3','D','1']],{0:'hot'})], g:[G('Clock hand',['frame 0 (A)','R = 1 → clear, skip (second chance)','hot'])],
 say:`The hand looks at A: R = 1, so A was used since the hand last passed. Instead of evicting it, the algorithm <b>clears</b> R and moves on: A gets a <b>second chance</b>. If A isn't used again before the hand comes back around, it will be evicted then.`},
{tb:[TB('frames',['frame','page','R'],[['0','A','0'],['1','B','1 → 0'],['2 ← hand','C','0'],['3','D','1']],{1:'hot'})], g:[G('Clock hand',['frame 1 (B)','R = 1 → clear, skip','hot'])],
 say:`B also has R = 1: cleared, skipped. Pages that are being used keep getting their bit set again by the hardware, so they keep surviving the sweep.`},
{hl:{clk:[4,5]}, tb:[TB('frames',['frame','page','R'],[['0','A','0'],['1','B','0'],['2','E (new)','1'],['3 ← hand','D','1']],{2:'new'})], g:[G('Clock hand',['frame 2 (C)','R = 0 → VICTIM','bad'],['C','not used for a whole sweep ≈ least recently used'])], log:['evict C, load E into frame 2'],
 say:`C has R = 0: not referenced for a full revolution of the hand. It's the victim; E is loaded into frame 2 (with R = 1) and the hand advances. The page chosen was "not used recently", a cheap approximation of "least recently used". If every bit were 1, the hand would clear them all and come back to frame 0: clock degrades to FIFO.`},
{hl:{clk:[11]}, tb:[TB('enhanced clock classes',['(R, dirty)','meaning','priority to evict'],[['(0, 0)','not used, clean','best: just drop it'],['(0, 1)','not used, modified','needs a write-back first'],['(1, 0)','used recently, clean','probably needed soon'],['(1, 1)','used recently, modified','worst choice']],{0:'ok',3:'bad'})], g:[G('Clock hand',['dirty bit','evicting a modified page costs a disk write','bad'])],
 say:`<b>Enhanced second chance</b> also looks at the <b>dirty</b> bit: a clean page can just be dropped (its copy on disk is current), but a dirty one must be written back first. So it prefers (not referenced, clean), then (not referenced, dirty), and so on, possibly sweeping several times. Real kernels also write dirty pages back in the background so clean victims are available.`},
{tb:[], g:[G('Other approximations',['NRU','classes by (R, M), random from the lowest class'],['aging','shift R into a counter each tick: approximate LRU order','ok'],['LFU / MFU','by count: rarely good alone'],['Linux','active + inactive LRU lists, refault tracking; MGLRU in 6.1+'])],
 say:`<b>Say it:</b> "Exact LRU is too expensive, so OSes approximate it with the hardware reference bit. The clock or second-chance algorithm keeps frames in a circle; on a fault the hand inspects the current frame: if its reference bit is 1, clear it and advance, giving the page a second chance; if 0, evict it. Frequently used pages keep their bits set and survive. The enhanced version also prefers clean pages to avoid write-backs. Linux uses active and inactive lists built on the same idea."`}
],
keep:[`Hardware sets R on access; the OS clears it.`,`Clock: R = 1 → clear + advance; R = 0 → evict.`,`All R = 1 → clock becomes FIFO.`,`Enhanced: prefer (R=0, clean) victims to avoid write-backs.`,`Linux: active/inactive lists (MGLRU) approximate LRU.`]}, {
  imp: 'good',
  theory: TH(`The clock algorithm approximates LRU with one hardware reference bit per page, sweeping a hand around the frames and evicting the first page not used since the last sweep.`,
`<p>A security guard walks a circular corridor of offices at night. If an office's light was switched on since the last round, the guard switches it off and moves on. If it's still off from last time, nobody has used it: it's the one to clean out. Busy offices keep switching their lights back on and are never chosen.</p>
<p>This gives most of LRU's benefit for the cost of one bit per page (which the hardware already maintains for free) and a pointer.</p>`,
[[`Reference (accessed) bit`,`Set by the MMU when a page is accessed.`],[`Dirty (modified) bit`,`Set by the MMU when a page is written.`],[`Clock hand`,`Pointer to the next frame to inspect.`],[`Second chance`,`Clearing R instead of evicting.`],[`Enhanced second chance`,`Uses (R, dirty) classes.`],[`Aging`,`Shift-register counters approximating LRU order.`],[`NRU`,`Not recently used: random victim from the lowest (R, M) class.`]],
[`Keep frames in a circular list with a hand.`,`On a fault, inspect the frame at the hand.`,`If R = 1: set R = 0, advance the hand, repeat.`,`If R = 0: evict that page, load the new one there with R = 1, advance.`,`Enhanced: make up to four passes looking for (0,0), then (0,1), …`],
[`Linux's page reclaim scans inactive lists and promotes referenced pages, a clock variant.`,`PostgreSQL's shared buffers use a clock-sweep with usage counts.`,`CPU caches use pseudo-LRU bits for the same reason.`],
[`Forgetting to set R for the newly loaded page.`,`Forgetting that clearing bits changes later decisions.`,`Thinking clock is exact LRU.`])
  ,
  examples: [
    {lv:'basic', title:'Clock on a short string', sim:'page', input:`algo: CLOCK
frames: 3
refs: 2 3 2 1 5 2 4 5 3 2 5 2`, why:`The table shows each frame as page·R. Compare with LRU (7 faults) and FIFO (9): clock lands in between at 8, typical of an approximation.`},
    {lv:'mid', title:'Clock vs FIFO vs LRU on Galvin\'s string', sim:'page', input:`algo: CLOCK      # try FIFO (15) and LRU (12)
frames: 3
refs: 7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1`, why:`Clock gets 14 here: close to FIFO on this short, tight string because most bits stay set. On real workloads with more frames, it tracks LRU much more closely.`},
    {lv:'adv', title:'Aging counters (an LRU approximation)', code:`// every clock tick: counter = (counter >> 1) | (R << 7); R = 0
page   R per tick (oldest → newest)   8-bit counter after 4 ticks
A      1 0 1 1                        1011 0000  → used recently and often
B      1 1 0 0                        0011 0000
C      0 0 0 1                        1000 0000
D      1 0 0 0                        0001 0000  → smallest: evict D`, why:`The counter remembers several past intervals, weighting recent use most. The smallest counter approximates the least recently used page.`},
  ],
  tips: {
    say:`"Hardware gives each page a reference bit that's set on access. The clock algorithm keeps frames in a circle with a hand; on a fault, if the page under the hand has its bit set, clear it and move on, giving it a second chance; if the bit is clear, evict that page. Recently used pages keep getting their bits set and survive, so it approximates LRU cheaply. The enhanced version also checks the dirty bit to prefer clean victims."`,
    points:[`Mechanics of the hand and bits.`,`Why it approximates LRU.`,`Dirty-bit refinement.`],
    traps:[`Saying clock needs timestamps.`,`Forgetting it can degrade to FIFO.`],
    qa:[[`What happens if all reference bits are 1?`,`The hand clears every bit in one full sweep and evicts the page it started at: it behaves like FIFO.`],
        [`Why prefer clean pages?`,`A clean page's disk copy is current, so it can be dropped instantly; a dirty one needs a write first, doubling the I/O of the fault.`],
        [`How does Linux decide what to reclaim?`,`It keeps active and inactive LRU lists; referenced inactive pages are promoted, unreferenced ones reclaimed; kswapd does this in the background. Newer kernels use multi-generational LRU.`]]
  },
  exercises: [
    {lv:'E', q:`Clock hand at a frame whose page has R = 1. What happens to that page? (two words)`, ans:'second chance', hint:`It isn't evicted.`, answer:`<p>Its bit is cleared and it gets a second chance; the hand moves on.</p>`},
    {lv:'M', q:`How many faults does the clock algorithm make here?`, sim:'page', key:'faults', input:`algo: CLOCK
frames: 3
refs: 2 3 2 1 5 2 4 5 3 2 5 2`, hint:`New pages enter with R = 1; hits set R = 1.`, answer:`<p>8 faults.</p>`},
    {lv:'H', q:`Clock with 3 frames on Galvin's 20-reference string: how many faults?`, sim:'page', key:'faults', input:`algo: CLOCK
frames: 3
refs: 7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1`, hint:`Trace carefully, or check with the simulator after trying.`, answer:`<p>14 faults (FIFO 15, LRU 12).</p>`},
  ],
  quiz: [
    [`The clock algorithm uses…`,[`Timestamps`,`A reference bit per page`,`A future reference string`,`Page sizes`],1,`Set by hardware.`,'E'],
    [`A page under the hand with R = 1…`,[`Is evicted`,`Has R cleared and is skipped`,`Is written to disk`,`Moves to frame 0`],1,`Second chance.`,'E'],
    [`If all R bits are 1, clock behaves like…`,[`LRU`,`OPT`,`FIFO`,`Random`],2,`Full sweep, back to start.`,'M'],
    [`Who sets the reference bit?`,[`The OS on each access`,`The MMU hardware on each access`,`The compiler`,`The disk`],1,`For free.`,'E'],
    [`The enhanced clock prefers to evict…`,[`(R=1, dirty)`,`(R=0, clean)`,`(R=0, dirty)`,`(R=1, clean)`],1,`No write-back needed.`,'M'],
    [`Clock is used because exact LRU…`,[`Is less accurate`,`Needs work on every memory access`,`Has Belady's anomaly`,`Needs the future`],1,`Too costly.`,'M'],
  ],
  quizAdv: [
    [`The aging algorithm…`,[`Uses one bit only`,`Shifts the R bit into a per-page counter each tick`,`Is OPT`,`Uses timestamps`],1,`Approximates LRU order.`,'H'],
    [`Linux 6.1 introduced…`,[`The clock algorithm`,`Multi-generational LRU (MGLRU)`,`Pure FIFO`,`OPT`],1,`Better reclaim decisions.`,'H'],
    [`PostgreSQL's shared buffer replacement is…`,[`Pure LRU`,`A clock sweep with usage counts`,`FIFO`,`Random`],1,`Same family.`,'H'],
  ],
});
