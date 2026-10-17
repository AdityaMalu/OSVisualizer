/* 7.5 Copy-on-write and memory-mapped files */
topic('7', { no:'7.5', title:'Copy-on-write fork and memory-mapped files',
idea:`Two tricks that make Unix fast. Copy-on-write lets <code>fork</code> share all pages read-only and copy a page only when someone writes to it. <code>mmap</code> maps a file into memory so reading it is just touching pages. Watch a write fault split a shared page, then read a file through page faults.`,
actors:'Processes', tbTitle:'Page tables', stateTitle:'Physical frames',
codes:{a:`int counter = 0;                 // on page P
pid_t pid = fork();              // child shares ALL frames, marked read-only
if (pid == 0) {
    counter++;                   // write → protection fault → kernel copies page P
} else {
    printf("%d\\n", counter);    // parent still sees 0 (its own frame)
}

// memory-mapped file: file pages appear in the address space
int fd = open("data.bin", O_RDONLY);
char *p = mmap(NULL, size, PROT_READ, MAP_PRIVATE, fd, 0);
char c = p[8192];                // page fault → read page 2 of the file (via the page cache)`},
steps:[
{hl:{par:[1,2]}, th:[['parent','RUN:ok','after fork'],['child','READY:info','new']], tb:[TB('page tables',['page','parent → frame','child → frame','writable?'],[['code','F1','F1','no'],['P (counter)','F7','F7','no (COW)'],['stack','F9','F9','no (COW)']],{1:'hot',2:'hot'})], g:[G('Physical frames',['F7 references','2','hot'],['copied at fork','nothing: only page tables','ok'])],
 say:`<code>fork</code> doesn't copy the parent's memory. It copies the page tables and points the child's entries at the <b>same frames</b>, marking every private writable page <b>read-only</b> in both and flagging it copy-on-write. Fork is fast even for a 10 GB process, and if the child immediately calls <code>exec</code>, nothing is ever copied.`},
{hl:{ch:[4]}, th:[['parent','READY:info',''],['child','RUN:warn','write fault on page P']], tb:[TB('page tables',['page','parent → frame','child → frame','writable?'],[['P (counter)','F7','F7','no → fault!']],{0:'bad'})], g:[G('Physical frames',['child writes counter','PTE read-only → protection fault','bad'],['kernel sees','COW page with 2 references'])], log:['child: write to read-only COW page → fault'],
 say:`The child executes <code>counter++</code>. The PTE says read-only, so the MMU raises a <b>protection fault</b>. The kernel recognises a copy-on-write page that is shared by two processes: this isn't an error, it's the signal to copy.`},
{hl:{ch:[4], par:[6]}, th:[['parent','RUN:ok','prints 0'],['child','RUN:ok','counter = 1 in its copy']], tb:[TB('page tables',['page','parent → frame','child → frame','writable?'],[['code','F1','F1','no'],['P (counter)','F7','F12 (new copy)','yes / yes'],['stack','F9','F9','no (COW)']],{1:'ok'})], g:[G('Physical frames',['F7','parent only'],['F12','child\'s private copy','ok'],['still shared','code, stack (until written)'])], log:['kernel copies F7 → F12, child PTE → F12 writable, restart','parent prints 0'],
 say:`The kernel allocates a new frame F12, copies page P into it, points the child's PTE at F12 as writable, and restarts the instruction. The parent's page is now its own (and can be made writable again). Only the <b>one page</b> that was written was copied. The parent prints 0: the processes are fully isolated.`},
{hl:{mm:[10,11]}, th:[['reader','RUN:ok','mapped data.bin']], tb:[TB('page tables (reader)',['page of mapping','frame','present'],[['0 (file bytes 0–4095)','—','0'],['1','—','0'],['2','—','0']])], g:[G('Physical frames',['mmap cost','just creates a VMA: no I/O yet','ok'])],
 say:`Now <code>mmap</code> a file. The kernel creates a region whose pages are backed by the file, but reads nothing yet: every PTE is non-present. The file's bytes simply <i>appear</i> at address <code>p</code>.`},
{hl:{mm:[12]}, th:[['reader','RUN:ok','p[8192] = file byte 8192']], tb:[TB('page tables (reader)',['page of mapping','frame','present'],[['0','—','0'],['1','—','0'],['2','F30 (page cache)','1']],{2:'new'})], g:[G('Physical frames',['F30','the page cache page for file offset 8192','hot'],['no copy','the process maps the page-cache frame directly','ok'],['other processes','mapping the same file share F30','ok'])], log:['page fault in mapping → read file page 2 into page cache → map it'],
 say:`Reading <code>p[8192]</code> faults on page 2; the kernel reads that page of the file into the <b>page cache</b> (or finds it already there) and maps that very frame. No <code>read()</code> call and no copy into a user buffer. Other processes mapping the same file share the frame: this is how shared libraries are loaded.`},
{tb:[], th:[], g:[G('Uses',['COW','fork, snapshotting (Redis BGSAVE), VM cloning'],['mmap','loading executables & libraries, databases (LMDB), big read-only data'],['MAP_SHARED','writes go to the file, visible to others'],['MAP_PRIVATE','writes are COW copies, never reach the file']),G('Gotchas',['COW after fork in a write-heavy parent','memory can nearly double (Redis BGSAVE)','bad'],['mmap I/O errors','arrive as SIGBUS, not error codes','bad'])],
 say:`<b>Say it:</b> "Copy-on-write makes fork cheap: parent and child share all frames marked read-only, and the first write to a page causes a fault where the kernel copies just that page and makes it writable. mmap maps a file's pages into the address space; accesses fault the pages in from the page cache on demand, with no explicit read calls or extra copies, and processes mapping the same file share frames. MAP_SHARED writes reach the file; MAP_PRIVATE writes are copy-on-write."`}
],
keep:[`COW fork: share frames read-only; copy a page only on first write.`,`fork + exec copies almost nothing.`,`mmap: file pages fault in on access, straight from the page cache.`,`MAP_SHARED → writes hit the file; MAP_PRIVATE → COW copy.`,`Shared libraries = many processes mapping the same frames.`]}, {
  imp: 'good',
  theory: TH(`Copy-on-write defers copying shared pages until one sharer writes, and memory-mapped files turn file I/O into page faults on the page cache; both rely on the MMU's protection bits.`,
`<p>Two students share a printed handout. Instead of photocopying it for each up front, they share one copy; the moment one wants to scribble on a page, that single page is photocopied for them. That's copy-on-write. A memory-mapped file is a book whose pages are fetched from the library only when you turn to them, and two readers of the same book look at the same physical copy.</p>
<p>Both show the power of page faults: by deliberately making pages non-present or read-only, the kernel gets a chance to do work lazily, exactly when needed.</p>`,
[[`Copy-on-write (COW)`,`Share pages read-only; copy on first write.`],[`Protection fault`,`Access violating PTE permissions (e.g. write to read-only).`],[`mmap`,`Map a file or anonymous memory into the address space.`],[`Page cache`,`Kernel cache of file pages, shared by read() and mmap.`],[`MAP_SHARED / MAP_PRIVATE`,`Writes visible in the file / private COW.`],[`msync`,`Flush a shared mapping's dirty pages to the file.`],[`vfork`,`Older fork variant sharing memory outright until exec.`]],
[`fork: duplicate page tables; mark private writable pages read-only + COW in both.`,`On a write fault to a COW page: if others share it, copy it to a new frame; map writable; restart.`,`mmap: create a VMA backed by the file; PTEs start non-present.`,`On access: page fault → look up/read the page in the page cache → map it.`,`Dirty shared pages are written back by the kernel (or msync).`],
[`Redis BGSAVE forks and relies on COW to snapshot data while the parent keeps serving.`,`Databases like LMDB and MongoDB's old MMAPv1 engine use mmap.`,`Java's MappedByteBuffer and Python's mmap module expose the same mechanism.`],
[`Assuming fork doubles memory immediately.`,`Write-heavy parents after fork causing memory spikes.`,`Ignoring SIGBUS when a mapped file is truncated or the disk fails.`])
  ,
  examples: [
    {lv:'basic', title:'COW keeps parent and child separate', code:`int counter = 0;
int main(void) {
    if (fork() == 0) { counter++; printf("child  %d\\n", counter); return 0; }
    wait(NULL);
    printf("parent %d\\n", counter);
}`, out:`child  1
parent 0`, why:`Only the page holding <code>counter</code> was copied, at the moment the child wrote it.`},
    {lv:'mid', title:'Read a file with mmap', code:`int fd = open("words.txt", O_RDONLY);
struct stat st; fstat(fd, &st);
char *p = mmap(NULL, st.st_size, PROT_READ, MAP_PRIVATE, fd, 0);
long lines = 0;
for (off_t i = 0; i < st.st_size; i++) lines += p[i] == '\\n';   // pages fault in as we go
printf("%ld lines\\n", lines);
munmap(p, st.st_size);`, why:`No read() calls and no buffer management: the loop just walks memory. The kernel's readahead fetches upcoming pages ahead of the faults.`},
    {lv:'adv', title:'COW memory growth during a snapshot', code:`# Redis with a 20 GB dataset runs BGSAVE (fork + write snapshot in the child)
$ redis-cli INFO persistence | grep cow
rdb_last_cow_size:6442450944        # 6 GB of pages were copied during the save
# the parent kept handling writes; every first write to a page copied it
# with Transparent Huge Pages, one write copies 2 MB instead of 4 KB → disable THP`, why:`COW is free only while nobody writes. A write-heavy parent during a long snapshot can copy a large fraction of memory.`},
  ],
  tips: {
    say:`"Copy-on-write makes fork cheap: the child gets a copy of the page tables pointing at the same frames, all marked read-only. When either process writes, the protection fault lets the kernel copy just that page and make it writable, so if the child execs immediately almost nothing is copied. mmap maps a file into the address space; pages are faulted in from the page cache when touched, avoiding read calls and extra copies, and processes mapping the same file share the physical pages."`,
    points:[`COW fault mechanics.`,`Why fork + exec is cheap.`,`mmap via page cache, shared vs private.`],
    traps:[`Saying fork copies all memory.`,`Saying mmap reads the whole file up front.`],
    qa:[[`When is mmap better than read()?`,`Random access to large files, data shared between processes, or avoiding copies for read-mostly data. For simple sequential streaming, read() with a buffer is often as fast and handles errors more simply.`],
        [`What happens if two processes MAP_SHARED the same file and one writes?`,`They share the page-cache frame, so the other sees the change immediately; the kernel writes it back to the file later (or on msync).`],
        [`Why can COW cause memory spikes?`,`Each first write to a shared page allocates a new frame; a write-heavy process after fork gradually duplicates its memory.`]]
  },
  exercises: [
    {lv:'E', q:`After fork with COW, the child writes to one 4 KB page of a 1 GB heap. How many KB are copied?`, ans:'4', hint:`Only the written page.`, answer:`<p>4 KB.</p>`},
    {lv:'M', q:`A process mmaps a 100 MB file and reads only bytes 0–9999. With 4 KB pages, how many pages are read from disk (ignoring readahead)?`, ans:'3', hint:`Bytes 0–9999 span pages 0, 1, 2.`, answer:`<p>10,000 / 4096 → pages 0, 1, 2: 3 pages.</p>`},
    {lv:'H', q:`A 10 GB process forks a snapshot child. During the snapshot the parent writes to 25% of its pages (each once). Roughly how many GB of extra memory are used at the peak?`, ans:'2.5', hint:`Each written page is copied once.`, answer:`<p>25% of 10 GB = 2.5 GB of copied pages (more with huge pages).</p>`},
  ],
  quiz: [
    [`With copy-on-write, fork…`,[`Copies all memory`,`Shares frames read-only and copies a page on first write`,`Shares memory writable`,`Swaps memory out`],1,`Lazy copying.`,'E'],
    [`A write to a COW page causes…`,[`A segfault`,`A protection fault the kernel handles by copying the page`,`Nothing`,`A TLB hit`],1,`Then restart.`,'E'],
    [`mmap'd file pages are loaded…`,[`All at mmap time`,`On demand via page faults`,`Never`,`Only with read()`],1,`Lazy.`,'E'],
    [`MAP_SHARED writes…`,[`Are private`,`Go to the file and are visible to other mappers`,`Are discarded`,`Need root`],1,`Shared page cache.`,'M'],
    [`Why is fork + exec cheap with COW?`,[`exec is fast`,`Almost no pages are copied before exec replaces the address space`,`The kernel skips fork`,`Pages are compressed`],1,`Nothing written in between.`,'M'],
    [`Shared libraries use little extra RAM per process because…`,[`They're small`,`Their pages are mapped from the same page-cache frames`,`They're on disk`,`They're compressed`],1,`One copy.`,'M'],
  ],
  quizAdv: [
    [`An I/O error while reading an mmap'd page is reported as…`,[`EIO from read()`,`SIGBUS`,`A return code from mmap`,`Silent corruption`],1,`No syscall to return an error.`,'H'],
    [`Redis BGSAVE memory spikes are made worse by…`,[`Swap`,`Transparent huge pages (2 MB copied per write)`,`Small pages`,`SSDs`],1,`Disable THP.`,'H'],
    [`vfork differs from COW fork because…`,[`It copies everything`,`The child borrows the parent's memory outright and the parent is suspended until exec/exit`,`It's slower`,`It uses threads`],1,`Even cheaper, more dangerous.`,'H'],
  ],
});
