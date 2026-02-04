# 🚀 Vercel 배포 가이드 (Node API + Supabase + GitHub Actions)

이 프로젝트는 **Vercel(프론트+Node API)** + **Supabase(DB)** + **GitHub Actions(스크래퍼)** 로 구성됩니다.  
Playwright는 Vercel에서 실행하지 않고, GitHub Actions에서 주기적으로 스크래핑 후 Supabase에 저장합니다.

---

## 📋 배포 전 체크리스트

1. [ ] Supabase 프로젝트 생성 및 `supabase/schema.sql` 실행
2. [ ] GitHub Secrets에 `DATABASE_URL` 설정 (스크래퍼용)
3. [ ] Vercel 환경 변수에 Supabase 설정
4. [ ] GitHub에 코드 푸시 후 Vercel 자동 배포

---

## 1. Supabase 설정

1. https://supabase.com 에서 프로젝트 생성
2. **SQL Editor**에서 `supabase/schema.sql` 내용 붙여넣기 후 실행
3. **Settings → API**에서 확인:
   - `Project URL` → Vercel 환경 변수 `SUPABASE_URL`
   - `anon` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (히스토리 저장 등에 권장)

**스크래퍼용 DB 연결 문자열 (GitHub Secrets용):**  
**Settings → Database → Connection string**에서 **URI** 복사 후,  
`postgres://` 를 `postgresql://` 로 바꾼 값을 `DATABASE_URL`로 사용.

---

## 2. GitHub 설정

1. 저장소 **Settings → Secrets and variables → Actions**
2. **New repository secret** 추가:
   - Name: `DATABASE_URL`
   - Value: Supabase Connection string (위에서 복사한 `postgresql://...`)

푸시 후 **Actions** 탭에서 `scrape.yml` 워크플로가 주기적으로 실행되며 Supabase에 데이터를 채웁니다.

---

## 3. Vercel 배포

### 3-1. 프로젝트 Import

1. https://vercel.com → **Add New** → **Project**
2. GitHub 저장소 선택 후 **Import**

### 3-2. 환경 변수

**Settings → Environment Variables**에 추가:

| 이름 | 값 | 비고 |
|------|-----|------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` | Supabase Project URL |
| `SUPABASE_ANON_KEY` | (anon key) | 공개용 |
| `SUPABASE_SERVICE_ROLE_KEY` | (service_role key) | 히스토리 저장/삭제 권장 |

(선택) `GEMINI_API_KEY` – AI 기능 사용 시

### 3-3. 빌드 설정

- **Framework**: Vite (자동 감지)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

`api/` 폴더의 Node.js 파일은 자동으로 Serverless Functions로 배포됩니다.

### 3-4. Deploy

**Deploy** 클릭 후 완료되면 배포 URL에서 앱 확인.

---

## 4. API 엔드포인트 (Vercel)

| 경로 | 메서드 | 설명 |
|------|--------|------|
| `/api/weather` | GET | 최신 기상 데이터 (Supabase `weather_latest`) |
| `/api/special-reports` | GET | 최신 특보 |
| `/api/forecast/[icao]` | GET | 상세 예보 (현재 빈 배열 – 스크래퍼 미수집) |
| `/api/history/save` | POST | 스냅샷 저장 |
| `/api/history/snapshots` | GET | 스냅샷 목록 |
| `/api/history/snapshot/[id]` | GET | 스냅샷 상세 |
| `/api/history/airport/[code]` | GET | 공항별 히스토리 |

---

## 5. 프로젝트 구조

```
├── api/                        # Vercel Serverless (Node.js)
│   ├── weather.js
│   ├── special-reports.js
│   ├── forecast/[icao].js
│   └── history/
│       ├── save.js
│       ├── snapshots.js
│       ├── snapshot/[snapshot_id].js
│       └── airport/[airport_code].js
├── supabase/schema.sql         # Supabase 테이블 정의
├── scripts/run_scraper_to_db.py  # 스크래퍼 → Supabase 저장
├── .github/workflows/scrape.yml  # 주기 스크래핑 (cron)
├── vercel.json
└── package.json
```

---

## 6. 코드 수정 후 재배포

```powershell
git add .
git commit -m "변경 내용"
git push origin main
```

Vercel이 자동으로 재배포합니다.

---

## 7. 문제 해결

- **데이터가 비어 있음**  
  GitHub Actions에서 스크래퍼가 한 번이라도 성공했는지 확인. Supabase **Table Editor**에서 `weather_latest` 행이 있는지 확인.

- **API 500**  
  Vercel **Functions → Logs**에서 에러 확인. `SUPABASE_URL`, `SUPABASE_ANON_KEY`(또는 `SUPABASE_SERVICE_ROLE_KEY`) 설정 여부 확인.

- **히스토리 저장 실패**  
  `SUPABASE_SERVICE_ROLE_KEY` 사용 권장 (RLS 우회).

---

**배포 완료 후 Vercel URL로 접속해 동작을 확인하면 됩니다.**
