import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';

export type LogLevel = 'Debug'|'Info'|'Warn'|'Error'|'Trace';

interface LoggerType {
    Color: string;
    Output: string;
};

type LogLevelConfig = {
    Level: number;
    Callback: (...args: any[]) => void;
    Color: string;
    Output: string;
};

export default class Logger {
    static LogToFile: boolean;
    static LogDirectory: string = './Data/Logs';
    static LogFile: fs.WriteStream|null = null;
    static LogLevel: LogLevelConfig|null = null;

    static readonly Colors = {
        Uncolorize: (value: string): string => value.replace(/\x1B\[\d+m/gi, ''),
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
            Crimson: '\x1b[38m'
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
            Crimson: '\x1b[48m'
        }
    };

    static readonly Type: {
        Logger: LoggerType;
        Config: LoggerType;
        Application: LoggerType;
        Express: LoggerType;
        O2TV: LoggerType;
    } = {
        Logger: {
            Color: `${Logger.Colors.Dim}${Logger.Colors.Fg.Blue}`,
            Output: 'LOGGER'
        },
        Config: {
            Color: Logger.Colors.Fg.Cyan,
            Output: 'CONFIG'
        },
        Application: {
            Color: Logger.Colors.Fg.Magenta,
            Output: 'APPLICATION'
        },
        Express: {
            Color: Logger.Colors.Fg.Green,
            Output: 'EXPRESS'
        },
        O2TV: {
            Color: Logger.Colors.Fg.Blue,
            Output: 'O2TV'
        }
    };

    static readonly LogLevels: Record<'Trace'|'Debug'|'Info'|'Warn'|'Error', LogLevelConfig> = {
        Trace: {
            Level: -2,
            Callback: console.debug,
            Color: Logger.Colors.Fg.Yellow,
            Output: 'TRACE'
        },
        Debug: {
            Level: -1,
            Callback: console.debug,
            Color: Logger.Colors.Fg.Yellow,
            Output: 'DEBUG'
        },
        Info: {
            Level: 0,
            Callback: console.info,
            Color: `${Logger.Colors.Bright}${Logger.Colors.Fg.Blue}`,
            Output: 'INFO'
        },
        Warn: {
            Level: 1,
            Callback: console.warn,
            Color: `${Logger.Colors.Bright}${Logger.Colors.Fg.Yellow}`,
            Output: 'WARN'
        },
        Error: {
            Level: 2,
            Callback: console.error,
            Color: `${Logger.Colors.Blink}${Logger.Colors.Bright}${Logger.Colors.Fg.Red}`,
            Output: 'ERROR'
        }
    }

    static Init(Options: { LogLevel: LogLevel; LogToFile: boolean }): void {
        Logger.SetLogLevel(Options.LogLevel);
        Logger.SetLogToFile(Options.LogToFile);
    }

    static SetLogLevel(Level: LogLevel): void {
        Logger.LogLevel = this.LogLevels[Level] || this.LogLevels.Info;
        this.Info(Logger.Type.Logger, `Log level set to &c${Level}&r`);
    }

    static SetLogToFile(Value: boolean): void {
        if (Logger.LogToFile == Value) return;

        Logger.LogToFile = Value;

        if (Value) {
            Logger.CreateLogFile();
        } else {
            Logger.LogFile?.end();
            Logger.LogFile = null;
        }
    }

    private static CreateLogFile(): void {
        if (process.DevMode || !Logger.LogToFile) return;
        if (!fs.existsSync(this.LogDirectory)) {
            fs.mkdirSync(this.LogDirectory);
            this.Info(Logger.Type.Logger, `Created log directory &c${this.LogDirectory}&r`);
        }

        const DatePrefix = Logger.BuildDatePrefix({ Prefix: { Date: '-' }, Year: true, Month: true, Day: true });

        let FileName = path.join(this.LogDirectory, `${DatePrefix}.log`);
        let FileId = 1;
        while (fs.existsSync(FileName)) {
            FileName = path.join(this.LogDirectory, `${DatePrefix}-${FileId}.log`);
            FileId++;
        }

        Logger.LogFile = fs.createWriteStream(FileName, { flags: 'a' });
    }

