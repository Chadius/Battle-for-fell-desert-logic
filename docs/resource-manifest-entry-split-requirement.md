# Requirement: split `ResourceManifestEntry` into content vs. media

**For:** the `logic` project (`logic/src/resource/`)

**Requested by:** `fell-desert-html-canvas`, the browser front end being built against this engine

## Background

`ResourceManifestEntry` (`logic/src/resource/resourceManifest.ts`) currently bundles two things
that have different owners and different production cadences into one record:

```ts
export interface ResourceManifestEntry {
    id: string
    label: string
    description: Record<string, ResourceManifestEntryDescription> // localized, already alt-text-shaped
    filepath: string
    format: string
    type: ResourceManifestType
}
```

- `id` / `label` / `description` are *content* — written alongside the dialogue/scene that
  references them, localizable, and needed for accessibility (image alt text, and eventually audio
  captions) regardless of whether a media file exists yet.
- `filepath` / `format` are *media* — depend on an artist/composer producing a file, and lag behind
  content by design.

Today, when the file doesn't exist yet, the only way to represent that is a junk empty string —
this already happens in the campaign data:

```json
{
    "id": "desert-background",
    "label": "Desert Background",
    "filepath": "",
    "format": "",
    "type": "IMAGE",
    "description": { "en-us": { "text": "A vast desert opens ahead of you." } }
}
```

`filepath: ""` isn't a documented or handled state anywhere in the resolver or loader — it's an
accident of the schema requiring the field. The browser build needs "this id has no media yet" to
be a normal, checkable condition (so it can render a placeholder) rather than something that
silently produces a broken `<img>`/`<audio>` src or has to be special-cased by string-emptiness
checks at every call site.

Confirmed via grep across `logic/src/movie/*.ts`: nothing outside `resource/` ever reads
`filepath`/`format` — every consumer (`movie.ts`, `movieEngine.ts`, `movieSceneImage.ts`,
`movieSceneConversation.ts`, `movieLoader.ts`) only ever holds the opaque `resourceManifestEntryId`
string. So this split is contained entirely inside `resource/*`; it does not change how movies,
scenes, or anything else references resources.

## What's needed

1. **Trim `ResourceManifestEntry`** to content only:

   ```ts
   export interface ResourceManifestEntry {
       id: string
       label: string
       description: Record<string, ResourceManifestEntryDescription>
       type: ResourceManifestType
   }
   ```

   Remove `filepath` and `format`. `ResourceManifestEntryService.new(...)` drops those params.

2. **Add a parallel `ResourceManifestMediaEntry`**, in the same file or a new
   `resourceManifestMedia.ts`:

   ```ts
   export interface ResourceManifestMediaEntry {
       id: string
       filepath: string
       format: string
   }
   ```

3. **Add `ResourceManifestMediaCollection`** (`resourceManifestMediaCollection.ts`), identical
   shape/API to the existing `ResourceManifestCollection` (`new`/`add`/`get`/`has`/`keys`), just
   keyed to `ResourceManifestMediaEntry`. Don't generalize the existing collection type with
   generics unless it turns out to be awkward duplicated code once written — a second small file
   mirroring the first is fine.

4. **Split the loader.** `loadResourceManifestFromJSON` (`resourceManifestLoader.ts`) reads the
   trimmed content shape (drop `filepath`/`format` from `ResourceManifestRawJSON`). Add
   `loadResourceManifestMediaFromJSON(json)` for the new, separate raw shape — a **sparse** map,
   since not every id has media yet:

   ```ts
   export type ResourceManifestMediaRawJSON = Record<
       string,
       { id: string; filepath: string; format: string }
   >
   ```

   Only ids with a real file appear in this JSON at all — no placeholder entries with empty
   strings.

5. **Add `resolveResourceManifestMedia(collections, key)`** in `resourceManifestResolver.ts`,
   mirroring `resolveResourceManifestEntry`'s mission → campaign → core walk over
   `ResourceManifestMediaCollection[]`, returning `ResourceManifestMediaEntry | undefined`.
   `undefined` is a valid, expected result ("no media yet"), not an error — should not throw.

6. **Tests**: update `resourceManifest*.test.ts` for the trimmed entry shape; add equivalents for
   `ResourceManifestMediaEntry`/`ResourceManifestMediaCollection`/the new loader/resolver function,
   including an explicit case for "content entry resolves, media does not" as a normal, non-error
   result.

7. **Update `SPEC.md`**'s description of the resource system to describe the two-collection split,
   so the `filepath`/`format`-on-`ResourceManifestEntry` shape doesn't get reintroduced later.

## Not required

- No `AUDIO`/`VIDEO` addition to `ResourceManifestType` here — that's a separate, already-flagged
  future item, orthogonal to this split.
- No change to `movie/*` — confirmed above that nothing there touches `filepath`/`format`; only
  `resourceManifestEntryId` strings are referenced, and those are unaffected.
- No opinion on *how* `fell-desert-html-canvas` renders the "no media yet" case (placeholder image,
  silence, etc.) — that's a browser-build concern, not an engine one. This requirement only asks
  that "no media" become a representable, non-throwing state.
