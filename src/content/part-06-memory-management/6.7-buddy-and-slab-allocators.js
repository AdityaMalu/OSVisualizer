/* 6.7 Kernel memory: buddy and slab allocators */
topic('6', { no:'6.7', title:'Kernel allocators: the buddy system and slab allocation',
idea:`The kernel needs physically contiguous chunks of many sizes, fast. The buddy system splits memory into power-of-two blocks and merges freed "buddies" back together; the slab allocator caches ready-made objects of one type. Run the classic buddy example on 1 MB: split, allocate, free, and coalesce all the way back.`,
actors:'Requests', tbTitle:'Memory (1024 KB)', stateTitle:'Buddy system',
codes:{a:`// buddy system: blocks are 2^k sizes; round each request up
alloc(n):  k = ceil(log2(n));  take a free 2^k block,
           or split a bigger one in halves ("buddies") until one fits
free(b):   if b's buddy is also free → merge into 2^(k+1), repeat upward
buddy address = block address XOR block size     // cheap to find

// slab allocator: a cache per object type (task_struct, inode, dentry …)
cache = kmem_cache_create("task_struct", sizeof(struct task_struct), …);
p = kmem_cache_alloc(cache);    // grab a pre-built object from a slab
kmem_cache_free(cache, p);      // back to the slab, still initialised`},
steps:[
{hl:{alg:[2,3]}, th:[['A','RUN:ok','70 KB → 128 KB block']], tb:[TB('memory',['0–127','128–255','256–511','512–1023'],[['A (128)','free 128','free 256','free 512']],{0:'hot'})], g:[G('Buddy system',['request','70 KB → round up to 128','hot'],['splits','1024 → 512+512 → 256+256 → 128+128'],['waste','58 KB internal fragmentation','bad'])],
 say:`Start with one free 1024 KB block. A asks for 70 KB; the buddy system only hands out powers of two, so it needs 128. It <b>splits</b> 1024 into two 512 "buddies", one 512 into two 256s, one 256 into two 128s, and gives A the first 128. The 58 KB A doesn't use is internal fragmentation.`},
{hl:{alg:[2,3]}, th:[['A','RUN:ok','128'],['B','RUN:ok','35 KB → 64'],['C','RUN:ok','80 KB → 128']], tb:[TB('memory',['0–127','128–191','192–255','256–383','384–511','512–1023'],[['A','B (64)','free 64','C (128)','free 128','free 512']],{1:'new',3:'new'})], g:[G('Buddy system',['B 35 KB','split free 128 → 64 + 64'],['C 80 KB','no free 128 → split 256 → 128 + 128'])],
 say:`B (35 KB → 64) splits the free 128 into two 64s and takes one. C (80 KB → 128) finds no free 128 left, so the free 256 is split and C takes the first half. Every block's size and position are determined by the splitting, so free lists per size (64, 128, 256, …) make allocation O(log n).`},
{th:[['A','TERM:dim','freed'],['B','RUN:ok',''],['C','RUN:ok',''],['D','RUN:ok','60 KB → 64']], tb:[TB('memory',['0–127','128–191','192–255','256–383','384–511','512–1023'],[['free 128','B','D (64)','C','free 128','free 512']],{0:'hot',2:'new'})], g:[G('Buddy system',['free A','its buddy (128–255) is split and in use → no merge'],['D 60 KB','takes the free 64 at 192'])],
 say:`A is freed. Its buddy is the block at 128–255, which is currently split (B and a free 64), so no merge yet. Then D asks for 60 KB and takes the free 64 at 192.`},
{th:[['B','TERM:dim','freed'],['C','RUN:ok',''],['D','TERM:dim','freed']], tb:[TB('memory',['0–255','256–383','384–511','512–1023'],[['free 256 (merged)','C','free 128','free 512']],{0:'ok'})], g:[G('Buddy system',['free B','buddy D in use → no merge'],['free D','buddy (B) free → 128; its buddy (old A) free → 256','ok'],['finding buddies','address XOR size: e.g. 192 XOR 64 = 128'])], log:['merge 128+192 → 128 KB at 128','merge 0+128 → 256 KB at 0'],
 say:`B is freed, but its buddy D is still allocated. When D is freed, D and B merge into a 128 at 128; that block's buddy (A's old 128 at 0) is free too, so they merge into a 256. <b>Coalescing</b> is cheap because a block's buddy address is just its address XOR its size.`},
{th:[['C','TERM:dim','freed']], tb:[TB('memory',['0–1023'],[['free 1024 (fully coalesced)']],{0:'ok'})], g:[G('Buddy system',['free C','merges with 384 → 256, with 0 → 512, with 512 → 1024','ok'],['pros','fast split/merge, contiguous physical pages','ok'],['cons','internal fragmentation (up to ~50%)','bad'])],
 say:`Freeing C triggers a cascade: C + free 128 → 256, + free 256 → 512, + free 512 → 1024. Memory is whole again. Linux's page allocator is a buddy system over 4 KB pages (orders 0–10, i.e. 4 KB to 4 MB); <code>/proc/buddyinfo</code> shows free blocks per order.`},
{hl:{slab:[7,8,9,10]}, th:[], tb:[TB('slab cache "task_struct"',['slab (pages from buddy)','objects'],[['slab 1','■ ■ ■ □ □  (3 used, 2 free)'],['slab 2','□ □ □ □ □  (empty)']])], g:[G('Slab allocator',['what','per-type caches of pre-sized, pre-initialised objects'],['why','kernel allocates the same small structs constantly','ok'],['benefits','no internal waste from rounding, fast, cache-friendly','ok'],['Linux','SLUB; see /proc/slabinfo, slabtop'])],
 say:`For small objects the buddy system wastes too much (a 200-byte struct would take a 4 KB page). The <b>slab allocator</b> keeps a cache per object type (process descriptors, inodes, dentries…). Each cache owns slabs (pages from the buddy allocator) carved into exact-size slots. Freed objects stay in their slab, often still initialised, ready for the next allocation.`},
{g:[G('Remember',['buddy','power-of-2 blocks; split on alloc, merge buddies on free'],['buddy addr','addr XOR size'],['slab','per-type object caches on top of buddy pages'],['user space','malloc arenas/size classes use similar ideas'])],
 say:`<b>Say it:</b> "The buddy system allocates physically contiguous memory in power-of-two blocks: a request is rounded up and larger blocks are split in halves until one fits; on free, a block merges with its buddy if that's free, recursively. It's fast and limits external fragmentation but wastes up to half a block internally. The slab allocator sits on top, keeping per-type caches of pre-sized kernel objects carved out of pages, which removes that waste and makes frequent small allocations fast."`}
],
keep:[`Buddy: round up to 2^k; split halves to fit; merge free buddies.`,`Buddy address = address XOR block size.`,`Fast, contiguous, but internal fragmentation (≤ 50%).`,`Slab: per-object-type caches carved from pages.`,`Linux: buddy page allocator + SLUB.`]}, {
  imp: 'extra',
  theory: TH(`The kernel allocates physical memory with a buddy system of power-of-two blocks that split and merge cheaply, and layers slab caches on top for frequently used small objects.`,
`<p>A cake is cut in half, then a half in half, and so on, until a piece is the right size; when two neighbouring pieces cut from the same half come back, they're glued together again. That's the buddy system. The slab allocator is a muffin tray: for an object you make all the time, keep trays of exactly-sized cups so there's no cutting at all.</p>
<p>The kernel needs this because many devices and structures require physically contiguous memory and allocations must be very fast (sometimes in interrupt context).</p>`,
[[`Buddy system`,`Allocator using power-of-two blocks with split/merge.`],[`Order`,`Block size 2^order pages (Linux).`],[`Buddy`,`The other half of the block a block was split from.`],[`Coalescing`,`Merging free buddies into a larger block.`],[`Slab allocator`,`Object caches carved from pages (Bonwick, Solaris).`],[`SLUB`,`Linux's default slab implementation.`],[`kmalloc`,`General kernel allocation, served by size-class slab caches.`]],
[`Round the request up to 2^k.`,`If a free 2^k block exists, take it; else split the smallest larger free block repeatedly.`,`On free, compute the buddy's address (addr XOR size).`,`If the buddy is free and the same size, merge and repeat at the next size.`,`Slab: per-type caches take whole pages from the buddy allocator and hand out fixed-size objects.`],
[`/proc/buddyinfo shows fragmentation of free pages by order; high-order allocations can fail on fragmented systems.`,`slabtop shows which kernel object caches use memory (dentry, inode caches after big file scans).`,`User-space allocators (jemalloc, tcmalloc) use size classes, a similar idea.`],
[`Forgetting the rounding waste in the buddy system.`,`Merging non-buddy neighbours (only true buddies merge).`,`Confusing slab caches with the page cache.`])
  ,
  examples: [
    {lv:'basic', title:'Rounding up in the buddy system', code:`request   block   wasted
 70 KB    128 KB   58 KB
 35 KB     64 KB   29 KB
 80 KB    128 KB   48 KB
 129 KB   256 KB  127 KB     ← just over a power of two: nearly half wasted`, why:`Internal fragmentation is the buddy system's price for fast splitting and merging.`},
    {lv:'mid', title:'Finding a buddy with XOR', code:`block at 192 KB, size 64 KB:   192 XOR 64  = 128   → buddy at 128
block at 128 KB, size 128 KB:  128 XOR 128 = 0     → buddy at 0
block at 384 KB, size 128 KB:  384 XOR 128 = 256   → buddy at 256`, why:`Because blocks are aligned to their size, flipping the bit for that size gives the buddy's address. No search needed.`},
    {lv:'adv', title:'Inspecting the kernel allocators', code:`$ cat /proc/buddyinfo
Node 0, zone   Normal   1203   854   402   180    60    21     9     3     1     0     0
#                       4K     8K    16K   32K   64K   128K  256K  512K  1M    2M    4M  (free blocks per order)
$ sudo slabtop -o | head -5
  OBJS ACTIVE  USE OBJ SIZE  SLABS OBJ/SLAB CACHE SIZE NAME
 912340 911002  99%    0.19K  43445       21    173780K dentry
 401230 400120  99%    1.06K  13374       30    427968K ext4_inode_cache`, why:`Few free high-order blocks means large contiguous allocations may fail (the kernel then compacts memory). slabtop reveals which object types dominate kernel memory.`},
  ],
  tips: {
    say:`"The buddy system allocates contiguous physical memory in power-of-two blocks. A request is rounded up; larger free blocks are split in halves until one fits, and on free a block merges with its buddy, found by XORing its address with its size, if the buddy is free, recursively. It's fast and keeps memory contiguous but wastes up to half a block. The slab allocator caches fixed-size objects of each kernel type on top of buddy pages, avoiding that waste and initialisation cost."`,
    points:[`Split and merge mechanics.`,`XOR trick for buddies.`,`Why slabs exist on top.`],
    traps:[`Saying buddies are any adjacent free blocks.`,`Forgetting internal fragmentation.`],
    qa:[[`Why does the kernel need physically contiguous memory?`,`DMA devices often need contiguous buffers, huge pages need contiguous frames, and some structures are accessed without page tables.`],
        [`What problem does the slab allocator solve?`,`Small objects allocated and freed constantly: rounding to pages wastes space and initialisation costs time. Slabs give exact-size, pre-initialised, cache-aligned objects.`],
        [`What happens when high-order allocations fail?`,`The kernel tries direct compaction (migrating movable pages), reclaim, or falls back to smaller orders; fragmentation shows in /proc/buddyinfo.`]]
  },
  exercises: [
    {lv:'E', q:`In a buddy system, what block size (KB) serves a 33 KB request?`, ans:'64', hint:`Next power of two.`, answer:`<p>64 KB.</p>`},
    {lv:'M', q:`A 32 KB block starts at address 96 KB. At what address (KB) is its buddy?`, ans:'64', hint:`96 XOR 32.`, answer:`<p>96 XOR 32 = 64 → buddy at 64 KB.</p>`},
    {lv:'H', q:`Starting from a free 256 KB block, requests of 20, 50 and 30 KB arrive. How much internal fragmentation (KB) is there in total?`, ans:'28', hint:`Round each to a power of two.`, answer:`<p>20 → 32 (12 wasted), 50 → 64 (14 wasted), 30 → 32 (2 wasted): 28 KB in total.</p>`},
  ],
  quiz: [
    [`Buddy system block sizes are…`,[`Arbitrary`,`Powers of two`,`Always 4 KB`,`Prime numbers`],1,`Easy split/merge.`,'E'],
    [`When a block is freed, it merges with its buddy if…`,[`Any neighbour is free`,`Its buddy (same size, split from the same parent) is free`,`Memory is low`,`Never`],1,`Only true buddies.`,'E'],
    [`The buddy system's main drawback is…`,[`Slow merging`,`Internal fragmentation from rounding up`,`No contiguity`,`External fragmentation only`],1,`Up to ~50%.`,'E'],
    [`The slab allocator provides…`,[`Disk caching`,`Caches of fixed-size kernel objects`,`Page replacement`,`Swap`],1,`Per-type caches.`,'M'],
    [`A buddy's address can be computed by…`,[`Searching a list`,`address XOR block size`,`address + 1`,`A hash table`],1,`Alignment trick.`,'M'],
    [`Linux shows free buddy blocks per order in…`,[`/proc/meminfo`,`/proc/buddyinfo`,`/proc/slabinfo`,`/proc/swaps`],1,`slabinfo is for slabs.`,'M'],
  ],
  quizAdv: [
    [`Linux's default slab implementation is…`,[`SLOB`,`SLUB`,`SLAB2`,`jemalloc`],1,`Since 2.6.23.`,'H'],
    [`Linux page orders typically range from 0 to…`,[`3`,`10 (4 MB blocks)`,`32`,`64`],1,`MAX_ORDER.`,'H'],
    [`kmalloc(200) is usually served by…`,[`The buddy allocator directly (one page)`,`A kmalloc-256 slab cache`,`vmalloc`,`The page cache`],1,`Size-class caches.`,'H'],
  ],
});
