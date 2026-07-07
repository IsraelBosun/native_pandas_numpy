const TOKEN_PATTERN = /#.*$|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\d+\.?\d*|[A-Za-z_]\w*|[^\sA-Za-z0-9_]|\s+/gm;

const KEYWORDS = new Set([
  'None',
  'True',
  'False',
  'and',
  'or',
  'not',
  'in',
  'is',
  'lambda',
  'for',
  'if',
  'else',
  'import',
  'as',
  'def',
  'return',
]);

// Small tokenizer for single-line-to-few-line Python/pandas snippets — a
// full syntax-highlighting library is overkill for this narrow vocabulary.
export function tokenize(code) {
  const tokens = [];
  const regex = new RegExp(TOKEN_PATTERN);
  let match;
  while ((match = regex.exec(code))) {
    const text = match[0];
    tokens.push({ text, kind: classify(text, code, match.index) });
  }
  return tokens;
}

function classify(text, code, index) {
  if (text[0] === '#') return 'comment';
  if (text[0] === "'" || text[0] === '"') return 'string';
  if (/^\d/.test(text)) return 'number';
  if (/^\s+$/.test(text)) return 'whitespace';
  if (/^[A-Za-z_]\w*$/.test(text)) {
    if (KEYWORDS.has(text)) return 'keyword';
    return code[index + text.length] === '(' ? 'method' : 'identifier';
  }
  return 'punct';
}
