import { RequestHandler } from 'express';
import { verifyJwt } from '../utils/generateJwt';
import logger from '../utils/logger';

const authenticateCompany: RequestHandler = (req, res, next): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ success: false, message: 'Unauthorized: token missing.' });
        return;
    }

    const token = authHeader.split(' ')[1];
    try {
        const payload = verifyJwt(token);
        if (payload.role !== 'COMPANY') {
            logger.warn(`Role mismatch in company auth middleware. Expected COMPANY, got ${payload.role}`);
            res.status(403).json({ success: false, message: 'Forbidden: access denied.' });
            return;
        }
        // attach decoded payload to req.user
        ; (req as any).user = payload;
        next();
    } catch (err: any) {
        logger.warn(`JWT verification failed for company: ${err.message}`);
        res.status(401).json({ success: false, message: 'Unauthorized: invalid token.' });
    }
};

export default authenticateCompany;
