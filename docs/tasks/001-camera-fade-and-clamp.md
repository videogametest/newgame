# 001: Camera fade and ground clamp

Status: in progress

## Goal

A fighter never blocks the player's view of the hero, and the camera never goes below the ground.

## Do

1. When any fighter other than the hero is between the camera and the hero, or within about 1.5 m of the camera, fade it to mostly transparent. Fade back when it moves away.
2. Clamp the camera so it cannot go below the ground or water surface. This should remove the teal tint seen when walking backward.

## Lead on the fade not rendering

Your probe showed the opacity value changing while the screenshot stayed solid. Likely cause: the glTF loader sets `transparencyMode` to opaque on each `PBRMaterial`, and with that set Babylon ignores `mesh.visibility`.

- While a fighter is fading, set its materials' `transparencyMode` to `PBRMaterial.PBRMATERIAL_ALPHABLEND`. Restore opaque once visibility is back to 1.
- Materials are already cloned per character (`instantiateModelsToScene(..., true)` in `src/render/characters.ts`), so this will not affect other fighters.
- Set `needDepthPrePass = true` during the fade so inner faces do not show through.
- If this is not the cause, hide the blocking fighter's meshes entirely instead of spending longer on transparency.

## Done when

- Before and after screenshots in the PR show a blocking fighter faded.
- Tests, typecheck, and build pass. Merged, deployed, and logged in `docs/status.md`.
