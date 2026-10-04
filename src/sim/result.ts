// O verificare nu întoarce doar „nu”: întoarce și MOTIVUL. Din asta iese mai târziu panoul
// „De ce nu?” — cel mai bun raport valoare/efort pentru lizibilitatea unui joc de strategie.

export type Result<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly reason: string }

export const ok = <T>(value: T): Result<T> => ({ ok: true, value })
export const fail = <T = never>(reason: string): Result<T> => ({ ok: false, reason })
