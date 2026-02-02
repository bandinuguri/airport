# 🚀 호스팅 배포 가이드

이 문서는 **전국 공항 실시간 기상정보 조회 시스템**을 호스팅 사이트에 배포하는 **단계별 가이드**입니다.

---

## 📋 배포 전 체크리스트

- [x] 프로젝트가 정상 작동하는지 확인 (로컬에서 `npm run dev` 테스트)
- [x] GitHub 저장소에 코드 업로드 완료
- [ ] GitHub 계정 준비
- [ ] Render 계정 준비 (백엔드용)
- [ ] Vercel 계정 준비 (프론트엔드용)

---

## 🎯 추천 배포 방법: Render + Vercel (무료)

**장점:**
- ✅ 무료 티어 제공
- ✅ 설정 간단
- ✅ 자동 배포 (GitHub 연동)
- ✅ HTTPS 자동 적용

**단점:**
- ⚠️ Render 무료 플랜은 15분 비활성 시 슬립 모드 (첫 접속 시 30초 대기)

---

## 1단계: GitHub에 코드 업로드

### 1-1. GitHub 저장소 생성

1. https://github.com 접속 및 로그인
2. 우측 상단 `+` → `New repository` 클릭
3. 저장소 정보 입력:
   - **Repository name**: `aviation-weather-dashboard` (또는 원하는 이름)
   - **Description**: `전국 공항 실시간 기상정보 조회 시스템`
   - **Public/Private**: 선택
   - ⚠️ **중요**: `Add a README file` 등은 **체크하지 마세요**
4. `Create repository` 클릭

### 1-2. 로컬에서 Git 초기화 및 업로드

**PowerShell 또는 명령 프롬프트에서 실행:**

```powershell
# 1. 프로젝트 폴더로 이동
cd C:\Users\MOLIT\Desktop\0122

# 2. Git 초기화
git init

# 3. 모든 파일 추가
git add .

# 4. 첫 커밋 생성
git commit -m "Initial commit: Aviation Weather Dashboard"

# 5. 기본 브랜치를 main으로 변경
git branch -M main

# 6. GitHub 저장소 연결 (YOUR_USERNAME을 본인 GitHub 사용자명으로 변경)
git remote add origin https://github.com/YOUR_USERNAME/aviation-weather-dashboard.git

# 7. GitHub에 업로드
git push -u origin main
```

> **인증 방법**: 
> - GitHub Personal Access Token 사용 (권장)
> - 또는 GitHub Desktop 사용 (GUI 방식)

**Personal Access Token 생성:**
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. `Generate new token (classic)` 클릭
3. Note: `Aviation Weather Dashboard`
4. Scopes: `repo` 체크
5. `Generate token` 클릭 후 **토큰 복사** (다시 볼 수 없음!)
6. Git push 시 비밀번호 대신 이 토큰 입력

---

## 2단계: 백엔드 배포 (Render)

### 2-1. Render 계정 생성

1. https://render.com 접속
2. `Get Started for Free` 클릭
3. GitHub 계정으로 로그인 (권장)

### 2-2. 새 Web Service 생성

1. Dashboard → `New` → `Web Service` 클릭
2. **GitHub 저장소 연결**:
   - `Connect account` 클릭 (처음인 경우)
   - 저장소 선택: `YOUR_USERNAME/aviation-weather-dashboard`
   - `Connect` 클릭
3. **서비스 설정 입력**:
   - **Name**: `aviation-weather-api`
   - **Region**: `Singapore` (한국에서 가장 가까움)
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
   - **Instance Type**: `Free` 선택
4. `Create Web Service` 클릭
5. 배포 시작 (5-10분 소요)

### 2-3. 백엔드 URL 확인

배포 완료 후:
1. Render Dashboard에서 서비스 클릭
2. 상단에 표시된 **URL 복사** (예: `https://aviation-weather-api.onrender.com`)
3. 이 URL을 메모해두세요! (다음 단계에서 사용)

---

## 3단계: 프론트엔드 배포 (Vercel)

### 3-1. 환경 변수 설정 파일 생성

프로젝트 루트에 `.env.production` 파일 생성 (또는 Vercel 대시보드에서 설정):

```env
VITE_API_BASE_URL=https://aviation-weather-api.onrender.com
```

> **주의**: `https://` 포함하여 전체 URL 입력

### 3-2. 코드에 환경 변수 반영 (선택사항)

`.env.production` 파일을 Git에 추가하려면:

```powershell
git add .env.production
git commit -m "Add production environment variables"
git push
```

> **보안**: `.env.production`에 민감한 정보가 있다면 `.gitignore`에 추가하지 마세요.  
> 대신 Vercel 대시보드에서 직접 설정하는 것을 권장합니다.

### 3-3. Vercel 계정 생성 및 배포

1. https://vercel.com 접속
2. `Sign Up` → GitHub 계정으로 로그인
3. `Add New` → `Project` 클릭
4. **GitHub 저장소 Import**:
   - `Import Git Repository` 클릭
   - `YOUR_USERNAME/aviation-weather-dashboard` 선택
   - `Import` 클릭
5. **프로젝트 설정**:
   - **Framework Preset**: `Vite` (자동 감지됨)
   - **Root Directory**: `.` (프로젝트 루트)
   - **Build Command**: `npm run build` (자동 감지됨)
   - **Output Directory**: `dist` (자동 감지됨)
   - **Install Command**: `npm install` (자동 감지됨)
6. **Environment Variables 추가**:
   - `Add` 버튼 클릭
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://aviation-weather-api.onrender.com` (2단계에서 복사한 백엔드 URL)
   - **Environment**: `Production`, `Preview`, `Development` 모두 선택
   - `Save` 클릭
