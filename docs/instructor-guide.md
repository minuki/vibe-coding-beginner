# 강사·IT 담당자 준비 안내

참가자 안내는 루트의 [README](../README.md)를 사용합니다. 이 문서는 교육 담당자의 사전 준비와 장애 대응용입니다.

## 1. 교육 전 체크리스트

- GitHub 저장소를 만들고 이 프로젝트를 push한 뒤 저장소를 Template repository로 설정합니다. 현재 파일 폴더를 작성했다고 GitHub 저장소가 생성되는 것은 아닙니다.
- 참가자 계정의 GitHub Copilot App 사용 가능 여부, 회사 정책, 로컬 파일·명령 실행 권한을 확인합니다.
- 참가자 PC에 Git, GitHub Copilot App, Docker Desktop을 준비합니다. Windows에서는 WSL 2와 가상화가 필요하며 관리자 승인·재부팅이 필요할 수 있습니다.
- 참가자별 템플릿 저장소 생성·로컬 프로젝트 추가를 사전 확인합니다. UI 명칭은 앱 버전에 맞춰 교육 현장에서 안내합니다.
- 기본 포트 8080과 5432 사용 여부, Docker 이미지 다운로드 및 GitHub·Azure 접속이 가능한지 확인합니다.
- 참가자가 세션을 병렬로 실행하지 않도록 안내합니다. 여러 worktree에서 Compose를 시작하면 같은 호스트 포트와 충돌할 수 있습니다.
- 개인 저장소별 CI를 시험하고, 리뷰어와 main 보호 규칙을 준비합니다.
- 배포 실습을 진행할 저장소별로 Azure 자격 증명과 변수를 준비합니다. GitHub 템플릿으로 Secrets, Variables, Environment, 브랜치 보호 규칙이 복사되지는 않습니다.
- 가상 데이터만 사용하고 비용·교육 종료 후 정리 책임자를 지정합니다.

참가자가 직접 수행해야 하는 로그인, 설치 약관·라이선스 확인, 관리자 권한 승인 등은 Copilot에 우회시키지 않습니다.

## 2. 실습 범위와 확장 과제

기본 제공 **서비스**는 인증, 멘토 조회, 신청·조회, 운영자 수락/거절, Knowledge 검색입니다. 참가자의 `app/web`은 시작 문구만 있는 화면입니다. 로그인·목록·신청·검색 등 **UI는 참가자가 하나씩 만듭니다.** 기존 완성본은 `examples/mentoring-portal`에 보관하며 기본 화면에 복사하지 않습니다.

**자유 프로필 편집·세션 일정·액션 아이템·자동 매칭·캘린더 연동은 API도 아직 없으며 확장 과제**입니다.

진행 예시: 준비·빈 화면 열기 → 원하는 첫 화면 생성 → 로그인 연결 → 멘토 목록 → 신청 저장 → Knowledge → 운영자 UI → 직접 확인 → PR·상호 리뷰 → 병합·ACA 확인. 한 단계가 끝날 때마다 브라우저에서 변화를 확인하게 합니다. AI가 먼저 모든 화면을 완성하거나 예제를 복사해 주지 않도록 안내합니다.

## 3. 저장소와 로컬 실행 구조

```text
app/web/                       참가자가 처음부터 만드는 HTML·CSS·JavaScript
examples/mentoring-portal/      기존 완성본 참고 예제 (기본 앱과 분리)
app/api/                       PostgreSQL 연동 업무 API
mocks/auth/                    고정 데모 계정·토큰 인증
mocks/knowledge/               가이드 샘플 검색
mocks/database/                PostgreSQL 이미지·초기 데이터
scripts/smoke-test.mjs          HTTP 통합 테스트
scripts/dev-server.mjs          개발 전용 정적 파일·API 프록시 서버
scripts/live-reload.js          변경 감지·자동 새로 고침
scripts/dev-server.test.mjs     미리보기 서버·브라우저 갱신 로직 테스트
docker-compose.dev.yml         개발용 미리보기·파일 마운트 설정
infra/aca/main.bicep            ACA 멀티 컨테이너 앱
.github/copilot-instructions.md 참가자 지원용 저장소 지침
.github/workflows/ci.yml        PR 검증
.github/workflows/deploy-aca.yml main push 또는 수동 데모 배포
```

