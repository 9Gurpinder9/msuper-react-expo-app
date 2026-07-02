import { RequestHandler } from 'express';
import supabase from '../../database/supabaseClient';
import logger from '../../utils/logger';

export const getCompanyProfileHandler: RequestHandler = async (req, res, next) => {
  try {
    const companyId = (req as any).user?.id;
    if (!companyId) {
      res.status(401).json({ success: false, message: 'Unauthorized: missing company context.' });
      return;
    }

    const { data: company, error } = await supabase
      .from('companies')
      .select('*, subscription_plans(name, price, amc_price)')
      .eq('id', companyId)
      .maybeSingle();

    if (error) {
      logger.error('Failed to fetch company profile', { error, companyId });
      res.status(500).json({ success: false, message: 'Failed to fetch company profile.' });
      return;
    }

    if (!company) {
      res.status(404).json({ success: false, message: 'Company not found.' });
      return;
    }

    res.status(200).json({ success: true, company });
  } catch (err) {
    next(err);
  }
};

export const updateCompanyProfileHandler: RequestHandler = async (req, res, next) => {
  try {
    const companyId = (req as any).user?.id;
    const role = (req as any).user?.role;

    if (!companyId) {
      res.status(401).json({ success: false, message: 'Unauthorized: missing company context.' });
      return;
    }

    if (role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Forbidden: only company admins can update profile.' });
      return;
    }

    const { mobile2, gst_no, print_name } = req.body;

    const { data: updatedCompany, error } = await supabase
      .from('companies')
      .update({
        mobile2: mobile2 ? mobile2.trim() : null,
        gst_no: gst_no ? gst_no.trim().toUpperCase() : null,
        print_name: print_name ? print_name.trim().toUpperCase() : null,
      })
      .eq('id', companyId)
      .select('*, subscription_plans(name, price, amc_price)')
      .single();

    if (error) {
      logger.error('Failed to update company profile', { error, companyId });
      res.status(500).json({ success: false, message: 'Failed to update company profile.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      company: updatedCompany,
    });
  } catch (err) {
    next(err);
  }
};
