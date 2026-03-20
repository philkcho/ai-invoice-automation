FROM node:20-alpine

WORKDIR /app

# 의존성 먼저 설치 (캐시 활용)
COPY package*.json ./
RUN npm install

# 소스 복사
COPY . .

# 비루트 유저로 실행 (보안)
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000

CMD ["npm", "run", "dev"]
