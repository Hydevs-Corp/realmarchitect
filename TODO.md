1. Global history / undo‑redo [DONE]
   Undo currently only applies to drawing. Extend to all modifications (POIs, zones, lines, groups) with a full stack.

2. Export & import [DONE]
   a) Export the map (current view or full extent) to PNG/SVG/PDF.
   b) Import/clear a JSON file (backup, template, sharing).

- Ability to copy‑paste / duplicate elements (internal clipboard).

3. Grid / snapping
   Optional grid display, and/or snap-to-object (POIs, zones) for alignment.

4. Advanced transform tools
   Align / distribute, group / ungroup, add arrows or curves to lines, change order with something more precise than zIndex which is too internal a value.

5. New shapes
   Rectangles, ellipses, free polygons, curved segments (beziers), with drag‑handles to modify them.

6. Measurement and coordinates
   A "ruler" tool to measure distances (with a fixed scale), display of an X/Y or lat/long coordinate overlay where relevant.

7. Custom icon library
   Allow POIs to use SVG/images, loadable or chosen from a palette, with category management (possibly just a category of existing assets).

8. Mini‑map
   Small navigation thumbnail to locate yourself on large maps and re-center, similar to React Flow.

9. "Presentation" / read-only mode for guests
   Disable all editing tools and show a minimal UI for viewing, optionally via a public shareable link or a role.

10. Templates and versioning
    Save map states as templates, or view a temporal history (time slider). Ideally, copying an entire map would be the simplest approach.

11. Presence and real-time editing indicators
    Show who is currently moving / editing which element. Potentially show movement in real time — currently only the drop event is tracked.

12. Themes / dark mode
    Light theme in addition to the current dark theme.

13. Interactive documentation
    Tooltips, a "first‑run" tutorial, or a help panel listing all keyboard shortcuts.

14. Touch / mobile support
    Touch gestures for zoom / pan / interaction (pinch‑to‑zoom, double‑tap).

15. Configurable floating toolbar
    Customize which actions are visible, hide those that are not used.

16. Geographic tile support
    Replace the background SVG with tiles (OpenStreetMap, Mapbox) for real-world maps.
