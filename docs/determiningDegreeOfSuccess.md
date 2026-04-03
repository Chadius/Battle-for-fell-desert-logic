# Determining the Degree of Success

There are 2 ways to determine the degree:

- Actor makes a single roll and tries to beat the defenses of each target
- Actor sets a Target Number and each target rolls to beat the number

## Actor Rolls

This is usually reserved for weapon attacks and skill checks.
This represents the actor trying to overwhelm a target's defenses, using relying on their skill or strength.

Examples include:

- A warrior swings his sword, trying to breach the enemy armor.
- A wizard conjures a bolt of lightning and must hurl it at the enemy, trying to score a direct hit.
- A scoundrel unleashes a cruel insult, hoping to demoralize the foe's Will.

## Targets Roll

Many spells and area of effect abilities have a Target Number and it's up to the defenders squaddies.

Examples include:

- A wizard hurls a fireball at a group of bandits, and they will have to quickly leap away from the explosion
- A cleric calls upon the gods to overwhelm their foe's mind, and the target must use their Willpower to resist
- A bard calls upon their own Willpower to shout a rousing battlecry to inspire his teammates to fight on

### Setting the Target Number

The actor and the Squaddie Action both contribute to the Target Number.

- Start with 6 as the base value.
- The Action has a proficiency type. The actor uses their corresponding profiency level to determine the bonus.
- Actor has an attribute score that adds directly, the action's proficiency type maps to attribute scores.
- Add the actor's rank
- The actor may have Conditions that raise or reduce the Target Number.

### Target's defense bonus

Each Target gets a bonus to their check.

- The Action's proficiency has a corresponding defense proficiency; the squaddie adds their own bonus.
- The Action's proficiency maps to an attribute, the target adds their own attribute score
- Add the target's rank
- There may be Conditions that change the target's bonus

### Results

The target can rolls 2 six-sided die (2d6) and add their defense bonus to figure out their degree of success. Similar to
Actor Rolls, we compare how well the target roll exceeded the Target Number. Unlike Actor Rolls, a CRITICAL is good for
the target, while a BOTCH is terrible.

CRITICAL - beat Target Number by 6 or more. The target is usually unaffected by the action.
BOTCH - -6 or less than the Target Number. Usually devastating like double damage.
SUCCESS - beat target number but not a CRITICAL. Partial effect like half damage or short term debilitation.
FAILURE - If you didn't succeed or botch, you failed. Normal damage or debilitation.

Forecasts know there are 36 roll outcomes per target, so they can use lookup tables to find it (make sure the lookup
table is still accurate when the target is rolling)

### Example

Lini has Solar Sphere, a ball of purifying energy, granted by her patron deity Hiras. It explodes into a sphere of light
against two demons. Solar Sphere uses SKILL_SOUL as its proficiency. Upon Failure, Solar Sphere deals 2 damage to the
target and adds the SLOWED condition for 1 round.

- BOTCH doubles the damage to 4 and SLOWED for 3 rounds.
- SUCCESS halves the damage to 1 with no SLOWED condition.
- CRITICAL defense negates all effects.

To determine the demons' fate, we first need the Target Number.

- Start with the base value of 6
- Since Solar Sphere uses SKILL_SOUL, we add Lini's Soul Attribute Score. It is 3 in this example.
- Lini's proficiency with SKILL_SOUL is expert. Expert proficiency maps to a bonus of 2.
- Lini does not have Conditions that will help or hinder her Target Number. It is unchanged.
- Lini is Rank 1 due to her experience fighting demons.
  This sums to 12 and this is the Target Number.

Now each demon will need to determine their defense bonus.

- The weaker demon has a weak soul. Their SOUL attribute score is -1.
- The weaker demon has NOVICE proficiency at DEFEND_SOUL, adding +1
- Rank is 0.
  The weaker demon has a +0 bonus against Solar Sphere.

Forecast says:

- CRITICAL: 1/36 chance of no damage
- SUCCESS: 0 chance (rolling 12 on 2d6 would upgrade SUCCESS to CRITICAL
- FAILURE: 25/36 chance (the most likely result, the demon needs to roll 6 or higher)
- BOTCH: 10/36 chance
  The weaker demon will be damage greatly. Expected to take 70/36 damage and chance of 35/36 SLOWED. It's the same
  chances as if the demon attacked a target with 12 higher defense than its attack bonus.

The stronger demon is the leader.

- The soul is strong, giving an attribute of 2.
- They have Master Proficiency with DEFEND_SOUL, so they get +3.
- Rank is 1.
  The strong demon has a +6 defense against Solar Sphere.

Forecast says:

- CRITICAL: 1/36 chance of no damage
- SUCCESS: 25/36 chance (the most likely result)
- FAILURE: 9/36 chance
- BOTCH: 1/36 chance (rolling a 2 will downgrade FAILURE to BOTCH)
  The stronger demon will take some damage but not significantly. Expected damage is 47/36 and 11/36 chance of SLOWED.
  Not a lot of damage.

Lini will probably wipe out the weaker demon, but the stronger one will take minor damage.
