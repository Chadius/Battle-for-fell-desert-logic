import { describe, expect, it } from "vitest"
import { ResourceManifestMediaEntryService } from "./resourceManifestMedia.js"

describe("ResourceManifestMediaEntry", () => {
    it("creates an entry with all fields", () => {
        const entry = ResourceManifestMediaEntryService.new({
            id: "abcd-1234",
            filepath: "./blue-river.png",
            format: "PNG",
        })
        expect(entry.id).toBe("abcd-1234")
        expect(entry.filepath).toBe("./blue-river.png")
        expect(entry.format).toBe("PNG")
    })
})
