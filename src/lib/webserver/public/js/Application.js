class Application {
    constructor() {
        this.checkForUpdates();
    }

    _download = (blob, filename) => {
        const a = $("<a>").attr("href", URL.createObjectURL(blob)).attr("download", filename);
        $("body").append(a);
        a[0].click();
        setTimeout(() => a.remove(), 100);
    }

    hideLoader = (loaderId = "[data-loaderPage]") => $(loaderId).fadeOut()

    async checkForUpdates() {
        try {
            const currentVersion = await new Promise((resolve, reject) => {
                API.getVersion((error, data) => {
                    if (error) {
                        Logger.error(Logger.Type.Application, "An error occurred while fetching the current version:", error);
                        reject(error);
                    }
                    
                    resolve(data);
                });
            });
    
            const latestVersion = await new Promise((resolve, reject) => {
                API.getLatestVersion((error, data) => {
                    if (error) {
                        Logger.error(Logger.Type.Application, "An error occurred while fetching the latest version:", error);
                        reject(error);
                    }
                   
                    resolve(data);
                });
            });
    
            if (currentVersion >= latestVersion.version) {
                Logger.info(Logger.Type.Application, "You are running the latest version of the application.");
                return;
            }
            
            Logger.info(Logger.Type.Application, `A new version of the application is available: ${latestVersion.version}`);
            $("[data-updaterChangelog]").text(latestVersion.changelog);
            $("[data-updater]").show();
        } catch (error) {
            // Handle errors here
            Logger.error(Logger.Type.Application, "An error occurred while checking for updates:", error);
        }
    }    
}