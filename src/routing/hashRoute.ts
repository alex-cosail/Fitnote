import { AppTab } from '../types';

/**
 * Hash routes (work on Cloudflare Pages and in the installed PWA without any
 * server config; the part after '#' never reaches the server).
 *
 *   #/workout  #/checkup  #/catalog  #/log   tabs
 *   #/onboarding                             start wizard (step 2)
 *   #/studio                                 desktop builder (step 4)
 *   #/s/<payload>                            shared workout / cycle (step 3)
 */
export type Route =
  | { name: 'tab'; tab: AppTab }
  | { name: 'onboarding' }
  | { name: 'studio' }
  | { name: 'share'; payload: string };

const TAB_TO_SLUG: Record<AppTab, string> = {
  workout: 'workout',
  checkup: 'checkup',
  catalog: 'catalog',
  sync: 'log',
};

const SLUG_TO_TAB: Record<string, AppTab> = Object.fromEntries(
  Object.entries(TAB_TO_SLUG).map(([tab, slug]) => [slug, tab as AppTab])
);

export const DEFAULT_ROUTE: Route = { name: 'tab', tab: 'workout' };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '');
  if (!path) return DEFAULT_ROUTE;
  const [head, ...rest] = path.split('/');
  if (head === 's' && rest.length > 0 && rest.join('/')) {
    return { name: 'share', payload: rest.join('/') };
  }
  if (head === 'onboarding') return { name: 'onboarding' };
  if (head === 'studio') return { name: 'studio' };
  const tab = SLUG_TO_TAB[head];
  return tab ? { name: 'tab', tab } : DEFAULT_ROUTE;
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'tab':
      return `#/${TAB_TO_SLUG[route.tab]}`;
    case 'onboarding':
      return '#/onboarding';
    case 'studio':
      return '#/studio';
    case 'share':
      return `#/s/${route.payload}`;
  }
}
