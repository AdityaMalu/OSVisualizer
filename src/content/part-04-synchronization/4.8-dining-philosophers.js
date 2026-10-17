/* 4.8 Dining philosophers */
topic('4', { no:'4.8', title:'Dining philosophers',
idea:`Five philosophers, five forks, and each needs both neighbouring forks to eat. If everyone picks up their left fork at once, nobody can ever pick up a right one: deadlock. Watch it happen, then break it three ways: ordering forks, limiting diners, or picking up both at once.`,
actors:'Philosophers', dgTitle:'The table', stateTitle:'Fixes',
nodes:{
  p0:{x:240,y:30,label:'P0',w:56,h:34,kind:'actor'},
  p1:{x:390,y:110,label:'P1',w:56,h:34,kind:'actor'},
  p2:{x:330,y:240,label:'P2',w:56,h:34,kind:'actor'},
  p3:{x:150,y:240,label:'P3',w:56,h:34,kind:'actor'},
  p4:{x:90,y:110,label:'P4',w:56,h:34,kind:'actor'},
  f0:{x:330,y:60,label:'f0',w:40,h:26,kind:'lock'},
  f1:{x:385,y:185,label:'f1',w:40,h:26,kind:'lock'},
  f2:{x:240,y:255,label:'f2',w:40,h:26,kind:'lock'},
  f3:{x:95,y:185,label:'f3',w:40,h:26,kind:'lock'},
  f4:{x:150,y:60,label:'f4',w:40,h:26,kind:'lock'}
},
edges:[],
vb:'0 0 480 280',
codes:{a:`// philosopher i: left fork = i, right fork = (i + 1) % 5
void philosopher(int i) {
    while (true) {
        think();
        lock(fork[i]);              // pick up left
        lock(fork[(i + 1) % 5]);    // pick up right
        eat();
        unlock(fork[(i + 1) % 5]);
        unlock(fork[i]);
    }
}
// fix 1 (resource ordering): always lock the lower-numbered fork first
//   P4 locks fork 0 before fork 4 → no cycle
// fix 2: a semaphore lets at most 4 philosophers try at once
// fix 3: pick up both forks only when both are free (monitor, or try-lock + back off)`},
steps:[
{hl:{P0:[4,5]}, th:[['P0','RUN:ok','holds f0'],['P1','RUN:ok','thinking'],['P2','RUN:ok','thinking'],['P3','RUN:ok','thinking'],['P4','RUN:ok','thinking']], d:{on:['p0','f0'], e:[['f0','p0','held','ok']]}, g:[G('Fixes',['setup','5 philosophers, 5 forks, need 2 to eat'])],
 say:`Five philosophers sit at a round table with a fork between each pair. To eat, philosopher <i>i</i> needs fork <i>i</i> (left) and fork <i>i</i>+1 (right). Forks are locks. P0 gets hungry and picks up its left fork, f0.`},
{hl:{P0:[5],P1:[5],P2:[5],P3:[5],P4:[5]}, th:[['P0','RUN:ok','holds f0'],['P1','RUN:ok','holds f1'],['P2','RUN:ok','holds f2'],['P3','RUN:ok','holds f3'],['P4','RUN:ok','holds f4']], d:{on:['f0','f1','f2','f3','f4'], e:[['f0','p0','','ok'],['f1','p1','','ok'],['f2','p2','','ok'],['f3','p3','','ok'],['f4','p4','','ok']]}, g:[G('Fixes',['everyone','holds exactly one fork'])],
 say:`Unlucky timing: all five get hungry at once and each picks up their <b>left</b> fork. Every fork is now held by someone.`},
{hl:{P0:[6],P1:[6],P2:[6],P3:[6],P4:[6]}, th:[['P0','BLOCKED:bad','wants f1 (P1)'],['P1','BLOCKED:bad','wants f2 (P2)'],['P2','BLOCKED:bad','wants f3 (P3)'],['P3','BLOCKED:bad','wants f4 (P4)'],['P4','BLOCKED:bad','wants f0 (P0)']], d:{bad:['p0','p1','p2','p3','p4'], e:[['f0','p0','','ok'],['f1','p1','','ok'],['f2','p2','','ok'],['f3','p3','','ok'],['f4','p4','','ok'],['p0','f1','waits','bad'],['p1','f2','waits','bad'],['p2','f3','waits','bad'],['p3','f4','waits','bad'],['p4','f0','waits','bad']]}, g:[G('Deadlock',['circular wait','P0→P1→P2→P3→P4→P0','bad'],['hold and wait','each holds one, waits for one','bad'],['nobody','will ever eat','bad'])], log:['DEADLOCK'],
 say:`Each now reaches for the right fork, which their neighbour holds. P0 waits for P1, P1 for P2, … P4 for P0: a <b>cycle</b>. Nobody will ever release a fork. This is <b>deadlock</b>, and it involves all four Coffman conditions: mutual exclusion, hold-and-wait, no preemption, circular wait (Part 5).`},
{hl:{fix:[12,13]}, th:[['P0','RUN:ok','f0 then f1: eating'],['P1','BLOCKED:warn','waits for f1 (P0 is eating)'],['P2','RUN:ok','holds f2, f3: eating'],['P3','BLOCKED:warn','waits for f3'],['P4','BLOCKED:warn','tries f0 first: waits, holds nothing']], d:{ok:['p0','p2'], e:[['f0','p0','','ok'],['f1','p0','','ok'],['f2','p2','','ok'],['f3','p2','','ok'],['p4','f0','waits (holds nothing)','hot']]}, g:[G('Fixes',['resource ordering','lock lower-numbered fork first','ok'],['effect','P4 asks for f0 before f4 → no cycle can form','ok'])],
 say:`<b>Fix 1, resource ordering:</b> number the forks and always lock the lower-numbered one first. Everyone still picks left-then-right except P4, whose forks are 4 and 0: it must lock f0 first. P4 now waits for f0 <i>without holding f4</i>, so the cycle can't close. This is the general technique for avoiding lock-order deadlocks.`},
{hl:{fix:[14,15]}, th:[], d:null, g:[G('Fixes',['limit diners','semaphore(4): at most 4 reach for forks; one always gets both','ok'],['both or nothing','take both forks atomically (monitor) or try-lock and back off','ok'],['asymmetric','odd philosophers pick right first'],['beware','try-lock + retry without randomness can livelock','bad'])],
 say:`<b>Fix 2:</b> allow at most 4 philosophers at the table at once (a semaphore initialised to 4); with 5 forks and 4 diners, someone always gets two. <b>Fix 3:</b> pick up both forks only when both are free (inside a monitor), or try-lock the second and put the first down on failure, with a random back-off to avoid <b>livelock</b>.`},
{g:[G('Remember',['problem','deadlock from circular wait on shared resources'],['ordering','global lock order breaks circular wait','ok'],['limit','N−1 diners'],['atomic pickup','monitor / try-lock'],['also','starvation: fixing deadlock doesn\'t guarantee fairness'])],
 say:`<b>Say it:</b> "Each philosopher needs two shared forks; if all pick up their left fork simultaneously, each waits for the right one forever: a circular wait, so deadlock. Fixes: impose a global order on forks so the last philosopher picks up the lower-numbered fork first, which breaks the cycle; allow at most N−1 philosophers to try at once; or acquire both forks atomically, for example in a monitor or with try-lock and back-off. It's the textbook model for lock-ordering deadlocks in real code."`}
],
keep:[`All grab left fork → all wait for right → circular wait → deadlock.`,`Fix: global order (lower-numbered fork first).`,`Fix: at most N−1 philosophers try at once.`,`Fix: take both forks atomically / try-lock + random back-off.`,`Deadlock-free ≠ starvation-free.`]}, {
  imp: 'good',
  theory: TH(`The dining philosophers problem shows how processes that each hold one resource and wait for another can deadlock in a cycle, and how ordering or limiting resource acquisition prevents it.`,
`<p>Dijkstra's puzzle is a stand-in for any code that needs two locks: transferring money between two accounts, moving a file between two directories, merging two linked lists. Each operation locks one thing and then the other, and two operations in opposite directions can each hold what the other needs.</p>
<p>The solutions map directly to real-world practice: lock ordering (by account id, by address), limiting concurrency, or acquiring everything up front.</p>`,
[[`Deadlock`,`Set of threads each waiting for a resource another holds.`],[`Circular wait`,`A cycle in "who waits for whom".`],[`Resource ordering`,`Acquiring locks in a global agreed order.`],[`Try-lock`,`Attempt to acquire without blocking.`],[`Livelock`,`Threads keep reacting to each other without progress (e.g. all back off and retry in sync).`],[`Starvation`,`One philosopher never gets to eat although the system progresses.`]],
[`Model each fork as a lock and each philosopher as a thread.`,`Naive: lock left, lock right, eat, unlock both: deadlock-prone.`,`Ordered: lock min(left,right), then max(left,right).`,`Or gate entry with a semaphore initialised to N−1.`,`Or, under a monitor, eat only when both neighbours aren't eating.`],
[`Bank transfers lock accounts in id order to avoid deadlock.`,`Database lock ordering guidelines; Linux lockdep checks kernel lock order at run time.`,`Java's tryLock with timeout for multi-lock operations.`],
[`Assuming deadlock needs many threads (two is enough).`,`Try-lock retry loops without random back-off (livelock).`,`Fixing deadlock but starving one philosopher.`])
  ,
  examples: [
    {lv:'basic', title:'Three philosophers, naive: deadlock', sim:'race', input:`# 3 philosophers, forks f0 f1 f2; each locks left then right
shared: meals=0 f0=0 f1=0 f2=0
P0: lock f0; lock f1; unlock f1; unlock f0
P1: lock f1; lock f2; unlock f2; unlock f1
P2: lock f2; lock f0; unlock f0; unlock f2`, why:`The explorer finds schedules ending in DEADLOCK: each holds its left fork and waits for the right.`},
    {lv:'mid', title:'Same table, resource ordering: no deadlock', sim:'race', input:`# P2's forks are f2 and f0: lock the lower-numbered (f0) first
shared: meals=0 f0=0 f1=0 f2=0
P0: lock f0; lock f1; unlock f1; unlock f0
P1: lock f1; lock f2; unlock f2; unlock f1
P2: lock f0; lock f2; unlock f2; unlock f0`, why:`One line changed and every schedule completes. Lock ordering removes the possibility of a cycle.`},
    {lv:'adv', title:'Try-lock with back-off (Java)', code:`boolean eat(Lock left, Lock right) throws InterruptedException {
    while (true) {
        left.lock();
        try {
            if (right.tryLock(10, TimeUnit.MILLISECONDS)) {
                try { doEat(); return true; } finally { right.unlock(); }
            }
        } finally { left.unlock(); }                      // couldn't get right: put left down
        Thread.sleep(ThreadLocalRandom.current().nextInt(5, 20));   // random back-off avoids livelock
    }
}`, why:`Never waits while holding a fork indefinitely, so no deadlock. Without the random sleep, all philosophers could retry in lockstep forever (livelock).`},
  ],
  tips: {
    say:`"Five philosophers share five forks and each needs two. If all grab their left fork at once, each waits forever for the right one: a circular wait, so deadlock. I'd break it with a global lock order, so one philosopher picks up the lower-numbered fork first; or by allowing only N−1 to try at once; or by acquiring both forks atomically or with try-lock and random back-off. The same fix, ordering locks by id, prevents deadlocks in money transfers."`,
    points:[`Explain the cycle.`,`Give at least two fixes and why they work.`,`Mention livelock and starvation.`],
    traps:[`Saying 'add a timeout' without addressing livelock.`,`Claiming the ordering fix also guarantees fairness.`],
    qa:[[`Why does limiting to N−1 philosophers work?`,`Pigeonhole: N−1 philosophers and N forks means at least one philosopher can get both forks, finish, and release them.`],
        [`What's livelock here?`,`Everyone picks up the left fork, fails to get the right, puts it down, and retries in perfect sync, forever. Random back-off breaks the symmetry.`],
        [`How does this relate to bank transfers?`,`transfer(a, b) locks a then b; transfer(b, a) locks b then a: same cycle. Lock min(id) first.`]]
  },
  exercises: [
    {lv:'E', q:`Naive 3-philosopher version: can it deadlock? (yes/no)`, sim:'race', key:'deadlock', input:`shared: meals=0 f0=0 f1=0 f2=0
P0: lock f0; lock f1; unlock f1; unlock f0
P1: lock f1; lock f2; unlock f2; unlock f1
P2: lock f2; lock f0; unlock f0; unlock f2`, hint:`Everyone takes their first lock first.`, answer:`<p>Yes.</p>`},
    {lv:'M', q:`With P2 reordered to take f0 first, can it deadlock? (yes/no)`, sim:'race', key:'deadlock', input:`shared: meals=0 f0=0 f1=0 f2=0
P0: lock f0; lock f1; unlock f1; unlock f0
P1: lock f1; lock f2; unlock f2; unlock f1
P2: lock f0; lock f2; unlock f2; unlock f0`, hint:`Can a cycle form?`, answer:`<p>No.</p>`},
    {lv:'H', q:`With 5 philosophers and a semaphore limiting the table to k philosophers at once, what is the largest k that still guarantees no deadlock?`, ans:'4', hint:`Pigeonhole principle.`, answer:`<p>k = 4 (N−1). With 4 diners and 5 forks someone always gets two.</p>`},
  ],
  quiz: [
    [`The naive dining philosophers solution can…`,[`Never fail`,`Deadlock when all pick up their left fork`,`Only starve`,`Crash the OS`],1,`Circular wait.`,'E'],
    [`Resource ordering prevents deadlock by breaking…`,[`Mutual exclusion`,`Circular wait`,`Preemption`,`Fairness`],1,`No cycle possible.`,'E'],
    [`With 5 forks, allowing at most how many philosophers to try at once avoids deadlock?`,[`5`,`4`,`2`,`1 only`],1,`N−1.`,'E'],
    [`Try-lock + immediate retry by everyone can cause…`,[`Deadlock`,`Livelock`,`Page faults`,`Priority inversion`],1,`Busy but no progress.`,'M'],
    [`The problem models…`,[`Disk scheduling`,`Processes needing multiple shared resources`,`Paging`,`Booting`],1,`Multi-lock acquisition.`,'M'],
    [`A deadlock-free solution may still allow…`,[`Mutual exclusion violations`,`Starvation of one philosopher`,`Two philosophers sharing a fork`,`Nothing bad`],1,`Fairness is separate.`,'M'],
  ],
  quizAdv: [
    [`Linux lockdep…`,[`Prevents all deadlocks`,`Detects lock-order violations that could deadlock, at run time`,`Is a scheduler`,`Is a file system`],1,`Validates ordering.`,'H'],
    [`Odd philosophers pick right first, even pick left first. This…`,[`Deadlocks`,`Avoids deadlock (asymmetry breaks the cycle)`,`Causes livelock`,`Needs a semaphore`],1,`Asymmetric solution.`,'H'],
    [`Chandy/Misra's solution uses…`,[`A waiter`,`Dirty/clean forks passed by request`,`Timestamps only`,`Spinlocks`],1,`Distributed solution.`,'H'],
  ],
});
