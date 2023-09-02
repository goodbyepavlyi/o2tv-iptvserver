const chalk = require("chalk");

module.exports = class ConsoleLog {
    Level = {
        Success: {
          Text: "Success",
          Color: chalk.hex("#4a934a"),
          ColorBright: chalk.hex("#5cb85c"),
        },
        Error: {
          Text: "Error",
          Color: chalk.hex("#c62828"),
          ColorBright: chalk.hex("#e53935"),
        },
        Info: {
          Text: "Info",
          Color: chalk.hex("#0077b6"),
          ColorBright: chalk.hex("#00b4d8"),
        },
        Debug: {
          Text: "Debug",
          Color: chalk.hex("#ed9122"),
          ColorBright: chalk.hex("#fea500"),
        },
        Warning: {
          Text: "Warning",
          Color: chalk.hex("#e47200"),
          ColorBright: chalk.hex("#e69b01"),
        },
    };

    /**
     * Logs a message with the specified log level.
     * @param {Log.Level} level [level=Log.Levels.Info] - The log level from Log.Levels enum-like structure.
     * @param {string} message - The message to log.
     */
    log(level, type, message) {
        if (!level) throw new TypeError('\'Level\' is undefined');
        if (!type) throw new TypeError('\'Type\' is undefined');
        if (!message) throw new TypeError('\'Message\' is undefined');

        console.log(`${level.Color(`(${level.Text})`)} ${level.ColorBright(`${type} - ${message}`)}`);
    }

    success(type, message) {
        this.log(this.Level.Success, type, message);
    }

    error(type, message) {
        this.log(this.Level.Error, type, message);
    }

    info(type, message) {
        this.log(this.Level.Info, type, message);
    }

    debug(type, message) {
        this.log(this.Level.Debug, type, message);
    }

    warning(type, message) {
        this.log(this.Level.Warning, type, message);
    }
};