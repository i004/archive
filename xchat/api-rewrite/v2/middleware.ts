import User from "./objects/User";
import Session from "./objects/Session";
import { Request, Response, NextFunction } from "express";
import { APIError } from "./objects/Error";

export interface AuthorizedRequest extends Request {
    user: User
}

export async function requireAuth (req: AuthorizedRequest, res: Response, next: NextFunction) {
    if (!req.headers['x-session-id'] || !Session.resolve(req.headers['x-session-id'] as string))
        throw new APIError('Unauthorized', 401);
    
    const session = Session.resolve(req.headers['x-session-id'] as string);
    
    req.user = User.resolve(session.privateId);
    
    next();
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
    if (err instanceof APIError)
        res.status(err.code).json(err.toJSON());
    else
        res.status(500).json({
            code: 500,
            message: 'Something went wrong'
        });
}