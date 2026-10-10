#!/usr/bin/env python3
"""
Script Huấn luyện Supervised Fine-Tuning (SFT) LoRA / QLoRA cho Context-Aware Unit Test Generation.
Tương thích với Qwen 2.5 Coder (1.5B / 7B) và DeepSeek Coder.
Sử dụng Hugging Face Transformers, PEFT, TRL (SFTTrainer).
"""

import os
import sys
import json
import time
import argparse
from typing import Dict, Any, List

def parse_args():
    parser = argparse.ArgumentParser(description="Huấn luyện LoRA / QLoRA cho sinh Unit Test bám ngữ cảnh BA")
    parser.add_argument("--base_model", type=str, default="Qwen/Qwen2.5-Coder-1.5B-Instruct",
                        help="Tên mô hình nền trên Hugging Face (ví dụ: Qwen/Qwen2.5-Coder-1.5B-Instruct)")
    parser.add_argument("--train_file", type=str, default=None,
                        help="Đường dẫn file train JSONL (mặc định: ../dataset/fine_tuning_train.jsonl)")
    parser.add_argument("--val_file", type=str, default=None,
                        help="Đường dẫn file validation JSONL (mặc định: ../dataset/fine_tuning_val.jsonl)")
    parser.add_argument("--output_dir", type=str, default="./checkpoints/lora_adapter",
                        help="Thư mục lưu adapter LoRA sau huấn luyện")
    parser.add_argument("--lora_r", type=int, default=16, help="Hạng LoRA (Rank r)")
    parser.add_argument("--lora_alpha", type=int, default=32, help="Hệ số tỉ lệ LoRA alpha")
    parser.add_argument("--lora_dropout", type=float, default=0.05, help="Tỷ lệ LoRA dropout")
    parser.add_argument("--epochs", type=int, default=4, help="Số epoch huấn luyện")
    parser.add_argument("--lr", type=float, default=2e-4, help="Tốc độ học (Learning rate)")
    parser.add_argument("--batch_size", type=int, default=2, help="Kích thước batch trên mỗi device")
    parser.add_argument("--grad_accum", type=int, default=4, help="Gradient accumulation steps")
    parser.add_argument("--max_seq_length", type=int, default=2048, help="Độ dài chuỗi tối đa")
    parser.add_argument("--no_qlora", action="store_true", help="Tắt lượng tử hóa 4-bit (chạy FP16 đầy đủ)")
    parser.add_argument("--dry_run", action="store_true", help="Chỉ kiểm tra nạp dữ liệu và cấu hình, không train")
    return parser.parse_args()


def load_jsonl_dataset(file_path: str) -> List[Dict[str, Any]]:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Không tìm thấy file dataset: {file_path}")
    records = []
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def format_chat_prompt(tokenizer, messages: List[Dict[str, str]]) -> str:
    """Format hội thoại theo Chat Template của tokenizer."""
    if hasattr(tokenizer, "apply_chat_template") and tokenizer.chat_template:
        return tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
    # Fallback template tiêu chuẩn
    formatted = ""
    for msg in messages:
        role = msg["role"]
        content = msg["content"]
        formatted += f"<|im_start|>{role}\n{content}<|im_end|>\n"
    return formatted


def generate_ollama_modelfile(output_dir: str, base_model: str, adapter_dir: str):
    """Tạo Modelfile để nạp trực tiếp vào Ollama."""
    modelfile_path = os.path.join(output_dir, "Modelfile")
    content = f"""# Ollama Modelfile for Context-Aware Unit Test Generator
FROM {base_model}
ADAPTER {os.path.abspath(adapter_dir)}

PARAMETER temperature 0.2
PARAMETER top_p 0.95
PARAMETER stop "<|im_end|>"
PARAMETER stop "<|endoftext|>"

SYSTEM \"\"\"You are an elite QA Engineer and Automated Test Specialist. Generate production-ready Jest unit tests strictly aligned with BA acceptance criteria and AST structures.\"\"\"
"""
    with open(modelfile_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"📄 Đã sinh Ollama Modelfile tại: {modelfile_path}")


