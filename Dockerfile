# Multi-stage Dockerfile chuẩn hóa môi trường thực nghiệm NCKH
FROM node:20-slim AS base

WORKDIR /app

# Cài đặt các công cụ hệ thống cần thiết (git, procps)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    procps \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files để cache layer dependencies
COPY package*.json tsconfig.json jest.config.js ./

# Cài đặt toàn bộ dependencies (bao gồm cả devDependencies phục vụ test và batch run)
RUN npm ci

# Copy toàn bộ mã nguồn, dataset và scripts thực nghiệm
COPY packages/ ./packages/
COPY experiments/ ./experiments/

# Mặc định chạy kiểm thử Jest
CMD ["npm", "test"]
