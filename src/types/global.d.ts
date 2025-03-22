import express from 'express';
import { IPTVProviderType } from '../IPTV/IPTVProviderType';

declare global{
    namespace NodeJS{
        interface Process{
            DevMode: boolean;
            Version: string;
            Description: string;
        }

        interface ProcessEnv{
            EXPRESS_PORT: string;
            EXPRESS_URL: string;

            PROVIDER_TYPE: IPTVProviderType;
            PROVIDER_USERNAME: string;
            PROVIDER_PASSWORD: string;

            PROVIDER_ONEPLAY_DEVICE_NAME: string;

            EPG_DAYS_BACK: string;
            EPG_DAYS_FORWARD: string;
        }
    }

    interface RouteRequest extends express.Request{
        IP: string;
    }
    
    interface RouteResponse extends express.Response{
        // Utils
        SendJson(Data: any, Code?: number): void;
        SendError(Code: number, Error: string, Data?: any): void;

        // 5xx
        InternalError(Error?: string|null): void;

        // 4xx
        NotFound(error?: string|null): void;
        BadRequest(error?: string|null): void;
        Unauthorized(error?: string|null): void;

        OK(Message?: string, Data?: any): void;
        FAIL(Message?: string, Data?: any): void;
        DATA(Data: any): void;
    }

    interface RouteHandler{
        name: string;
        method: string;
        required?: string[];
        middleware?: express.MiddlewareFunction[];
        run: RouteCallback;
    }

    type ExpressAPIResponse = {
        Status: 'OK'|'FAIL';
        Message: string;
        Data?: any;
    };

    type RouteCallback = (req: RouteRequest, res: RouteResponse, next: express.NextFunction) => void;

    type MiddlewareFunction = (req: RouteRequest, res: RouteResponse, route: RouteHandler) => MiddlewareResponse;
    type MiddlewareResponse = Promise<{ req: RouteRequest, res: RouteResponse }|void>;
}

export { }