개발 중에는 브라우저 → Node.js 미리보기 서버 → 인증/API/Knowledge로 요청합니다. 배포 이미지와 CI에서는 Nginx가 같은 경로를 프록시합니다. 로컬 컨테이너 간에는 Compose 서비스 이름, ACA의 동일 앱 컨테이너 간에는 localhost를 사용합니다. PostgreSQL은 목업 업무 데이터를 저장하는 실제 DB 엔진입니다.

| 경로 | 용도 |
|---|---|
| `http://localhost:8080` | 웹앱 |
| `/auth/healthz` | 인증 상태 |
| `/api/healthz` | API와 DB 연결 상태 |
| `/knowledge/healthz` | Knowledge 상태 |
| `/auth/login`, `/auth/verify` | 로그인·토큰 검증 |
| `/api/mentors` | 인증된 멘토 조회 |
| `/api/applications` | 권한별 신청 조회·멘티 신청 생성 |
| `/api/applications/{id}/status` | 운영자 수락/거절 |
| `/knowledge/search?q=첫%20대화` | 가이드 검색 |

### 참가자 UI가 연결할 API 계약

브라우저에서는 아래의 **상대 경로**를 사용합니다. Compose 내부 서비스 주소나 DB 비밀번호를 브라우저 코드에 넣지 않습니다. 요청과 응답은 JSON입니다. 로그인 성공 시 받은 토큰은 API 요청의 `Authorization: Bearer <token>` 헤더에 전달합니다. POST/PATCH에는 `Content-Type: application/json`이 필요합니다.

| 메서드·경로 | 요청 | 응답 |
|---|---|---|
| `POST /auth/login` | `{ "email": "mentee@demo.local", "password": "demo123" }` | `{ "token": "...", "user": { "id", "email", "name", "role" } }` |
| `GET /auth/verify` | 토큰 헤더 | `{ "id", "email", "name", "role" }` |
| `GET /api/mentors` | 토큰 헤더 | `{ "mentors": [{ "id", "name", "title", "topics": [], "bio" }] }` |
| `POST /api/applications` | `{ "mentorId": "mentor-01", "goal": "가상 실습 목표" }` | 201, `{ "application": { "id", "mentorId", "menteeId", "goal", "status", "createdAt" } }` |
| `GET /api/applications` | 토큰 헤더 | `{ "applications": [{ "id", "mentorId", "mentorName", "menteeId", "goal", "status", "createdAt" }] }` |
| `PATCH /api/applications/{id}/status` | `{ "status": "accepted" }` 또는 `{ "status": "declined" }` | `{ "application": { "id", "status" } }` |
| `GET /knowledge/search?q=...` | URL 인코딩한 검색어, 인증 불필요 | `{ "results": [{ "id", "title", "category", "content" }] }` |

위 응답 열은 필드 구조를 간략 표기한 것이며 그대로 복사할 JSON 값은 아닙니다. 오류 응답은 `{ "error": "설명" }`입니다. 역할은 `mentee`, `mentor`, `admin`, 상태는 `submitted`, `accepted`, `declined`입니다. PostgreSQL BIGSERIAL 신청 ID는 문자열로 반환될 수 있으므로 임의 숫자 연산 대신 그대로 사용합니다.

신청 생성은 멘티만, 상태 변경은 운영자만 가능합니다. 운영자는 전체 신청, 멘티는 본인 신청, 멘토는 본인에게 들어온 신청을 조회합니다. 로그인한 멘토 계정 `mentor-01`은 같은 ID의 샘플 멘토에 대응합니다. 목표는 공백이 아니고 1,000자 이내여야 합니다. Knowledge 결과에는 별도 링크 필드가 없으므로 제목·문서 ID·분류를 출처로 표시하고 존재하지 않는 URL을 만들지 않습니다.

### Copilot이 실행할 수동 명령 참고

