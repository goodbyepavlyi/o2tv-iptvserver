const Config = new (require('./lib/Config.js'));

Config.initializeConfig() // Loads the configuration
    .then(async () => {
        const o2tv = new (require('./lib/o2tv/O2TV'))(Config);
        await o2tv.refreshChannels();
        
        const WebServer = new (require('./lib/webserver/WebServer'))(o2tv);
    });