/** @param {NS} ns **/
export async function main(ns) {
    const prefix = "pserv";
    const maxServers = ns.getPurchasedServerLimit();
    const budget = ns.getServerMoneyAvailable("home");
    const maxRam = 2 ** 20; // Bitburner's max RAM tier is 1,048,576 GB

    // Determine max affordable RAM
    let ram = 2;
    while (ram * 2 <= maxRam && ns.getPurchasedServerCost(ram * 2) <= budget) {
        ram *= 2;
    }

    if (ram < 2) {
        ns.tprint("❌ Not enough money to buy any server.");
        return;
    }

    const currentServers = ns.getPurchasedServers();
    if (currentServers.length >= maxServers) {
        ns.tprint("⚠️ Server limit reached. Cannot purchase more.");
        return;
    }

    // Find the first available index for a new server name
    let index = 1;
    while (currentServers.includes(`${prefix}-${index}`)) {
        index++;
    }

    const name = `${prefix}-${index}`;
    const hostname = ns.purchaseServer(name, ram);

    if (hostname) {
        ns.tprint(`✅ Purchased '${hostname}' with ${ram}GB RAM.`);
    } else {
        ns.tprint("❌ Failed to purchase server.");
    }
}

