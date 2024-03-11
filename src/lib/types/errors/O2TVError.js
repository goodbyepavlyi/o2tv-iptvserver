module.exports = class O2TVError extends Error {
    constructor({ message = "O2TV error", type = O2TVError.Type.Unknown, data }) {
        super(message);
        this.type = type;
        this.data = data;
    }

    static Type = {
        Unknown: "Unknown",
        ChannelWithoutEpg: "ChannelWithoutEpg",
        AccountPlaybackConcurrencyLimitation: "AccountPlaybackConcurrencyLimitation",
        Unauthorized: "Unauthorized",
        NoAccountServices: "NoAccountServices",
    }
}