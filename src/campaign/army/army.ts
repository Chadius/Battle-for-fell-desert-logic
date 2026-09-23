import {
    type CampaignSquaddie,
    CampaignSquaddieService,
    DEFAULT_INJURY_DURATION_IN_MISSIONS,
    type SerializedCampaignSquaddie,
} from "./campaignSquaddie.js"

export interface Army {
    squaddieById: Map<string, CampaignSquaddie>
}

export interface ArmyMissionResult {
    missionId: string
    knockedOutCampaignSquaddieIds: string[]
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
    getLeader: (army: Army): CampaignSquaddie | undefined => {
        throwIfArmyIsUndefined(army, "getLeader")
        return Array.from(army.squaddieById.values()).find(
            (campaignSquaddie) => campaignSquaddie.isLeader
        )
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
    getInjured: (army: Army): CampaignSquaddie[] => {
        throwIfArmyIsUndefined(army, "getInjured")
        return Array.from(army.squaddieById.values()).filter(
            CampaignSquaddieService.isInjured
        )
    },
    recordMissionCompleted: ({
        army,
        armyMissionResult,
    }: {
        army: Army
        armyMissionResult: ArmyMissionResult
    }): Army => {
        throwIfArmyIsUndefined(army, "recordMissionCompleted")
        throwIfKnockedOutSquaddieIsNotInArmy(army, armyMissionResult)
        const newArmy = constructNew()
        army.squaddieById.forEach((campaignSquaddie, id) => {
            newArmy.squaddieById.set(
                id,
                campaignSquaddieAfterMission(
                    campaignSquaddie,
                    armyMissionResult
                )
            )
        })
        return newArmy
    },
}

const campaignSquaddieAfterMission = (
    campaignSquaddie: CampaignSquaddie,
    { missionId, knockedOutCampaignSquaddieIds }: ArmyMissionResult
): CampaignSquaddie =>
    knockedOutCampaignSquaddieIds.includes(campaignSquaddie.id)
        ? CampaignSquaddieService.injureSquaddie({
              campaignSquaddie,
              missionId,
              injury: { duration: DEFAULT_INJURY_DURATION_IN_MISSIONS },
          })
        : CampaignSquaddieService.recoverFromInjuryByOneMission(
              campaignSquaddie
          )

const throwIfKnockedOutSquaddieIsNotInArmy = (
    army: Army,
    { knockedOutCampaignSquaddieIds }: ArmyMissionResult
) => {
    const missingIds = knockedOutCampaignSquaddieIds.filter(
        (id) => !army.squaddieById.has(id)
    )
    if (missingIds.length > 0)
        throw new Error(
            `[ArmyService.recordMissionCompleted]: knocked out squaddies not found in army: ${missingIds.join(", ")}`
        )
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
