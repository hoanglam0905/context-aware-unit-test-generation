#!/usr/bin/env python3
"""
Script Đánh giá Đối chứng (Comparative Evaluation) Base Model vs Fine-Tuned Model
Được thực thi CHẶT CHẼ trên tập Test Holdout (S05_SlugGenerator, S10_UserProfileService, S15_LoyaltyPointService).
Tuyệt đối không dùng dữ liệu train hay validation.
"""

import os
import sys
import json
import time
import argparse
from typing import Dict, Any, List

def parse_args():
    parser = argparse.ArgumentParser(description="Đánh giá đối chứng Base vs FT trên Test Holdout")
    parser.add_argument("--base_model", type=str, default="Qwen/Qwen2.5-Coder-1.5B-Instruct",
                        help="Tên mô hình nền")
    parser.add_argument("--adapter_dir", type=str, default="./checkpoints/lora_adapter",
                        help="Đường dẫn thư mục LoRA adapter")
    parser.add_argument("--test_file", type=str, default=None,
                        help="Đường dẫn file test JSONL (mặc định: ../dataset/fine_tuning_test.jsonl)")
    parser.add_argument("--output_report", type=str, default=None,
                        help="Đường dẫn file report output (mặc định: ../results/holdout_evaluation_report.json)")
    parser.add_argument("--temperature", type=float, default=0.2, help="Nhiệt độ sampling")
    parser.add_argument("--dry_run", action="store_true", help="Chỉ kiểm tra nạp dữ liệu và cấu hình, không inference")
    return parser.parse_args()


def load_jsonl(file_path: str) -> List[Dict[str, Any]]:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Không tìm thấy file: {file_path}")
    records = []
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def parse_llm_json_response(raw_text: str) -> Dict[str, Any]:
    """Bóc tách JSON và testCode từ output của LLM."""
    clean_text = raw_text.strip()
    # Tìm codeblock json nếu có
    if "```json" in clean_text:
        start = clean_text.find("```json") + 7
        end = clean_text.find("```", start)
        clean_text = clean_text[start:end].strip()
    elif "```" in clean_text:
        start = clean_text.find("```") + 3
        end = clean_text.find("```", start)
        clean_text = clean_text[start:end].strip()

    try:
        data = json.loads(clean_text)
        return {
            "valid_json": True,
            "test_code": data.get("testCode", ""),
            "scenarios_count": len(data.get("testScenarios", [])),
            "data": data,
        }
    except Exception as e:
        return {
            "valid_json": False,
            "test_code": clean_text if "describe(" in clean_text or "it(" in clean_text else "",
            "scenarios_count": 0,
            "error": str(e),
        }


