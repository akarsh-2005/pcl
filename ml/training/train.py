#!/usr/bin/env python3
"""
================================================================================
NEXUS AI — LLM Training Pipeline
================================================================================
Train a custom AI Teacher model using open-source tools.
Supports fine-tuning on any HuggingFace model using LoRA/QLoRA.

FREE MODELS TO FINE-TUNE (no license fee):
  - meta-llama/Llama-3.2-3B-Instruct   (3B, excellent quality, recommended)
  - microsoft/Phi-3.5-mini-instruct     (3.8B, very fast)
  - Qwen/Qwen2.5-7B-Instruct           (7B, multilingual)
  - mistralai/Mistral-7B-Instruct-v0.3  (7B, great reasoning)
  - google/gemma-2-2b-it               (2.6B, fastest)

FREE TRAINING PLATFORMS:
  - Google Colab (T4 GPU, free tier)     → phi-3-mini, gemma-2b
  - Kaggle Notebooks (2x T4, free)       → llama-3.2-3b
  - Together AI ($5 credit, generous)    → any model
  - RunPod (cheap spot GPUs)             → any model

USAGE:
  python3 ml/training/train.py --model phi3 --data ml/data/dataset.jsonl
  python3 ml/training/train.py --model llama3 --epochs 3 --platform colab
================================================================================
"""

import os, sys, json, math, random, time
from pathlib import Path
from datetime import datetime

# ── CONFIG ──────────────────────────────────────────────────
MODELS = {
    "phi3": {
        "hf_id":     "microsoft/Phi-3.5-mini-instruct",
        "params":    "3.8B",
        "vram":      "6GB",
        "context":   4096,
        "speed":     "fastest",
        "quality":   "excellent",
        "free_tier": ["Colab T4", "Kaggle T4"],
    },
    "llama3": {
        "hf_id":     "meta-llama/Llama-3.2-3B-Instruct",
        "params":    "3B",
        "vram":      "6GB",
        "context":   8192,
        "speed":     "fast",
        "quality":   "best",
        "free_tier": ["Kaggle 2xT4", "Colab A100"],
    },
    "gemma2": {
        "hf_id":     "google/gemma-2-2b-it",
        "params":    "2.6B",
        "vram":      "5GB",
        "context":   8192,
        "speed":     "fastest",
        "quality":   "good",
        "free_tier": ["Colab T4 free"],
    },
    "qwen": {
        "hf_id":     "Qwen/Qwen2.5-7B-Instruct",
        "params":    "7B",
        "vram":      "14GB",
        "context":   8192,
        "speed":     "moderate",
        "quality":   "best+multilingual",
        "free_tier": ["Kaggle 2xT4"],
    },
}

LORA_CONFIG = {
    "r":             16,        # LoRA rank (higher = more capacity, more memory)
    "lora_alpha":    32,        # scaling factor
    "target_modules": ["q_proj","k_proj","v_proj","o_proj","gate_proj","up_proj","down_proj"],
    "lora_dropout":  0.05,
    "bias":          "none",
    "task_type":     "CAUSAL_LM",
}

TRAINING_CONFIG = {
    "output_dir":             "./nexus-model",
    "num_train_epochs":       3,
    "per_device_train_batch_size": 2,
    "gradient_accumulation_steps": 4,   # effective batch = 8
    "learning_rate":          2e-4,
    "weight_decay":           0.01,
    "fp16":                   True,     # use bf16 on A100
    "logging_steps":          10,
    "save_steps":             200,
    "eval_steps":             200,
    "warmup_ratio":           0.03,
    "lr_scheduler_type":      "cosine",
    "optim":                  "paged_adamw_8bit",
    "max_grad_norm":          0.3,
    "group_by_length":        True,
}

# ── SYSTEM PROMPT (what the model learns to be) ──────────────
TEACHER_SYSTEM_PROMPT = """You are NEXUS AI — an exceptional educational AI teacher.
You are warm, encouraging, and deeply knowledgeable across all subjects.
You adapt your teaching style to the student's level:
- BEGINNER: Simple analogies, everyday examples, short sentences, define every term
- INTERMEDIATE: Balance depth with clarity, real-world applications, cause-effect
- ADVANCED: Technical precision, nuance, formal definitions, edge cases, open questions

You address the student by name once, naturally.
You use **bold** for key terms and *italic* for emphasis.
Your explanation follows: hook → concept → example → insight → follow-up question.

ALWAYS respond with ONLY this JSON (no markdown fences):
{
  "explanation": "2-4 paragraphs with **bold** key terms",
  "visual": "self-contained HTML with inline CSS, diagram/table, max 500 chars",
  "keyNote": "single most important takeaway sentence",
  "followUp": "one Socratic follow-up question",
  "topic": "3-5 word topic name",
  "difficulty": 5
}"""

