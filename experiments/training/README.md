# Hướng Dẫn Huấn Luyện Fine-Tuning LoRA / QLoRA

Thư mục này chứa toàn bộ pipeline mã nguồn Python để huấn luyện Supervised Fine-Tuning (SFT) mô hình ngôn ngữ lớn (LLM) sinh mã kiểm thử TypeScript/Jest bám sát tài liệu yêu cầu nghiệp vụ BA.

---

## 1. Cấu trúc thư mục

```
experiments/training/
├── requirements.txt         # Thư viện Python cần thiết (Transformers, PEFT, TRL, v.v.)
├── train_lora.py            # Script huấn luyện SFT LoRA / QLoRA
├── evaluate_holdout.py      # Script đánh giá đối chứng Base vs FT trên Holdout (S05, S10, S15)
├── README.md                # Tài liệu hướng dẫn sử dụng này
└── checkpoints/             # Thư mục lưu LoRA adapter sau khi train (tự động tạo)
```

---

## 2. Chuẩn bị môi trường

Yêu cầu môi trường Python $\ge 3.10$:

```bash
# Khởi tạo virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Cài đặt thư viện
pip install -r experiments/training/requirements.txt
```

---

## 3. Các bước huấn luyện (Training Workflow)

### Bước 1: Xuất tập dữ liệu huấn luyện JSONL
Trước khi huấn luyện, đảm bảo các file JSONL đã được xuất và kiểm định từ benchmark:
```bash
npm run dataset:export
npm run dataset:validate
```
Các file được sinh tại `experiments/dataset/`:
- `fine_tuning_train.jsonl` (9 samples - 60%): S01, S02, S03, S06, S07, S08, S11, S12, S13.
- `fine_tuning_val.jsonl` (3 samples - 20%): S04, S09, S14.
- `fine_tuning_test.jsonl` (3 samples - 20%): S05, S10, S15.

### Bước 2: Chạy thử nghiệm Dry-run (Kiểm tra dữ liệu)
```bash
python3 experiments/training/train_lora.py --dry_run
```

### Bước 3: Chạy huấn luyện chính thức (LoRA / QLoRA)

Mặc định sử dụng mô hình nền mã nguồn mở **Qwen 2.5 Coder 1.5B Instruct** (rất nhẹ, chạy tốt trên GPU 8GB-16GB VRAM hoặc Google Colab T4 miễn phí):
```bash
python3 experiments/training/train_lora.py \
  --base_model "Qwen/Qwen2.5-Coder-1.5B-Instruct" \
  --output_dir "./experiments/training/checkpoints/qwen_coder_lora" \
  --epochs 4 \
  --lr 2e-4 \
  --batch_size 2 \
  --grad_accum 4 \
  --lora_r 16 \
  --lora_alpha 32
```

> **Ghi chú GPU:**
> - Nếu huấn luyện trên máy có GPU NVIDIA (Linux/Windows), script mặc định bật **4-bit QLoRA** (`bitsandbytes`) giúp tiết kiệm VRAM tối đa (< 6GB VRAM).
> - Nếu chạy trên Apple Silicon (Mac MPS) hoặc CPU, thêm flag `--no_qlora`.

---

## 4. Đánh giá đối chứng trên Test Holdout

Sau khi huấn luyện hoàn tất, thực thi đánh giá mù (unseen evaluation) đối chứng giữa **Base Model** và **Fine-Tuned Model** trên 3 service holdout chưa từng xuất hiện trong quá trình huấn luyện:
```bash
python3 experiments/training/evaluate_holdout.py \
  --base_model "Qwen/Qwen2.5-Coder-1.5B-Instruct" \
  --adapter_dir "./experiments/training/checkpoints/qwen_coder_lora"
```
Kết quả so sánh chi tiết sẽ được xuất ra `experiments/results/holdout_evaluation_report.json`.

---

## 5. Đóng gói & Tích hợp vào VS Code Extension

Sau khi train xong, thư mục checkpoint sẽ tự động sinh file `Modelfile`. Bạn có thể phục vụ mô hình cục bộ bằng Ollama:

```bash
# Tạo mô hình trong Ollama từ Modelfile
ollama create qwen2.5-coder-ft -f experiments/training/checkpoints/qwen_coder_lora/Modelfile

# Kiểm tra chạy thử
ollama run qwen2.5-coder-ft "Hãy viết Jest unit test cho hàm tính discount..."
```

Trong VS Code Extension:
1. Mở Cài đặt Extension (`settings.json`).
2. Chọn `contextAwareTestGen.modelProvider`: `"ollama"`
3. Nhập `contextAwareTestGen.fineTunedModel`: `"qwen2.5-coder-ft"`
4. Hoặc cung cấp đường dẫn adapter vào `contextAwareTestGen.adapterPath`.
