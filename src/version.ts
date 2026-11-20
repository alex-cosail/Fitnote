// Injected at build time from package.json (see vite.config.ts `define`).
declare const __APP_VERSION__: string;

// "3.0.0" -> "v.3", "3.1.0" -> "v.3.1", "3.1.2" -> "v.3.1.2"
export const APP_VERSION_LABEL = (() => {
  const [major = '0', minor = '0', patch = '0'] = __APP_VERSION__.split('.');
  if (patch !== '0') return `v.${major}.${minor}.${patch}`;
  if (minor !== '0') return `v.${major}.${minor}`;
  return `v.${major}`;
})();
