/** @param {NS} ns */
export async function main(ns) {
    // Configurable Constants
    const scriptTimer = 2000;
    const reservePercent = 0.05; // Reserve 5% of money
    const maxSharePercent = 1.00;
    const stockVolatilityThreshold = 0.05;
    const maxDisplayForecastDelta = 0.5;
    const shortUnlock = false;
    const maxToastDuration = 15000;

    // Tail view toggle
    if (ns.args.includes("--tail")) ns.tail();

    // Utilities
    function format(num) {
        if (Math.abs(num) < 1e-6) return "0";
        return ns.nFormat(num, "$0.000a");
    }

    function formatLarge(num) {
        if (num === Infinity) return "∞";
        const extraFormats = [1e15, 1e18, 1e21, 1e24, 1e27, 1e30];
        const extraNotations = ["q", "Q", "s", "S", "o", "n"];
        for (let i = extraFormats.length - 1; i >= 0; i--) {
            if (num >= extraFormats[i]) {
                return format(num / extraFormats[i]) + extraNotations[i];
            }
        }
        return format(num);
    }

    function dynamicBuyThreshold(volatility) {
        return 0.5 + (0.1 - volatility * 2);
    }

    // Main loop
    let totalProfit = 0;
    while (true) {
        const moneyAvailable = ns.getPlayer().money;
        const moneyKeep = Math.max(1e9, moneyAvailable * reservePercent);
        let currentWorth = 0;
        let loopProfit = 0;

        const symbols = ns.stock.getSymbols();
        const forecasts = {};
        const positions = {};
        const volatilities = {};

        for (const symbol of symbols) {
            forecasts[symbol] = ns.stock.getForecast(symbol);
            positions[symbol] = ns.stock.getPosition(symbol);
            volatilities[symbol] = ns.stock.getVolatility(symbol);
        }

        const sortedSymbols = symbols.sort((a, b) => {
            return Math.abs(0.5 - forecasts[b]) - Math.abs(0.5 - forecasts[a]);
        });

        ns.print("----------------------");

        for (const stock of sortedSymbols) {
            const forecast = forecasts[stock];
            const position = positions[stock];
            const volatility = volatilities[stock];
            const askPrice = ns.stock.getAskPrice(stock);
            const bidPrice = ns.stock.getBidPrice(stock);
            const maxShares = ns.stock.getMaxShares(stock) * maxSharePercent;

            // SELL LOGIC
            if (position[0] > 0) {
                const profit = position[0] * (bidPrice - position[1]) - (2 * 100000);
                loopProfit += profit;
                if (forecast < 0.55) {
                    const sold = ns.stock.sellStock(stock, position[0]);
                    ns.toast(`Sold ${position[0]} Long ${stock} for ${format(sold)}`, "success", maxToastDuration);
                }
            }
            if (shortUnlock && position[2] > 0) {
                const profitShort = position[2] * (position[3] - bidPrice) - (2 * 100000);
                loopProfit += profitShort;
                if (forecast > 0.40) {
                    const soldShort = ns.stock.sellShort(stock, position[2]);
                    ns.toast(`Sold ${position[2]} Short ${stock} for ${format(soldShort)}`, "success", maxToastDuration);
                }
            }

            // BUY LOGIC
            const canBuyLong = forecast >= dynamicBuyThreshold(volatility) && volatility <= stockVolatilityThreshold;
            if (canBuyLong) {
                const cost = ns.stock.getPurchaseCost(stock, 1, "Long");
                if ((moneyAvailable - moneyKeep) > cost) {
                    const shares = Math.min((moneyAvailable - moneyKeep - 100000) / askPrice, maxShares - position[0]);
                    if (shares > 0) {
                        const bought = ns.stock.buyStock(stock, shares);
                        ns.toast(`Bought ${Math.round(shares)} Long ${stock} for ${format(bought)}`, "success", maxToastDuration);
                    }
                }
            }

            const canBuyShort = shortUnlock && forecast <= 0.40 && volatility <= stockVolatilityThreshold;
            if (canBuyShort) {
                const cost = ns.stock.getPurchaseCost(stock, 1, "Short");
                if ((moneyAvailable - moneyKeep) > cost) {
                    const shares = Math.min((moneyAvailable - moneyKeep - 100000) / askPrice, maxShares - position[2]);
                    if (shares > 0) {
                        const bought = ns.stock.buyShort(stock, shares);
                        ns.toast(`Bought ${Math.round(shares)} Short ${stock} for ${format(bought)}`, "success", maxToastDuration);
                    }
                }
            }

            // Value and profit display
            if (position[0] > 0 || position[2] > 0) {
                const longProfit = position[0] * (bidPrice - position[1]);
                const shortProfit = position[2] * (position[3] - bidPrice);
                currentWorth += longProfit + shortProfit + (position[0] * position[1]) + (position[2] * position[3]);
            }
        }

        totalProfit += loopProfit;

        ns.print(`Stock Holdings Value: ${formatLarge(currentWorth)}`);
        ns.print(`Net Worth: ${formatLarge(currentWorth + moneyAvailable)}`);
        ns.print(`Session Profit: ${formatLarge(totalProfit)}`);
        ns.print(`${new Date().toLocaleTimeString()} - Running...`);
        ns.print("----------------------");

        await ns.sleep(scriptTimer);
        ns.clearLog();
    }
}

