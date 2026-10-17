/* 8.6 RAID and SSDs */
topic('8', { no:'8.6', title:'RAID levels and how SSDs work',
idea:`Combine disks for speed or survival. Stripe a file over three disks (RAID 0), mirror it (RAID 1), and protect it with parity (RAID 5), then lose a disk and rebuild its data with XOR. Finish with why SSDs need TRIM, wear levelling and a flash translation layer.`,
actors:'Disks', tbTitle:'Blocks on each disk', stateTitle:'Capacity and safety',
codes:{a:`RAID 0  striping:   A1 A2 A3 spread over disks     → n× capacity, n× speed, 0 failures tolerated
RAID 1  mirroring:  every block on 2 disks         → ½ capacity, survives 1 failure
RAID 5  striping + distributed parity:
        P = A1 XOR A2 XOR A3                      → (n−1)/n capacity, survives 1 failure
        lost A2 = A1 XOR A3 XOR P
RAID 6  two parities                              → survives 2 failures
RAID 10 mirrors, striped                          → ½ capacity, fast, survives 1 per mirror

SSD: pages (4–16 KB) written once, erased in blocks (~MB); FTL remaps writes, wear levelling, TRIM`},
steps:[
{hl:{r:[1]}, th:[['disk0','RUN:ok',''],['disk1','RUN:ok',''],['disk2','RUN:ok','']], tb:[TB('RAID 0 (striping)',['stripe','disk 0','disk 1','disk 2'],[['0','A1','A2','A3'],['1','A4','A5','A6']])], g:[G('Capacity and safety',['capacity','3 × disk','ok'],['throughput','reads/writes spread over 3 disks','ok'],['failure','ANY disk lost → everything lost','bad'])],
 say:`<b>RAID</b> = redundant array of independent disks. <b>RAID 0</b> stripes data across disks: block A1 on disk 0, A2 on disk 1, A3 on disk 2. Large reads and writes use all disks in parallel, and you get the full capacity. But there's no redundancy: lose any one disk and you lose everything (more disks = more risk).`},
{hl:{r:[2]}, th:[['disk0','RUN:ok',''],['disk1','RUN:ok','mirror']], tb:[TB('RAID 1 (mirroring)',['block','disk 0','disk 1'],[['A1','A1','A1'],['A2','A2','A2']])], g:[G('Capacity and safety',['capacity','½ of total','bad'],['reads','from either copy (faster)','ok'],['writes','to both'],['failure','survives one disk','ok'])],
 say:`<b>RAID 1</b> mirrors every block onto two disks. Either disk can fail and the data survives; reads can be served by either copy. The price: half the raw capacity, and every write happens twice.`},
{hl:{r:[3,4,5]}, th:[['disk0','RUN:ok',''],['disk1','RUN:ok',''],['disk2','RUN:ok',''],['disk3','RUN:ok','']], tb:[TB('RAID 5 (parity rotates across disks)',['stripe','disk 0','disk 1','disk 2','disk 3'],[['0','A1 = 1010','A2 = 0110','A3 = 1100','P = 0000'],['1','B1','B2','P','B3'],['2','C1','P','C2','C3']],{0:'hot'})], g:[G('Capacity and safety',['parity','1010 ⊕ 0110 ⊕ 1100 = 0000'],['capacity','(n−1)/n = 3/4','ok'],['failure','survives one disk','ok'])],
 say:`<b>RAID 5</b> stripes data and adds a <b>parity</b> block per stripe: the XOR of the data blocks. Here A1 ⊕ A2 ⊕ A3 = 1010 ⊕ 0110 ⊕ 1100 = 0000. Parity rotates across disks so no single disk is a write bottleneck. With 4 disks you get 3 disks of capacity and can survive any one failure.`},
{th:[['disk0','RUN:ok',''],['disk1','TERM:bad','FAILED'],['disk2','RUN:ok',''],['disk3','RUN:ok','']], tb:[TB('rebuilding A2 from the survivors',['value','bits'],[['A1','1010'],['A3','1100'],['P','0000'],['A1 ⊕ A3 ⊕ P','0110 = A2 ✓']],{3:'ok'})], g:[G('Capacity and safety',['degraded mode','every read of disk 1 = XOR of 3 others','bad'],['rebuild','read ALL other disks fully','bad'],['risk','a second failure (or read error) during rebuild = data loss','bad'])], log:['disk1 failed → degraded','A2 = A1 ⊕ A3 ⊕ P = 0110'],
 say:`Disk 1 dies. XOR has a neat property: any one value can be recomputed from all the others. A2 = A1 ⊕ A3 ⊕ P = 1010 ⊕ 1100 ⊕ 0000 = <b>0110</b>. The array keeps working in <b>degraded</b> mode and rebuilds onto a replacement. But rebuilding reads every surviving disk end to end, for hours on large drives, and a second failure meanwhile loses data. That's why big arrays use <b>RAID 6</b> (two parities) or RAID 10.`},
{hl:{r:[6,7]}, th:[], tb:[TB('summary',['level','usable (4 × 4 TB)','survives','writes'],[['RAID 0','16 TB','0 failures','fastest'],['RAID 1 / 10','8 TB','1 per mirror pair','2 writes'],['RAID 5','12 TB','1 failure','read-modify-write parity'],['RAID 6','8 TB','2 failures','2 parities']])], g:[G('Capacity and safety',['RAID is not a backup','deletes and corruption are mirrored instantly','bad'])],
 say:`Summary for four 4 TB disks. Small random writes on RAID 5/6 are expensive: updating one block means reading old data and parity, then writing new data and parity (the <b>write penalty</b>). And remember: <b>RAID is not a backup</b>. An accidental <code>rm</code> or ransomware is faithfully applied to all copies.`},
{hl:{r:[9]}, tb:[TB('SSD internals',['concept','why'],[['no overwrite in place','flash pages must be erased before rewrite; erase is per big block'],['FTL','maps logical blocks to physical pages; each write goes to a fresh page'],['garbage collection','copies live pages out of a block, then erases it'],['TRIM','OS tells the SSD which blocks are free so GC doesn\'t copy dead data','ok'],['wear levelling','spread erases: each cell survives ~1k–100k cycles','ok']])], g:[G('Capacity and safety',['no seek','random reads ~100 µs or less, disk scheduling irrelevant','ok'],['write amplification','GC can turn 1 write into several','bad'])],
 say:`<b>Say it:</b> "RAID 0 stripes for speed with no redundancy; RAID 1 mirrors; RAID 5 stripes with rotating XOR parity, giving n−1 disks of capacity and surviving one failure, because a lost block is the XOR of the others; RAID 6 survives two; RAID 10 stripes mirrors. RAID isn't a backup. SSDs have no seek; flash can't be overwritten in place, so a flash translation layer remaps writes, garbage-collects and wear-levels, and TRIM tells it which blocks are free."`}
],
keep:[`RAID 0 stripe (no safety), RAID 1 mirror, RAID 5 parity (n−1, 1 failure), RAID 6 (2), RAID 10.`,`Parity = XOR; lost block = XOR of the rest.`,`Rebuilds are long and risky → RAID 6 / 10 for big disks.`,`RAID is not a backup.`,`SSD: erase-before-write, FTL, GC, TRIM, wear levelling.`]}, {
  imp: 'extra',
  theory: TH(`RAID combines disks for performance and/or redundancy using striping, mirroring and parity; SSDs replace mechanics with flash, managed by a translation layer that remaps, garbage-collects and wear-levels.`,
`<p>Three people each memorise a third of a phone book (striping): lookups are three times faster, but if one forgets, a third of the book is gone. Two people memorise the whole book each (mirroring): safe, but twice the effort. Three memorise a third each and a fourth memorises a "checksum" from which any one missing third can be reconstructed (parity).</p>
<p>SSDs behave like notebooks written in pen: you can't erase one line, only tear out a whole page block, so the drive keeps writing to fresh lines and periodically copies live lines out of old pages before tearing them out.</p>`,
[[`Striping`,`Spreading consecutive blocks across disks.`],[`Mirroring`,`Keeping identical copies on two disks.`],[`Parity`,`XOR of data blocks, used to rebuild a lost one.`],[`Degraded mode`,`Operating with a failed disk.`],[`Write penalty`,`Extra I/Os per small write in parity RAID.`],[`FTL`,`Flash translation layer: logical → physical page map.`],[`TRIM / discard`,`Notifying the SSD that blocks are unused.`],[`Write amplification`,`Physical writes / logical writes.`]],
[`RAID 0: block i goes to disk i mod n.`,`RAID 1: write every block to both disks; read from either.`,`RAID 5: per stripe, parity = XOR of data blocks, placed on a rotating disk.`,`On failure: compute missing blocks as XOR of survivors; rebuild onto a spare.`,`SSD: write to free pages, update FTL map, mark old pages invalid; GC erases blocks with few live pages.`],
[`mdadm / LVM / ZFS RAID-Z provide software RAID on Linux.`,`Cloud block storage replicates across machines, a networked cousin of RAID 1.`,`fstrim.timer runs TRIM weekly on most Linux distributions.`],
[`Treating RAID as a backup.`,`RAID 5 with huge disks (long rebuild windows).`,`Disabling TRIM and seeing SSD write performance degrade.`])
  ,
  examples: [
    {lv:'basic', title:'Parity is XOR', code:`A1 = 1010
A2 = 0110
A3 = 1100
P  = A1 ⊕ A2 ⊕ A3 = 0000
lose A2:  A1 ⊕ A3 ⊕ P = 1010 ⊕ 1100 ⊕ 0000 = 0110 = A2 ✓`, why:`XOR is its own inverse, so any single missing operand can be recovered from the rest.`},
    {lv:'mid', title:'Capacity and fault tolerance', code:`6 disks × 8 TB
RAID 0:   48 TB, tolerates 0 failures
RAID 1+0: 24 TB, tolerates 1 failure per mirror pair (up to 3 if lucky)
RAID 5:   40 TB, tolerates 1
RAID 6:   32 TB, tolerates 2`, why:`RAID 5 usable = (n−1) disks, RAID 6 = (n−2), mirrors = n/2.`},
    {lv:'adv', title:'The RAID 5 small-write penalty', code:`update one 4 KB block D on RAID 5:
  1. read old D          2. read old P
  3. P' = P ⊕ D ⊕ D'      (remove old D, add new D')
  4. write D'            5. write P'
→ 4 I/Os per logical write (RAID 6: 6 I/Os)
RAID 10: 2 writes, no reads`, why:`Why databases with lots of small random writes prefer RAID 10 despite its lower capacity.`},
  ],
  tips: {
    say:`"RAID 0 stripes data across disks for throughput with no redundancy. RAID 1 mirrors, halving capacity but surviving a failure. RAID 5 stripes with rotating XOR parity: n−1 disks of capacity and survives one failure, since a lost block is the XOR of the others, but small writes cost four I/Os and rebuilds are long. RAID 6 adds a second parity; RAID 10 stripes over mirrors. None of these are backups. SSDs need TRIM, garbage collection and wear levelling because flash is erased in large blocks."`,
    points:[`Each level's capacity and tolerance.`,`XOR reconstruction.`,`Write penalty and rebuild risk; SSD basics.`],
    traps:[`RAID as backup.`,`Saying RAID 0 is redundant.`],
    qa:[[`Why is RAID 5 discouraged for large disks?`,`Rebuilding reads every surviving disk fully; with multi-TB disks that takes many hours, and an unrecoverable read error or second failure in that window loses data. RAID 6 or 10 is preferred.`],
        [`What does TRIM do?`,`Tells the SSD which logical blocks the file system no longer uses, so garbage collection can discard them instead of copying dead data, reducing write amplification.`],
        [`Why does parity rotate in RAID 5?`,`If parity lived on one disk (RAID 4) every write would hit that disk, making it the bottleneck.`]]
  },
  exercises: [
    {lv:'E', q:`RAID 5 with 5 disks of 2 TB: usable capacity in TB?`, ans:'8', hint:`(n − 1) × size.`, answer:`<p>4 × 2 = 8 TB.</p>`},
    {lv:'M', q:`Data blocks 1001, 0111, 1110. What is the parity block (4 bits)?`, ans:'0', hint:`XOR them.`, answer:`<p>1001 ⊕ 0111 = 1110; 1110 ⊕ 1110 = 0000.</p>`, fmt:'4 bits, e.g. 1010'},
    {lv:'H', q:`RAID 5 with parity 0101; surviving data blocks 1100 and 0011. What was the lost block? (4 bits)`, ans:'1010', hint:`XOR all survivors including parity.`, answer:`<p>1100 ⊕ 0011 = 1111; 1111 ⊕ 0101 = 1010.</p>`},
  ],
  quiz: [
    [`RAID 0 provides…`,[`Redundancy`,`Striping for performance, no redundancy`,`Mirroring`,`Parity`],1,`Any failure loses data.`,'E'],
    [`RAID 1 is…`,[`Striping`,`Mirroring`,`Parity`,`Double parity`],1,`Two copies.`,'E'],
    [`RAID 5 survives how many disk failures?`,[`0`,`1`,`2`,`n−1`],1,`Single parity.`,'E'],
    [`A lost RAID 5 block is reconstructed by…`,[`Reading a mirror`,`XOR of the remaining blocks in the stripe`,`Checksums`,`Backups`],1,`Parity math.`,'M'],
    [`TRIM helps SSDs by…`,[`Speeding up reads`,`Telling the drive which blocks are free so GC avoids copying dead data`,`Compressing data`,`Disabling wear levelling`],1,`Less write amplification.`,'M'],
    [`Is RAID a backup?`,[`Yes`,`No: deletions and corruption are replicated`,`Only RAID 1`,`Only RAID 6`],1,`Keep real backups.`,'M'],
  ],
  quizAdv: [
    [`A small write on RAID 5 costs about…`,[`1 I/O`,`2 I/Os`,`4 I/Os`,`8 I/Os`],2,`Read D, read P, write D', write P'.`,'H'],
    [`RAID 4 differs from RAID 5 by…`,[`No parity`,`A dedicated parity disk (bottleneck)`,`Two parities`,`Mirroring`],1,`5 rotates parity.`,'H'],
    [`Flash pages can be…`,[`Overwritten in place freely`,`Written once, then erased only as part of a larger block`,`Only read`,`Erased per byte`],1,`Hence the FTL.`,'H'],
  ],
});
