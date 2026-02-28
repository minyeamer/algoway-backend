# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# 의존성 파일만 먼저 복사 (레이어 캐싱 최적화)
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app

# 프로덕션 의존성 복사
COPY --from=builder /app/node_modules ./node_modules

# 소스 코드 복사
COPY package*.json ./
COPY src ./src
COPY server.js ./

# 환경 변수
ENV NODE_ENV=production

# 포트 노출
EXPOSE 3000

# 서버 실행
CMD ["node", "server.js"]
