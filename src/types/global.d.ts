import express from 'express';

declare global {
    namespace NodeJS {
        interface Process {
            DevMode: boolean;
            Version: string;
            Description: string;
        }

        interface ProcessEnv {
            EXPRESS_PORT: string;
            EXPRESS_URL: string;
        }
    }

    interface RouteResponse extends express.Response {
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

    interface RouteHandler {
        name: string;
        method: string;
        required?: string[];
        middleware?: express.MiddlewareFunction[];
        run: RouteCallback;
    }

    type ExpressAPIResponse = {
        Passed: boolean;
        Status: string;
        Message: string;
        Data?: any;
    };

    type RouteRequest = express.Request;
    type RouteCallback = (req: RouteRequest, res: RouteResponse, next: express.NextFunction) => void;

    type MiddlewareFunction = (req: RouteRequest, res: RouteResponse, route: RouteHandler) => MiddlewareResponse;
    type MiddlewareResponse = Promise<{ req: RouteRequest, res: RouteResponse }|void>;
}

export { }