# ── TRAINING DATA GENERATION ─────────────────────────────────
EDUCATIONAL_QA = [
    # Mathematics
    {"q": "What is a fraction?",                    "s": "math", "l": "beginner"},
    {"q": "What is the Pythagorean theorem?",       "s": "math", "l": "intermediate"},
    {"q": "How do derivatives work in calculus?",   "s": "math", "l": "intermediate"},
    {"q": "Explain eigenvalues and eigenvectors",   "s": "math", "l": "advanced"},
    {"q": "What is Bayes theorem?",                 "s": "math", "l": "advanced"},
    {"q": "How does probability work?",             "s": "math", "l": "beginner"},
    {"q": "What is a quadratic equation?",          "s": "math", "l": "intermediate"},
    {"q": "Explain linear algebra fundamentals",    "s": "math", "l": "intermediate"},
    {"q": "What is the central limit theorem?",     "s": "math", "l": "advanced"},
    {"q": "How do logarithms work?",               "s": "math", "l": "intermediate"},

    # Science
    {"q": "How does photosynthesis work?",          "s": "sci",  "l": "beginner"},
    {"q": "How does gravity work?",                 "s": "sci",  "l": "beginner"},
    {"q": "What is DNA and how does it work?",      "s": "sci",  "l": "intermediate"},
    {"q": "How do vaccines create immunity?",       "s": "sci",  "l": "intermediate"},
    {"q": "What is quantum entanglement?",          "s": "sci",  "l": "advanced"},
    {"q": "What is CRISPR gene editing?",           "s": "sci",  "l": "advanced"},
    {"q": "How do black holes form?",               "s": "sci",  "l": "intermediate"},
    {"q": "What is natural selection?",             "s": "sci",  "l": "beginner"},
    {"q": "How does the immune system work?",       "s": "sci",  "l": "intermediate"},
    {"q": "What is entropy?",                       "s": "sci",  "l": "intermediate"},

    # Technology
    {"q": "How does the internet work?",            "s": "tech", "l": "beginner"},
    {"q": "What is machine learning?",              "s": "tech", "l": "beginner"},
    {"q": "How do neural networks learn?",          "s": "tech", "l": "advanced"},
    {"q": "What is Big O notation?",               "s": "tech", "l": "intermediate"},
    {"q": "How does public key cryptography work?", "s": "tech", "l": "advanced"},
    {"q": "What is recursion in programming?",      "s": "tech", "l": "intermediate"},
    {"q": "How does a transformer model work?",     "s": "tech", "l": "advanced"},
    {"q": "What is a variable in programming?",     "s": "tech", "l": "beginner"},
    {"q": "How do REST APIs work?",                "s": "tech", "l": "intermediate"},
    {"q": "What is dynamic programming?",           "s": "tech", "l": "advanced"},

    # History
    {"q": "What caused World War I?",               "s": "hist", "l": "intermediate"},
    {"q": "What was the Renaissance?",              "s": "hist", "l": "beginner"},
    {"q": "How did the Cold War shape the world?",  "s": "hist", "l": "advanced"},
    {"q": "What was the Industrial Revolution?",    "s": "hist", "l": "intermediate"},
    {"q": "What caused the French Revolution?",     "s": "hist", "l": "intermediate"},

    # Economics
    {"q": "What is supply and demand?",             "s": "econ", "l": "beginner"},
    {"q": "How does inflation work?",               "s": "econ", "l": "intermediate"},
    {"q": "What is game theory?",                  "s": "econ", "l": "advanced"},
    {"q": "What is a market failure?",             "s": "econ", "l": "intermediate"},
    {"q": "How do central banks control money?",    "s": "econ", "l": "advanced"},

    # Geography
    {"q": "What causes climate zones?",             "s": "geo",  "l": "intermediate"},
    {"q": "How does plate tectonics work?",         "s": "geo",  "l": "intermediate"},
    {"q": "What is urbanization?",                  "s": "geo",  "l": "beginner"},

    # Art & Literature
    {"q": "What is a metaphor in literature?",      "s": "lit",  "l": "beginner"},
    {"q": "How does color theory work?",            "s": "art",  "l": "intermediate"},
    {"q": "What is the hero's journey?",            "s": "lit",  "l": "intermediate"},
]

