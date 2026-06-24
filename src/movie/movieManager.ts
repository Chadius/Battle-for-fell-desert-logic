import type { Movie } from "./movie"
import { type MovieCollection, MovieCollectionService } from "./movieCollection"

export class MovieManager {
    private movieCollection: MovieCollection = MovieCollectionService.new()

    add(movie: Movie): void {
        this.movieCollection = MovieCollectionService.add(
            this.movieCollection,
            movie
        )
    }

    get(movieId: string): Movie {
        return MovieCollectionService.get(this.movieCollection, movieId)
    }
}
