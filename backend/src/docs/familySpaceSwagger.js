'use strict';

/**
 * 家庭空间 Swagger 文档占位对象
 * 项目当前未引入 swagger-jsdoc，暂以静态结构占位
 */
const familySpaceSwagger = {
  openapi: '3.0.0',
  info: {
    title: '家庭空间接口文档（占位）',
    version: '0.0.1-stub',
    description: '012-family-space 后端接口文档占位实现',
  },
  tags: [{ name: '家庭空间' }],
  paths: {
    '/family-space/message/send': {},
    '/family-space/message/list': {},
    '/family-space/album/upload': {},
    '/family-space/album/list': {},
    '/family-space/points': {},
    '/family-space/leaderboard': {},
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
      },
    },
  },
};

module.exports = {
  familySpaceSwagger,
};
