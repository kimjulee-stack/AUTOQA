# Apptest.ai Automation Console

모바일 테스트 자동화를 위한 대시보드/시나리오/실기기 제어 웹 애플리케이션의 초기 구현입니다.  
Gram(Windows)에서 개발하고 맥 미니 환경에서 운영할 수 있도록 프론트엔드(Next.js)와 백엔드(Express)를 모노레포로 구성했습니다.

## 구조

```
apps/
  api/   # Express + TypeScript API (대시보드, 프로젝트, 시나리오, 테스트 실행 mock 데이터)
  web/   # Next.js 14(App Router) 기반 UI
```

## 개발 환경 준비

```bash
pnpm install
```

### API 서버

```
pnpm dev:api
# http://localhost:4000
```

### 웹 콘솔

```
pnpm dev:web
# http://localhost:3000
```

두 프로세스를 동시에 실행하려면:

```
pnpm dev
```

## 주요 기능 (초기 버전)

- **대시보드**: 최근 24시간 테스트 실행 요약, 상태별 카운트, 실패 스텝 리스트, 최근 실행 테이블.
- **모바일 앱 탭**: 프로젝트 목록/상태/최근 실행일 확인, 모달로 프로젝트 생성.
- **시나리오 저장소**: 버전/태그/설명 정보가 있는 카드 UI, 추후 드래그앤드랍 빌더 연동 예정.
- **Mock 데이터 API**: 실기기 오케스트레이터가 준비되기 전까지 정적인 시나리오/테스트 런 데이터를 제공.

## 다음 단계 제안

1. Appium/Playwright 러너와 연동할 `/test-runs/:id/start`, `/devices` 등의 엔드포인트 확장.
2. 시나리오 그래프 JSON → 실제 드래그앤드랍 빌더(React Flow) 연결 및 저장/버전 관리.
3. USB 실기기 제어 모듈과 맥 미니 배포 스크립트(launchctl + Docker Compose) 추가.
4. Postgres/MinIO를 붙여 mock 데이터 대신 실제 저장소 사용.

필요한 기능이나 인프라 스크립트가 있다면 알려주세요.






