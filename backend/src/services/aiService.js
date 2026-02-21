'use strict';

const axios = require('axios');
const ConsultRecord = require('../models/consultRecord');
const healthContextService = require('./healthContextService');
const { buildSystemPrompt } = require('../utils/promptTemplate');

const DASHSCOPE_URL =
  'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

/**
 * AI 咨询服务
 * 封装 DashScope qwen-turbo 调用逻辑
 */
class AIService {
  /**
   * 发起一次 AI 健康咨询
   * @param {number} userId
   * @param {string} message - 用户输入
   * @param {string} sessionId - 会话ID
   * @returns {Promise<{ reply: string, sessionId: string, tokens: number }>}
   */
  async chat(userId, message, sessionId) {
    // 1. 获取用户健康上下文
    const { profile, contextMessages } = await healthContextService.getContextForUser(userId);

    // 2. 加载会话历史（最近20条）
    const historyRows = await ConsultRecord.findBySession(userId, sessionId, 20);
    const historyMessages = historyRows.map((row) => ({
      role: row.role,
      content: row.content,
    }));

    // 3. 构建完整消息列表
    const systemPrompt = buildSystemPrompt(profile);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...contextMessages,
      ...historyMessages,
      { role: 'user', content: message },
    ];

    // 4. 调用 DashScope qwen-turbo
    const response = await axios.post(
      DASHSCOPE_URL,
      {
        model: 'qwen-turbo',
        input: { messages },
        parameters: { result_format: 'message' },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30秒超时
      }
    );

    const choice = response.data.output.choices[0];
    const reply = choice.message.content;
    const tokens = response.data.usage
      ? (response.data.usage.input_tokens || 0) + (response.data.usage.output_tokens || 0)
      : null;

    // 5. 持久化对话记录
    await ConsultRecord.create({ userId, sessionId, role: 'user', content: message });
    await ConsultRecord.create({ userId, sessionId, role: 'assistant', content: reply, tokens });

    return { reply, sessionId, tokens };
  }
}

module.exports = new AIService();
