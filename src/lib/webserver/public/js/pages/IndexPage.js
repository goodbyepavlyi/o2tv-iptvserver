class Page {
    constructor(app) {
        this.app = app;

        this.downloadPlaylist = $("[data-downloadPlaylist]");
        this.channelList = $("[data-channelList]");

        this.init();
    }

    convertUnixToTime = (ts) => new Date(ts).toLocaleTimeString('en-US')

    async init() {
        this.downloadPlaylist.on("click", this._downloadPlaylist);

        await this.loadChannels();
    }

    _downloadPlaylist = () => API._call({
        url: "/api/o2tv/playlist",
        method: "GET",
        type: "blob"
    }, (error, data) => {
        if (error) {
            Logger.error(Logger.Type.API, "An error occurred while downloading the playlist:", error.message);
            this.downloadPlaylist.prop("disabled", true).addClass("red");
            setTimeout(() => this.downloadPlaylist.prop("disabled", false).removeClass("red"), 2500);
            return;
        }

        this.downloadPlaylist.addClass("green");
        setTimeout(() => this.downloadPlaylist.removeClass("green"), 1500);
        this.app._download(data, `o2tv_iptv_server_${new Date().toISOString().split("T")[0]}_playlist.m3u`);
    })

    loadChannels = async () => API.getChannels((error, data) => {
        if (error) {
            return Logger.error(Logger.Type.API, "An error occurred while loading the channels:", error.message);
        }

        for (const channel of data.channels) {
            this.channelList.append(this._renderChannel(channel));
        }
    })

    _renderChannel(data) {
        if (!data) {
            Logger.error(Logger.Type.API, "An error occurred while rendering the channel:", "No data provided");
        }

        const logoElement = $("<img>").addClass("channelLogo").attr("src", `${data.channel.logo}/height/80/width/144`);

        const channelNameElement = $("<h2>").addClass("channelName").text(data.channel.name)
            .append(
                $("<span>").addClass("channelEpg")
                    .text(` (${this.convertUnixToTime(data.epg.startts * 1000)} - ${this.convertUnixToTime(data.epg.endts * 1000)})`)
            );

        const epgTitle = $("<p>").addClass("channelEpg").text(data.epg.title);

        const currentTimestamp = Math.floor(Date.now() / 1000);
        const epgDuration = data.epg.endts - data.epg.startts;
        const elapsedTime = currentTimestamp - data.epg.startts;
        let progressPercentage = (elapsedTime / epgDuration) * 100;
        progressPercentage = progressPercentage > 100 ? 100 : progressPercentage;

        const progressBar = $("<div>")
            .addClass("channelProgressBar")
            .append(
                $("<div>").addClass("progress").css("width", `${progressPercentage}%`)
            );

        const programInfo = $("<div>").addClass("programInfo").append(epgTitle, progressBar);

        const channelInfo = $("<div>")
            .addClass("w-full")
            .append(channelNameElement, programInfo);

        const downloadButton = $("<button>")
            .addClass("btn downloadButton")
            .append(
                $("<img>").addClass("icon").attr("src", "/public/img/icons/download.svg")
            )
            .on("click", (event) => {
                let url = `/api/o2tv/playlist/${data.channel.id}`;
    
                if (data.md && data.md.id) {
                    url += `/${data.md.id}`;
                }

                API._call({
                    url,
                    method: "GET",
                    type: "blob"
                }, (error, playlist) => {
                    if (event.target.tagName === "IMG") {
                        event.target = event.target.parentElement;
                    }

                    if (error) {
                        Logger.error(Logger.Type.API, "An error occurred while downloading the playlist for channel:", error.message);
                        $(event.target).prop("disabled", true).addClass("red");
                        setTimeout(() => $(event.target).prop("disabled", false).removeClass("red"), 2500);
                        return;
                    }
                    
                    $(event.target).addClass("green");
                    setTimeout(() => $(event.target).removeClass("green"), 1500);
                    this.app._download(playlist, `o2tv_iptv_server_${new Date().toISOString().split("T")[0]}_${data.channel.name}.m3u`);
                })
            });

        return $("<div>").addClass("channel").append(logoElement, channelInfo, downloadButton);
    }
}