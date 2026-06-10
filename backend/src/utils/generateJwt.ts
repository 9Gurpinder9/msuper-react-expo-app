import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const secret = (process.env.JWT_SECRET || (process.env.NODE_ENV !== 'production' ? 'dev-secret' : undefined)) as jwt.Secret;
const expiry = (process.env.JWT_EXPIRY as jwt.SignOptions['expiresIn']) || '1d';

export interface JwtPayload {
    [key: string]: any;
    iat?: number;
    exp?: number;
}

/**
 * Create a signed JWT with optional overrides (e.g. custom expiry)
 */
export function generateJwt(payload: object, options?: jwt.SignOptions): string {
    return jwt.sign(payload, secret, {
        expiresIn: expiry,
        ...options,
    });
}

/**
 * Verify and decode a JWT, throws if invalid/expired
 */
export function verifyJwt(token: string): JwtPayload {
    return jwt.verify(token, secret) as JwtPayload;
}
