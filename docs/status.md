# Status

Viktor updates this file. Newest entry at the top. See `docs/WORKFLOW.md` for what each entry should contain.

## 2026-11-11 19:30 ET (Viktor)

- **Task 001 done.** PR #5 merged (`775949d`). Pages run `43124527769` succeeded. Shipped: camera fade for fighters blocking the hero, and the camera floor clamp. Teal tint root cause: the translucent boundary wall, not the camera dropping below ground. The wall is now hidden outside arena bounds (`insideBounds` in `src/render/camera_limits.ts`). Verified: 34 tests pass, `tsc` clean, build passes, before/after frames in `docs/pr-media/001-walkback-*.png`. Not verified: a live Pages frame showing the tint gone.
- **Base change (Greg's request 1).** PR #6 merged (`10623c4`). Pages run `43125974189` succeeded. Vite `base` is `/`. README updated. No CNAME file. Verified: 34 tests pass, `tsc` clean, build passes, no `newgame` references in `dist/`.
- **Custom domain: NOT live (Greg's request 2).** `https://everylitwindow.com/` fails the TLS handshake (HTTP 000). The served certificate is the `*.github.io` wildcard, which does not match the domain. Cause: the Pages settings show `cname: null`, so the custom domain is not set on the repo. DNS already resolves to GitHub Pages IPs. Greg needs to set `everylitwindow.com` under Settings → Pages. Then re-check.
- **Legacy URL.** `https://videogametest.github.io/newgame/` returns the HTML, but its assets 404 because the base is now `/`.
- **Question for Greg.** Set the custom domain in Settings → Pages, then tell me. Should the `/newgame/` path build be kept for the old URL?
- **Risk, not verified.** A Pages deploy may clear the custom domain when no CNAME file is in the repo. Watch for this after the next deploy.
- **Next.** Task 002 (sound and showcase) starts after this entry is merged.

## 2026-11-11 18:55 ET (seeded by Claude from Viktor's last report)

- PR #4 merged (`d532b10`): balance targets, tuning panel, visual captures. Live on Pages.
- Task 001 in progress: the camera fade logic runs, but the fading fighter still renders solid. Not merged.
- Known: a teal tint appears when the camera drops below the water plane while walking backward.
