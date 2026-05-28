import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    testTimeout: 30_000,
    env: {
      NODE_ENV: 'test',
      PORT: '4001',
      MONGODB_URI: 'mongodb://localhost:27017/placeholder',
      JWT_SECRET: 'test-secret-key-at-least-32-characters-long',
      JWT_EXPIRES_IN: '7d',
      ADMIN_EMAIL: 'admin@test.com',
      ADMIN_PASSWORD: 'testpassword',
      MIN_TIP_AMOUNT: '50',
      MAX_TIP_AMOUNT: '50000',
      TIP_CURRENCY: 'cad',
      STRIPE_SECRET_KEY: 'sk_test_placeholder_key_for_testing',
      STRIPE_WEBHOOK_SECRET: 'whsec_placeholder',
      CLOUDINARY_CLOUD_NAME: 'test-cloud',
      CLOUDINARY_API_KEY: 'test-api-key',
      CLOUDINARY_API_SECRET: 'test-api-secret',
      CLIENT_ORIGIN: 'http://localhost:5173',
      ADMIN_ORIGIN: 'http://localhost:5174',
    },
  },
});
