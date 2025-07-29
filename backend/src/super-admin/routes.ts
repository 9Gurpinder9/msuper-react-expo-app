import { Router } from 'express';
import authenticate from '../middleware/authenticate';
import {
    loginHandler,
    verifyOtpHandler,
    dashboardHandler
} from './controllers/superAdmin.controller';

const router = Router();

router.post('/login', loginHandler);
router.post('/verify-otp', verifyOtpHandler);
router.get('/dashboard', authenticate, dashboardHandler);

export default router;
