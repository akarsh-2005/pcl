#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# NEXUS AI — One-Click Deployment Script
# ═══════════════════════════════════════════════════════════════
# Deploys to Railway (backend) + Vercel (frontend) — both free tiers
#
# Prerequisites:
#   npm install -g @railway/cli vercel
#   railway login && vercel login
#
# Usage: bash deploy/deploy.sh
# ═══════════════════════════════════════════════════════════════

set -e

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║        NEXUS AI — Deployment Wizard                 ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── STEP 1: Setup AI Provider ───────────────────────────────
echo "STEP 1: Configure AI Provider"
echo ""
echo "Choose your AI provider (all support free tiers):"
echo "  1) Groq          — Free 14K tokens/min (recommended to start)"
echo "  2) Hugging Face  — Free tier + your trained model"
echo "  3) Together AI   — \$5 free credit"
echo "  4) Ollama        — Local only (not for web hosting)"
echo ""
read -p "Choice [1-4]: " CHOICE

case $CHOICE in
  1)
    echo ""
    echo "Get free Groq key at: https://console.groq.com/keys"
    read -p "Enter GROQ_API_KEY: " GROQ_KEY
    AI_ENV="GROQ_API_KEY=$GROQ_KEY"
    AI_PROVIDER="groq"
    ;;
  2)
    echo ""
    echo "Get free HF token at: https://huggingface.co/settings/tokens"
    read -p "Enter HF_API_KEY: " HF_KEY
    read -p "Enter HF_MODEL_ID (e.g. your-name/nexus-teacher): " HF_MODEL
    AI_ENV="HF_API_KEY=$HF_KEY\nHF_MODEL_ID=$HF_MODEL"
    AI_PROVIDER="huggingface"
    ;;
  3)
    echo ""
    echo "Get Together AI key at: https://api.together.xyz/settings/api-keys"
    read -p "Enter TOGETHER_API_KEY: " TOGETHER_KEY
    AI_ENV="TOGETHER_API_KEY=$TOGETHER_KEY"
    AI_PROVIDER="together"
    ;;
  *)
    echo "Using rule engine fallback (no AI key)"
    AI_ENV=""
    AI_PROVIDER="auto"
    ;;
esac

# ── STEP 2: Deploy Backend to Railway ──────────────────────
echo ""
echo "STEP 2: Deploy Backend to Railway (free tier)"
echo ""

if command -v railway &>/dev/null; then
  cd backend
  railway init --name nexus-ai-backend 2>/dev/null || true
  
  # Set environment variables
  railway variables set NODE_ENV=production
  railway variables set AI_PROVIDER=$AI_PROVIDER
  railway variables set AI_RATE_LIMIT=60
  
  if [ -n "$GROQ_KEY" ];     then railway variables set GROQ_API_KEY=$GROQ_KEY; fi
  if [ -n "$HF_KEY" ];       then railway variables set HF_API_KEY=$HF_KEY; fi
  if [ -n "$HF_MODEL" ];     then railway variables set HF_MODEL_ID=$HF_MODEL; fi
  if [ -n "$TOGETHER_KEY" ]; then railway variables set TOGETHER_API_KEY=$TOGETHER_KEY; fi
  
  railway up --detach
  BACKEND_URL=$(railway domain 2>/dev/null || echo "https://your-app.up.railway.app")
  echo "✓ Backend deployed: $BACKEND_URL"
  cd ..
else
  echo "Railway CLI not found. Install: npm install -g @railway/cli"
  echo "Manual deploy: railway.app → New Project → Deploy from GitHub"
  BACKEND_URL="https://your-backend.up.railway.app"
fi

# ── STEP 3: Deploy Frontend to Vercel ──────────────────────
echo ""
echo "STEP 3: Deploy Frontend to Vercel (free tier)"
echo ""

if command -v vercel &>/dev/null; then
  cd frontend
  
  # Set backend URL
  echo "VITE_BACKEND_URL=$BACKEND_URL" > .env.production
  
  vercel --prod --yes \
    -e "VITE_BACKEND_URL=$BACKEND_URL" \
    --name nexus-ai
  
  FRONTEND_URL=$(vercel ls --json 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(d[0]['url'])" 2>/dev/null || echo "your-app.vercel.app")
  echo "✓ Frontend deployed: https://$FRONTEND_URL"
  cd ..
else
  echo "Vercel CLI not found. Install: npm install -g vercel"
  echo "Manual deploy: vercel.com → Import Project → Set VITE_BACKEND_URL"
  FRONTEND_URL="your-app.vercel.app"
fi

# ── STEP 4: Update CORS ────────────────────────────────────
echo ""
echo "STEP 4: Update backend CORS"
if command -v railway &>/dev/null; then
  cd backend
  railway variables set ALLOWED_ORIGINS="https://$FRONTEND_URL,http://localhost:3000"
  cd ..
fi

# ── Done ──────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║        NEXUS AI — Deployment Complete!              ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "  Frontend : https://$FRONTEND_URL"
echo "  Backend  : $BACKEND_URL"
echo "  Health   : $BACKEND_URL/api/health"
echo "  Provider : $AI_PROVIDER"
echo ""
echo "  Next steps:"
echo "  1. Train your own model: python3 ml/training/train.py guide"
echo "  2. Upload to HF:         huggingface.co/new-model"
echo "  3. Update HF_MODEL_ID in Railway dashboard"
echo ""
