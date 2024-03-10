module.exports = class O2TVError extends Error {
    constructor(message, response) {
        super(message);
        this.response = response;
    }

    getResponse = () => this.response;

    
}