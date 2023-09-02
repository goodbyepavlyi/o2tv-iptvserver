/**
 * Represents an API response with a custom code, message, and HTTP status code.
 */
module.exports = class ApiResponse {
    /**
     * Create a new ApiResponse.
     * @param {number} code - The custom code for the response.
     * @param {string} message - The message for the response.
     * @param {number} httpCode - The HTTP status code for the response.
     */
    constructor(code, message, httpCode) {
        this.code = code;
        this.message = message;
        this.httpCode = httpCode;
    }

    /**
     * Respond to an Express Response object with an empty body.
     * @param {import("express").Response} res - The Express Response object to respond to.
     * @param {Object} message - The message
     */
    send(res, message) {
        return res.status(this.httpCode).json({
            ...this.toJSON(),
            ...message,
        });
    }

    /**
     * Convert the ApiResponse to a JSON object, excluding the httpCode property.
     * @returns {Object} - The JSON representation of the ApiResponse without httpCode.
     */
    toJSON() {
        const { httpCode, ...response } = this;
        return response;
    }

    /**
     * Convert the ApiResponse to a JSON string.
     * @returns {string} - The JSON string representation of the ApiResponse.
     */
    toWebSocket() {
        return JSON.stringify(this);
    }
    
    /**
     * Get an ApiResponse instance for a successful response with a status code of 200.
     * @returns {ApiResponse} - An ApiResponse instance representing a successful response.
     */
    static get Success() {
        return new ApiResponse(200, "Success", 200);
    }

    /**
     * Get an ApiResponse instance for a malformed request with a status code of 400.
     * @returns {ApiResponse} - An ApiResponse instance representing a malformed request.
     */
    static get NotFound() {
        return new ApiResponse(404, "Not found", 404);
    }

    /**
     * Get an ApiResponse instance for a malformed request with a status code of 400.
     * @returns {ApiResponse} - An ApiResponse instance representing a malformed request.
     */
    static get MalformedRequest() {
        return new ApiResponse(0, "Malformed Request", 400);
    }

    /**
     * Get an ApiResponse instance for a server error with a status code of 500.
     * @returns {ApiResponse} - An ApiResponse instance representing a server error.
     */
    static get ServerError() {
        return new ApiResponse(500, "Server Error", 500);
    }

    /**
     * Get an ApiResponse instance for an unauthorized request with a status code of 401.
     * @returns {ApiResponse} - An ApiResponse instance representing an unauthorized request response.
     */
    static get O2TVAuthenticationFailed() {
        return new ApiResponse(1000, "Authentication with O2TV failed", 401);
    }

    /**
     * Get an ApiResponse instance for an unauthorized request with a status code of 401.
     * @returns {ApiResponse} - An ApiResponse instance representing an unauthorized request response.
     */
    static get O2TVApiError() {
        return new ApiResponse(1001, "O2TV API Error", 500);
    }
}