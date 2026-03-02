# Realm Architect

Interactive 2D world map for a game universe. The app displays an SVG map background, supports pan/zoom navigation, and lets users place interactive elements (POIs, Zones, Text Notes) which are persisted to PocketBase.

**Stack**

- Framework: React + TypeScript
- Bundler: Vite
- UI: Mantine (DOM overlays, modals, menus)
- Canvas renderer: react-konva
- State: Zustand
- Backend / storage: PocketBase (schema in `pb_schema.json`)

Getting started

- Install dependencies:

```bash
npm install
```

- Run development server:

```bash
npm run dev
```

- Build for production:

```bash
npm run build
npm run preview
```

Project structure (key files)

- `src/main.tsx` — app entry
- `src/App.tsx` — root component
- `src/components/map/KonvaEngine.tsx` — Konva `Stage` and main map logic
- `src/components/InteractiveMapManager.tsx` — high-level map interaction coordinator
- `src/store/useMapStore.ts` — Zustand store for map state
- `pb_schema.json` — PocketBase schema (keep in sync with DB)

Architecture & conventions

- Separation DOM / Canvas: UI (Mantine) lives in the DOM overlay; Konva renders strictly to the Canvas.
- Two coordinate systems: screen coordinates (for DOM overlays) and stage/map coordinates (for Konva). Use `stage.getRelativePointerPosition()` when converting pointer events to map coords.
- Konva components use suffixes like `PoiItem` or `ZoneRenderer`.
- Avoid updating store on every `onDragMove`; write positions on `onDragEnd` instead.
- Use `React.memo` on lists of Konva items to minimize redraws.

PocketBase

- Keep `pb_schema.json` updated when modifying collections or fields and import it into the PocketBase admin to keep environments synchronized.

Contributing

- Open issues or PRs with focused changes. Follow TypeScript strict typing and project conventions.

License

- This project is licensed under the MIT License. See the [LICENSE](LICENSE) file.

Enjoy exploring and extending the map!
