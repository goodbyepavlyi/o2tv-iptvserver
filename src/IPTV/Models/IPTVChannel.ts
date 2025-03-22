export default class IPTVChannel{
    public Id: string|number;
    public Number: number;
    
    public Name: string;
    public Logo?: string;
    
    public StartDate?: Date;
    public CreateDate?: Date;
    public EndDate?: Date;

    public Adult?: boolean;

    constructor(Data: ChannelData){
        this.Id = Data.Id;
        this.Number = Data.Number;
        
        this.Name = Data.Name;
        this.Logo = Data.Logo;

        this.StartDate = Data.StartDate;
        this.CreateDate = Data.CreateDate;
        this.EndDate = Data.EndDate;

        this.Adult = Data.Adult;
    }
}

export type ChannelData = {
    Id: string|number;
    Number: number;
    
    Name: string;
    Logo?: string;

    StartDate?: Date;
    CreateDate?: Date;
    EndDate?: Date;

    Adult?: boolean;
};