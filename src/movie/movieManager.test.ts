import { describe, expect, it } from "vitest"
import type { Movie } from "./movie.js"
import { MovieManager } from "./movieManager.js"

describe("MovieManager", () => {
    describe("constructor", () => {
        describe("when created with no arguments", () => {
            it("has no movies", () => {
                const movieManager = new MovieManager()

                expect(() => movieManager.get("any-id")).toThrow()
            })
        })
    })

    describe("get", () => {
        describe("when a movie with an unknown id is requested", () => {
            it("throws an error naming the unknown id", () => {
                const movieManager = new MovieManager()

                expect(() => movieManager.get("unknown-id")).toThrow(
                    "unknown-id"
                )
            })
        })
    })

    describe("add", () => {
        describe("when a movie is added", () => {
            it("can be retrieved by its id", () => {
                const movieManager = new MovieManager()
                const movie: Movie = {
                    id: "intro",
                    firstSceneId: "s1",
                    scenes: [],
                }

                movieManager.add(movie)

                expect(movieManager.get("intro")).toBe(movie)
            })
        })

        describe("when a movie with a duplicate id is added", () => {
            it("throws an error naming the duplicate id", () => {
                const movieManager = new MovieManager()
                const movie: Movie = {
                    id: "intro",
                    firstSceneId: "s1",
                    scenes: [],
                }
                movieManager.add(movie)

                expect(() => movieManager.add(movie)).toThrow("intro")
            })
        })
    })
})
