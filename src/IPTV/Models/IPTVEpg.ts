export default class IPTVEpg{
    public Id: string|number;
    public ChannelId: string|number;
    
    public Name: string;
    public Description: string;

    public StartDate: Date;
    public EndDate: Date;

    public Poster?: string;
    public Cover?: string;
    public Meta: EPGMeta = {};
    public Show: EPGShow = {};

    public Genre: string[] = [];
    public Cast: { Name: string, Role: string }[] = [];
    public Directors: string[] = [];
    public Country?: string;

    constructor(Data: EPGData){
        this.Id = Data.Id;
        this.ChannelId = Data.ChannelId;

        this.Name = Data.Name;
        this.Description = Data.Description;

        this.StartDate = Data.StartDate;
        this.EndDate = Data.EndDate;

        this.Poster = Data.Poster;
        this.Cover = Data.Cover;
    }
}

export type EPGData = {
    Id: string|number;
    ChannelId: string|number;
    
    Name: string;
    Description: string;

    StartDate: Date;
    EndDate: Date;

    Poster?: string;
    Cover?: string;
};

type EPGMeta = {
    OriginalName?: any;
    Imdb?: any;
    Year?: any;
    ContentType?: any;
};

type EPGShow = {
    SeriesName?: any;
    SeasonName?: any;
    EpisodeName?: any;
    SeasonNumber?: any;
    EpisodeNumber?: any;
    EpisodesInSeason?: any;
};