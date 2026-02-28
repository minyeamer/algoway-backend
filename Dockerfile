# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# 의존성 파일 먼저 복사 (레이어 캐싱 최적화)
COPY package*.json ./
# devDependencies(typescript, ts-node-dev 등) 포함해서 설치
RUN npm ci

# 소스 복사 후 TypeScript 컴파일
COPY tsconfig.json ./
COPY src ./src
COPY server.ts ./
RUN npm run build

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app

# 프로덕션 의존성만 설치
COPY package*.json ./
RUN npm ci --only=production

# 빌드 결과물 복사
COPY --from=builder /app/dist ./dist

# 환경 변수
ENV NODE_ENV=production

# 포트 노출
EXPOSE 3000

# 서버 실행
CMD ["node", "dist/server.js"]
