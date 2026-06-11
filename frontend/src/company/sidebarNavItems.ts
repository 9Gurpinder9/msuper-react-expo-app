import type { NavSection } from '@super-admin/sidebarNavItems';

export const COMPANY_NAV_ITEMS: NavSection[] = [
  {
    title: 'NAVIGATION',
    items: [
      { label: 'Dashboard', icon: 'view-dashboard-outline', path: '/company/dashboard', colorKey: 'dashboard' },
      { label: 'Company Profile', icon: 'office-building-outline', path: '/company/profile', colorKey: 'company-profile' },
      { label: 'Bookmarks', icon: 'bookmark-multiple-outline', path: '/company/bookmarks', colorKey: 'bookmarks' },
      { label: 'Categories', icon: 'shape-outline', path: '/company/categories', colorKey: 'categories' },
    ],
  },
];
