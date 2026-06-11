import { useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COMPANY_NAV_ITEMS } from '@company/sidebarNavItems';
import { API_BASE_URL } from '@config';
import { fetchJson } from '@utils/network';
import type { NavSection } from '@super-admin/sidebarNavItems';

export function useCompanyNavItems() {
  const [allowedFeatures, setAllowedFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await AsyncStorage.getItem('companyToken');
        if (!token) {
          if (!cancelled) { setLoading(false); }
          return;
        }
        const res = await fetchJson(`${API_BASE_URL}/company/features`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (res.ok && res.data) {
          const data = res.data as { allowedFeatures?: string[] };
          if (Array.isArray(data.allowedFeatures)) {
            setAllowedFeatures(data.allowedFeatures);
          }
        }
      } catch {
        if (!cancelled) { setError('Failed to load menu permissions'); }
      } finally {
        if (!cancelled) { setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const navSections: NavSection[] = useMemo(() => {
    return COMPANY_NAV_ITEMS.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.colorKey === 'dashboard' ||
          item.colorKey === 'company-profile' ||
          allowedFeatures.includes(item.colorKey)
      ),
    }));
  }, [allowedFeatures]);

  return { navSections, allowedFeatures, loading, error };
}
