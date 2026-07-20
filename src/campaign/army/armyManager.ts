import { type Army, ArmyService } from "./army.js"
import {
    type CampaignSquaddie,
    type SerializedCampaignSquaddie,
} from "./campaignSquaddie.js"

export class ArmyManager {
    army?: Army

    constructor(army?: Army) {
        this.army = army
    }

    addOrUpdate(campaignSquaddie: CampaignSquaddie): void {
        this.throwIfArmyIsUndefined(this.addOrUpdate.name)
        this.army = ArmyService.addOrUpdate({
            army: this.army!,
            campaignSquaddie,
        })
    }

    has(campaignSquaddieId: string): boolean {
        this.throwIfArmyIsUndefined(this.has.name)
        return ArmyService.has({ army: this.army!, id: campaignSquaddieId })
    }

    get(campaignSquaddieId: string): CampaignSquaddie {
        this.throwIfArmyIsUndefined(this.get.name)
        const campaignSquaddie = ArmyService.getById({
            army: this.army!,
            id: campaignSquaddieId,
        })
        if (campaignSquaddie == undefined) {
            throw new Error(
                `[ArmyManager.${this.get.name}]: no squaddie ${campaignSquaddieId} found`
            )
        }
        return campaignSquaddie
    }

    getAll(): CampaignSquaddie[] {
        this.throwIfArmyIsUndefined(this.getAll.name)
        return ArmyService.getAll(this.army!)
    }

    remove(campaignSquaddieId: string): void {
        this.throwIfArmyIsUndefined(this.remove.name)
        this.army = ArmyService.remove({
            army: this.army!,
            id: campaignSquaddieId,
        })
    }

    serialize(): SerializedCampaignSquaddie[] {
        this.throwIfArmyIsUndefined(this.serialize.name)
        return ArmyService.serialize(this.army!)
    }

    addSquaddiesFromJson(data: unknown): string[] {
        this.throwIfArmyIsUndefined(this.addSquaddiesFromJson.name)
        const items = Array.isArray(data) ? data : [data]
        const { army, errors } = ArmyService.deserializeAll(items)
        for (const campaignSquaddie of army.squaddieById.values()) {
            this.army = ArmyService.addOrUpdate({
                army: this.army!,
                campaignSquaddie,
            })
        }
        return errors
    }

    private throwIfArmyIsUndefined(callName: string) {
        if (this.army == undefined)
            throw new Error(`[ArmyManager.${callName}]: army must be defined`)
    }
}
