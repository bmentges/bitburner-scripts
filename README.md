# Bitburner Orchestrator Script

## Overview

`orchestrator.js` is a multi-target automation script for Bitburner that distributes hack, grow, and weaken batches across all rooted servers. It identifies the most profitable targets and executes synchronized batches to maximize money gain.

Author: Bruno Mentges

## Features

- Automatically selects up to 3 profitable targets
- Schedules hack/grow/weaken operations with proper delays
- Uses available RAM across all rooted servers (reserving 32GB on home)
- Executes continuously in a loop every 2 seconds
- Modular support for external scripts (`scripts/hack.js`, `grow.js`, `weaken.js`)

## Folder Structure

```text
Bitburner-scripts/
├── orchestrator.js
└── scripts/
    ├── hack.js
    ├── grow.js
    └── weaken.js
```

## Usage

1. Place the orchestrator and script files in the appropriate locations.
2. Run from the terminal, in "home", with: `run orchestrator.js`

## Example `hack.js`, `grow.js`, `weaken.js`

Each script should accept delay and target arguments:

```javascript
/** @param {NS} ns **/
export async function main(ns) {
    const [delay, target] = ns.args;
    await ns.sleep(delay);
    await ns.hack(target); // or grow / weaken
}
```

## Other Tools

Under `other/` directory:

- *breach-all.js*: Gain root on all servers using available port openers
- *shutdown-all.js*: Kills all scripts running across all servers
- *buy-max-server.js*: Buys one server with maximum GB possible, recommend having 30b+
- *xp-farm-loop*: runs `xp-weaken.js` against the weakest possible target to farm Hack exp quickly

## License

MIT License
