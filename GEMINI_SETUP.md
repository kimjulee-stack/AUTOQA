# Google Gemini 설정 가이드

Google Gemini를 사용하여 AI 테스트 어시스턴트를 설정하는 방법입니다.

## 1. Gemini API 키 발급

1. [Google AI Studio](https://aistudio.google.com/app/apikey)에 접속
2. Google 계정으로 로그인
3. "Create API Key" 클릭
4. 프로젝트 선택 또는 새 프로젝트 생성
5. API 키를 복사하여 안전하게 보관

**참고:** 무료 할당량이 제공되며, 일일 사용량 제한이 있습니다.

## 2. 환경 변수 설정

프로젝트 루트의 `apps/web` 디렉토리에 `.env.local` 파일을 생성하고 다음을 추가:

```env
# Gemini API 설정
GEMINI_API_KEY=your-api-key-here
GEMINI_MODEL=gemini-1.5-flash
```

**사용 가능한 모델:**
- `gemini-1.5-flash` (기본값, 빠르고 효율적)
- `gemini-1.5-pro` (더 강력하지만 느림)
- `gemini-pro-vision` (이미지 분석 특화)

**중요:** `.env.local` 파일은 Git에 커밋하지 마세요. 이미 `.gitignore`에 포함되어 있습니다.

## 3. 확인

1. 웹 애플리케이션 재시작
2. AI 테스트 페이지로 이동
3. 테스트 세션 시작
4. 메시지 전송 시 Gemini가 응답하는지 확인

## 문제 해결

### "Gemini API 키가 설정되지 않았습니다" 오류

1. `.env.local` 파일이 `apps/web` 디렉토리에 있는지 확인
2. `GEMINI_API_KEY` 환경 변수가 올바르게 설정되었는지 확인
3. 웹 애플리케이션을 재시작

### "Gemini API 키가 유효하지 않습니다" 오류

1. API 키가 올바른지 확인
2. API 키가 만료되지 않았는지 확인
3. Google AI Studio에서 API 키 상태 확인

### "Gemini API 할당량을 초과했습니다" 오류

1. Google AI Studio에서 일일 사용량 확인
2. 무료 할당량이 소진되었는지 확인
3. 다음 날까지 대기
4. Google Cloud Console에서 할당량 증가 고려

### 느린 응답

1. 인터넷 연결 확인
2. `gemini-1.5-flash` 모델 사용 (더 빠름)
3. 이미지 크기가 너무 크지 않은지 확인

## 비용 정보

Gemini는 무료 할당량을 제공합니다:
- **무료 할당량:** 일일 요청 수 제한 (모델별 상이)
- **유료 플랜:** Google Cloud Console에서 설정 가능

자세한 가격 정보는 [Google AI Studio](https://aistudio.google.com/)를 참고하세요.

## 모델 비교

| 모델 | 속도 | 성능 | 이미지 지원 | 추천 용도 |
|------|------|------|------------|----------|
| gemini-1.5-flash | 빠름 | 좋음 | ✅ | 일반적인 테스트 (기본값) |
| gemini-1.5-pro | 느림 | 우수 | ✅ | 복잡한 분석 필요 시 |
| gemini-pro-vision | 중간 | 좋음 | ✅ | 이미지 분석 특화 |

## 추가 리소스

- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API 문서](https://ai.google.dev/docs)
- [API 키 관리](https://aistudio.google.com/app/apikey)

