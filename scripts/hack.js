/** @param {NS} ns **/
export async function main(ns) {
    const [delay, target] = ns.args;
    await ns.sleep(delay);
    await ns.hack(target);
}

