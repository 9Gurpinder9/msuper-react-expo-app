export type Bookmark = {
  id: string;
  title: string;
  url: string;
  description?: string | null;
  category_id?: string | null;
  tags: string[];
  is_favorite: boolean;
  thumbnail_url?: string | null;
  favicon_url?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type BookmarkInput = {
  title: string;
  url: string;
  description?: string | null;
  category_id?: string | null;
  tags?: string[];
  is_favorite?: boolean;
  thumbnail_url?: string | null;
  favicon_url?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
};

export type BookmarkUpdateInput = Partial<BookmarkInput>;

export type BookmarkFilters = {
  search?: string;
  favorite?: boolean;
  category_id?: string;
  tag?: string;
  deleted?: boolean;
  limit?: number;
  offset?: number;
};

export type Category = {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
};
