/** @param {NS} ns **/
export async function main(ns) {
    const servers = discoverAll(ns);
    const rooted = [];

    for (const server of servers) {
        if (ns.hasRootAccess(server) || server === "home") {
            rooted.push(server);
            continue;
        }

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
            ns.tprint(`Rooted: ${server}`);
            rooted.push(server);
        } else {
            ns.tprint(`Could not breach ${server} (need ${portsRequired}, opened ${portsOpened})`);
        }
    }

    // Print rooted servers sorted by max money (ascending)
    const sorted = rooted
        .filter(s => s !== "home")
        .map(s => ({
            name: s,
            money: ns.getServerMaxMoney(s)
        }))
        .sort((a, b) => a.money - b.money);

    ns.tprint("\nRooted Servers (sorted by max money):");
    for (const { name, money } of sorted) {
        ns.tprint(`- ${name.padEnd(20)} (${formatMoneyShort(ns, money)})`);
    }
}

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

function formatMoneyShort(ns, value) {
    if (value < 1e3) return `${value.toFixed(0)}n`;
    if (value < 1e6) return `${(value / 1e3).toFixed(0)}kn`;
    if (value < 1e9) return `${(value / 1e6).toFixed(0)}mn`;
    if (value < 1e12) return `${(value / 1e9).toFixed(0)}bn`;
    if (value < 1e15) return `${(value / 1e12).toFixed(0)}tn`;
    return `${(value / 1e15).toFixed(0)}qn`;
}

