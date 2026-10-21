const aliasesByCharacters = new WeakMap();
/** Accept resource abbreviations and displayed names using character metadata. */
export function parseVirtualSingerNames(value, characters) {
  if (!value || !Array.isArray(characters)) return [];
  if (!aliasesByCharacters.has(characters)) {
    const aliases = new Map();
    for (const person of characters.filter(person => person.unit === 'vs')) {
      const name = person.zh_name || person.name;
      for (const alias of [name, name?.split(/\s+/)[0], person.en_abbr, person.abbr, person.single_mark, person.singleMark].filter(Boolean)) aliases.set(String(alias).toLowerCase(), name);
    }
    aliasesByCharacters.set(characters, aliases);
  }
  return [...new Set(String(value).split(/[,，/、\s]+/).map(token => aliasesByCharacters.get(characters).get(token.toLowerCase())).filter(Boolean))];
}
