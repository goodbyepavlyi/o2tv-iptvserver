import axios from 'axios';
import Logger from '../Logger';

export default class HTTP{
    public static Request = (Url: string, Method: string, Headers?: Record<string, string>, Body?: any, RawAxios: boolean = false) => 
        new Promise((Resolve, Reject) => {
            Logger.Trace(Logger.Type.Application, `=> ${Method} ${Url}`, Body);
            return axios(Url, {
                method: Method,
                headers: Headers,
                data: Body
            }).then(res => {
                Logger.Trace(Logger.Type.Application, `<= ${Method} ${Url}`, res.data);
                Resolve(RawAxios ? res : res.data);
            }).catch(err => Reject(err?.response?.data || err));
        });

    public static Get = (Url: string, Headers?: Record<string, string>, Raw?: boolean) => HTTP.Request(Url, 'GET', Headers, undefined, Raw);
    public static Post = (Url: string, Body: any, Headers?: Record<string, string>, Raw?: boolean) => HTTP.Request(Url, 'POST', Headers, Body, Raw);

    public static GetAndReturnRedirect = (Url: string, Headers?: Record<string, string>) => new Promise<string>((Resolve, Reject) => 
        HTTP.Get(Url, Headers, true)
            .then((Response: any) => Resolve(Response.request.res.responseUrl || Url))
            .catch(Reject)
    );

    public static PostAndReturnRedirect = (Url: string, Body: any, Headers?: Record<string, string>) => new Promise<string>((Resolve, Reject) => 
        HTTP.Post(Url, Body, Headers, true)
            .then((Response: any) => Resolve(Response.request.res.responseUrl || Url))
            .catch(Reject)
    );
}