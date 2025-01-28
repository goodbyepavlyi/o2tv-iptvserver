import fs from 'node:fs';
import path from 'node:path';

export default class Utils {
    static ParseJsonOrNull(Data: string): object|null {
        try {
            return JSON.parse(Data);
        } catch {
            return null;
        }
    }

    static ReadJsonOrNull(Path: string): object|null {
        return Utils.ParseJsonOrNull(fs.readFileSync(Path, 'utf-8'));
    }

    static ReadDirectoryOrEmpty(Directory: string): string[] {
        if (!fs.existsSync(Directory)) return [];
        return fs.readdirSync(Directory);
    }

    static ConvertBytes(Bytes: number): string {
        const Units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        let UnitIndex = 0;
    
        while (Bytes >= 1000 && UnitIndex < Units.length - 1) {
            Bytes /= 1000;
            UnitIndex++;
        }
    
        return `${Math.floor(Bytes)} ${Units[UnitIndex]}`;
    }

    static FormatMegabytes(Megabytes: number): string {
        return Utils.ConvertBytes(Megabytes * 1000 * 1000);
    }

    static ConvertBiBytes(Bytes: number): string {
        const Units = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB'];
        let UnitIndex = 0;
    
        while (Bytes >= 1024 && UnitIndex < Units.length - 1) {
            Bytes /= 1024;
            UnitIndex++;
        }
    
        return `${Math.floor(Bytes)} ${Units[UnitIndex]}`;
    }

    static Sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static ReadDirRecursive(Directory: string): string[] {
        let Files: string[] = [];
        const ReadDir = fs.readdirSync(Directory);
    
        for (const File of ReadDir) {
            const PathFile = path.join(Directory, File);
    
            if (fs.statSync(PathFile).isDirectory()) {
                Files = Files.concat(Utils.ReadDirRecursive(PathFile));
            } else {
                Files.push(PathFile);
            }
        }
    
        return Files;
    }

    static RemoveArrayDuplicates<T>(Array: T[]): T[] {
        return Array.filter((Value, Index) => Array.indexOf(Value) === Index);
    }

    static RandomString(Length: number): string {
        const Characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let Result = '';
    
        for (let i = 0; i < Length; i++) {
            Result += Characters.charAt(Math.floor(Math.random() * Characters.length));
        }
    
        return Result;
    }

    static FormatTime(Time: number, Unit: 'Milliseconds'|'Seconds'|'Minutes'|'Hours'|'Days' = 'Seconds'): string {
        const TimeUnits = {
            Milliseconds: 1,
            Seconds: 1000,
            Minutes: 1000 * 60,
            Hours: 1000 * 60 * 60,
            Days: 1000 * 60 * 60 * 24
        };

        const TimeUnit = TimeUnits[Unit];
        if (!TimeUnit) return 'Invalid unit';

        const Days = Math.floor(Time / TimeUnits.Days);
        const Hours = Math.floor((Time % TimeUnits.Days) / TimeUnits.Hours);
        const Minutes = Math.floor((Time % TimeUnits.Hours) / TimeUnits.Minutes);
        const Seconds = Math.floor((Time % TimeUnits.Minutes) / TimeUnits.Seconds);
        
        return `${Days ? `${Days}d ` : ''}${Hours ? `${Hours}h ` : ''}${Minutes ? `${Minutes}m ` : ''}${Seconds ? `${Seconds}s` : ''}`;
    }
}