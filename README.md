# 대화형 PRD 생성기

AI와 대화하며 제품 요구사항 문서(PRD)를 생성하는 웹 애플리케이션입니다.

## 주요 기능

- 단계별 질문 시스템을 통한 PRD 작성
- 실시간 PRD 미리보기
- Markdown 형식 지원
- 생성된 PRD 복사 및 다운로드

## 기술 스택

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3
- **Icons**: Lucide React

## 시작하기

### 필수 조건

- Node.js 16 이상
- npm 또는 yarn

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

## 프로젝트 구조

```
PRD 생성프로그램/
├── src/
│   ├── App.tsx          # 메인 애플리케이션 컴포넌트
│   ├── main.tsx         # 엔트리 포인트
│   └── index.css        # 글로벌 스타일
├── public/              # 정적 파일
├── index.html           # HTML 템플릿
├── vite.config.ts       # Vite 설정
├── tailwind.config.js   # Tailwind CSS 설정
├── tsconfig.json        # TypeScript 설정
└── package.json         # 프로젝트 메타데이터

```

## 라이선스

MIT

## 기여

이슈와 풀 리퀘스트는 언제나 환영합니다!
