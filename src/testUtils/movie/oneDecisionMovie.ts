import type { Movie } from "../../movie/movie.js"
import { MovieSceneType } from "../../movie/movieScene.js"
import { MovieSceneConversationService } from "../../movie/movieSceneConversation.js"

export const OneDecisionMovieIds = {
    movie: "decision-movie",
    scene: "decision-scene",
    line: "decision-line",
    firstChoice: "first-choice",
    secondChoice: "second-choice",
} as const

export function createOneDecisionMovie(): Movie {
    return {
        id: OneDecisionMovieIds.movie,
        firstSceneId: OneDecisionMovieIds.scene,
        scenes: [
            {
                type: MovieSceneType.CONVERSATION,
                data: MovieSceneConversationService.new({
                    id: OneDecisionMovieIds.scene,
                    lines: [
                        {
                            type: "DECISION",
                            id: OneDecisionMovieIds.line,
                            options: [
                                { decisionId: OneDecisionMovieIds.firstChoice },
                                {
                                    decisionId:
                                        OneDecisionMovieIds.secondChoice,
                                },
                            ],
                        },
                    ],
                }),
            },
        ],
    }
}
