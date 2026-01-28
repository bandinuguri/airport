# 항공기상정보 조회 시스템

전국 15개 공항의 실시간 기상정보를 한눈에 확인할 수 있는 웹 애플리케이션입니다.

## 주요 기능

- 📊 **실시간 기상정보**: 15개 공항의 현재 날씨 및 온도
- 🔮 **예보 전환**: 12시간/3일 예보 토글 기능
- ⚠️ **특보 알림**: 기상청 특보 자동 수집 및 표시
- 📱 **모바일 최적화**: 반응형 디자인으로 모바일 환경 지원
- 🔗 **외부 링크**: 공항별 날씨누리, CCTV 영상 연결

## 기술 스택

### Frontend
- React 19 + TypeScript
- Vite (빌드 도구)
- CSS (반응형 디자인)

### Backend
- Python 3.x
- FastAPI
- Playwright (웹 스크래핑)

## 설치 및 실행

### 1. 저장소 클론

```bash
git clone <repository-url>
cd <repository-name>
```

### 2. Backend 설정

```bash
# Python 가상환경 생성 (선택사항)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# Playwright 브라우저 설치
playwright install chromium

# Backend 서버 실행
python app.py
```

Backend 서버는 `http://localhost:8000`에서 실행됩니다.

### 3. Frontend 설정

```bash
# 프론트엔드 디렉토리로 이동
cd 항공기상정보조회

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

Frontend 서버는 `http://localhost:3000`에서 실행됩니다.

### 4. 환경 변수 설정 (선택사항)

Gemini API를 사용하는 경우 `.env.local` 파일을 생성하고 API 키를 설정하세요:

```
GEMINI_API_KEY=your_api_key_here
```

## 프로젝트 구조

```
.
├── app.py                      # FastAPI 백엔드 서버
├── scraper.py                  # 기상 데이터 스크래핑
├── requirements.txt            # Python 의존성
├── 항공기상정보조회/
│   ├── App.tsx                # 메인 React 컴포넌트
│   ├── components/
│   │   └── WeatherTable.tsx   # 날씨 테이블 컴포넌트
│   ├── services/
│   │   └── apiService.ts      # API 통신
│   ├── styles/
│   │   └── amo.css           # 스타일시트
│   ├── types.ts              # TypeScript 타입 정의
│   └── package.json          # Node.js 의존성
```

## 배포

### Vercel 배포 (Frontend)

1. Vercel 계정 생성 및 로그인
2. GitHub 저장소 연결
3. 프로젝트 루트를 `항공기상정보조회`로 설정
4. 배포 실행

### Backend 배포

Backend는 다음 플랫폼에 배포 가능합니다:
- **Render**: Python 앱 지원
- **Railway**: 간편한 배포
- **AWS EC2**: 완전한 제어

자세한 배포 가이드는 `DEPLOYMENT.md`를 참고하세요.

## 사용 방법

1. 브라우저에서 `http://localhost:3000` 접속
2. 공항 행 클릭 시 날씨누리 상세 페이지 이동
3. 예보 컬럼 헤더 클릭으로 12h/3일 예보 전환
4. 영상 아이콘 클릭으로 공항 CCTV 확인

## 데이터 소스

- [항공기상청](https://amo.kma.go.kr/)
- [기상청 날씨누리](https://www.weather.go.kr/)

## 라이선스

MIT License

## 문의

프로젝트 관련 문의사항은 Issues를 통해 남겨주세요.
