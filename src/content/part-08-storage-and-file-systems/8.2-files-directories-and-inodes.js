/* 8.2 Files, directories and inodes */
topic('8', { no:'8.2', title:'Files, directories and inodes: opening /home/me/notes.txt',
idea:`A file name is just a directory entry pointing at an inode, and the inode holds everything else: size, owner, permissions, timestamps and where the data blocks are. Follow <code>open("/home/me/notes.txt")</code> as the kernel walks the path one directory at a time, then trace a <code>read</code> through the file descriptor table.`,
actors:'Kernel', tbTitle:'On-disk structures', stateTitle:'Lookup',
codes:{a:`int fd = open("/home/me/notes.txt", O_RDONLY);
// path resolution, one component at a time:
//   inode 2 (root "/")  → dir entry "home" → inode 1200
//   inode 1200          → dir entry "me"   → inode 4410
//   inode 4410          → dir entry "notes.txt" → inode 7731
//   check permissions on every directory (x) and the file (r)
char buf[100];
read(fd, buf, 100);     // fd → open file (offset 0) → inode 7731 → data block 98117
// fd table (per process) → open-file table (offset, mode) → inode (in memory)`},
steps:[
{hl:{k:[1,3]}, tb:[TB('inode 2 (the root directory)',['field','value'],[['type','directory'],['data block','#5']]),TB('block #5: contents of "/"',['name','inode'],[['.','2'],['..','2'],['home','1200'],['etc','30']],{2:'hot'})], g:[G('Lookup',['start','root inode is always 2 (ext4)'],['component','"home" → 1200','hot'])],
 say:`A <b>directory</b> is just a special file whose contents are a table of (name → inode number) entries. Path resolution starts at the root directory, inode 2 on ext4. The kernel reads its data block and finds the entry <code>home</code> → inode 1200.`},
{hl:{k:[4,5]}, tb:[TB('dir 1200 ("/home")',['name','inode'],[['.','1200'],['..','2'],['me','4410'],['ana','4512']],{2:'hot'}),TB('dir 4410 ("/home/me")',['name','inode'],[['.','4410'],['..','1200'],['notes.txt','7731'],['photos','8012']],{2:'hot'})], g:[G('Lookup',['"me"','→ 4410'],['"notes.txt"','→ 7731','hot'],['dentry cache','results cached so repeated lookups skip the disk','ok'])],
 say:`Same again for each component: in directory 1200, <code>me</code> → 4410; in 4410, <code>notes.txt</code> → <b>inode 7731</b>. The kernel checks execute (search) permission on each directory and read permission on the file. Results go in the <b>dentry cache</b>, so the next open of this path costs no disk reads.`},
{hl:{k:[6]}, tb:[TB('inode 7731 (the file)',['field','value'],[['type','regular file'],['mode','-rw-r----- (0640)'],['owner / group','me / staff'],['size','1,843 bytes'],['link count','1'],['times','atime, mtime, ctime'],['block pointers','#98117']],{6:'hot'})], g:[G('Lookup',['note','the inode does NOT contain the file name','hot'])],
 say:`The <b>inode</b> is the file: type, permissions, owner, size, timestamps, link count, and pointers to its data blocks. What it does <i>not</i> contain is the file's name. Names live only in directories, which is why one file can have several names (hard links, 8.4) and why renaming within a file system is cheap.`},
{hl:{k:[1,9]}, th:[['P','RUN:ok','open → fd 3']], tb:[TB('three tables',['table','entry'],[['process fd table','fd 3 → open-file #17'],['system open-file table','#17: offset 0, O_RDONLY, refcount 1, → inode 7731'],['in-memory inode table','7731: cached copy of the inode']],{0:'new'})], g:[G('Lookup',['open() returns','the lowest free descriptor: 3 (0–2 are stdin/out/err)'])],
 say:`<code>open</code> returns a <b>file descriptor</b>, a small integer indexing the process's fd table. Entry 3 points to an <b>open-file</b> object in the kernel holding the current offset and the open mode, which points to the in-memory inode. These three levels explain a lot: forked children share open-file objects (and offsets); two separate opens of the same file don't.`},
{hl:{k:[8]}, tb:[TB('three tables',['table','entry'],[['process fd table','fd 3 → open-file #17'],['open-file #17','offset 0 → 100'],['inode 7731','block pointer #98117 → page cache']],{1:'hot'})], log:['read(3, buf, 100) = 100'], g:[G('Lookup',['read','offset → block via the inode → page cache → copy to buf'],['offset','advances by the bytes read'])],
 say:`<code>read(fd, buf, 100)</code> follows fd 3 to the open file, uses its offset (0) and the inode's block pointers to find block 98117, reads it into the page cache if needed, copies 100 bytes to <code>buf</code>, and advances the offset to 100. The next read continues from there.`},
{tb:[], th:[], g:[G('Metadata commands',['ls -i','show inode numbers'],['stat file','inode contents'],['df -i','free inodes (you can run out!)'])],
 say:`<b>Say it:</b> "A file is an inode: metadata such as type, permissions, owner, size, timestamps and pointers to data blocks, but not its name. Directories are files mapping names to inode numbers, so opening a path walks it component by component, checking permissions and using the dentry cache. open returns a file descriptor that indexes the process's fd table, which points to a system-wide open-file entry holding the offset and mode, which points to the inode."`}
],
keep:[`Directory = table of name → inode number.`,`Inode = metadata + block pointers; no name.`,`Path lookup: walk components from root (inode 2), check x on dirs.`,`fd → open-file (offset, mode) → inode.`,`Dentry and inode caches make repeated lookups free.`]}, {
  imp: 'must',
  theory: TH(`File systems store each file's metadata and block locations in an inode and map names to inodes through directory files; open file descriptors connect a process to an open file's offset and inode.`,
`<p>A library catalogue card (inode) describes a book: its size, who can borrow it, and which shelves hold its chapters. Shelf signs in each section (directories) say "Cooking → card 1200". To find a book by its full path you follow the signs section by section, then read the card. The book's title on a sign isn't on the card itself, so the same card can be listed under two signs.</p>
<p>Understanding inodes explains many everyday puzzles: why <code>mv</code> is instant, why deleting an open file doesn't free space until it's closed, and why a disk can be "full" with gigabytes free (no inodes left).</p>`,
[[`Inode`,`On-disk structure with a file's metadata and data-block pointers.`],[`Inode number`,`Index identifying an inode within a file system.`],[`Directory entry (dentry)`,`(name, inode number) pair.`],[`Path resolution`,`Translating a path into an inode.`],[`File descriptor`,`Per-process integer handle for an open file.`],[`Open-file table`,`Kernel objects holding offset and mode.`],[`Superblock`,`File-system-wide metadata (size, free counts, inode table location).`]],
[`Start at the root inode (or the cwd for relative paths).`,`Read the directory's data and find the next component's inode number.`,`Check permissions; repeat until the last component.`,`Allocate an open-file object (offset 0) and the lowest free fd.`,`read/write use the offset and the inode's block map.`],
[`ls -i, stat and df -i are the everyday inode tools.`,`Mail and cache servers with millions of tiny files can run out of inodes before space.`,`Deleting a file that a process still has open frees space only when the last fd is closed (lsof +L1).`],
[`Thinking the file name is stored in the inode.`,`Confusing file descriptors with inodes.`,`Forgetting execute permission is needed on every directory in the path.`])
  ,
  examples: [
    {lv:'basic', title:'See inodes', code:`$ ls -i notes.txt
7731 notes.txt
$ stat notes.txt
  File: notes.txt
  Size: 1843        Blocks: 8          IO Block: 4096   regular file
Device: 259,2       Inode: 7731        Links: 1
Access: (0640/-rw-r-----)  Uid: (1000/me)   Gid: (50/staff)
Modify: 2026-10-17 09:12:44`, why:`stat prints the inode. The name appears only because you asked about a path.`},
    {lv:'mid', title:'Why mv within a file system is instant', code:`$ ls -i big.iso
91234 big.iso
$ mv big.iso archive/big.iso      # 4 GB file, takes ~0 ms
$ ls -i archive/big.iso
91234 archive/big.iso             # same inode: only directory entries changed`, why:`Renaming adds a directory entry in the target and removes the old one; no data moves. Across file systems, mv must copy and delete.`},
    {lv:'adv', title:'Deleted but still using space', code:`$ df -h /var        →  100% used
$ rm /var/log/huge.log
$ df -h /var        →  still 100%
$ sudo lsof +L1 | head -2
COMMAND  PID  FD   SIZE/OFF  NLINK  NAME
java    4242  7w  48G       0      /var/log/huge.log (deleted)`, why:`rm removed the name (link count 0), but a process still holds an fd, so the inode and its blocks stay alive until the file is closed. Restart or truncate via /proc/4242/fd/7.`},
  ],
  tips: {
    say:`"An inode stores a file's metadata, permissions, owner, size, timestamps and pointers to data blocks, but not its name. Directories are special files mapping names to inode numbers. Opening a path walks it from the root one component at a time, checking permissions and caching results in the dentry cache. open returns a file descriptor indexing the per-process fd table, which points to an open-file entry with the offset and mode, which points to the inode."`,
    points:[`Inode contents (and that the name isn't one of them).`,`Path resolution.`,`The three-level fd → open file → inode structure.`],
    traps:[`Storing names in inodes.`,`Thinking fds are global.`],
    qa:[[`Can you run out of inodes with free space left?`,`Yes: ext4 creates a fixed number of inodes at mkfs time; millions of small files can exhaust them (df -i).`],
        [`What do parent and child share after fork for an open file?`,`The same open-file object, hence the same offset: writes by one advance the other's position.`],
        [`What's the difference between mtime and ctime?`,`mtime changes when content changes; ctime when the inode changes (content, permissions, owner, link count).`]]
  },
  exercises: [
    {lv:'E', q:`Which inode number is the root directory on ext4?`, ans:'2', hint:`Inode 1 is reserved for bad blocks.`, answer:`<p>2.</p>`},
    {lv:'M', q:`A process has stdin, stdout and stderr open and calls open() twice. What fd does the second call return?`, ans:'4', hint:`Lowest free number each time.`, answer:`<p>First open → 3, second → 4.</p>`},
    {lv:'H', q:`How many directory data blocks (at least) must be read to resolve /a/b/c/file.txt with a cold cache, assuming each directory fits in one block?`, ans:'4', hint:`/, a, b, c.`, answer:`<p>4 directories (/, a, b, c), plus their inodes and finally file.txt's inode.</p>`},
  ],
  quiz: [
    [`An inode does NOT contain…`,[`File size`,`Permissions`,`The file's name`,`Block pointers`],2,`Names live in directories.`,'E'],
    [`A directory is…`,[`An inode type with no data`,`A file mapping names to inode numbers`,`A disk partition`,`A process`],1,`Name → inode.`,'E'],
    [`open() returns…`,[`An inode number`,`A file descriptor`,`A block number`,`A path`],1,`Small integer per process.`,'E'],
    [`To traverse /home/me you need on each directory…`,[`Read`,`Write`,`Execute (search) permission`,`Sticky bit`],2,`x on directories.`,'M'],
    [`Renaming a file within the same file system is fast because…`,[`Data is compressed`,`Only directory entries change; the inode and data stay`,`It's cached`,`It's async`],1,`Same inode.`,'M'],
    [`After fork, parent and child reading the same inherited fd…`,[`Have independent offsets`,`Share one offset`,`Can't read`,`Deadlock`],1,`Shared open-file object.`,'M'],
  ],
  quizAdv: [
    [`df -i shows…`,[`Free disk blocks`,`Inode usage`,`Mounted devices`,`I/O rate`],1,`Inodes can run out.`,'H'],
    [`The dentry cache speeds up…`,[`Data reads`,`Path-name lookups`,`Writes`,`fsync`],1,`Name → inode.`,'H'],
    [`ctime changes when…`,[`The file is read`,`The inode changes (content, mode, owner, links)`,`The file is created only`,`Never`],1,`Not "creation time" in Unix.`,'H'],
  ],
});
