# 간편 배포 가이드 (URL로 바로 사용)

## 목표
담당자에게 URL만 공유하면 바로 사용 가능하도록 배포

---

## 1단계: 백엔드 배포 (Render - 무료)

### 1-1. Render 계정 생성
1. https://render.com 접속
2. GitHub 계정으로 로그인

### 1-2. 새 Web Service 생성
1. Dashboard → `New` → `Web Service`
2. GitHub 저장소 연결: `bandinuguri/weather` 선택
3. 설정 입력:
   - **Name**: `aviation-weather-api`
   - **Region**: `Singapore` (가장 가까운 지역)
   - **Branch**: `main`
   - **Root Directory**: (비워두기)
   - **Runtime**: `Python 3`
   - **Build Command**:
     ```
     pip install -r requirements.txt && playwright install chromium && playwright install-deps
     ```
   - **Start Command**:
     ```
     uvicorn app:app --host 0.0.0.0 --port $PORT
     ```
   - **Instance Type**: `Free`

4. `Create Web Service` 클릭
5. 배포 완료까지 5-10분 대기
6. **백엔드 URL 복사** (예: `https://aviation-weather-api.onrender.com`)

---

## 2단계: 프론트엔드 배포 (Vercel - 무료)

### 2-1. 프론트엔드 설정 업데이트

먼저 백엔드 URL을 프론트엔드에 설정해야 합니다.

`항공기상정보조회/vite.config.ts` 파일 수정:

```typescript
proxy: {
  '/api': {
    target: 'https://aviation-weather-api.onrender.com',  // 1단계에서 복사한 URL
    changeOrigin: true,
  },
}
```

변경 후 GitHub에 커밋:
```bash
git add .
git commit -m "Update API endpoint for production"
git push origin main
```

### 2-2. Vercel 배포

1. https://vercel.com 접속
2. GitHub 계정으로 로그인
3. `Add New` → `Project`
4. GitHub 저장소 Import: `bandinuguri/weather`
5. 설정:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `항공기상정보조회`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. `Deploy` 클릭
7. 배포 완료까지 2-3분 대기
8. **프론트엔드 URL 복사** (예: `https://weather-xxx.vercel.app`)

---

## 3단계: 완료!

이제 담당자에게 **프론트엔드 URL만 공유**하면 됩니다!

예: `https://weather-xxx.vercel.app`

---

## 주의사항

### Render 무료 플랜 제한
- 15분 동안 요청이 없으면 서버가 슬립 모드로 전환
- 첫 접속 시 30초 정도 로딩 시간 발생
- 이후 정상 속도로 작동

### 해결 방법
- 유료 플랜 사용 ($7/월)
- 또는 Railway 사용 (무료 플랜이 더 관대함)

---

## Railway 대안 (추천)

Railway는 무료 플랜이 더 좋습니다:

1. https://railway.app 접속
2. GitHub 연결
3. `New Project` → `Deploy from GitHub repo`
4. `bandinuguri/weather` 선택
5. 자동으로 감지하고 배포
6. 환경 변수 설정 필요 없음
7. URL 복사 후 사용

---

## 문제 발생 시

1. **백엔드 로그 확인**: Render Dashboard → Logs
2. **프론트엔드 빌드 로그**: Vercel Dashboard → Deployments → 해당 배포 클릭
3. **CORS 오류**: `app.py`에서 프론트엔드 URL을 `allow_origins`에 추가

---

제가 직접 배포는 할 수 없지만, 위 단계를 따라하시면 10분 안에 완료됩니다!
