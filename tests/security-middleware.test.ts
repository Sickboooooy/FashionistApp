import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stripAngleBrackets } from '../server/middleware/sanitize';

test('stripAngleBrackets leaves no angle brackets when tags are nested', () => {
  const sanitized = stripAngleBrackets('<<script>script>alert(1)<</script>/script>');
  assert.equal(/[<>]/.test(sanitized), false);
});

test('stripAngleBrackets removes stray angle brackets', () => {
  assert.equal(stripAngleBrackets('talla<m>'), 'tallam');
  assert.equal(stripAngleBrackets('a > b'), 'a  b');
});

test('stripAngleBrackets leaves ordinary search text unchanged', () => {
  assert.equal(stripAngleBrackets('vestido rojo & negro'), 'vestido rojo & negro');
});
