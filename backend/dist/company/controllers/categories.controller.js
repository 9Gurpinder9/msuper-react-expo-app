"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCategoryHandler = exports.createCategoryHandler = exports.listCategoriesHandler = void 0;
const logger_1 = __importDefault(require("../../utils/logger"));
const categories_service_1 = require("../services/categories.service");
const listCategoriesHandler = async (req, res) => {
    try {
        const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
        const offset = Math.max(Number(req.query.offset) || 0, 0);
        const search = String(req.query.q || '').trim();
        const { data, total } = await (0, categories_service_1.listCategories)({
            limit,
            offset,
            search: search || undefined,
        });
        res.json({ success: true, data, total, limit, offset });
    }
    catch (err) {
        logger_1.default.error('List categories failed', err);
        res.status(500).json({ success: false, message: 'Failed to load categories.' });
    }
};
exports.listCategoriesHandler = listCategoriesHandler;
const createCategoryHandler = async (req, res) => {
    try {
        const name = String(req.body.name || '').trim();
        const data = await (0, categories_service_1.createCategory)(name);
        res.status(201).json({ success: true, data });
    }
    catch (err) {
        const status = err?.statusCode || 500;
        if (status === 409) {
            res.status(409).json({ success: false, message: err.message });
            return;
        }
        logger_1.default.error('Create category failed', err);
        res.status(500).json({ success: false, message: 'Failed to create category.' });
    }
};
exports.createCategoryHandler = createCategoryHandler;
const updateCategoryHandler = async (req, res) => {
    try {
        const id = String(req.params.id || '').trim();
        if (!id) {
            res.status(400).json({ success: false, message: 'Missing category id.' });
            return;
        }
        const name = String(req.body.name || '').trim();
        const data = await (0, categories_service_1.updateCategory)(id, name);
        res.json({ success: true, data });
    }
    catch (err) {
        const status = err?.statusCode || 500;
        if (status === 409) {
            res.status(409).json({ success: false, message: err.message });
            return;
        }
        logger_1.default.error('Update category failed', err);
        res.status(500).json({ success: false, message: 'Failed to update category.' });
    }
};
exports.updateCategoryHandler = updateCategoryHandler;