IDEAL_RESPONSES = {
    "How does gravity work?_beginner": {
        "explanation": "Have you ever wondered why things always fall **down** and never float up? The answer is **gravity** — one of the four fundamental forces that shapes everything in the universe.\n\nImagine placing a heavy bowling ball on a stretched rubber sheet. It creates a dip, and any marble you roll nearby curves toward that dip and spirals in. **Gravity** works similarly — every object with **mass** (physical substance) creates an invisible pull on everything around it. The more mass, the stronger the pull.\n\nOn Earth, this means everything is constantly pulled toward the planet's center at 9.8 meters per second squared — that's why dropping a feather (ignoring air) and a hammer fall at the same rate. The Moon experiences Earth's gravity too, but moves sideways fast enough to keep \"missing\" Earth in a perpetual fall we call an **orbit**.\n\nThis invisible force keeps you on the ground, holds the Moon in orbit, keeps Earth circling the Sun, and even holds entire galaxies together across millions of light-years.",
        "visual": '<div style="text-align:center;padding:12px;background:#0d1b2a;border-radius:10px;color:#e2e8f0;font-size:11px"><div style="font-size:22px;margin-bottom:8px">🌍</div><div style="color:#00f5d4;font-weight:700;margin-bottom:5px">GRAVITY</div><div style="display:flex;justify-content:center;align-items:center;gap:16px;margin-top:8px"><div style="text-align:center"><div style="font-size:14px">🪨</div><div style="color:#8da0c2;font-size:9px">Big mass</div><div style="color:#00f5d4;font-size:9px">Strong pull</div></div><div style="color:#7b61ff;font-size:18px">→</div><div style="text-align:center"><div style="font-size:14px">⚽</div><div style="color:#8da0c2;font-size:9px">Small mass</div><div style="color:#c77dff;font-size:9px">Weak pull</div></div></div></div>',
        "keyNote": "Gravity is a force of attraction between all objects with mass — the more mass, the stronger the gravitational pull.",
        "followUp": "If gravity pulls everything toward Earth, why does the Moon not crash into us?",
        "topic": "Gravity and Mass",
        "difficulty": 2,
    },
    "What is the Pythagorean theorem?_intermediate": {
        "explanation": "The **Pythagorean theorem** is one of mathematics' most ancient and elegant truths: in any *right triangle* (a triangle with exactly one 90° angle), the square of the longest side equals the sum of the squares of the other two sides.\n\nWritten as **a² + b² = c²** — where a and b are the shorter sides (legs) and c is the hypotenuse. The remarkable thing is this works for *every single right triangle that has ever existed*, no exceptions. If you know any two sides, you can find the third.\n\nHere's the geometric intuition: build a square on each side of the triangle. The area of the square on the hypotenuse *exactly* equals the combined area of the squares on the other two sides. Visually, the tiles just work out perfectly — which is why over 370 different proofs have been discovered, including one by US President James Garfield.\n\nYou use this constantly without realizing it — GPS satellites triangulate your position using 3D extensions of this theorem, game engines calculate pixel distances with it, and builders check right angles using the 3-4-5 triple (since 9+16=25).",
        "visual": '<div style="font-family:monospace;background:#0d1b2a;border-radius:10px;padding:12px;color:#e2e8f0;font-size:11px"><div style="color:#00f5d4;font-size:14px;font-weight:700;text-align:center;margin-bottom:8px">a² + b² = c²</div><div style="display:flex;gap:8px;justify-content:center"><div style="background:#7b61ff22;border:2px solid #7b61ff;padding:7px;border-radius:6px;text-align:center"><div style="color:#9d8fff">a=3</div><div style="color:#7b61ff;font-size:15px;font-weight:700">9</div></div><span style="color:#00f5d4;font-size:15px;line-height:46px">+</span><div style="background:#00f5d422;border:2px solid #00f5d4;padding:7px;border-radius:6px;text-align:center"><div style="color:#00c8ad">b=4</div><div style="color:#00f5d4;font-size:15px;font-weight:700">16</div></div><span style="color:#ffbe0b;font-size:15px;line-height:46px">=</span><div style="background:#ffbe0b22;border:2px solid #ffbe0b;padding:7px;border-radius:6px;text-align:center"><div style="color:#ffbe0b">c=5</div><div style="color:#ffbe0b;font-size:15px;font-weight:700">25</div></div></div></div>',
        "keyNote": "In any right triangle, a² + b² = c² — this single equation underlies GPS, computer graphics, and all distance calculations.",
        "followUp": "Can you think of a situation in everyday life where you've implicitly used the Pythagorean theorem without realizing it?",
        "topic": "Pythagorean Theorem",
        "difficulty": 4,
    },
}

