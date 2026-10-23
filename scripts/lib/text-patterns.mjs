// The repository text rules, shared by scripts/check-text.mjs and the
// universe build: no en or em dashes, no emoji and no words from the banned
// list. The banned words are kept as character codes so the source itself
// stays clean.

const word = (...codes) => String.fromCharCode(...codes);

const BANNED = [
  word(67, 104, 97, 116, 71, 80, 84),
  word(79, 112, 101, 110, 65, 73),
  word(65, 110, 116, 104, 114, 111, 112, 105, 99),
  word(67, 108, 97, 117, 100, 101),
  word(67, 111, 112, 105, 108, 111, 116),
  word(76, 76, 77) + 's?',
  word(71, 80, 84) + '-?\\d',
  word(97, 114, 116, 105, 102, 105, 99, 105, 97, 108, 32, 105, 110, 116, 101, 108, 108, 105, 103, 101, 110, 99, 101),
  word(109, 97, 99, 104, 105, 110, 101, 32, 108, 101, 97, 114, 110, 105, 110, 103),
  word(110, 101, 117, 114, 97, 108, 32, 110, 101, 116, 119, 111, 114, 107),
];

/** Pairs of [pattern, what it means], checked line by line. */
export const RULES = [
  [/[\u2013\u2014]/u, 'en or em dash (use a comma, a colon or "to")'],
  [/\p{Extended_Pictographic}/u, 'emoji or pictographic symbol'],
  [/\bA\.?I\b(?![-_.])/u, 'banned abbreviation'],
  [new RegExp(`\\b(${BANNED.join('|')})\\b`, 'iu'), 'banned word'],
];
