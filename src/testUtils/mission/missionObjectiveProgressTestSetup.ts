import { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager.js"
import { InBattleSquaddieCollectionService } from "../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { OutOfBattleSquaddieService } from "../../squaddie/outOfBattle/outOfBattleSquaddie.js"
import {
    SquaddieAffiliation,
    type TSquaddieAffiliation,
} from "../../affiliation/affiliation.js"
import { AttributeScore } from "../../proficiency/attributeScore.js"
import { OutOfBattleSquaddieTestSetup } from "../outOfBattleSquaddieTestSetup.js"
import type { BattleSquaddieId } from "../../squaddie/inBattle/battleSquaddieId.js"

export interface KnightAndTwoDemons {
    inBattleSquaddieManager: InBattleSquaddieManager
    knight: BattleSquaddieId
    firstDemon: BattleSquaddieId
    secondDemon: BattleSquaddieId
}

const addOutOfBattleSquaddie = (
    outOfBattleSquaddieManager: ReturnType<
        typeof OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet
    >["manager"],
    id: string,
    affiliation: TSquaddieAffiliation
) => {
    outOfBattleSquaddieManager.addOrUpdateSquaddie(
        OutOfBattleSquaddieService.new({
            id,
            actionIds: [],
            attributeSheetId: "test sheet",
            affiliation,
        })
    )
}

export const MissionObjectiveProgressTestSetup = {
    createKnightAndTwoDemons: (): KnightAndTwoDemons => {
        const { manager: outOfBattleSquaddieManager } =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
                sheetId: "test sheet",
                attributeSheetOptions: {
                    maxHitPoints: 10,
                    distancePerAction: 2,
                    items: { maxCapacity: 0 },
                },
            })
        addOutOfBattleSquaddie(
            outOfBattleSquaddieManager,
            "knight",
            SquaddieAffiliation.PLAYER
        )
        addOutOfBattleSquaddie(
            outOfBattleSquaddieManager,
            "demon",
            SquaddieAffiliation.ENEMY
        )

        const inBattleSquaddieManager = new InBattleSquaddieManager(
            InBattleSquaddieCollectionService.new(),
            outOfBattleSquaddieManager
        )
        return {
            inBattleSquaddieManager,
            knight: inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "knight",
            }),
            firstDemon: inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "demon",
            }),
            secondDemon: inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "demon",
            }),
        }
    },

    defeatSquaddie: (
        inBattleSquaddieManager: InBattleSquaddieManager,
        battleSquaddieId: BattleSquaddieId
    ) => {
        inBattleSquaddieManager.dealDamageToSquaddie({
            ...battleSquaddieId,
            damage: { amount: 10, type: AttributeScore.BODY },
        })
    },
}
