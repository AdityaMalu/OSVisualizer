/* 1.3 fork, exec, wait */
topic('1', { no:'1.3', title:'fork, exec and wait: creating processes',
idea:`Unix creates processes in two steps: <code>fork()</code> clones the caller, <code>exec()</code> replaces the clone's program. Step through a mini shell running <code>ls</code> and watch two processes return from one <code>fork</code> call with different values.`,
actors:'Processes', dgTitle:'Process tree', stateTitle:'Return values and memory',
nodes:{
  sh:{x:120,y:50,label:'shell (pid 100)',w:150,h:40,kind:'actor'},
  ch:{x:120,y:170,label:'child (pid 101)',w:150,h:40,kind:'actor'},
  img:{x:350,y:170,label:'program image',w:170,h:40,kind:'mem'}
},
edges:[],
vb:'0 0 460 220',
codes:{a:`int main(void) {
    pid_t pid = fork();                 // one call, two returns
    if (pid < 0) {                      // fork failed (too many processes)
        perror("fork"); exit(1);
    } else if (pid == 0) {              // child: fork returned 0
        execlp("ls", "ls", "-l", NULL); // replace this program with ls
        perror("exec");                 // only reached if exec failed
        exit(127);
    } else {                            // parent: fork returned the child's pid
        int status;
        waitpid(pid, &status, 0);       // block until the child exits
        printf("child %d exited %d\\n", pid, WEXITSTATUS(status));
    }
}`},
steps:[
{hl:{shell:[2]}, th:[['shell','RUN:ok','pid 100, calls fork()']], d:{on:['sh'], hide:['ch','img'], e:[]}, g:[G('Memory',['shell','its own address space'])],
 say:`The shell (pid 100) wants to run <code>ls</code>. It calls <code>fork()</code>. In Unix there's no "create process running program X" call; instead you clone yourself, then the clone changes program.`},
{hl:{shell:[2]}, th:[['shell','RUN:ok','fork returned 101'],['child','READY:info','fork returned 0']], d:{on:['sh','ch'], hide:['img'], e:[['sh','ch','fork()','hot']]}, g:[G('fork() returned',['in the parent','101 (child\'s pid)','hot'],['in the child','0','hot']),G('Memory',['child','copy of parent (copy-on-write)'],['open files','inherited, same offsets'])], log:['fork → parent sees 101, child sees 0'],
 say:`<code>fork</code> creates a near-identical <b>child</b> (pid 101): same code, same variables, same open files, same position in the program. Both return from the <i>same</i> <code>fork</code> call. The only difference is the return value: the parent gets the child's pid, the child gets <b>0</b>. Memory isn't really copied yet: pages are shared <b>copy-on-write</b>.`},
{hl:{child:[5,6], shell:[9,10,11]}, th:[['shell','WAITING:warn','in waitpid(101)'],['child','RUN:ok','calls execlp("ls")']], d:{on:['ch'], hide:['img'], e:[['sh','ch','fork()','ok']]}, g:[G('fork() returned',['in the parent','101'],['in the child','0'])],
 say:`Each process takes a different branch based on that value. The child (<code>pid == 0</code>) calls <code>execlp</code>. The parent goes to the <code>else</code> and calls <code>waitpid</code>, which <b>blocks</b> it until the child exits.`},
{hl:{child:[6]}, th:[['shell','WAITING:warn','in waitpid(101)'],['child','RUN:ok','now running ls (still pid 101)']], d:{on:['ch','img'], e:[['sh','ch','','ok'],['img','ch','exec: new image','hot']], labels:{img:'/usr/bin/ls'}}, g:[G('exec()',['replaces','code, data, heap, stack','hot'],['keeps','pid 101, parent, open files (unless close-on-exec)','ok'],['returns','never, on success'])], log:['execve("/usr/bin/ls", ["ls","-l"]) = 0'],
 say:`<code>exec</code> throws away the child's code, data, heap and stack and loads <code>/usr/bin/ls</code> in their place. Same process, same pid 101, same parent, same open file descriptors: so <code>ls</code> writes to the shell's terminal. On success <code>exec</code> <b>never returns</b>; the <code>perror</code> line runs only if it failed.`},
{hl:{shell:[11,12]}, th:[['shell','RUN:ok','waitpid returned'],['child','TERM:dim','ls exited 0, reaped']], d:{on:['sh'], dim:['ch','img'], e:[]}, g:[G('waitpid()',['returns','101'],['status','exit code 0','ok'],['child','fully removed (reaped)','ok'])], log:['total 8','-rw-r--r-- 1 me me 120 notes.txt','child 101 exited 0'],
 say:`<code>ls</code> prints and exits with status 0. The kernel wakes the parent; <code>waitpid</code> returns the child's pid and status, and the child's last remains (its PCB entry) are removed: it has been <b>reaped</b>. The shell prints the next prompt.`},
{hl:{}, th:[], d:null, g:[G('Why split fork and exec?',['between them, the child can set up its environment','redirect >, pipes |, cd, limits, drop privileges','ok']),G('Counting',['n forks in a row (no if)','2ⁿ processes','hot']),G('Alternatives',['posix_spawn / vfork','faster: no address-space copy'],['clone()','Linux: choose what to share (threads use it)'])],
 say:`<b>Say it:</b> "fork clones the calling process; it returns the child's pid in the parent and 0 in the child. exec replaces the current program with a new one while keeping the pid and open files. wait blocks the parent until a child exits and collects its status. Splitting fork and exec lets the child set up redirections and pipes before the new program starts, which is how shells work."`}
],
keep:[`fork(): parent gets child pid, child gets 0, -1 on error.`,`Child = copy of parent (copy-on-write): memory, open files, position.`,`exec(): replace the program; same pid; never returns on success.`,`wait/waitpid: block until a child exits, collect status (reap).`,`n sequential forks → 2ⁿ processes.`]}, {
  imp: 'must',
  theory: TH(`fork duplicates a process, exec replaces its program, and wait lets a parent collect a finished child; together they are how Unix starts every program.`,
`<p>fork is like a photocopier for a running process: afterwards there are two identical copies, each continuing from the same line, distinguished only by the value fork returned. exec is like swapping the book a reader is reading while keeping the same reader and bookmark ribbon (open files).</p>
<p>Shells rely on the gap between the two: after fork, the child can close and reopen file descriptors (for <code>&gt;</code> and <code>|</code>), change directory or drop privileges, and only then exec the command.</p>`,
[[`fork()`,`Create a child process as a copy of the caller.`],[`exec family`,`execve, execlp, …: replace the current program image.`],[`wait / waitpid`,`Wait for a child to change state and collect its exit status.`],[`Copy-on-write`,`Parent and child share pages until one writes, then that page is copied.`],[`Reaping`,`Collecting a dead child's status so its PCB can be freed.`],[`posix_spawn`,`Combined fork+exec, cheaper for large processes.`]],
[`Parent calls fork; kernel creates a child PCB and shares memory copy-on-write.`,`Both return: parent gets the child's pid, child gets 0.`,`Child optionally rearranges file descriptors, then calls exec.`,`exec loads the new program; on success the old code is gone.`,`Parent calls wait; when the child exits, wait returns its status and the child is reaped.`],
[`Every shell command, cron job and service start uses fork/exec or posix_spawn.`,`Web servers like old Apache forked a process per request; pre-fork pools avoid the cost.`,`Java's ProcessBuilder and Python's subprocess wrap the same calls.`],
[`Forgetting that both processes continue after fork, leading to duplicated work or fork bombs.`,`Not calling wait, which leaves zombies.`,`Assuming code after a successful exec runs.`,`Duplicated stdio buffers: printf without newline before fork prints twice.`])
  ,
  examples: [
    {lv:'basic', title:'One call, two returns', code:`int main(void) {
    printf("before\\n");
    pid_t pid = fork();
    if (pid == 0) printf("child: fork returned 0\\n");
    else          printf("parent: fork returned %d\\n", pid);
    printf("both run this (pid %d)\\n", getpid());
}`, out:`before
parent: fork returned 4242
both run this (pid 4241)
child: fork returned 0
both run this (pid 4242)`, why:`"before" prints once (before fork). Everything after fork runs in both processes. The order between parent and child lines depends on scheduling.`},
    {lv:'mid', title:'How many lines? Forks in a row', code:`int main(void) {
    fork();
    fork();
    fork();
    printf("hello\\n");
}`, out:`hello
hello
hello
hello
hello
hello
hello
hello`, why:`Each fork doubles the number of processes: 1 → 2 → 4 → 8. All 8 reach printf: 2³ = 8 lines.`},
    {lv:'adv', title:'Output redirection: why fork and exec are separate', code:`// what the shell does for:  ls > out.txt
pid_t pid = fork();
if (pid == 0) {
    int fd = open("out.txt", O_WRONLY | O_CREAT | O_TRUNC, 0644);
    dup2(fd, 1);          // make fd 1 (stdout) point to the file
    close(fd);
    execlp("ls", "ls", NULL);   // ls writes to fd 1 = out.txt, without knowing
}
waitpid(pid, NULL, 0);`, why:`The child rewires its own stdout between fork and exec. <code>ls</code> just writes to fd 1 as always. Pipes work the same way with <code>pipe()</code> and <code>dup2</code>.`},
  ],
  tips: {
    say:`"fork creates a copy of the calling process; it returns the child's pid to the parent and 0 to the child, and memory is shared copy-on-write. exec replaces the program in the current process, keeping the pid and open files, and doesn't return on success. wait lets the parent block until a child exits and reap it. Shells fork, set up redirections in the child, then exec the command."`,
    points:[`State all three return values of fork.`,`Explain what exec keeps and replaces.`,`Explain why they're separate (redirection).`],
    traps:[`Saying fork copies all memory immediately.`,`Forgetting wait → zombies.`],
    qa:[[`How many processes does fork(); fork(); create?`,`4 in total (the original plus 3 new). Generally n sequential forks give 2ⁿ processes.`],
        [`What does exec keep?`,`pid, parent pid, open file descriptors (unless marked close-on-exec), current directory, signal mask, resource limits. Signal handlers reset to default.`],
        [`Why might printf("x") before fork appear twice?`,`stdout's buffer (not yet flushed, no newline or redirected to a file) is copied into the child; both processes flush it at exit.`]]
  },
  exercises: [
    {lv:'E', q:`What does fork return in the child?`, ans:'0', hint:`The parent gets something else.`, answer:`<p>0. The parent gets the child's pid; -1 means failure.</p>`},
    {lv:'M', q:`How many times is "hi" printed?<pre class="sql">for (int i = 0; i < 4; i++) fork();
printf("hi\\n");</pre>`, ans:'16', hint:`Each iteration doubles the processes.`, answer:`<p>2⁴ = 16 processes, each prints once.</p>`},
    {lv:'H', q:`How many times is "x" printed?<pre class="sql">if (fork() && fork()) fork();
printf("x\\n");</pre>`, ans:'4', hint:`&& short-circuits: a child (return 0) stops evaluating.`, answer:`<p>Original: first fork → child A (gets 0, condition false, prints). Parent continues: second fork → child B (0, false, prints). Parent: both non-zero → third fork → child C. Parent and C print. Total: A, B, C, parent = 4.</p>`},
  ],
  quiz: [
    [`fork() returns in the parent…`,[`0`,`The child's pid`,`The parent's pid`,`-1 always`],1,`Child gets 0.`,'E'],
    [`After a successful exec, the code after the exec call…`,[`Runs once`,`Never runs`,`Runs in the parent`,`Runs twice`],1,`The program has been replaced.`,'E'],
    [`exec keeps the…`,[`Heap`,`Stack`,`Process ID and open file descriptors`,`Old code`],2,`Same process, new program.`,'M'],
    [`fork(); fork(); results in how many processes total?`,[`2`,`3`,`4`,`8`],2,`2² = 4.`,'E'],
    [`A parent that never calls wait leaves…`,[`Orphans`,`Zombies`,`Deadlocks`,`Threads`],1,`Exited children can't be fully removed.`,'M'],
    [`Copy-on-write fork means…`,[`All memory copied at fork`,`Pages are shared until one process writes, then copied`,`Nothing is shared`,`Only code is copied`],1,`Makes fork cheap.`,'M'],
  ],
  quizAdv: [
    [`printf("A"); fork(); with stdout redirected to a file prints A…`,[`Once`,`Twice`,`Never`,`Randomly`],1,`The unflushed buffer is duplicated.`,'H'],
    [`posix_spawn exists mainly because…`,[`fork is insecure`,`fork+exec is costly for large processes and on systems without MMU`,`exec is deprecated`,`It runs in the kernel`],1,`Avoids copying page tables.`,'H'],
    [`if (fork() || fork()) fork(); creates how many processes total?`,[`3`,`4`,`5`,`6`],2,`|| short-circuits in the parent; trace it: 5.`,'H'],
  ],
});
