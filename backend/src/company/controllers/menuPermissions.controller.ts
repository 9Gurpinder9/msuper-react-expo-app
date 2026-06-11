import { RequestHandler } from 'express';
import supabase from '../../database/supabaseClient';
import logger from '../../utils/logger';

export const getMenuPermissionsHandler: RequestHandler = async (req, res) => {
  try {
    const companyId = (req as any).user?.id;

    if (!companyId) {
      res.status(401).json({ success: false, message: 'Unauthorized: missing company context.' });
      return;
    }

    // 1. Get company-level enabled features
    const { data: companyFeatures, error: compFeatErr } = await supabase
      .from('company_features')
      .select('feature_id, features!inner(id, name, display_name)')
      .eq('company_id', companyId)
      .eq('is_enabled', true);

    if (compFeatErr) {
      logger.error('Failed to query company features', compFeatErr);
      res.status(500).json({ success: false, message: 'Failed to query company features' });
      return;
    }

    // Extract list of enabled features at company level
    const companyAllowedFeatures = (companyFeatures || []).map((row: any) => ({
      id: Number(row.feature_id),
      name: String(row.features.name),
      display_name: String(row.features.display_name),
    }));

    // 2. Query the role named 'COMPANY'
    const { data: companyRole, error: roleErr } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'COMPANY')
      .eq('is_active', true)
      .maybeSingle();

    if (roleErr) {
      logger.error('Failed to query COMPANY role settings', roleErr);
      res.status(500).json({ success: false, message: 'Failed to retrieve role parameters' });
      return;
    }

    let allowedFeatures = companyAllowedFeatures;

    if (companyRole?.id) {
      // 3. Query role features for the 'COMPANY' role
      const { data: roleFeatures, error: roleFeatErr } = await supabase
        .from('role_features')
        .select('feature_id, actions')
        .eq('role_id', companyRole.id);

      if (roleFeatErr) {
        logger.error('Failed to query role feature mappings', roleFeatErr);
        res.status(500).json({ success: false, message: 'Failed to retrieve role permissions' });
        return;
      }

      const rolePermissionMap = new Map<number, string[]>(
        (roleFeatures || []).map((row: any) => [Number(row.feature_id), row.actions || []])
      );

      // Filter: intersection of company-level enabled features and role-level permitted features
      allowedFeatures = companyAllowedFeatures.filter((f) => rolePermissionMap.has(f.id));
    }

    res.json({
      success: true,
      allowedFeatures: allowedFeatures.map((f) => f.name),
    });
  } catch (err: any) {
    logger.error('Error fetching menu permissions', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
