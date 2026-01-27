import { Router } from 'express';
import authenticate from '../middleware/authenticate';
import {
    loginHandler,
    verifyOtpHandler,
    dashboardHandler,
    resendOtpHandler,
    resetPasswordRequestHandler,
    resetPasswordVerifyOtpHandler,
    resetPasswordConfirmHandler
} from './controllers/superAdmin.controller';
import { onlineScanBillHandler } from './controllers/documentAi.controller';
import { validate } from '../middleware/validate';
import {
    loginSchema,
    emailOnlySchema,
    verifyOtpSchema,
    resetPasswordRequestSchema,
    resetPasswordVerifyOtpSchema,
    resetPasswordConfirmSchema,
    onlineScanBillSchema
} from './schemas';

const router = Router();

router.post('/login', validate(loginSchema), loginHandler);
router.post('/verify-otp', validate(verifyOtpSchema), verifyOtpHandler);
router.post('/resend-otp', validate(emailOnlySchema), resendOtpHandler);
router.post('/reset-password/request', validate(resetPasswordRequestSchema), resetPasswordRequestHandler);
router.post('/reset-password/verify-otp', validate(resetPasswordVerifyOtpSchema), resetPasswordVerifyOtpHandler);
router.post('/reset-password/confirm', validate(resetPasswordConfirmSchema), resetPasswordConfirmHandler);
router.get('/dashboard', authenticate, dashboardHandler);
router.post('/online-scan-bill', authenticate, validate(onlineScanBillSchema), onlineScanBillHandler);

export default router;
