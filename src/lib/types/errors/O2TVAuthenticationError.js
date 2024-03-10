module.exports = class O2TVAuthenticationError extends Error {
    constructor({ message = "O2TV authentication error", data } = {}) {
        super(message);
        this.name = this.constructor.name;
        this.data = data;
    }
}