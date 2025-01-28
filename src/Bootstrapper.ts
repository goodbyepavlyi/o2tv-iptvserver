import O2TVController from './O2TV/O2TVController';
import Express from './Express/Express';

import Logger from './Logger';
import Config from './Config';

export default class Bootstrapper {
    private static O2TVController: O2TVController;
    private static Express: Express;

    public static Init() {
        this.O2TVController = new O2TVController();
        this.Express = new Express();
    }

    public static async Start() {
        let StartupTime = Date.now();

        try{
            this.Init();

            await this.O2TVController.Start();
            await this.Express.Start();
        }catch(err: any){
            Logger.Error(Logger.Type.Application, 'An error occurred during startup! Exiting...');
            Logger.Error(Logger.Type.Application, err.message);
            Logger.Error(Logger.Type.Application, err.stack);
            process.exit(1);
        }
    
        StartupTime = Date.now() - StartupTime;
        Logger.Info(Logger.Type.Application, `Started &c${process.Description} v${process.Version}&r in &c${StartupTime}&rms!`);
    }

    public static async Stop() {
        await this.O2TVController.Stop();

        Config.SaveConfig();
    }
}