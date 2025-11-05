import { RequestHandler } from 'express';
import { verifyJwt } from '../utils/generateJwt';
import logger from '../utils/logger';

const authenticate: RequestHandler = (req, res, next): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ success: false, message: 'Unauthorized: token missing.' });
        return;
    }

    const token = authHeader.split(' ')[1];
    try {
        const payload = verifyJwt(token);
        // attach decoded payload to req.user
        ; (req as any).user = payload;
        next();
    } catch (err: any) {
        logger.warn(`JWT verification failed: ${err.message}`);
        res.status(401).json({ success: false, message: 'Unauthorized: invalid token.' });
    }
};

export default authenticate;