참가자가 직접 입력할 필요는 없습니다. 아래는 저장소 루트 기준 PowerShell 예시입니다.

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build --detach --wait
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps
```

**개발용 UI에는 재빌드가 필요 없습니다.** `app/web`을 읽기 전용 bind mount하고 개발 서버가 HTML에 자동 갱신 스크립트를 주입합니다. 파일 내용을 폴링하므로 Docker Desktop에서도 파일 감지에 의존하지 않습니다. 변경이 두 번 연속 동일하게 관찰되면 새로 고침합니다. 일반적으로 마지막 저장 후 2~3초 내 반영되며 대규모 파일이나 연속 편집에서는 더 걸릴 수 있습니다.

미리보기 상태 표시는 연결 상태만 의미하며 앱 기능 성공을 보장하지 않습니다. 전체 페이지가 새로 고침되므로 입력 중인 양식과 메모리 상태가 초기화될 수 있습니다. 입력을 보존하는 HMR은 아닙니다. 변경이 보이지 않으면 소스 폴더와 mount, 개발용 Compose 파일, 브라우저 콘솔을 확인합니다.

미리보기 서버 자체 또는 업무 API 수정 시에만 해당 서비스를 다시 빌드합니다.

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build --detach --wait web
```

완성본 참고가 필요할 때만 별도 포트에서 실행합니다. 참가자 파일을 덮어쓰지 않으며 **같은 DB를 사용**하므로 예제에서 신청한 내용도 함께 보입니다.

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile reference up --build --detach --wait
```

참가자 화면은 `http://localhost:8080`, 참고 예제는 `http://localhost:8081`입니다. 기본 실행에는 `reference` 프로필을 사용하지 않습니다.

호스트에 Node.js가 없어도 API 컨테이너의 Node.js로 테스트를 실행할 수 있습니다.

```powershell
Get-Content -Raw scripts\smoke-test.mjs |
  docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T -e BASE_URL=http://web api node --input-type=module
```

테스트는 가상 멘티로 신청을 만들고 운영자로 수락하므로 데모 DB에 기록을 추가합니다. **API 통합 테스트일 뿐 UI 완성을 검증하지 않으므로**, 참가자 화면에서 단계별 수동 확인도 필요합니다. 강사는 교육 전 전체 Compose 빌드·테스트를 확인해야 합니다.

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail 100
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile reference down
```

위 종료 명령은 DB 볼륨을 보존합니다. **아래 명령은 참가자의 명시적인 데이터 삭제 승인 후에만 실행**합니다.

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile reference down --volumes
```

Docker 명령이 설치 직후 인식되지 않으면 앱/터미널을 다시 시작하거나 설치 경로를 확인합니다. 특정 포트가 사용 중이면 다른 프로젝트를 중지하지 말고 이 프로젝트의 호스트 포트를 조정합니다. `.env`와 비밀값은 커밋하지 않습니다.

## 4. GitHub 리뷰와 CI

PR은 `CI` 워크플로에서 개발·배포 Compose 설정, JavaScript 문법, 자동 갱신 로직, 컨테이너 빌드·기동, 로그인·조회·저장·운영자 검토·Knowledge 검색을 확인합니다. CI는 개발용 파일 mount 없이 `docker-compose.yml`만 사용해 Nginx 배포 이미지를 확인합니다. ACA에도 미리보기 서버나 참고 예제가 아닌 **현재 app/web**이 배포됩니다.

개발용과 배포용 화면을 비교할 때는 먼저 개발 구성을 종료하고 데이터는 보존한 뒤 `docker compose up --build --detach --wait`로 배포 이미지를 실행합니다. 확인 후 개발용 Compose 두 파일로 다시 실행합니다. 배포 이미지에서는 파일 저장만으로 바뀌지 않으며 재빌드가 필요합니다.

개인 저장소의 main 보호 규칙 또는 ruleset에서 다음을 구성합니다.

- main에 직접 push하지 않고 PR로 병합하도록 설정
- 다른 사람의 승인 최소 1명 필수, 리뷰어 지정
- `compose-smoke-test` 상태 검사 통과 필수 (첫 CI 실행 후 표시되는 실제 검사 이름 선택)
- 필요하면 최신 커밋에 대한 재승인과 보호 규칙 우회 제한 설정

**승인만으로 배포되지는 않습니다. main 병합 후 CD가 실행됩니다.** 현재 배포 워크플로 자체가 PR 승인을 강제하지는 않으므로 보호 규칙이 필수입니다. 첫 main push나 수동 실행도 배포를 트리거할 수 있으므로 Azure 설정 완료 전 실행하지 않도록 안내합니다. CI와 CD는 별도 워크플로이며 main push 시 병렬로 실행될 수 있습니다. 병합 전 PR CI 검증을 반드시 적용하세요.

## 5. ACA 배포 사전 준비

