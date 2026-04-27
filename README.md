>AI poweered Virtual teaching assistant

## What This Is

A complete, production-ready AI teacher platform:

- **5 AI teacher characters** with 3D CSS faces and unique personalities
- **12 languages** — full translation of UI and AI responses
- **7 voice profiles** via Web Speech API (browser built-in, free)
- **Train your own model** — open-source pipeline, runs on Google Colab free
- **5 AI providers** — auto-switches between your model → Groq → Together → Ollama → rule engine
- **No API key required** to run — works with rule engine as fallback

---

## Quick Start (3 minutes)

### Option A — Groq (Free, easiest)

```bash
# 1. Get free key at console.groq.com/keys (no credit card)
# 2. Install and run
npm run install:all
echo "GROQ_API_KEY=gsk_your_key" >> backend/.env
npm run dev

# Frontend: http://localhost:3000
# Backend:  http://localhost:4000
```

### Option B — No API Key at all

```bash
npm run install:all
npm run dev
# Uses built-in rule engine — always works, basic quality
```

### Option C — With your trained model

```bash
# Train (free on Colab/Kaggle — see Training section)
python3 ml/training/train.py generate     # Create dataset
# Upload to Hugging Face (free)
# Add to backend/.env:
# HF_API_KEY=hf_your_token
# HF_MODEL_ID=your-name/nexus-teacher
npm run dev
```

---

## Train Your Own Model (Free)

### Step 1: Generate Dataset

```bash
python3 ml/training/train.py generate
# Creates: ml/data/dataset.jsonl
# ~120+ examples covering all subjects, 3 levels, 5 characters
```

### Step 2: Fine-tune (Google Colab — Free T4 GPU)

```python
# Open colab.research.google.com → New Notebook → T4 GPU

!pip install -q transformers peft bitsandbytes accelerate trl datasets

import torch
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer, SFTConfig

MODEL = "microsoft/Phi-3.5-mini-instruct"  # 3.8B, fits T4 free tier

# 4-bit quantization
bnb = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4",
                          bnb_4bit_compute_dtype=torch.bfloat16)
model     = AutoModelForCausalLM.from_pretrained(MODEL, quantization_config=bnb, device_map="auto")
tokenizer = AutoTokenizer.from_pretrained(MODEL)
tokenizer.pad_token = tokenizer.eos_token
model = prepare_model_for_kbit_training(model)

# LoRA (trains fast, uses little memory)
model = get_peft_model(model, LoraConfig(r=16, lora_alpha=32, lora_dropout=0.05,
    target_modules=["q_proj","k_proj","v_proj","o_proj"], task_type="CAUSAL_LM"))

# Upload dataset.jsonl to Colab first
dataset = load_dataset("json", data_files="dataset.jsonl", split="train")

trainer = SFTTrainer(model=model, tokenizer=tokenizer, train_dataset=dataset,
    args=SFTConfig(output_dir="./nexus-teacher", num_train_epochs=3,
        per_device_train_batch_size=2, gradient_accumulation_steps=4,
        learning_rate=2e-4, bf16=True, max_seq_length=2048))
trainer.train()
trainer.save_model("./nexus-teacher-final")
```

**Training time**: ~4-6 hours on free Colab T4 GPU for Phi-3-mini

### Step 3: Upload to Hugging Face (Free Hosting)

```python
from huggingface_hub import HfApi
api = HfApi()
api.upload_folder(
    folder_path="./nexus-teacher-final",
    repo_id="your-username/nexus-teacher",  # creates free public repo
    repo_type="model",
    token="hf_your_free_token"
)
# Your model is now at: huggingface.co/your-username/nexus-teacher
# API: api-inference.huggingface.co/models/your-username/nexus-teacher
```

### Step 4: Connect to NEXUS

```bash
# Add to backend/.env:
HF_API_KEY=hf_your_free_token      # from huggingface.co/settings/tokens
HF_MODEL_ID=your-username/nexus-teacher

# Restart backend — it auto-detects your trained model
npm run dev:backend
```

