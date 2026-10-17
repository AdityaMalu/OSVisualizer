/* 5.3 Deadlock avoidance: the Banker's algorithm */
topic('5', { no:'5.3', title:'Deadlock avoidance: safe states and the Banker\'s algorithm',
idea:`Avoidance lets processes request resources freely but grants a request only if the system stays in a <b>safe state</b>, one where some order lets everyone finish. Run the Banker's safety algorithm on Galvin's classic 5-process example, then evaluate two requests: one granted, one refused.`,
actors:'Processes', tbTitle:'Matrices', stateTitle:'Work vector',
codes:{a:`// n processes, m resource types
Available[m]; Max[n][m]; Allocation[n][m];
Need[i][j] = Max[i][j] - Allocation[i][j];

bool safe(void) {
    Work = Available;  Finish[*] = false;
    while (exists i: !Finish[i] && Need[i] <= Work) {
        Work += Allocation[i];      // i can finish and give back what it holds
        Finish[i] = true;
    }
    return all Finish;
}
bool request(int i, int Req[m]) {
    if (Req > Need[i]) error();  if (Req > Available) wait();
    pretend: Available -= Req; Allocation[i] += Req; Need[i] -= Req;
    if (safe()) grant(); else { undo(); wait(); }
}`},
steps:[
{hl:{alg:[2,3]}, tb:[TB('state (resources A B C, total 10 5 7)',['proc','allocation','max','need = max − alloc'],[['P0','0 1 0','7 5 3','7 4 3'],['P1','2 0 0','3 2 2','1 2 2'],['P2','3 0 2','9 0 2','6 0 0'],['P3','2 1 1','2 2 2','0 1 1'],['P4','0 0 2','4 3 3','4 3 1']])], g:[G('Work vector',['Available','3 3 2','hot'])],
 say:`Each process declares its <b>maximum</b> need up front. From the current <b>allocation</b> we get <b>need = max − allocation</b>: what each might still ask for. Available is 3 3 2. Question: is this state <b>safe</b>, i.e. is there an order in which every process can get its remaining need, finish and release everything?`},
{hl:{alg:[6,7,8,9]}, tb:[TB('safety run',['step','candidate','need ≤ work?','work after'],[['1','P0: 7 4 3','no (7 > 3)','3 3 2'],['2','P1: 1 2 2','yes','3 3 2 + 2 0 0 = 5 3 2']],{1:'ok'})], g:[G('Work vector',['Work','5 3 2','hot'],['finished','P1'])],
 say:`Start with Work = Available = 3 3 2 and look for a process whose need fits. P0 needs 7 4 3: no. P1 needs 1 2 2 ≤ 3 3 2: <b>yes</b>. Assume P1 gets it, finishes and returns its allocation 2 0 0: Work becomes 5 3 2. (Rule used here: after each success, rescan from P0.)`},
{tb:[TB('safety run',['step','candidate','need ≤ work?','work after'],[['3','P0: 7 4 3','no','5 3 2'],['4','P2: 6 0 0','no (6 > 5)','5 3 2'],['5','P3: 0 1 1','yes','5 3 2 + 2 1 1 = 7 4 3'],['6','P0: 7 4 3','yes','7 4 3 + 0 1 0 = 7 5 3']],{2:'ok',3:'ok'})], g:[G('Work vector',['Work','7 5 3','hot'],['finished','P1, P3, P0'])],
 say:`Rescan: P0 still doesn't fit, P2 needs 6 A but only 5 are available, P3 needs 0 1 1: yes, Work = 7 4 3. Now P0's 7 4 3 fits exactly: Work = 7 5 3.`},
{tb:[TB('safety run',['step','candidate','need ≤ work?','work after'],[['7','P2: 6 0 0','yes','10 5 5'],['8','P4: 4 3 1','yes','10 5 7']],{0:'ok',1:'ok'})], g:[G('Work vector',['Work','10 5 7 (everything returned)','ok'],['safe sequence','P1 → P3 → P0 → P2 → P4','ok'])],
 say:`P2 (6 0 0) and then P4 (4 3 1) both fit. Everyone can finish: the state is <b>safe</b> with safe sequence <b>P1, P3, P0, P2, P4</b>. Other safe sequences may exist; one is enough. A safe state can never deadlock, because the OS can always run processes in that order.`},
{hl:{alg:[13,14,15,16]}, tb:[TB('request: P1 asks for 1 0 2',['check','result'],[['request ≤ need (1 2 2)?','yes'],['request ≤ available (3 3 2)?','yes'],['pretend: available','2 3 0'],['safety run','P1 → P3 → P0 → P2 → P4: SAFE'],['decision','GRANT','ok']],{4:'ok'})], g:[G('Work vector',['Available after grant','2 3 0'])],
 say:`Now P1 <b>requests</b> 1 0 2. It's within its declared need and currently available, so the OS <b>pretends</b> to grant it (available 2 3 0, P1's need 0 2 0) and runs the safety algorithm on that hypothetical state. It's still safe, so the request is <b>granted</b>.`},
{tb:[TB('request: P0 asks for 0 2 0 (after P1\'s grant)',['check','result'],[['request ≤ need (7 4 3)?','yes'],['request ≤ available (2 3 0)?','yes'],['pretend: available','2 1 0'],['safety run','nobody\'s need fits 2 1 0: UNSAFE','bad'],['decision','DENY: P0 waits','bad']],{3:'bad',4:'bad'})], g:[G('Work vector',['Available stays','2 3 0'])],
 say:`Then P0 asks for 0 2 0. Resources <i>are</i> available, but after pretending, available would be 2 1 0 and no process's remaining need fits: <b>unsafe</b>. Unsafe doesn't mean deadlocked yet, only that deadlock <i>could</i> happen. Banker's plays it safe: <b>deny</b>, P0 waits even though the resources are free.`},
{tb:[], g:[G('Pros and cons',['guarantee','never deadlocks','ok'],['needs','max demands declared up front','bad'],['needs','fixed number of processes and resources','bad'],['cost','O(m·n²) per request','bad'],['used in','rarely in general OSes; ideas appear in admission control'])],
 say:`<b>Say it:</b> "Avoidance grants a request only if the resulting state is safe, meaning there exists an order in which every process can obtain its maximum remaining need, finish and release its resources. The Banker's algorithm computes need = max − allocation, then repeatedly finds a process whose need fits in the available work vector, adds back its allocation, and checks that all can finish. It never deadlocks, but it needs maximum demands in advance and costs O(m·n²) per request, so general-purpose OSes rarely use it."`}
],
keep:[`Need = Max − Allocation.`,`Safe state: some order lets everyone finish. Safe ⇒ no deadlock.`,`Safety: Work = Available; find need ≤ Work; Work += alloc; repeat.`,`Request: check ≤ need, ≤ available, pretend, run safety, grant or wait.`,`Unsafe ≠ deadlocked (but might become one).`]}, {
  imp: 'must',
  theory: TH(`Deadlock avoidance grants resource requests only when the system stays in a safe state; the Banker's algorithm checks safety by simulating whether every process could finish in some order.`,
`<p>A banker has limited cash and several customers with credit lines (their maximum need). The banker lends money only if, even if every customer later draws their full credit line, there's an order in which the banker can satisfy them one at a time, each repaying their whole loan when done. If a loan would make that impossible, the customer waits.</p>
<p>Avoidance is more flexible than prevention (processes request freely) but needs knowledge prevention doesn't: each process's maximum demand. That's why it shows up in exams and specialised systems more than in Linux.</p>`,
[[`Safe state`,`A state with at least one safe sequence.`],[`Safe sequence`,`Order in which every process can get its remaining need and finish.`],[`Unsafe state`,`No safe sequence exists; deadlock may happen.`],[`Available`,`Free instances of each resource type.`],[`Max`,`Declared maximum demand per process.`],[`Allocation`,`Currently held.`],[`Need`,`Max − Allocation.`],[`Work vector`,`Running total of available resources in the safety algorithm.`]],
[`Compute Need = Max − Allocation.`,`Work = Available; Finish = all false.`,`Find an unfinished process with Need ≤ Work; if none, stop.`,`Work += its Allocation; mark it finished; repeat.`,`If every process finished, the state is safe.`,`For a request: validate, pretend to allocate, run safety, grant only if safe.`],
[`Admission control (e.g. Linux SCHED_DEADLINE refusing a task that would overload the CPU) uses the same "only admit if still feasible" idea.`,`Exam and interview favourite: be fluent with the matrices.`,`Cluster schedulers reserving capacity for declared peak demands.`],
[`Forgetting to subtract the request from Need when pretending.`,`Treating unsafe as deadlocked.`,`Comparing vectors element-wise incorrectly (all components must fit).`])
  ,
  examples: [
    {lv:'basic', title:'Galvin\'s example: is it safe?', sim:'banker', input:`resources: A B C
available: 3 3 2
# proc  allocation | max
P0 0 1 0 | 7 5 3
P1 2 0 0 | 3 2 2
P2 3 0 2 | 9 0 2
P3 2 1 1 | 2 2 2
P4 0 0 2 | 4 3 3`, why:`Safe, with sequence P1, P3, P0, P2, P4 (rescanning from P0 after each success). The second table shows each step of the work vector.`},
    {lv:'mid', title:'A request that is granted', sim:'banker', input:`resources: A B C
available: 3 3 2
P0 0 1 0 | 7 5 3
P1 2 0 0 | 3 2 2
P2 3 0 2 | 9 0 2
P3 2 1 1 | 2 2 2
P4 0 0 2 | 4 3 3
request: P1 1 0 2`, why:`Within P1's need and currently available; the pretend state is still safe, so it's granted. Try <code>request: P4 3 3 0</code>: available, but unsafe, so denied.`},
    {lv:'adv', title:'Single resource type, unsafe', sim:'banker', input:`resources: tape
available: 2
P0 5 | 10
P1 2 | 4
P2 3 | 9`, why:`12 tapes in total, 2 free. Only P1 can finish (needs 2), returning 2 for 4 free; then P0 needs 5 and P2 needs 6: stuck. Unsafe. With P2 holding 2 instead of 3 (available 3) it would be safe: P1, P0, P2.`},
  ],
  tips: {
    say:`"Deadlock avoidance only grants requests that keep the system in a safe state, one where some ordering lets every process obtain its maximum remaining need, finish and release. The Banker's algorithm computes need as max minus allocation, then simulates: find a process whose need fits in the available work vector, add its allocation back, repeat; if all can finish it's safe. A request is granted only if the pretend state is safe. It needs maximum demands in advance and is O(m·n²), so it's rare in general-purpose OSes."`,
    points:[`Define safe state and safe sequence.`,`Walk the safety algorithm.`,`Request handling: pretend, check, grant or wait.`],
    traps:[`Saying unsafe means deadlocked.`,`Forgetting to update Need on pretend allocation.`],
    qa:[[`Why is unsafe not the same as deadlocked?`,`Processes may not actually request their full maximum; unsafe means the OS can no longer guarantee completion, not that a cycle exists now.`],
        [`Why isn't Banker's used in Linux?`,`Processes don't declare maximum needs, the set of processes changes constantly, and running safety on every lock or allocation would be far too slow.`],
        [`Prevention vs avoidance?`,`Prevention restricts how requests can be made (static rules); avoidance allows any requests but decides dynamically, using knowledge of future maximum demands.`]]
  },
  exercises: [
    {lv:'E', q:`What is P4's Need vector? (three numbers)`, sim:'banker', key:'need.P4', input:`resources: A B C
available: 3 3 2
P0 0 1 0 | 7 5 3
P1 2 0 0 | 3 2 2
P2 3 0 2 | 9 0 2
P3 2 1 1 | 2 2 2
P4 0 0 2 | 4 3 3`, hint:`Max − Allocation.`, answer:`<p>4 3 3 − 0 0 2 = 4 3 1.</p>`},
    {lv:'M', q:`Is this state safe? If so, give the safe sequence found by always picking the lowest-numbered process that can finish (e.g. <code>P1 P0 P2</code>); otherwise answer <code>none</code>.`, sim:'banker', key:'sequence', input:`resources: A B
available: 1 1
P0 1 0 | 2 1
P1 0 1 | 1 2
P2 1 1 | 3 3`, hint:`Needs: P0 1 1, P1 1 1, P2 2 2.`, answer:`<p>Work 1 1: P0 fits → 2 1; P1 fits → 2 2; P2 fits → 3 3. Sequence P0 P1 P2.</p>`},
    {lv:'H', q:`After P1's request of 1 0 2 has been granted (available 2 3 0), P0 requests 0 2 0. Is it granted? (yes/no)`, sim:'banker', key:'granted', input:`resources: A B C
available: 2 3 0
P0 0 1 0 | 7 5 3
P1 3 0 2 | 3 2 2
P2 3 0 2 | 9 0 2
P3 2 1 1 | 2 2 2
P4 0 0 2 | 4 3 3
request: P0 0 2 0`, hint:`Pretend, then look for any process whose need fits 2 1 0.`, answer:`<p>No: the pretend state is unsafe (no need fits 2 1 0), so P0 waits.</p>`},
  ],
  quiz: [
    [`Need equals…`,[`Max + Allocation`,`Max − Allocation`,`Available − Max`,`Allocation − Available`],1,`Remaining claim.`,'E'],
    [`A safe state guarantees…`,[`Deadlock`,`That all processes can finish in some order`,`No waiting`,`Maximum throughput`],1,`At least one safe sequence.`,'E'],
    [`An unsafe state…`,[`Is always deadlocked`,`May lead to deadlock`,`Is impossible`,`Is always safe later`],1,`No guarantee.`,'E'],
    [`The Banker's algorithm requires processes to…`,[`Run in order`,`Declare their maximum resource needs in advance`,`Use one resource`,`Never wait`],1,`Key assumption.`,'M'],
    [`When a request leads to an unsafe state, Banker's…`,[`Grants it`,`Makes the process wait`,`Kills the process`,`Reboots`],1,`Even if resources are free.`,'M'],
    [`Time complexity of the safety algorithm is about…`,[`O(1)`,`O(n)`,`O(m·n²)`,`O(2ⁿ)`],2,`n processes, m resource types.`,'M'],
  ],
  quizAdv: [
    [`In the safety algorithm, when a process can finish we add to Work its…`,[`Need`,`Max`,`Allocation`,`Request`],2,`It returns what it holds.`,'H'],
    [`Avoidance differs from prevention because it…`,[`Breaks a Coffman condition statically`,`Decides dynamically per request using future maximum needs`,`Detects cycles after the fact`,`Ignores deadlocks`],1,`Dynamic.`,'H'],
    [`If a request exceeds the process's declared Need, Banker's…`,[`Waits`,`Raises an error`,`Grants it`,`Recomputes Max`],1,`It lied about its maximum.`,'H'],
  ],
});
