import fs from 'node:fs';
import path from 'node:path';

export default class Utils{
    public static ReadDirRecursive(Directory: string): string[]{
        let Entries: string[] = [];
        for(const File of fs.readdirSync(Directory)){
            const PathFile = path.join(Directory, File);
            if(fs.statSync(PathFile).isDirectory()){
                Entries = Entries.concat(Utils.ReadDirRecursive(PathFile));
            }else{
                Entries.push(PathFile);
            }
        }
    
        return Entries;
    }

    public static RandomString(Length: number): string{
        const Characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let Result = '';
    
        for(let i = 0; i < Length; i++){
            Result += Characters.charAt(Math.floor(Math.random() * Characters.length));
        }
    
        return Result;
    }

    public static ReplaceHTMLChars(val: string){
        return val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&apos;').replace(/"/g, '&quot;');
    }
}