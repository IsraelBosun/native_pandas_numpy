import { describe, expect, it } from 'vitest';
import { tokenize } from './highlight';

function kinds(code) {
  return tokenize(code)
    .filter((token) => token.kind !== 'whitespace')
    .map((token) => `${token.kind}:${token.text}`);
}

describe('tokenize', () => {
  it('tokenizes a groupby method chain', () => {
    expect(kinds("df.groupby('region')['revenue'].sum()")).toEqual([
      'identifier:df',
      'punct:.',
      'method:groupby',
      'punct:(',
      "string:'region'",
      'punct:)',
      'punct:[',
      "string:'revenue'",
      'punct:]',
      'punct:.',
      'method:sum',
      'punct:(',
      'punct:)',
    ]);
  });

  it('tokenizes a comment', () => {
    expect(kinds('# West 120')).toEqual(['comment:# West 120']);
  });

  it('tokenizes numbers and keywords', () => {
    expect(kinds('ascending=False')).toEqual(['identifier:ascending', 'punct:=', 'keyword:False']);
  });

  it('classifies an identifier not followed by ( as identifier, not method', () => {
    expect(kinds('df.revenue')).toEqual(['identifier:df', 'punct:.', 'identifier:revenue']);
  });
});
