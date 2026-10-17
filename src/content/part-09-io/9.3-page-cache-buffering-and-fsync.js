/* 9.3 Page cache, buffering and fsync */
topic('9', { no:'9.3', title:'Buffering, the page cache and fsync',
idea:`When <code>write()</code> returns, your data is probably not on disk. Follow bytes through three layers of buffering, the stdio buffer in your process, the kernel page cache, and the drive's own cache, see a second read served from RAM, and learn exactly what <code>fflush</code>, <code>fsync</code> and <code>O_DIRECT</code> guarantee.`,
actors:'Layers', dgTitle:'Where the bytes are', stateTitle:'Durability',
nodes:{
  app:{x:80,y:40,label:'stdio buffer\n(your process)',w:140,h:46,kind:'mem'},
  pc:{x:250,y:40,label:'page cache\n(kernel RAM)',w:140,h:46,kind:'mem'},
  dc:{x:420,y:40,label:'drive cache',w:120,h:46,kind:'mem'},
  disk:{x:420,y:160,label:'persistent media',w:140,h:46,kind:'db'}
},
edges:[['app','pc','write()'],['pc','dc','writeback'],['dc','disk','flush']],
vb:'0 0 500 210',
codes:{a:`FILE *f = fopen("orders.log", "a");
fprintf(f, "order 42\\n");   // 1. into libc's buffer (no syscall yet)
fflush(f);                    // 2. write(): copied into the kernel page cache (dirty page)
fsync(fileno(f));             // 3. kernel writes dirty pages + asks the drive to flush its cache
// only now is "order 42" durable across a power cut

// reads: the page cache serves repeated reads from RAM
read(fd, buf, 4096);          // first time: disk → page cache → buf
read(fd, buf, 4096);          // again: page cache → buf (no disk I/O)
// O_DIRECT: bypass the page cache (databases with their own buffer pool)`},
steps:[
{hl:{c:[1,2]}, d:{on:['app'], e:[]}, g:[G('Durability',['data in','your process\'s memory only'],['survives','nothing: a crash of the process loses it','bad'],['why buffer','one write() per 4 KB instead of per line','ok'])],
 say:`<code>fprintf</code> doesn't even make a system call: the C library appends the text to a <b>user-space buffer</b> (typically 4 KB, flushed when full, on newline for terminals, or at exit). Buffering turns thousands of tiny writes into a few big ones. But if the process crashes now, the line is simply gone.`},
{hl:{c:[3]}, d:{on:['pc'], e:[['app','pc','write()','hot']]}, g:[G('Durability',['data in','kernel page cache, page marked dirty','hot'],['survives','process crash ✓','ok'],['lost on','power failure / kernel crash','bad'],['write() returned','after a memory copy, in microseconds'])], log:['write(3, "order 42\\n", 9) = 9'],
 say:`<code>fflush</code> calls <code>write()</code>, which copies the bytes into the kernel's <b>page cache</b> and marks the page <b>dirty</b>, then returns. That's why writes look so fast: they're memory copies. The data now survives a crash of your process (the kernel has it), but not a power cut. The kernel writes dirty pages back to disk later, typically within ~30 s.`},
{hl:{c:[4,5]}, d:{on:['dc','disk'], e:[['app','pc','','ok'],['pc','dc','writeback','hot'],['dc','disk','cache flush','hot']]}, g:[G('Durability',['fsync','write this file\'s dirty pages + metadata, then flush the drive cache','hot'],['returns','only when the data is on persistent media','ok'],['cost','~0.1–10 ms','bad'])], log:['fsync(3) → I/O + FLUSH → 0'],
 say:`<code>fsync</code> forces the file's dirty pages (and needed metadata) to the device and then tells the drive to flush its own volatile cache. Only when it returns is the data <b>durable</b>. It's slow (milliseconds on a disk, tens to hundreds of microseconds on a good SSD), which is why databases batch many commits into one fsync ("group commit").`},
{hl:{c:[8,9]}, d:{on:['pc','app'], e:[['disk','pc','first read','ok'],['pc','app','copy','hot']]}, g:[G('Durability',['first read','disk → page cache → buf (ms)'],['second read','page cache → buf (µs)','ok'],['free memory','Linux uses spare RAM as page cache: "buff/cache" in free -h','ok'])],
 say:`Reads benefit too. The first <code>read</code> brings the page from disk into the page cache; the second is served straight from RAM. Linux happily uses all otherwise-free memory for the page cache (the "buff/cache" column in <code>free</code>) and gives it back instantly when programs need memory. Readahead also prefetches the next pages of sequentially read files.`},
{hl:{c:[10]}, d:{on:['dc'], e:[['app','dc','O_DIRECT (bypass)','hot']]}, g:[G('Durability',['O_DIRECT','DMA straight between your buffer and the device; no page cache'],['who uses it','databases with their own buffer pool (avoid double caching)'],['still need','fsync / O_DSYNC for durability'])],
 say:`<code>O_DIRECT</code> bypasses the page cache entirely: data moves by DMA between your (aligned) buffer and the device. Databases like PostgreSQL (optionally), MySQL InnoDB and Oracle use it because they keep their own cache and don't want every page cached twice. It's about caching, not durability: you still need fsync or O_DSYNC.`},
{d:null, g:[G('Remember',['fflush','user buffer → kernel (survives process crash)'],['fsync','kernel → stable storage (survives power loss)','ok'],['fdatasync','like fsync but skips non-essential metadata (mtime)'],['O_SYNC / O_DSYNC','every write behaves as if followed by fsync / fdatasync'],['danger','close() does NOT imply fsync','bad'])],
 say:`<b>Say it:</b> "Writes pass through several buffers: the C library's user-space buffer, flushed with fflush into the kernel; the page cache, where write() just marks pages dirty and returns; and the device's cache. Data is durable only after fsync, which writes the dirty pages and flushes the device cache. The page cache also serves repeated reads from RAM and uses free memory. Databases may use O_DIRECT to bypass it and still fsync their logs, batching commits to amortise the cost."`}
],
keep:[`stdio buffer (fflush) → page cache (write) → drive cache → media (fsync).`,`write() returning ≠ durable. close() ≠ fsync.`,`fsync is slow (ms): batch it (group commit).`,`Page cache serves re-reads from RAM; uses free memory.`,`O_DIRECT bypasses the page cache; still need fsync for durability.`]}, {
  imp: 'good',
  theory: TH(`File data is buffered in user space and in the kernel's page cache to make I/O fast; it becomes durable only when explicitly flushed with fsync (or a sync flag).`,
`<p>Writing a letter: jotting notes on a pad at your desk (stdio buffer), putting the finished letter in your office out-tray (page cache: safe from you losing it, but not yet sent), the post office's sorting room (drive cache), and finally delivered (on disk). Only a signed delivery receipt (fsync returning) proves it arrived.</p>
<p>Most "I lost data after a crash" bugs come from assuming an earlier stage is the last one.</p>`,
[[`User-space buffer`,`stdio/BufferedWriter buffer inside the process.`],[`Page cache`,`Kernel RAM cache of file pages.`],[`Dirty page`,`Cached page modified but not yet written back.`],[`Writeback`,`Kernel flushing dirty pages to disk in the background.`],[`fsync / fdatasync`,`Force a file's data (and metadata) to stable storage.`],[`O_DIRECT`,`Bypass the page cache.`],[`Readahead`,`Prefetching sequential file pages.`],[`Group commit`,`One fsync covering many transactions.`]],
[`Library buffers small writes; fflush (or full buffer) calls write().`,`write() copies into page-cache pages and marks them dirty.`,`Background writeback flushes dirty pages after a delay or under memory pressure.`,`fsync writes the file's dirty pages and metadata and issues a device cache flush.`,`Reads check the page cache first; misses read from disk (with readahead).`],
[`Databases fsync their WAL on commit; Kafka relies on replication and page-cache writeback instead.`,`"free -h" showing little free memory is normal: most is reclaimable cache.`,`vm.dirty_ratio / dirty_background_ratio tune writeback.`],
[`Assuming close() or write() means the data is on disk.`,`Calling fsync per tiny write (very slow).`,`Ignoring fsync errors (data may be lost and the error not reported again).`])
  ,
  examples: [
    {lv:'basic', title:'Buffered output and crashes', code:`printf("step 1 done");      // no newline: sits in stdout's buffer
abort();                       // crash: buffer never flushed → message lost
// with "\\n" on a terminal (line-buffered) or fflush(stdout), it would have appeared`, why:`Debug prints that "never happened" before a crash are often just unflushed buffers. stderr is unbuffered for this reason.`},
    {lv:'mid', title:'The page cache at work', code:`$ echo 3 | sudo tee /proc/sys/vm/drop_caches     # empty the page cache (testing only)
$ time cat big.iso > /dev/null
real    0m4.10s           # from disk
$ time cat big.iso > /dev/null
real    0m0.38s           # from the page cache
$ free -h
       total  used  free  shared  buff/cache  available
Mem:    31Gi  6.2Gi 1.1Gi  0.4Gi      24Gi       24Gi`, why:`The second read is 10× faster. "available" counts reclaimable cache: the machine isn't out of memory.`},
    {lv:'adv', title:'Group commit amortises fsync', code:`fsync latency on this SSD: 0.5 ms
one fsync per transaction:            max ≈ 2,000 commits/s per log
batch commits arriving within 1 ms:   one fsync for ~20 transactions
                                      ≈ 40,000 commits/s, +1 ms latency each`, why:`Durable throughput is bounded by fsync rate; batching trades a little latency for much higher throughput (PostgreSQL commit_delay, MySQL binlog group commit).`},
  ],
  tips: {
    say:`"Data you write first sits in a user-space buffer, which fflush moves into the kernel. write() copies it into the page cache and returns; the kernel writes dirty pages back later. Only fsync guarantees durability: it writes the file's dirty pages and metadata and flushes the drive's cache. The page cache also speeds up repeated reads and uses free memory. Databases fsync their write-ahead log on commit, batching commits to amortise the cost, and may use O_DIRECT to avoid double caching."`,
    points:[`The three layers and what each flush call does.`,`Durability only after fsync.`,`Page cache for reads; O_DIRECT; group commit.`],
    traps:[`Saying write() makes data durable.`,`Saying close() flushes to disk.`],
    qa:[[`fsync vs fdatasync?`,`fdatasync skips metadata that isn't needed to read the data back (like mtime), saving a write; size changes are still flushed.`],
        [`What happens if fsync fails?`,`Data may be lost; on Linux the dirty pages may be marked clean anyway, so retrying fsync can falsely succeed. PostgreSQL treats fsync failure as fatal ("fsyncgate", 2018).`],
        [`Why does Linux show so little free memory?`,`It uses spare RAM as page cache; that memory is reclaimable and counted in "available".`]]
  },
  exercises: [
    {lv:'E', q:`Which call guarantees file data has reached stable storage: fflush, write, close or fsync?`, ans:'fsync', hint:`The one that waits for the device.`, answer:`<p>fsync (or fdatasync).</p>`},
    {lv:'M', q:`fsync takes 2 ms. A database fsyncs once per commit, sequentially. Maximum commits per second?`, ans:'500', hint:`1 / 0.002.`, answer:`<p>500 commits/s.</p>`},
    {lv:'H', q:`Same 2 ms fsync, but commits are grouped so each fsync covers 25 transactions. Maximum commits per second?`, ans:'12500', hint:`500 fsyncs/s × 25.`, answer:`<p>12,500 commits/s.</p>`},
  ],
  quiz: [
    [`When write() returns, the data is typically…`,[`On disk`,`In the kernel page cache`,`Still in your stdio buffer`,`Lost`],1,`Dirty page.`,'E'],
    [`fflush() moves data…`,[`From the page cache to disk`,`From the user-space buffer into the kernel`,`To the network`,`Nowhere`],1,`Calls write().`,'E'],
    [`To make data survive a power failure, call…`,[`close()`,`fsync()`,`fflush()`,`free()`],1,`Durability.`,'E'],
    [`The page cache…`,[`Only caches writes`,`Caches file pages in RAM for reads and writes`,`Is on disk`,`Is per process`],1,`Shared kernel cache.`,'M'],
    [`O_DIRECT…`,[`Guarantees durability`,`Bypasses the page cache`,`Speeds up all I/O`,`Is a scheduler`],1,`Still need fsync.`,'M'],
    [`Group commit improves…`,[`Latency of each commit`,`Durable commit throughput`,`Read performance`,`Memory use`],1,`One fsync, many transactions.`,'M'],
  ],
  quizAdv: [
    [`fdatasync differs from fsync by…`,[`Not writing data`,`Skipping non-essential metadata like mtime`,`Being asynchronous`,`Flushing all files`],1,`Fewer writes.`,'H'],
    [`"fsyncgate" (2018) showed that on Linux…`,[`fsync was too slow`,`After a failed fsync, retrying could falsely succeed because pages were marked clean`,`fsync didn't exist`,`ext4 ignored fsync`],1,`Treat fsync failure as fatal.`,'H'],
    [`Linux "available" memory in free -h includes…`,[`Only free pages`,`Free pages plus reclaimable page cache`,`Swap`,`Kernel stacks`],1,`Cache can be dropped.`,'H'],
  ],
});
