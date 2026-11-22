// Legarea atelierului: cumpărarea din stocare și panoul din pagină. `main.ts` hotărăște când se deschide (doar de pe cartonașul de start
// sau de la sfârșitul zborului) și ce cartonaș revine la „Înapoi”.
import { buy, type Profile } from './app/profile'
import { loadProfile, saveProfile } from './app/storage'
import type { UpId } from './data/workshop'
import { createShop } from './ui/shop'

/**
 * O treaptă cumpărată: profilul se citește din stocare chiar acum (nimic nu se scade dintr-un profil ținut în memorie de dinainte),
 * se verifică și se cumpără cu `buy`, apoi se salvează; refuzul nu scrie nimic. Întoarce profilul de după (neschimbat la refuz).
 */
export function buyStep(load: () => Profile, save: (p: Profile) => void, id: UpId): Profile {
  const now = load()
  const r = buy(now, id)
  if (!r.ok) return now
  save(r.value)
  return r.value
}

export interface Workshop { show(): void; hide(): void; readonly open: boolean }

export function createWorkshop(doc: Document, onBack: () => void): Workshop {
  const shop = createShop(doc, (id) => { buyStep(loadProfile, saveProfile, id); shop.show(loadProfile()) }, onBack)   // rândurile, din ce e acum în stocare
  return { show: () => shop.show(loadProfile()), hide: shop.hide, get open() { return shop.open } }
}
