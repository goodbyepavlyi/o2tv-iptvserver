const Application = require("../../../lib/Application");
const { O2TVAuthenticationError, O2TVApiError } = require("../../../lib/o2tv/O2TVErrors");
const ApiResponse = require("../../../lib/webserver/ApiResponse");
const WebRoute = require("../../../lib/webserver/WebRoute");

module.exports = class {
    /**
     * Constructs an instance of SetupHandler.
     * 
     * @param {Application} application - The Application instance.
     */
    constructor(application) {
        this.application = application;
        this.url = WebRoute.ApiO2TVPlaylist;
    }

    /**
     * Sets up the API route.
     * 
     * @param {import("express").Express} express - The Express app instance.
     */
    async setup(express) {
        express.get(this.url, async (req, res) => {
            try {
                const { id } = req.query;
                const channels = await this.application.getO2TV().getChannels().getChannels()
                    .then((data) => {
                        if (id) 
                            return Object.keys(data).reduce((result, key) => (data[key].id == id ? { ...result, [key]: data[key] } : result), {});

                        return data;
                    })
                    .then((data) => {
                        return Object.keys(data).map((key) => {
                            return {
                                id: data[key].id,
                                name: data[key].name,
                                logo: data[key].logo,
                            };
                        })
                    });
                
                let m3uEntry = "#EXTM3U";
                for (const channel of channels) 
                    m3uEntry += `\n#EXTINF:-1 catchup=\"append\" catchup-days=\"7\" catchup-source=\"&catchup_start_ts={utc}&catchup_end_ts={utcend}\" tvg-id=\"${channel.name}\" tvh-epg=\"0\" tvg-logo=\"${channel.logo}\",${channel.name}\n${this.application.getConfig().WebServer_PublicURL}/api/o2tv/stream?id=${channel.id}`;
                
                res.setHeader("Content-Type", "text/plain")
                    .setHeader("Content-Disposition", "attachment; filename=\"playlist.m3u\"")
                    .send(m3uEntry);
            } catch (error) {
                let response;

                if (error instanceof O2TVAuthenticationError) 
                    response = ApiResponse.O2TVAuthenticationFailed;

                if (error instanceof O2TVApiError) 
                    response = ApiResponse.O2TVApiError;
                
                if (!response) 
                    response = ApiResponse.ServerError;
                
                this.application.getConsoleLog().error("WebServer", error);
                response.send(res);
            }
        });
    }
};
