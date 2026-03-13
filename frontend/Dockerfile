FROM node:20-alpine

WORKDIR /app

# 의존성 먼저 설치 (캐시 활용)
COPY package*.json ./
RUN npm ci

# 소스 복사
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
