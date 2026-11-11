# newgame

Browser game built with Phaser 3, TypeScript and Vite. Deployed to GitHub Pages at
https://videogametest.github.io/newgame/ on every push to `main`.

```bash
npm install
npm run dev      # local dev server
npm run build    # typecheck + production build into dist/
```

Supabase: the client reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at build time.
Only the publishable (anon) key goes in the client. Enable row-level security on every table.