---

## Deploy to Web (Free Tiers)

### Backend → Railway (free $5/month credit)

```bash
npm install -g @railway/cli
railway login
cd backend
railway init
railway up
# Set env vars in Railway dashboard or:
railway variables set GROQ_API_KEY=gsk_...
railway variables set HF_API_KEY=hf_...
railway variables set HF_MODEL_ID=your-username/nexus-teacher
railway domain  # get your URL
```

### Frontend → Vercel (free tier, unlimited)

```bash
npm install -g vercel
vercel login
cd frontend
echo "VITE_BACKEND_URL=https://your-backend.up.railway.app" > .env.production
vercel --prod
# Your app is live at your-app.vercel.app
```

### One-click deploy

```bash
bash deploy/deploy.sh
# Interactive wizard — deploys both in one go
```

---

## AI Provider Priority Chain

The backend tries each provider in order. First one that works wins.

```
1. YOUR trained HF model  → best quality (domain-specialized)
2. Groq                   → free 14K tokens/min (llama3.3-70b)
3. Together AI            → $0.0002/1K tokens
4. OpenAI                 → gpt-4o-mini ($0.15/1M tokens)
5. Ollama                 → local, completely free
6. LM Studio              → local GUI, free
7. Rule engine            → always works, zero cost, basic quality
```

Configure in `backend/.env`:
```env
AI_PROVIDER=auto        # tries all in order
# AI_PROVIDER=groq      # force a specific one
# AI_PROVIDER=huggingface
```

---

## Free Model Options

| Model | Params | Colab tier | Quality | Speed |
|-------|--------|------------|---------|-------|
| Phi-3.5-mini | 3.8B | Free T4 | Excellent | Fast |
| Llama-3.2-3B | 3B | Free T4 | Best | Fast |
| Gemma-2-2B | 2.6B | Free T4 | Good | Fastest |
| Qwen2.5-7B | 7B | Kaggle 2xT4 | Best+multilingual | Moderate |

---

## Cost Breakdown

| Component | Free Tier | Cost After Free |
|-----------|-----------|-----------------|
| Frontend (Vercel) | Unlimited | Free |
| Backend (Railway) | $5/month credit | ~$5-20/month |
| AI - Groq | 14K tokens/min | Free |
| AI - HF Inference | 30K tokens/month | $0.06/1K tokens |
| AI - Together AI | $5 credit | $0.0002/1K tokens |
| Model Training (Colab) | Free T4 | Free |
| Model Hosting (HF) | Free | Free |
| **Total for 1000 students/day** | **$0** | **~$5-20/month** |

---

## Project Structure

```
nexus-hosted/
├── frontend/
│   ├── src/App.jsx          ← Complete React app (1,237 lines)
│   │                          3D characters, 12 languages, 7 voices
│   ├── public/favicon.svg
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── backend/
│   ├── src/index.js         ← Express server
│   │                          5 AI providers, auto-fallback
│   │                          Sessions, rate limiting, CORS
│   ├── package.json
│   └── .env.example
│
├── ml/
│   ├── training/
│   │   └── train.py         ← Complete training pipeline
│   │                          Dataset generation + Colab code
│   └── data/
│       └── dataset.jsonl    ← Generated training data
│
└── deploy/
    └── deploy.sh            ← One-click Railway + Vercel deploy
```

---

## Why This Replaces Teachers

1. **Always available** — 24/7, any timezone
2. **Infinite patience** — never frustrated, never tired
3. **Personalized** — adapts to every student's level instantly
4. **Multilingual** — teaches in 12 languages simultaneously
5. **Consistent quality** — same excellent explanation every time
6. **Cost** — fraction of a tutor's hourly rate
7. **Data** — remembers every student's weak areas, improves over time

**Market**: Global edtech market is $400B+. Online tutoring alone is $120B.
This platform costs ~$20/month to run at scale vs. $50-150/hour per human tutor.

---

## License

MIT — own everything you build on this.
