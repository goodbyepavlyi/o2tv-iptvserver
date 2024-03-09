const Application = require("./lib/Application.js");
const application = new Application();

process.on("unhandledRejection", (reason, promise) => {
    application.getConsoleLog().error("Unhandled Rejection", reason?.stack || reason);
    console.debug(reason);
});

async function shutdown() {
    try {
        await application.shutdown();
        process.exit(0);
    } catch (error) {
        application.getConsoleLog().error("Shutdown", error.stack || error);
        process.exit(1);
    }
}

// Signal termination handler - used if the process is killed
// (e.g. kill command, service valetudo stop, reboot (via upstart),...)
process.on("SIGTERM", shutdown);

// Signal interrupt handler -
// e.g. if the process is aborted by Ctrl + C (during dev)
process.on("SIGINT", shutdown);

process.on("uncaughtException", (error, origin) => {
    application.getConsoleLog().error("Uncaught Exception", error.stack || error);
    
    shutdown().catch(() => {
        // Intentional
    });
});

process.on("exit", async (code) => {
    await shutdown();

    if (code !== 0) 
        return application.getConsoleLog().error("Shutdown", `Stacktrace that lead to the process exiting with code ${code}:`, new Error().stack);
    
    return application.getConsoleLog().info("Shutdown", `Exiting with code ${code}...`);
});