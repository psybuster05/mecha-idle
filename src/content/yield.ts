/**
 * Bonus haul: how much more a skill finds as it gets good at itself.
 *
 * This was Cartography's job, and Cartography is gone. As a separate skill the bonus had
 * a shape no idle game should ship: you stopped gathering in order to train the thing
 * that made gathering better. Measured, maxing it cost 504 hours and needed 1,715 hours
 * of gathering afterwards to break even, in a game with about 503 hours of content. It
 * was worth taking to level 30 and a trap past 70.
 *
 * A skill raising *its own* yield has none of that. There is no choice to get wrong, no
 * competition between the booster and the boosted, and the reward lands on whatever you
 * are already doing. It is also strictly weaker than what it replaces: maxing one skill
 * used to pay out across all of them.
 *
 * At 99 this is +29.4% chance of a second haul on that skill's own actions, which is
 * roughly what beating every boss in the game is worth on the same axis - the two stack.
 *
 * Note it grants **items, not xp**. The one-month levelling target is measured in xp, so
 * this changes what you end up holding and never how fast you level.
 */
export const YIELD_PER_LEVEL = 0.003
