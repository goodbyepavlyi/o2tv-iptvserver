module.exports = class O2TVAccountError extends Error {
    constructor(message = "O2TV account error") {
        super(message);
    }
}