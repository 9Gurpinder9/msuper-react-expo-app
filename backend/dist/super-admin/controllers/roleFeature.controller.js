"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRolePermissions = getRolePermissions;
exports.updateRolePermissions = updateRolePermissions;
const supabaseClient_1 = __importDefault(require("../../database/supabaseClient"));
const logger_1 = __importDefault(require("../../utils/logger"));
async function getRolePermissions(req, res, next) {
    try {
        const { roleId } = req.params;
        const { data, error } = await supabaseClient_1.default
            .from('role_features')
            .select('feature_id, actions')
            .eq('role_id', roleId);
        if (error) {
            logger_1.default.error('Failed to fetch role permissions', { error });
            return res.status(500).json({ ok: false, message: 'Failed to fetch permissions' });
        }
        return res.status(200).json({ ok: true, data: data || [] });
    }
    catch (error) {
        next(error);
    }
}
async function updateRolePermissions(req, res, next) {
    try {
        const { roleId } = req.params;
        const { permissions } = req.body; // Array of { feature_id, actions }
        // 1. Clear existing mappings for this role
        const { error: deleteError } = await supabaseClient_1.default
            .from('role_features')
            .delete()
            .eq('role_id', roleId);
        if (deleteError) {
            logger_1.default.error('Failed to clear existing role features', { error: deleteError });
            return res.status(500).json({ ok: false, message: 'Failed to sync permissions' });
        }
        // 2. Filter out items with no actions selected and build inserts list
        const inserts = (permissions || [])
            .filter((p) => p.actions && p.actions.length > 0)
            .map((p) => ({
            role_id: Number(roleId),
            feature_id: Number(p.feature_id),
            actions: p.actions,
        }));
        // 3. Batch insert new permissions
        if (inserts.length > 0) {
            const { error: insertError } = await supabaseClient_1.default
                .from('role_features')
                .insert(inserts);
            if (insertError) {
                logger_1.default.error('Failed to save new role features', { error: insertError });
                return res.status(500).json({ ok: false, message: 'Failed to save permissions' });
            }
        }
        return res.status(200).json({ ok: true, message: 'Role permissions synchronized successfully' });
    }
    catch (error) {
        next(error);
    }
}
