import IPTVEpg, { EPGData } from './IPTVEpg';

export default class IPTVMdEpg extends IPTVEpg{
    constructor(Data: EPGData){
        super(Data);
    }
}