class API {
    /**
     * @param {object} Options 
     * @param {string} Options.Url 
     * @param {string} Options.Method 
     * @param {string} Options.Type
     * @param {object} Options.Data
     * @param {object} Options.Headers
     * @returns {Promise<object>} 
     */
    static async Call(Options = {}, Callback) {
        const RequestOptions = {
            method: Options.Method || 'GET',
            url: Options.Url,
            type: Options.Type,
            data: Options.Data,
            headers: Options.Headers || {}
        };

        if (RequestOptions.type == 'json') {
            RequestOptions.data = JSON.stringify(Options.Data);
            RequestOptions.contentType = 'application/json';
        }

        if (RequestOptions.type == "blob") {
            (RequestOptions.xhrFields ??= {}).responseType = 'blob';
        }

        return $.ajax({
            ...RequestOptions,
            success: Data => {
                if(Data.Status == 'FAIL') return Callback(new Error(Data.Message));
                return Callback(null, Data);
            },
            error: (xhr, status, error) => {
                Logger.error(Logger.Type.API, "An error occurred while calling the API:", JSON.stringify(error))

                const Data = JSON.parse(xhr.responseText);
                return Callback(new Error(Data.Message));
            }
        });
    }

    static O2TVLogin = (Settings, Callback) => this.Call({
        Method: 'POST',
        Url: '/Api/O2TV/Login',
        Type: 'json',
        Data: Settings
    }, Callback);
}