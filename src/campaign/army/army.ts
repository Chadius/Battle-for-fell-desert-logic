import {
    type CampaignSquaddie,
    CampaignSquaddieService,
    type SerializedCampaignSquaddie,
} from "./campaignSquaddie.js"

export interface Army {
    squaddieById: Map<string, CampaignSquaddie>
}

export const ArmyService = {
    new: (): Army => constructNew(),
    serialize: (army: Army): SerializedCampaignSquaddie[] => {
        throwIfArmyIsUndefined(army, "serialize")
        return Array.from(army.squaddieById.values()).map(
            CampaignSquaddieService.serialize
        )
    },
    deserializeAll: (data: unknown[]): { army: Army; errors: string[] } => {
        const army = constructNew()
        const errors: string[] = []
        for (const item of data) {
            try {
                const campaignSquaddie =
                    CampaignSquaddieService.deserialize(item)
                army.squaddieById.set(campaignSquaddie.id, campaignSquaddie)
            } catch (e) {
                errors.push(e instanceof Error ? e.message : String(e))
            }
        }
        return { army, errors }
    },
    addOrUpdate: ({
        army,
        campaignSquaddie,
    }: {
        army: Army
        campaignSquaddie: CampaignSquaddie
    }): Army => {
        throwIfArmyIsUndefined(army, "addOrUpdate")
        const newArmy = clone(army)
        newArmy.squaddieById.set(campaignSquaddie.id, campaignSquaddie)
        return newArmy
    },
    getById: ({
        army,
        id,
    }: {
        army: Army
        id: string
    }): CampaignSquaddie | undefined => {
        throwIfArmyIsUndefined(army, "getById")
        return army.squaddieById.get(id)
    },
    getAll: (army: Army): CampaignSquaddie[] => {
        throwIfArmyIsUndefined(army, "getAll")
        return Array.from(army.squaddieById.values())
    },
    remove: ({ army, id }: { army: Army; id: string }): Army => {
        throwIfArmyIsUndefined(army, "remove")
        const newArmy = clone(army)
        newArmy.squaddieById.delete(id)
        return newArmy
    },
    has: ({ army, id }: { army: Army; id: string }): boolean => {
        throwIfArmyIsUndefined(army, "has")
        return army.squaddieById.has(id)
    },
}

const constructNew = (): Army => {
    return {
        squaddieById: new Map(),
    }
}

const clone = (original: Army): Army => {
    const armyClone = constructNew()
    original.squaddieById.forEach((campaignSquaddie, id) => {
        armyClone.squaddieById.set(
            id,
            CampaignSquaddieService.clone(campaignSquaddie)
        )
    })
    return armyClone
}

const throwIfArmyIsUndefined = (army: Army, callName: string) => {
    if (army == undefined)
        throw new Error(`[ArmyService.${callName}]: army must be defined`)
}
