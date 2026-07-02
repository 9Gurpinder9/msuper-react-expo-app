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

        // 1. Attempt to load from cache
        let cachedFeatures: string[] = [];
        let cachedVersion = 0;
        let lastFetched = 0;

        try {
          const raw = await AsyncStorage.getItem('company_permissions_cache');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.features)) {
              cachedFeatures = parsed.features;
              cachedVersion = parsed.version || 0;
              lastFetched = parsed.lastFetched || 0;
              if (!cancelled) {
                setAllowedFeatures(cachedFeatures);
                setLoading(false);
              }
            }
          }
        } catch (cacheErr) {
          console.error('[useCompanyNavItems] Failed to read permissions cache', cacheErr);
        }

        // 2. Determine if cache validation is required (24 hour TTL)
        const shouldCheck = !lastFetched || (Date.now() - lastFetched > 24 * 60 * 60 * 1000);
        if (!shouldCheck) {
          if (!cancelled) { setLoading(false); }
          return;
        }

        // 3. Perform silent handshake request
        const res = await fetchJson(`${API_BASE_URL}/company/features?version=${cachedVersion}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log('[useCompanyNavItems] API handshake response:', res);
        if (cancelled) return;

        if (res.ok && res.data) {
          const data = res.data as { allowedFeatures?: string[]; version?: number; notModified?: boolean };
          if (data.notModified) {
            console.log('[useCompanyNavItems] Permissions version matches. Refreshing TTL.');
            const cachePayload = {
              features: cachedFeatures,
              version: cachedVersion,
              lastFetched: Date.now(),
            };
            await AsyncStorage.setItem('company_permissions_cache', JSON.stringify(cachePayload));
          } else if (Array.isArray(data.allowedFeatures)) {
            const newFeatures = data.allowedFeatures;
            const newVersion = data.version || 0;
            console.log('[useCompanyNavItems] Permissions changed. Updating cache and state:', newFeatures);
            if (!cancelled) {
              setAllowedFeatures(newFeatures);
            }
            const cachePayload = {
              features: newFeatures,
              version: newVersion,
              lastFetched: Date.now(),
            };
            await AsyncStorage.setItem('company_permissions_cache', JSON.stringify(cachePayload));
          }
        }
      } catch (err) {
        console.error('[useCompanyNavItems] Error fetching permissions:', err);
        if (!cancelled) { setError('Failed to load menu permissions'); }
      } finally {
        if (!cancelled) { setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const navSections: NavSection[] = useMemo(() => {
    const lowerAllowed = allowedFeatures.map((f) => f.toLowerCase());
    const sections = COMPANY_NAV_ITEMS.map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        const key = item.colorKey.toLowerCase();
        return (
          key === 'dashboard' ||
          key === 'company-profile' ||
          key === 'attendance' ||
          lowerAllowed.includes(key)
        );
      }),
    }));
    console.log('[useCompanyNavItems] Computed navSections based on allowedFeatures:', sections);
    return sections;
  }, [allowedFeatures]);

  return { navSections, allowedFeatures, loading, error };
}
