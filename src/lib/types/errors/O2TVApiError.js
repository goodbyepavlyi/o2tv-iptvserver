module.exports = class O2TVApiError extends Error {
    constructor({ message = "O2TV API error", data } = {}) {
        super(message);
        this.name = this.constructor.name;
        this.data = data;
    }
}