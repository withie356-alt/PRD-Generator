# 대화형 PRD 생성기

AI와 대화하며 제품 요구사항 문서(PRD)를 자동으로 생성하는 웹 애플리케이션입니다.

## 🎯 주요 기능

### 📋 5단계 PRD 생성 프로세스
1. **문제 정의** - 해결하고자 하는 문제 설명
2. **기본 정보 수집** - Design Thinking 방법론 기반 6가지 질문
3. **디자인 화면설계** - UX/UI 설계 방법론 기반 2가지 질문
4. **이터레이션 계획** - Agile 방법론 기반 3단계 계획 자동 생성
5. **사용자 스토리** - User Story & Acceptance Criteria 자동 생성
6. **최종 PRD** - 업계 Best Practice 기반 완성도 높은 PRD 자동 생성

### ✨ 핵심 특징
- **AI 기반 자동 생성**: Google Gemini API를 활용한 지능형 PRD 생성
- **실시간 미리보기**: 각 단계별 생성 내용 실시간 확인
- **디자인 시스템 보정**: 참고 앱(토스, 쿠팡 등)의 실제 디자인 값 반영
- **Markdown 지원**: 생성된 PRD를 Markdown 형식으로 다운로드
- **토큰 추적**: 일일 API 토큰 사용량 추적 및 자동 리셋
- **에러 처리**: 자동 재시도(3회) 및 사용자 친화적 에러 UI
- **API 키 관리**: 공용 키 또는 개인 API 키 선택 사용

## 🛠 기술 스택

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3
- **Icons**: Lucide React

### Backend
- **API**: Vercel Serverless Functions
- **AI Model**: Google Gemini 1.5 Pro
- **Storage**: localStorage (클라이언트 사이드)

## 🚀 시작하기

### 필수 조건
- Node.js 16 이상
- npm 또는 yarn
- Google Gemini API 키 (선택사항)

### 환경변수 설정

`.env` 파일 생성:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

> **참고**: API 키를 설정하지 않아도 공용 키로 사용 가능하지만 한도가 있습니다.

### 설치

```bash
# 의존성 설치
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

개발 서버가 http://localhost:5173 에서 실행됩니다.

### 빌드

```bash
npm run build
```

빌드된 파일은 `dist/` 디렉토리에 생성됩니다.

### 타입 체크

```bash
npm run type-check
```

## 📁 프로젝트 구조

```
PRD 생성프로그램/
├── api/
│   └── gemini.ts           # Vercel Serverless Function (API 프록시)
├── src/
│   ├── App.tsx             # 메인 애플리케이션 컴포넌트
│   ├── main.tsx            # 엔트리 포인트
│   └── index.css           # 글로벌 스타일
├── public/                 # 정적 파일
├── index.html              # HTML 템플릿
├── vite.config.ts          # Vite 설정
├── tailwind.config.js      # Tailwind CSS 설정
├── tsconfig.json           # TypeScript 설정
├── vercel.json             # Vercel 배포 설정
└── package.json            # 프로젝트 메타데이터
```

## 🎨 사용 방법

### 1. 문제 설명
해결하고자 하는 문제를 자유롭게 설명합니다.

### 2. 기본 정보 (6개 질문)
Design Thinking 방법론 기반으로 다음을 답변:
- 앱 이름 및 목적
- 타겟 사용자
- 핵심 가치 제안
- 핵심 기능
- 성공 지표
- 추가 정보

### 3. 디자인 화면설계 (2개 질문)
UX/UI 설계 방법론 기반:
- **디자인 시스템**: 색상, 폰트, 레이아웃, 분위기
- **핵심 화면 & 사용자 여정**: 3~5개 화면과 전체 흐름

### 4. 자동 생성 단계
AI가 자동으로 생성:
- 이터레이션 계획 (MVP → 핵심 기능 → 고급 기능)
- 사용자 스토리 (As a, I want to, So that 형식)
- 최종 PRD (21개 섹션 포함)

### 5. PRD 다운로드
생성된 PRD를 Markdown 파일로 다운로드하거나 복사합니다.

## ⚙️ AI 설정

우측 상단의 "AI 활성화" 버튼으로 설정 가능:
- **실제 AI / 테스트 모드** 전환
- **Gemini API 키** 입력 및 테스트
- **향후 지원 예정**: OpenAI, MISO

## 🔧 주요 기능 상세

### API 자동 재시도
- 최대 3회 자동 재시도
- 1초, 2초 간격으로 대기
- 실패 시 사용자 친화적 에러 UI

### 디자인 시스템 보정
- 참고 앱(토스, 쿠팡, 배민 등) 선택 시 실제 디자인 값 반영
- hex 색상 코드, px 크기, 라운드 값 등 구체적 명시
- 플레이스홀더 사용 금지

### 토큰 사용량 추적
- 일일 토큰 사용량 자동 집계
- 매일 자정 자동 리셋
- localStorage에 영구 저장

## 🐛 문제 해결

### API 키 오류
1. AI 설정에서 개인 API 키 입력
2. Google AI Studio에서 무료 키 발급
3. 환경변수 설정 확인

### 빌드 오류
```bash
# node_modules 삭제 후 재설치
rm -rf node_modules
npm install
```

## 📝 최근 업데이트

### 2025-10-22
- ✅ 디자인 질문 3개 → 2개로 축소
- ✅ 1단계/2단계 질문 개수 구분 (6개/2개)
- ✅ 디자인 시스템 보정 프롬프트 강화
- ✅ 에러 UI 개선 (재시도 버튼 상단 배치)
- ✅ 채팅창 스크롤 위치 유지
- ✅ 입력창 커서 위치 자동 조정

자세한 내용은 [CHANGELOG.md](./CHANGELOG.md)를 참조하세요.

## 🤝 기여

이슈와 풀 리퀘스트는 언제나 환영합니다!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🙏 감사의 말

- Google Gemini API
- Design Thinking, Agile, User Story 방법론
- React, Vite, Tailwind CSS 커뮤니티

---

**🤖 Generated with [Claude Code](https://claude.com/claude-code)**
