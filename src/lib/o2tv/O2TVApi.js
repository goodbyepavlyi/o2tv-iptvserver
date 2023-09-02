const axios = require("axios");
const { O2TVApiError } = require("./O2TVErrors");
const O2TV = require("./O2TV");

module.exports = class O2TVApi {
    /**
     * 
     * @param {O2TV} o2tv 
     */
    constructor(o2tv) {
        this.o2tv = o2tv;
        this.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:98.0) Gecko/20100101 Firefox/98.0", 
            "Accept-Encoding": "gzip", 
            "Accept": "*/*", 
            "Content-type": "application/json;charset=UTF-8", 
        };
    }

    getHeaders() {
        return this.headers;
    }

    /**
     * Calls the O2 API with the provided URL, data, and headers.
     * 
     * @param {string} url - The URL to call.
     * @param {Object|null} data - The data to send.
     * @param {Object} headers - The headers to include in the request.
     * @returns {Promise<Object>} - The API response data.
     */
    async call(options) {
        if (options.data != null) 
            options.data = JSON.stringify(options.data);

        try {
            const response = await axios({
                url: options.url, 
                method: options.method, 
                data: options.data, 
                headers: options.headers, 
            });

            return response.data;
        } catch (error) {
            if (!error.response) 
                throw new O2TVApiError(error.message);

            throw new O2TVApiError(error.message, error.response);
        }
    }

    async callList(options) {
        let result = [];
        let fetch = true;

        while (fetch) {
            const data = await this.call({
                url: `https://${this.o2tv.getPartnerId()}.frp1.ott.kaltura.com/api_v3/service/asset/action/list?format=1&clientTag=${this.o2tv.getClientTag()}`, 
                method: "POST", 
                data: options.data, 
                headers: this.o2tv.getApi().getHeaders(), 
            });

            if (data.err || data.error || !data.result || !data.result.hasOwnProperty('totalCount')) {
                fetch = false;
                throw new O2TVApiError("Failed to fetch data from O2 TV", data);
            }

            const totalCount = data.result.totalCount;
            if (totalCount < 0) 
                fetch = false;
            
            for (const object of data.result.objects) 
                result.push(object);
        
            if (totalCount == result.length) 
                fetch = false;

            let pager = options.data["pager"];
            pager["pageIndex"] =+ 1;
            options.data["pager"] = pager;
        }

        return result;
    }
}