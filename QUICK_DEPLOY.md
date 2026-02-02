# ⚡ 빠른 배포 가이드 (5분 요약)

## 🎯 목표
GitHub → Render(백엔드) → Vercel(프론트엔드) 순서로 배포

---

## 1️⃣ GitHub 업로드 (2분)

```powershell
cd C:\Users\MOLIT\Desktop\0122
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/aviation-weather-dashboard.git
git push -u origin main
```

> **인증**: GitHub Personal Access Token 사용 (Settings → Developer settings → Personal access tokens)

---

## 2️⃣ Render 백엔드 배포 (2분)

1. https://render.com → GitHub 로그인
2. `New` → `Web Service`
3. 저장소 선택 → 설정:
   - **Name**: `aviation-weather-api`
   - **Build Command**: `pip install -r requirements.txt && playwright install chromium && playwright install-deps`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
   - **Instance**: `Free`
4. `Create` → **URL 복사** (예: `https://aviation-weather-api.onrender.com`)

---

## 3️⃣ Vercel 프론트엔드 배포 (1분)

1. https://vercel.com → GitHub 로그인
2. `Add New` → `Project` → 저장소 Import
3. **Environment Variables 추가**:
   - `VITE_API_BASE_URL` = `https://aviation-weather-api.onrender.com` (2단계에서 복사한 URL)
4. `Deploy` → **완료!** 🎉

---

## ✅ 완료!

이제 Vercel에서 받은 URL로 접속하면 됩니다!

**자세한 설명**: `DEPLOY_GUIDE.md` 참고
