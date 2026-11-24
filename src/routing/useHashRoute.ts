import { useCallback, useEffect, useState } from 'react';
import { parseHash, Route, routeToHash } from './hashRoute';

/**
 * Current hash route + navigation. Navigation pushes a history entry, so the
 * Android back button and browser back move between tabs.
 */
export function useHashRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(() =>
    typeof window === 'undefined' ? parseHash('') : parseHash(window.location.hash)
  );

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((next: Route) => {
    const hash = routeToHash(next);
    if (window.location.hash !== hash) {
      window.location.hash = hash; // fires hashchange → setRoute
    } else {
      setRoute(next);
    }
  }, []);

  return [route, navigate];
}
