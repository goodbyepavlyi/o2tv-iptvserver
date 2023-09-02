module.exports = {
    O2TVError: class O2TVError extends Error {
        constructor(data) {
            super("Failed");
            this.name = "O2TVError";
            this.data = data;
        }
    },

    O2TVApiError: class O2TVApiError extends Error {
        constructor(message, data) {
            super(message);
            this.name = "O2TVApiError";
            this.data = data;
        }
    },

    O2TVAuthenticationError: class O2TVAuthenticationError extends Error {
        constructor(data) {
            super("Failed to authenticate");
            this.name = "O2TVAuthenticationError";
            this.data = data;
        }
    }
}