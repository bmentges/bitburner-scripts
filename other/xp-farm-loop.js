/** @param {NS} ns **/
export async function main(ns) {
    const script = "xp-weaken.js";
    const buffer = 16; // reserve RAM on home
    const delayBuffer = 2000; // safety delay between cycles

    while (true) {
        const target = findEasiestTarget(ns);
        if (!target) {
            ns.tprint("❌ No suitable target found.");
            return;
        }

        const allServers = getAllServers(ns);
        const purchased = ns.getPurchasedServers();
        const rooted = allServers.filter(s => ns.hasRootAccess(s) || purchased.includes(s));

        let launched = false;

        for (const server of rooted) {
            const maxRam = ns.getServerMaxRam(server);
            const usedRam = ns.getServerUsedRam(server);
            const freeRam = server === "home" ? maxRam - usedRam - buffer : maxRam - usedRam;
            const threads = Math.floor(freeRam / ns.getScriptRam(script));

            if (threads > 0) {
                await ns.scp(script, server);
                const pid = ns.exec(script, server, threads, target);
                if (pid !== 0) {
                    launched = true;
                    ns.print(`🧠 ${server}: ${threads} threads to weaken ${target}`);
                }
            }
        }

        if (launched) {
            const weakenTime = ns.getWeakenTime(target);
            ns.print(`🕐 Waiting ${ns.tFormat(weakenTime)} for weaken cycle...`);
            await ns.sleep(weakenTime + delayBuffer);
        } else {
            ns.print("⏳ No available threads. Waiting 10s...");
            await ns.sleep(10000);
        }
    }
}

function findEasiestTarget(ns) {
    return getAllServers(ns)
        .filter(s =>
            ns.hasRootAccess(s) &&
            ns.getServerRequiredHackingLevel(s) <= ns.getHackingLevel() &&
            ns.getServerMaxMoney(s) > 0 &&
            s !== "home")
        .sort((a, b) =>
            ns.getServerRequiredHackingLevel(a) - ns.getServerRequiredHackingLevel(b))[0];
}

function getAllServers(ns, start = "home", visited = new Set()) {
    const stack = [start];
    const result = [];
    while (stack.length) {
        const node = stack.pop();
        if (!visited.has(node)) {
            visited.add(node);
            result.push(node);
            stack.push(...ns.scan(node));
        }
    }
    return result;
}

