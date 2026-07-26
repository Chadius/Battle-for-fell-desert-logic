import type { ArmyManager } from "../campaign/army/armyManager.js"
import {
    type CampaignSquaddieDeploymentCoordinateCollection,
    CampaignSquaddieDeploymentCoordinateCollectionService,
} from "./campaignSquaddieDeploymentCoordinateCollection.js"
import type { CampaignSquaddieDeploymentManager } from "./campaignSquaddieDeploymentManager.js"
import type { OutOfBattleSquaddieManager } from "../squaddie/outOfBattle/outOfBattleSquaddieManager.js"
import type { CampaignSquaddie } from "../campaign/army/campaignSquaddie.js"
import { OutOfBattleSquaddieService } from "../squaddie/outOfBattle/outOfBattleSquaddie.js"
import type { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager.js"
import type { CoordinateMapCollectionManager } from "../coordinateMap/coordinateMapManager.js"
import type { OffsetCoordinate } from "../coordinateMap/offsetCoordinate.js"
import { SquaddieAffiliation } from "../affiliation/affiliation.js"

export const CampaignSquaddieMissionBridgeService = {
    deployAssignedCampaignSquaddies: ({
        armyManager,
        coordinateCollection,
        deploymentManager,
        outOfBattleSquaddieManager,
        inBattleSquaddieManager,
        coordinateMapCollectionManager,
        mapId,
    }: {
        armyManager: ArmyManager
        coordinateCollection: CampaignSquaddieDeploymentCoordinateCollection
        deploymentManager: CampaignSquaddieDeploymentManager
        outOfBattleSquaddieManager: OutOfBattleSquaddieManager
        inBattleSquaddieManager: InBattleSquaddieManager
        coordinateMapCollectionManager: CoordinateMapCollectionManager
        mapId: string
    }): void => {
        for (const campaignSquaddieDeploymentCoordinate of CampaignSquaddieDeploymentCoordinateCollectionService.getAll(
            coordinateCollection
        )) {
            const campaignSquaddieId =
                deploymentManager.getAssignedCampaignSquaddieId(
                    campaignSquaddieDeploymentCoordinate.id
                )
            if (campaignSquaddieId == undefined) continue

            const campaignSquaddie = armyManager.get(campaignSquaddieId)

            ensureOutOfBattleSquaddieExists(
                outOfBattleSquaddieManager,
                campaignSquaddie
            )

            placeCampaignSquaddieOnMap({
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                campaignSquaddie,
                coordinate: campaignSquaddieDeploymentCoordinate.coordinate,
                mapId,
            })
        }
    },
}

const ensureOutOfBattleSquaddieExists = (
    outOfBattleSquaddieManager: OutOfBattleSquaddieManager,
    campaignSquaddie: CampaignSquaddie
): void => {
    if (
        outOfBattleSquaddieManager.getRawOutOfBattleSquaddie(
            campaignSquaddie.outOfBattleSquaddieId
        ) != undefined
    )
        return

    outOfBattleSquaddieManager.addOrUpdateSquaddie(
        OutOfBattleSquaddieService.new({
            id: campaignSquaddie.outOfBattleSquaddieId,
            name: campaignSquaddie.name,
            attributeSheetId: campaignSquaddie.outOfBattleAttributeSheetId,
            affiliation: SquaddieAffiliation.PLAYER,
        })
    )
}

const placeCampaignSquaddieOnMap = ({
    inBattleSquaddieManager,
    coordinateMapCollectionManager,
    campaignSquaddie,
    coordinate,
    mapId,
}: {
    inBattleSquaddieManager: InBattleSquaddieManager
    coordinateMapCollectionManager: CoordinateMapCollectionManager
    campaignSquaddie: CampaignSquaddie
    coordinate: OffsetCoordinate
    mapId: string
}): void => {
    const battleSquaddieId = inBattleSquaddieManager.createNewSquaddie({
        outOfBattleSquaddieId: campaignSquaddie.outOfBattleSquaddieId,
    })

    coordinateMapCollectionManager.addSquaddie({
        mapId,
        squaddieId: battleSquaddieId,
        coordinate,
    })
}
