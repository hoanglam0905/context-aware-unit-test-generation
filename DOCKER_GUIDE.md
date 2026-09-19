# HƯỚNG DẪN CHẠY THỰC NGHIỆM BẰNG DOCKER & DOCKER COMPOSE

Tài liệu hướng dẫn triển khai môi trường chuẩn hóa (Reproducible Environment) phục vụ đề tài NCKH, tích hợp sẵn container chạy **Ollama Local LLM** và **Experiment Runner**.

---

## 🚀 1. Yêu Cầu Cài Đặt Ban Đầu
- Đã cài đặt [Docker Desktop](https://www.docker.com/products/docker-desktop/) trên máy tính và đang bật.
- File cấu hình môi trường `.env` đã được chuẩn bị (nếu dùng API ngoài như Gemini/OpenAI):
  ```bash
  cp .env.example .env
  ```

---

## 📦 2. Các Lệnh Thao Tác Chính

### Cách 1: Chạy kiểm thử toàn bộ Unit Test trong Container
```bash
# Build image và chạy test bộ dataset mẫu
docker-compose run --rm experiment-runner npm test
```

### Cách 2: Chạy kiểm thử kèm đo Code Coverage
```bash
docker-compose run --rm experiment-runner npm run test:coverage
```

### Cách 3: Chạy ma trận thực nghiệm sinh Unit Test từ LLM (Batch Runner)
```bash
# Chạy script tự động sinh test qua API hoặc Ollama
docker-compose run --rm experiment-runner npm run experiment:batch
```
*(Kết quả file test và file CSV `batch_summary.csv` sẽ được mount tự động và lưu thẳng về máy thật tại thư mục `experiments/results/`)*.

---

## 🦙 3. Cách sử dụng Ollama Local LLM (Miễn Phí 100% Offline)

Trong `docker-compose.yml` đã cấu hình sẵn dịch vụ `ollama`.

1. **Khởi động dịch vụ Ollama ngầm:**
   ```bash
   docker-compose up -d ollama
   ```
2. **Tải model DeepSeek Coder hoặc Qwen Coder vào container Ollama:**
   ```bash
   # Tải model deepseek-coder (bản nhẹ 6.7b phù hợp máy cá nhân)
   docker exec -it testgen-ollama ollama pull deepseek-coder:6.7b

   # Hoặc tải model Qwen 2.5 Coder
   docker exec -it testgen-ollama ollama pull qwen2.5-coder:7b
   ```
3. **Kích hoạt trong file `.env`:**
   Mở file `.env` trên máy và chỉnh:
   ```env
   USE_OLLAMA=true
   OLLAMA_MODEL=deepseek-coder:6.7b
   ```
4. **Chạy batch generation hoàn toàn offline:**
   ```bash
   docker-compose run --rm experiment-runner npm run experiment:batch
   ```

---

## 🛑 4. Dọn Dẹp & Dừng Containers
```bash
# Dừng tất cả container
docker-compose down

# Dừng và xóa toàn bộ dữ liệu volume nếu muốn dọn sạch ổ cứng
docker-compose down -v
```
