import type { Movie } from "./movie.js"

export interface MovieCollection {
    movies: Map<string, Movie>
}

export const MovieCollectionService = {
    new: (): MovieCollection => ({ movies: new Map() }),

    add: (movieCollection: MovieCollection, movie: Movie): MovieCollection => {
        if (movieCollection.movies.has(movie.id))
            throw new Error(
                `[MovieCollectionService.add] Movie with id '${movie.id}' already exists`
            )
        return { movies: new Map(movieCollection.movies).set(movie.id, movie) }
    },

    get: (movieCollection: MovieCollection, movieId: string): Movie => {
        const movie = movieCollection.movies.get(movieId)
        if (movie === undefined)
            throw new Error(
                `[MovieCollectionService.get] No movie with id '${movieId}' was found`
            )
        return movie
    },
}
