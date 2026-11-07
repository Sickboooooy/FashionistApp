import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import multer from 'multer';
import request from 'supertest';
import sharp from 'sharp';
import { insertUserSchema, insertGarmentSchema } from '../shared/schema';

test('Multer memory uploads remain compatible with Sharp image processing', async () => {
  const app = express();
  app.post('/upload', multer({ storage: multer.memoryStorage() }).single('image'), async (req, res, next) => {
    try {
      assert.ok(req.file);
      const output = await sharp(req.file.buffer).resize({ width: 10, height: 10, fit: 'inside' }).jpeg().toBuffer();
      const metadata = await sharp(output).metadata();
      res.json({ format: metadata.format, width: metadata.width, height: metadata.height });
    } catch (error) {
      next(error);
    }
  });
  const input = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#ffffff' } }).png().toBuffer();
  const response = await request(app).post('/upload').attach('image', input, 'test.png').expect(200);
  assert.deepEqual(response.body, { format: 'jpeg', width: 10, height: 10 });
});

test('Drizzle upgrade preserves Zod insert validation', () => {
  assert.equal(insertUserSchema.safeParse({ username: 'test', password: 'test-password' }).success, true);
  assert.equal(insertUserSchema.safeParse({ username: 123 }).success, false);
  assert.equal(insertGarmentSchema.safeParse({ userId: 1, name: 'Shirt', type: 'top' }).success, true);
  assert.equal(insertGarmentSchema.safeParse({ userId: 'invalid', name: 'Shirt', type: 'top' }).success, false);
});

test('Zod 4 keeps the ZodError name and partial insert schemas the routes rely on', () => {
  const invalid = insertGarmentSchema.partial().safeParse({ userId: 'invalid' });
  assert.equal(invalid.success, false);
  assert.equal(invalid.error?.name, 'ZodError');
  assert.ok(invalid.error && invalid.error.issues.length > 0);
  assert.equal(insertGarmentSchema.partial().safeParse({ name: 'Shirt' }).success, true);
});
