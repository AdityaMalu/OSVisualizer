/* 9.1 I/O hardware: polling, interrupts, DMA */
topic('9', { no:'9.1', title:'I/O hardware: polling, interrupt-driven I/O and DMA',
idea:`How does the CPU move 1 MB from a disk into memory? Try it three ways: the CPU polling a status register, the device interrupting for every word, and DMA, where the device copies everything itself and interrupts once. Count how much CPU time each wastes.`,
actors:'Actors', dgTitle:'Data path', stateTitle:'CPU cost',
nodes:{
  cpu:{x:80,y:60,label:'CPU',w:100,h:44},
  ctrl:{x:260,y:60,label:'device controller\nstatus · command · data',w:190,h:50,kind:'lock'},
  mem:{x:80,y:190,label:'RAM',w:100,h:44,kind:'db'},
  dma:{x:260,y:190,label:'DMA engine',w:150,h:40,kind:'mem'},
  dev:{x:430,y:60,label:'disk',w:80,h:44,kind:'db'}
},
edges:[['cpu','ctrl'],['ctrl','dev'],['cpu','mem'],['dma','mem'],['ctrl','dma']],
vb:'0 0 500 230',
codes:{a:`// 1. programmed I/O with polling (busy-waiting)
for (i = 0; i < n; i++) {
    while (!(inb(STATUS) & READY)) ;      // spin until the device has a word
    buf[i] = inb(DATA);                   // CPU copies every word
}
// 2. interrupt-driven: the device interrupts when each word/sector is ready
void isr(void) { buf[i++] = inb(DATA); if (i == n) wake(waiter); }
// 3. DMA: the CPU only sets up the transfer
dma_setup(src = disk_sector, dst = buf, len = 1 MB);
start_io();  sleep();                     // one interrupt when ALL of it is done`},
steps:[
{hl:{io:[2,3,4]}, th:[['CPU','RUN:bad','spinning on the status register'],['disk','RUN:ok','fetching data']], d:{hide:['dma'], on:['cpu','ctrl'], e:[['cpu','ctrl','poll READY? (×1000s)','bad'],['ctrl','dev','','']]}, g:[G('CPU cost',['method','programmed I/O + polling'],['CPU while waiting','100% busy doing nothing','bad'],['per word','CPU copies it'])],
 say:`Devices are controlled through a <b>controller</b> with registers: status, command and data. The simplest driver <b>polls</b>: loop reading the status register until "ready", then copy one word from the data register. The CPU is 100% busy the whole time even though it's mostly just waiting for a device thousands of times slower than itself.`},
{hl:{io:[6,7]}, th:[['CPU','RUN:ok','runs other work'],['disk','RUN:ok','interrupts per sector']], d:{hide:['dma'], on:['ctrl','cpu'], e:[['ctrl','cpu','IRQ (per sector)','hot'],['cpu','mem','copy','hot']]}, g:[G('CPU cost',['method','interrupt-driven'],['while waiting','free for other processes','ok'],['per sector','interrupt + CPU copies the data','bad'],['1 MB, 512 B sectors','2048 interrupts'])],
 say:`<b>Interrupt-driven</b> I/O: issue the command, let other processes run, and have the device raise an interrupt when data is ready. No more busy-waiting. But the CPU still copies every byte, and with an interrupt per sector, 1 MB means 2048 interrupts, each costing a context save and handler run.`},
{hl:{io:[8,9,10]}, th:[['CPU','RUN:ok','sets up DMA, then runs others'],['disk','RUN:ok',''],['DMA','RUN:ok','copies disk → RAM']], d:{on:['dma','mem','ctrl'], e:[['cpu','ctrl','command','ok'],['ctrl','dma','data','hot'],['dma','mem','bus writes','hot']]}, g:[G('CPU cost',['method','DMA (direct memory access)'],['CPU work','write a descriptor: source, dest, length','ok'],['copying','done by the DMA engine over the bus','ok'],['interrupts','1 for the whole 1 MB','ok'])],
 say:`<b>DMA</b>: the CPU writes a descriptor (where from, where to in RAM, how many bytes) and starts the transfer. The <b>DMA engine</b> (on the device or the chipset) moves the data straight into memory over the bus, with no CPU involvement, and raises <b>one</b> interrupt at the end. Every serious device (disks, NICs, GPUs) works this way.`},
{th:[['CPU','RUN:ok','handles the completion'],['waiter','READY:ok','woken: data in buf']], d:{on:['cpu'], e:[['ctrl','cpu','IRQ: done','ok']]}, g:[G('CPU cost',['polling','~100% CPU for the whole transfer','bad'],['interrupts','~thousands of interrupts + copying','bad'],['DMA','setup + one interrupt','ok']),G('Side effects',['cycle stealing','DMA competes with the CPU for the memory bus'],['cache coherence','CPU caches must not hold stale copies of buf'],['IOMMU','limits which memory a device may DMA into','ok'])],
 say:`The completion interrupt wakes the waiting process; its buffer already contains the data. DMA isn't totally free: it competes with the CPU for memory bandwidth ("cycle stealing"), the hardware must keep caches coherent with what the device wrote, and an <b>IOMMU</b> restricts which memory each device can touch (important for security and VMs).`},
{d:null, th:[], g:[G('When polling wins',['ultra-fast devices','NVMe at millions of IOPS: an interrupt costs more than a short poll','ok'],['examples','Linux NAPI (network), io_uring SQPOLL, DPDK/SPDK user-space polling'])],
 say:`<b>Say it:</b> "With programmed I/O the CPU polls a status register and copies every word itself, wasting cycles while waiting. Interrupt-driven I/O lets the CPU do other work and the device interrupts when ready, but the CPU still copies data and handles many interrupts. DMA has a DMA engine transfer the whole block directly between the device and memory and interrupt once at the end, freeing the CPU. For very fast devices, polling comes back because interrupts become the bottleneck."`}
],
keep:[`Polling: CPU spins on status; simple, wastes CPU.`,`Interrupt-driven: no busy-wait, but CPU copies + many interrupts.`,`DMA: device copies to RAM, one interrupt at the end.`,`DMA side effects: bus contention, cache coherence, IOMMU.`,`Very fast devices (NVMe, 100 GbE) may poll again (NAPI, SPDK).`]}, {
  imp: 'good',
  theory: TH(`The CPU can move data to and from devices by polling, by reacting to interrupts, or by letting a DMA engine transfer whole blocks and interrupt once; DMA is how modern devices work.`,
`<p>Waiting for a parcel: you can stand at the window watching for the van (polling), go about your day and answer the doorbell for every single box (interrupt per item), or tell the courier to put everything in the garage and ring once when finished (DMA).</p>
<p>The trade-off flips at extreme speeds: if parcels arrive every second, answering the doorbell each time is worse than just standing at the door. That's why the fastest network and storage stacks poll.</p>`,
[[`Device controller`,`Hardware interface with status, command and data registers.`],[`Programmed I/O`,`CPU transfers each word itself.`],[`Polling`,`Repeatedly reading a status register.`],[`Interrupt-driven I/O`,`Device signals readiness by interrupting.`],[`DMA`,`Direct memory access: device transfers data to/from RAM itself.`],[`Cycle stealing`,`DMA using memory-bus cycles the CPU would use.`],[`IOMMU`,`MMU for devices: restricts and translates DMA addresses.`],[`Memory-mapped I/O`,`Device registers appear at physical memory addresses.`]],
[`Driver writes a command to the controller.`,`Polling: loop on status, then read data. Interrupts: sleep; the ISR moves data on each interrupt.`,`DMA: driver writes a descriptor (addresses, length); device moves data over the bus.`,`Completion: one interrupt; driver wakes the waiting process.`],
[`NICs and NVMe drives use ring buffers of DMA descriptors.`,`Linux NAPI switches network drivers from interrupts to polling under load.`,`IOMMUs isolate devices assigned to VMs (VFIO) and block DMA attacks (Thunderbolt).`],
[`Thinking DMA uses no memory bandwidth.`,`Assuming interrupts are always better than polling.`,`Forgetting cache coherence for DMA buffers.`])
  ,
  examples: [
    {lv:'basic', title:'Polling vs interrupts in numbers', code:`device delivers 1 word every 10 µs; CPU handles a word in 0.1 µs
polling:      CPU busy 100% of the time (99% just spinning)
interrupts:   (0.1 µs copy + 2 µs interrupt overhead) per 10 µs = 21% of the CPU
DMA (1 MB):   ~5 µs setup + 1 interrupt                       ≈ 0% of the CPU`, why:`Interrupts save the spinning but have fixed overhead per event; DMA amortises everything over the whole block.`},
    {lv:'mid', title:'See DMA-capable devices and IRQs', code:`$ cat /proc/interrupts | grep -E 'nvme|eth'
 45:   120331   0   PCI-MSI 524288-edge   nvme0q1
 52:        0  884213  PCI-MSI 1048576-edge  eth0-rx-0
$ dmesg | grep -i iommu
DMAR: IOMMU enabled`, why:`Modern devices signal completion with message-signalled interrupts (MSI), one per queue, after DMA has done the transfer.`},
    {lv:'adv', title:'When the OS switches to polling', code:`# NAPI: at high packet rates the NIC driver disables its IRQ and polls
$ cat /proc/net/softnet_stat     # per-CPU packets processed in polling mode
# io_uring with a kernel polling thread: no syscalls, no interrupts
struct io_uring_params p = { .flags = IORING_SETUP_SQPOLL | IORING_SETUP_IOPOLL };`, why:`At millions of operations per second, per-event interrupt and syscall overhead dominates, so polling a completion queue is cheaper.`},
  ],
  tips: {
    say:`"Programmed I/O with polling has the CPU spin on a status register and copy every word: simple but wasteful. Interrupt-driven I/O frees the CPU while waiting, but it still copies data and takes an interrupt per unit. DMA lets the device or a DMA engine move a whole block straight to memory and interrupt once when done, so the CPU only sets it up. At extreme rates, like NVMe or 100 GbE, polling can win because interrupt overhead dominates."`,
    points:[`Compare all three with CPU cost.`,`What the CPU still does with DMA.`,`When polling is the right answer.`],
    traps:[`Saying DMA is free.`,`Saying polling is always bad.`],
    qa:[[`What does an IOMMU protect against?`,`A device (or malicious peripheral) DMAing into arbitrary memory; it also lets VMs safely own devices by translating guest addresses.`],
        [`What is memory-mapped I/O?`,`Device registers are mapped into the physical address space so the CPU reads and writes them with ordinary loads/stores instead of special I/O instructions.`],
        [`Why does the CPU still get an interrupt with DMA?`,`To learn that the transfer completed (or failed), so the driver can wake the waiting process and reuse the buffer.`]]
  },
  exercises: [
    {lv:'E', q:`Which method transfers a whole block without the CPU copying any bytes? (acronym)`, ans:'DMA', hint:`Direct …`, answer:`<p>DMA.</p>`},
    {lv:'M', q:`A 1 MB read with 512-byte sectors and one interrupt per sector: how many interrupts?`, ans:'2048', hint:`1,048,576 / 512.`, answer:`<p>2048.</p>`},
    {lv:'H', q:`Each interrupt costs 2 µs. A device completes 600,000 operations per second, one interrupt each. What percentage of one CPU goes to interrupt handling?`, ans:'120', hint:`600,000 × 2 µs per second.`, answer:`<p>1.2 s per second = 120%: more than a full core. Use interrupt coalescing or polling.</p>`},
  ],
  quiz: [
    [`Polling means the CPU…`,[`Sleeps until an interrupt`,`Repeatedly checks a device status register`,`Uses DMA`,`Disables the device`],1,`Busy-waiting.`,'E'],
    [`DMA lets…`,[`The CPU copy faster`,`A device transfer data to memory without the CPU copying it`,`Programs access disks directly`,`The OS skip interrupts entirely`],1,`One interrupt at the end.`,'E'],
    [`Interrupt-driven I/O improves on polling by…`,[`Copying faster`,`Letting the CPU do other work while waiting`,`Removing device drivers`,`Using no interrupts`],1,`No spinning.`,'E'],
    [`With DMA, the CPU…`,[`Copies every byte`,`Sets up the transfer and handles a completion interrupt`,`Polls continuously`,`Is not involved at all, ever`],1,`Setup + completion.`,'M'],
    [`Cycle stealing refers to…`,[`Interrupt handlers`,`DMA using memory-bus cycles`,`Scheduler preemption`,`Page faults`],1,`Bus contention.`,'M'],
    [`For a 10-million-packets-per-second NIC, Linux often…`,[`Interrupts per packet`,`Switches to polling (NAPI)`,`Uses programmed I/O`,`Drops DMA`],1,`Interrupt overhead too high.`,'M'],
  ],
  quizAdv: [
    [`An IOMMU…`,[`Speeds up the CPU`,`Translates and restricts device DMA addresses`,`Schedules I/O`,`Is a cache`],1,`DMA protection.`,'H'],
    [`MSI interrupts are…`,[`Signalled by writing a message to a memory address`,`Legacy pin-based IRQs`,`Software interrupts`,`Non-maskable`],0,`Per-queue vectors.`,'H'],
    [`io_uring SQPOLL avoids…`,[`DMA`,`System calls for submission, using a kernel polling thread`,`Interrupts on the device`,`Page faults`],1,`Kernel thread polls the ring.`,'H'],
  ],
});
