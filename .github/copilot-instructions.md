## Project Context

We are developing a React interactive 2D map application for a game universe. The app displays a map (SVG background), supports navigation (zoom/pan), and lets users place interactive elements: POIs (Points of Interest), Zones (custom polygons with hatching or solid colors), and Notes (text post-its). The SVG map background, POIs, zones and notes are stored in PocketBase.

## Technology Stack

- **Framework:** React (TypeScript)
- **UI / DOM Components:** Mantine
- **2D Rendering Engine:** React-Konva (Canvas)
- **State Management:** Zustand (recommended for performance outside the standard React render cycle)

## Fundamental Architecture Rules (CRITICAL)

1. **DOM / Canvas separation:** NEVER try to render Mantine components (or HTML divs) inside `react-konva` components (`Stage`, `Layer`, `Group`).
2. **Overlay:** All user interface (context menus, Mantine modals, toolbars) must live in the normal DOM, positioned with `position: absolute` and a `z-index` above the Canvas.
3. **Dual coordinate systems:**
    - Screen Coordinates: used to place Mantine elements (e.g., context menu). Use `e.evt.clientX` and `e.evt.clientY`.
    - Map/Stage Coordinates: used to place Konva elements taking zoom (scale) and pan into account. Always use `stage.getRelativePointerPosition()` or math on the Stage transform.

## Code & TypeScript Conventions

- Strict typing is required. NEVER use `any`.
- Main data models:
    - `MapElement` (base: id, position x/y)
    - `POI` (building type, color)
    - `Zone` (flat array of points `[x1, y1, x2, y2...]`, color, pattern)
    - `TextNote` (text content)
- Use functional components with Hooks.
- Name Konva components with the suffix `Item` or `Renderer` (e.g., `PoiItem`, `ZoneRenderer`) to distinguish them from DOM UI components.

## React-Konva Best Practices

- Always listen to drag/drop events (`onDragEnd`) to update the global store (Zustand) instead of updating continuously during drag (to avoid 60 re-renders per second).
- Use `React.memo` on lists of Konva elements (POIs, Zones) to prevent redrawing the entire map when adding a single element.
- Zoom (wheel) and pan logic must be handled on the main `<Stage>` component.
- For hatching on polygons, use Konva's `fillPatternImage` API with a native canvas generated in memory.

## Creation Workflow (Interactivity)

1. Right-click on the `Stage` -> opens the `ContextMenu` (Mantine) at screen coordinates.
2. Choose the type (POI/Zone) -> switch the app to "Creation" mode (state).
3. If POI -> a click on the map adds the element at the transformed coordinates.
4. If Zone -> polygon drawing mode point-by-point, with visual feedback (`DraftPolygon`) updated on mouse move (`onMouseMove` on the Stage).

## PocketBase Schema

- Any modification to the database schema (adding/removing/modifying collections or fields) MUST be reflected in the `pb_schema.json` file at the project root. After changing the schema in code or TypeScript types, update `pb_schema.json` and import it into the PocketBase admin to keep development and production environments synchronized.

## Global Undo / Redo History (CRITICAL)

The store (`useMapStore`) maintains a local undo/redo stack (`undoStack`/`redoStack`, max 100 entries, cleared on map exit).

**Every store action that mutates map data MUST push a `HistoryEntry` to the stack.**  The entry captures `{ before: HistorySnapshot, after: HistorySnapshot }` for the affected collection(s) only.

Rules that MUST be followed in every future modification:

1. **Public mutating actions** (`addPoi`, `updateZone`, `deleteLine`, `addGroup`, `toggleElementHidden`, etc.) must:
   - Compute the new state first (as a local variable).
   - Create a `HistoryEntry` with `before` = current snapshot, `after` = new snapshot.
   - Return `{ ...newState, undoStack: pushHistory(state.undoStack, entry), redoStack: [] }`.

2. **Remote/realtime actions** (prefixed `_remote*`) must NOT push to the history stack.  They exist specifically to apply changes made by other users without affecting the local undo history.

3. **`undo()` / `redo()`** apply the corresponding snapshot to local state AND call `syncHistoryDiff()` to keep PocketBase in sync (recreate/update/delete as needed).

4. **Adding a new element type or mutation** means:
   - Add the collection to `HistorySnapshot` in `types/map.ts` if not already there.
   - Add a `recreate*` function in `api.ts` (PB create with known id).
   - Wire the new collection into `syncHistoryDiff` in `useMapStore.ts`.
   - Add `_remote*` variants so realtime updates bypass history.
