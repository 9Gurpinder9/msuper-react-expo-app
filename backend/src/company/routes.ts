import { Router } from 'express';
import { validate } from '../middleware/validate';
import appSecretGuard from '../middleware/appSecret';
import {
  listBookmarksHandler,
  createBookmarkHandler,
  updateBookmarkHandler,
  deleteBookmarkHandler,
  refreshBookmarkMetaHandler,
} from './controllers/bookmarks.controller';
import {
  listCategoriesHandler,
  createCategoryHandler,
  updateCategoryHandler,
} from './controllers/categories.controller';
import {
  createBookmarkSchema,
  updateBookmarkSchema,
  createCategorySchema,
  updateCategorySchema,
} from './schemas';

const router = Router();

router.use(appSecretGuard);

router.get('/bookmarks', listBookmarksHandler);
router.post('/bookmarks', validate(createBookmarkSchema), createBookmarkHandler);
router.put('/bookmarks/:id', validate(updateBookmarkSchema), updateBookmarkHandler);
router.delete('/bookmarks/:id', deleteBookmarkHandler);
router.post('/bookmarks/:id/refresh-meta', refreshBookmarkMetaHandler);

router.get('/categories', listCategoriesHandler);
router.post('/categories', validate(createCategorySchema), createCategoryHandler);
router.put('/categories/:id', validate(updateCategorySchema), updateCategoryHandler);

export default router;
