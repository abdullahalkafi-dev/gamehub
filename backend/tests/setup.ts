// Runs before every test file: fake environment, no real secrets, no real network.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://placeholder/unused';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';
process.env.MINIGAME_API_KEY = 'mgs_test_fake';
process.env.MINIGAME_GAME_ID = 'lic_TEST';
process.env.MINIGAME_WEBHOOK_SECRET = 'whsec_test';
process.env.WEB_ORIGINS = 'http://localhost:3000';
