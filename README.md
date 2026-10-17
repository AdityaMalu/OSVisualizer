# OS Concepts Stepper

Step-by-step visual walkthroughs of operating system concepts, from system calls to containers. Each step highlights the code and shows the processes and their states, Gantt timelines, page tables, frames, diagrams and key facts, and explains what's happening. Every topic also has theory, examples that build from simple to complex, interview tips, auto-checked exercises and a quiz.

| Part | Topics |
|---|---|
| 0. Foundations | what an OS does, user/kernel mode and system calls, interrupts and exceptions, kernel architectures, booting |
| 1. Processes | process and PCB, address-space layout, process states, fork/exec/wait, zombies/orphans/signals, context switching, IPC |
| 2. Threads and concurrency | threads vs processes, user vs kernel threads (1:1, N:1, M:N, virtual threads), concurrency vs parallelism, thread pools, Amdahl's law |
| 3. CPU scheduling | criteria and FCFS, SJF/SRTF, priority and aging, round robin, MLFQ, Linux CFS and multicore, real-time (RM, EDF) |
| 4. Synchronization | race conditions, Peterson and atomics (TAS, CAS), mutexes and spinlocks, semaphores, monitors and condition variables, producer–consumer, readers–writers, dining philosophers |
| 5. Deadlocks | the four conditions and resource-allocation graphs, prevention, avoidance (Banker's algorithm), detection and recovery, livelock/starvation/priority inversion |
| 6. Memory management | logical vs physical addresses and the MMU, contiguous allocation and fragmentation, paging, TLB and effective access time, multi-level/inverted page tables, segmentation, buddy and slab allocators |
| 7. Virtual memory | demand paging and page faults, FIFO/OPT/LRU and Belady's anomaly, clock, thrashing and working sets, copy-on-write and mmap |
| 8. Storage and file systems | disk scheduling, files/directories/inodes, allocation methods, hard and soft links, journaling, RAID and SSDs |
| 9. I/O | polling/interrupts/DMA, blocking/non-blocking/async I/O and epoll, page cache and fsync |
| 10. Virtualization and real-world scenarios | VMs and hypervisors, containers (namespaces, cgroups), what happens when you run a program, debugging a slow machine |

That's 59 topics. Every topic page has these sections, in this order:

1. **Theory: start here**: the idea in one sentence, a plain-language explanation with an analogy, key terms, how it works, how it shows up in real systems, and common mistakes.
2. **Visual walkthrough**: step through it (← → keys, or Play). It highlights the code and shows processes and their states, Gantt charts, tables, diagrams and key facts.
3. **Examples: simple → complex**: at least three per topic, tagged Basic, Intermediate or Advanced. Many run in one of seven **OS simulators** in your browser, and you can edit the input and run again.
4. **Interview tips**: a 30-second answer, what interviewers listen for, traps and red flags, and follow-up questions with answers hidden until you open them.
5. **Exercises**: at least three per topic. Answers are **checked automatically**; for simulator exercises the expected answer is computed by the simulator from the exercise's input, so the answer key can't drift. Hints and solutions stay hidden until you ask. The site remembers which exercises you've finished.
6. **Quiz**: each try draws questions from a hidden bank for the topic (Core and Advanced sets, levels Easy/Medium/Hard), with the answer order shuffled. Your best scores are kept in the browser.

In total: 177 examples, 178 exercises and 531 quiz questions. Every topic is tagged must-know, good to know, or beyond interviews; the **Interview focus** filter shows only the topics you need.

## The simulators

All pure JavaScript in `src/engine/sims.js`, each reading a small text format you can edit:

| Simulator | What it does | Example input |
|---|---|---|
| `sched` | CPU scheduling: FCFS, SJF, SRTF, PRIO, PRIO-P, RR, HRRN, MLFQ (with boost). Gantt chart, per-process completion/turnaround/waiting/response, averages. | `algo: RR` · `quantum: 4` · `P1 0 24` |
| `page` | Page replacement: FIFO, LRU, OPT, CLOCK, LFU, MRU. Frame table per reference, faults, hit ratio. | `algo: LRU` · `frames: 3` · `refs: 7 0 1 2 …` |
| `disk` | Disk scheduling: FCFS, SSTF, SCAN, C-SCAN, LOOK, C-LOOK, with direction and jump conventions. Head-path chart. | `algo: SCAN` · `head: 53` · `requests: 98 183 …` |
| `banker` | Banker's safety algorithm, request handling, and deadlock detection mode. | `available: 3 3 2` · `P0 0 1 0 \| 7 5 3` |
| `alloc` | Contiguous allocation: first, best, worst and next fit. | `holes: 100 500 200` · `requests: 212 417` |
| `addr` | Paging address translation with an optional LRU TLB and effective access time. | `page-size: 4KB` · `table: 0:5 1:9` |
| `race` | Interleaving explorer: enumerates every schedule of a few threads' atomic steps (load/store/add, lock/unlock, semaphore wait/signal), reports all possible outcomes and deadlocks, and traces one schedule. | `A: load r x; add r 1; store x r` |

Conventions are stated in the help text and examples (lower priority number wins unless `priority: high`; in RR, new arrivals join the queue before the preempted process; Banker's rescans from the lowest-numbered process).

## Development

```
src/
  index.html                 page shell; the build inlines styles and scripts here
  styles/                    tokens, layout, theory, stepper, study, quiz, responsive
  engine/                    registry, sims (the simulators), model, dom, diagrams (graphs, Gantt, disk),
                             focus, sidebar, theory, quiz, simrun, study, stepper, main
  content/
    parts.js                 part numbers and titles
    part-03-cpu-scheduling/
      3.4-round-robin.js     one file per topic
scripts/
  build.mjs                  bundles src/ into dist/index.html
  check-content.mjs          validates every topic and runs every simulator example and exercise
tests/site.spec.js           Playwright end-to-end tests (desktop and mobile)
```

Each topic file holds everything about that topic:

```js
topic('3', { no:'3.4', title:'…', idea:`…`, codes:{a:`…`}, steps:[…], keep:[…] }, {
  imp: 'must',                                   // must | good | extra
  theory:    TH(one, intro, terms, steps, practice, mistakes),
  examples:  [ {lv:'basic'|'mid'|'adv', title, why, code?, out?, sim?, input?}, … ],   // ≥ 3, simple → complex
  tips:      { say, points:[…], traps:[…], qa:[[question, answer], …] },
  exercises: [ {lv:'E'|'M'|'H', q, hint, sim?, input?, key?, ans?, answer?}, … ],        // ≥ 3
  quiz:      [ [question, [a, b, c, d], answerIndex, why, 'E'|'M'|'H'], … ],            // ≥ 3
  quizAdv:   [ … ],                                                                    // ≥ 2
});
```

Walkthrough steps can set `th` (processes and states), `g` (key facts), `tb` (tables), `d` (diagram overlay), `gt` (Gantt timeline, one lane or several) and `log`. An exercise is auto-checked either against a fixed `ans` or against the simulator's value for `key` (for example `avgWT`, `faults`, `sequence`, `values`).

`npm run check` validates structure, highlighted line numbers, quiz banks and study material, and runs every simulator example and exercise, failing if an exercise's key is missing or a fixed answer disagrees with the simulator.

```sh
npm ci                     # once
npm run dev                # rebuild dist/ on every change; open dist/index.html
npm run check              # validate content and run all simulators
npm test                   # check + build + end-to-end tests
```

GitHub Actions runs the checks, the build and the end-to-end tests on every push and pull request. Pushes to `main` deploy `dist/` to GitHub Pages.
