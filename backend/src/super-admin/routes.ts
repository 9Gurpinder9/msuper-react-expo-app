import { Router } from 'express';
import authenticate from '../middleware/authenticate';
import {
    loginHandler,
    verifyOtpHandler,
    dashboardHandler,
    resendOtpHandler
} from './controllers/superAdmin.controller';
import { validate } from '../middleware/validate';
import { loginSchema, emailOnlySchema, verifyOtpSchema } from './schemas';

const router = Router();

router.post('/login', validate(loginSchema), loginHandler);
router.post('/verify-otp', validate(verifyOtpSchema), verifyOtpHandler);
router.post('/resend-otp', validate(emailOnlySchema), resendOtpHandler);
router.get('/dashboard', authenticate, dashboardHandler);

export default router;
