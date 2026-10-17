/* 8.4 Hard links, symbolic links and file descriptors */
topic('8', { no:'8.4', title:'Hard links, symbolic links and file descriptors',
idea:`Because names point to inodes, one file can have several names. Create a hard link and a symbolic link to the same file, delete the original name, and see which link survives. Then follow file descriptors through <code>dup2</code> and <code>fork</code> to understand redirection and shared offsets.`,
actors:'Names', tbTitle:'Directory and inodes', stateTitle:'Link counts',
codes:{a:`$ echo hi > a.txt          # inode 500, link count 1
$ ln a.txt b.txt           # hard link: new name → SAME inode 500 (count 2)
$ ln -s a.txt c.txt        # symlink: new inode 600 whose content is the path "a.txt"
$ rm a.txt                 # remove one name: inode 500 count 2 → 1
$ cat b.txt                # hi   (data still reachable)
$ cat c.txt                # No such file or directory  (dangling symlink)

// descriptors: 0 stdin, 1 stdout, 2 stderr
int fd = open("log.txt", O_WRONLY | O_CREAT | O_APPEND, 0644);
dup2(fd, 1);               // fd 1 now refers to log.txt: printf goes to the file
dup2(1, 2);                // 2>&1: stderr shares stdout's open file`},
steps:[
{hl:{sh:[1,2]}, tb:[TB('directory',['name','inode'],[['a.txt','500'],['b.txt','500']],{1:'new'}),TB('inodes',['inode','type','links','content'],[['500','file','2','"hi"']],{0:'hot'})], g:[G('Link counts',['inode 500','2 names'])],
 say:`<code>ln a.txt b.txt</code> creates a <b>hard link</b>: a second directory entry pointing at the <b>same inode</b> 500. Neither name is "the original"; they're equal. The inode's <b>link count</b> becomes 2.`},
{hl:{sh:[3]}, tb:[TB('directory',['name','inode'],[['a.txt','500'],['b.txt','500'],['c.txt','600']],{2:'new'}),TB('inodes',['inode','type','links','content'],[['500','file','2','"hi"'],['600','symlink','1','the path "a.txt"']],{1:'new'})], g:[G('Link counts',['symlink','separate inode storing a path'])],
 say:`<code>ln -s a.txt c.txt</code> creates a <b>symbolic (soft) link</b>: a new, tiny file (inode 600) whose content is just the path <code>a.txt</code>. Opening <code>c.txt</code> makes the kernel read that path and resolve it again.`},
{hl:{sh:[4,5,6]}, tb:[TB('directory',['name','inode'],[['b.txt','500'],['c.txt','600 → "a.txt" (missing)']],{1:'bad'}),TB('inodes',['inode','type','links','content'],[['500','file','1','"hi"'],['600','symlink','1','"a.txt"']],{0:'ok'})], g:[G('Link counts',['rm a.txt','removes a NAME (unlink); count 2 → 1'],['b.txt','still works','ok'],['c.txt','dangling: points to a name that no longer exists','bad'])], log:['hi','cat: c.txt: No such file or directory'],
 say:`<code>rm</code> is really <code>unlink</code>: it removes a name and decrements the link count. Inode 500 still has one name, so <code>b.txt</code> works. The symlink stored the <i>name</i> "a.txt", which no longer exists: it's now <b>dangling</b>. The data is freed only when the link count reaches 0 <i>and</i> no process has the file open.`},
{tb:[TB('compare',['','hard link','symbolic link'],[['points to','an inode','a path name'],['own inode?','no','yes'],['across file systems?','no (inode numbers are per FS)','yes'],['to directories?','no (would create cycles)','yes'],['target deleted','still works','dangles']])], g:[G('Link counts',['directories','"." and ".." are hard links, so a dir\'s count = 2 + number of subdirs'])],
 say:`Hard links can't cross file systems (inode numbers are only meaningful within one) and can't point to directories (that could create cycles in the tree). Symlinks can do both, at the price of possibly dangling. Fun fact: a directory's link count is 2 plus its number of subdirectories, because of <code>.</code> and each child's <code>..</code>.`},
{hl:{fd:[9,10]}, th:[['P','RUN:ok','printf → log.txt']], tb:[TB('P\'s descriptor table',['fd','refers to'],[['0','terminal (stdin)'],['1','log.txt (via dup2)'],['2','terminal'],['3','log.txt']],{1:'hot'})], g:[G('Link counts',['dup2(fd, 1)','make fd 1 a copy of fd'])],
 say:`File descriptors work the same way one level up: they're per-process numbers pointing at open-file objects. <code>dup2(fd, 1)</code> makes descriptor 1 point at the same open file as <code>fd</code>, so everything the program writes to "stdout" lands in <code>log.txt</code>. That's how a shell implements <code>&gt; log.txt</code>.`},
{hl:{fd:[11]}, tb:[TB('P\'s descriptor table',['fd','refers to'],[['1','open-file #17 (log.txt, offset shared)'],['2','open-file #17'],['3','open-file #17']],{1:'hot'})], g:[G('Link counts',['2>&1','fd 2 shares fd 1\'s open file and offset'],['after fork','children share these open files too'])],
 say:`<code>dup2(1, 2)</code> is the shell's <code>2&gt;&amp;1</code>: stderr now shares the <i>same</i> open file, hence the same offset, so stdout and stderr lines interleave correctly. Order matters: <code>cmd &gt; f 2&gt;&amp;1</code> sends both to f, but <code>cmd 2&gt;&amp;1 &gt; f</code> sends stderr to the terminal (it copied fd 1 before fd 1 was redirected).`},
{tb:[], th:[], g:[G('Remember',['hard link','another name for the same inode'],['symlink','a file containing a path'],['rm','unlink a name; data freed at link count 0 and no open fds'],['dup2','descriptor aliasing → redirection'])],
 say:`<b>Say it:</b> "A hard link is an additional directory entry pointing to the same inode; all names are equal and the data lives until the link count reaches zero and no process has it open. A symbolic link is a separate small file containing a path, so it can cross file systems and point to directories but can dangle. File descriptors are per-process indexes into open-file objects; dup2 makes one descriptor an alias of another, which is how shells implement redirection like 2>&1."`}
],
keep:[`Hard link: new name, same inode; link count++.`,`Symlink: own inode containing a path; can dangle; can cross FS.`,`rm = unlink: data freed at count 0 and no open fds.`,`Hard links: same FS only, not to directories.`,`dup2(a, b): b becomes an alias of a → redirection; 2>&1.`]}, {
  imp: 'must',
  theory: TH(`Hard links are extra names for the same inode, symbolic links are files holding a path, and file descriptors are per-process handles that can be duplicated to redirect I/O.`,
`<p>A hard link is a second entry in the phone book for the same phone line: either entry rings the same phone, and the line is disconnected only when every entry is removed. A symbolic link is a sticky note saying "see the entry for Alice": if Alice's entry is removed, the note leads nowhere.</p>
<p>The same indirection one level up gives file descriptors: numbers that can be pointed at different open files, which is all a shell needs to implement pipes and redirections.</p>`,
[[`Hard link`,`Directory entry referencing an existing inode.`],[`Link count`,`Number of names referencing an inode.`],[`Symbolic link`,`File whose content is a path to another file.`],[`Dangling symlink`,`Symlink whose target doesn't exist.`],[`unlink`,`Remove a name (what rm does).`],[`dup / dup2`,`Duplicate a file descriptor.`],[`Close-on-exec`,`FD flag: close automatically on exec (O_CLOEXEC).`]],
[`ln target name: add a dentry with target's inode number; increment the count.`,`ln -s target name: create a symlink inode containing "target".`,`rm name: remove the dentry; decrement the count; free the inode when count = 0 and it's not open.`,`dup2(old, new): close new if open, then make new refer to old's open file.`],
[`Package managers and Docker layers use hard links to deduplicate files.`,`Deploy scripts switch versions by atomically retargeting a symlink (current → release-42).`,`Log rotation must signal or reopen files because processes keep writing to the old inode.`],
[`Expecting hard links to work across mount points.`,`Deleting a log file instead of truncating it while a process writes to it.`,`Getting the order of > and 2>&1 wrong.`])
  ,
  examples: [
    {lv:'basic', title:'Link counts in ls', code:`$ echo hi > a.txt; ln a.txt b.txt; ln -s a.txt c.txt
$ ls -li
500 -rw-r--r-- 2 me me 3 Oct 17 10:00 a.txt
500 -rw-r--r-- 2 me me 3 Oct 17 10:00 b.txt
600 lrwxrwxrwx 1 me me 5 Oct 17 10:00 c.txt -> a.txt`, why:`Same inode (500) and link count 2 for the hard links; the symlink has its own inode and size 5 (the length of "a.txt").`},
    {lv:'mid', title:'Atomic deploys with a symlink', code:`$ ln -sfn /srv/app/releases/42 /srv/app/current.tmp
$ mv -T /srv/app/current.tmp /srv/app/current     # rename() is atomic
# requests now resolve /srv/app/current/... to release 42; rollback = point it back`, why:`Creating a new symlink and renaming it over the old one swaps versions atomically: there's never a moment with no "current".`},
    {lv:'adv', title:'Order of redirections', code:`$ ls /nope /tmp > out.txt 2>&1     # both stdout and stderr → out.txt
$ ls /nope /tmp 2>&1 > out.txt     # stderr → terminal, stdout → out.txt
ls: cannot access '/nope': No such file or directory
# the shell processes redirections left to right:
#  "2>&1" copies whatever fd 1 is AT THAT MOMENT (the terminal)`, why:`dup2 copies a descriptor's current target; it doesn't create a lasting alias to "wherever fd 1 goes later".`},
  ],
  tips: {
    say:`"A hard link is another directory entry pointing at the same inode, so all names are equivalent and the file is deleted only when the link count drops to zero and nobody has it open; hard links can't cross file systems or point to directories. A symlink is a small file containing a path: it can cross file systems and point to directories, but dangles if the target is removed. Descriptors are per-process numbers for open files; dup2 aliases one to another, which is how > and 2>&1 work."`,
    points:[`Hard vs soft with the inode picture.`,`What rm really does.`,`dup2 and redirection order.`],
    traps:[`Saying deleting the original breaks a hard link.`,`Hard links across file systems.`],
    qa:[[`Why can't you hard-link a directory?`,`It could create cycles in the directory tree, breaking tools that traverse it and making reference counting unable to free directories.`],
        [`How do you free space taken by a deleted file that's still open?`,`Have the process close or reopen it (restart, SIGHUP for log reopen), or truncate it via /proc/PID/fd/N.`],
        [`What does O_CLOEXEC do?`,`Marks the descriptor to be closed automatically on exec, so child programs don't inherit it accidentally (e.g. sockets, secrets).`]]
  },
  exercises: [
    {lv:'E', q:`a.txt has link count 1. After <code>ln a.txt b.txt</code> and <code>ln a.txt c.txt</code>, what is the link count?`, ans:'3', hint:`Each hard link adds one.`, answer:`<p>3.</p>`},
    {lv:'M', q:`Then <code>rm a.txt</code> and <code>rm b.txt</code>. Can you still read the data via c.txt? (yes/no)`, ans:'yes', hint:`Count is now 1.`, answer:`<p>Yes: the inode still has one name.</p>`},
    {lv:'H', q:`An empty directory <code>d</code> gets 3 subdirectories. What is d's link count?`, ans:'5', hint:`Its entry in the parent, its own ".", and each child's "..".`, answer:`<p>2 + 3 = 5.</p>`},
  ],
  quiz: [
    [`A hard link is…`,[`A file containing a path`,`Another directory entry for the same inode`,`A copy of the file`,`A shortcut file`],1,`Same inode.`,'E'],
    [`A symbolic link…`,[`Shares the target's inode`,`Is a separate file containing the target's path`,`Can't cross file systems`,`Can't dangle`],1,`Resolved by path.`,'E'],
    [`rm actually…`,[`Erases the data`,`Removes a name (unlink) and decrements the link count`,`Moves to trash`,`Deletes all links`],1,`Data freed at count 0.`,'E'],
    [`Hard links cannot…`,[`Be renamed`,`Cross file systems`,`Point to regular files`,`Be deleted`],1,`Inode numbers are per FS.`,'M'],
    [`dup2(fd, 1) does what?`,[`Closes fd`,`Makes fd 1 refer to the same open file as fd`,`Duplicates the file on disk`,`Forks`],1,`Redirection.`,'M'],
    [`After deleting a target, a symlink to it…`,[`Still works`,`Dangles`,`Is deleted automatically`,`Becomes a hard link`],1,`Path no longer resolves.`,'M'],
  ],
  quizAdv: [
    [`cmd 2>&1 > f sends stderr to…`,[`f`,`The terminal`,`/dev/null`,`Both`],1,`Left-to-right evaluation.`,'H'],
    [`A file's data is freed when…`,[`rm is called`,`Link count is 0 and no process has it open`,`The process exits`,`The symlink is removed`],1,`Both conditions.`,'H'],
    [`Why is retargeting a symlink with rename() popular for deploys?`,[`It's faster than copying`,`rename() is atomic, so there's no moment without a valid link`,`It compresses files`,`It avoids inodes`],1,`Atomic switch.`,'H'],
  ],
});
