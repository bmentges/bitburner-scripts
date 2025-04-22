// File: orchestrator.js
/** @param {NS} ns **/
export async function main(ns) {
    const scriptPaths = {
        hack: "scripts/hack.js",
        grow: "scripts/grow.js",
        weaken: "scripts/weaken.js"
    };

    const loopInterval = 2000; // ms
    const batchDelay = 100;    // ms buffer between operations
    const maxTargets = 3;      // Number of concurrent targets to orchestrate

    while (true) {
        const allServers = discoverServers(ns);
        const purchasedServers = ns.getPurchasedServers();
        const rooted = allServers.filter(s => ns.hasRootAccess(s) || purchasedServers.includes(s));
        const hackableTargets = selectHackableTargets(ns, rooted, 10).slice(0, maxTargets);
        const runners = rooted.filter(s => ns.getServerMaxRam(s) > 0);

        let ramMap = {};
        for (const server of runners) {
            const max = ns.getServerMaxRam(server);
            const used = ns.getServerUsedRam(server);
            ramMap[server] = server === 'home' ? max - used - 32 : max - used; // reserve 32GB on home
        }

        // Create per-target RAM maps
        const targetPlans = hackableTargets.map(target => {
            const plan = planThreads(ns, target);
            const totalBatchRam = getTotalBatchRam(ns, plan);
            return { target, plan, totalBatchRam };
        });

        let targetIndex = 0;
        while (getTotalFreeRam(ramMap) >= Math.min(...targetPlans.map(p => p.totalBatchRam))) {
            const { target, plan } = targetPlans[targetIndex % targetPlans.length];
            const success = await runBatch(ns, target, plan, ramMap, scriptPaths, batchDelay);
            if (!success) break;
            targetIndex++;
        }

        await ns.sleep(loopInterval);
    }
}

function discoverServers(ns) {
    const stack = ["home"], seen = new Set();
    while (stack.length) {
        const s = stack.pop();
        if (!seen.has(s)) {
            seen.add(s);
            stack.push(...ns.scan(s));
        }
    }
    return [...seen];
}

function selectHackableTargets(ns, servers, limit = 5) {
    return servers
        .filter(s => ns.getServerMaxMoney(s) > 0 && ns.getServerRequiredHackingLevel(s) <= ns.getHackingLevel())
        .map(s => ({
            name: s,
            score: ns.getServerMaxMoney(s) * ns.hackAnalyzeChance(s)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(t => t.name);
}

function planThreads(ns, target) {
    const money = ns.getServerMoneyAvailable(target);
    const maxMoney = ns.getServerMaxMoney(target);
    const hackFraction = 0.05;
    const hackThreads = Math.floor(ns.hackAnalyzeThreads(target, maxMoney * hackFraction));
    const growMultiplier = 1 / (1 - hackFraction);
    const growThreads = Math.ceil(ns.growthAnalyze(target, growMultiplier));
    const weaken1 = Math.ceil(ns.hackAnalyzeSecurity(hackThreads) / ns.weakenAnalyze(1));
    const weaken2 = Math.ceil(ns.growthAnalyzeSecurity(growThreads) / ns.weakenAnalyze(1));
    return { hackThreads, growThreads, weaken1, weaken2 };
}

function getTotalBatchRam(ns, plan) {
    return plan.hackThreads * ns.getScriptRam("scripts/hack.js") +
           plan.growThreads * ns.getScriptRam("scripts/grow.js") +
           (plan.weaken1 + plan.weaken2) * ns.getScriptRam("scripts/weaken.js");
}

function getTotalFreeRam(ramMap) {
    return Object.values(ramMap).reduce((a, b) => a + Math.max(0, b), 0);
}

async function runBatch(ns, target, plan, ramMap, scripts, buffer) {
    const times = {
        weaken: ns.getWeakenTime(target),
        grow: ns.getGrowTime(target),
        hack: ns.getHackTime(target)
    };

    const now = Date.now();
    const tWeaken1 = now + buffer;
    const tGrow = now + (times.weaken - times.grow) + buffer * 2;
    const tHack = now + (times.weaken - times.hack) + buffer * 3;
    const tWeaken2 = now + buffer * 4;

    const batchPlan = [
        { script: scripts.hack,     threads: plan.hackThreads,  delay: tHack },
        { script: scripts.grow,     threads: plan.growThreads,  delay: tGrow },
        { script: scripts.weaken,   threads: plan.weaken1,      delay: tWeaken1 },
        { script: scripts.weaken,   threads: plan.weaken2,      delay: tWeaken2 }
    ];

    for (const task of batchPlan) {
        let threadsLeft = task.threads;
        const scriptRam = ns.getScriptRam(task.script);
        for (const server of Object.keys(ramMap)) {
            if (threadsLeft <= 0) break;
            const maxThreads = Math.floor(ramMap[server] / scriptRam);
            if (maxThreads <= 0) continue;

            const toRun = Math.min(threadsLeft, maxThreads);

            // Ensure script exists on remote server
            if (server !== 'home') {
                await ns.scp(task.script, server);
            }

            const pid = ns.exec(task.script, server, toRun, task.delay - Date.now(), target);
            if (pid !== 0) {
                ramMap[server] -= toRun * scriptRam;
                threadsLeft -= toRun;
            }
        }
        if (threadsLeft > 0) return false;
    }
    return true;
}
