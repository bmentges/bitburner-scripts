/** @param {NS} ns **/
export async function main(ns) {
    const servers = discoverAll(ns);
    for (const server of servers) {
        if (ns.hasRootAccess(server)) {
            const stopped = ns.killall(server);
            ns.tprint(`🛑 Killed all scripts on ${server}: ${stopped}`);
        } else {
            ns.tprint(`⚠️ No root access on ${server}, skipping`);
        }
    }
}

// Recursively scan the network
function discoverAll(ns, start = "home", visited = new Set()) {
    const stack = [start];
    const found = [];

    while (stack.length) {
        const current = stack.pop();
        if (!visited.has(current)) {
            visited.add(current);
            found.push(current);
            stack.push(...ns.scan(current));
        }
    }

    return found;
}

