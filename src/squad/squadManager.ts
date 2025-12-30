import type { Squad } from "./squad"
import { type SquadCollection, SquadCollectionService } from "./squadCollection"
import type { TSquaddieRole } from "./roles"

export class SquadManager {
    squadCollection?: SquadCollection

    constructor(squadCollection?: SquadCollection) {
        this.squadCollection = squadCollection
    }

    addSquad(squad: Squad): void {
        this.throwIfSquadCollectionIsUndefined(this.addSquad.name)

        this.squadCollection = SquadCollectionService.addOrUpdateSquad({
            collection: this.squadCollection!,
            squad,
        })
    }

    getSquad(id: string): Squad | undefined {
        this.throwIfSquadCollectionIsUndefined(this.getSquad.name)

        return SquadCollectionService.getSquad({
            collection: this.squadCollection!,
            id,
        })
    }

    addSquaddie({
        squadId,
        outOfBattleSquaddieId,
        inBattleSquaddieId,
        role,
    }: {
        squadId: string
        outOfBattleSquaddieId: string
        inBattleSquaddieId: number
        role: TSquaddieRole
    }): void {
        this.throwIfSquadCollectionIsUndefined(this.addSquaddie.name)
        this.throwIfSquadDoesNotExist(this.addSquaddie.name, squadId)

        this.squadCollection = SquadCollectionService.addSquaddie({
            collection: this.squadCollection!,
            squadId,
            outOfBattleSquaddieId,
            inBattleSquaddieId,
            role,
        })
    }

    getSquaddie({
        squadId,
        outOfBattleSquaddieId,
        inBattleSquaddieId,
    }: {
        squadId: string
        outOfBattleSquaddieId: string
        inBattleSquaddieId: number
    }): {
        role: TSquaddieRole
        outOfBattleSquaddieId: string
        inBattleSquaddieId: number
    } {
        this.throwIfSquadCollectionIsUndefined(this.getSquaddie.name)
        this.throwIfSquadDoesNotExist(this.getSquaddie.name, squadId)

        const squaddieInfo = SquadCollectionService.getSquaddie({
            collection: this.squadCollection!,
            squadId,
            outOfBattleSquaddieId,
            inBattleSquaddieId,
        })

        if (squaddieInfo == undefined)
            throw new Error(
                `[SquadManager.${this.getSquaddie.name}]: no squaddie found for ${outOfBattleSquaddieId}.${inBattleSquaddieId}`
            )

        return squaddieInfo
    }

    removeSquaddie({
        squadId,
        outOfBattleSquaddieId,
        inBattleSquaddieId,
    }: {
        squadId: string
        outOfBattleSquaddieId: string
        inBattleSquaddieId: number
    }): void {
        this.throwIfSquadCollectionIsUndefined(this.removeSquaddie.name)
        this.throwIfSquadDoesNotExist(this.removeSquaddie.name, squadId)

        this.squadCollection = SquadCollectionService.removeSquaddie({
            collection: this.squadCollection!,
            squadId,
            outOfBattleSquaddieId,
            inBattleSquaddieId,
        })
    }

    doesSquaddieExist({
        squadId,
        outOfBattleSquaddieId,
        inBattleSquaddieId,
    }: {
        squadId: string
        outOfBattleSquaddieId: string
        inBattleSquaddieId: number
    }): boolean {
        try {
            const squaddie = this.getSquaddie({
                squadId,
                outOfBattleSquaddieId,
                inBattleSquaddieId,
            })
            return squaddie != undefined
        } catch {
            return false
        }
    }

    private throwIfSquadCollectionIsUndefined(callName: string): void {
        if (this.squadCollection == undefined) {
            throw new Error(
                `[SquadManager.${callName}]: squadCollection must be defined`
            )
        }
    }

    private throwIfSquadDoesNotExist(callName: string, squadId: string): void {
        const squad = SquadCollectionService.getSquad({
            collection: this.squadCollection!,
            id: squadId,
        })
        if (squad == undefined) {
            throw new Error(
                `[SquadManager.${callName}]: squad ${squadId} does not exist`
            )
        }
    }
}
