import axios from 'axios';

export default class HTTP {
    static Request = (Url: string, Method: string, Headers?: Record<string, string>, Body?: any) => new Promise((Resolve, Reject) => 
        axios(Url, {
            method: Method,
            headers: Headers,
            data: Body
        })
            .then((Response) => Resolve(Response.data))
            .catch((Error) => Reject(Error?.response?.data || Error))
    );

    static Get = (Url: string, Headers?: Record<string, string>) => HTTP.Request(Url, 'GET', Headers);
    static Post = (Url: string, Body: any, Headers?: Record<string, string>) => HTTP.Request(Url, 'POST', Headers, Body);

    static GetRedirectedUrl = (Url: string, Headers?: Record<string, string>) => new Promise<string>((Resolve, Reject) => 
        axios.get(Url, { headers: Headers })
            .then(Response => Resolve(Response.request.res.responseUrl || Url))
            .catch(Reject)
    );
}