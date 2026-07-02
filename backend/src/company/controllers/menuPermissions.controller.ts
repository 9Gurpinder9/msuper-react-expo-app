import { RequestHandler } from 'express';
import supabase from '../../database/supabaseClient';
import logger from '../../utils/logger';

export const getMenuPermissionsHandler: RequestHandler = async (req, res) => {
  try {
    const companyId = (req as any).user?.id;
    logger.info(`[MenuPermissions] Fetching features for companyId: ${companyId}`);

    if (!companyId) {
      res.status(401).json({ success: false, message: 'Unauthorized: missing company context.' });
      return;
    }

    // Fetch current company permissions version
    const { data: companyData, error: compErr } = await supabase
      .from('companies')
      .select('permissions_version')
      .eq('id', companyId)
      .maybeSingle();

    if (compErr) {
      logger.error('Failed to query company details for permissions version check', compErr);
    }

    const dbVersion = companyData?.permissions_version || 1;
    const clientVersion = req.query.version ? parseInt(req.query.version as string, 10) : null;

    if (clientVersion !== null && clientVersion === dbVersion) {
      logger.info(`[MenuPermissions] Version ${clientVersion} matches database. Returning notModified.`);
      res.json({
        success: true,
        notModified: true,
      });
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

    const userRole = (req as any).user?.role;
    let allowedFeatures = companyAllowedFeatures;

    // If user has a valid role string, query role features for intersection
    if (userRole && typeof userRole === 'string') {
      logger.info(`[MenuPermissions] Checking permissions for role name: ${userRole}`);

      const { data: companyRole, error: roleErr } = await supabase
        .from('roles')
        .select('id')
        .eq('name', userRole.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (roleErr) {
        logger.error(`Failed to query ${userRole} role settings`, roleErr);
        res.status(500).json({ success: false, message: 'Failed to retrieve role parameters' });
        return;
      }

      if (companyRole?.id) {
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
    }

    logger.info(`[MenuPermissions] Final permitted features: ${JSON.stringify(allowedFeatures)}`);

    res.json({
      success: true,
      allowedFeatures: allowedFeatures.map((f) => f.name),
      version: dbVersion,
    });
  } catch (err: any) {
    logger.error('Error fetching menu permissions', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