def main():
    args = parse_args()
    script_dir = os.path.dirname(os.path.abspath(__file__))
    train_path = args.train_file or os.path.abspath(os.path.join(script_dir, "../dataset/fine_tuning_train.jsonl"))
    val_path = args.val_file or os.path.abspath(os.path.join(script_dir, "../dataset/fine_tuning_val.jsonl"))

    print("=" * 65)
    print("🚀 SFT LORA / QLORA TRAINING PIPELINE")
    print("=" * 65)
    print(f"Mô hình nền:       {args.base_model}")
    print(f"Tập Train:         {train_path}")
    print(f"Tập Validation:    {val_path}")
    print(f"Thư mục Output:    {args.output_dir}")
    print(f"LoRA Config:       r={args.lora_r}, alpha={args.lora_alpha}, dropout={args.lora_dropout}")
    print(f"Hyperparameters:   lr={args.lr}, epochs={args.epochs}, batch={args.batch_size}, accum={args.grad_accum}")
    print(f"4-bit Quantized:   {not args.no_qlora}")
    print("=" * 65)

    # 1. Đọc và kiểm định dữ liệu
    train_data = load_jsonl_dataset(train_path)
    val_data = load_jsonl_dataset(val_path)
    print(f"✅ Đã nạp {len(train_data)} mẫu train và {len(val_data)} mẫu validation thành công.")

    if args.dry_run:
        print("\n[DRY RUN] Đã kiểm tra xong cú pháp và tính sẵn sàng của dữ liệu.")
        return

    # 2. Khởi tạo Tokenizer và Dependencies
    try:
        import torch
        from transformers import (
            AutoModelForCausalLM,
            AutoTokenizer,
            TrainingArguments,
            BitsAndBytesConfig,
        )
        from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
        from trl import SFTTrainer
        from datasets import Dataset
    except ImportError as e:
        print(f"\n❌ Thiếu thư viện Python cần thiết: {e}")
        print("Vui lòng cài đặt: pip install -r requirements.txt")
        sys.exit(1)

    print("\n⏳ Đang nạp Tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(args.base_model, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # 3. Chuẩn bị định dạng Chat
    def prepare_dataset(records):
        formatted_texts = [format_chat_prompt(tokenizer, r["messages"]) for r in records]
        return Dataset.from_dict({"text": formatted_texts})

    train_dataset = prepare_dataset(train_data)
    val_dataset = prepare_dataset(val_data)

    # 4. Cấu hình Quantization (QLoRA)
    is_cuda = torch.cuda.is_available()
    compute_dtype = torch.bfloat16 if (is_cuda and torch.cuda.is_bf16_supported()) else torch.float16

    quant_config = None
    if not args.no_qlora and is_cuda:
        quant_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=compute_dtype,
            bnb_4bit_use_double_quant=True,
        )

    # 5. Nạp mô hình nền
    print(f"⏳ Đang nạp mô hình nền {args.base_model}...")
    model = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        quantization_config=quant_config,
        device_map="auto" if is_cuda else None,
        torch_dtype=compute_dtype,
        trust_remote_code=True,
    )

    if quant_config:
        model = prepare_model_for_kbit_training(model)

    # 6. Thiết lập LoRA
    target_modules = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]
    peft_config = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=args.lora_dropout,
        target_modules=target_modules,
        bias="none",
        task_type="CAUSAL_LM",
    )

    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()

    # 7. Cấu hình Training
    os.makedirs(args.output_dir, exist_ok=True)
    training_args = TrainingArguments(
        output_dir=args.output_dir,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
        learning_rate=args.lr,
        warmup_ratio=0.1,
        weight_decay=0.01,
        logging_steps=5,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        save_total_limit=2,
        fp16=not (is_cuda and torch.cuda.is_bf16_supported()),
        bf16=is_cuda and torch.cuda.is_bf16_supported(),
        report_to="none",
    )

    trainer = SFTTrainer(
        model=model,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        peft_config=peft_config,
        dataset_text_field="text",
        max_seq_length=args.max_seq_length,
        tokenizer=tokenizer,
        args=training_args,
    )

    # 8. Thực hiện Huấn luyện
    print("\n🔥 Bắt đầu quá trình huấn luyện LoRA...")
    start_time = time.time()
    train_result = trainer.train()
    training_duration = time.time() - start_time

    # 9. Lưu Adapter và Metadata
    print(f"\n💾 Đang lưu LoRA adapter vào {args.output_dir}...")
    trainer.model.save_pretrained(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)

    metadata = {
        "base_model": args.base_model,
        "lora_r": args.lora_r,
        "lora_alpha": args.lora_alpha,
        "lora_dropout": args.lora_dropout,
        "target_modules": target_modules,
        "epochs": args.epochs,
        "learning_rate": args.lr,
        "train_samples": len(train_data),
        "val_samples": len(val_data),
        "duration_seconds": round(training_duration, 2),
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    with open(os.path.join(args.output_dir, "training_metadata.json"), "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    generate_ollama_modelfile(args.output_dir, args.base_model, args.output_dir)

    print("\n🎉 HUẤN LUYỆN LORA THÀNH CÔNG!")
    print(f"Thời gian: {round(training_duration, 1)}s")
    print(f"Adapter:   {os.path.abspath(args.output_dir)}")


if __name__ == "__main__":
    main()
