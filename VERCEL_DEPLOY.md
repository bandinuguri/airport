# 🚀 Vercel 통합 배포 가이드

이 가이드는 **프론트엔드와 백엔드를 Vercel 하나에 통합 배포**하는 방법을 설명합니다.

---

## ⚠️ 중요: Playwright 제한사항

**Vercel Serverless Functions의 제약:**
- ⏱️ **실행 시간 제한**: 무료 플랜 10초, Pro 플랜 60초
- 💾 **메모리 제한**: 최대 1GB
- 🌐 **Playwright 실행**: 브라우저 실행에 시간이 오래 걸려 제한적일 수 있음

**권장 사항:**
- ✅ **소규모 사용**: 무료 플랜으로 시작해보고, 문제가 있으면 Pro 플랜 고려
- ✅ **캐싱 활용**: 프론트엔드에서 캐싱을 적극 활용하여 API 호출 최소화
- ⚠️ **대안**: Playwright가 계속 실패하면 Render나 Railway 같은 별도 백엔드 서비스 사용 고려

---

## 📋 배포 전 체크리스트

- [x] 프로젝트가 로컬에서 정상 작동하는지 확인
- [x] GitHub 저장소에 코드 업로드 완료
- [ ] Vercel 계정 준비

---

## 1단계: GitHub에 코드 업로드

```powershell
cd C:\Users\MOLIT\Desktop\0122
git init
git add .
git commit -m "Initial commit: Integrated deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/aviation-weather-dashboard.git
git push -u origin main
```

---

## 2단계: Vercel 배포

### 2-1. Vercel 계정 생성

1. https://vercel.com 접속
2. `Sign Up` → GitHub 계정으로 로그인

### 2-2. 프로젝트 Import

1. Dashboard → `Add New` → `Project` 클릭
2. GitHub 저장소 선택: `YOUR_USERNAME/aviation-weather-dashboard`
3. `Import` 클릭

### 2-3. 프로젝트 설정

**기본 설정 (자동 감지됨):**
- **Framework Preset**: `Vite` ✅
- **Root Directory**: `.` (프로젝트 루트)
- **Build Command**: `npm install && npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

**환경 변수 (선택사항):**
- `VITE_API_BASE_URL`: 비워두기 (같은 도메인 사용)
- `GEMINI_API_KEY`: 필요시 설정

**Functions 설정:**
- Vercel이 자동으로 `api/` 폴더의 Python 파일을 인식합니다
- Python 런타임은 자동으로 설정됩니다

### 2-4. 배포

1. `Deploy` 클릭
2. 배포 완료까지 3-5분 대기
3. **배포 URL 확인** (예: `https://aviation-weather-dashboard.vercel.app`)

---

## 3단계: 배포 확인

### 3-1. 프론트엔드 확인

1. 브라우저에서 Vercel URL 접속
2. 기상 데이터가 정상적으로 로드되는지 확인

### 3-2. API 엔드포인트 확인

브라우저에서 직접 테스트:
- `https://your-app.vercel.app/api/weather`
- JSON 응답이 나오는지 확인

### 3-3. 문제 해결

**문제: "기상 데이터를 가져오지 못했습니다"**

1. **Vercel Dashboard → Functions 탭 확인**
   - `/api/weather` 함수가 있는지 확인
   - 로그에서 오류 메시지 확인

2. **Playwright 설치 확인**
   - Vercel Functions는 빌드 시 Playwright를 설치해야 합니다
   - `vercel.json`의 `installCommand` 확인

3. **실행 시간 초과**
   - Vercel 무료 플랜은 10초 제한
   - Pro 플랜($20/월)으로 업그레이드 고려
   - 또는 Render/Railway 같은 별도 백엔드 사용

**문제: Playwright 실행 실패**

Vercel Functions에서 Playwright 실행이 실패하는 경우:

1. **대안 1: Render 백엔드 사용**
   - Render에 백엔드만 배포
   - Vercel에 프론트엔드만 배포
   - 환경 변수 `VITE_API_BASE_URL` 설정

2. **대안 2: Railway 사용**
   - Railway는 Playwright 실행에 더 적합
   - `DEPLOY_GUIDE.md` 참고

---

## 📁 프로젝트 구조

```
프로젝트 루트/
├── api/                    # Vercel Serverless Functions
│   ├── weather.py          # GET /api/weather
│   ├── special-reports.py  # GET /api/special-reports
│   └── forecast/
│       └── [icao_code].py  # GET /api/forecast/:icao_code
├── dist/                   # 빌드 출력 (자동 생성)
├── app.py                  # FastAPI 앱 (로컬 개발용)
├── scraper.py              # 스크래퍼 로직
├── vercel.json             # Vercel 설정
└── package.json            # Node.js 의존성
```

---

## 🔄 코드 업데이트 시

코드를 수정한 후:

```powershell
git add .
git commit -m "설명: 무엇을 변경했는지"
git push origin main
```

**자동 재배포:**
- Vercel이 GitHub에 푸시되면 자동으로 재배포합니다
- 배포 상태는 Vercel Dashboard에서 확인 가능

---

## 💰 비용 정보

### Vercel 무료 플랜

**제한사항:**
- ✅ 무료
- ✅ 무제한 빌드
- ✅ 자동 HTTPS
- ⏱️ Functions 실행 시간: **10초 제한**
- 💾 Functions 메모리: 최대 1GB
- ⚠️ Playwright 실행이 느릴 수 있음

### Vercel Pro 플랜 ($20/월)

**장점:**
- ✅ Functions 실행 시간: **60초 제한**
- ✅ 더 많은 대역폭
- ✅ 고급 분석 도구
- ✅ 더 빠른 빌드

---

## 🎯 권장 배포 방법 비교

| 방법 | 장점 | 단점 | 추천 |
|------|------|------|------|
| **Vercel 통합** | 한 곳에서 관리, 간단 | Playwright 제한적 | ⭐ 소규모 사용 |
| **Vercel + Render** | 안정적, Playwright 지원 | 두 곳 관리 필요 | ⭐⭐ **추천** |
| **Railway 전체** | 한 곳 관리, Playwright 지원 | 설정 복잡 | ⭐⭐⭐ 대규모 사용 |

---

## ✅ 완료!

이제 **Vercel URL 하나로 전체 서비스를 사용**할 수 있습니다!

**예시:**
```
전국 공항 실시간 기상정보 조회
https://aviation-weather-dashboard.vercel.app
```

---

## 📞 문제 발생 시

1. **Vercel Dashboard → Functions → Logs** 확인
2. **Vercel Dashboard → Deployments → 해당 배포 → Logs** 확인
3. **GitHub Issues**: 저장소에 이슈 등록

---

## 🔄 대안: Vercel + Render (더 안정적)

Playwright 실행이 계속 실패하는 경우, 백엔드만 Render로 분리하는 것을 권장합니다:

1. Render에 백엔드 배포 (`DEPLOY_GUIDE.md` 참고)
2. Vercel에 프론트엔드만 배포
3. 환경 변수 `VITE_API_BASE_URL` 설정

이 방법이 더 안정적이고 Playwright 실행에 문제가 없습니다.

---

**행운을 빕니다! 🚀**
