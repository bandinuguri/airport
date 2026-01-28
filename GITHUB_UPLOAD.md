# GitHub 업로드 가이드

이 가이드는 프로젝트를 GitHub에 업로드하는 단계별 방법을 설명합니다.

## 사전 준비

1. **Git 설치 확인**
   ```bash
   git --version
   ```
   설치되지 않았다면 https://git-scm.com/downloads 에서 다운로드

2. **GitHub 계정 생성**
   - https://github.com 에서 계정 생성 (이미 있다면 건너뛰기)

---

## 단계 1: GitHub에서 새 저장소 생성

1. GitHub에 로그인
2. 우측 상단 `+` 버튼 클릭 → `New repository` 선택
3. 저장소 정보 입력:
   - **Repository name**: `aviation-weather-dashboard` (또는 원하는 이름)
   - **Description**: `전국 공항 실시간 기상정보 조회 시스템`
   - **Public/Private**: 담당자만 사용한다면 Private 선택
   - ⚠️ **중요**: `Add a README file`, `.gitignore`, `license` 옵션은 **체크하지 마세요** (이미 파일이 있음)
4. `Create repository` 클릭

---

## 단계 2: 로컬에서 Git 초기화 및 업로드

### PowerShell 또는 명령 프롬프트에서 실행:

```bash
# 1. 프로젝트 디렉토리로 이동
cd C:\Users\BandiDesk\Desktop\0122

# 2. Git 초기화
git init

# 3. 모든 파일 추가
git add .

# 4. 첫 커밋 생성
git commit -m "Initial commit: Aviation Weather Dashboard"

# 5. 기본 브랜치 이름을 main으로 변경
git branch -M main

# 6. GitHub 저장소 연결 (아래 URL을 본인의 저장소 URL로 변경)
git remote add origin https://github.com/YOUR_USERNAME/aviation-weather-dashboard.git

# 7. GitHub에 업로드
git push -u origin main
```

> **주의**: 6번 단계에서 `YOUR_USERNAME`을 본인의 GitHub 사용자명으로 변경하세요!

---

## 단계 3: GitHub 인증

처음 push할 때 인증을 요구할 수 있습니다:

### 방법 1: Personal Access Token (추천)

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. `Generate new token (classic)` 클릭
3. Note: `Aviation Weather Dashboard`
4. Expiration: `90 days` (또는 원하는 기간)
5. Scopes: `repo` 체크
6. `Generate token` 클릭
7. **생성된 토큰을 복사** (다시 볼 수 없으니 안전한 곳에 저장)
8. Git push 시 비밀번호 대신 이 토큰 입력

### 방법 2: GitHub Desktop 사용 (GUI)

1. https://desktop.github.com 에서 GitHub Desktop 다운로드
2. 설치 후 GitHub 계정으로 로그인
3. `File` → `Add Local Repository` → 프로젝트 폴더 선택
4. `Publish repository` 클릭

---

## 단계 4: 업로드 확인

1. GitHub 저장소 페이지 새로고침
2. 모든 파일이 업로드되었는지 확인
3. README.md가 자동으로 표시되는지 확인

---

## 단계 5: 담당자와 공유

### Private 저장소인 경우:

1. 저장소 페이지 → `Settings` → `Collaborators`
2. `Add people` 클릭
3. 담당자의 GitHub 사용자명 또는 이메일 입력
4. 권한 선택 (Read, Write, Admin)
5. 초대 전송

### Public 저장소인 경우:

- 저장소 URL만 공유하면 됨: `https://github.com/YOUR_USERNAME/aviation-weather-dashboard`

---

## 이후 업데이트 방법

코드를 수정한 후 GitHub에 업데이트하려면:

```bash
# 1. 변경사항 확인
git status

# 2. 변경된 파일 추가
git add .

# 3. 커밋 메시지와 함께 저장
git commit -m "설명: 무엇을 변경했는지"

# 4. GitHub에 업로드
git push
```

---

## 문제 해결

### "fatal: remote origin already exists" 오류
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/aviation-weather-dashboard.git
```

### "Permission denied" 오류
- Personal Access Token을 사용하거나 GitHub Desktop 사용

### 특정 파일 제외하고 싶을 때
- `.gitignore` 파일에 파일명 또는 패턴 추가

---

## 다음 단계

업로드 후 배포를 원한다면 `DEPLOYMENT.md` 파일을 참고하세요.