def build_training_example(qa: dict, student_name: str = "Student") -> dict:
    """Build one fine-tuning example in chat format."""
    level_instructions = {
        "beginner":     "Use simple everyday analogies. Define every term. Short sentences. One concept at a time.",
        "intermediate": "Balance depth with real-world examples. Show cause-and-effect. Connect to prior knowledge.",
        "advanced":     "Be technically precise. Explore nuance, formal definitions, edge cases, and open questions.",
    }

    user_content = f"[Student: {student_name}] [Subject: {qa['s']}] [Level: {qa['l']}]\n{qa['q']}"

    # Use ideal response if available, else generate template
    key = f"{qa['q']}_{qa['l']}"
    if key in IDEAL_RESPONSES:
        assistant_content = json.dumps(IDEAL_RESPONSES[key], ensure_ascii=False)
    else:
        # Template response for topics without hand-crafted responses
        assistant_content = json.dumps({
            "explanation": f"**{qa['q'].replace('?','')}** is a fundamental concept worth understanding deeply.\n\nAt the {qa['l']} level, the key insight is this: {qa['q'].lower().replace('?','')} connects to core principles that appear repeatedly across {qa['s']}.\n\nThe most important thing to understand is that every concept has a purpose — it was discovered or invented to solve a real problem. When you understand *why* it exists, the *how* becomes much clearer.\n\nAs you explore this further, notice how it connects to other ideas you already know. Knowledge forms a web, not a list.",
            "visual": f'<div style="padding:12px;background:#0d1b2a;border-radius:8px;color:#e2e8f0;font-size:11px;text-align:center"><div style="color:#00f5d4;font-weight:700;font-size:13px">{qa["q"].replace("?","")}</div><div style="color:#8da0c2;margin-top:6px">Core concept — explore further</div></div>',
            "keyNote": f"Understanding this concept at the {qa['l']} level opens the door to deeper mastery of {qa['s']}.",
            "followUp": f"How does this connect to something you already know well?",
            "topic": " ".join(qa["q"].replace("?","").split()[:5]),
            "difficulty": {"beginner": 3, "intermediate": 5, "advanced": 8}[qa["l"]],
        }, ensure_ascii=False)

    return {
        "messages": [
            {"role": "system",    "content": TEACHER_SYSTEM_PROMPT},
            {"role": "user",      "content": user_content},
            {"role": "assistant", "content": assistant_content},
        ]
    }


def generate_dataset(output_path: str = "ml/data/dataset.jsonl", augment: bool = True) -> int:
    """Generate the training dataset."""
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    examples = []
    student_names = ["Alex","Sam","Jordan","Priya","Diego","Maya","Chris","Aisha","Lena","Omar"]

    for qa in EDUCATIONAL_QA:
        # Base example
        name = random.choice(student_names)
        examples.append(build_training_example(qa, name))

        if augment:
            # Augment: rephrase questions
            rephrases = [
                f"Can you explain {qa['q'].lower().replace('?','')}?",
                f"I don't understand {qa['q'].lower().replace('what is ','').replace('how does ','').replace('how do ','').replace('?','')}. Can you help?",
                f"Please teach me about {qa['q'].lower().replace('what is ','').replace('how does ','').replace('how do ','').replace('?','')}",
            ]
            for rephrased in rephrases[:2]:
                examples.append(build_training_example(
                    {**qa, "q": rephrased},
                    random.choice(student_names)
                ))

    # Shuffle
    random.shuffle(examples)

    # Save
    with open(output_path, "w", encoding="utf-8") as f:
        for ex in examples:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")

    print(f"Dataset saved: {output_path}")
    print(f"  Total examples: {len(examples)}")
    print(f"  File size: {Path(output_path).stat().st_size / 1024:.1f} KB")
    return len(examples)


