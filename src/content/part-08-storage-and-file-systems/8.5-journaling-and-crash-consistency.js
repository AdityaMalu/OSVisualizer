/* 8.5 Journaling and crash consistency */
topic('8', { no:'8.5', title:'Journaling and crash consistency',
idea:`Appending one block to a file means updating three places on disk: the data block, the inode and the free-block bitmap. A crash between those writes leaves the file system inconsistent. Crash at each point, see what fsck must repair, then watch a journal make the update atomic with write-ahead logging.`,
actors:'File system', tbTitle:'On-disk state', stateTitle:'Consistency',
codes:{a:`// append one block to a file = 3 separate disk writes
write(data block D)          // the new content
write(inode I)               // size += 4096, pointer → D
write(bitmap B)              // mark D as used

// journaling (ext4 data=ordered, simplified)
1. write D to its final place                      // data first
2. journal: TxBegin | I | B | TxEnd   → flush      // commit point
3. checkpoint: write I and B to their real places
4. mark the transaction free in the journal
// crash before TxEnd: ignore the transaction.  after: replay it.`},
steps:[
{hl:{fs:[2,3,4]}, tb:[TB('needed updates',['structure','old','new'],[['data block D','free garbage','new content'],['inode I','size 4 KB, 1 pointer','size 8 KB, pointer → D'],['bitmap B','D free','D used']])], g:[G('Consistency',['problem','the disk writes one block at a time','bad'],['crash','can happen between any two writes','bad'])],
 say:`Appending a block touches <b>three</b> on-disk structures: the data block itself, the file's inode (new size, new pointer) and the allocation bitmap. The disk can only write them one at a time, and the OS may reorder them for performance. Power can fail between any two writes.`},
{tb:[TB('crash after some writes',['written','result','severity'],[['only D','data lost, but FS consistent (no one points to D)','ok'],['only I','inode points to garbage, bitmap says D is free','bad'],['only B','block marked used, nobody owns it: space leak','hot'],['I + B','file contains garbage (D never written)','bad'],['I + D','D used but bitmap says free: may be given to another file','bad']],{1:'bad',3:'bad',4:'bad'})], g:[G('Consistency',['inconsistency','metadata disagrees with itself','bad'])],
 say:`Crash at different points and you get different damage. Only the data written: harmless (lost update). Only the inode: the file points at garbage and the bitmap still says that block is free, so it could later be handed to another file too (two files sharing a block). Only the bitmap: leaked space. These are <b>crash-consistency</b> bugs.`},
{tb:[TB('fsck (file system check)',['step','what it does'],[['1','scan every inode and block pointer'],['2','rebuild the bitmap from what inodes reference'],['3','check link counts, directory structure'],['cost','hours on a multi-TB disk','bad']],{3:'bad'})], g:[G('Consistency',['old fix','fsck after every unclean shutdown'],['problem','time ∝ disk size, not changes','bad'])],
 say:`The old answer was <b>fsck</b>: after an unclean shutdown, scan <i>all</i> metadata and repair inconsistencies (rebuild bitmaps, fix link counts). It works but takes time proportional to the disk size: hours on large disks, and it can't recover garbage data in files. We need updates to be <b>atomic</b>.`},
{hl:{fs:[7,8]}, tb:[TB('journal (a reserved log area)',['entry','contents'],[['TxBegin','tx 42'],['I','new inode image'],['B','new bitmap image'],['TxEnd','tx 42 committed ✓']],{3:'ok'})], g:[G('Consistency',['write-ahead','describe the change in the log BEFORE changing the real structures','ok'],['commit','TxEnd written and flushed = the transaction happened','ok'])], log:['flush journal → commit tx 42'],
 say:`<b>Journaling</b> (write-ahead logging, as in databases): before touching the real structures, write the new versions of the metadata blocks into a <b>journal</b>, followed by a commit record (TxEnd), and flush. In ext4's default <i>ordered</i> mode the data block D is written to its final place first, so committed metadata never points at garbage.`},
{hl:{fs:[9,10]}, tb:[TB('checkpoint',['structure','state'],[['inode I','written in place'],['bitmap B','written in place'],['journal tx 42','freed']],{0:'ok',1:'ok'})], g:[G('Consistency',['checkpoint','copy committed blocks to their real locations'],['then','free the journal space'])],
 say:`Then <b>checkpoint</b>: write the inode and bitmap to their real locations at leisure, and finally free the transaction's space in the journal (which is a circular buffer).`},
{hl:{fs:[11]}, tb:[TB('recovery after a crash',['crash point','what happens on mount'],[['before TxEnd is on disk','transaction ignored: as if it never happened','ok'],['after TxEnd, before checkpoint','replay: copy I and B from the journal','ok'],['during checkpoint','replay again (idempotent)','ok']],{0:'ok',1:'ok',2:'ok'})], g:[G('Consistency',['recovery time','∝ journal size (seconds), not disk size','ok'],['all or nothing','each transaction is atomic','ok'])],
 say:`After a crash, recovery just reads the journal. A transaction without a commit record is discarded; a committed one is <b>replayed</b> (copying blocks again is harmless, so replay is idempotent). Either all of the update happened or none did, and mounting takes seconds instead of a full fsck.`},
{tb:[], g:[G('Modes & alternatives',['data=journal','data also journaled: safest, writes twice','ok'],['data=ordered (ext4 default)','data first, then metadata journal'],['data=writeback','metadata only; files may contain garbage after crash','bad'],['copy-on-write FS','Btrfs, ZFS, APFS: never overwrite, switch a root pointer atomically','ok']),G('Applications still need',['fsync','to make THEIR data durable','hot'])],
 say:`<b>Say it:</b> "An update like appending to a file changes several on-disk structures, and a crash between writes leaves them inconsistent; fsck can repair that, but it scans the whole disk. Journaling writes the intended metadata changes, and optionally data, to a log with a commit record before applying them in place; after a crash committed transactions are replayed and uncommitted ones discarded, so updates are atomic and recovery takes seconds. Copy-on-write file systems get the same atomicity by never overwriting live blocks."`}
],
keep:[`One logical update = several disk writes → crash can split them.`,`fsck repairs by scanning everything: slow.`,`Journal: log blocks + commit, flush, then checkpoint in place.`,`Recovery: replay committed, discard uncommitted (idempotent).`,`ext4 default = ordered mode; COW file systems (ZFS, Btrfs) avoid in-place writes.`]}, {
  imp: 'good',
  theory: TH(`Journaling makes multi-block file-system updates atomic by writing them to a log with a commit record first, so a crash leaves either the whole update or none of it.`,
`<p>An accountant moving money between two ledgers first writes "transfer £100 from A to B" in a notebook and signs it, then updates both ledgers. If interrupted, they check the notebook: a signed entry is redone, an unsigned one is ignored. The ledgers can never disagree for long.</p>
<p>This is the same write-ahead logging databases use (see the DB stepper's WAL topic). File systems mostly journal metadata, so applications still need <code>fsync</code> to make their own data durable.</p>`,
[[`Crash consistency`,`File system remains valid after a crash at any point.`],[`fsck`,`Offline checker/repairer for file-system metadata.`],[`Journal`,`Reserved log area for pending updates.`],[`Commit record`,`Marks a transaction as complete in the journal.`],[`Checkpoint`,`Writing committed updates to their final locations.`],[`Replay`,`Re-applying committed transactions during recovery.`],[`Ordered mode`,`Data written before the metadata that references it is committed.`],[`Copy-on-write FS`,`Writes new versions elsewhere and atomically switches pointers.`]],
[`Group metadata changes into a transaction.`,`(Ordered mode) write the data blocks to their final place.`,`Write the transaction's blocks to the journal, then a commit record; flush.`,`Checkpoint: write the blocks in place.`,`Free journal space. On crash: replay committed, ignore uncommitted.`],
[`ext4, XFS and NTFS journal metadata; ZFS and Btrfs use copy-on-write.`,`Databases call fsync on their WAL; a file system journal doesn't replace that.`,`Disabling write barriers or using disks that lie about flushes breaks the guarantees.`],
[`Assuming journaling protects application data without fsync.`,`Thinking journaling avoids all data loss (it avoids inconsistency).`,`Confusing data=writeback with safe defaults.`])
  ,
  examples: [
    {lv:'basic', title:'Durable writes from an application', code:`int fd = open("state.tmp", O_WRONLY | O_CREAT | O_TRUNC, 0644);
write(fd, buf, len);
fsync(fd);                       // 1. data is on disk
close(fd);
rename("state.tmp", "state");    // 2. atomic replace (journaled metadata)
int dir = open(".", O_RDONLY);
fsync(dir);                      // 3. make the rename itself durable`, why:`The standard recipe for crash-safe file updates: write a temp file, fsync it, rename over the old one, fsync the directory.`},
    {lv:'mid', title:'ext4 journal modes', code:`$ mount | grep ' / '
/dev/nvme0n1p2 on / type ext4 (rw,relatime,data=ordered)
# data=journal   data + metadata in the journal   (safest, ~2× writes)
# data=ordered   data before metadata commit      (default)
# data=writeback metadata only                    (fastest; stale data possible after crash)`, why:`The three modes trade write amplification for how much a crash can damage file contents.`},
    {lv:'adv', title:'Recovery is fast', code:`$ dmesg | grep -i journal
EXT4-fs (nvme0n1p2): recovery complete
EXT4-fs (nvme0n1p2): mounted filesystem with ordered data mode. Quota mode: none.
# replayed the journal in < 1 s on a 2 TB disk
# without a journal (ext2): e2fsck on 2 TB can take tens of minutes`, why:`Recovery cost scales with the journal (MBs), not the disk (TBs).`},
  ],
  tips: {
    say:`"A single file operation updates several on-disk structures, such as the data block, the inode and the free bitmap, and a crash between those writes leaves the file system inconsistent. fsck can repair it by scanning all metadata, but that's slow. Journaling is write-ahead logging: write the new metadata, and optionally data, to a journal with a commit record and flush, then apply it in place; after a crash, replay committed transactions and discard incomplete ones. Copy-on-write file systems achieve the same atomicity without a journal."`,
    points:[`Explain the multi-write problem with an example.`,`Journal → commit → checkpoint → free.`,`Recovery logic and modes.`],
    traps:[`Saying journaling makes fsync unnecessary.`,`Saying journaling prevents all data loss.`],
    qa:[[`Why is replay safe to do twice?`,`Replay copies full block images to their locations; writing the same content again yields the same state (idempotent).`],
        [`What does ordered mode guarantee?`,`Metadata never points to blocks whose data hasn't been written, so files don't contain stale garbage after a crash.`],
        [`How do copy-on-write file systems stay consistent?`,`They never overwrite live blocks: new data and metadata go to free space, and a single atomic update of the root pointer (uberblock) switches to the new tree.`]]
  },
  exercises: [
    {lv:'E', q:`A crash happens after the journal's TxEnd record was written but before checkpointing. On recovery, is the transaction replayed or discarded?`, ans:'replayed', hint:`Was it committed?`, answer:`<p>Replayed: it was committed.</p>`},
    {lv:'M', q:`A crash happens after TxBegin and the inode were written to the journal but before TxEnd. Replayed or discarded?`, ans:'discarded', hint:`No commit record.`, answer:`<p>Discarded: the update never happened.</p>`},
    {lv:'H', q:`Only the inode update reached the disk before a crash (no journal). Name the two problems fsck would find. (free text)`, hint:`Compare the inode with the bitmap and the data block.`, answer:`<p>The inode points to block D whose content is garbage (data never written), and the bitmap says D is free while an inode uses it, so it could be allocated to a second file. fsck would mark D used (and can't fix the garbage content).</p>`},
  ],
  quiz: [
    [`Crash consistency problems arise because…`,[`Disks are slow`,`One logical update requires several separate disk writes`,`CPUs crash`,`RAM is volatile`],1,`A crash can split them.`,'E'],
    [`A file-system journal is…`,[`A log of user activity`,`A write-ahead log of pending updates`,`A backup`,`A cache`],1,`Like a database WAL.`,'E'],
    [`On recovery, a journal transaction without a commit record is…`,[`Replayed`,`Discarded`,`Half applied`,`Sent to fsck`],1,`Never happened.`,'E'],
    [`fsck's main drawback is…`,[`It loses data`,`Its time grows with disk size`,`It needs a journal`,`It can't fix bitmaps`],1,`Full scan.`,'M'],
    [`ext4's default data mode is…`,[`journal`,`ordered`,`writeback`,`none`],1,`Data before metadata.`,'M'],
    [`Does journaling replace fsync for application data?`,[`Yes`,`No`,`Only on SSDs`,`Only for directories`],1,`It guarantees FS consistency, not your data's durability.`,'M'],
  ],
  quizAdv: [
    [`Replay is safe to repeat because…`,[`It's logged twice`,`Writing the same block images again is idempotent`,`fsck runs after`,`Nothing is written`],1,`Same result.`,'H'],
    [`ZFS and Btrfs achieve consistency by…`,[`A journal`,`Copy-on-write with an atomic root-pointer update`,`fsck on boot`,`Battery-backed RAM only`],1,`Never overwrite live data.`,'H'],
    [`To make a rename durable you should also fsync…`,[`The file only`,`The containing directory`,`/dev/sda`,`Nothing`],1,`Directory entries are directory data.`,'H'],
  ],
});
