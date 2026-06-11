export type NavItem = {
  label: string;
  icon: string;
  path: string;
  colorKey: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const getIconColor = (key: string, isDark: boolean) => {
  const colors: Record<string, { light: string; dark: string }> = {
    home: { light: '#0EA5E9', dark: '#38BDF8' },
    dashboard: { light: '#4F46E5', dark: '#818CF8' },
    countries: { light: '#0F766E', dark: '#2DD4BF' },
    states: { light: '#1D4ED8', dark: '#60A5FA' },
    cities: { light: '#0369A1', dark: '#38BDF8' },
    'subscription-plans': { light: '#B45309', dark: '#FBBF24' },
    features: { light: '#6D28D9', dark: '#A78BFA' },
    roles: { light: '#BE185D', dark: '#F472B6' },
    'company-categories': { light: '#A21CAF', dark: '#E879F9' },
    companies: { light: '#2563EB', dark: '#60A5FA' },
    'company-profile': { light: '#7C3AED', dark: '#A78BFA' },
    scan: { light: '#0D9488', dark: '#2DD4BF' },
    'online-scan': { light: '#EA580C', dark: '#FB923C' },
    diagnostics: { light: '#E11D48', dark: '#FB7185' },
    logout: { light: '#DC2626', dark: '#F87171' },
  };
  const pair = colors[key] || { light: '#64748B', dark: '#94A3B8' };
  return isDark ? pair.dark : pair.light;
};

export const SUPER_ADMIN_NAV_ITEMS: NavSection[] = [
  {
    title: 'CORE NAVIGATION',
    items: [
      { label: 'Home', icon: 'home-outline', path: '/', colorKey: 'home' },
      { label: 'Dashboard', icon: 'view-dashboard-outline', path: '/super-admin/dashboard', colorKey: 'dashboard' },
      { label: 'Companies', icon: 'office-building-outline', path: '/super-admin/companies', colorKey: 'companies' },
      { label: 'Subscription Plans', icon: 'card-bulleted-outline', path: '/super-admin/subscription-plans', colorKey: 'subscription-plans' },
      { label: 'App Modules', icon: 'menu-open', path: '/super-admin/features', colorKey: 'features' },
      { label: 'User Roles', icon: 'account-key-outline', path: '/super-admin/roles', colorKey: 'roles' },
      { label: 'Company Categories', icon: 'shape-outline', path: '/super-admin/company-categories', colorKey: 'company-categories' },
    ],
  },
  {
    title: 'ADMINISTRATIVE REGISTRIES',
    items: [
      { label: 'Countries', icon: 'earth', path: '/super-admin/countries', colorKey: 'countries' },
      { label: 'States', icon: 'map-outline', path: '/super-admin/states', colorKey: 'states' },
      { label: 'Cities', icon: 'city-variant-outline', path: '/super-admin/cities', colorKey: 'cities' },
    ],
  },
  {
    title: 'TOOLS & DIAGNOSTICS',
    items: [
      { label: 'Scan Bill', icon: 'file-document-outline', path: '/super-admin/scan-bill', colorKey: 'scan' },
      { label: 'Online Scan Bill', icon: 'cloud-search-outline', path: '/super-admin/online-scan-bill', colorKey: 'online-scan' },
      { label: 'System Diagnostics', icon: 'pulse', path: '/super-admin/diagnostics', colorKey: 'diagnostics' },
    ],
  },
];
