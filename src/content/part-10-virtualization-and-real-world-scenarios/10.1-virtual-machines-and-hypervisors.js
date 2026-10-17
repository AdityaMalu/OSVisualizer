/* 10.1 Virtual machines and hypervisors */
topic('10', { no:'10.1', title:'Virtual machines and hypervisors',
idea:`A hypervisor makes one physical machine look like several, each running its own kernel. Follow a guest kernel's privileged instruction as it traps to the hypervisor, see how hardware support (VT-x, nested page tables) made this fast, and compare type 1 and type 2 hypervisors.`,
actors:'Layers', dgTitle:'Virtualization stack', stateTitle:'Mechanism',
nodes:{
  g1:{x:110,y:40,label:'guest 1\napps + Linux kernel',w:170,h:46},
  g2:{x:330,y:40,label:'guest 2\napps + Windows kernel',w:170,h:46},
  hv:{x:220,y:130,label:'hypervisor (VMM)\nKVM · Xen · ESXi · Hyper-V',w:300,h:46,kind:'lock'},
  hw:{x:220,y:205,label:'hardware: CPU with VT-x/AMD-V, RAM, NIC, disk',w:360,h:34,kind:'mem'}
},
edges:[['g1','hv'],['g2','hv'],['hv','hw']],
vb:'0 0 440 235',
codes:{a:`// guest kernel thinks it owns the machine
mov cr3, rax        // load a page table: privileged
out 0x3f8, al       // talk to a serial port: privileged
hlt                 // idle the CPU: privileged

// with hardware virtualization (Intel VT-x / AMD-V):
//   guest runs in "non-root" mode at full speed
//   sensitive instructions cause a VM EXIT to the hypervisor
//   hypervisor emulates the effect, then VM ENTER back to the guest
// memory: guest virtual → guest physical → host physical (EPT / NPT)`},
steps:[
{hl:{g:[1,2]}, th:[['guest1','RUN:ok','running at full speed'],['hypervisor','READY:info','waiting for exits']], d:{on:['g1','g2','hv'], e:[]}, g:[G('Mechanism',['goal','each VM sees its own CPUs, memory, devices'],['guest kernel','still believes it is in ring 0','hot'])],
 say:`A <b>hypervisor</b> (virtual machine monitor) runs several <b>guest</b> operating systems on one machine. Each guest kernel believes it owns the hardware: it loads page tables, programs devices, halts the CPU. If it really could, it would trample the other guests. Most guest instructions are ordinary arithmetic and run directly on the CPU at full speed.`},
{hl:{g:[2]}, th:[['guest1','BLOCKED:warn','VM exit'],['hypervisor','RUN:ok','handles the exit']], d:{on:['hv'], e:[['g1','hv','VM exit: mov cr3','hot']]}, g:[G('Mechanism',['trap-and-emulate','sensitive instruction → trap to hypervisor'],['VT-x/AMD-V','CPU has a guest mode; configured instructions cause VM exits','ok'],['before 2005','x86 had instructions that didn\'t trap → binary translation (VMware) or paravirtualisation (Xen)'])], log:['VM exit: CR3 write'],
 say:`When the guest executes a <b>sensitive</b> instruction like loading CR3, the CPU, running the guest in VT-x "non-root" mode, performs a <b>VM exit</b> to the hypervisor. This is <b>trap-and-emulate</b>: the hypervisor checks it, applies the effect to the guest's <i>virtual</i> state, and resumes the guest. Old x86 had instructions that silently misbehaved instead of trapping, which forced tricks like binary translation until VT-x arrived.`},
{hl:{g:[10]}, th:[['guest1','RUN:ok','resumed (VM entry)'],['hypervisor','READY:info','']], d:{on:['g1','hw'], e:[['hv','g1','VM entry','ok']]}, tb:[TB('address translation in a VM',['level','maps','maintained by'],[['guest page table','guest virtual → guest physical','guest kernel'],['EPT / NPT','guest physical → host physical','hypervisor'],['TLB','caches the combined result','hardware']],{1:'hot'})], g:[G('Mechanism',['memory','two-dimensional page walk','hot'],['cost of a TLB miss','up to 24 memory accesses (4 levels × 4 levels + …)','bad'])],
 say:`Memory needs two translations: the guest's page tables map guest-virtual to guest-"physical" addresses, which are really just host memory the hypervisor gave it; <b>nested page tables</b> (Intel EPT, AMD NPT) map guest-physical to host-physical. The hardware walks both, so the guest can change its own page tables without exiting. TLB misses get more expensive, which is why huge pages matter even more in VMs.`},
{hl:{g:[3]}, th:[['guest1','RUN:ok','virtio-net driver'],['hypervisor','RUN:ok','vhost backend']], d:{on:['hv','hw'], e:[['g1','hv','virtio queue','hot'],['hv','hw','real NIC','ok']]}, g:[G('Mechanism',['emulated device','fake a real NIC chip: every register access exits: slow','bad'],['paravirtual (virtio)','guest knows it\'s virtual; shared ring buffers, few exits','ok'],['passthrough (SR-IOV, VFIO)','guest owns a real device slice, via the IOMMU','ok'])],
 say:`I/O is the expensive part. Emulating a real network chip means a VM exit on every register access. <b>Paravirtual</b> devices like <b>virtio</b> are designed for VMs: the guest driver and hypervisor share ring buffers and exchange batches with few exits. For maximum speed, a device (or a slice of one with SR-IOV) is passed straight through to the guest, with the IOMMU (9.1) confining its DMA.`},
{d:null, th:[], tb:[TB('hypervisor types',['type','runs on','examples'],[['type 1 (bare metal)','directly on hardware','Xen, VMware ESXi, Hyper-V, KVM (Linux becomes the hypervisor)'],['type 2 (hosted)','as an app on a host OS','VirtualBox, VMware Workstation, Parallels']])], g:[G('VM vs container',['VM','own kernel, strong isolation, ~seconds to boot, GBs'],['container','shares the host kernel, ms to start, MBs (next topic)'])],
 say:`<b>Say it:</b> "A hypervisor multiplexes hardware among guest operating systems. Guests run directly on the CPU, and privileged or sensitive operations trap to the hypervisor, which emulates them: trap-and-emulate, made efficient by hardware virtualization like VT-x. Memory uses two levels of translation, guest page tables plus nested page tables. I/O uses emulated, paravirtual virtio or passthrough devices. Type 1 hypervisors run on bare metal, type 2 on a host OS. VMs give each guest its own kernel and stronger isolation than containers."`}
],
keep:[`Hypervisor = VMM: runs guest OSes, each with its own kernel.`,`Trap-and-emulate: sensitive instructions → VM exit → emulate → VM entry.`,`VT-x/AMD-V: hardware guest mode. EPT/NPT: nested page tables.`,`I/O: emulated (slow) < virtio (paravirtual) < passthrough (SR-IOV).`,`Type 1: bare metal (ESXi, Xen, KVM). Type 2: hosted (VirtualBox).`]}, {
  imp: 'good',
  theory: TH(`Virtual machines let several operating systems share one computer: a hypervisor runs guests directly on the CPU and intercepts the operations that would let them affect each other.`,
`<p>A landlord divides a building into flats. Each tenant (guest OS) runs their flat as they like, but the building's wiring, plumbing and front door (hardware) are managed by the landlord (hypervisor). When a tenant tries to rewire the building, the request goes to the landlord, who does the safe equivalent inside their flat.</p>
<p>Cloud computing is built on this: every EC2 or GCE instance is a VM on a shared server, usually under KVM-based hypervisors.</p>`,
[[`Hypervisor / VMM`,`Software that creates and runs virtual machines.`],[`Guest / host`,`The virtualized OS / the physical machine's controlling software.`],[`Trap-and-emulate`,`Sensitive guest instructions trap and are emulated.`],[`VM exit / entry`,`Transitions from guest to hypervisor and back.`],[`VT-x / AMD-V`,`CPU extensions for hardware-assisted virtualization.`],[`EPT / NPT`,`Nested page tables: guest-physical → host-physical.`],[`Paravirtualization`,`Guest is modified/aware to cooperate with the hypervisor (virtio).`],[`Type 1 / type 2`,`Bare-metal vs hosted hypervisors.`]],
[`The hypervisor configures the CPU's guest mode and which events cause exits.`,`The guest runs natively until a sensitive instruction, interrupt or EPT violation.`,`VM exit: the hypervisor emulates or handles the event.`,`VM entry: the guest resumes.`,`Devices: emulated, virtio rings, or passthrough via the IOMMU.`],
[`Cloud instances (KVM on AWS Nitro, GCP; Hyper-V on Azure).`,`Firecracker microVMs give AWS Lambda VM isolation with ~125 ms boots.`,`Live migration copies a running VM's memory to another host.`],
[`Saying VMs emulate every instruction (that's an emulator like QEMU TCG).`,`Confusing VMs and containers.`,`Ignoring I/O as the main source of overhead.`])
  ,
  examples: [
    {lv:'basic', title:'Is this machine a VM?', code:`$ systemd-detect-virt
kvm
$ grep -o -m1 -E 'vmx|svm' /proc/cpuinfo      # on the host: hardware virtualization support
vmx
$ lsmod | grep kvm
kvm_intel  …  kvm  …`, why:`KVM turns Linux itself into a type 1 hypervisor using VT-x (vmx) or AMD-V (svm).`},
    {lv:'mid', title:'Start a VM with virtio devices', code:`$ qemu-system-x86_64 -enable-kvm -cpu host -m 4G -smp 4 \\
    -drive file=disk.qcow2,if=virtio \\
    -netdev user,id=n0 -device virtio-net-pci,netdev=n0
# -enable-kvm: run guest code natively via KVM (not emulated)
# if=virtio / virtio-net: paravirtual disk and NIC → few VM exits`, why:`Without <code>-enable-kvm</code>, QEMU emulates every instruction in software: 10–100× slower.`},
    {lv:'adv', title:'Counting VM exits', code:`$ sudo perf kvm stat live
Event name       Samples  Samples%   Time%   Avg time
EPT_VIOLATION      41210    38.2%    22.1%     4.1us
IO_INSTRUCTION     30113    27.9%    51.3%    13.0us   ← an emulated device is hot
HLT                18044    16.7%     …
# fix: switch that device to virtio; use huge pages to cut EPT violations`, why:`Virtualization overhead is mostly VM exits; profiling them points straight at the expensive emulated device or memory setup.`},
  ],
  tips: {
    say:`"A hypervisor runs multiple guest operating systems on one machine. Guest code runs directly on the CPU; sensitive operations like loading page tables or doing I/O cause VM exits to the hypervisor, which emulates them, which is trap-and-emulate made efficient by VT-x or AMD-V. Memory goes through two translations with nested page tables, and I/O uses emulated, paravirtual or passthrough devices. Type 1 hypervisors run on bare metal, type 2 on a host OS. Each VM has its own kernel, giving stronger isolation than containers at a higher cost."`,
    points:[`Trap-and-emulate and hardware support.`,`Memory: EPT/NPT.`,`I/O options and hypervisor types.`],
    traps:[`Saying VMs interpret every instruction.`,`Calling KVM a type 2 hypervisor without nuance.`],
    qa:[[`Why was x86 hard to virtualize before VT-x?`,`Some sensitive instructions (e.g. POPF, SGDT) didn't trap in user mode, violating Popek–Goldberg requirements, so VMware used binary translation and Xen used paravirtualization.`],
        [`What is a VM exit and why does it matter?`,`A switch from guest to hypervisor caused by a sensitive event; each costs from hundreds of ns to microseconds, so minimizing exits is the key to VM performance.`],
        [`VM vs container in one sentence?`,`A VM virtualizes hardware and runs its own kernel; a container is an isolated group of processes sharing the host kernel.`]]
  },
  exercises: [
    {lv:'E', q:`Which hypervisor type runs directly on the hardware: type 1 or type 2? (number)`, ans:'1', hint:`Bare metal.`, answer:`<p>Type 1.</p>`},
    {lv:'M', q:`A guest page walk has 4 levels and each guest page-table access itself needs a 4-level nested walk. Ignoring caches, roughly how many memory accesses does a TLB miss need? (use (4+1)×(4+1) − 1)`, ans:'24', hint:`The formula given.`, answer:`<p>(4+1)² − 1 = 24 memory references in the worst case.</p>`},
    {lv:'H', q:`A VM does 200,000 network packets/s through an emulated NIC causing 3 exits per packet at 2 µs each. What percentage of one CPU is spent on exits?`, ans:'120', hint:`200,000 × 3 × 2 µs.`, answer:`<p>1.2 s per second = 120%: switch to virtio (batched rings) or passthrough.</p>`},
  ],
  quiz: [
    [`A hypervisor…`,[`Is a container runtime`,`Runs and isolates multiple guest operating systems`,`Is a shell`,`Is a file system`],1,`VMM.`,'E'],
    [`Trap-and-emulate means…`,[`Every instruction is emulated`,`Sensitive guest instructions trap to the hypervisor, which emulates them`,`Guests can't run privileged code`,`Interrupts are ignored`],1,`Normal code runs natively.`,'E'],
    [`VirtualBox is a…`,[`Type 1 hypervisor`,`Type 2 (hosted) hypervisor`,`Container engine`,`Microkernel`],1,`Runs on a host OS.`,'E'],
    [`EPT / NPT provide…`,[`Faster disks`,`Hardware translation from guest-physical to host-physical memory`,`Network virtualization`,`Scheduling`],1,`Nested page tables.`,'M'],
    [`virtio devices are fast because…`,[`They're real hardware`,`Guest and host exchange batches through shared rings with few VM exits`,`They skip the kernel`,`They use polling only`],1,`Paravirtual.`,'M'],
    [`Compared with containers, VMs…`,[`Share the host kernel`,`Run their own kernel with stronger isolation`,`Start in milliseconds`,`Use less memory`],1,`Hardware-level isolation.`,'M'],
  ],
  quizAdv: [
    [`Before VT-x, VMware virtualized x86 using…`,[`Trap-and-emulate only`,`Binary translation of guest kernel code`,`Containers`,`Microcode updates`],1,`Some instructions didn't trap.`,'H'],
    [`SR-IOV allows…`,[`Live migration`,`One physical device to present multiple virtual functions assigned to VMs`,`Nested paging`,`Memory ballooning`],1,`Near-native I/O.`,'H'],
    [`Firecracker is…`,[`A container runtime`,`A minimal KVM-based microVM monitor used by AWS Lambda`,`A file system`,`A scheduler`],1,`Fast-booting VMs.`,'H'],
  ],
});
