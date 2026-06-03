// backend/src/super-admin/controllers/roleFeature.controller.ts
import { Request, Response, NextFunction } from 'express';
import supabase from '../../database/supabaseClient';
import logger from '../../utils/logger';

export async function getRolePermissions(req: Request, res: Response, next: NextFunction) {
  try {
    const { roleId } = req.params;

    const { data, error } = await supabase
      .from('role_features')
      .select('feature_id, actions')
      .eq('role_id', roleId);

    if (error) {
      logger.error('Failed to fetch role permissions', { error });
      return res.status(500).json({ ok: false, message: 'Failed to fetch permissions' });
    }

    return res.status(200).json({ ok: true, data: data || [] });
  } catch (error) {
    next(error);
  }
}

export async function updateRolePermissions(req: Request, res: Response, next: NextFunction) {
  try {
    const { roleId } = req.params;
    const { permissions } = req.body; // Array of { feature_id, actions }

    // 1. Clear existing mappings for this role
    const { error: deleteError } = await supabase
      .from('role_features')
      .delete()
      .eq('role_id', roleId);

    if (deleteError) {
      logger.error('Failed to clear existing role features', { error: deleteError });
      return res.status(500).json({ ok: false, message: 'Failed to sync permissions' });
    }

    // 2. Filter out items with no actions selected and build inserts list
    const inserts = (permissions || [])
      .filter((p: any) => p.actions && p.actions.length > 0)
      .map((p: any) => ({
        role_id: Number(roleId),
        feature_id: Number(p.feature_id),
        actions: p.actions,
      }));

    // 3. Batch insert new permissions
    if (inserts.length > 0) {
      const { error: insertError } = await supabase
        .from('role_features')
        .insert(inserts);

      if (insertError) {
        logger.error('Failed to save new role features', { error: insertError });
        return res.status(500).json({ ok: false, message: 'Failed to save permissions' });
      }
    }

    return res.status(200).json({ ok: true, message: 'Role permissions synchronized successfully' });
  } catch (error) {
    next(error);
  }
}
