# Debug Flags

Debug flags alter game behavior for testing and development. They are not intended for use in
production play.

---

## Setting Flags via MissionState

Pass a `debugFlags` object to `MissionStateService.new()`:

```typescript
import { MissionStateService } from "./mission/missionState"

const missionState = MissionStateService.new({
    id: "test-mission",
    mapId: "map-1",
    debugFlags: {
        enemyAlwaysEndsTheirTurn: true,
    },
})
```

---

## Available Flags

### `enemyAlwaysEndsTheirTurn`

When `true`, all ENEMY-affiliated squaddies immediately end their turn without taking any action.
Their AI strategy is bypassed entirely.

**Use case:** Testing player-side mechanics (movement, attacks, conditions) without interference
from enemy actions.
