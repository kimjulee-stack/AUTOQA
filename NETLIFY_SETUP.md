# Netlify Functions 설정 가이드

이 프로젝트를 Netlify에 배포하기 위한 설정 가이드입니다.

## 📋 사전 요구사항

1. Netlify 계정 생성: https://app.netlify.com
2. Netlify CLI 설치 (이미 설치됨)

## 🚀 설정 단계

### 1. 패키지 설치

```bash
# 프로젝트 루트에서
pnpm install

# Netlify Functions 의존성 설치
cd netlify/functions
pnpm install
cd ../..
```

### 2. API 서버 빌드

```bash
# API 서버를 먼저 빌드해야 Functions에서 사용 가능
pnpm --filter api build
```

### 3. Netlify Functions 빌드

```bash
# Functions TypeScript 컴파일
pnpm build:netlify
```

### 4. Next.js 빌드

```bash
# Next.js 앱 빌드
pnpm --filter web build
```

### 5. 전체 빌드

```bash
# 모든 것을 한 번에 빌드
pnpm build
```

## 🧪 로컬 테스트

### Netlify Dev로 테스트

```bash
# Netlify Dev 실행 (API + 프론트엔드 모두 실행)
pnpm dev:netlify
```

또는

```bash
npx netlify dev
```

이제 다음 URL에서 접근 가능:
- 프론트엔드: http://localhost:8888
- API: http://localhost:8888/api/*

### 개별 서버 실행 (개발용)

```bash
# API 서버만 실행
pnpm dev:api

# 웹 서버만 실행
pnpm dev:web

# 둘 다 실행
pnpm dev
```

## 📁 파일 구조

```
AUTOQA/
├── apps/
│   ├── api/          # Express API 서버
│   └── web/          # Next.js 프론트엔드
├── netlify/
│   └── functions/
│       ├── api.ts    # Netlify Function (TypeScript)
│       ├── package.json
│       └── tsconfig.json
├── netlify.toml      # Netlify 설정 파일
└── package.json
```

## 🔧 설정 파일 설명

### `netlify.toml`

- `build.publish`: Next.js 빌드 출력 디렉토리
- `build.functions`: Netlify Functions 디렉토리
- `redirects`: `/api/*` 요청을 `/.netlify/functions/api`로 리다이렉트

### `netlify/functions/api.ts`

- Express 앱을 Netlify Function으로 래핑
- `serverless-http`를 사용하여 Express를 Lambda 형식으로 변환
- Lambda 재사용을 위해 앱을 함수 외부에서 초기화

## 🚢 배포

### 1. Netlify에 로그인

```bash
npx netlify login
```

### 2. 사이트 초기화 (최초 1회)

```bash
npx netlify init
```

### 3. 배포

```bash
# 프로덕션 배포
pnpm netlify:deploy

# 또는
npx netlify deploy --prod
```

### 4. 환경 변수 설정

Netlify 대시보드에서 환경 변수 설정:
- `GEMINI_API_KEY`: Gemini API 키
- `GEMINI_MODEL`: Gemini 모델 (기본값: gemini-1.5-flash)
- 기타 필요한 환경 변수

## ⚠️ 주의사항

1. **API 서버 빌드 필수**: Functions를 빌드하기 전에 `apps/api`를 먼저 빌드해야 합니다.
2. **경로 문제**: Functions에서 `apps/api/dist`를 참조하므로 상대 경로가 올바른지 확인하세요.
3. **환경 변수**: Netlify 대시보드에서 환경 변수를 설정해야 합니다.
4. **타임아웃**: 기본 타임아웃은 30초입니다. 필요시 `netlify.toml`에서 조정하세요.

## 🔍 문제 해결

### Functions 빌드 오류

```bash
# API 서버를 먼저 빌드
pnpm --filter api build

# Functions 빌드
pnpm build:netlify
```

### 로컬 테스트 오류

```bash
# 모든 의존성 재설치
pnpm install

# API 서버 빌드 확인
pnpm --filter api build
```

### 배포 오류

1. Netlify 대시보드에서 빌드 로그 확인
2. 환경 변수 설정 확인
3. `netlify.toml` 설정 확인

## 📚 참고 자료

- [Netlify Functions 문서](https://docs.netlify.com/functions/overview/)
- [serverless-http 문서](https://github.com/dougmoscrop/serverless-http)
- [Netlify CLI 문서](https://cli.netlify.com/)

