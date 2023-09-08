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
        this.url = WebRoute.ApiO2TVChannels;
    }

    /**
     * Sets up the API route.
     * 
     * @param {import('express').Express} express - The Express app instance.
     */
    async setup(express) {
        express.get(this.url, async (req, res) => {
            try {
                const channelsList = this.application.getO2TV().getChannels().getChannelsList('number');
                const liveEpg = await this.application.getO2TV().getEpg().getLiveEpg();

                const channels = [];

                for (const channelNum of Object.keys(channelsList)) {
                    const channel = channelsList[channelNum];

                    // If channel doesn't have EPG
                    if (!liveEpg[channel.getID()]) 
                        continue;
                    
                    // If channel is a Multi-dimension stream
                    if (liveEpg[channel.getID()].md) {
                        const mdStreams = await channel.fetchMultiDimension(liveEpg[channel.getID()]);

                        for (const mdStream of mdStreams) {
                            console.log("mdStream", mdStream)
                            channels.push({
                                channel: {
                                    id: channel.getID(),
                                    name: channel.getName(),
                                    logo: channel.getLogo(),
                                },
                                md: {
                                    id: mdStream.id,
                                    name: mdStream.name,
                                    description: mdStream.description,
                                },
                                epg: {
                                    title: mdStream.name,
                                    description: mdStream.description,
                                    startts: mdStream.startts,
                                    endts: mdStream.endts,
                                }
                            });
                        }

                        continue;
                    }

                    channels.push({
                        channel: {
                            id: channel.getID(),
                            name: channel.getName(),
                            logo: channel.getLogo(),
                        },
                        epg: {
                            title: liveEpg[channel.getID()].title,
                            description: liveEpg[channel.getID()].description,
                            startts: liveEpg[channel.getID()].startts,
                            endts: liveEpg[channel.getID()].endts,
                        }
                    });
                }

                ApiResponse.Success.send(res, {
                    channels, 
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
};
