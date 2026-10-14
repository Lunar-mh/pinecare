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
// 修复：添加 auth 中间件保护游戏列表和怀旧内容
router.get('/companion/games', auth, getGames);
router.post('/companion/game/record', auth, validateGameRecord, recordGame);
router.get('/companion/emotion', auth, getEmotion);
router.get('/companion/nostalgia', auth, validateNostalgia, getNostalgia);

module.exports = router;
