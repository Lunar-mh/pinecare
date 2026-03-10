'use strict';

const axios = require('axios');

const QWEN_ENDPOINT =
  'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
const QWEN_MODEL = process.env.QWEN_MODEL || 'qwen-turbo';
const QWEN_TIMEOUT = Number(process.env.QWEN_TIMEOUT_MS || 30000);

function createBizError(code, message, statusCode) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode || code;
  return err;
}

async function chatWithQwen(messages, userId) {
  if (!process.env.DASHSCOPE_API_KEY) {
    throw createBizError(500, '未配置通义千问 API Key', 500);
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    throw createBizError(422, 'messages 不能为空', 422);
  }

  try {
    const response = await axios.post(
      QWEN_ENDPOINT,
      {
        model: QWEN_MODEL,
        input: { messages },
        parameters: { result_format: 'message' },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
          'Content-Type': 'application/json',
          'X-DashScope-SSE': 'disable',
        },
        timeout: QWEN_TIMEOUT,
      }
    );

    const data = response.data || {};
    const choice = data.output && Array.isArray(data.output.choices) ? data.output.choices[0] : null;
    const reply = choice && choice.message ? String(choice.message.content || '').trim() : '';

    if (!reply) {
      throw createBizError(502, '通义千问返回内容为空', 502);
    }

    const usage = data.usage || {};
    const tokens = Number(usage.input_tokens || 0) + Number(usage.output_tokens || 0);

    return {
      reply,
      model: QWEN_MODEL,
      tokens,
      requestId: data.request_id || null,
      userId,
    };
  } catch (err) {
    if (err.code === 422 || err.code === 500 || err.code === 502) {
      throw err;
    }

    const status = err.response && err.response.status ? err.response.status : 500;
    const errorCode =
      err.response && err.response.data && err.response.data.code
        ? err.response.data.code
        : 'QWEN_REQUEST_FAILED';
    const errorMessage =
      err.response && err.response.data && err.response.data.message
        ? err.response.data.message
        : err.message || '通义千问服务调用失败';

    throw createBizError(status, `通义千问调用失败: ${errorCode} - ${errorMessage}`, status);
  }
}

module.exports = {
  chatWithQwen,
};