7. `Deploy` 클릭
8. 배포 완료까지 2-3분 대기

### 3-4. 프론트엔드 URL 확인

배포 완료 후:
1. Vercel Dashboard에서 프로젝트 클릭
2. 상단에 표시된 **URL 복사** (예: `https://aviation-weather-dashboard.vercel.app`)
3. 이 URL이 **최종 서비스 URL**입니다! 🎉

---

## 4단계: CORS 설정 (필요시)

프론트엔드와 백엔드가 다른 도메인에서 실행되므로, 백엔드에서 CORS를 허용해야 합니다.

### Render에서 환경 변수 추가

1. Render Dashboard → `aviation-weather-api` 서비스 클릭
2. `Environment` 탭 클릭
3. `Add Environment Variable` 클릭:
   - **Key**: `FRONTEND_URL`
   - **Value**: `https://your-frontend.vercel.app` (Vercel에서 받은 URL)
   - `Save` 클릭
4. 서비스 재시작 (자동 재배포)

### app.py 수정 (선택사항)

더 엄격한 CORS 설정이 필요하다면 `app.py` 수정:

```python
# app.py 상단에 추가
FRONTEND_URL = os.getenv("FRONTEND_URL", "*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL] if FRONTEND_URL != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

변경 후 GitHub에 커밋 및 푸시하면 Render가 자동 재배포합니다.

---

## 5단계: 배포 확인 및 테스트

### 5-1. 프론트엔드 접속 테스트

1. 브라우저에서 Vercel URL 접속
2. 기상 데이터가 정상적으로 로드되는지 확인
3. 개발자 도구 (F12) → Network 탭에서 `/api/weather` 요청이 성공하는지 확인

### 5-2. 문제 해결

**문제: "기상 데이터를 가져오지 못했습니다"**
- ✅ Render Dashboard → Logs 탭에서 백엔드 로그 확인
- ✅ Vercel Dashboard → Deployments → 해당 배포 → Logs 확인
- ✅ 환경 변수 `VITE_API_BASE_URL`이 올바르게 설정되었는지 확인

**문제: CORS 오류**
- ✅ `app.py`의 CORS 설정 확인
- ✅ Render 환경 변수 `FRONTEND_URL` 설정 확인

**문제: Playwright 설치 실패**
- ✅ Render 로그에서 오류 메시지 확인
- ✅ Build Command에 `playwright install-deps` 포함 확인

---

## 📝 배포 후 관리

### 코드 업데이트 시

코드를 수정한 후:

```powershell
git add .
git commit -m "설명: 무엇을 변경했는지"
git push origin main
```

**자동 배포:**
- Render와 Vercel 모두 GitHub에 푸시하면 자동으로 재배포됩니다.
- 배포 상태는 각 대시보드에서 확인 가능합니다.

### 로그 확인

- **백엔드 로그**: Render Dashboard → 서비스 → Logs 탭
- **프론트엔드 로그**: Vercel Dashboard → 프로젝트 → Deployments → 해당 배포 → Logs

### 서비스 중지/재시작

- **Render**: Dashboard → 서비스 → `Manual Deploy` → `Clear build cache & deploy`
- **Vercel**: Dashboard → 프로젝트 → Settings → `Delete Project` (필요시)

---

## 💰 비용 정보

### 무료 플랜 제한

**Render (Free):**
- ✅ 무료
- ⚠️ 15분 비활성 시 슬립 모드 (첫 접속 시 30초 대기)
- ⚠️ 월 750시간 제한

**Vercel (Free):**
- ✅ 무료
- ✅ 무제한 빌드
- ✅ 자동 HTTPS
- ⚠️ 대역폭 제한 (100GB/월)

### 유료 플랜 (필요시)

**Render ($7/월):**
- ✅ 슬립 모드 없음
- ✅ 더 빠른 응답 속도

**Vercel Pro ($20/월):**
- ✅ 더 많은 대역폭
- ✅ 고급 분석 도구

---

## 🔄 대안: Railway (풀스택 한 곳에서)

Railway는 프론트엔드와 백엔드를 한 곳에서 관리할 수 있습니다.

### Railway 배포 방법

1. https://railway.app 접속 및 GitHub 로그인
2. `New Project` → `Deploy from GitHub repo` 클릭
3. 저장소 선택
4. **백엔드 서비스 자동 생성**:
   - Railway가 `app.py`를 감지하여 Python 서비스 생성
   - Build Command: 자동 감지
   - Start Command: 자동 감지
5. **프론트엔드 서비스 추가**:
   - `+ New` → `GitHub Repo` 클릭
   - 같은 저장소 선택
   - Root Directory: `.` (프로젝트 루트)
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run preview`
6. 환경 변수 설정:
   - 백엔드: `PORT` (자동 설정됨)
   - 프론트엔드: `VITE_API_BASE_URL` = 백엔드 URL
7. 배포 완료!

**Railway 장점:**
- ✅ 한 곳에서 관리
- ✅ 무료 플랜이 더 관대함 ($5 크레딧/월)
- ✅ 슬립 모드 없음

---

## ✅ 완료!

이제 **Vercel URL**을 공유하면 누구나 사용할 수 있습니다!

**예시:**
```
전국 공항 실시간 기상정보 조회
https://aviation-weather-dashboard.vercel.app
```

---

## 📞 문제 발생 시

1. **Render 로그 확인**: Dashboard → 서비스 → Logs
2. **Vercel 로그 확인**: Dashboard → 프로젝트 → Deployments → Logs
3. **GitHub Issues**: 저장소에 이슈 등록
4. **문서 참고**: `DEPLOYMENT.md`, `DEPLOY_SIMPLE.md`

---

**행운을 빕니다! 🚀**
