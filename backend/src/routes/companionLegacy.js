'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const { companionChatRateLimiter } = require('../middleware/companionRateLimiter');
const {
  validateChat,
  validateGameRecord,
  validateNostalgia,
} = require('../middleware/companionValidator');
const {
  chat,
  getGames,
  recordGame,
  getEmotion,
  getNostalgia,
} = require('../controllers/companionController');
const { deprecatedRoute } = require('../utils/deprecation');

const router = express.Router();
router.use(deprecatedRoute('/ai-companion/companion'));

// Backward-compatible legacy routes: /companion/*
router.post('/chat', auth, companionChatRateLimiter, validateChat, chat);
router.get('/games', getGames);
router.post('/game/record', auth, validateGameRecord, recordGame);
router.get('/emotion', auth, getEmotion);
router.get('/nostalgia', validateNostalgia, getNostalgia);

module.exports = router;
