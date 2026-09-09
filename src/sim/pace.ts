/**
 * How much game time one real second buys.
 *
 * The design pace is a month to max a skill - 503 hours, asserted by the pacing suite -
 * and that is the right number for the game this is a prototype of. It is the wrong
 * number for the thing it currently is, which is a link handed to someone who will give
 * it fifteen minutes. Measured at 1x, those fifteen minutes reach Scavenging 8 and
 * combat level 4: one region, no boss, no crawler, no second region. The loop, not the
 * game.
 *
 * So the demo runs the clock faster. **Nothing about the game changes** - not an action
 * duration, not an xp value, not a boss - because this is applied where the clock is
 * *read*, in the driver, and never inside `tick`. The simulation still measures game
 * seconds, every existing measurement still means what it meant, and the second game
 * inherits real numbers rather than demo ones. Putting it back is this constant.
 *
 * It rides on the same dilation the speed toggle already uses, which was measured across
 * all seven bosses at 2x and 3x with every win/lose outcome identical and times scaling
 * 2.01x and 2.99x. Combat is stepped event by event rather than in fixed slices, so a
 * larger dt is exact rather than approximate.
 *
 * Fuel needs no adjustment. It drops per completion and per kill, so income and drain
 * scale together and a tank is worth exactly the same amount of *work* as before.
 */
export const DEMO_PACE = 10
