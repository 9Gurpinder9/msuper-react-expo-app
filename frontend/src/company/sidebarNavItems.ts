import type { NavSection } from '@super-admin/sidebarNavItems';

export const COMPANY_NAV_ITEMS: NavSection[] = [
  {
    title: 'WORKSPACE',
    items: [
      { label: 'Dashboard', icon: 'view-dashboard-outline', path: '/company/dashboard', colorKey: 'dashboard' },
      { label: 'Bookmarks', icon: 'bookmark-multiple-outline', path: '/company/bookmarks', colorKey: 'bookmarks' },
      { label: 'Attendance', icon: 'clock-check-outline', path: '/company/attendance', colorKey: 'attendance' },
    ],
  },
  {
    title: 'SETTINGS',
    items: [
      { label: 'Company Profile', icon: 'office-building-outline', path: '/company/profile', colorKey: 'company-profile' },
    ],
  },
];