def print_training_guide(model_key: str = "phi3"):
    """Print complete training instructions."""
    model = MODELS.get(model_key, MODELS["phi3"])

    print("=" * 70)
    print(f"  NEXUS AI — LLM Fine-Tuning Guide")
    print(f"  Model: {model['hf_id']} ({model['params']})")
    print("=" * 70)
    print(f"""
STEP 1 — Generate training data
  python3 ml/training/train.py generate
  → Creates: ml/data/dataset.jsonl (~{len(EDUCATIONAL_QA)*3} examples)

STEP 2 — Choose your platform (all FREE options):

  A) Google Colab (easiest, T4 free):
     → Open colab.research.google.com
     → New notebook → GPU runtime
     → Paste the training code below

  B) Kaggle Notebooks (2x T4, 30hr/week free):
     → kaggle.com → Code → New Notebook
     → Settings → Accelerator → GPU T4 x2
     → Upload dataset.jsonl

  C) Together AI ($5 free credit, cheapest):
     → together.ai → Fine-tuning → Upload dataset
     → Model: {model['hf_id']}
     → ~$2-4 for full fine-tune

  D) Hugging Face AutoTrain (no-code):
     → huggingface.co/autotrain
     → Upload dataset.jsonl
     → Select model, click train

STEP 3 — Training code (paste in Colab/Kaggle):
""")

    print("""```python
# Install dependencies
!pip install -q transformers peft bitsandbytes accelerate datasets trl

import torch
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer, SFTConfig

# Config
MODEL_ID = \"""" + model["hf_id"] + """\"
DATASET  = "dataset.jsonl"  # upload this file

# 4-bit quantization (fits any GPU with 6GB+)
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
)

# Load model
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID, quantization_config=bnb_config,
    device_map="auto", trust_remote_code=True
)
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
tokenizer.pad_token = tokenizer.eos_token
model = prepare_model_for_kbit_training(model)

# LoRA config
peft_config = LoraConfig(
    r=16, lora_alpha=32, lora_dropout=0.05,
    target_modules=["q_proj","k_proj","v_proj","o_proj"],
    task_type="CAUSAL_LM", bias="none"
)
model = get_peft_model(model, peft_config)

# Dataset
dataset = load_dataset("json", data_files=DATASET, split="train")

# Train
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    args=SFTConfig(
        output_dir="./nexus-teacher",
        num_train_epochs=3,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        learning_rate=2e-4,
        bf16=True,
        logging_steps=10,
        save_steps=100,
        warmup_ratio=0.03,
        lr_scheduler_type="cosine",
        max_seq_length=2048,
    ),
)
trainer.train()

# Save
trainer.save_model("./nexus-teacher-final")
print("Training complete! Model saved to ./nexus-teacher-final")
```""")

    print(f"""
STEP 4 — Export and host

  Option A: Hugging Face Hub (FREE hosting, API included)
    from huggingface_hub import HfApi
    api = HfApi()
    api.upload_folder(
        folder_path="./nexus-teacher-final",
        repo_id="your-username/nexus-teacher",
        repo_type="model"
    )
    # Your API: https://api-inference.huggingface.co/models/your-username/nexus-teacher

  Option B: Together AI (fast inference, $0.0002/1K tokens)
    together.ai → Models → Upload → Deploy

  Option C: Replicate (free tier available)
    replicate.com → Deploy your model

  Option D: Local with llama.cpp (completely free)
    # Convert to GGUF
    pip install llama-cpp-python
    python3 -m llama_cpp.convert ./nexus-teacher-final --outtype q8_0
    llama-server -m nexus-teacher-q8.gguf --port 8080

STEP 5 — Connect to NEXUS backend
  Set in backend/.env:
  AI_PROVIDER=huggingface
  HF_MODEL_ID=your-username/nexus-teacher
  HF_API_KEY=hf_your_key  (free at huggingface.co/settings/tokens)

ESTIMATED TRAINING COSTS:
  Google Colab T4 (free):    ~4-6 hours for phi3-mini  → $0
  Kaggle 2xT4 (free):        ~3-4 hours for llama3.2   → $0
  Together AI:               ~1-2 hours for any model  → $2-4
  Hugging Face AutoTrain:    ~2-3 hours                → $3-8
  RunPod A100 spot:          ~30 min for any model     → $1-2

INFERENCE COSTS (after training):
  Hugging Face Inference API: Free tier = 30K tokens/month
  Together AI:               $0.0002/1K tokens (~$0.04 per full lesson)
  Local deployment:          $0 forever
""")
    print("=" * 70)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("action", nargs="?", default="guide",
                        choices=["generate","guide","all"])
    parser.add_argument("--model",  default="phi3")
    parser.add_argument("--output", default="ml/data/dataset.jsonl")
    args = parser.parse_args()

    if args.action == "generate" or args.action == "all":
        print("Generating training dataset...")
        n = generate_dataset(args.output)
        print(f"Generated {n} examples → {args.output}")

    if args.action == "guide" or args.action == "all":
        print_training_guide(args.model)
