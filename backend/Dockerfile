# 使用轻量级 Alpine 镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 先复制 package 文件以利用 Docker 缓存层
COPY package*.json ./

# 安装生产依赖
RUN npm ci --only=production

# 复制项目文件
COPY src/ ./src/
COPY migrations/ ./migrations/
COPY server.js ./

# 暴露端口
EXPOSE 3000

# 创建非 root 用户并切换到该用户运行
USER node

# 启动命令
CMD ["node", "server.js"]

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1
