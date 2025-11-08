import type { EnumLike } from "../enum.ts"

export const ProficiencyLevel = {
    UNTRAINED: "UNTRAINED",
    NOVICE: "NOVICE",
    EXPERT: "EXPERT",
    MASTER: "MASTER",
    LEGENDARY: "LEGENDARY",
} as const satisfies Record<string, string>
export type TProficiencyLevel = EnumLike<typeof ProficiencyLevel>

const bonusByProficiencyLevel: { [l in TProficiencyLevel]: number } = {
    [ProficiencyLevel.UNTRAINED]: 0,
    [ProficiencyLevel.NOVICE]: 1,
    [ProficiencyLevel.EXPERT]: 2,
    [ProficiencyLevel.MASTER]: 3,
    [ProficiencyLevel.LEGENDARY]: 4,
}

export const ProficiencyType = {
    UNKNOWN: "UNKNOWN",
    SKILL_BODY: "SKILL_BODY",
    SKILL_MIND: "SKILL_MIND",
    SKILL_SOUL: "SKILL_SOUL",
    DEFEND_BODY: "DEFEND_BODY",
    DEFEND_MIND: "DEFEND_MIND",
    DEFEND_SOUL: "DEFEND_SOUL",
    ARMOR: "ARMOR",
    WEAPON_NATURAL: "WEAPON_NATURAL",
    WEAPON_SIMPLE: "WEAPON_SIMPLE",
    WEAPON_MARTIAL: "WEAPON_MARTIAL",
} as const satisfies Record<string, string>
export type TProficiencyType = EnumLike<typeof ProficiencyType>

export const ProficiencyLevelConst = {
    bonusByProficiencyLevel,
}
