# Art Direction

## Verdict

Use clean top-down pixel art with tower-defense readability and an inhabited cyber-medieval town feel.

The player should understand pressure from roads, silhouettes, motion, color, range, and state changes before reading a label. Software meaning appears as visual flavor and state feedback, not as dashboard decoration.

## Default Asset Strategy

Build the Production Town asset set from scratch with Aseprite recipes.

- Use Aseprite Lua recipes as the source of truth for generated pixel assets.
- Export production PNG sprite sheets, JSON atlas metadata, and manifest metadata for Phaser.
- Treat downloaded/vendor packs as references only.
- Wire only the assets required by the active roadmap task.

## Visual Theme

- Cozy cyber-medieval production town.
- Top-down tower-defense composition.
- Warm grass, stone roads, wood, brass, slate, banners, and small civic props.
- Bright digital accents for software-state feedback.
- Tiny operators and citizens make the town feel defended, not abstract.

The cyber layer should explain gameplay state: targeting, pressure, leaks, budget gain, tower saturation, routing, component connections, weak coverage, and wave warnings.

## Palette

Base world:

- Grass and plazas: warm greens, moss, soft stone, muted soil.
- Buildings: wood, brass, slate, warm gray, muted roof accents.
- Roads: readable stone, packed dirt, bridge, or festival path surfaces.

System state:

- Normal enemies: cyan/blue highlights.
- Queue/stall pressure: amber/orange.
- Worker/throughput activity: green/teal.
- Leaks and failures: red.
- Malformed enemies: magenta/purple with jagged highlights.
- Duplicate/retry effects: pale blue ghost trails.
- Poison or stuck incidents: sickly green plus red warning pixels.

Avoid one-note palettes. The game should not read as pure cyberpunk, pure medieval, dashboard UI, or a single-color prototype.

## Scale

- Preferred tile grid: 32x32.
- Buildings/towers: 2x2 or 2x3 tiles.
- Enemies: readable 12-24 px cores depending on type.
- Projectiles/effects: bigger than enemy cores, smaller than towers.
- UI icons: 16x16 or 24x24.
- Use integer scaling only.

## Silhouette Rules

- Roads must be readable before the wave starts.
- Incident Portal must clearly be an enemy entrance.
- Service Core must clearly be the thing being protected.
- Build pads must look buildable and distinct from scenery.
- Worker Tower must read as an active damage/processing tower.
- Queue Snare must read as a stall/buffer, not a final vault.
- Load Balancer Gate must read as a route splitter or junction controller.
- Connection overlays must show useful influence without turning the battlefield into a diagram.
- Enemies must be distinguishable by shape before color.
- Labels can clarify, but they must not carry the whole meaning.

## Animation Rules

All production gameplay assets should have at least one animated state.

- Towers: idle, active, saturated/disabled states where relevant.
- Enemies: movement loops and hit feedback.
- Projectiles: short readable motion or beam effect.
- Leaks: clear impact at the Service Core.
- UI icons/meters: event flashes for health loss, budget gain, pressure spikes.
- Target playback: 8-12 fps.

Animation reflects simulator events; it never changes gameplay truth.

## Readability Rules

- The first screen must show enemy route, build pads, and protected core.
- Enemy direction must be readable without text.
- Tower range and targeting must be visible during placement/selection.
- Leaks must visually connect to Town Health loss.
- Budget gain must connect to enemy resolution.
- Queue/stall and routing effects must be visible on the battlefield.
- Decorations must stay lower contrast than active enemies, towers, projectiles, and leaks.
- Avoid large explanatory text inside the play screen.

## HUD Style

- React owns the HUD.
- HUD should feel like a compact pixel strategy-game panel.
- Town Health and Pressure are prominent during waves.
- Build Budget is prominent during build phases.
- Tooltips explain controls briefly on hover.
- Recaps reveal software terms after the wave.

## Asset Pipeline Direction

Current planning stage:

1. Keep curated Lua recipes in the repo.
2. Keep production `.aseprite`, PNG sheets, JSON atlas metadata, and manifest metadata in the repo.
3. Use `planning/context/asset-inventory.md` as the coverage contract.
4. Keep review screenshots, GIFs, demo scenes, and temporary QA exports out of the repo.

## Reference Assets

Reference only:

- Kenney Tower Defense Top-Down: https://kenney.nl/assets/tower-defense-top-down
- Kenney Tiny Town: https://kenney.nl/assets/tiny-town
- Kenney Pixel UI Pack: https://kenney.nl/assets/pixel-ui-pack
- Tiny Tower Defense Assets: https://ilustramundogames.itch.io/tiny-tower-defense-assets
- Pixel Art Top Down - Basic: https://cainos.itch.io/pixel-art-top-down-basic
- Pixel Medieval Strategy Pack 16px: https://sofuassets.itch.io/pixel-fantasy-strategy-pack-16x16
- Tiny Thrones Starter Pack: https://penusbmic.itch.io/tiny-thrones-series

Tool references:

- Aseprite CLI: https://www.aseprite.org/docs/cli/
- Aseprite exporting: https://aseprite.com/docs/exporting/
- Aseprite sprite sheets: https://www.aseprite.org/docs/sprite-sheet/
