// backend/src/company/controllers/attendance.controller.ts
import { RequestHandler } from 'express';
import logger from '../../utils/logger';
import {
  getTodayPunchStatus,
  punchIn,
  punchOut,
  getAttendanceHistory,
  getMonthlyReport,
} from '../services/attendance.service';

/**
 * GET /company/attendance/status
 */
export const getPunchStatusHandler: RequestHandler = async (req, res, next) => {
  try {
    const companyId = (req as any).user?.id;
    const userId = (req as any).user?.userId;

    if (!companyId || !userId) {
       res.status(401).json({ success: false, message: 'Unauthorized: context missing.' });
       return;
    }

    const status = await getTodayPunchStatus(Number(companyId), Number(userId));
    res.json({
      success: true,
      punchedIn: !!status,
      punchedOut: !!(status && status.punch_out_time),
      data: status,
    });
  } catch (err: any) {
    logger.error('Failed to get today punch status', err);
    next(err);
  }
};

/**
 * POST /company/attendance/punch-in
 */
export const punchInHandler: RequestHandler = async (req, res, next) => {
  try {
    const companyId = (req as any).user?.id;
    const userId = (req as any).user?.userId;

    if (!companyId || !userId) {
       res.status(401).json({ success: false, message: 'Unauthorized: context missing.' });
       return;
    }

    const { latitude, longitude, photo, locationAddress } = req.body;

    const result = await punchIn({
      companyId: Number(companyId),
      userId: Number(userId),
      latitude,
      longitude,
      photoBase64: photo,
      locationAddress,
    });

    res.status(201).json({
      success: true,
      message: 'Successfully punched in.',
      data: result,
    });
  } catch (err: any) {
    logger.error('Punch in failed', err);
    res.status(400).json({
      success: false,
      message: err.message || 'Punch in failed.',
    });
  }
};

/**
 * POST /company/attendance/punch-out
 */
export const punchOutHandler: RequestHandler = async (req, res, next) => {
  try {
    const companyId = (req as any).user?.id;
    const userId = (req as any).user?.userId;

    if (!companyId || !userId) {
       res.status(401).json({ success: false, message: 'Unauthorized: context missing.' });
       return;
    }

    const { latitude, longitude, photo, locationAddress } = req.body;

    const result = await punchOut({
      companyId: Number(companyId),
      userId: Number(userId),
      latitude,
      longitude,
      photoBase64: photo,
      locationAddress,
    });

    res.json({
      success: true,
      message: 'Successfully punched out.',
      data: result,
    });
  } catch (err: any) {
    logger.error('Punch out failed', err);
    res.status(400).json({
      success: false,
      message: err.message || 'Punch out failed.',
    });
  }
};

/**
 * GET /company/attendance/history
 */
export const getAttendanceHistoryHandler: RequestHandler = async (req, res, next) => {
  try {
    const companyId = (req as any).user?.id;
    const userId = (req as any).user?.userId;
    const { date } = req.query; // expected YYYY-MM-DD

    if (!companyId || !userId) {
       res.status(401).json({ success: false, message: 'Unauthorized: context missing.' });
       return;
    }

    const records = await getAttendanceHistory(
      Number(companyId),
      Number(userId),
      typeof date === 'string' ? date : undefined
    );

    res.json({
      success: true,
      data: records || [],
    });
  } catch (err: any) {
    logger.error('Failed to retrieve history', err);
    next(err);
  }
};

/**
 * GET /company/attendance/report
 */
export const getMonthlyReportHandler: RequestHandler = async (req, res, next) => {
  try {
    const companyId = (req as any).user?.id;
    const currentUserId = (req as any).user?.userId;
    const role = (req as any).user?.role;

    if (!companyId || !currentUserId) {
       res.status(401).json({ success: false, message: 'Unauthorized: context missing.' });
       return;
    }

    const { year, month } = req.query;
    const targetYear = year ? Number(year) : new Date().getFullYear();
    const targetMonth = month ? Number(month) : new Date().getMonth() + 1;

    const report = await getMonthlyReport(Number(companyId), targetYear, targetMonth);

    // Security Gate: Non-admin users can ONLY view their own records in the report data
    if (role !== 'ADMIN') {
      report.users = report.users.filter((u) => u.id === Number(currentUserId));
      report.records = report.records.filter((r) => r.user_id === Number(currentUserId));
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (err: any) {
    logger.error('Failed to load report', err);
    next(err);
  }
};
