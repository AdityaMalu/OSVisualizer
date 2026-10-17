/* 10.2 Containers: namespaces and cgroups */
topic('10', { no:'10.2', title:'Containers: namespaces, cgroups and layered file systems',
idea:`A container isn't a VM: it's an ordinary process the kernel lies to. Build one step by step: new namespaces give it its own PID 1, hostname, network and mounts; cgroups cap its CPU and memory; an overlay file system gives it an image. Then watch the OOM killer enforce the memory limit.`,
actors:'Processes', tbTitle:'What the container sees', stateTitle:'Kernel features',
codes:{a:`// roughly what docker run does
clone(CLONE_NEWPID | CLONE_NEWNS | CLONE_NEWUTS |    // own PID numbers, mounts, hostname
      CLONE_NEWNET | CLONE_NEWIPC | CLONE_NEWUSER);  // own network stack, IPC, uid mapping
mount("overlay", "/merged", "overlay", 0,
      "lowerdir=image-layers,upperdir=rw-layer,workdir=w");
pivot_root("/merged", …);                           // the image becomes "/"
write("/sys/fs/cgroup/app/memory.max", "512M");     // limits via cgroup v2
write("/sys/fs/cgroup/app/cpu.max", "50000 100000"); // 0.5 CPU
write("/sys/fs/cgroup/app/cgroup.procs", pid);
execve("/usr/bin/python3", …);                       // just a normal process on the host kernel`},
steps:[
{hl:{c:[2,3]}, th:[['host:4242','RUN:ok','python3 (host view)'],['ctr:1','RUN:ok','same process, PID 1 inside']], tb:[TB('PID namespace',['view','process','PID'],[['host','python3','4242'],['container','python3','1']],{1:'hot'})], g:[G('Kernel features',['namespaces','isolate what a process can SEE','hot'],['PID ns','own PID numbering starting at 1'])],
 say:`A container starts as a normal <code>clone</code> with extra flags creating new <b>namespaces</b>. In its new <b>PID namespace</b> the process sees itself as PID 1 and can't see host processes; from the host it's just PID 4242. Same process, two views. There's no second kernel and no hardware emulation.`},
{hl:{c:[2,3]}, tb:[TB('namespaces',['namespace','gives the container its own'],[['mnt','mount table (file system view)'],['uts','hostname'],['net','interfaces, IPs, routes, ports (veth pair to the host bridge)'],['ipc','shared memory, semaphores'],['user','uid mapping: root inside = unprivileged outside'],['cgroup','view of its own cgroup tree']])], g:[G('Kernel features',['effect','processes in other namespaces are invisible'])],
 say:`Other namespaces isolate the rest of the view: its own <b>mount</b> table, <b>hostname</b>, <b>network</b> stack (its own eth0, connected to the host by a virtual ethernet pair), IPC objects, and with <b>user</b> namespaces, "root" inside maps to an unprivileged user outside. Namespaces control what a process can <i>see</i>.`},
{hl:{c:[4,5,6]}, tb:[TB('overlay file system',['layer','contents','writable?'],[['upper (container)','files the container changed','yes'],['lower 3 (app)','/app code','no'],['lower 2 (pip)','site-packages','no'],['lower 1 (base)','debian rootfs','no']],{0:'hot'})], g:[G('Kernel features',['overlayfs','union of read-only image layers + one writable layer'],['copy-up','first write to a lower file copies it to upper (COW)','ok'],['sharing','100 containers share the same image layers on disk and in page cache','ok'])],
 say:`The image is a stack of read-only layers merged by <b>overlayfs</b>, plus one thin writable layer per container. Modifying an image file copies it up to the writable layer first: copy-on-write again (7.5). <code>pivot_root</code> makes this merged tree the container's <code>/</code>. A hundred containers from one image share the lower layers on disk and in the page cache.`},
{hl:{c:[7,8,9]}, tb:[TB('cgroup v2: /sys/fs/cgroup/app',['file','value','effect'],[['memory.max','512M','hard memory limit'],['cpu.max','50000 100000','0.5 CPU per 100 ms period'],['pids.max','256','fork bomb protection'],['io.max','8:0 wbps=10485760','10 MB/s writes']],{0:'hot',1:'hot'})], g:[G('Kernel features',['cgroups','limit and account what a process can USE','hot'])],
 say:`<b>Control groups</b> (cgroups) limit what the container can <i>use</i>: memory, CPU (as a quota per period, or a relative weight), number of processes, I/O bandwidth. Every process in the group is accounted together. Kubernetes requests and limits are translated into exactly these files.`},
{th:[['ctr:1','TERM:bad','killed by the OOM killer'],['host','RUN:ok','unaffected']], tb:[TB('memory.events',['counter','value'],[['max','1840 (hit the limit, reclaim attempted)'],['oom','1'],['oom_kill','1']],{2:'bad'})], g:[G('Kernel features',['at memory.max','kernel reclaims cache, then OOM-kills inside the cgroup','bad'],['CPU over quota','throttled until next period (latency spikes)','bad'])], log:['Memory cgroup out of memory: Killed process 4242 (python3)','docker: exited with code 137 (128 + SIGKILL)'],
 say:`The container leaks memory and reaches 512 MB. The kernel first reclaims page cache charged to the cgroup; when that's not enough it invokes the <b>OOM killer within the cgroup</b>, killing python3 with SIGKILL (exit code 137 = 128 + 9). The host and other containers are unaffected. A CPU limit, by contrast, never kills: it <b>throttles</b>, which shows up as latency spikes.`},
{tb:[], th:[], g:[G('Container vs VM',['kernel','shared with host','bad'],['start time','milliseconds','ok'],['overhead','near zero (it\'s a process)','ok'],['isolation','weaker: a kernel bug affects all','bad'],['hardening','seccomp, capabilities, AppArmor/SELinux, gVisor, Kata (VM-backed)'])],
 say:`<b>Say it:</b> "A container is a group of ordinary processes isolated by kernel features. Namespaces restrict what they see: PID, mount, network, hostname, IPC and user IDs. Cgroups limit and account what they use: memory, CPU, PIDs, I/O; exceeding the memory limit triggers the OOM killer inside the cgroup, while exceeding CPU quota throttles. An overlay file system stacks read-only image layers with a copy-on-write layer. Containers share the host kernel, so they start in milliseconds with little overhead but isolate less strongly than VMs."`}
],
keep:[`Container = process + namespaces (see) + cgroups (use) + layered rootfs.`,`Namespaces: pid, mnt, net, uts, ipc, user, cgroup.`,`cgroups v2: memory.max, cpu.max, pids.max, io.max.`,`Memory limit → OOM kill (exit 137); CPU limit → throttling.`,`Shares the host kernel: fast and light, weaker isolation than VMs.`]}, {
  imp: 'must',
  theory: TH(`Containers are processes isolated by namespaces, constrained by cgroups and given an image through a layered file system, all on the shared host kernel.`,
`<p>If VMs are separate flats with their own wiring, containers are hotel rooms: each guest gets a private-looking room with its own number, key and minibar, but the building's plumbing and staff (the kernel) are shared. The hotel limits how much electricity each room may draw (cgroups) and makes sure guests can't see into other rooms (namespaces).</p>
<p>Everything here is a Linux kernel feature that existed before Docker; Docker and Kubernetes made them convenient. Knowing the pieces explains container behaviour: why PID 1 matters (0.5), why exit code 137 means OOM, why CPU limits cause latency.</p>`,
[[`Namespace`,`Kernel feature giving a process its own view of a resource.`],[`cgroup`,`Control group: resource limits and accounting for a set of processes.`],[`OverlayFS`,`Union file system combining read-only layers with a writable one.`],[`Image layer`,`Read-only file-system diff, shared between containers.`],[`OOM killer`,`Kernel mechanism that kills processes when memory can't be freed.`],[`CPU throttling`,`Pausing a cgroup that used its CPU quota for the period.`],[`seccomp / capabilities`,`Restricting syscalls / root powers.`]],
[`Unpack image layers; mount them with overlayfs plus a writable layer.`,`clone the init process into new namespaces.`,`Set up networking (veth pair, bridge, NAT) and the mount tree; pivot_root.`,`Create a cgroup with limits and move the process into it.`,`Drop capabilities, apply seccomp, exec the entry point.`],
[`Kubernetes: requests → cpu.weight, limits → cpu.max / memory.max.`,`Exit 137 / OOMKilled in kubectl describe → raise the limit or fix the leak.`,`JVMs and Go runtimes read cgroup limits to size heaps and thread counts.`],
[`Treating containers as a security boundary equal to VMs.`,`Setting tight CPU limits for latency-sensitive services.`,`Running a non-reaping process as PID 1.`])
  ,
  examples: [
    {lv:'basic', title:'A namespace with unshare', code:`$ sudo unshare --pid --fork --mount-proc --uts bash
# hostname container1
# ps aux
USER   PID %CPU COMMAND
root     1  0.0 bash          # we are PID 1 in this namespace
root     8  0.0 ps aux
# (on the host, this bash has an ordinary PID like 51234)`, why:`No Docker needed: unshare creates the namespaces directly. Only the processes inside are visible.`},
    {lv:'mid', title:'Container limits are cgroup files', code:`$ docker run -d --name api --memory 512m --cpus 0.5 myapi
$ CG=/sys/fs/cgroup/system.slice/docker-$(docker inspect -f '{{.Id}}' api).scope
$ cat $CG/memory.max $CG/cpu.max
536870912
50000 100000
$ cat $CG/cpu.stat | grep throttled
nr_throttled 312`, why:`--memory and --cpus are just writes to memory.max and cpu.max. nr_throttled counts periods where the container hit its CPU quota.`},
    {lv:'adv', title:'Diagnosing an OOM-killed pod', code:`$ kubectl describe pod api-7d9f | grep -A3 "Last State"
    Last State:  Terminated
      Reason:    OOMKilled
      Exit Code: 137
$ dmesg | grep -i "memory cgroup out of memory"
Memory cgroup out of memory: Killed process 4242 (java) total-vm:3.1GB, anon-rss:510MB
# fix: right-size the limit, or cap the JVM heap (-XX:MaxRAMPercentage=75) below it`, why:`137 = 128 + SIGKILL(9). The kernel log names the victim and its resident memory at the time.`},
  ],
  tips: {
    say:`"Containers are regular processes isolated by kernel features. Namespaces give them their own view of PIDs, mounts, network, hostname, IPC and user IDs; cgroups limit and account CPU, memory, PIDs and I/O; and an overlay file system stacks read-only image layers under a copy-on-write layer. They share the host kernel, so they start in milliseconds with near-zero overhead, but isolation is weaker than a VM. Hitting the memory limit gets the process OOM-killed with exit 137; hitting the CPU quota throttles it."`,
    points:[`Namespaces vs cgroups (see vs use).`,`Overlay layers.`,`OOM vs throttling, container vs VM.`],
    traps:[`Saying containers run their own kernel.`,`Saying a CPU limit kills the container.`],
    qa:[[`Why are containers less isolated than VMs?`,`All containers share one kernel; a kernel vulnerability or misconfigured capability can let a process escape to the host. VMs add a hypervisor boundary with a much smaller attack surface.`],
        [`What does exit code 137 mean?`,`The process was killed by SIGKILL (128 + 9), typically by the OOM killer when the container hit its memory limit.`],
        [`What are gVisor and Kata Containers?`,`Stronger isolation for containers: gVisor intercepts syscalls in a user-space kernel; Kata runs each container inside a lightweight VM.`]]
  },
  exercises: [
    {lv:'E', q:`Which kernel feature limits a container's memory: namespaces or cgroups?`, ans:'cgroups', hint:`See vs use.`, answer:`<p>cgroups (memory.max).</p>`},
    {lv:'M', q:`A container exits with code 137. Which signal killed it? (number)`, ans:'9', hint:`137 − 128.`, answer:`<p>9 (SIGKILL), usually the OOM killer.</p>`},
    {lv:'H', q:`cpu.max is "25000 100000". What fraction of one CPU (decimal) can the container use?`, ans:'0.25', hint:`quota / period.`, answer:`<p>25 ms per 100 ms = 0.25 CPU.</p>`},
  ],
  quiz: [
    [`Containers share…`,[`Nothing with the host`,`The host's kernel`,`The host's PID numbers`,`A hypervisor`],1,`It's the key difference from VMs.`,'E'],
    [`Namespaces control…`,[`How much CPU a process uses`,`What a process can see (PIDs, mounts, network…)`,`Disk speed`,`Scheduling priority`],1,`Isolation of views.`,'E'],
    [`cgroups control…`,[`File names`,`Resource limits and accounting`,`Hostnames`,`Image layers`],1,`CPU, memory, PIDs, I/O.`,'E'],
    [`When a container exceeds memory.max…`,[`It's throttled`,`The OOM killer kills a process in the cgroup`,`It's paused`,`Swap is always used`],1,`Exit 137.`,'M'],
    [`When a container exceeds its CPU quota…`,[`It's killed`,`It's throttled until the next period`,`It's migrated`,`Nothing`],1,`Latency spikes.`,'M'],
    [`OverlayFS provides containers with…`,[`Networking`,`Read-only image layers plus a writable copy-on-write layer`,`Memory limits`,`PID isolation`],1,`Layered images.`,'M'],
  ],
  quizAdv: [
    [`A user namespace lets…`,[`Root inside the container map to an unprivileged uid on the host`,`Users share passwords`,`Containers skip cgroups`,`Processes see host PIDs`],0,`Rootless containers.`,'H'],
    [`Kubernetes CPU requests map to…`,[`cpu.max`,`cpu.weight (relative shares)`,`memory.max`,`pids.max`],1,`Limits map to cpu.max.`,'H'],
    [`Kata Containers improve isolation by…`,[`Removing namespaces`,`Running each container in a lightweight VM`,`Using seccomp only`,`Disabling cgroups`],1,`VM boundary.`,'H'],
  ],
});
