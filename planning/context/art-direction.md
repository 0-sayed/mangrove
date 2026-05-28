# Art Direction

## Verdict

Use clean top-down pixel art with a tower-defense readability bias.

For v0, use starter assets for the map, lanes, generic building bases, props, and UI frames. Build or generate only the custom software-language layer: packets, queue states, role badges, meter icons, and failure effects.

Do not hand-build the full asset set before the first playable proves the game loop.

## Default Starter Asset Decision

Recommended v0 path:

- Use Tiny Tower Defense Assets if we want the fastest tower-defense look.
- Keep Kenney Tower Defense Top-Down as the safe CC0 fallback.
- Add custom overlays for all software-specific meaning.

Safety-first fallback:

- Kenney Tower Defense Top-Down — core tower-defense sprites, CC0.
- Kenney Tiny Town — cozy town/map flavor, CC0.
- Kenney Pixel UI Pack — HUD panels, buttons, bars, cursors, CC0.

Prototype-first option:

- Tiny Tower Defense Assets by Ilustra Mundo Games — good 16-bit tower-defense starter, name-your-own-price, requires creator credit based on page comments.

Optional richer references:

- Pixel Art Top Down - Basic by Cainos — strong 32x32 top-down terrain/props, modifiable, good if we need cleaner 32x32 map art.
- Azuna Tower Defense Medieval Pack — best visual reference, but not default for v0 because the license page says the assets may not be modified.
- Pixel Medieval Strategy Pack 16px — useful RTS/base-defense reference if we want more strategy-game flavor.
- Tiny Thrones Starter Pack — useful cozy kingdom/base reference if we want animated town-building charm.

Default execution:

Try Tiny Tower Defense Assets first for the playable prototype because it has towers, upgrade stages, enemies, tilesets, resources, and UI panels in one small package. If the license feels too informal or we need heavy recoloring/modification, switch to Kenney CC0 assets immediately.

Do not buy Azuna for v0. Use it as visual reference only unless we accept a no-modification workflow where software meaning is added as separate overlays.

## Search Terms

Use these when looking for replacements:

- `Kenney CC0 tower defense top down`
- `Kenney CC0 pixel UI`
- `top-down tower-defense 32x32 pixel art asset pack`
- `itch.io free CC0 tower defense pixel 32x32`
- `OpenGameArt CC0 top down town pixel tileset`
- `pixel art tower defense medieval asset pack`
- `itch.io cozy medieval pixel RTS assets`
- `itch.io top-down strategy pixel assets`

## Asset Split

Use starter assets for:

- Terrain tiles.
- Path and lane tiles.
- Generic tower/building bases.
- Trees, rocks, banners, flowers, fences, and simple props.
- UI panels, buttons, bars, cursors, and frames.

Build or generate custom assets for:

- Useful message packets.
- Bad/noisy message packets.
- Flood-wave packet variants.
- Queue filling, backing up, and overflowing states.
- Worker busy, idle, and saturated states.
- API, Queue, Worker, Validation, and Storage role badges.
- Trust, Budget, and Backlog icons.
- Ack, drop, timeout, overflow, and saturation effects.

Do not custom-build for v0:

- Full terrain tilesets.
- Decorative props.
- Fancy town buildings.
- Character animation beyond what the starter pack already provides.
- Polished cinematic effects.

## Asset Automation Verdict

Use automation for asset processing and small overlays, not for the whole art direction.

Recommended v0 pipeline:

1. Use starter pack sprites for the base look.
2. Generate or script small software overlays: API badge, Queue badge, Worker badge, packet sprites, ack/drop effects, meter icons.
3. Keep custom assets tiny and readable.
4. Pack/export assets through scripts once the first playable needs it.

Best tool if we want an AI-controllable pixel-art workflow:

- Aseprite.

Why:

- Aseprite supports Lua scripting.
- Aseprite has command-line export and sprite-sheet generation.
- Community Aseprite MCP servers exist and can automate canvas creation, drawing, layers, frames, and exports.

