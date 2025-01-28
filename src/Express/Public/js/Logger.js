class Logger {
    /**
     * @readonly
     */
    static Colors = {
        Uncolorize: (val) => val.replace(/\x1B\[\d+m/gi, ''),
        Reset: '\x1b[0m',
        Bright: '\x1b[1m',
        Dim: '\x1b[2m',
        Italic: '\x1b[3m',
        Underscore: '\x1b[4m',
        Blink: '\x1b[5m',
        Reverse: '\x1b[7m',
        Hidden: '\x1b[8m',
      
        Fg: {
          Black: '\x1b[30m',
          Red: '\x1b[31m',
          Green: '\x1b[32m',
          Yellow: '\x1b[33m',
          Blue: '\x1b[34m',
          Magenta: '\x1b[35m',
          Cyan: '\x1b[36m',
          White: '\x1b[37m',
          Crimson: '\x1b[38m',
        },
      
        Bg: {
          Black: '\x1b[40m',
          Red: '\x1b[41m',
          Green: '\x1b[42m',
          Yellow: '\x1b[43m',
          Blue: '\x1b[44m',
          Magenta: '\x1b[45m',
          Cyan: '\x1b[46m',
          White: '\x1b[47m',
          Crimson: '\x1b[48m',
        },
    }

    /**
     * @readonly
     */
    static Type = {
        Application: `${Logger.Colors.Fg.Magenta}APPLICATION${Logger.Colors.Reset}`,
        API: `${Logger.Colors.Fg.Cyan}API${Logger.Colors.Reset}`,
    }

    /**
     * @property {object} trace
     * @property {object} debug
     * @property {object} info
     * @property {object} warn
     * @property {object} error
     * @returns {object}
     */
    static LogLevels = Object.freeze({
        trace: `${Logger.Colors.Fg.Yellow}TRACE${Logger.Colors.Reset}`,
        debug: `${Logger.Colors.Fg.Yellow}DEBUG${Logger.Colors.Reset}`,
        info: `${Logger.Colors.Bright}${Logger.Colors.Fg.Blue}INFO${Logger.Colors.Reset}`,
        warn: `${Logger.Colors.Bright}${Logger.Colors.Fg.Yellow}WARN${Logger.Colors.Reset}`,
        error: `${Logger.Colors.Bright}${Logger.Colors.Fg.Red}ERROR${Logger.Colors.Reset}`
    });

    /**
     * @param {string} type
     * @param {string} level
     * @param {...any} args
     * @private
     */
    static _log(type, level, ...args){
        const logLinePrefix = `[${type}] [${Logger.LogLevels[level]}]`;
        const logLine = [logLinePrefix, ...args].join(' ');

        return console.log(logLine);
    }
    
    /**
     * @param {string} type
     * @param {...any} args
     */
    static trace = (type, ...args) => Logger._log(type, "trace", ...args);

    /**
     * @param {string} type
     * @param {...any} args
     */
    static debug = (type, ...args) => Logger._log(type, "debug", ...args);

    /**
     * @param {string} type
     * @param {...any} args
     */
    static info = (type, ...args) => Logger._log(type, "info", ...args);

    /**
     * @param {string} type
     * @param {...any} args
     */
    static warn = (type, ...args) => Logger._log(type, "warn", ...args);

    /**
     * @param {string} type
     * @param {...any} args
     */
    static error = (type, ...args) => Logger._log(type, "error", ...args);
}