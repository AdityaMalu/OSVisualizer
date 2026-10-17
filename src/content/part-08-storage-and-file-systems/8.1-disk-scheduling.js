/* 8.1 Disk structure and disk scheduling */
topic('8', { no:'8.1', title:'Disk structure and disk scheduling (FCFS, SSTF, SCAN, LOOK)',
idea:`On a spinning disk, moving the head is the slow part. Service the classic request queue (98, 183, 37, 122, 14, 124, 65, 67, head at 53) with FCFS, shortest-seek-first, the elevator (SCAN) and its circular and LOOK variants, and compare total head movement. Then see why SSDs change the picture.`,
actors:'Disk head', tbTitle:'Total head movement', stateTitle:'Disk',
codes:{a:`access time = seek (move head) + rotational latency + transfer
            ≈ 4–10 ms     + ≈ 2–4 ms (half a turn)   + tiny

FCFS:   serve in arrival order
SSTF:   serve the closest request next (can starve far requests)
SCAN:   sweep to one end serving requests, then reverse ("elevator")
C-SCAN: sweep one way to the end, jump back to the start, sweep again
LOOK / C-LOOK: like SCAN / C-SCAN but turn at the last request, not the disk edge`},
steps:[
{hl:{d:[1,2]}, th:[['head','RUN:ok','at cylinder 53']], tb:[TB('request queue (cylinders 0–199)',['order','cylinder'],[['1','98'],['2','183'],['3','37'],['4','122'],['5','14'],['6','124'],['7','65'],['8','67']])], g:[G('Disk',['seek','moving the arm between cylinders: dominant cost','hot'],['rotation','7200 rpm → 4.2 ms average'],['goal','minimise total head movement'])],
 say:`A hard disk has platters, tracks and an arm that moves across <b>cylinders</b>. Reading a block costs <b>seek</b> time (move the arm), <b>rotational latency</b> (wait for the sector to come round) and a tiny transfer. Seeks dominate, so the OS reorders pending requests to reduce head movement. Head at 53, eight pending requests.`},
{hl:{d:[4]}, tb:[TB('total head movement',['algorithm','order','cylinders moved'],[['FCFS','98 183 37 122 14 124 65 67','640']],{0:'bad'})], g:[G('Disk',['FCFS','fair, but zig-zags across the disk','bad'])],
 say:`<b>FCFS</b> serves requests in arrival order: 53 → 98 → 183 → 37 → 122 → 14 → … The head swings back and forth across the whole disk: <b>640</b> cylinders. Fair and simple, but wasteful.`},
{hl:{d:[5]}, tb:[TB('total head movement',['algorithm','order','cylinders moved'],[['FCFS','…','640'],['SSTF','65 67 37 14 98 122 124 183','236']],{1:'ok'})], g:[G('Disk',['SSTF','always the nearest next','ok'],['risk','requests far away can starve if new nearby ones keep coming','bad'])],
 say:`<b>Shortest seek time first</b> always serves the nearest pending request: 65, 67, then 37 and 14 (closer than 98), then out to 183. <b>236</b> cylinders. Much better, but like SJF it can <b>starve</b> requests at the far end if new nearby requests keep arriving, and it isn't optimal.`},
{hl:{d:[6]}, tb:[TB('total head movement',['algorithm','order','cylinders moved'],[['FCFS','…','640'],['SSTF','…','236'],['SCAN (moving down)','37 14 → 0 → 65 67 98 122 124 183','236']],{2:'ok'})], g:[G('Disk',['SCAN','elevator: sweep one way, then back','ok'],['bounded wait','every request served within two sweeps','ok'])],
 say:`<b>SCAN</b>, the elevator algorithm: move in one direction serving everything on the way to the end of the disk, then reverse. Moving down from 53: 37, 14, all the way to cylinder 0, then up: 65 … 183. 236 cylinders here, and no starvation: every request is reached within two sweeps.`},
{hl:{d:[7,8]}, tb:[TB('total head movement',['algorithm','order','cylinders moved'],[['SCAN (down)','… → 0 → …','236'],['LOOK (down)','37 14 65 67 98 122 124 183','208'],['C-SCAN (up)','65…183 → 199, jump → 0, 14 37','382 (183 without the jump)'],['C-LOOK (up)','65…183, jump → 14, 37','322']],{1:'ok'})], g:[G('Disk',['LOOK','turn around at the last request instead of the disk edge','ok'],['C-SCAN / C-LOOK','one direction only: more uniform waiting times'],['counting the return jump','conventions differ: state yours'])],
 say:`<b>LOOK</b> reverses at the last request instead of going all the way to cylinder 0: 208. <b>C-SCAN</b> serves in one direction only, then jumps back to the start; requests at both ends wait about equally long. Textbooks differ on whether the return jump counts as head movement (here: 382 with it, 183 without), so always state your convention. <b>C-LOOK</b> jumps only to the lowest pending request.`},
{tb:[], th:[], g:[G('Today',['HDD','NCQ: the drive itself reorders up to 32 commands'],['SSD','no seek: position doesn\'t matter; Linux uses none / mq-deadline','ok'],['Linux schedulers','mq-deadline, BFQ (fairness), kyber, none'],['still relevant','fairness, deadlines, merging adjacent requests'])],
 say:`<b>Say it:</b> "Disk access time is dominated by seek time, so the OS orders requests to minimise head movement. FCFS is fair but zig-zags; SSTF serves the nearest request, cutting movement but risking starvation; SCAN sweeps like an elevator to the end and back with bounded waiting; C-SCAN sweeps one way and jumps back for more uniform waits; LOOK and C-LOOK turn at the last request. On SSDs there's no seek, so simple FIFO-like schedulers that focus on fairness and merging are used."`}
],
keep:[`Access = seek + rotational latency + transfer; seek dominates on HDDs.`,`FCFS 640, SSTF 236, SCAN 236 (down), LOOK 208 for the classic queue.`,`SSTF can starve; SCAN/LOOK bound waiting.`,`C-SCAN/C-LOOK: one direction, uniform waits; state whether the jump counts.`,`SSDs: no seek → none/mq-deadline schedulers.`]}, {
  imp: 'good',
  theory: TH(`Disk scheduling orders pending block requests to reduce mechanical head movement on hard disks; elevator-style algorithms balance seek time and fairness.`,
`<p>A lift (elevator) in a tall building doesn't go to floors in the order buttons were pressed; it keeps going up, stopping where people want, then comes back down. Going strictly in press order (FCFS) would send it up and down constantly; always going to the nearest call (SSTF) might leave someone on the top floor waiting forever.</p>
<p>These algorithms are classic exam material. On modern SSDs the mechanics vanish, but the same ideas (batching, fairness, deadlines) live on in I/O schedulers and in the drives' own command queues.</p>`,
[[`Seek time`,`Time to move the arm to the target cylinder.`],[`Rotational latency`,`Waiting for the sector to rotate under the head.`],[`Cylinder`,`The set of tracks at one arm position.`],[`SSTF`,`Shortest seek time first.`],[`SCAN (elevator)`,`Sweep to the end and back.`],[`C-SCAN`,`Sweep one way, return to the start.`],[`LOOK / C-LOOK`,`Turn at the last pending request.`],[`NCQ`,`Native command queuing: the drive reorders commands itself.`]],
[`Collect pending requests (cylinder numbers).`,`Start from the current head position and direction.`,`Pick the next request according to the algorithm.`,`Add the distance moved; repeat until the queue is empty.`],
[`Linux I/O schedulers: mq-deadline, BFQ, kyber, none (cat /sys/block/sda/queue/scheduler).`,`Databases lay out data sequentially to avoid seeks on HDDs.`,`SSDs care about queue depth and write amplification instead of seek distance.`],
[`Not stating whether SCAN goes to the disk edge or C-SCAN's jump counts.`,`Forgetting the initial head position.`,`Applying HDD reasoning to SSDs.`])
  ,
  examples: [
    {lv:'basic', title:'Galvin\'s queue', sim:'disk', input:`algo: FCFS
head: 53
cylinders: 200
requests: 98 183 37 122 14 124 65 67`, why:`640 cylinders. Switch to SSTF (236), SCAN with <code>direction: down</code> (236), LOOK (208). The chart plots the head's path.`},
    {lv:'mid', title:'Direction matters for SCAN', sim:'disk', input:`algo: SCAN
head: 53
direction: up         # try down
cylinders: 200
requests: 98 183 37 122 14 124 65 67`, why:`Moving up first: 331 cylinders (to 199 and back to 14). Moving down first: 236. Exam questions always specify the initial direction.`},
    {lv:'adv', title:'C-SCAN: does the return count?', sim:'disk', input:`algo: C-SCAN
head: 53
direction: up
jump: count           # try: skip
cylinders: 200
requests: 98 183 37 122 14 124 65 67`, why:`382 cylinders if the return from 199 to 0 counts, 183 if it doesn't. Both conventions appear in textbooks; the jump is a fast seek with no reads.`},
  ],
  tips: {
    say:`"On hard disks seek time dominates, so the scheduler reorders requests. FCFS is fair but zig-zags; SSTF picks the nearest request, giving low movement but possible starvation; SCAN sweeps to the end and back like an elevator, bounding waiting time; C-SCAN only serves in one direction and jumps back for uniform waits; LOOK variants turn around at the last request. SSDs have no seek, so Linux uses none or mq-deadline there."`,
    points:[`Trace at least one algorithm with numbers.`,`Starvation in SSTF; fairness in SCAN/C-SCAN.`,`State conventions (direction, jump).`],
    traps:[`Calling SSTF optimal.`,`Ignoring SSDs.`],
    qa:[[`Why is C-SCAN fairer than SCAN?`,`With SCAN, requests just behind the head wait for a full round trip while those in the middle get served twice per cycle; C-SCAN treats the disk as circular so waiting times are more uniform.`],
        [`Why do SSDs not need these algorithms?`,`There's no mechanical arm; any block costs about the same to reach. What matters is parallelism across flash channels and avoiding small random writes.`],
        [`What is NCQ?`,`The drive accepts many outstanding commands and reorders them itself using exact knowledge of head and rotational position.`]]
  },
  exercises: [
    {lv:'E', q:`Total head movement with SSTF?`, sim:'disk', key:'total', input:`algo: SSTF
head: 50
cylinders: 200
requests: 82 170 43 140 24 16 190`, hint:`Nearest first: 43, 24, 16, then outward.`, answer:`<p>50→43→24→16 (34), then 16→82→140→170→190 (174): 208.</p>`},
    {lv:'M', q:`Same queue with LOOK, moving up first: total head movement?`, sim:'disk', key:'total', input:`algo: LOOK
head: 50
direction: up
cylinders: 200
requests: 82 170 43 140 24 16 190`, hint:`Up to 190, then down to 16.`, answer:`<p>(190 − 50) + (190 − 16) = 140 + 174 = 314.</p>`},
    {lv:'H', q:`C-LOOK, moving up, jump counted: give the service order (cylinders separated by spaces).`, sim:'disk', key:'order', input:`algo: C-LOOK
head: 50
direction: up
cylinders: 200
requests: 82 170 43 140 24 16 190`, hint:`Up to 190, jump to the lowest request, continue upward.`, answer:`<p>82 140 170 190 16 24 43 (total 341 with the jump).</p>`},
  ],
  quiz: [
    [`The dominant cost of a random HDD access is usually…`,[`Transfer time`,`Seek time`,`CPU time`,`Interrupt time`],1,`Moving the arm.`,'E'],
    [`SSTF can cause…`,[`Deadlock`,`Starvation of far requests`,`Belady's anomaly`,`Thrashing`],1,`Like SJF.`,'E'],
    [`SCAN is also called…`,[`Round robin`,`The elevator algorithm`,`Clock`,`Buddy`],1,`Sweep and reverse.`,'E'],
    [`LOOK differs from SCAN by…`,[`Serving randomly`,`Reversing at the last request instead of the disk end`,`Only going up`,`Using priorities`],1,`No wasted travel.`,'M'],
    [`C-SCAN gives more uniform waiting times because…`,[`It's faster`,`It serves in one direction and treats the disk as circular`,`It uses SSTF`,`It ignores far requests`],1,`Fairness.`,'M'],
    [`For SSDs, Linux typically uses…`,[`SSTF`,`none or mq-deadline`,`SCAN`,`C-LOOK`],1,`No seek to optimise.`,'M'],
  ],
  quizAdv: [
    [`Galvin's queue (53; 98 183 37 122 14 124 65 67) under FCFS moves…`,[`236`,`640`,`208`,`382`],1,`Zig-zag.`,'H'],
    [`Average rotational latency at 7200 rpm is about…`,[`0.42 ms`,`4.2 ms`,`42 ms`,`8.3 ms`],1,`Half of 8.33 ms per revolution.`,'H'],
    [`BFQ is a Linux I/O scheduler focused on…`,[`Maximum throughput only`,`Fair bandwidth per process / low latency for interactive I/O`,`SSD wear`,`RAID`],1,`Budget fair queueing.`,'H'],
  ],
});