    private static BuildLogLinePrefix(Level: LogLevelConfig, Type: LoggerType): string {
        const DatePrefix = Logger.BuildDatePrefix({ Year: true, Month: true, Day: true, Hour: true, Minute: true, Second: true });
        return `[${DatePrefix}] [${Level.Color}${Level.Output}${Logger.Colors.Reset}] [${Type.Color}${Type.Output}${Logger.Colors.Reset}]`;
    }

    private static BuildDatePrefix(Options: {
        Year?: boolean;
        Month?: boolean;
        Day?: boolean;
        Hour?: boolean;
        Minute?: boolean;
        Second?: boolean;
        Prefix?: {
            Date?: string;
            Time?: string;
        };
    }): string {
        const Prefix = {
            Date: Options.Prefix?.Date || '/',
            Time: Options.Prefix?.Time || ':',
        };
    
        const DateOptions = {
            Year: new Date().getFullYear(),
            Month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
            Day: new Date().getDate().toString().padStart(2, '0'),
            Hour: new Date().getHours().toString().padStart(2, '0'),
            Minute: new Date().getMinutes().toString().padStart(2, '0'),
            Second: new Date().getSeconds().toString().padStart(2, '0'),
        };
    
        let DateString = '';
        if (Options.Year) DateString += `${DateOptions.Year}${Prefix.Date}`;
        if (Options.Month) DateString += `${DateOptions.Month}${Prefix.Date}`;
        if (Options.Day) DateString += `${DateOptions.Day}`;
        if (Options.Hour) DateString += ` ${DateOptions.Hour}${Prefix.Time}`;
        if (Options.Minute) DateString += `${DateOptions.Minute}${Prefix.Time}`;
        if (Options.Second) DateString += `${DateOptions.Second}`;
    
        return DateString;
    }

    private static Log(LogLevel: LogLevelConfig, LogType: LoggerType, ...Args: any[]): void {
        if (Logger.LogLevel && Logger.LogLevel?.Level > LogLevel.Level) return;

        const LogLinePrefix = Logger.BuildLogLinePrefix(LogLevel, LogType);
        const LogLine = [ LogLinePrefix, ...Args ].map(Arg => {
            if (Arg == LogLinePrefix) return Arg;

            if (typeof Arg == 'string') {
                Arg = Arg.replaceAll('&r', Logger.Colors.Reset);

                if (LogLevel.Level == Logger.LogLevels.Error.Level) 
                    return Arg.replaceAll('&c', Logger.Colors.Fg.Red);
                if (LogLevel.Level == Logger.LogLevels.Warn.Level) 
                    return Arg.replaceAll('&c', Logger.Colors.Fg.Yellow);

                return Arg.replaceAll('&c', LogType.Color);
            }

            return (Args[0]?.includes?.('=') ? '' : '\n') + util.inspect(Arg, { depth: LogLevel == Logger.LogLevels.Trace ? 5 : 2, colors: true });
        }).join(' ');

        LogLevel.Callback(LogLine);
        if (Logger.LogFile instanceof fs.WriteStream) {
            Logger.LogFile.write(`${LogLine}\n`);
        }
    }

    static Trace = (Type: LoggerType, ...Args: any[]) => Logger.Log(Logger.LogLevels.Trace, Type, ...Args);
    static Debug = (Type: LoggerType, ...Args: any[]) => Logger.Log(Logger.LogLevels.Debug, Type, ...Args);
    static Info = (Type: LoggerType, ...Args: any[]) => Logger.Log(Logger.LogLevels.Info, Type, ...Args);
    static Warn = (Type: LoggerType, ...Args: any[]) => Logger.Log(Logger.LogLevels.Warn, Type, ...Args);
    static Error = (Type: LoggerType, ...Args: any[]) => Logger.Log(Logger.LogLevels.Error, Type, ...Args);
}