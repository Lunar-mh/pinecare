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

const router = express.Router();

router.post('/companion/chat', auth, companionChatRateLimiter, validateChat, chat);
router.get('/companion/games', getGames);
router.post('/companion/game/record', auth, validateGameRecord, recordGame);
router.get('/companion/emotion', auth, getEmotion);
router.get('/companion/nostalgia', validateNostalgia, getNostalgia);

module.exports = router;
