/** @param {NS} ns **/
export async function main(ns) {
    const servers = discoverAll(ns);

    for (const server of servers) {
        if (ns.hasRootAccess(server) || server === "home") continue;

        const portsRequired = ns.getServerNumPortsRequired(server);
        let portsOpened = 0;

        if (ns.fileExists("BruteSSH.exe")) {
            ns.brutessh(server);
            portsOpened++;
        }
        if (ns.fileExists("FTPCrack.exe")) {
            ns.ftpcrack(server);
            portsOpened++;
        }
        if (ns.fileExists("relaySMTP.exe")) {
            ns.relaysmtp(server);
            portsOpened++;
        }
        if (ns.fileExists("HTTPWorm.exe")) {
            ns.httpworm(server);
            portsOpened++;
        }
        if (ns.fileExists("SQLInject.exe")) {
            ns.sqlinject(server);
            portsOpened++;
        }

        if (portsOpened >= portsRequired) {
            ns.nuke(server);
            ns.tprint(`✅ Rooted: ${server}`);
        } else {
            ns.tprint(`❌ Could not breach ${server} (need ${portsRequired}, opened ${portsOpened})`);
        }
    }
}

// Recursive network scan
function discoverAll(ns, start = "home", visited = new Set()) {
    const stack = [start];
    const found = [];

    while (stack.length) {
        const server = stack.pop();
        if (!visited.has(server)) {
            visited.add(server);
            found.push(server);
            stack.push(...ns.scan(server));
        }
    }

    return found;
}

