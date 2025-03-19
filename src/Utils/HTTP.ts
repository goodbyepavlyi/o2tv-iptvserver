import axios from 'axios';

export default class HTTP{
    static Request = (Url: string, Method: string, Headers?: Record<string, string>, Body?: any, RawAxios: boolean = false) => 
        new Promise((Resolve, Reject) => 
            axios(Url, {
                method: Method,
                headers: Headers,
                data: Body
            })
                .then(res => Resolve(RawAxios ? res : res.data))
                .catch(err => Reject(err?.response?.data || err))
        );

    static Get = (Url: string, Headers?: Record<string, string>, Raw?: boolean) => HTTP.Request(Url, 'GET', Headers, undefined, Raw);
    static Post = (Url: string, Body: any, Headers?: Record<string, string>, Raw?: boolean) => HTTP.Request(Url, 'POST', Headers, Body, Raw);

    static GetAndReturnRedirect = (Url: string, Headers?: Record<string, string>) => new Promise<string>((Resolve, Reject) => 
        HTTP.Get(Url, Headers, true)
            .then((Response: any) => Resolve(Response.request.res.responseUrl || Url))
            .catch(Reject)
    );

    static PostAndReturnRedirect = (Url: string, Body: any, Headers?: Record<string, string>) => new Promise<string>((Resolve, Reject) => 
        HTTP.Post(Url, Body, Headers, true)
            .then((Response: any) => Resolve(Response.request.res.responseUrl || Url))
            .catch(Reject)
    );
}