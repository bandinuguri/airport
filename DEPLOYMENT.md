# 배포 가이드

이 문서는 항공기상정보 조회 시스템을 프로덕션 환경에 배포하는 방법을 설명합니다.

## 배포 옵션

### 옵션 1: Vercel (Frontend) + Render (Backend)

**장점**: 무료 티어 사용 가능, 설정 간단

#### Frontend (Vercel)

1. **Vercel 계정 생성**
   - https://vercel.com 접속 및 GitHub 연동

2. **프로젝트 Import**
   ```bash
   # Vercel CLI 설치 (선택사항)
   npm i -g vercel
   
   # 프론트엔드 디렉토리에서 실행
   cd 항공기상정보조회
   vercel
   ```

3. **설정**
   - Root Directory: `항공기상정보조회`
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **환경 변수 설정**
   - Vercel 대시보드에서 Environment Variables 추가
   - `GEMINI_API_KEY`: (필요시)

#### Backend (Render)

1. **Render 계정 생성**
   - https://render.com 접속 및 GitHub 연동

2. **New Web Service 생성**
   - Repository 선택
   - Name: `aviation-weather-api`
   - Environment: Python 3
   - Build Command: `pip install -r requirements.txt && playwright install chromium`
   - Start Command: `uvicorn app:app --host 0.0.0.0 --port $PORT`

3. **환경 변수 설정**
   - `PYTHON_VERSION`: `3.11`

4. **Frontend에서 Backend URL 업데이트**
   - `vite.config.ts`에서 proxy target을 Render URL로 변경
   ```typescript
   proxy: {
     '/api': {
       target: 'https://your-app.onrender.com',
       changeOrigin: true,
     },
   }
   ```

---

### 옵션 2: Railway (Full Stack)

**장점**: Frontend와 Backend를 한 곳에서 관리

1. **Railway 계정 생성**
   - https://railway.app 접속

2. **New Project 생성**
   - GitHub 저장소 연결

3. **Backend Service 설정**
   - Root Directory: `/`
   - Start Command: `python app.py`
   - Port: 8000

4. **Frontend Service 설정**
   - Root Directory: `항공기상정보조회`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run preview`
   - Port: 3000

---

### 옵션 3: Docker (자체 서버)

#### Dockerfile 생성

**Backend Dockerfile** (`Dockerfile.backend`):
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install chromium
RUN playwright install-deps

COPY app.py scraper.py ./

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Frontend Dockerfile** (`항공기상정보조회/Dockerfile`):
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "preview"]
```

#### Docker Compose

`docker-compose.yml`:
```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8000:8000"
    restart: unless-stopped

  frontend:
    build:
      context: ./항공기상정보조회
    ports:
      - "3000:3000"
    depends_on:
      - backend
    restart: unless-stopped
```

실행:
```bash
docker-compose up -d
```

---

## GitHub Actions CI/CD

`.github/workflows/deploy.yml`:
```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./항공기상정보조회
```

---

## 프로덕션 체크리스트

- [ ] 환경 변수 설정 확인
- [ ] CORS 설정 확인 (프로덕션 도메인)
- [ ] API 엔드포인트 URL 업데이트
- [ ] 에러 로깅 설정
- [ ] 성능 모니터링 설정
- [ ] HTTPS 적용 확인
- [ ] 캐싱 전략 검토

---

## 모니터링

### 추천 도구
- **Frontend**: Vercel Analytics
- **Backend**: Sentry (에러 추적)
- **Uptime**: UptimeRobot

---

## 문제 해결

### Playwright 설치 오류
```bash
# 시스템 의존성 설치
playwright install-deps
```

### CORS 오류
`app.py`에서 프로덕션 도메인 추가:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-domain.com"],
    ...
)
```

### 빌드 오류
- Node.js 버전 확인: 18 이상
- Python 버전 확인: 3.10 이상
