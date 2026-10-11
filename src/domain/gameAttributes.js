/**
 * @typedef {'Pure' | 'Cool' | 'Cute' | 'Happy' | 'Mysterious'} GameAttributeName
 */

/**
 * Canonical names for the five lowercase game attribute keys, in display order.
 * Callers own whitespace conversion, placeholders and unknown-value fallback.
 * Ordinary object lookup semantics preserve the existing page adapters.
 *
 * @type {Readonly<Record<'pure' | 'cool' | 'cute' | 'happy' | 'mysterious', GameAttributeName>>}
 */
export const GAME_ATTRIBUTE_NAME_BY_LOWERCASE_KEY = Object.freeze({
  pure: 'Pure',
  cool: 'Cool',
  cute: 'Cute',
  happy: 'Happy',
  mysterious: 'Mysterious'
});
