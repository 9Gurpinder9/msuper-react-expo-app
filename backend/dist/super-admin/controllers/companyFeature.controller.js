"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompanyFeatures = getCompanyFeatures;
exports.updateCompanyFeatures = updateCompanyFeatures;
const supabaseClient_1 = __importDefault(require("../../database/supabaseClient"));
const logger_1 = __importDefault(require("../../utils/logger"));
async function getCompanyFeatures(req, res, next) {
    try {
        const { companyId } = req.params;
        // 1. Get all active features
        const { data: allFeatures, error: featuresError } = await supabaseClient_1.default
            .from('features')
            .select('id, name, display_name, description')
            .eq('is_active', true)
            .order('display_name', { ascending: true });
        if (featuresError) {
            logger_1.default.error('Failed to fetch features list', { error: featuresError });
            return res.status(500).json({ ok: false, message: 'Failed to fetch features' });
        }
        // 2. Get currently enabled features for the company
        const { data: enabledRows, error: enabledError } = await supabaseClient_1.default
            .from('company_features')
            .select('feature_id')
            .eq('company_id', companyId)
            .eq('is_enabled', true);
        if (enabledError) {
            logger_1.default.error('Failed to fetch enabled company features', { error: enabledError, companyId });
            return res.status(500).json({ ok: false, message: 'Failed to fetch company permissions' });
        }
        const enabledIds = new Set((enabledRows || []).map((row) => Number(row.feature_id)));
        // 3. Map features list with is_enabled flag
        const data = (allFeatures || []).map((f) => ({
            id: f.id,
            name: f.name,
            display_name: f.display_name,
            description: f.description,
            is_enabled: enabledIds.has(Number(f.id)),
        }));
        return res.status(200).json({ ok: true, data });
    }
    catch (error) {
        next(error);
    }
}
async function updateCompanyFeatures(req, res, next) {
    try {
        const { companyId } = req.params;
        const { feature_ids } = req.body; // Array of feature IDs to enable
        const targetFeatureIds = (feature_ids || []).map(Number);
        // 1. Delete all current feature assignments for this company
        const { error: deleteError } = await supabaseClient_1.default
            .from('company_features')
            .delete()
            .eq('company_id', companyId);
        if (deleteError) {
            logger_1.default.error('Failed to delete old company features during update', { error: deleteError, companyId });
            return res.status(500).json({ ok: false, message: 'Failed to clear previous menu configurations' });
        }
        // 2. Insert new features if any are selected
        if (targetFeatureIds.length > 0) {
            const inserts = targetFeatureIds.map((fid) => ({
                company_id: Number(companyId),
                feature_id: fid,
                is_enabled: true,
            }));
            const { error: insertError } = await supabaseClient_1.default
                .from('company_features')
                .insert(inserts);
            if (insertError) {
                logger_1.default.error('Failed to insert new company features during update', { error: insertError, companyId });
                return res.status(500).json({ ok: false, message: 'Failed to save updated menu permissions' });
            }
        }
        return res.status(200).json({ ok: true, message: 'Company menu permissions updated successfully' });
    }
    catch (error) {
        next(error);
    }
}
