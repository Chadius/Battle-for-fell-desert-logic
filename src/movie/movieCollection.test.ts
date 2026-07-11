import { describe, expect, it } from "vitest"
import type { Movie } from "./movie.js"
import { MovieCollectionService } from "./movieCollection.js"

describe("MovieCollectionService", () => {
    describe("when a movie id that was never added is requested", () => {
        it("throws an error naming the missing id", () => {
            const collection = MovieCollectionService.new()

            expect(() =>
                MovieCollectionService.get(collection, "missing-id")
            ).toThrow("missing-id")
        })
    })

    describe("when a movie with a duplicate id is added", () => {
        it("throws an error naming the duplicate id", () => {
            let collection = MovieCollectionService.new()
            const movie: Movie = { id: "intro", firstSceneId: "s1", scenes: [] }
            collection = MovieCollectionService.add(collection, movie)

            expect(() => MovieCollectionService.add(collection, movie)).toThrow(
                "intro"
            )
        })
    })

    describe("when a movie is added", () => {
        it("can be retrieved by its id", () => {
            let collection = MovieCollectionService.new()
            const movie: Movie = {
                id: "scene-intro",
                firstSceneId: "s1",
                scenes: [],
            }

            collection = MovieCollectionService.add(collection, movie)

            expect(MovieCollectionService.get(collection, "scene-intro")).toBe(
                movie
            )
        })
    })
})
