import { router } from 'expo-router';

/**
 * Leaves the screens on top of the tabs (S04 / S05 / S08…) and opens a tab: "Tô tranh khác" → Home,
 * "Bộ sưu tập" → Gallery (S05), empty gallery → Home (S07).
 */
export function goToTab(tab: 'home' | 'gallery', params?: Record<string, string>): void {
  if (router.canDismiss()) router.dismissAll();
  router.navigate({ pathname: tab === 'home' ? '/' : '/gallery', params });
}
