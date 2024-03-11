class APIError {
    constructor(message, displayMessage) {
        this.message = message;
        this.displayMessage = displayMessage || "Unknown error occurred";
    }

    static INTERNAL_SERVER_ERROR = new APIError("INTERNAL_SERVER_ERROR", "Internal server error");
    static MISSING_REQUIRED_VALUES = new APIError("MISSING_REQUIRED_VALUES", "Missing required values");
    static AUTHENTICATION_ERROR = new APIError("AUTHENTICATION_ERROR", "Authentication error");
}

class API {
    /**
     * @param {object} options 
     * @param {string} options.url 
     * @param {string} options.method 
     * @param {string} options.type
     * @param {object} options.data
     * @param {object} options.headers
     * @returns {Promise<object>} 
     */
    static async _call(options = {}, callback) {
        const requestOptions = {
            url: options.url,
            method: options.method || "GET",
            type: options.type,
            data: options.data,
            headers: options.headers || {}
        };

        if (requestOptions.type == "json") {
            requestOptions.data = JSON.stringify(options.data);
            requestOptions.contentType = "application/json";
        }

        if (requestOptions.type == "blob") {
            (requestOptions.xhrFields ??= {}).responseType = "blob";
        }

        return $.ajax({
            ...requestOptions,
            success: (data) => {
                if (data.error) {
                    if (APIError[data.error]) {
                        return callback(APIError[data.error]);
                    }
                    
                    return callback(new APIError(data.error));
                }

                return callback(null, data);
            },
            error: (xhr, status, error) => {
                Logger.error(Logger.Type.API, "An error occurred while calling the API:", JSON.stringify(error))

                const data = JSON.parse(xhr.responseText);
                if (data.error && APIError[data.error]) {
                    return callback(APIError[data.error]);
                }
                
                return callback(new APIError(data.error));
            }
        });
    }
    
    /**
     * @returns {Promise<object>}
     */
    static getVersion = (callback) => this._call({
        url: "/api"
    }, (error, data) => {
        if (error) {
            return callback(error);
        }

        return callback(null, data.version);
    })

    /**
     * @returns {Promise<object>}
     */
    static getLatestVersion = (callback) => this._call({
        url: "https://goodbyepavlyi.github.io/o2tv-iptvserver/releases.json"
    }, (error, data) => {
        if (error) {
            return callback(error);
        }

        const releases = Object.entries(data).map(([version, changelog]) => ({ version, changelog }));
        const latestReleaseVersion = releases.reduce((latest, release) => release.version > latest ? release.version : latest, "0.0.0");
        return callback(null, releases.find(release => release.version == latestReleaseVersion));
    })

    /**
     * @param {string} username
     * @param {string} password
     * @returns {Promise<object>}
     */
    static o2tvLogin = (username, password, callback) => this._call({
        url: "/api/o2tv/login",
        method: "POST",
        type: "json",
        data: { username, password }
    }, callback)

    /**
     * @returns {Promise<object>}
     */
    static getChannels = (callback) => this._call({
        url: "/api/o2tv/channels"
    }, callback)
}