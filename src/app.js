const Application = require("./lib/Application");
const Logger = require("./lib/utils/Logger.js");
const application = new Application();

process.on("unhandledRejection", (reason, promise) => {
    Logger.error(Logger.Type.Watchdog, "Unhandled Rejection", {
        stack: reason?.stack,
    });
});

async function shutdown() {
    try {
        await application.shutdown();

        // Need to exit here because otherwise the process would stay open
        process.exit(0);
    } catch (error) {
        Logger.error(Logger.Type.Watchdog, `Error occured:`, error);
        process.exit(1);
    }
}

// Signal termination handler - used if the process is killed
process.on("SIGTERM", shutdown);

// Signal interrupt handler - if the process is aborted by Ctrl + C (during dev)
process.on("SIGINT", shutdown);

process.on("uncaughtException", (error, origin) => {
    Logger.error(Logger.Type.Watchdog, "Uncaught Exception", { error, origin });

    shutdown().catch(() => { /* intentional */ });
});

process.on("exit", (code) => {
    if (code !== 0) {
        Logger.error(Logger.Type.Watchdog, `Stacktrace that lead to the process exiting with code ${code}:`, new Error().stack);
        return;
    }
   
    Logger.info(Logger.Type.Watchdog, `Exiting with code ${code}...`);
});