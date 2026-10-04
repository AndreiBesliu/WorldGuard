# World Guard

Tower defense roguelite pe hexagoane: modelezi pământul unor planete vii, iar ele țin minte ce le-ai făcut.
**Stare:** prototip în browser, pasul 0.

```bash
npm install
npm run dev      # http://localhost:5180
npm run check    # typecheck + teste + build
```

**În prototip, acum:** o hartă pe hexagoane, generată din seed (câmpie, apă, pădure, deal, filon), și un
drum cu capete fixe — intrarea `I` și baza `B`.
- Mouse peste drum: alegi locul.
- `1` / `2` / `3`: cu câte hexagoane se lungește drumul.
- `Tab`: următoarea variantă de ocol.
- Click: aplici ocolul.
- `Z`: anulezi ultima decizie (prin replay din jurnal).
- `N`: hartă nouă. Seed fix: `?seed=123` în URL.

Designul: [`docs/GDD.md`](docs/GDD.md). Regulile proiectului: [`CLAUDE.md`](CLAUDE.md).
