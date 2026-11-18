// Service worker-ul: pune jocul în cache la prima deschidere, ca să meargă și fără internet.
// Lipsa lui sau un refuz nu opresc jocul: merge mai departe, doar că are nevoie de rețea la pornire.

export interface SwNav { serviceWorker?: { register(url: string): Promise<unknown> } }

/** Înregistrează `./sw.js` când `enabled` și browserul îl cunoaște; un refuz e înghițit. */
export function registerServiceWorker(nav: SwNav, enabled: boolean): void {
  if (!enabled || nav.serviceWorker === undefined) return
  nav.serviceWorker.register('./sw.js').catch(() => { /* fără cache: jocul merge cu rețea */ })
}
