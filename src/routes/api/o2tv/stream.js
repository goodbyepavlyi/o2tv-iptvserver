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
        this.url = WebRoute.ApiO2TVStream;

        this.cache = {};
    }

    /**
     * Sets up the API route.
     * 
     * @param {import('express').Express} express - The Express app instance.
     */
    async setup(express) {
        express.get(this.url, async (req, res) => {
            try {
                const { id } = req.query;
                if (!id) 
                    return ApiResponse.MalformedRequest.send(res);
                
                if (this.cache[id]) {
                    const { url, mpd } = this.cache[id];
                    
                    const keepAliveUrl = this.application.getO2TV().getStream().getKeepaliveURL(url, mpd);
                    const streamXml = await this.fetchMPD(keepAliveUrl);

                    res.set('Content-Type', 'application/dash+xml').send(streamXml);
                    return;
                }
                
                await this.application.getO2TV().getStream().playLive(id)
                    .then(async (streamUrl) => {
                        const streamXml = await this.fetchMPD(id, streamUrl);
                        res.set('Content-Type', 'application/dash+xml').send(streamXml);
                    });
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

    async fetchMPD(streamId, streamUrl) {
        const response = await fetch(streamUrl);
        if (!response.ok) 
            return;

        const mpdContent = await response.text();
        const streamUrlParts = streamUrl.split('/manifest.mpd');
        const newBaseURL = streamUrlParts[0];
        
        const mpdXml = mpdContent.replace(/<BaseURL>.*<\/BaseURL>/, `<BaseURL>${newBaseURL}/</BaseURL>`);

        this.cache[streamUrl] = {
            url: response.url,
            mpd: mpdXml,
        };

        return mpdXml;
    }
};