Risk:

- MCP control is useful for repetitive drawing and export work, but it will not magically create a coherent art style by itself.
- Generated pixel art still needs human taste checks.
- Relying on MCP before the first playable can become a distraction.

Default decision:

Do not block bootstrap on Aseprite or MCP. Start with the downloaded starter pack plus simple generated/scripted overlays. Add Aseprite automation after the first playable if custom assets become the bottleneck.

Tool options:

- Aseprite: best paid/scriptable pixel-art editor and animation pipeline.
- Aseprite MCP: promising later integration for AI-assisted sprite creation and edits.
- Pixelorama: free/open-source option with command-line export support, useful if we avoid paid tools.
- Image generation: good for concept art or tiny overlay exploration, but outputs usually need cleanup before becoming production sprites.

## Style

Theme:

- Cozy cyber-medieval festival town.
- Medieval/tower-defense base assets.
- Small bright digital accents for software meaning.
- Warm natural town colors with readable blue/cyan/magenta/green packet effects.

The cyber layer should clarify gameplay state, not decorate the screen.

## Scale

- Base grid: prefer 32x32 tiles when available.
- Accept 16x16 starter packs only if scaled cleanly with integer scaling.
- Buildings: 2x2 or 2x3 tiles.
- Packets/messages: 12-16 px readable icons.
- Role badges: 12-18 px overlays.
- Effects: larger than packets, smaller than buildings.
- Use integer scaling only.

## Readability Rules

- The player must see the lane path before the wave starts.
- Message direction must be readable without text.
- Queue filling must be visible from the battlefield.
- Saturated buildings must be obvious within about 3 seconds.
- Trust loss must visually connect to drops, expired messages, or bad processing.
- Backend labels are optional; visible state is required.
- Do not let decorations compete with packets, lanes, or building states.

## Animation Budget

- Packet movement uses Phaser tweens driven by simulator state.
- Buildings may use 3-5 frame loops.
- Pixel animation target: 8-12 fps.
- Use particles only for ack, drop, overflow, and saturation.
- No cinematic cutscenes in v0.
- No animation that changes gameplay truth; animation only reflects simulator events.

## HUD Style

- React owns the HUD.
- HUD should look like a compact pixel strategy-game panel.
- Trust and Backlog are prominent during waves.
- Budget is secondary during waves and more prominent between waves.
- Avoid course-dashboard styling.
- Avoid large explanatory text inside the play screen.

## First Playable Asset Checklist

- API Gate base.
- Worker Yard base.
- Queue Hub base.
- Useful packet.
- Drop effect.
- Ack effect.
- Backlog/saturation effect.
- Lane/path tiles.
- Build-slot marker.
- Trust icon.
- Budget icon.
- Backlog icon.
- Simple pixel HUD frame.

## Avoid

- Building all assets from scratch before the loop is fun.
- Tiny unreadable 16x16 sprites without integer scaling.
- Realistic, painted, or 3D art.
- Overly dark cyberpunk visuals.
- Generic sci-fi spaceship/network visuals.
- UI that looks like a learning course.
- Labels carrying the whole meaning.
- Decorative cyber noise that does not show gameplay state.

## Reference Links

- Kenney Tower Defense Top-Down: https://kenney.nl/assets/tower-defense-top-down
- Kenney Tiny Town: https://kenney.nl/assets/tiny-town
- Kenney Pixel UI Pack: https://opengameart.org/content/pixel-ui-pack-750-assets
- Tiny Tower Defense Assets: https://ilustramundogames.itch.io/tiny-tower-defense-assets
- Pixel Art Top Down - Basic: https://cainos.itch.io/pixel-art-top-down-basic
- Azuna Tower Defense Medieval Pack: https://azuna-pixels.itch.io/tower-defense-medieval-pack
- Pixel Medieval Strategy Pack 16px: https://sofuassets.itch.io/pixel-fantasy-strategy-pack-16x16
- Tiny Thrones Starter Pack: https://penusbmic.itch.io/tiny-thrones-series
