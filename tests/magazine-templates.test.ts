import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAGAZINE_TEMPLATE_IDS,
  MAGAZINE_TEMPLATES,
  DEFAULT_MAGAZINE_TEMPLATE,
  getMagazineTemplate,
  isMagazineTemplateId,
} from '../shared/magazine-templates';

const REAL_MAGAZINE_NAMES = /\b(vogue|elle|bazaar|harper|vanity)\b/i;

test('las cinco plantillas tienen sus nombres visibles nuevos', () => {
  const nombres = MAGAZINE_TEMPLATE_IDS.map((id) => MAGAZINE_TEMPLATES[id].nombre);
  assert.deepEqual(nombres, ['Clásica', 'Moderna', 'Galería', 'Editorial', 'Anna Signature']);
});

test('ningún texto visible ni de prompt nombra una revista real', () => {
  for (const id of MAGAZINE_TEMPLATE_IDS) {
    const { nombre, descripcion, estilo } = MAGAZINE_TEMPLATES[id];
    for (const texto of [nombre, descripcion, estilo]) {
      assert.doesNotMatch(texto, REAL_MAGAZINE_NAMES, `${id}: "${texto}"`);
    }
  }
});

test('solo Clásica y Moderna son gratuitas', () => {
  const gratuitas = MAGAZINE_TEMPLATE_IDS.filter((id) => !MAGAZINE_TEMPLATES[id].isPremium);
  assert.deepEqual(gratuitas, ['vogue', 'elle']);
});

test('isMagazineTemplateId reconoce solo ids válidos', () => {
  assert.equal(isMagazineTemplateId('anna'), true);
  assert.equal(isMagazineTemplateId('Vogue'), false);
  assert.equal(isMagazineTemplateId(''), false);
});

test('getMagazineTemplate usa Clásica para ids desconocidos', () => {
  assert.equal(DEFAULT_MAGAZINE_TEMPLATE, 'vogue');
  assert.equal(getMagazineTemplate('bazaar').nombre, 'Galería');
  assert.equal(getMagazineTemplate('plantilla-inexistente').nombre, 'Clásica');
});