def main():
    args = parse_args()
    script_dir = os.path.dirname(os.path.abspath(__file__))
    test_path = args.test_file or os.path.abspath(os.path.join(script_dir, "../dataset/fine_tuning_test.jsonl"))
    report_path = args.output_report or os.path.abspath(os.path.join(script_dir, "../results/holdout_evaluation_report.json"))

    print("=" * 65)
    print("🔬 HOLDOUT TEST EVALUATION: BASE MODEL VS FINE-TUNED MODEL")
    print("=" * 65)
    print(f"Mô hình nền:       {args.base_model}")
    print(f"LoRA Adapter:      {args.adapter_dir}")
    print(f"Tập Test Holdout:  {test_path}")
    print(f"Báo cáo Output:    {report_path}")
    print("=" * 65)

    test_records = load_jsonl(test_path)
    print(f"✅ Đã nạp {len(test_records)} bài toán holdout (S05, S10, S15).")

    if args.dry_run:
        print("\n[DRY RUN] Đã xác nhận cấu hình và tính sẵn sàng của tập Test Holdout.")
        return

    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
        from peft import PeftModel
    except ImportError as e:
        print(f"\n❌ Thiếu thư viện Python: {e}")
        print("Vui lòng cài đặt: pip install -r requirements.txt")
        sys.exit(1)

    tokenizer = AutoTokenizer.from_pretrained(args.base_model, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    is_cuda = torch.cuda.is_available()
    device = "cuda" if is_cuda else "cpu"
    dtype = torch.bfloat16 if (is_cuda and torch.cuda.is_bf16_supported()) else torch.float16

    print(f"\n⏳ Đang nạp Base Model {args.base_model} lên {device}...")
    base_model = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        torch_dtype=dtype,
        device_map="auto" if is_cuda else None,
        trust_remote_code=True,
    )

    ft_model = None
    if os.path.exists(args.adapter_dir):
        print(f"⏳ Đang nạp LoRA Adapter từ {args.adapter_dir}...")
        ft_model = PeftModel.from_pretrained(base_model, args.adapter_dir)
        ft_model.eval()
    else:
        print(f"⚠️ Chưa tìm thấy LoRA Adapter tại {args.adapter_dir}. Chỉ đánh giá Base Model.")

    base_model.eval()

    def generate_response(model, messages: List[Dict[str, str]]) -> str:
        prompt_text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer(prompt_text, return_tensors="pt").to(device)
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=1536,
                temperature=args.temperature,
                do_sample=args.temperature > 0,
                pad_token_id=tokenizer.pad_token_id,
            )
        input_len = inputs["input_ids"].shape[1]
        generated_ids = outputs[0][input_len:]
        return tokenizer.decode(generated_ids, skip_special_tokens=True)

    results = []
    print("\n🚀 Bắt đầu đánh giá từng mẫu trong tập Holdout...")

    for idx, rec in enumerate(test_records):
        meta = rec.get("metadata", {})
        svc_id = meta.get("serviceId", f"Sample_{idx+1}")
        print(f"\n🔹 Đang đánh giá Holdout: {svc_id}...")

        # Prompt input chỉ gồm system và user
        inference_messages = [rec["messages"][0], rec["messages"][1]]

        # 1. Base Model Inference
        t0 = time.time()
        base_raw = generate_response(base_model, inference_messages)
        base_lat = round((time.time() - t0) * 1000, 2)
        base_parsed = parse_llm_json_response(base_raw)
        print(f"   [Base Model] Valid JSON: {base_parsed['valid_json']} | Scenarios: {base_parsed['scenarios_count']} ({base_lat}ms)")

        # 2. Fine-Tuned Model Inference (nếu có)
        ft_parsed = None
        ft_lat = 0
        if ft_model:
            t1 = time.time()
            ft_raw = generate_response(ft_model, inference_messages)
            ft_lat = round((time.time() - t1) * 1000, 2)
            ft_parsed = parse_llm_json_response(ft_raw)
            print(f"   [Fine-Tuned]  Valid JSON: {ft_parsed['valid_json']} | Scenarios: {ft_parsed['scenarios_count']} ({ft_lat}ms)")

        results.append({
            "service_id": svc_id,
            "tier": meta.get("tier"),
            "base_model": {
                "valid_json": base_parsed["valid_json"],
                "scenarios_count": base_parsed["scenarios_count"],
                "latency_ms": base_lat,
                "raw_output": base_raw[:500] + "...",
            },
            "fine_tuned_model": {
                "valid_json": ft_parsed["valid_json"] if ft_parsed else None,
                "scenarios_count": ft_parsed["scenarios_count"] if ft_parsed else None,
                "latency_ms": ft_lat,
                "raw_output": (ft_raw[:500] + "...") if ft_model else None,
            } if ft_model else None,
        })

    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    report_data = {
        "evaluated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "base_model": args.base_model,
        "adapter_dir": args.adapter_dir if ft_model else None,
        "test_samples_count": len(test_records),
        "results": results,
    }
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2, ensure_ascii=False)

    print(f"\n📊 Báo cáo đánh giá holdout đã được lưu tại: {report_path}")


if __name__ == "__main__":
    main()
