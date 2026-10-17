/* 0.5 Booting */
topic('0', { no:'0.5', title:'Booting: from power-on to the first process',
idea:`When you press the power button, RAM is empty and no OS exists yet. Step through the chain of small programs, each loading a bigger one: firmware, bootloader, kernel, and finally process 1, the ancestor of every other process.`,
actors:'Stage', dgTitle:'Boot chain', stateTitle:'Machine state',
nodes:{
  fw:{x:70,y:60,label:'firmware\nUEFI / BIOS',w:120,h:50,kind:'mem'},
  bl:{x:200,y:60,label:'bootloader\nGRUB',w:110,h:50},
  k:{x:330,y:60,label:'kernel\nvmlinuz',w:110,h:50},
  init:{x:330,y:170,label:'PID 1\nsystemd / init',w:130,h:50,kind:'actor'},
  svc:{x:170,y:170,label:'services, login,\nshell',w:140,h:50}
},
edges:[['fw','bl'],['bl','k'],['k','init'],['init','svc']],
vb:'0 0 420 220',
codes:{a:`1. power on → CPU starts at a fixed address in firmware ROM
2. firmware: POST (test RAM, devices), find a boot disk
3. UEFI loads the bootloader from the EFI system partition
4. bootloader: pick a kernel, load kernel + initramfs into RAM
5. kernel: set up memory, interrupts, scheduler, drivers
6. kernel mounts the root file system (helped by initramfs)
7. kernel starts /sbin/init as PID 1
8. PID 1 starts services, login prompts, the desktop
$ ps -o pid,comm 1
  PID COMMAND
    1 systemd`},
steps:[
{hl:{boot:[1,2]}, th:[['firmware','RUN:ok','real hardware, no OS']], d:{on:['fw'], e:[]}, g:[G('Machine state',['RAM','empty, untested'],['CPU','starts at a hard-wired address in ROM','hot'])],
 say:`At power-on RAM holds nothing useful. The CPU is hard-wired to start executing at a fixed address that maps to <b>firmware</b> (UEFI or legacy BIOS) stored in flash on the motherboard. Firmware runs the <b>power-on self-test</b>, initialises RAM and finds devices.`},
{hl:{boot:[3,4]}, th:[['firmware','TERM:dim','handed over'],['GRUB','RUN:ok','bootloader']], d:{on:['bl'], e:[['fw','bl','load','hot']]}, g:[G('Machine state',['RAM','bootloader loaded'],['secure boot','firmware checks the bootloader signature','ok'])],
 say:`Firmware can't understand Linux; it only knows how to load a small <b>bootloader</b> from the disk (UEFI reads it from the EFI system partition; old BIOS read the first 512-byte sector, the MBR). The bootloader (GRUB) shows a menu, then loads the <b>kernel</b> image and an <b>initramfs</b> into RAM.`},
{hl:{boot:[5,6]}, th:[['GRUB','TERM:dim','handed over'],['kernel','RUN:ok','initialising']], d:{on:['k'], e:[['fw','bl','','ok'],['bl','k','jump','hot']]}, g:[G('Machine state',['kernel mode','kernel owns the CPU','hot'],['sets up','page tables, interrupts, scheduler, drivers'],['initramfs','temporary root with drivers needed to find the real disk'])], log:['Linux version 6.8 …','Memory: 16G available'],
 say:`The bootloader jumps into the kernel. The kernel decompresses itself, sets up <b>virtual memory</b>, the <b>interrupt table</b>, the scheduler and drivers. The initramfs is a tiny temporary file system holding just enough drivers (disk, encryption, RAID) to find and mount the real root file system.`},
{hl:{boot:[7,9,10,11]}, th:[['kernel','RUN:ok','idle loop + interrupts'],['PID 1','RUN:ok','first user process']], d:{on:['init'], e:[['bl','k','','ok'],['k','init','exec /sbin/init','hot']]}, g:[G('Machine state',['first user process','PID 1','hot'],['every other process','descends from PID 1'])], log:['Run /sbin/init as init process'],
 say:`The kernel creates the first user-mode process, <b>PID 1</b> (<code>systemd</code> or classic <code>init</code>). From now on the kernel only reacts to system calls and interrupts. PID 1 is special: it adopts orphaned processes and if it dies the kernel panics.`},
{hl:{boot:[8]}, th:[['PID 1','RUN:ok','supervising'],['sshd','RUN:ok',''],['getty/login','WAITING:warn','waits for you']], d:{on:['svc'], e:[['k','init','','ok'],['init','svc','fork + exec','hot']]}, g:[G('Machine state',['services','started in dependency order'],['you','log in → a shell is forked for you','ok'])],
 say:`PID 1 starts services (networking, sshd, logging) by <code>fork</code> + <code>exec</code>, in dependency order, and finally login prompts. When you log in, your shell is another descendant. <code>pstree</code> would show the whole family tree rooted at PID 1.`},
{hl:{}, th:[], d:null, g:[G('Chain of trust',['each stage loads and (with secure boot) verifies the next','ok']),G('Remember',['firmware → bootloader → kernel → PID 1 → everything else'],['initramfs','helps mount the real root'],['BIOS/MBR vs UEFI/GPT','legacy vs modern'])],
 say:`<b>Say it:</b> "On power-on the CPU runs firmware from ROM, which tests hardware and loads a bootloader from disk. The bootloader loads the kernel and an initramfs into memory. The kernel initialises memory management, interrupts, the scheduler and drivers, mounts the root file system and starts PID 1, which launches all services and login sessions."`}
],
keep:[`Power-on → firmware (UEFI/BIOS) → bootloader (GRUB) → kernel → PID 1.`,`Each stage loads a bigger, smarter one ("bootstrapping").`,`initramfs: temporary root to load drivers for the real root.`,`PID 1 starts services and adopts orphans; it must never exit.`,`Secure boot verifies each stage's signature.`]}, {
  imp: 'extra',
  theory: TH(`Booting is a chain of increasingly capable loaders: firmware loads a bootloader, which loads the kernel, which starts the first user process.`,
`<p>The name comes from "pulling yourself up by your bootstraps": a computer must run a program to load programs, but at power-on there is none in RAM. The trick is a tiny program in read-only memory that knows just enough to load the next, bigger stage from disk.</p>
<p>Each stage hands over control to the next and is then forgotten. Once the kernel is up, it starts one process (PID 1), and every process you ever see is its descendant.</p>`,
[[`Firmware`,`Code in motherboard flash (UEFI or BIOS) that runs first.`],[`POST`,`Power-on self-test of RAM and devices.`],[`Bootloader`,`Loads the kernel (GRUB, systemd-boot).`],[`initramfs`,`Small in-memory file system used during early boot.`],[`PID 1 / init`,`First user process; ancestor of all others.`],[`Secure Boot`,`Firmware verifies signatures on each stage.`],[`MBR / GPT`,`Legacy / modern disk partition schemes.`]],
[`CPU starts executing firmware at a fixed address.`,`Firmware tests and initialises hardware, then loads the bootloader.`,`The bootloader loads the kernel and initramfs and jumps to the kernel.`,`The kernel initialises subsystems, mounts root, and execs PID 1.`,`PID 1 starts services and login sessions.`],
[`Slow boots are diagnosed with systemd-analyze blame.`,`Cloud VMs boot the same way, but firmware is virtual and often very fast.`,`Containers skip all of this: they start a process on an already-running kernel.`],
[`Thinking the kernel is loaded by firmware directly (usually a bootloader sits in between).`,`Killing PID 1 in a container and being surprised the container exits.`,`Confusing BIOS/MBR with UEFI/GPT.`])
  ,
  examples: [
    {lv:'basic', title:'The process family tree', code:`$ pstree -p | head -5
systemd(1)─┬─sshd(812)───sshd(2201)───bash(2210)───pstree(2290)
           ├─cron(640)
           ├─systemd-journal(301)
           └─NetworkManager(703)`, why:`Everything descends from PID 1. Your shell is a child of sshd, which is a child of systemd.`},
    {lv:'mid', title:'Where boot time went', code:`$ systemd-analyze
Startup finished in 3.1s (firmware) + 1.2s (loader) + 2.4s (kernel) + 6.8s (userspace)
$ systemd-analyze blame | head -3
 4.2s NetworkManager-wait-online.service
 1.1s docker.service
 0.6s snapd.service`, why:`The split mirrors the boot chain. Most time is often in user-space services waiting for the network.`},
    {lv:'adv', title:'Why PID 1 in a container matters', code:`$ docker run --rm alpine sh -c 'sleep 1000 & exec sleep 2000'
# 'sleep 2000' becomes PID 1 in the container:
#  - signals without a handler are ignored by PID 1 (Ctrl-C / docker stop may not work)
#  - orphaned children are reparented to it but never reaped → zombies
$ docker run --init ...    # adds a tiny init (tini) as PID 1 to fix both`, why:`Containers have their own PID namespace, so whatever you start is PID 1 with PID 1's special rules.`},
  ],
  tips: {
    say:`"Firmware in ROM runs first, tests hardware and loads a bootloader. The bootloader loads the kernel and initramfs. The kernel sets up memory, interrupts, scheduling and drivers, mounts the root file system and starts PID 1, which starts every service and login session."`,
    points:[`Give the chain in order.`,`Explain why each stage is needed.`,`Mention PID 1's special role.`],
    traps:[`Skipping the bootloader.`,`Not knowing what initramfs is for.`],
    qa:[[`Why do we need an initramfs?`,`The drivers needed to read the root disk (RAID, LVM, encryption, unusual controllers) may be modules that live on that very disk. initramfs provides them in RAM first.`],
        [`What happens if PID 1 exits?`,`The kernel panics on a normal system; in a container the container stops.`],
        [`What is Secure Boot protecting against?`,`Bootkits: malware replacing the bootloader or kernel before the OS can defend itself. Each stage's signature is checked against trusted keys.`]]
  },
  exercises: [
    {lv:'E', q:`Order these: kernel, PID 1, firmware, bootloader. Answer like <code>a b c d</code> with the names.`, ans:'firmware bootloader kernel PID 1', hint:`Smallest and most hard-wired first.`, answer:`<p>firmware → bootloader → kernel → PID 1.</p>`},
    {lv:'M', q:`What PID does the first user-space process get?`, ans:'1', hint:`Its name is init or systemd.`, answer:`<p>PID 1. (PID 0 is the kernel's idle/swapper task.)</p>`},
    {lv:'H', q:`A server takes 90 s to boot. systemd-analyze says userspace 82 s. Where would you look and what might fix it?`, hint:`blame and critical-chain.`, answer:`<p>Use <code>systemd-analyze blame</code> and <code>critical-chain</code>. Common culprits: services waiting for network-online, slow DNS, fsck of large disks, timeouts for missing devices in fstab. Fix by removing unnecessary waits, adding <code>nofail</code> for optional mounts, or parallelising.</p>`},
  ],
  quiz: [
    [`The first code the CPU runs at power-on is…`,[`The kernel`,`Firmware (UEFI/BIOS) in ROM/flash`,`The shell`,`GRUB from RAM`],1,`RAM is empty.`,'E'],
    [`The bootloader's job is to…`,[`Run apps`,`Load the kernel (and initramfs) into memory and start it`,`Test RAM`,`Manage processes`],1,`GRUB, systemd-boot.`,'E'],
    [`PID 1 is…`,[`The kernel`,`The first user process, ancestor of all others`,`The bootloader`,`A zombie`],1,`systemd or init.`,'E'],
    [`initramfs exists to…`,[`Store user files`,`Provide drivers/tools to mount the real root file system`,`Replace the kernel`,`Speed up the CPU`],1,`Early boot helper.`,'M'],
    [`Who adopts orphaned processes?`,[`The kernel`,`PID 1 (or a subreaper)`,`The shell`,`Nobody`],1,`And reaps them.`,'M'],
    [`Secure Boot verifies…`,[`User passwords`,`Signatures of the bootloader and kernel`,`Disk speed`,`Network`],1,`Chain of trust.`,'M'],
  ],
  quizAdv: [
    [`Legacy BIOS loaded the bootloader from…`,[`The EFI partition`,`The first 512-byte sector of the disk (MBR)`,`The network only`,`RAM`],1,`UEFI reads files from the ESP.`,'H'],
    [`A process started directly as PID 1 in a container…`,[`Behaves like any process`,`Ignores signals it has no handler for and must reap orphans`,`Cannot fork`,`Has root on the host`],1,`Use --init / tini.`,'H'],
    [`PID 0 on Linux is…`,[`systemd`,`The idle (swapper) task inside the kernel`,`The bootloader`,`Invalid`],1,`Runs when nothing else can.`,'H'],
  ],
});
