/* 8.3 File allocation methods */
topic('8', { no:'8.3', title:'File allocation: contiguous, linked (FAT), indexed and extents',
idea:`Where do a file's blocks go on disk? Store the same 5-block file three ways: contiguously, as a linked chain (and its FAT variant), and with an index block like a Unix inode. Then compute how big a file ext2's multi-level pointers can address.`,
actors:'File', tbTitle:'Disk blocks', stateTitle:'Method',
codes:{a:`// contiguous: (start, length)          read block i = start + i
// linked:     each block stores a pointer to the next one
// FAT:        the pointers live in one table:  next = FAT[block]
// indexed:    an index block lists all the file's block numbers

// Unix inode (ext2/3): 12 direct + single + double + triple indirect
//   block 4 KB, pointer 4 B → 1024 pointers per indirect block
max = (12 + 1024 + 1024^2 + 1024^3) × 4 KB  ≈ 4 TB
// ext4: extents = (start, length) runs, up to 128 MB each`},
steps:[
{hl:{m:[1]}, tb:[TB('contiguous',['file','start','length','blocks'],[['notes','14','5','14 15 16 17 18']],{0:'ok'})], g:[G('Method',['contiguous','one run of blocks'],['random access','block i = start + i: instant','ok'],['problem','external fragmentation; files can\'t grow in place','bad'])],
 say:`<b>Contiguous</b> allocation stores the file in consecutive blocks: the directory only needs (start, length). Sequential and random access are both fast (block <i>i</i> is at start + <i>i</i>, minimal seeks). But it's 6.2 again: external fragmentation, and a file can't grow if the next block is taken. Used for CD-ROMs and DVDs, where files never change.`},
{hl:{m:[2]}, tb:[TB('linked',['block','data','next'],[['9','notes part 1','16'],['16','part 2','1'],['1','part 3','10'],['10','part 4','25'],['25','part 5','−1 (end)']],{0:'hot'})], g:[G('Method',['linked','each block points to the next'],['fragmentation','none: any free block works','ok'],['random access','to reach block 4, read 0, 1, 2, 3 first','bad'],['fragility','one bad pointer loses the rest of the file','bad'])],
 say:`<b>Linked</b> allocation chains blocks: each holds a pointer to the next, and the directory holds the first and last. Any free block can be used, so no external fragmentation, and files grow easily. But reaching block <i>i</i> means following <i>i</i> pointers on disk (terrible random access), pointers waste space in every block, and one corrupted pointer loses the rest of the file.`},
{hl:{m:[3]}, tb:[TB('FAT (file allocation table, kept in memory)',['block','FAT entry (next)'],[['1','10'],['9','16'],['10','25'],['16','1'],['25','EOF'],['others','0 = free']],{1:'hot'})], g:[G('Method',['FAT','the "next" pointers moved into one table'],['random access','follow the chain in RAM, then one disk read','ok'],['used by','FAT32, exFAT: USB sticks, SD cards'])],
 say:`<b>FAT</b> moves all the next-pointers into one <b>file allocation table</b> at the start of the disk, cached in memory. Following the chain is now just memory lookups, so random access is cheap-ish, and free blocks are simply entries with 0. FAT32 and exFAT still run on almost every USB stick and SD card.`},
{hl:{m:[4]}, tb:[TB('indexed: index block #19',['entry','block'],[['0','9'],['1','16'],['2','1'],['3','10'],['4','25']],{3:'ok'})], g:[G('Method',['indexed','one index block holds all block numbers'],['random access','block i = index[i]: one extra read at most','ok'],['cost','an index block even for tiny files; large files need more index blocks'])],
 say:`<b>Indexed</b> allocation gives each file an <b>index block</b> listing all its block numbers. Block <i>i</i> is just <code>index[i]</code>: direct random access, no external fragmentation. The question is how to handle files bigger than one index block can describe.`},
{hl:{m:[6,7,8]}, tb:[TB('ext2 inode block pointers (4 KB blocks, 4 B pointers)',['pointer','addresses','max bytes'],[['12 direct','12 blocks','48 KB'],['single indirect','1024 blocks','4 MB'],['double indirect','1024² blocks','4 GB'],['triple indirect','1024³ blocks','4 TB']],{0:'ok',3:'hot'})], g:[G('Method',['small files','direct pointers only: no extra reads','ok'],['large files','1–3 levels of indirection'],['max size','≈ 4 TB'])],
 say:`The Unix inode combines the ideas: <b>12 direct</b> pointers (small files, most files, need nothing else), then a <b>single indirect</b> block of 1024 pointers, a <b>double indirect</b> block (1024 × 1024) and a <b>triple indirect</b> one. With 4 KB blocks that's 48 KB + 4 MB + 4 GB + 4 TB. Small files stay fast, large files pay a few extra reads.`},
{hl:{m:[9]}, tb:[TB('ext4 extents for a 1 GB file',['extent','start block','length'],[['1','1,048,576','32,768 (128 MB)'],['…','…','…'],['8','2,097,152','32,768']])], g:[G('Method',['extent','(start, length) run'],['benefit','a huge contiguous file needs a handful of entries','ok'],['used by','ext4, XFS, NTFS, APFS, Btrfs'])],
 say:`<b>Say it:</b> "Contiguous allocation stores a file in consecutive blocks: fast sequential and random access but external fragmentation and growth problems. Linked allocation chains blocks: no fragmentation but slow random access and fragile; FAT keeps the chain in a table in memory. Indexed allocation keeps block numbers in an index block for direct random access; Unix inodes use 12 direct pointers plus single, double and triple indirect blocks. Modern file systems use extents, runs of contiguous blocks, which combine contiguity with flexibility."`}
],
keep:[`Contiguous: (start, length); fast; external fragmentation.`,`Linked: next pointers; no fragmentation; slow random access, fragile.`,`FAT: linked list moved into a table (in RAM).`,`Indexed/inode: 12 direct + single/double/triple indirect.`,`Extents (ext4, XFS, NTFS): (start, length) runs.`]}, {
  imp: 'good',
  theory: TH(`Allocation methods decide how a file's blocks are located on disk, trading sequential speed, random access, fragmentation and metadata overhead; modern systems use inodes with extents.`,
`<p>Storing a long novel in a library: on one long shelf (contiguous), as chapters scattered with a note at the end of each saying where the next is (linked), with a master map of chapter locations at the front desk (FAT), or with an index card per book listing every chapter's shelf (indexed). Extents are index cards that say "chapters 1–40 are on shelf 7, 41–80 on shelf 12".</p>
<p>The trade-offs mirror memory allocation (6.2, 6.3): contiguity is fast but fragments, indirection is flexible but costs lookups.</p>`,
[[`Contiguous allocation`,`File occupies consecutive blocks.`],[`Linked allocation`,`Each block points to the next.`],[`FAT`,`Table of next-block pointers for the whole volume.`],[`Indexed allocation`,`Index block lists the file's blocks.`],[`Direct / indirect pointers`,`Pointers to data blocks / to blocks of pointers.`],[`Extent`,`Contiguous run described by start and length.`],[`Block size`,`Unit of allocation; affects internal fragmentation and max file size.`]],
[`Contiguous: find a free run big enough; record start and length.`,`Linked/FAT: grab any free block and link it.`,`Indexed: allocate an index block; record data block numbers in it.`,`Inode: fill direct pointers first, then allocate indirect blocks as the file grows.`,`Extents: record runs; merge adjacent allocations into one extent.`],
[`filefrag shows how many extents a file has (fragmentation).`,`Databases preallocate files (fallocate) to get large contiguous extents.`,`FAT32's 4 GB file-size limit comes from its 32-bit size field.`],
[`Mixing up FAT (table in memory) with plain linked allocation.`,`Forgetting direct pointers in max-size calculations.`,`Assuming random access is free for linked files.`])
  ,
  examples: [
    {lv:'basic', title:'Random access cost by method', code:`read block 1000 of a file:
contiguous:  1 disk read                (start + 1000)
linked:      1001 disk reads            (follow the chain)
FAT:         1000 table lookups in RAM + 1 disk read
indexed:     index block (maybe cached) + 1 disk read
ext2 inode:  block 1000 > 12 → single indirect: 1 extra read`, why:`The decisive difference between the methods for databases and random-access workloads.`},
    {lv:'mid', title:'Max file size with a smaller block size', code:`ext2 with 1 KB blocks, 4-byte pointers → 256 pointers per block
direct:           12 × 1 KB          =  12 KB
single indirect:  256 × 1 KB         = 256 KB
double indirect:  256² × 1 KB        =  64 MB
triple indirect:  256³ × 1 KB        =  16 GB
total                                ≈ 16 GB`, why:`Pointers per block = block size / pointer size; each level multiplies by that. Bigger blocks grow the limit fast (4 KB → ~4 TB).`},
    {lv:'adv', title:'Inspect a file\'s extents', code:`$ filefrag -v big.db
 ext:  logical_offset:  physical_offset: length:
   0:        0.. 32767:   1048576..1081343:  32768
   1:    32768.. 65535:   2203648..2236415:  32768
big.db: 2 extents found
$ fallocate -l 10G new.db      # reserve space up front → few, large extents`, why:`An extent is a (logical, physical, length) run. Two extents describe 256 MB of data; a fragmented file might need thousands.`},
  ],
  tips: {
    say:`"Contiguous allocation gives fast sequential and random access but suffers external fragmentation and can't grow files easily. Linked allocation avoids fragmentation but has terrible random access and fragile chains; FAT fixes the access cost by keeping the chain in a table in memory. Indexed allocation stores block numbers in an index block; the Unix inode uses 12 direct pointers plus single, double and triple indirect blocks, so small files are cheap and large files are possible. Modern systems use extents."`,
    points:[`Each method's access cost and fragmentation.`,`Inode pointer arithmetic.`,`Extents as the modern answer.`],
    traps:[`Forgetting the 12 direct pointers.`,`Saying linked allocation has external fragmentation.`],
    qa:[[`Why do inodes have direct pointers at all?`,`Most files are small; direct pointers let them be read with no extra indirection blocks.`],
        [`Why did FAT32 limit files to 4 GB?`,`Its directory entry stores file size in 32 bits.`],
        [`What does an extent buy over block pointers?`,`One entry describes a whole contiguous run, so large files need little metadata and reads stay sequential.`]]
  },
  exercises: [
    {lv:'E', q:`With 4 KB blocks and 12 direct pointers, how many KB can a file hold without any indirect block?`, ans:'48', hint:`12 × 4 KB.`, answer:`<p>48 KB.</p>`},
    {lv:'M', q:`Block size 2 KB, pointers 4 B. How many pointers fit in one indirect block?`, ans:'512', hint:`2048 / 4.`, answer:`<p>512.</p>`},
    {lv:'H', q:`Block 1 KB, 4 B pointers, 12 direct + 1 single indirect + 1 double indirect (no triple). Max file size in KB?`, ans:'65804', hint:`12 + 256 + 256² blocks.`, answer:`<p>(12 + 256 + 65,536) × 1 KB = 65,804 KB ≈ 64.3 MB.</p>`},
  ],
  quiz: [
    [`Contiguous allocation suffers from…`,[`Slow random access`,`External fragmentation`,`Fragile pointers`,`No sequential speed`],1,`Like contiguous memory.`,'E'],
    [`Linked allocation's main weakness is…`,[`External fragmentation`,`Slow random access`,`Huge index blocks`,`No growth`],1,`Follow the chain.`,'E'],
    [`FAT stores…`,[`File names`,`The next-block pointers for all files in one table`,`Inodes`,`Extents`],1,`Cached in RAM.`,'E'],
    [`A Unix inode has how many direct pointers in ext2?`,[`4`,`12`,`64`,`1024`],1,`Then indirect levels.`,'M'],
    [`With 4 KB blocks and 4 B pointers, an indirect block holds…`,[`256`,`512`,`1024`,`4096`],2,`4096 / 4.`,'M'],
    [`ext4 and XFS describe file data with…`,[`FAT`,`Extents`,`Linked lists`,`Bitmaps only`],1,`(start, length) runs.`,'M'],
  ],
  quizAdv: [
    [`Reading block 5000 of a linked-allocation file requires about…`,[`1 read`,`2 reads`,`5001 reads`,`log 5000 reads`],2,`Follow every pointer.`,'H'],
    [`The double-indirect pointer with 4 KB blocks covers…`,[`4 MB`,`4 GB`,`4 TB`,`48 KB`],1,`1024² × 4 KB.`,'H'],
    [`FAT32's maximum file size is…`,[`2 GB`,`4 GB minus 1 byte`,`16 TB`,`Unlimited`],1,`32-bit size field.`,'H'],
  ],
});
