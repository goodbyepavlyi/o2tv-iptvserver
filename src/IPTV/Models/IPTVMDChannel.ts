import IPTVChannel, { ChannelData } from './IPTVChannel';

export default class IPTVMDChannel extends IPTVChannel{
    constructor(Data: ChannelData, MDData: MDChannelData){
        super(Data);

        this.Id = MDData.Id;
        this.Name = `${Data.Name} - ${MDData.Name}`;
        this.StartDate = MDData.StartDate;
        this.EndDate = MDData.EndDate;
    }
}

type MDChannelData = {
    Id: string|number;
    Name: string;
    StartDate: Date;
    EndDate: Date;
};