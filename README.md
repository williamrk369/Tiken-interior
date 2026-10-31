# Tiken Interior — 23′ × 23′ House: L-Shaped Living & Dining + Front Room

An interactive 3D interior design for the house on site: block walls, teak window and door frames, breeze-block vents,
and an open hip roof on timber rafters. The design hangs a new suspended ceiling below the roof. It has a raised tray
over the living area, a circular dome over the dining table, and an LED edge light that runs around every wall.

**Open `index.html` in any modern browser.** It works offline by double-clicking; no server is needed.

![Living – evening](docs/renders/evening-living.png)

## Layout (from the site measurements)

| Space | Size | Use |
|---|---|---|
| Hall | 23′ × 14′ | Living (TV wall, sofa) plus a reading nook by the side door |
| L-extension | 11′ × 9′ | Dining for six, open to the hall |
| Front partition | 11′ × 9′ | Entrance lounge with glazed teak sliding doors |

![Floor plan](docs/renders/evening-plan.png)

| Ceiling tray (living) | Dining dome |
|---|---|
| ![Ceiling](docs/renders/evening-ceiling.png) | ![Dome](docs/renders/evening-dome.png) |
| **Dining** | **Front room** |
| ![Dining](docs/renders/evening-dining.png) | ![Front room](docs/renders/evening-front.png) |
| **Day** | **Cinema** |
| ![Day](docs/renders/day-living.png) | ![Cinema](docs/renders/cinema-living.png) |

![Cut-away section](docs/renders/evening-section.png)

## Ceiling specification

| Element | Specification |
|---|---|
| Suspended ceiling | 12.5 mm moisture-resistant gypsum on a galvanised steel grid, hung from the rafters and wall plate. Underside at **2850 mm (9′-4″)** |
| Insulation | 50 mm glass wool laid on top of the ceiling, to keep heat from the metal roof sheets out of the rooms |
| Living tray | Rectangular opening with a 600 mm (2′) border band, rising 400 mm into the roof void to 3250 mm (10′-8″) |
| Dining dome | Ø2.0 m opening, Ø2.4 m drum, same 3250 mm height |
| Cove light | 24 V COB LED tape, 14 W/m, tunable 2200–6500 K, hidden behind a 70 mm upstand in both the tray and the dome |
| Edge light | 60 mm shadow gap with an LED profile and opal diffuser around every wall of the L-shaped space and the front room (≈ 38 m) |
| Downlights | 15 × trimless 7 W, 2700 K, CRI 95: two grazing the TV wall, one on the dining artwork |
| Pendants | Twin brass rings over the coffee table; a cluster of three opal globes over the dining table |
| Ventilation | The existing breeze-block vents stay visible below the ceiling line. The roof void gets its own eave vents |
| Control | 5 dimmable circuits with **Day · Evening · Cinema** scenes |

## Finishes

- **Walls:** plastered and finished in warm limewash.
- **Frames:** the existing teak window and door frames are kept and oiled.
- **Floor:** wood-look porcelain plank laid over the existing concrete slab.
- **TV wall:** fluted walnut with LED reveals.
- **Palette:** bouclé, travertine and walnut, with terracotta and olive accents.

## Using the viewer

- **Lighting scenes:** Day / Evening / Cinema.
- **Circuits:** switch the cove, edge light, downlights, pendants, accent LEDs and floor lamp on or off.
- **LED colour:** colour-temperature slider, brightness, and mood colours.
- **Views:** living, ceiling detail, dining, dining dome, front room, floor plan, and cut-away section.
- **Save image:** exports a PNG of the current view.
- **Deep links:** for example `index.html?scene=cinema&view=dome`.

## Development

```bash
npm install
npm run build     # bundles src/ → dist/room.bundle.js
```

The scene, walls, ceiling and lighting are in `src/main.js`; the procedural materials are in `src/textures.js`. Plan
dimensions are constants at the top of `src/main.js`, so they are easy to adjust if site measurements change.