배포 워크플로는 OIDC로 Azure에 로그인하고 웹앱·인증·API·Knowledge·DB 이미지를 ACR에 빌드한 뒤 기존 ACA Environment에 앱을 생성/업데이트합니다. 리소스가 자동으로 모두 준비된 상태는 아닙니다.

1. 교육용 Resource Group, Azure Container Registry(ACR), ACA Environment를 준비합니다.
2. GitHub Actions OIDC용 Entra 애플리케이션/서비스 주체를 만들고 GitHub Environment `workshop-demo`를 대상으로 federated credential을 설정합니다. subject는 `repo:OWNER/REPOSITORY:environment:workshop-demo`입니다.
3. 배포 주체에 교육용 Resource Group의 `Contributor`를 부여하고 ACR 빌드 작업에 필요한 권한을 확인합니다. ACR 권한 모드와 조직 정책에 따라 필요한 권한이 달라질 수 있습니다. 이미지 push 권한만으로 ACR Tasks 실행까지 보장되지는 않으므로 `az acr build`를 사전 검증하세요.
4. ACA가 이미지를 pull할 User Assigned Managed Identity를 준비하고, ACR 권한 모드에 맞는 이미지 pull 권한을 부여합니다.
5. GitHub 저장소에서 `workshop-demo` Environment를 만들고 deployment branches를 main으로 제한합니다. 필요하면 별도 배포 승인자를 지정합니다.
6. 아래 Actions 변수를 등록하고 데모 배포를 시험합니다. 리소스 이름은 참가자별로 구분합니다.

Repository **Settings → Secrets and variables → Actions**:

| 이름 | 종류 | 값 |
|---|---|---|
| `AZURE_CLIENT_ID` | Variable | OIDC 클라이언트 ID |
| `AZURE_TENANT_ID` | Variable | Entra 테넌트 ID |
| `AZURE_SUBSCRIPTION_ID` | Variable | 교육용 Azure 구독 ID |
| `AZURE_RESOURCE_GROUP` | Variable | 기존 Resource Group |
| `ACA_ENVIRONMENT_ID` | Variable | 기존 ACA Environment 전체 리소스 ID |
| `ACA_NAME` | Variable | 참가자별 ACA 앱 이름 |
| `ACR_NAME` | Variable | ACR 이름, 로그인 서버 주소가 아님 |
| `ACA_PULL_IDENTITY_ID` | Variable | 이미지 pull용 Identity 전체 리소스 ID |
| `DEMO_DB_PASSWORD` | Secret | 강한 임의의 데모 DB 비밀번호 |

비밀값을 Copilot 채팅에 전달하거나 파일에 커밋하지 말고 GitHub의 Secret 입력 화면에서 직접 등록합니다. 복제한 저장소마다 OIDC subject와 권한 설정을 확인하세요.

배포 결과는 Actions의 `Deploy demo to ACA` 실행 내 `Show deployed portal URL` 단계에서 확인합니다. URL 출력은 실제 기능 검증을 대신하지 않으므로 배포 후 로그인·신청 흐름을 확인합니다.

### 데모 환경의 한계와 운영 주의

- ACA는 다섯 컨테이너를 하나의 앱으로 배포하며 복제본 수를 1개로 제한합니다. PostgreSQL은 영속 저장소가 없으므로 컨테이너 재시작·재배포 시 기록을 잃을 수 있습니다.
- 로컬 DB와 ACA DB는 별개입니다. 로컬 기록은 배포에 포함되지 않으며 초기 샘플 멘토만 다시 생성됩니다.
- 인증은 공개된 고정 계정·토큰을 쓰는 목업입니다. 외부 HTTPS ingress로 접속할 수 있으므로 실제 사내 자료를 넣거나 운영용으로 사용하면 안 됩니다. 회사 정책상 필요하면 IT 담당자가 외부 접근 제한을 추가합니다.
- 실제 업무용으로 전환하려면 표준 인증, 사용자·역할별 권한, 관리형 DB, 백업과 보존 정책을 별도로 설계해야 합니다.
- 참가자별 ACA 앱과 DB를 격리합니다. DB 볼륨이 없는 이 데모 구성으로 가용성이나 데이터 보존을 학습 목표로 삼지 않습니다.
- 교육 종료 시 담당자가 Azure 리소스와 비용을 확인해 정리합니다. 공용 ACR·ACA Environment 등을 참가자 한 명의 종료만으로 삭제하지 않습니다.
