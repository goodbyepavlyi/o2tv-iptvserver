module.exports = class WebRoute {
    static get Home() {
        return "/";
    }

    static get Login() {
        return "/login";
    }
    
    static get Channels() {
        return "/channels";
    }

    static get ApiRelease() {
        return "/api/release";
    }

    static get ApiO2TVLogin() {
        return "/api/o2tv/login";
    }
    
    static get ApiO2TVChannels() {
        return "/api/o2tv/channels";
    }

    static get ApiO2TVStream() {
        return "/api/o2tv/stream";
    }
    
    static get ApiO2TVPlaylist() {
        return "/api/o2tv/playlist";
    }
}