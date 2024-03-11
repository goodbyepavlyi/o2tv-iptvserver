const Utils = require("../utils/Utils");

module.exports = class APIResponse {
    constructor(data) {
        this.statusCode = data.statusCode;
        this.code = data.code;
        this.message = data.message;
        this.error = data.error;
    }

    send = (res, data) => res.status(this.statusCode).json({
        code: this.code,
        message: this.message,
        error: this.error,
        version: Utils.getVersion(),
        ...data
    })

    static OK = new APIResponse({ statusCode: 200, code: 200, message: "OK" });
    static ROUTE_NOT_FOUND = new APIResponse({ statusCode: 404, code: 404, error: "ROUTE_NOT_FOUND" });
    static INTERNAL_SERVER_ERROR = new APIResponse({ statusCode: 500, code: 500, error: "INTERNAL_SERVER_ERROR" });
    static UNAUTHORIZED = new APIResponse({ statusCode: 401, code: 401, error: "UNAUTHORIZED" });
    static MISSING_REQUIRED_VALUES = new APIResponse({ statusCode: 400, code: 400, error: "MISSING_REQUIRED_VALUES" });
    static INVALID_REQUEST_BODY = new APIResponse({ statusCode: 400, code: 400, error: "INVALID_REQUEST_BODY" });

    static AUTHENTICATION_ERROR = new APIResponse({ statusCode: 401, code: 1000, error: "AUTHENTICATION_ERROR" });
    static O2TV_API_ERROR = new APIResponse({ statusCode: 500, code: 1001, error: "O2TV_API_ERROR" });

    static CHANNEL_WITHOUT_EPG = new APIResponse({ statusCode: 500, code: 2000, error: "CHANNEL_WITHOUT_EPG" });
    static ACCOUNT_PLAYBACK_CONCURRENCY_LIMITATION = new APIResponse({ statusCode: 500, code: 2001, error: "ACCOUNT_PLAYBACK_CONCURRENCY_LIMITATION" }); 
}