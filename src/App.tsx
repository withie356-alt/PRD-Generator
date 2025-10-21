import { useState, useEffect, useRef } from 'react';
import { Copy, FileText, Zap, CheckCircle, MessageSquare, ArrowRight, ArrowLeft, Lightbulb, Loader2 } from 'lucide-react';

// 타입 정의
interface ChatMessage {
  type: 'user' | 'ai';
  content: string;
  hint?: string;
  questionIndex?: number;
}

interface Question {
  question: string;
  hint: string;
}

export default function PRDPromptGenerator() {
  // 상수 정의
  const REQUIRED_ANSWERS = 6;
  const COPY_FEEDBACK_DURATION = 2000;
  const AI_RESPONSE_DELAY = 500;
  const MOCK_PROCESSING_DELAY = 1500;
  const MOCK_PRD_DELAY = 2000;

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [problemDescription, setProblemDescription] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState<string>('');
  const [iterationPlan, setIterationPlan] = useState<string>('');
  const [userStories, setUserStories] = useState<string>('');
  const [finalPRD, setFinalPRD] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(false);
  const [useRealAI, setUseRealAI] = useState<boolean>(false);
  const [modificationRequest, setModificationRequest] = useState<string>('');
  const [modificationHistory, setModificationHistory] = useState<ChatMessage[]>([]);
  const [detailedChatMessages, setDetailedChatMessages] = useState<ChatMessage[]>([]);
  const [detailedUserInput, setDetailedUserInput] = useState<string>('');
  const [enrichedDesignSystem, setEnrichedDesignSystem] = useState<string>(''); // AI가 보정한 디자인 시스템
  const [basicInfoSummary, setBasicInfoSummary] = useState<string>('');
  const [iterationSummary, setIterationSummary] = useState<string>('');
  const [prdSummary, setPrdSummary] = useState<string>('');
  const [progress, setProgress] = useState<number>(0); // 진행률 (0-100)

  // 채팅 스크롤 자동화를 위한 ref
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const detailedChatContainerRef = useRef<HTMLDivElement>(null);
  const detailedChatInputRef = useRef<HTMLInputElement>(null);
  const iterationModInputRef = useRef<HTMLInputElement>(null);
  const userStoryModInputRef = useRef<HTMLInputElement>(null);
  // 질문답변 정리 창 스크롤을 위한 ref
  const basicQASummaryRef = useRef<HTMLDivElement>(null);
  const detailedQASummaryRef = useRef<HTMLDivElement>(null);

  // 채팅 메시지가 업데이트될 때마다 스크롤을 맨 아래로
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, isProcessing]);

  // 상세 정보 채팅 메시지가 업데이트될 때마다 스크롤을 맨 아래로
  useEffect(() => {
    if (detailedChatContainerRef.current) {
      detailedChatContainerRef.current.scrollTop = detailedChatContainerRef.current.scrollHeight;
    }
  }, [detailedChatMessages, isProcessing]);

  // Step 1 질문답변 정리 창 스크롤 자동화
  useEffect(() => {
    if (basicQASummaryRef.current && chatMessages.length > 0) {
      basicQASummaryRef.current.scrollTop = basicQASummaryRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Step 2 질문답변 정리 창 스크롤 자동화
  useEffect(() => {
    if (detailedQASummaryRef.current && detailedChatMessages.length > 0) {
      detailedQASummaryRef.current.scrollTop = detailedQASummaryRef.current.scrollHeight;
    }
  }, [detailedChatMessages]);

  // 키보드 단축키 핸들러
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Enter로 다음 단계 진행
      if (e.ctrlKey && e.key === 'Enter' && !isProcessing) {
        if (currentStep === 0 && problemDescription.trim()) {
          handleProblemSubmit();
        } else if (currentStep === 1) {
          const userAnswers = chatMessages.filter(m => m.type === 'user').length;
          if (userAnswers >= REQUIRED_ANSWERS) {
            generateDetailedInfo();
          }
        } else if (currentStep === 2) {
          const userAnswers = detailedChatMessages.filter(m => m.type === 'user').length;
          if (userAnswers >= REQUIRED_ANSWERS) {
            generateIterationPlan();
          }
        } else if (currentStep === 3 && iterationPlan) {
          generateUserStories();
        } else if (currentStep === 4 && userStories) {
          generateFinalPRD();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, isProcessing, chatMessages, detailedChatMessages, iterationPlan, userStories, problemDescription]);

  // Step 1에서 채팅 입력창 자동 포커스
  useEffect(() => {
    if (currentStep === 1 && !isProcessing && chatInputRef.current) {
      // 약간의 딜레이를 주어 렌더링 완료 후 포커스
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
    }
  }, [currentStep, isProcessing, chatMessages]);

  // Step 2에서 채팅 입력창 자동 포커스
  useEffect(() => {
    if (currentStep === 2 && !isProcessing && detailedChatInputRef.current) {
      setTimeout(() => {
        detailedChatInputRef.current?.focus();
      }, 100);
    }
  }, [currentStep, isProcessing, detailedChatMessages]);

  // Step 3에서 수정 요청 입력창 자동 포커스
  useEffect(() => {
    if (currentStep === 3 && !isProcessing && iterationPlan && iterationModInputRef.current) {
      setTimeout(() => {
        iterationModInputRef.current?.focus();
      }, 100);
    }
  }, [currentStep, isProcessing, iterationPlan]);

  // Step 4에서 수정 요청 입력창 자동 포커스
  useEffect(() => {
    if (currentStep === 4 && !isProcessing && userStories && userStoryModInputRef.current) {
      setTimeout(() => {
        userStoryModInputRef.current?.focus();
      }, 100);
    }
  }, [currentStep, isProcessing, userStories]);

  const steps = [
    { id: 0, name: '문제 설명', icon: FileText },
    { id: 1, name: 'Design Thinking', icon: MessageSquare },
    { id: 2, name: '디자인 & 화면 설계', icon: MessageSquare },
    { id: 3, name: '이터레이션', icon: Lightbulb },
    { id: 4, name: '사용자 스토리', icon: CheckCircle },
    { id: 5, name: 'PRD 생성', icon: Zap }
  ];

  // 원형 진행률 표시 컴포넌트
  const CircularProgress = ({ percentage }: { percentage: number }) => {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width="120" height="120" className="transform -rotate-90">
          {/* 배경 원 */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="none"
          />
          {/* 진행률 원 */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke="#3b82f6"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        {/* 가운데 퍼센트 숫자 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-blue-600">{percentage}%</span>
        </div>
      </div>
    );
  };

  // API 테스트 함수
  const testGeminiAPI = async () => {
    console.log('=== API 테스트 시작 ===');
    console.log('API 키:', geminiApiKey ? geminiApiKey.substring(0, 10) + '...' : '없음');
    
    if (!geminiApiKey.trim()) {
      alert('API 키를 입력해주세요.');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
      console.log('요청 URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Test' }] }]
        })
      });
      
      console.log('응답 상태:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('응답 성공:', data);
        setUseRealAI(true);
        setShowApiKeyInput(false);
        alert('✅ Gemini API 연결 성공!\n실제 AI가 활성화되었습니다.');
      } else {
        const errorData = await response.json();
        console.error('API 오류:', errorData);
        alert('❌ API 키가 유효하지 않습니다.\n\n오류: ' + (errorData.error?.message || '알 수 없는 오류'));
      }
    } catch (error) {
      console.error('연결 오류:', error);
      alert('❌ API 연결 실패\n\n' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    } finally {
      setIsProcessing(false);
      console.log('=== API 테스트 종료 ===');
    }
  };

  // Gemini API 호출 함수 (스트리밍 지원)
  const callGeminiAPI = async (
    prompt: string,
    onProgress?: (progress: number) => void
  ): Promise<string | null> => {
    if (!geminiApiKey) {
      alert('Gemini API 키를 먼저 설정해주세요.');
      return null;
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.3,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 32000,
              candidateCount: 1,
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('응답 body가 없습니다.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // 받은 chunk를 문자열로 변환
        buffer += decoder.decode(value, { stream: true });

        // JSON 라인 파싱 (Gemini는 줄바꿈으로 구분된 JSON 반환)
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 마지막 불완전한 줄은 버퍼에 보관

        for (const line of lines) {
          if (line.trim() === '') continue;

          try {
            const parsed = JSON.parse(line);
            const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) {
              fullText += text;

              // 진행률 콜백 (받은 텍스트 길이 기반으로 예측)
              // 평균적으로 3000자 정도 생성된다고 가정
              if (onProgress) {
                const estimatedProgress = Math.min((fullText.length / 3000) * 100, 95);
                onProgress(estimatedProgress);
              }
            }
          } catch (e) {
            // JSON 파싱 에러는 무시 (불완전한 chunk일 수 있음)
          }
        }
      }

      if (!fullText) {
        throw new Error('API 응답에서 텍스트를 추출할 수 없습니다.');
      }

      return fullText;
    } catch (error) {
      console.error('Gemini API 호출 실패:', error);
      alert(`API 호출에 실패했습니다. ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      return null;
    }
  };

  // Mock AI 질문 생성 (디자인 씽킹 기반)
  const generateQuestions = (): Question[] => {
    return [
      {
        question: "이 앱을 사용할 구체적인 사람(페르소나)을 떠올려보세요. 그 사람이 언제, 어디서, 왜 이 앱을 사용하게 되나요?",
        hint: "예시:\n- 30대 직장인 김대리, 출퇴근 지하철(왕복 2시간)에서 투자 포트폴리오를 실시간 확인하고 빠른 의사결정이 필요\n- 50대 자영업자 박사장, 가게 운영 중 틈틈이 스마트폰으로 매출 분석하고 재고 발주 시점 파악\n- 20대 대학생 이씨, 스터디카페에서 팀 프로젝트 진행 상황을 한눈에 보고 동료들과 실시간 협업\n- 40대 프리랜서 최씨, 카페에서 노트북으로 여러 클라이언트 프로젝트 일정과 수익을 통합 관리\n- 30대 워킹맘 정씨, 퇴근 후 집에서 아이 재우고 밤 시간 활용해 부업 매출 현황과 고객 관리"
      },
      {
        question: "사용자는 현재 이 문제를 어떻게 해결하고 있으며, 그 방법의 어떤 점이 불편하고 비효율적인가요?",
        hint: "예시:\n- 엑셀 파일 10개를 수작업으로 관리 중 → 파일 찾는데만 5분, 업데이트 누락 빈번, 버전 관리 안 됨\n- 카카오톡과 이메일에 흩어진 정보 → 필요한 자료 찾으려면 30분 이상 스크롤, 중요 메시지 놓침\n- 종이 노트에 메모 후 나중에 정리 → 필기 내용 검색 불가, 분실 위험, 사진 찍어도 관리 어려움\n- 여러 앱을 오가며 작업 → 앱 전환 10회 이상, 데이터 수동 복사 붙여넣기로 실수 발생\n- 수기로 계산 후 검증 → 계산 오류 자주 발생, 재작업에 시간 낭비, 신뢰도 낮음"
      },
      {
        question: "이 앱을 사용한 후, 사용자의 경험이 어떻게 달라지길 원하나요? 5분 안에 무엇을 할 수 있어야 하나요?",
        hint: "예시:\n- 1분: 앱 열자마자 오늘의 핵심 지표 대시보드 확인 (전일 대비 변화율 포함)\n- 2분: 새로운 데이터 음성 또는 사진으로 입력 (타이핑 최소화)\n- 3분: AI가 자동 분석한 인사이트와 추천 액션 아이템 확인\n- 4분: 원하는 형식으로 리포트 자동 생성 (PDF/엑셀/이미지)\n- 5분: 팀원/관계자에게 링크 공유 완료, 실시간 협업 시작"
      },
      {
        question: "이 앱만의 차별화된 강점이나 경쟁 우위는 무엇인가요? 왜 기존 서비스가 아닌 이 앱을 써야 하나요?",
        hint: "예시:\n- 업계 최초 AI 기반 예측 분석 엔진 탑재 (3개월 치 데이터로 다음 달 트렌드 예측)\n- 경쟁사 대비 데이터 처리 속도 10배 빠름 (1만 건 데이터를 3초 내 분석)\n- 모바일 퍼스트 UI/UX로 한 손 조작 최적화 (대중교통에서도 편리)\n- 오프라인 모드 지원으로 인터넷 없어도 핵심 기능 사용 가능\n- 타사 대비 월 이용료 50% 저렴하면서 무제한 사용자 초대 가능"
      },
      {
        question: "첫 버전에서 사용자가 '이거 하나만 있어도 쓰겠다'라고 할 만한 핵심 기능 3가지는 무엇인가요?",
        hint: "예시:\n- 원클릭 자동 데이터 분석: 복잡한 설정 없이 버튼 하나로 모든 데이터 즉시 분석\n- 실시간 협업 대시보드: 팀원들이 동시에 접속해서 같은 화면 보며 의견 교환\n- 스마트 알림: 중요한 변화나 이상 징후 감지 시 푸시 알림으로 즉시 통보\n- 커스텀 리포트 자동 생성: 주간/월간 리포트를 원하는 양식으로 자동 작성 및 발송\n- 음성/사진 입력: 말로 지시하거나 영수증 사진만 찍으면 자동으로 데이터 입력"
      },
      {
        question: "이 앱이 실제로 문제를 해결했는지 어떻게 알 수 있나요? 어떤 지표나 사용자 반응을 보고 싶으신가요?",
        hint: "예시:\n- 정량 지표: 일일 활성 사용자(DAU) 500명 이상, 주간 재방문율 70% 이상\n- 효율성 지표: 기존 대비 작업 시간 60% 단축, 오류율 80% 감소\n- 만족도 지표: 앱스토어 평점 4.5점 이상, NPS(순추천지수) 50 이상\n- 비즈니스 지표: 유료 전환율 20% 이상, 월간 구독 갱신율 90% 이상\n- 사용자 피드백: '이 앱 없으면 일 못할 것 같다', '팀 생산성 2배 올랐다' 등의 리뷰"
      }
    ];
  };

  // 화면 & 기능 설계를 위한 질문 생성 (UX/UI + Visual Design 방법론 기반)
  const generateDetailedQuestions = (): Question[] => {
    return [
      {
        question: "[Design System & Brand Identity] 앱의 전체적인 디자인 느낌과 브랜드 정체성은 어떻게 표현하고 싶으신가요?",
        hint: "예시:\n- 노션(Notion) 스타일: 미니멀하고 깔끔한 작업 공간 느낌 (베이지/그레이 톤, 블록 기반 레이아웃, 여백 넉넉)\n- 토스(Toss) 스타일: 친근하면서 신뢰감 있는 금융 앱 (블루 포인트 컬러, 둥근 카드, 직관적 아이콘)\n- 에어비앤비(Airbnb) 스타일: 따뜻하고 환대하는 느낌 (레드/코랄 포인트, 큰 이미지 중심, 부드러운 라운드)\n- 피그마(Figma) 스타일: 현대적이고 협업 중심 (퍼플/멀티컬러, 실시간 협업 UI, 플로팅 요소)\n- 카카오뱅크 스타일: 젊고 활기찬 금융 (옐로우 브랜드 컬러, 캐릭터 활용, 재미있는 마이크로인터랙션)\n- 당근마켓 스타일: 지역 커뮤니티 중심의 따뜻한 느낌 (오렌지 포인트, 친근한 일러스트, 동네 기반 UI)"
      },
      {
        question: "[Color System] 주요 색상 구성은 어떻게 하시겠어요? 브랜드 컬러와 기능별 색상 역할을 설명해주세요.",
        hint: "예시:\n- 슬랙(Slack) 스타일: 퍼플 #4A154B (브랜드), 그린 #2EB67D (온라인 상태), 레드 #E01E5A (알림)\n- 트위터(X) 스타일: 블루 #1DA1F2 (주요 액션), 블랙/화이트 (미니멀 UI), 하트 레드 (좋아요)\n- 스포티파이(Spotify) 스타일: 그린 #1DB954 (브랜드/재생 버튼), 블랙 배경, 화이트/그레이 텍스트\n- 인스타그램 스타일: 그라데이션 (보라→핑크→노랑, 브랜드 로고), 블루 (링크), 레드 (좋아요/알림)\n- 네이버 스타일: 그린 #03C75A (브랜드), 화이트 배경, 그레이 구분선, 포인트 색상 절제적 사용\n- 쿠팡 스타일: 로켓 레드/오렌지 (브랜드), 세일 레드, 무료배송 블루, 화이트 클린 배경"
      },
      {
        question: "[Typography & Hierarchy] 텍스트 스타일과 정보의 시각적 위계는 어떻게 구성하시겠어요?",
        hint: "예시:\n- 애플(Apple) 스타일: SF Pro Display, 대담한 큰 제목(48px+), 여백 넉넉, 작은 본문(14-16px)\n- 구글(Google) 스타일: Roboto/Google Sans, 명확한 위계, 타이틀 Medium(24px), 본문 Regular(16px)\n- 미디엄(Medium) 스타일: 세리프 폰트(제목), 큰 본문(21px), 넉넉한 Line-height(1.8), 읽기 중심\n- 배민(배달의민족) 스타일: 배민체/주아체 사용, 친근하고 재미있는 폰트, 굵기 차이로 강조\n- 리디(Ridibooks) 스타일: 산돌고딕, 가독성 중심, 본문 18px, Line-height 1.7, 글 읽기 최적화\n- 요기요 스타일: 깔끔한 Sans-serif, 음식 이름 Bold(18px), 가격 Strong(20px Red), 정보 Regular(14px)"
      },
      {
        question: "[Layout & Spacing] 화면 레이아웃과 여백 시스템은 어떻게 설정하시겠어요?",
        hint: "예시:\n- 노션(Notion) 스타일: 8px 기본 단위, 넉넉한 여백, 콘텐츠 중앙 정렬(최대 900px), 블록 간 8px\n- 트렐로(Trello) 스타일: 카드 그리드 레이아웃, 카드 간 8px, 리스트 간 16px, 드래그 가능한 넓은 터치 영역\n- 유튜브(YouTube) 스타일: 썸네일 그리드(4열/3열/2열/1열), 16:9 비율, 카드 간 16px, 무한 스크롤\n- 넷플릭스(Netflix) 스타일: 수평 스크롤 섹션, 섹션 간 40px, 호버 시 카드 확대, 전체화면 히어로 영역\n- 지그재그 스타일: 타이트한 여백(8px), 상품 밀집 배치(2열), 빠른 스크롤 유도, 하단 탭바 고정\n- 카카오톡 스타일: 리스트 레이아웃, 프로필 48px, 좌우 패딩 16px, 구분선 1px, 스와이프 액션"
      },
      {
        question: "[Icons & Visual Elements] 아이콘 스타일과 시각적 요소는 어떻게 디자인하시겠어요?",
        hint: "예시:\n- 페이스북(Facebook) 스타일: Filled 아이콘(좋아요 하트, 알림 벨), 브랜드 블루, 명확한 시각 피드백\n- 라인(LINE) 스타일: 귀여운 캐릭터 스티커, 둥근 아이콘, 친구 프로필 원형, 스티커샵 일러스트\n- 드롭박스(Dropbox) 스타일: 심플 Outline 아이콘, 2px 선, 파일 타입별 컬러 구분, 클라우드 모티프\n- 에어비앤비(Airbnb) 스타일: Outline 아이콘, 하트(위시리스트), 돋보기(검색), 큰 숙소 사진(16:9)\n- 번개장터 스타일: 상품 사진 정사각형, 찜 하트 아이콘, 판매자 프로필 원형, 가격 강조 레드\n- 무신사(Musinsa) 스타일: 제품 이미지 중심(3:4 비율), 브랜드 로고, 하트 찜, 블랙/화이트 미니멀 아이콘"
      },
      {
        question: "[Button & CTA Design] 버튼과 주요 액션 요소의 디자인은 어떻게 하시겠어요?",
        hint: "예시:\n- 쿠팡(Coupang) 스타일: '로켓배송' 오렌지 버튼, '구매하기' 꽉 찬 넓은 버튼, 하단 고정 CTA\n- 토스(Toss) 스타일: 파란색 통버튼, 둥근 라운드(12px), '다음' 버튼 하단 고정, 비활성 시 그레이\n- 카카오톡 스타일: 노란색 브랜드 버튼, '선물하기' CTA, 톡 보내기 버튼, 프로필 아이콘 버튼\n- 당근마켓 스타일: 오렌지 '채팅하기' 버튼, '관심' 하트 아이콘, Ghost 버튼(신고/공유)\n- 배민 스타일: '주문하기' 터콰이즈 버튼, '장바구니' 플로팅, 가게 '전화/찜' 아이콘 버튼\n- 요기요 스타일: 레드 '주문하기' 하단 고정, 숫자 증감 버튼(+/-), '메뉴담기' Secondary"
      },
      {
        question: "[Cards & Components] 카드와 주요 컴포넌트의 스타일은 어떻게 디자인하시겠어요?",
        hint: "예시:\n- 인스타그램(Instagram) 스타일: 피드 카드(정사각형 이미지), 좋아요/댓글 하단, 프로필 원형, 스토리 그라데이션 링\n- 핀터레스트(Pinterest) 스타일: 벽돌 그리드(Masonry), 이미지 중심, 호버 시 저장 버튼, 다양한 높이\n- 지마켓 스타일: 상품 카드(썸네일+제목+가격), 할인율 레드 태그, 무료배송 아이콘, 찜 하트\n- 왓챠(Watcha) 스타일: 영화 포스터 카드(2:3), 별점 노란색, 수평 스크롤 섹션, 호버 확대\n- 오늘의집 스타일: 인테리어 사진 카드, 좋아요/스크랩, 제품 태그, 사진북 그리드, 화이트 배경\n- 직방 스타일: 매물 카드(썸네일+가격+정보), 가격 강조(Bold), 태그(역세권/풀옵션), 체크박스 비교"
      },
      {
        question: "[Animation & Interaction] 애니메이션과 인터랙션은 어떻게 적용하시겠어요?",
        hint: "예시:\n- 틱톡(TikTok) 스타일: 세로 스와이프 전환, 무한 피드, 더블탭 하트 애니메이션, 자동재생 비디오\n- 카카오톡 스타일: 채팅방 우->좌 슬라이드 전환, 말풍선 등장 애니메이션, 이모티콘 애니메이션, 스와이프 답장\n- 애플(Apple) 스타일: 부드러운 Ease-in-out, Parallax 스크롤, 제품 회전 인터랙션, 미세한 진동 피드백\n- 구글 머티리얼(Material) 스타일: Ripple 효과(터치 시 물결), FAB 확장, 스낵바 하단 등장, 카드 Elevation\n- 토스 스타일: 성공 시 체크 애니메이션, 송금 시 금액 카운트업, Lottie 일러스트, 진행률 프로그레스\n- 쿠팡 스타일: 장바구니 담기 시 플라잉 애니메이션, 타이머 카운트다운, 스켈레톤 로딩, 무한스크롤"
      },
      {
        question: "[User Journey] 사용자가 앱을 열고 주요 목표를 달성하기까지 거치는 핵심 단계를 순서대로 설명해주세요.",
        hint: "예시:\n- 1단계: 로그인 (소셜 로그인 3초 이내) → 개인화된 대시보드 자동 표시\n- 2단계: 상단 '+새 작업' 버튼 클릭 → 작업 유형 선택 (빠른 입력/상세 입력)\n- 3단계: 필수 정보 입력 (제목, 카테고리, 마감일) → 선택 정보는 나중에 추가 가능\n- 4단계: '분석 시작' 버튼 클릭 → AI 자동 분석 진행 (3~5초)\n- 5단계: 결과 화면에서 인사이트 확인 → 저장/공유/수정 중 선택\n- 6단계: 공유 시 링크 자동 생성 → 카카오톡/이메일/슬랙 등으로 즉시 전송"
      },
      {
        question: "[Information Architecture] 첫 화면(홈/대시보드)에서 가장 중요한 정보는 무엇이며, 화면 상단/중앙/하단에 각각 무엇을 배치하시겠어요?",
        hint: "예시:\n- 상단 (고정 헤더): 로고, 전체 검색창, 알림 배지(숫자 표시), 사용자 프로필 아이콘\n- 중앙 상단: 오늘의 주요 지표 카드 3개 (전일 대비 증감률 화살표 표시)\n- 중앙: 최근 활동 타임라인 (시간순 정렬, 최대 20개), 각 항목에 빠른 액션 버튼\n- 중앙 하단: 추천 작업 섹션 (AI가 분석한 다음 할 일 제안)\n- 하단 (고정 탭바): 홈/분석/작업/설정 (각 탭에 뱃지 알림 가능)\n- 플로팅 버튼: 우측 하단에 '+' 버튼 (주요 작업 빠른 시작)"
      },
      {
        question: "[Wireflow] 주요 작업을 수행하는 화면들은 어떤 순서로 연결되나요? 각 화면에서 다음 화면으로 어떻게 이동하나요?",
        hint: "예시:\n- 목록 화면 → (항목 클릭) → 상세 화면 (슬라이드 인 애니메이션)\n- 상세 화면 → (우측 상단 수정 아이콘) → 편집 화면 (전환 효과)\n- 상세 화면 → (좌우 스와이프) → 이전/다음 항목으로 이동\n- 편집 화면 → (저장) → 상세 화면으로 복귀 + 성공 토스트 / (취소) → 확인 다이얼로그 후 복귀\n- 상세 화면 → (공유 버튼) → 바텀시트로 공유 옵션 표시\n- 어느 화면에서나 → (X 또는 뒤로가기) → 이전 화면 / (홈 아이콘) → 대시보드"
      },
      {
        question: "[Data Input] 사용자가 데이터를 입력하는 화면에서 어떤 입력 필드가 필요하고, 각 필드는 어떤 형태(텍스트, 선택, 날짜 등)인가요?",
        hint: "예시:\n- 제목: 한 줄 텍스트 입력 (필수, 최대 100자, 실시간 글자 수 표시)\n- 카테고리: 드롭다운 선택 또는 칩으로 멀티 선택 (필수, 자주 쓰는 항목 상단 고정)\n- 우선순위: 버튼 토글 (높음/보통/낮음, 색상으로 구분)\n- 마감일: 캘린더 피커 (선택, 빠른 선택 옵션: 오늘/내일/이번주/다음주)\n- 담당자: 자동완성 검색 입력 (선택, 최근 협업자 우선 표시)\n- 설명: 여러 줄 텍스트 에디터 (선택, 마크다운 지원, 파일/이미지 드래그앤드롭)\n- 태그: 자유 입력 후 엔터 (선택, 기존 태그 자동 제안)"
      },
      {
        question: "[Data Display] 목록이나 결과를 보여주는 화면에서 각 항목은 어떤 정보를 표시하고, 어떤 형태(카드, 테이블, 리스트)로 보여주나요?",
        hint: "예시:\n- 표시 형태: 카드 그리드 (모바일 1열, 태블릿 2열, 데스크톱 3열)\n- 카드 구성: 좌측 상태 컬러바, 썸네일 이미지(또는 아이콘), 제목(볼드), 부제목(회색)\n- 메타 정보: 생성일(상대시간), 수정자 프로필 이미지, 진행률 프로그레스바\n- 상태 표시: 우측 상단 상태 태그 (완료/진행중/대기, 색상 코딩)\n- 액션 버튼: 각 카드 우측에 더보기(...) 메뉴 (수정/삭제/공유/복제)\n- 정렬/필터: 상단에 드롭다운 (최신순/오래된순/인기순), 필터 칩 (상태별/카테고리별)\n- 로딩: 무한 스크롤로 20개씩 자동 로딩, 스켈레톤 UI 표시"
      },
      {
        question: "[Mobile-First & Responsive] 모바일 환경에서 가장 중요한 기능은 무엇이며, 데스크톱과 다르게 설계해야 할 부분이 있나요?",
        hint: "예시:\n- 모바일 핵심 기능: 빠른 데이터 입력 (음성/카메라), 푸시 알림, 오프라인 동기화\n- 모바일 전용 UI: 하단 고정 탭바, 풀스크린 모달, 스와이프 제스처 (좌: 삭제, 우: 완료)\n- 모바일 최적화: 터치 영역 최소 44px, 폰트 크기 16px 이상, 한 손 조작 가능하게 주요 버튼은 하단 배치\n- 데스크톱 전용: 좌측 사이드바 네비게이션, 마우스 호버 시 상세 정보 툴팁, 키보드 단축키 지원\n- 데스크톱 장점 활용: 넓은 화면에서 멀티뷰 (좌측 목록 + 우측 상세), 드래그앤드롭으로 순서 변경\n- 반응형 공통: 핵심 기능은 2탭/클릭 이내 접근, 일관된 컬러/아이콘 시스템, 다크모드 지원"
      }
    ];
  };

  // Step 0: 문제 설명 제출
  const handleProblemSubmit = async () => {
    if (!problemDescription.trim()) {
      alert('문제 설명을 입력해주세요.');
      return;
    }
    setCurrentStep(1);

    if (useRealAI && geminiApiKey) {
      setIsProcessing(true);
      const prompt = `[중요] 출력 형식을 절대 변경하지 마세요. 아래 형식만 사용하세요:

질문 내용

예시:
- 예시 항목 1
- 예시 항목 2
- 예시 항목 3

---

당신은 디자인 씽킹 기반 PRD 작성 전문가입니다. 사용자가 다음과 같은 문제를 가지고 있습니다:

"${problemDescription}"

디자인 씽킹 방식으로 총 6개의 질문을 통해 사용자와 문제를 깊이 이해해야 합니다.
첫 번째 질문(페르소나 & 시나리오)을 생성해주세요.

출력 예시 (이 형식을 정확히 따라하세요):
이 앱을 사용할 구체적인 사람을 떠올려보세요. 그 사람이 언제, 어디서, 왜 이 앱을 사용하게 되나요?

예시:
- 30대 직장인 김대리, 출퇴근 지하철(왕복 2시간)에서 투자 포트폴리오를 실시간 확인하고 빠른 의사결정이 필요
- 50대 자영업자 박사장, 가게 운영 중 틈틈이 스마트폰으로 매출 분석하고 재고 발주 시점 파악
- 20대 대학생 이씨, 스터디카페에서 팀 프로젝트 진행 상황을 한눈에 보고 동료들과 실시간 협업
- 40대 프리랜서 최씨, 카페에서 노트북으로 여러 클라이언트 프로젝트 일정과 수익을 통합 관리
- 30대 워킹맘 정씨, 퇴근 후 집에서 아이 재우고 밤 시간 활용해 부업 매출 현황과 고객 관리

반드시 지켜야 할 규칙:
1. 질문 1줄만 작성
2. 빈 줄 1개
3. "예시:" (예: 아님!)
4. "-" 로 시작하는 5개 항목, 각 항목은 새 줄에 작성하며 구체적이고 상세하게 작성
5. 끝 (다른 내용 절대 추가 금지)

위 형식을 정확히 따라 첫 번째 질문을 생성하세요.`;

      const firstQuestion = await callGeminiAPI(prompt);
      setIsProcessing(false);

      if (firstQuestion) {
        setChatMessages([
          {
            type: 'ai',
            content: '문제 상황을 이해했습니다! 더 나은 PRD를 만들기 위해 몇 가지 질문을 드릴게요.',
          },
          {
            type: 'ai',
            content: firstQuestion.trim(),
            questionIndex: 0
          }
        ]);
      }
    } else {
      const questions = generateQuestions();
      const firstQuestion = questions[0];
      if (firstQuestion) {
        setChatMessages([
          {
            type: 'ai',
            content: '문제 상황을 이해했습니다! 더 나은 PRD를 만들기 위해 몇 가지 질문을 드릴게요.'
          },
          {
            type: 'ai',
            content: firstQuestion.question,
            hint: firstQuestion.hint,
            questionIndex: 0
          }
        ]);
      }
    }
  };

  // Step 1: 대화 진행
  const handleChatSubmit = async () => {
    if (!userInput.trim()) return;

    const newMessages: ChatMessage[] = [...chatMessages, { type: 'user', content: userInput }];
    setChatMessages(newMessages);
    setUserInput('');

    const userAnswers = newMessages.filter(m => m.type === 'user').length;

    if (userAnswers < REQUIRED_ANSWERS) {
      if (useRealAI && geminiApiKey) {
        setIsProcessing(true);
        
        const conversationHistory = newMessages
          .map(m => `${m.type === 'user' ? '사용자' : 'AI'}: ${m.content}`)
          .join('\n');
        
        const prompt = `[중요] 출력 형식을 절대 변경하지 마세요. 아래 형식만 사용하세요:

질문 내용

예시:
- 예시 항목 1
- 예시 항목 2
- 예시 항목 3

---

당신은 PRD 작성을 돕는 전문가입니다.

초기 문제:
"${problemDescription}"

지금까지 대화:
${conversationHistory}

사용자가 ${userAnswers}개의 질문에 답변했습니다.
이제 대화 맥락을 고려하여 다음으로 가장 중요한 질문 1개를 만들어주세요.
총 ${REQUIRED_ANSWERS}개 질문 중 ${userAnswers + 1}번째 질문입니다.

디자인 씽킹 기반 질문 가이드 (${userAnswers + 1}번째):
1번째: 페르소나 & 시나리오
   예시 형식:
   "이 앱을 사용할 구체적인 사람을 떠올려보세요. 그 사람이 언제, 어디서, 왜 이 앱을 사용하게 되나요?

   예시:
   - 30대 직장인, 출퇴근 지하철에서 투자 포트폴리오 확인
   - 50대 자영업자, 가게 운영 중 스마트폰으로 매출 분석
   - 20대 대학생, 스터디카페에서 팀 프로젝트 협업
   - 40대 프리랜서, 카페에서 여러 프로젝트 일정 관리
   - 30대 워킹맘, 퇴근 후 집에서 부업 관리"

2번째: 현재 상황 (As-Is)
   예시 형식:
   "사용자는 현재 이 문제를 어떻게 해결하고 있으며, 그 방법의 어떤 점이 불편하고 비효율적인가요?

   예시:
   - 엑셀 10개 파일을 수작업 관리 → 찾는데 5분, 버전 관리 안 됨
   - 카톡/이메일에 흩어진 정보 → 찾으려면 30분 이상 스크롤
   - 종이 노트에 메모 → 검색 불가, 분실 위험
   - 여러 앱 전환하며 작업 → 복붙 실수 빈번
   - 수기 계산 → 오류 발생, 재작업 많음"

3번째: 이상적인 경험 (To-Be)
   예시 형식:
   "이 앱을 사용한 후, 사용자의 경험이 어떻게 달라지길 원하나요? 5분 안에 무엇을 할 수 있어야 하나요?

   예시:
   - 1분: 앱 열자마자 핵심 지표 대시보드 확인
   - 2분: 음성/사진으로 데이터 입력
   - 3분: AI 자동 분석 결과 확인
   - 4분: 리포트 자동 생성
   - 5분: 팀원에게 공유 완료"

4번째: 문제 해결 방법
   예시 형식:
   "이 앱은 사용자의 문제를 어떻게 해결하나요? 기존 방법과 어떤 점이 다른가요?

   예시:
   - 기존: 엑셀 5개 파일 → 이 앱: 하나의 대시보드로 통합
   - 기존: 카톡/이메일 검색 → 이 앱: AI가 자동으로 정리
   - 기존: 수동 계산 → 이 앱: 실시간 자동 분석
   - 기존: 여러 앱 전환 → 이 앱: 한 곳에서 모든 작업
   - 기존: 결과 공유 어려움 → 이 앱: 링크 하나로 즉시 공유"

5번째: MVP 핵심 기능
   예시 형식:
   "첫 버전에서 사용자가 '이거 하나만 있어도 쓰겠다'라고 할 만한 핵심 기능 3가지는 무엇인가요?

   예시:
   - 원클릭 자동 분석: 버튼 하나로 즉시 분석
   - 실시간 협업 대시보드: 팀원과 동시 작업
   - 스마트 알림: 중요 변화 즉시 통보
   - 리포트 자동 생성: 주간/월간 리포트 자동 작성
   - 음성/사진 입력: 말하거나 사진만 찍으면 입력 완료"

6번째: 초기 사용자 목표
   예시 형식:
   "처음 10-50명의 테스트 사용자에게서 어떤 반응을 기대하시나요?

   예시:
   - 주 2-3회 이상 사용
   - '이거 편하다', '시간 절약된다'는 피드백
   - 친구/동료에게 추천 의향
   - 기존 방식 대비 50% 이상 시간 절약 체감
   - 한 달 후에도 계속 사용"

출력 예시 (이 형식을 정확히 따라하세요):
이 앱을 사용할 구체적인 사람을 떠올려보세요. 그 사람이 언제, 어디서, 왜 이 앱을 사용하게 되나요?

예시:
- 30대 직장인 김대리, 출퇴근 지하철(왕복 2시간)에서 투자 포트폴리오를 실시간 확인하고 빠른 의사결정이 필요
- 50대 자영업자 박사장, 가게 운영 중 틈틈이 스마트폰으로 매출 분석하고 재고 발주 시점 파악
- 20대 대학생 이씨, 스터디카페에서 팀 프로젝트 진행 상황을 한눈에 보고 동료들과 실시간 협업
- 40대 프리랜서 최씨, 카페에서 노트북으로 여러 클라이언트 프로젝트 일정과 수익을 통합 관리
- 30대 워킹맘 정씨, 퇴근 후 집에서 아이 재우고 밤 시간 활용해 부업 매출 현황과 고객 관리

반드시 지켜야 할 규칙:
1. 질문 1줄만 작성
2. 빈 줄 1개
3. "예시:" (예: 아님!)
4. "-" 로 시작하는 5개 항목, 각 항목은 새 줄에 작성하며 구체적이고 상세하게 작성
5. 끝 (다른 내용 절대 추가 금지)

위 형식을 정확히 따라 ${userAnswers + 1}번째 질문을 생성하세요.`;

        const nextQuestion = await callGeminiAPI(prompt);
        setIsProcessing(false);

        if (nextQuestion) {
          setChatMessages([...newMessages, {
            type: 'ai',
            content: nextQuestion.trim(),
            questionIndex: userAnswers
          }]);
        }
      } else {
        const questions = generateQuestions();
        const nextQuestion = questions[userAnswers];
        if (nextQuestion) {
          setTimeout(() => {
            setChatMessages([...newMessages, {
              type: 'ai',
              content: nextQuestion.question,
              hint: nextQuestion.hint,
              questionIndex: userAnswers
            }]);
          }, AI_RESPONSE_DELAY);
        }
      }
    } else {
      setTimeout(() => {
        setChatMessages([...newMessages, {
          type: 'ai',
          content: '좋습니다! 충분한 정보를 수집했어요. 이제 아래 "다음" 버튼을 눌러주세요.'
        }]);
      }, AI_RESPONSE_DELAY);
    }
  };

  // Step 1 완료 후 Step 2(상세 정보)로 전환
  const generateDetailedInfo = async () => {
    setIsProcessing(true);
    setCurrentStep(2);

    // 기본 정보 요약 생성
    if (useRealAI && geminiApiKey) {
      // 질문과 답변을 페어로 추출
      const qaList = chatMessages
        .filter(m => m.type === 'ai' && m.questionIndex !== undefined)
        .map((aiMsg) => {
          const userAnswer = chatMessages.find(
            (m, i) => m.type === 'user' && i > chatMessages.indexOf(aiMsg)
          );
          return userAnswer ? `Q: ${aiMsg.content}\nA: ${userAnswer.content}` : null;
        })
        .filter(Boolean)
        .join('\n\n');

      const summaryPrompt = `다음은 PRD 생성을 위해 수집한 질문과 답변입니다:

${qaList}

위 질문과 답변을 바탕으로 프로젝트의 핵심 내용을 자연스럽게 한두 문장으로 요약해주세요.
질문의 맥락을 고려하여 답변의 의미를 정확하게 파악하고 요약해주세요.
예를 들어, "디자인 스타일" 질문에 "네이버"라고 답했다면 "네이버 디자인 스타일을 선호합니다"로 이해해주세요.
반드시 완전한 문장(~합니다, ~입니다 등)으로 끝맺음해주세요.`;

      const summary = await callGeminiAPI(summaryPrompt);
      if (summary) {
        setBasicInfoSummary(summary.trim());
      }
    } else {
      // 목업 데이터용 기본 요약
      setBasicInfoSummary('기본 정보 수집이 완료되었습니다.');
    }

    // Step 2의 첫 번째 질문 생성
    if (useRealAI && geminiApiKey) {
      const basicInfoQA = chatMessages
        .filter(m => m.type === 'ai' && m.questionIndex !== undefined)
        .map((aiMsg) => {
          const userAnswer = chatMessages.find(
            (m, i) => m.type === 'user' && i > chatMessages.indexOf(aiMsg)
          );
          return userAnswer ? `Q: ${aiMsg.content}\nA: ${userAnswer.content}` : null;
        })
        .filter(Boolean)
        .join('\n\n');

      const detailedPrompt = `[중요] 출력 형식을 절대 변경하지 마세요. 아래 형식만 사용하세요:

질문 내용

예시:
- 예시 항목 1
- 예시 항목 2
- 예시 항목 3

---

당신은 PRD 작성을 돕는 전문가입니다.

문제 상황:
"${problemDescription}"

기본 정보 수집 결과:
${basicInfoQA}

이제 UX/UI 설계 방법론을 활용하여 화면 구성에 대한 세부 정보를 수집해야 합니다.
첫 번째 상세 질문([User Journey] 사용자 여정)을 생성해주세요.

출력 예시 (이 형식을 정확히 따라하세요):
사용자가 앱을 열고 주요 목표를 달성하기까지 거치는 핵심 단계를 순서대로 설명해주세요.

예시:
- 1단계: 로그인 (소셜 로그인 3초 이내) → 개인화된 대시보드 자동 표시
- 2단계: 상단 '+새 작업' 버튼 클릭 → 작업 유형 선택 (빠른 입력/상세 입력)
- 3단계: 필수 정보 입력 (제목, 카테고리, 마감일) → 선택 정보는 나중에 추가 가능
- 4단계: '분석 시작' 버튼 클릭 → AI 자동 분석 진행 (3~5초)
- 5단계: 결과 화면에서 인사이트 확인 → 저장/공유/수정 중 선택
- 6단계: 공유 시 링크 자동 생성 → 카카오톡/이메일/슬랙 등으로 즉시 전송

반드시 지켜야 할 규칙:
1. 질문 1줄만 작성
2. 빈 줄 1개
3. "예시:" (예: 아님!)
4. "-" 로 시작하는 5~6개 항목, 각 항목은 새 줄에 작성하며 구체적이고 상세하게 작성
5. 끝 (다른 내용 절대 추가 금지)

위 형식을 정확히 따라 첫 번째 질문을 생성하세요.`;

      const firstDetailedQuestion = await callGeminiAPI(detailedPrompt);
      setIsProcessing(false);

      if (firstDetailedQuestion) {
        setDetailedChatMessages([
          {
            type: 'ai',
            content: '기본 정보 수집이 완료되었습니다! 이제 화면 구성에 대한 세부 정보를 수집하겠습니다.',
          },
          {
            type: 'ai',
            content: firstDetailedQuestion.trim(),
            questionIndex: 0
          }
        ]);
      }
    } else {
      setIsProcessing(false);
      const detailedQuestions = generateDetailedQuestions();
      const firstQuestion = detailedQuestions[0];
      if (firstQuestion) {
        setDetailedChatMessages([
          {
            type: 'ai',
            content: '기본 정보 수집이 완료되었습니다! 이제 화면 구성에 대한 세부 정보를 수집하겠습니다.',
          },
          {
            type: 'ai',
            content: firstQuestion.question,
            hint: firstQuestion.hint,
            questionIndex: 0
          }
        ]);
      }
    }
  };


  // Step 2: 상세 정보 채팅 입력 처리
  const handleDetailedChatSubmit = async () => {
    if (!detailedUserInput.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      type: 'user',
      content: detailedUserInput.trim()
    };

    const newMessages = [...detailedChatMessages, userMessage];
    setDetailedChatMessages(newMessages);
    setDetailedUserInput('');

    const userAnswers = newMessages.filter(m => m.type === 'user').length;

    if (userAnswers < REQUIRED_ANSWERS) {
      if (useRealAI && geminiApiKey) {
        setIsProcessing(true);

        const basicInfoQA = chatMessages
          .filter(m => m.type === 'ai' && m.questionIndex !== undefined)
          .map((aiMsg) => {
            const userAnswer = chatMessages.find(
              (m, i) => m.type === 'user' && i > chatMessages.indexOf(aiMsg)
            );
            return userAnswer ? `Q: ${aiMsg.content}\nA: ${userAnswer.content}` : null;
          })
          .filter(Boolean)
          .join('\n\n');

        const detailedConversationHistory = newMessages
          .map(m => `${m.type === 'user' ? '사용자' : 'AI'}: ${m.content}`)
          .join('\n');

        const nextDetailedPrompt = `[중요] 출력 형식을 절대 변경하지 마세요. 아래 형식만 사용하세요:

질문 내용

예시:
- 예시 항목 1
- 예시 항목 2
- 예시 항목 3

---

당신은 PRD 작성을 돕는 전문가입니다.

문제 상황:
"${problemDescription}"

기본 정보 수집 결과:
${basicInfoQA}

화면 구성 상세 정보 대화 내역:
${detailedConversationHistory}

사용자가 ${userAnswers}개의 상세 질문에 답변했습니다.
이제 대화 맥락을 고려하여 다음으로 가장 중요한 상세 질문 1개를 만들어주세요.
총 ${REQUIRED_ANSWERS}개 질문 중 ${userAnswers + 1}번째 질문입니다.

Visual Design & UX/UI 방법론 기반 질문 가이드 (${userAnswers + 1}번째):

1번째: [Reference App] 참고할 앱/웹사이트
   "이 서비스와 가장 비슷한 디자인 스타일의 앱/웹사이트는 무엇인가요? (레이아웃, 네비게이션, 전체적인 느낌을 참고합니다)

   예시:
   - 쿠팡: 밀집된 상품 그리드, 검색 중심, 쇼핑 최적화
   - 배달의민족: 넉넉한 여백, 큰 이미지/버튼, 편안한 느낌
   - 유튜브: 영상 썸네일 중심, 피드 스크롤, 간결한 헤더
   - 네이버: 정보 밀도 높음, 탭 구조, 검색 강조
   - 카카오톡: 심플하고 명확, 리스트 중심, 노란색 포인트
   - 토스: 미니멀, 큰 타이포, 카드 스타일, 금융 신뢰감
   - 노션: 문서 중심, 깔끔한 위계, 사이드바 네비게이션
   - 인스타그램: 이미지 중심, 그리드/피드, 하단 탭바
   - 당근마켓: 친근한 디자인, 카드 리스트, 커뮤니티 느낌
   - 에어비앤비: 큰 이미지, 세련됨, 여백 활용"

2번째: [Main Color] 메인 컬러
   "서비스의 메인 컬러(대표 색상)는 무엇인가요?

   예시:
   - 쿠팡 보라색 (#5F0080)
   - 배민 민트색 (#2AC1BC)
   - 네이버 초록색 (#03C75A)
   - 카카오 노란색 (#FEE500)
   - 토스 파란색 (#0064FF)
   - Instagram 그라데이션 (보라-핑크-오렌지)
   - 직접 입력 (예: #FF6B6B 또는 '밝은 주황색')
   - 참고 앱과 동일하게"

3번째: [Typography Style] 타이포그래피 스타일
   "텍스트 스타일(폰트, 크기, 굵기 등)은 어떤 느낌을 원하시나요?

   예시:
   - 토스: 크고 굵은 제목, 간결한 문장, 숫자 강조
   - 쿠팡: 가격 강조, 상품명 2줄, 작은 메타 정보
   - 노션: 문서 읽기 편한 위계, 명확한 제목 구분
   - 유튜브: 영상 제목 강조, 조회수/날짜는 작게 회색
   - 당근마켓: 친근한 폰트, 읽기 쉬운 크기
   - 네이버: 깔끔하고 기본적인 폰트, 정보 전달 중심
   - 참고 앱과 동일하게"

4번째: [Main Screens] 핵심 화면
   "사용자가 가장 자주 보는 핵심 화면 3개는 무엇인가요?

   예시:
   - 쿠팡: 홈(추천 상품), 검색 결과, 상품 상세
   - 배민: 홈(맛집 리스트), 가게 상세, 주문하기
   - 유튜브: 홈(피드), 영상 재생, 검색 결과
   - 토스: 홈(계좌 요약), 송금하기, 거래 내역
   - 노션: 워크스페이스 홈, 페이지 편집, 데이터베이스
   - 인스타그램: 피드, 스토리, 프로필"

5번째: [Navigation Pattern] 네비게이션 방식
   "화면 간 이동은 어떤 방식을 원하시나요?

   예시:
   - 하단 탭바 (인스타그램/유튜브): 홈/검색/알림/프로필 등 4-5개 주요 메뉴
   - 좌측 사이드바 (노션/Gmail): 카테고리/폴더 구조, 데스크톱 중심
   - 상단 탭 (네이버/카카오톡): 뉴스/스포츠/엔터 등 콘텐츠 분류
   - 햄버거 메뉴 (드로어): 좌측 상단 메뉴 버튼, 서브 메뉴 많을 때
   - 풀 스크린 (배민/토스): 화면 전환 시 전체 화면, 뒤로가기 버튼
   - 참고 앱과 동일하게"

6번째: [Key Interactions] 주요 인터랙션
   "사용자의 주요 행동(버튼 클릭, 스크롤 등)은 무엇인가요?

   예시:
   - 검색 중심: 상단 검색창, 자동완성, 필터링
   - 스크롤 피드: 무한 스크롤, 당겨서 새로고침
   - 카드 선택: 리스트에서 항목 클릭 → 상세 화면
   - 입력 폼: 여러 필드 작성 → 저장/제출
   - 좋아요/공유: 소셜 기능, 북마크, 댓글
   - 지도 탐색: 위치 검색, 핀 클릭, 경로 안내
   - 미디어 재생: 영상/오디오 플레이어, 재생목록"

출력 예시 (이 형식을 정확히 따라하세요):
사용자가 앱을 열고 주요 목표를 달성하기까지 거치는 핵심 단계를 순서대로 설명해주세요.

예시:
- 1단계: 로그인 (소셜 로그인 3초 이내) → 개인화된 대시보드 자동 표시
- 2단계: 상단 '+새 작업' 버튼 클릭 → 작업 유형 선택 (빠른 입력/상세 입력)
- 3단계: 필수 정보 입력 (제목, 카테고리, 마감일) → 선택 정보는 나중에 추가 가능
- 4단계: '분석 시작' 버튼 클릭 → AI 자동 분석 진행 (3~5초)
- 5단계: 결과 화면에서 인사이트 확인 → 저장/공유/수정 중 선택
- 6단계: 공유 시 링크 자동 생성 → 카카오톡/이메일/슬랙 등으로 즉시 전송

반드시 지켜야 할 규칙:
1. 질문 1줄만 작성
2. 빈 줄 1개
3. "예시:" (예: 아님!)
4. "-" 로 시작하는 5~6개 항목, 각 항목은 새 줄에 작성하며 구체적이고 상세하게 작성
5. 끝 (다른 내용 절대 추가 금지)

위 형식을 정확히 따라 ${userAnswers + 1}번째 질문을 생성하세요.`;

        const nextQuestion = await callGeminiAPI(nextDetailedPrompt);
        setIsProcessing(false);

        if (nextQuestion) {
          setDetailedChatMessages([...newMessages, {
            type: 'ai',
            content: nextQuestion.trim(),
            questionIndex: userAnswers
          }]);
        }
      } else {
        const detailedQuestions = generateDetailedQuestions();
        const nextQuestion = detailedQuestions[userAnswers];
        if (nextQuestion) {
          setTimeout(() => {
            setDetailedChatMessages([...newMessages, {
              type: 'ai',
              content: nextQuestion.question,
              hint: nextQuestion.hint,
              questionIndex: userAnswers
            }]);
          }, AI_RESPONSE_DELAY);
        }
      }
    } else {
      setTimeout(() => {
        setDetailedChatMessages([...newMessages, {
          type: 'ai',
          content: '화면 구성에 대한 정보를 충분히 수집했습니다! 이제 "다음" 버튼을 눌러주세요.'
        }]);
      }, AI_RESPONSE_DELAY);
    }
  };

  // Step 2 → Step 3: AI가 디자인 시스템 보정
  const enrichDesignWithAI = async () => {
    console.log('🎨 AI 디자인 보정 시작...');

    const userAnswers = detailedChatMessages.filter(m => m.type === 'user');

    // 6개 답변 추출
    const referenceApp = userAnswers[0]?.content || '';
    const mainColor = userAnswers[1]?.content || '';
    const typography = userAnswers[2]?.content || '';
    const mainScreens = userAnswers[3]?.content || '';
    const navigation = userAnswers[4]?.content || '';
    const interactions = userAnswers[5]?.content || '';

    // 참고 앱별 디자인 가이드
    const referenceAppGuides: Record<string, string> = {
      "쿠팡": `
- 메인 컬러: 보라색 계열 (#5F0080)
- 버튼: 둥근 모서리 8px, 그림자 없음, 굵은 텍스트
- 카드: 흰 배경, 1px 회색 테두리, 상품 이미지 위쪽
- 레이아웃: 밀집된 2열 그리드, 효율적 공간 활용
- 타이포: 가격 강조(크고 빨간색), 상품명 2줄 제한
- 네비게이션: 하단 탭바 (홈/카테고리/마이페이지)`,

      "배달의민족": `
- 메인 컬러: 민트색 (#2AC1BC)
- 버튼: 큰 라운드(12px), 넉넉한 패딩, 친근한 텍스트
- 카드: 흰 배경, 그림자, 큰 이미지 상단
- 레이아웃: 넉넉한 여백, 1열 리스트, 편안한 느낌
- 타이포: 친근한 폰트, 읽기 쉬운 크기
- 네비게이션: 상단 탭 + 하단 플로팅 버튼`,

      "유튜브": `
- 메인 컬러: 빨간색 (#FF0000)
- 버튼: 구독 버튼 강조, 플레이 버튼
- 카드: 썸네일 중심, 16:9 비율, 제목 2줄
- 레이아웃: 그리드 (모바일 1열, 데스크톱 3-4열)
- 타이포: 영상 제목 강조, 메타 정보는 작고 회색
- 네비게이션: 좌측 사이드바 + 상단 검색`,

      "토스": `
- 메인 컬러: 파란색 (#0064FF)
- 버튼: 매우 큰 라운드(16px), 넉넉한 패딩, 굵은 텍스트
- 카드: 흰 배경, 미세한 그림자, 큰 숫자 강조
- 레이아웃: 넉넉한 여백, 1열, 한 화면에 하나의 액션
- 타이포: 매우 굵은 제목(32px Bold), 간결한 본문
- 네비게이션: 풀 스크린 화면 전환, 뒤로가기`,

      "네이버": `
- 메인 컬러: 초록색 (#03C75A)
- 버튼: 심플, 명확한 레이블
- 카드: 정보 밀도 높음, 얇은 구분선
- 레이아웃: 탭 구조, 많은 정보를 효율적으로 배치
- 타이포: 깔끔한 기본 폰트, 정보 전달 중심
- 네비게이션: 상단 탭 + 햄버거 메뉴`,

      "카카오": `
- 메인 컬러: 노란색 (#FEE500)
- 버튼: 노란 배경, 검정 텍스트, 심플
- 카드: 흰 배경, 깔끔한 구분선
- 레이아웃: 심플하고 명확한 구조
- 타이포: 깔끔하고 가독성 높음
- 네비게이션: 하단 탭바, 명확한 아이콘`,

      "노션": `
- 메인 컬러: 화이트/그레이 톤
- 버튼: 미니멀, 아이콘 중심
- 카드: 블록 구조, 드래그 앤 드롭
- 레이아웃: 문서 중심, 깊은 계층 구조
- 타이포: 문서 읽기 최적화, 명확한 위계
- 네비게이션: 좌측 사이드바, 폴더 구조`,

      "인스타그램": `
- 메인 컬러: 그라데이션 (보라-핑크-오렌지)
- 버튼: 플로팅 버튼, 아이콘 중심
- 카드: 정사각형 그리드, 이미지 중심
- 레이아웃: 피드 스크롤, 1:1 비율 이미지
- 타이포: 간결, 이미지가 주인공
- 네비게이션: 하단 탭바 (홈/검색/릴스/프로필)`,

      "당근마켓": `
- 메인 컬러: 주황색 (#FF6F0F)
- 버튼: 둥근 모서리, 친근한 느낌
- 카드: 흰 배경, 썸네일 좌측, 제목/가격 우측
- 레이아웃: 리스트 중심, 지역 정보 강조
- 타이포: 친근한 폰트, 가격 강조
- 네비게이션: 하단 탭바 (홈/동네생활/채팅/나의당근)`,

      "에어비앤비": `
- 메인 컬러: 핑크/레드 (#FF385C)
- 버튼: 둥근 모서리, 심플
- 카드: 큰 이미지, 세련된 그림자
- 레이아웃: 이미지 중심, 넉넉한 여백
- 타이포: 세련되고 미니멀
- 네비게이션: 상단 검색 + 필터`
    };

    // 참고 앱 키워드 추출
    let appGuide = '';
    for (const [appName, guide] of Object.entries(referenceAppGuides)) {
      if (referenceApp.includes(appName)) {
        appGuide = guide;
        break;
      }
    }

    const enrichPrompt = `
사용자가 선택한 디자인 정보:
- 참고 앱: ${referenceApp}
- 메인 컬러: ${mainColor}
- 타이포그래피: ${typography}
- 핵심 화면: ${mainScreens}
- 네비게이션: ${navigation}
- 주요 인터랙션: ${interactions}

${appGuide ? `참고 앱(${referenceApp})의 디자인 가이드:\n${appGuide}` : ''}

위 정보를 바탕으로 개발자가 바로 구현할 수 있는 구체적인 디자인 시스템을 생성해주세요.

**출력 형식 (반드시 이 형식을 따르세요):**

## 색상 시스템
- Primary (메인): ${mainColor.includes('#') || mainColor.includes('동일') ? mainColor : '[사용자가 선택한 색상을 hex 코드로 변환]'}
- Secondary (보조): [Primary를 기반으로 보조 색상 생성]
- Success: #10B981 (완료/성공)
- Warning: #F59E0B (경고)
- Error: #EF4444 (오류/삭제)
- Background: #F9FAFB (배경)
- Text: #1F2937 (본문), #6B7280 (부가정보)

## 타이포그래피
- Heading 1: [크기]px [굵기] (예: 28px Bold)
- Heading 2: [크기]px [굵기] (예: 24px SemiBold)
- Heading 3: [크기]px [굵기] (예: 20px SemiBold)
- Body: [크기]px Regular (예: 16px Regular)
- Caption: [크기]px Regular (예: 14px Regular)
- 폰트 설명: [참고 앱 스타일 설명]

## 버튼 스타일
- Primary 버튼: [배경색], [텍스트색], [라운드 크기], [패딩], [그림자 여부]
- Secondary 버튼: [스타일]
- Ghost 버튼: [스타일]

## 카드 컴포넌트
- 배경: [색상]
- 테두리: [두께]px [색상] 또는 없음
- 라운드: [크기]px
- 그림자: [설명]
- 내부 패딩: [크기]px
- 구성: [이미지 위치], [텍스트 레이아웃]

## 입력 필드
- 배경: [색상]
- 테두리: [스타일]
- 라운드: [크기]px
- 포커스 시: [변화]

## 레이아웃 시스템
- 그리드: 모바일 [열]열, 태블릿 [열]열, 데스크톱 [열]열
- 여백 단위: [기준]px (예: 4px, 8px, 16px, 24px, 32px)
- 컨테이너 최대 너비: [크기]px
- 화면 좌우 패딩: 모바일 [크기]px, 데스크톱 [크기]px

## 핵심 화면별 구성
${mainScreens.split('\n').map((screen: string) => `
### ${screen.replace(/^-\s*/, '')}
- 상단: [구성요소]
- 중앙: [구성요소]
- 하단: [구성요소]
- 주요 액션: [버튼/인터랙션]
`).join('\n')}

## 네비게이션
${navigation}
- 구현 방식: [구체적 설명]
- 메뉴 구성: [항목들]

## 인터랙션
${interactions.split('\n').map((interaction: string) => `
${interaction}
- 동작 방식: [구체적 설명]
`).join('\n')}

**중요**:
1. 모든 색상은 hex 코드로 명시
2. 모든 크기는 px 단위로 명시
3. ${referenceApp}의 디자인 패턴을 최대한 반영
4. 개발자가 바로 코드를 작성할 수 있을 정도로 구체적으로 작성`;

    try {
      const enrichedDesign = await callGeminiAPI(enrichPrompt);

      if (enrichedDesign) {
        setEnrichedDesignSystem(enrichedDesign);
        console.log('✅ 디자인 시스템 보정 완료');
        return enrichedDesign;
      }
    } catch (error) {
      console.error('❌ 디자인 보정 실패:', error);
    }

    return '';
  };

  // Step 3: 이터레이션 계획 생성
  const generateIterationPlan = async () => {
    setIsProcessing(true);
    setProgress(0);
    setIterationPlan(''); // 이전 데이터 초기화
    setIterationSummary(''); // 이전 요약 초기화
    setCurrentStep(3); // Step 3으로 먼저 전환
    setModificationHistory([]); // 수정 기록 초기화
    setModificationRequest('');

    // Step 3 화면에서 AI 디자인 보정 수행
    console.log('🎨 AI 디자인 보정 시작...');
    setProgress(5);
    await enrichDesignWithAI();

    setProgress(10);
    console.log('🤖 이터레이션 계획 생성 시작...');

    if (useRealAI && geminiApiKey) {
      setProgress(15);
      const basicInfoAnswers = chatMessages
        .filter(m => m.type === 'user')
        .map((m, i) => `질문 ${i + 1} 답변: ${m.content}`)
        .join('\n');

      const detailedInfoAnswers = detailedChatMessages
        .filter(m => m.type === 'user')
        .map((m, i) => `상세 질문 ${i + 1} 답변: ${m.content}`)
        .join('\n');

      setProgress(20);
      const prompt = `당신은 Agile 방법론 전문가이자 PRD 작성 전문가입니다.
다음 정보를 바탕으로 Agile Iteration Planning 방식으로 3단계 이터레이션 계획을 작성해주세요.

## Agile Iteration Planning 방법론 가이드:
- **점진적 가치 전달**: 각 이터레이션마다 사용자에게 실질적 가치를 제공하는 완성된 기능 포함
- **우선순위 기반 개발**: MVP(이터레이션 1) → 핵심 기능 확장(이터레이션 2) → 고급 기능/최적화(이터레이션 3)
- **입력-처리-출력-검수 구조**: 각 이터레이션의 명확한 범위와 산출물 정의
- **측정 가능한 목표**: 각 이터레이션마다 구체적이고 검증 가능한 완료 기준 설정
- **점진적 복잡도 증가**: 간단한 기능부터 시작하여 점차 복잡한 기능 추가

문제 상황:
${problemDescription}

기본 정보 (Step 1 - Design Thinking):
${basicInfoAnswers}

화면 구성 상세 정보 (Step 2 - UX/UI 설계):
${detailedInfoAnswers}

${enrichedDesignSystem ? `\n구체화된 디자인 시스템 (AI 보정):\n${enrichedDesignSystem}\n` : ''}

다음 형식으로 Agile 방법론에 따라 작성해주세요:

# 3단계 이터레이션 계획 (Agile Iteration Planning)

## 전체 개요
[프로젝트의 전체 목표와 3단계 이터레이션을 통한 점진적 발전 방향]

## 이터레이션 1: MVP (Minimum Viable Product)
**목표**: 핵심 가치를 제공하는 최소 기능 세트 구현 (2-3주 예상)

### 입력
- [사용자 입력 방식과 데이터 구조를 구체적으로 명시]
- [필수 입력 필드와 선택 필드 구분]
- [입력 검증 규칙]

### 처리
- [핵심 비즈니스 로직]
- [데이터 처리 흐름]
- [사용할 기술 스택과 라이브러리]

### 출력
- [UI 화면 구성과 시각적 요소]
- [사용자에게 표시되는 결과 형태]
- [피드백 메커니즘]

### 검수
- [ ] [구체적인 테스트 항목 1]
- [ ] [구체적인 테스트 항목 2]
- [ ] [구체적인 테스트 항목 3]
- [ ] [성능 기준: 응답 시간, 동시 사용자 수 등]

**완료 기준**: [이터레이션 1이 성공적으로 완료되었다고 판단할 수 있는 명확한 기준]

## 이터레이션 2: 핵심 기능 확장
**목표**: MVP에서 검증된 가치를 확장하고 사용자 경험 개선 (2-3주 예상)

### 입력
[이터레이션 1 대비 추가/개선되는 입력 방식]

### 처리
[추가 기능과 고도화된 처리 로직]

### 출력
[향상된 UI/UX와 추가 기능]

### 검수
- [ ] [이터레이션 1 기능 정상 동작 확인]
- [ ] [새로운 기능 테스트 항목]
- [ ] [통합 테스트 항목]

**완료 기준**: [이터레이션 2 완료 기준]

## 이터레이션 3: 고급 기능 및 최적화
**목표**: 자동화, 협업, 성능 최적화로 서비스 완성도 극대화 (2-3주 예상)

### 입력
[최적화되고 자동화된 입력 방식]

### 처리
[고급 기능, 자동화, 최적화]

### 출력
[완성된 UI/UX, 협업 기능, 리포팅]

### 검수
- [ ] [전체 기능 통합 테스트]
- [ ] [성능 및 부하 테스트]
- [ ] [사용자 경험 테스트]
- [ ] [보안 및 데이터 무결성 테스트]

**완료 기준**: [이터레이션 3 및 전체 프로젝트 완료 기준]

## 위험 요소 및 대응 방안
- [기술적 위험과 대응책]
- [일정 지연 위험과 대응책]
- [범위 변경 관리 방안]

각 이터레이션은 독립적으로 배포 가능하고 사용자에게 가치를 전달할 수 있어야 합니다.`;

      setProgress(20);
      // AI 호출 중 실시간 진행률 업데이트 (스트리밍)
      const result = await callGeminiAPI(prompt, (streamProgress) => {
        // 20%에서 시작해서 스트리밍 진행률을 20~60% 범위로 매핑
        const mappedProgress = 20 + (streamProgress * 0.4);
        setProgress(Math.floor(mappedProgress));
      });

      setProgress(65);
      if (result) {
        setIterationPlan(result);

        // AI에게 요약 생성 요청
        setProgress(70);
        const summaryPrompt = `다음 이터레이션 계획을 3개 이터레이션별로 각각 2-3문장으로 간결하게 요약해주세요.

**중요**: 반드시 아래 형식을 정확히 따라주세요. 각 이터레이션 사이에 빈 줄(\\n\\n)을 넣어주세요.

이터레이션 1: [제목] - [2-3문장으로 핵심 기능과 목표를 요약]

이터레이션 2: [제목] - [2-3문장으로 핵심 기능과 목표를 요약]

이터레이션 3: [제목] - [2-3문장으로 핵심 기능과 목표를 요약]

예시:
이터레이션 1: 핵심 기능 구현 (MVP) - 텍스트 기반 입력 폼과 필수 필드 검증을 구현합니다. 입력 데이터를 파싱하여 목록/테이블로 표시하며, 정상 입력 시 3초 이내 결과 표시를 목표로 합니다.

이터레이션 2: 고급 기능 추가 - 파일 업로드와 드래그 앤 드롭을 지원하고, 고급 데이터 분석 및 차트 시각화를 제공합니다. 1,000행 데이터를 10초 이내 처리하며 다운로드 기능을 포함합니다.

이터레이션 3: 협업 및 자동화 - 실시간 협업 기능과 자동 데이터 수집을 구현합니다. 통합 대시보드와 알림 시스템으로 팀 협업을 강화하며, 동시 접속 100명 이상을 목표로 합니다.

이터레이션 계획:
${result}`;

        setProgress(70);
        // 요약 생성 중 실시간 진행률 업데이트 (스트리밍)
        const summaryResult = await callGeminiAPI(summaryPrompt, (streamProgress) => {
          // 70%에서 시작해서 스트리밍 진행률을 70~90% 범위로 매핑
          const mappedProgress = 70 + (streamProgress * 0.2);
          setProgress(Math.floor(mappedProgress));
        });
        setProgress(95);
        if (summaryResult) {
          setIterationSummary(summaryResult);
        }
      }

      setProgress(100);
      setIsProcessing(false);
    } else {
      setTimeout(() => {
        const plan = `# 3단계 이터레이션 계획

## 이터레이션 1: 핵심 기능 구현 (MVP)

### 입력
- 텍스트 기반 간단한 입력 폼
- 필수 필드 검증

### 처리
- 입력 데이터 파싱 및 구조화
- 기본 유효성 검증

### 출력
- 목록/테이블 형태로 결과 표시
- 로딩 상태 및 에러 메시지

### 검수
- ✅ 정상 입력 시 3초 이내 결과 표시
- ✅ 잘못된 입력 시 명확한 에러 메시지

---

## 이터레이션 2: 고급 기능 추가

### 입력
- 파일 업로드 (CSV, Excel)
- 드래그 앤 드롭 지원

### 처리
- 고급 데이터 분석
- 데이터 정제 및 변환

### 출력
- 차트 시각화
- PDF/Excel 다운로드

### 행동
- 결과 다운로드
- 이메일 공유

### 검수
- ✅ 1,000행 데이터 10초 이내 처리
- ✅ 다양한 파일 형식 호환

---

## 이터레이션 3: 협업 및 자동화

### 입력
- 실시간 협업 기능
- 자동 데이터 수집

### 처리
- AI 기반 인사이트
- 실시간 동기화

### 출력
- 통합 대시보드
- 알림 시스템

### 행동
- 팀 협업 기능
- 외부 도구 연동

### 검수
- ✅ 동시 접속 100명 이상
- ✅ 실시간 동기화 1초 이내`;

        setIterationPlan(plan);

        // Mock 모드 요약
        const mockSummary = `이터레이션 1: 핵심 기능 구현 (MVP) - 텍스트 기반 입력 폼과 필수 필드 검증을 구현하고, 입력 데이터를 파싱하여 목록/테이블로 표시합니다. 정상 입력 시 3초 이내 결과 표시를 목표로 합니다.

이터레이션 2: 고급 기능 추가 - 파일 업로드(CSV, Excel)와 드래그 앤 드롭을 지원하고, 고급 데이터 분석 및 차트 시각화를 제공합니다. 1,000행 데이터를 10초 이내 처리하며 PDF/Excel 다운로드와 이메일 공유 기능을 포함합니다.

이터레이션 3: 협업 및 자동화 - 실시간 협업 기능과 자동 데이터 수집을 구현하고, AI 기반 인사이트를 제공합니다. 통합 대시보드와 알림 시스템으로 팀 협업을 강화하며, 동시 접속 100명 이상과 실시간 동기화 1초 이내를 목표로 합니다.`;

        setIterationSummary(mockSummary);
        setIsProcessing(false);
      }, MOCK_PROCESSING_DELAY);
    }
  };

  // Step 4: 사용자 스토리 생성
  const generateUserStories = async () => {
    setIsProcessing(true);
    setProgress(0);
    setUserStories(''); // 이전 데이터 초기화
    setCurrentStep(4); // 즉시 Step 4로 전환
    setModificationHistory([]); // 수정 기록 초기화
    setModificationRequest('');
    console.log('🤖 사용자 스토리 생성 시작...');

    if (useRealAI && geminiApiKey) {
      setProgress(10);
      const basicInfoAnswers = chatMessages
        .filter(m => m.type === 'user')
        .map((m, i) => `질문 ${i + 1} 답변: ${m.content}`)
        .join('\n');

      const detailedInfoAnswers = detailedChatMessages
        .filter(m => m.type === 'user')
        .map((m, i) => `상세 질문 ${i + 1} 답변: ${m.content}`)
        .join('\n');

      const prompt = `당신은 User Story & Acceptance Criteria 방법론 전문가이자 PRD 작성 전문가입니다.
다음 정보를 바탕으로 이터레이션 1용 사용자 스토리를 작성해주세요.

## User Story & Acceptance Criteria 방법론 가이드:
- **사용자 중심 스토리**: "As a [역할], I want to [기능], So that [가치]" 형식으로 사용자 관점에서 작성
- **구체적인 시나리오**: 실제 사용자가 겪을 상황을 스토리로 구체화
- **측정 가능한 인수 기준**: 각 스토리마다 명확하고 검증 가능한 완료 조건 정의
- **Given-When-Then 형식 활용**: 필요시 "Given [상황], When [행동], Then [결과]" 형식으로 시나리오 작성
- **독립성과 완결성**: 각 스토리는 독립적으로 개발/테스트 가능해야 함
- **비즈니스 가치 중심**: 기술 구현이 아닌 사용자가 얻는 가치에 집중

문제 상황:
${problemDescription}

기본 정보 (Step 1 - Design Thinking):
${basicInfoAnswers}

화면 구성 상세 정보 (Step 2 - UX/UI 설계):
${detailedInfoAnswers}

${enrichedDesignSystem ? `\n구체화된 디자인 시스템 (AI 보정):\n${enrichedDesignSystem}\n` : ''}

이터레이션 계획:
${iterationPlan}

다음 형식으로 최소 5개의 사용자 스토리를 작성해주세요:

# 사용자 스토리 (이터레이션 1 - MVP)

## 스토리 1: [명확하고 구체적인 제목]
**As a** [구체적인 사용자 역할/페르소나]
**I want to** [구체적으로 원하는 기능]
**So that** [얻고자 하는 비즈니스 가치/효과]

**시나리오:**
[실제 사용자가 이 기능을 사용하는 구체적인 상황을 스토리텔링]
- 사용자의 상황 (시간, 장소, 동기)
- 수행하는 액션
- 기대하는 결과

**인수 기준 (Acceptance Criteria):**
- [ ] [측정 가능하고 검증 가능한 기준 1]
- [ ] [측정 가능하고 검증 가능한 기준 2]
- [ ] [측정 가능하고 검증 가능한 기준 3]
- [ ] [성능 기준: 응답시간, 처리량 등]
- [ ] [사용성 기준: 클릭 수, 소요 시간 등]

**우선순위**: High/Medium/Low
**예상 작업 크기**: S/M/L (또는 스토리 포인트)

## 스토리 2: [제목]
[위와 동일한 구조]

## 스토리 3: [제목]
[위와 동일한 구조]

## 스토리 4: [제목]
[위와 동일한 구조]

## 스토리 5: [제목]
[위와 동일한 구조]

## Given-When-Then 시나리오 (선택적으로 주요 스토리에 추가)
**Given** [초기 상황/전제 조건]
**When** [사용자가 수행하는 행동]
**Then** [시스템의 반응/결과]

각 스토리는 이터레이션 1의 MVP 범위에 포함되며, 독립적으로 개발/배포 가능해야 합니다.
모든 스토리는 실제 사용자 가치를 제공하고 테스트 가능한 인수 기준을 포함해야 합니다.`;

      setProgress(20);
      // AI 호출 중 실시간 진행률 업데이트 (스트리밍)
      const result = await callGeminiAPI(prompt, (streamProgress) => {
        // 20%에서 시작해서 스트리밍 진행률을 20~90% 범위로 매핑
        const mappedProgress = 20 + (streamProgress * 0.7);
        setProgress(Math.floor(mappedProgress));
      });
      setProgress(100);
      setIsProcessing(false);

      if (result) {
        setUserStories(result);
      }
    } else {
      setTimeout(() => {
        const stories = `# 사용자 스토리 (이터레이션 1 - MVP)

## 스토리 1: 신규 사용자의 첫 업무 등록
**As a** 처음 서비스를 사용하는 직장인
**I want to** 복잡한 설명 없이 첫 화면에서 바로 작업을 시작할 수 있다
**So that** 5분 안에 원하는 결과를 얻고 업무에 바로 활용할 수 있다

**시나리오:**
김대리는 오전 9시 30분, 상사로부터 급하게 데이터 정리 요청을 받았다.
처음 사용하는 도구지만, 메인 화면의 "시작하기" 버튼을 누르자
간단한 3단계 입력 폼이 나타났고, 각 필드마다 실제 예시가 표시되어
별도의 매뉴얼 없이도 2분 만에 데이터를 입력하고 결과를 받았다.

**인수 기준:**
- [ ] 회원가입 없이 바로 사용 가능
- [ ] 첫 화면 진입 후 3클릭 이내에 작업 시작
- [ ] 각 입력 필드에 실제 사용 예시 표시
- [ ] 필수/선택 필드가 아이콘으로 명확히 구분됨
- [ ] 입력 중 실시간으로 형식 오류 체크 및 안내
- [ ] 전체 프로세스가 5분 이내 완료 가능

## 스토리 2: 급한 회의 전 데이터 확인
**As a** 30분 후 보고 회의를 앞둔 팀장
**I want to** 처리 결과를 한눈에 파악하고 즉시 다운로드할 수 있다
**So that** 회의 자료로 바로 사용하고 팀원들과 공유할 수 있다

**시나리오:**
박팀장은 오후 2시 회의를 앞두고 1시 50분에 긴급 데이터 분석이 필요했다.
시스템에서 처리된 결과는 핵심 지표가 상단에 강조 표시되고,
세부 데이터는 정렬 가능한 테이블로 제공되었다.
"Excel 다운로드" 버튼 한 번으로 회의 자료를 완성하고,
공유 링크를 복사해 팀원들에게 Slack으로 전달했다.

**인수 기준:**
- [ ] 처리 완료 시 상단에 핵심 요약 3가지 자동 표시
- [ ] 결과 테이블에서 정렬, 필터링 기능 제공
- [ ] 중요 수치는 색상과 크기로 시각적 강조
- [ ] Excel, PDF, CSV 형식으로 1클릭 다운로드
- [ ] 공유 가능한 읽기 전용 링크 생성 (24시간 유효)
- [ ] 모바일에서도 결과 확인 및 다운로드 가능

## 스토리 3: 데이터 입력 실수 후 빠른 복구
**As a** 대용량 데이터를 다루는 실무자
**I want to** 입력 오류가 발생해도 어디가 문제인지 명확히 알고 쉽게 수정할 수 있다
**So that** 처음부터 다시 하지 않고 문제 부분만 고쳐서 작업을 완료할 수 있다

**시나리오:**
이사원은 100줄짜리 CSV 파일을 업로드했는데 "23번째 줄 오류" 메시지가 떴다.
시스템은 자동으로 23번 줄을 하이라이트하고, "날짜 형식: YYYY-MM-DD"라는
구체적인 안내와 함께 "2024-01-15" 같은 올바른 예시를 보여줬다.
해당 줄만 수정하고 "다시 시도" 버튼을 눌러 나머지 99줄의 데이터는
유지한 채 작업을 완료했다.

**인수 기준:**
- [ ] 오류 발생 시 정확한 위치(줄/필드명) 표시
- [ ] 오류 원인을 한글로 명확히 설명 (전문 용어 최소화)
- [ ] 올바른 입력 예시를 함께 제공
- [ ] 문제 필드만 빨간색 테두리로 강조
- [ ] 오류가 있는 줄만 수정 가능, 나머지 데이터 보존
- [ ] "자주 발생하는 실수" 가이드 툴팁 제공
- [ ] 수정 후 해당 부분만 재검증 (전체 재업로드 불필요)

## 스토리 4: 반복 작업 시간 단축
**As a** 매일 비슷한 작업을 반복하는 운영자
**I want to** 이전 작업 설정을 저장하고 재사용할 수 있다
**So that** 매번 같은 내용을 입력하지 않고 1분 만에 작업을 완료할 수 있다

**시나리오:**
최주임은 매일 오전 10시 동일한 형식의 일일 보고서를 작성한다.
처음 작업 시 "이 설정 저장하기"를 체크했더니, 다음날부터는
"어제 작업 불러오기" 버튼이 생겼다. 클릭 한 번으로 모든 설정이
자동 입력되고, 변경된 데이터만 업데이트해서 작업 시간이
15분에서 1분으로 단축되었다.

**인수 기준:**
- [ ] 작업 완료 시 "설정 저장" 옵션 제공
- [ ] 저장된 작업 목록을 이름으로 관리 (최대 10개)
- [ ] 저장된 작업 불러오기 시 모든 입력값 자동 채움
- [ ] 불러온 후에도 개별 필드 수정 가능
- [ ] 최근 사용한 작업 3개를 메인 화면에 바로가기 표시
- [ ] "매일 반복" 옵션으로 자동 실행 예약 가능

## 스토리 5: 모바일에서 긴급 작업 처리
**As a** 외근 중인 영업 담당자
**I want to** 이동 중에도 스마트폰으로 간단한 작업을 완료할 수 있다
**So that** 사무실로 돌아가지 않아도 고객 요청에 즉시 대응할 수 있다

**시나리오:**
정과장은 고객 미팅 직후 카페에서 고객이 요청한 데이터를 확인해야 했다.
스마트폰으로 접속하니 PC와 동일한 기능이 터치에 최적화된 UI로 제공되었다.
손가락으로 간단히 입력하고, 결과를 즉시 확인한 뒤
고객 이메일로 공유 링크를 전송해 계약을 성사시켰다.

**인수 기준:**
- [ ] 모바일 화면 크기에 맞춘 반응형 레이아웃
- [ ] 터치 입력에 최적화된 버튼 크기 (최소 44x44px)
- [ ] 모바일에서 파일 업로드 및 카메라 촬영 지원
- [ ] 세로/가로 모드 모두 지원
- [ ] 작은 화면에서도 가독성 유지 (글자 크기 자동 조정)
- [ ] 오프라인 상태에서도 입력 내용 임시 저장
- [ ] 모바일 브라우저 알림으로 처리 완료 시 푸시`;

        setUserStories(stories);
        setIsProcessing(false);
      }, MOCK_PROCESSING_DELAY);
    }
  };

  // Step 5: 최종 PRD 생성
  const generateFinalPRD = async () => {
    setIsProcessing(true);
    setProgress(0);
    setFinalPRD(''); // 이전 데이터 초기화
    setPrdSummary(''); // 이전 요약 초기화
    setCurrentStep(5); // 즉시 Step 5로 전환
    setModificationHistory([]); // 수정 기록 초기화
    setModificationRequest('');
    console.log('🤖 최종 PRD 생성 시작...');

    if (useRealAI && geminiApiKey) {
      setProgress(5);
      const basicInfoAnswers = chatMessages
        .filter(m => m.type === 'user')
        .map((m, i) => `질문 ${i + 1} 답변: ${m.content}`)
        .join('\n');

      const detailedInfoAnswers = detailedChatMessages
        .filter(m => m.type === 'user')
        .map((m, i) => `상세 질문 ${i + 1} 답변: ${m.content}`)
        .join('\n');

      const prompt = `당신은 PRD Documentation Best Practice 전문가입니다.
다음 모든 정보를 통합하여 업계 표준에 부합하는 완벽한 PRD를 작성해주세요.

## ⚠️ 핵심 지시사항:
**절대로 플레이스홀더([브랜드 메인 컬러 hex코드], [구체적인 프로젝트명] 같은 대괄호 표현)를 그대로 출력하지 마세요!**
**모든 섹션은 아래 제공된 Step 0~4의 실제 사용자 답변 내용으로 채워야 합니다.**

각 PRD 섹션 작성 시 반드시 다음 매핑을 따르세요:
- **섹션 2-4 (프로젝트 개요/문제 정의/해결 방안)**: Step 0 문제 설명 + Step 1의 6가지 Design Thinking 답변
- **섹션 7 (기능 요구사항)**: Step 3 이터레이션 계획 + Step 4 사용자 스토리
- **섹션 8-9 (비기능 요구사항/기술 스택)**: Step 1 페르소나 + Step 2 디자인 요구사항
- **섹션 10 (주요 화면 구성)**: Step 2의 User Journey, Information Architecture, Wireflow
- **섹션 11 (화면 구현 명세)**: Step 2의 14가지 디자인 답변을 CSS/컴포넌트 명세로 변환
- **섹션 12-15 (데이터/API/보안/성능)**: Step 2 Data Input/Display + Step 4 사용자 스토리
- **섹션 17-21 (테스트/출시/KPI/위험/로드맵)**: Step 1 성공 지표 + Step 3 이터레이션 + Step 4 Acceptance Criteria

## PRD Documentation Best Practice 가이드:
- **명확한 구조**: 목차를 통한 체계적 정보 구성, 독자가 필요한 정보를 빠르게 찾을 수 있도록
- **SMART 원칙**: Specific(구체적), Measurable(측정 가능), Achievable(달성 가능), Relevant(관련성), Time-bound(기한 명시)
- **완전성**: 개발자, 디자이너, QA, PM 등 모든 이해관계자가 필요로 하는 정보 포함
- **실행 가능성**: 추상적 개념이 아닌 실제 구현 가능한 구체적 명세
- **추적 가능성**: 요구사항과 구현 사항의 명확한 매핑
- **우선순위**: 기능의 중요도와 구현 순서 명시

---

문제 상황 (Step 0):
${problemDescription}

---

기본 정보 (Step 1 - Design Thinking 6가지 질문):
${basicInfoAnswers}

---

화면 구성 상세 정보 (Step 2 - Visual Design & UX/UI 설계 6가지 질문):
${detailedInfoAnswers}

---

${enrichedDesignSystem ? `구체화된 디자인 시스템 (AI 보정 - 개발자가 바로 구현 가능한 명세):\n${enrichedDesignSystem}\n\n---\n` : ''}

**중요**: Step 2의 답변은 다음 6가지 디자인 핵심 요소를 포함하며, AI가 이를 구체적인 디자인 명세로 변환했습니다:
1. [Reference App] - 참고할 앱/웹사이트
2. [Main Color] - 메인 컬러
3. [Typography Style] - 타이포그래피 스타일
4. [Main Screens] - 핵심 화면 3개
5. [Navigation Pattern] - 네비게이션 방식
6. [Key Interactions] - 주요 인터랙션

---

이터레이션 계획 (Step 3 - Agile Iteration Planning 3개 이터레이션):
${iterationPlan}

**중요**: Step 3는 3단계 이터레이션 계획을 포함하고 있습니다. 각 이터레이션의 기능과 일정을 섹션 5, 7에 정확히 반영하세요.

---

사용자 스토리 (Step 4 - User Story & Acceptance Criteria):
${userStories}

**중요**: Step 4는 사용자 스토리와 Given-When-Then 형식의 Acceptance Criteria를 포함합니다. 이를 섹션 6, 7, 17.3에 활용하세요.

---

다음 형식으로 업계 Best Practice에 따라 완전한 PRD를 작성해주세요:

# PRD: [프로젝트명]

> 🤖 이 PRD는 Design Thinking, UX/UI 설계 방법론, Agile Iteration Planning, User Story & Acceptance Criteria 방법론을 활용하여 생성되었습니다

---

## 📋 목차
1. [문서 정보](#1-문서-정보)
2. [프로젝트 개요](#2-프로젝트-개요)
3. [문제 정의](#3-문제-정의)
4. [해결 방안](#4-해결-방안)
5. [3단계 이터레이션 계획](#5-3단계-이터레이션-계획)
6. [사용자 스토리](#6-사용자-스토리)
7. [기능 요구사항](#7-기능-요구사항)
8. [비기능 요구사항](#8-비기능-요구사항)
9. [기술 스택](#9-기술-스택)
10. [주요 화면 구성](#10-주요-화면-구성)
11. [화면 구현 명세](#11-화면-구현-명세)
12. [데이터 모델](#12-데이터-모델)
13. [API 명세](#13-api-명세)
14. [보안 및 권한](#14-보안-및-권한)
15. [성능 요구사항](#15-성능-요구사항)
16. [구현 가이드](#16-구현-가이드)
17. [테스트 전략](#17-테스트-전략)
18. [출시 계획](#18-출시-계획)
19. [성공 지표 (KPI)](#19-성공-지표-kpi)
20. [위험 관리](#20-위험-관리)
21. [향후 로드맵](#21-향후-로드맵)

---

## 1. 문서 정보

**문서 버전**: 1.0
**작성일**: ${new Date().toLocaleDateString('ko-KR')}
**작성 방법론**:
- Design Thinking (사용자 이해)
- UX/UI 설계 방법론 (화면 설계)
- Agile Iteration Planning (개발 계획)
- User Story & Acceptance Criteria (요구사항 정의)

**변경 이력**:
| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 1.0  | ${new Date().toLocaleDateString('ko-KR')} | 최초 작성 | AI PRD Generator |

---

## 2. 프로젝트 개요

**프로젝트명**: [Step 0의 문제 설명과 Step 1의 답변을 바탕으로 구체적인 프로젝트명 생성]
**프로젝트 목표**: [Step 1의 Design Thinking 질문 답변을 바탕으로 SMART 원칙에 따른 명확한 목표 작성]
**예상 개발 기간**: 6-9주 (3 이터레이션 × 2-3주)
**주요 이해관계자**:
- Product Owner: [역할 설명]
- 개발팀: [구성]
- 사용자: [Step 1의 "[페르소나 & 시나리오]" 답변에서 도출된 타겟 사용자군]

---

## 3. 문제 정의

### 3.1 현재 상황 (As-Is)
[Step 0의 문제 설명과 Step 1의 "[현재 상황 & 문제점]" 답변을 구체적으로 기술]

### 3.2 타겟 사용자 페르소나
[Step 1의 "[페르소나 & 시나리오]" 답변을 바탕으로 구체적인 페르소나 작성]
- **주 사용자**: [사용자가 답변한 구체적인 페르소나 - 예: 30대 직장인 김대리]
- **사용 환경**: [사용자가 답변한 시나리오 - 예: 출퇴근 지하철, 왕복 2시간]
- **기술 수준**: [페르소나에서 유추 가능한 기술 수준]
- **주요 니즈**: [사용자가 답변한 해결하고자 하는 문제]

### 3.3 핵심 문제
[Step 1의 "[현재 상황 & 문제점]"과 "[사용자 경험 Pain Point]" 답변을 바탕으로 핵심 문제점들을 정리]
1. [사용자가 답변한 주요 Pain Point 1]
2. [사용자가 답변한 주요 Pain Point 2]
3. [사용자가 답변한 주요 Pain Point 3]

### 3.4 비즈니스 임팩트
[Step 1의 "[비즈니스 임팩트]" 답변을 바탕으로 문제가 해결되지 않았을 때의 영향 기술]

---

## 4. 해결 방안

### 4.1 솔루션 개요
**핵심 가치 제안**: [Step 1의 "[핵심 가치]" 답변을 바탕으로 이 솔루션이 제공하는 핵심 가치 기술]

**차별화 포인트** (To-Be):
[Step 1의 "[경쟁 제품/서비스 비교]" 답변을 바탕으로 차별화 요소 정리]
- [사용자가 답변한 차별화 요소 1]
- [사용자가 답변한 차별화 요소 2]

### 4.2 성공 기준
[Step 1의 "[성공 지표]" 답변을 바탕으로 측정 가능한 성공 기준 작성]
- [사용자가 답변한 성공 지표 1]
- [사용자가 답변한 성공 지표 2]

---

## 5. 3단계 이터레이션 계획

${iterationPlan}

---

## 6. 사용자 스토리

${userStories}

---

## 7. 기능 요구사항

### 7.1 이터레이션 1 (MVP) 필수 기능
[Step 3의 이터레이션 계획과 Step 4의 사용자 스토리에서 도출된 MVP 기능들을 체크리스트로 정리]
- [ ] [Step 3 이터레이션 1에서 언급된 핵심 기능 1] - 우선순위: High
- [ ] [Step 3 이터레이션 1에서 언급된 핵심 기능 2] - 우선순위: High
- [ ] [Step 4 사용자 스토리에서 "Must Have"로 분류된 기능들]

### 7.2 이터레이션 2 확장 기능
[Step 3 이터레이션 2 계획에서 명시된 기능들을 정리]
- [ ] [이터레이션 2에서 추가될 기능 1]
- [ ] [이터레이션 2에서 추가될 기능 2]

### 7.3 이터레이션 3 고급 기능
[Step 3 이터레이션 3 계획에서 명시된 기능들을 정리]
- [ ] [이터레이션 3에서 추가될 기능 1]
- [ ] [이터레이션 3에서 추가될 기능 2]

### 7.4 향후 기능 (Out of Scope)
[Step 4 사용자 스토리에서 "Won't Have"로 분류된 기능들 또는 3개 이터레이션 이후로 연기된 기능들]

---

## 8. 비기능 요구사항

### 8.1 성능
[Step 2의 "[Mobile-First & Responsive]" 답변과 Step 1의 "[사용자 경험 Pain Point]"에서 성능 관련 요구사항 도출]
- 페이지 로딩 시간: [사용자가 언급한 성능 요구사항 또는 기본 3초 이내]
- API 응답 시간: 2초 이내
- 동시 사용자: [Step 1 페르소나와 비즈니스 임팩트에서 예상되는 사용자 규모]

### 8.2 가용성
- 서비스 가동률: 99% 이상
- 장애 복구 시간: 4시간 이내

### 8.3 확장성
[Step 1의 "[성공 지표]"와 비즈니스 임팩트에서 향후 사용자 증가 예측을 바탕으로 확장 계획 작성]

### 8.4 보안
[Step 1의 페르소나와 데이터 특성을 고려한 보안 요구사항]
- [사용자 데이터가 민감한 경우 강화된 보안 요구사항]

### 8.5 접근성
- WCAG 2.1 Level AA 준수
- 모바일 반응형 디자인 (Step 2의 "[Mobile-First & Responsive]" 답변 반영)

---

## 9. 기술 스택

### 9.1 프론트엔드
[Step 2의 디자인 요구사항(Animation, Interaction, Mobile-First)과 Step 1의 페르소나 기술 수준을 고려한 기술 스택 제안]
- **프레임워크**: [Step 2의 "[Animation & Interaction]"에서 언급된 복잡한 인터랙션이 있다면 React/Vue 제안, 간단하면 Vanilla JS 고려]
- **스타일링**: [Step 2의 "[Design System & Brand Identity]"를 효과적으로 구현할 수 있는 방식 - Tailwind/CSS-in-JS 등]
- **상태 관리**: [Step 2의 "[Data Input/Display]" 복잡도에 따라 Context API/Zustand/Redux 제안]

### 9.2 백엔드
[Step 4 사용자 스토리와 Step 1 비즈니스 요구사항에 적합한 백엔드 기술]
- [실시간 기능이 필요하면 WebSocket 지원 프레임워크]
- [데이터 처리 복잡도에 따른 선택]

### 9.3 데이터베이스
[Step 4 사용자 스토리와 Step 2 "[Data Input/Display]"에서 도출된 데이터 특성에 맞는 DB 선택]
- [관계형 데이터면 PostgreSQL/MySQL]
- [문서형 데이터면 MongoDB]

### 9.4 인프라
[Step 1의 성공 지표와 예상 사용자 규모를 고려한 배포 전략]

### 9.5 개발 도구
- 버전 관리: Git
- CI/CD: [Step 3 이터레이션 계획을 지원할 수 있는 도구]
- 협업 도구: [제안]

---

## 10. 주요 화면 구성

### 10.1 User Journey 기반 화면 흐름
[Step 2의 "[User Journey]" 답변을 화면 흐름도로 시각화]
\`\`\`
[사용자가 답변한 1단계] → [2단계] → [3단계] → ... → [최종 목표 달성]
\`\`\`
각 단계별 소요 시간과 주요 액션을 포함

### 10.2 Information Architecture
[Step 2의 "[Information Architecture]" 답변을 화면 계층 구조로 정리]
\`\`\`
홈/대시보드
  ├─ [사용자가 답변한 상단 요소들]
  ├─ [사용자가 답변한 중앙 콘텐츠]
  └─ [사용자가 답변한 하단 요소들]
\`\`\`

### 10.3 Wireflow
[Step 2의 "[Wireflow]" 답변을 화면 이동 경로로 시각화]
- [사용자가 답변한 화면 A] → (클릭/스와이프) → [화면 B]
- [사용자가 답변한 전환 애니메이션 - 슬라이드 인, 페이드 등]

### 10.4 주요 화면별 상세 명세
[Step 2의 "[User Journey]", "[Information Architecture]", "[Data Display]" 답변을 종합하여 각 화면 명세 작성]

#### 10.4.1 [Step 2에서 도출된 첫 번째 화면명]
- **목적**: [User Journey의 해당 단계 목적]
- **주요 구성 요소**: [Information Architecture에서 답변한 요소들]
- **사용자 액션**: [Wireflow에서 답변한 인터랙션들]
- **반응형 대응**: [Step 2 "[Mobile-First & Responsive]"에서 답변한 모바일/데스크톱 차이]

---

## 11. 화면 구현 명세

> **중요**: 이 섹션은 Claude Code가 바로 코드를 작성하고 화면을 구현할 수 있도록 구체적인 명세를 제공합니다.
> **Step 2의 디자인 답변을 정확히 반영하여 작성하세요. 플레이스홀더([브랜드 메인 컬러 hex코드] 같은 표현)를 사용하지 말고, 실제 답변 내용을 그대로 사용하세요.**

### 11.1 디자인 시스템 명세

**브랜드 정체성**:
[Step 2의 "[Design System & Brand Identity]" 답변을 여기에 반영]
- 전체 디자인 느낌: [사용자가 답변한 디자인 스타일 예시를 구체적으로 작성]
- 브랜드 특성: [사용자가 언급한 키워드와 느낌]

**컬러 팔레트**:
\`\`\`css
/* Step 2의 "[Color System]" 답변을 바탕으로 실제 색상 코드를 명시 */
--primary: [사용자가 답변한 브랜드 컬러의 실제 hex코드 또는 구체적 색상명];
--secondary: [사용자가 답변한 보조 컬러];
--success: [사용자가 답변한 성공 관련 색상];
--error: [사용자가 답변한 오류/경고 관련 색상];
--background: [사용자가 답변한 배경 색상];
/* 사용자가 언급한 추가 색상들도 모두 포함 */
\`\`\`

**타이포그래피**:
\`\`\`css
/* Step 2의 "[Typography & Hierarchy]" 답변을 바탕으로 실제 폰트 명세 작성 */
--font-family: [사용자가 답변한 폰트명 또는 폰트 스타일];
--font-heading-1: [사용자가 답변한 제목 크기와 굵기];
--font-heading-2: [사용자가 답변한 부제목 크기와 굵기];
--font-body: [사용자가 답변한 본문 크기와 굵기];
--line-height: [사용자가 답변한 행간];
/* 사용자가 언급한 추가 타이포그래피 속성도 포함 */
\`\`\`

**Spacing & Layout**:
\`\`\`css
/* Step 2의 "[Layout & Spacing]" 답변을 바탕으로 실제 여백 시스템 명시 */
--spacing-unit: [사용자가 답변한 기본 여백 단위]px;
--container-max-width: [사용자가 답변한 최대 콘텐츠 너비]px;
--padding-mobile: [사용자가 답변한 모바일 패딩]px;
--padding-desktop: [사용자가 답변한 데스크톱 패딩]px;
--gap-cards: [사용자가 답변한 카드 간 간격]px;
/* 사용자가 언급한 추가 여백 규칙도 포함 */
\`\`\`

**아이콘 & 비주얼 요소**:
[Step 2의 "[Icons & Visual Elements]" 답변을 여기에 반영]
- 아이콘 스타일: [사용자가 답변한 아이콘 스타일 - Filled/Outline/둥근 등]
- 이미지 비율: [사용자가 언급한 썸네일/이미지 비율]
- 시각적 특징: [사용자가 답변한 시각 요소들]

### 11.2 주요 화면별 컴포넌트 구조

**디자인 기반**:
[Step 2의 "[User Journey]", "[Information Architecture]", "[Wireflow]", "[Data Display]" 답변을 종합하여 각 화면 구조 작성]

#### 11.2.1 [첫 화면명 - Step 2의 User Journey/Information Architecture에서 파악]

**화면 목적**: [Step 2의 "[User Journey]"에서 파악한 이 화면의 목적]

**URL/라우트**: \`/[Step 2의 Wireflow에서 파악한 경로]\`

**화면 정보 구조**:
[Step 2의 "[Information Architecture]" 답변을 바탕으로 상단/중앙/하단 구성]
- 상단: [사용자가 답변한 상단 배치 요소들]
- 중앙: [사용자가 답변한 중앙 배치 요소들]
- 하단: [사용자가 답변한 하단 배치 요소들 - 탭바, 플로팅 버튼 등]

**컴포넌트 트리**:
\`\`\`
[화면명]Component
├─ [사용자가 Information Architecture에서 언급한 상단 요소]
│  ├─ [구체적 하위 요소들]
├─ MainContent
│  ├─ [사용자가 답변한 주요 섹션들]
│  │  ├─ [하위 컴포넌트들...]
└─ [사용자가 답변한 하단 요소 - 탭바/플로팅 등]
\`\`\`

**데이터 표시 방식**:
[Step 2의 "[Data Display]" 답변을 바탕으로 목록/카드 구성]
- 표시 형태: [사용자가 답변한 카드/테이블/리스트 형태]
- 카드 구성: [사용자가 답변한 카드 내부 요소들]
- 메타 정보: [사용자가 답변한 날짜, 상태, 프로그레스 등]
- 정렬/필터: [사용자가 답변한 정렬 옵션들]

**CSS 레이아웃 명세**:
\`\`\`css
.[화면명-container] {
  /* Step 2의 "[Layout & Spacing]" 답변 반영 */
  max-width: var(--container-max-width);
  padding: var(--padding-mobile);
  [사용자가 답변한 레이아웃 방식 - flex, grid 등]
}

@media (min-width: 768px) {
  .[화면명-container] {
    padding: var(--padding-desktop);
    [사용자가 답변한 태블릿/데스크톱 레이아웃 변경사항]
  }
}
\`\`\`

**화면 간 이동**:
[Step 2의 "[Wireflow]" 답변을 바탕으로 화면 전환 명세]
- 다음 화면으로 이동: [사용자가 답변한 이동 방식 - 클릭, 스와이프 등]
- 전환 애니메이션: [사용자가 답변한 슬라이드 인, 페이드 등]
- 이전 화면으로 복귀: [사용자가 답변한 뒤로가기 동작]

**주요 인터랙션**:
[Step 2의 "[Wireflow]"와 "[Data Input]" 답변을 바탕으로 인터랙션 명세]
1. [사용자가 답변한 주요 액션1]: [구체적 동작 흐름]
   - 트리거: \`[이벤트명]\`
   - 핸들러: \`handle[ActionName]()\`
   - 상태 변화: [사용자가 답변한 상태 변화]

**데이터 바인딩**:
\`\`\`typescript
// Step 2의 "[Data Input]"과 "[Data Display]" 답변을 바탕으로 인터페이스 정의
interface [화면명]Data {
  [사용자가 답변한 필드들과 타입]
}
\`\`\`

**애니메이션/트랜지션**:
[Step 2의 "[Animation & Interaction]" 답변을 바탕으로 애니메이션 명세]
- [요소명]: [사용자가 답변한 애니메이션 효과 - 예: 더블탭 하트, 스와이프 전환 등]
  - 효과: \`[사용자가 답변한 효과명]\`
  - Duration: \`[사용자가 답변한 시간]ms\`

#### 11.2.2 [두 번째 화면명]
[위와 동일한 구조로 Step 2 답변을 반영하여 작성]

### 11.3 재사용 컴포넌트 라이브러리

#### 11.3.1 Button 컴포넌트

**디자인 기반**:
[Step 2의 "[Button & CTA Design]" 답변을 바탕으로 버튼 명세 작성]

**Props 인터페이스**:
\`\`\`typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost'; // 사용자가 답변한 버튼 종류들
  size: 'sm' | 'md' | 'lg';
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean; // 사용자가 로딩 상태를 언급했다면 포함
  children: React.ReactNode;
}
\`\`\`

**구현 명세**:
\`\`\`tsx
<button className={\`btn btn-\${variant} btn-\${size}\`}>
  {loading ? <Spinner /> : children}
</button>
\`\`\`

**CSS 스타일**:
\`\`\`css
/* Step 2의 "[Button & CTA Design]" 답변을 정확히 반영 */
.btn-primary {
  background: [사용자가 답변한 Primary 버튼 배경색];
  color: [사용자가 답변한 텍스트 색상];
  border-radius: [사용자가 답변한 라운드 값]px;
  padding: [사용자가 답변한 패딩 값];
  transition: all [사용자가 답변한 duration]ms [easing];
}

.btn-primary:hover {
  [사용자가 답변한 호버 효과 - 예: 어둡게, 배경 채우기 등]
}

.btn-secondary {
  [사용자가 답변한 Secondary 버튼 스타일]
}

.btn-ghost {
  [사용자가 답변한 Ghost 버튼 스타일]
}

/* 사용자가 언급한 비활성/로딩 상태도 포함 */
.btn:disabled {
  [사용자가 답변한 비활성 상태 스타일]
}
\`\`\`

#### 11.3.2 Card 컴포넌트

**디자인 기반**:
[Step 2의 "[Cards & Components]" 답변을 바탕으로 카드 명세 작성]

\`\`\`typescript
interface CardProps {
  title: string;
  content: React.ReactNode;
  footer?: React.ReactNode;
  image?: string; // 사용자가 썸네일/이미지를 언급했다면 포함
  onClick?: () => void;
}
\`\`\`

**CSS 스타일**:
\`\`\`css
/* Step 2의 "[Cards & Components]" 답변을 정확히 반영 */
.card {
  [사용자가 답변한 카드 레이아웃 - 예: border-radius, shadow, padding]
  [사용자가 답변한 이미지 비율 - 예: aspect-ratio: 2/3]
  [사용자가 답변한 호버 효과 - 예: transform, shadow 변화]
}
\`\`\`

#### 11.3.3 Input 컴포넌트

**디자인 기반**:
[Step 2의 "[Data Input]" 답변을 바탕으로 입력 필드 명세 작성]

\`\`\`typescript
interface InputProps {
  type: 'text' | 'email' | 'password' | 'number' | 'date' | 'select'; // 사용자가 답변한 입력 타입들
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  maxLength?: number; // 사용자가 글자 수 제한을 언급했다면 포함
  autocomplete?: boolean; // 사용자가 자동완성을 언급했다면 포함
}
\`\`\`

**구현 세부사항**:
[사용자가 Step 2의 "[Data Input]"에서 답변한 각 필드 타입별 구현 방식]
- 텍스트 입력: [사용자가 언급한 글자 수 제한, 실시간 표시 여부 등]
- 선택 필드: [드롭다운/칩/버튼 토글 등 사용자가 언급한 방식]
- 날짜 선택: [캘린더 피커, 빠른 선택 옵션 등 사용자가 언급한 방식]
- 자동완성: [사용자가 언급한 자동완성 동작 방식]

### 11.4 반응형 디자인 브레이크포인트

**디자인 기반**:
[Step 2의 "[Mobile-First & Responsive]" 답변을 바탕으로 반응형 명세 작성]

\`\`\`css
/* 사용자가 답변한 브레이크포인트 기준 */
/* Mobile: 기본 (0~767px) */
/* Tablet: 768px~1023px */
@media (min-width: 768px) {
  /* 사용자가 답변한 태블릿 스타일 변경 사항 */
}

/* Desktop: 1024px 이상 */
@media (min-width: 1024px) {
  /* 사용자가 답변한 데스크톱 스타일 변경 사항 */
}
\`\`\`

**모바일 우선 최적화**:
[사용자가 Step 2의 "[Mobile-First & Responsive]"에서 답변한 모바일 최적화 내용]
- 터치 영역: [사용자가 언급한 터치 영역 크기]
- 폰트 크기: [사용자가 언급한 최소 폰트 크기]
- 주요 기능 배치: [사용자가 언급한 하단 배치, 플로팅 버튼 등]
- 스와이프 제스처: [사용자가 언급한 제스처 동작들]

**데스크톱 전용 기능**:
[사용자가 답변한 데스크톱 전용 UI/기능]
- 예: 사이드바, 호버 효과, 드래그앤드롭, 멀티뷰 등

### 11.5 상태 관리 명세

**전역 상태**:
\`\`\`typescript
// 앱 전체에서 공유하는 상태
interface GlobalState {
  user: User | null;
  theme: 'light' | 'dark';
  [기타 전역 상태];
}
\`\`\`

**로컬 상태**:
- 각 화면/컴포넌트별 독립 상태는 useState 사용
- 복잡한 상태 로직은 useReducer 사용

### 11.6 네비게이션 플로우

**화면 이동 맵**:
\`\`\`
[시작 화면]
  ↓ (로그인)
[대시보드]
  ↓ (액션1)
[화면A] ← → [화면B]
  ↓ (저장)
[결과 화면]
\`\`\`

**각 이동의 구현**:
- \`navigate('/[경로]')\` 또는 \`<Link to="/[경로]">\`
- 뒤로가기 동작: [정의]
- 딥링크 지원: [URL 구조]

### 11.7 API 연동 명세

**각 화면별 API 호출**:
\`\`\`typescript
// [화면명]에서 사용하는 API 호출
const fetch[DataName] = async () => {
  const response = await fetch('/api/[endpoint]', {
    method: '[METHOD]',
    headers: { /* headers */ },
    body: JSON.stringify({ /* data */ })
  });

  if (!response.ok) {
    // 에러 처리
  }

  const data = await response.json();
  return data;
};
\`\`\`

**로딩/에러 상태 처리**:
- 로딩 중: \`<Spinner />\` 또는 \`<Skeleton />\` 표시
- 에러 발생: \`<ErrorMessage error={error} />\` 표시
- 재시도: \`<RetryButton onClick={retry} />\`

### 11.8 Claude Code 구현 가이드

**이 PRD를 Claude Code에 제공 시**:

1. **디자인 시스템 먼저 구현**:
   \`\`\`
   "11.1 디자인 시스템 명세를 바탕으로 CSS 변수와 전역 스타일을 먼저 만들어줘"
   \`\`\`

2. **재사용 컴포넌트 구현**:
   \`\`\`
   "11.3 재사용 컴포넌트 라이브러리의 Button, Card, Input 컴포넌트를 만들어줘"
   \`\`\`

3. **화면별 순차 구현**:
   \`\`\`
   "11.2.1의 [화면명] 화면을 구현해줘. 컴포넌트 트리, HTML 구조, CSS 레이아웃, 인터랙션을 모두 포함해서"
   \`\`\`

4. **테스트 및 확인**:
   \`\`\`
   "구현한 화면을 개발 서버로 실행해서 보여줘"
   \`\`\`

---

## 12. 데이터 모델

### 12.1 주요 엔티티
[Step 2의 "[Data Input]"과 "[Data Display]", Step 4의 사용자 스토리에서 도출된 데이터 구조 정의]
- [사용자가 입력하는 필드들을 엔티티로 정의]
- [사용자가 조회하는 데이터를 엔티티로 정의]

### 12.2 ERD
[Step 4 사용자 스토리에서 도출된 엔티티 간 관계 다이어그램]
\`\`\`
[엔티티1] ----< [엔티티2]
    |
    |----< [엔티티3]
\`\`\`

### 12.3 데이터 흐름
[Step 2의 "[User Journey]"와 "[Data Input/Display]" 설계를 반영한 데이터 흐름]
- 입력: [사용자가 Step 2에서 답변한 입력 필드들]
- 처리: [비즈니스 로직]
- 출력: [사용자가 Step 2에서 답변한 표시 형태]

---

## 13. API 명세

### 13.1 API 엔드포인트 목록
[Step 4 사용자 스토리의 각 기능별 필요한 API 엔드포인트 정의]
- \`GET /api/[리소스]\`: [Step 2 Data Display에서 필요한 조회 API]
- \`POST /api/[리소스]\`: [Step 2 Data Input에서 필요한 생성 API]
- \`PUT /api/[리소스]/:id\`: [수정 기능이 있다면]
- \`DELETE /api/[리소스]/:id\`: [삭제 기능이 있다면]

### 13.2 인증/인가
[Step 1 페르소나와 보안 요구사항을 고려한 API 보안 방식]

---

## 14. 보안 및 권한

### 14.1 인증 방식
[Step 1의 페르소나와 사용 시나리오를 고려한 인증 방식 - 소셜 로그인, 이메일 등]

### 14.2 권한 관리
[Step 4 사용자 스토리에서 역할별 권한이 필요한 경우 정의]

### 14.3 데이터 보호
[Step 2 Data Input에서 민감한 정보가 있는 경우 보호 방안]

---

## 15. 성능 요구사항

### 15.1 응답 시간
[Step 1의 "[사용자 경험 Pain Point]"에서 성능 관련 요구사항 반영]
- API 응답: 2초 이내
- 페이지 로딩: 3초 이내

### 15.2 처리량
[Step 1의 비즈니스 임팩트와 성공 지표에서 예상되는 처리량]

### 15.3 리소스 사용량
[Step 2의 "[Animation & Interaction]", "[Mobile-First]"를 고려한 클라이언트 리소스 최적화]

---

## 16. 구현 가이드

위 PRD대로 앱을 제작해주세요. 단,
- **문서화**: 위 내용 그대로 /docs/PRD.md로 저장
- **작업 추적**: /docs/TODOs.md에 작업 내역 기록
- **단계적 구현**: Step 3 이터레이션 1부터 순차적으로 개발
- **테스트**: 각 이터레이션 완료 시 Step 4의 Acceptance Criteria로 검증
- **미구현 항목**: 테스트 코드, DB 상세 설계, 외부 API 연동은 /docs/TODOs.md에 기록만
- **UI/UX**: 모든 UI는 한글로 작성, Step 2의 UX/UI 설계 방법론 준수

---

## 17. 테스트 전략

### 17.1 단위 테스트
[Step 3 각 이터레이션의 기능별 테스트 계획]
- 이터레이션 1 기능: [테스트 항목]
- 이터레이션 2 기능: [테스트 항목]

### 17.2 통합 테스트
[Step 2의 "[Wireflow]"를 기반으로 한 화면 간 통합 테스트]
- [화면 A] → [화면 B] 전환 테스트
- [User Journey] 전체 플로우 테스트

### 17.3 사용자 인수 테스트
[Step 4 사용자 스토리의 Acceptance Criteria를 테스트 케이스로 활용]
- Story #1: [Given-When-Then 형식의 Acceptance Criteria 검증]
- Story #2: [Given-When-Then 형식의 Acceptance Criteria 검증]

---

## 18. 출시 계획

### 18.1 베타 출시
- 시기: Step 3 이터레이션 1 완료 후
- 대상: [Step 1의 페르소나와 유사한 얼리어답터 10-20명]
- 목표: [Step 3 이터레이션 1의 핵심 기능 검증]

### 18.2 정식 출시
- 시기: Step 3 이터레이션 3 완료 후
- 마케팅 계획: [Step 1의 타겟 사용자에게 도달하기 위한 전략]

---

## 19. 성공 지표 (KPI)

### 19.1 사용자 지표
[Step 1의 "[성공 지표]" 답변을 구체적인 KPI로 정의]
- [사용자가 답변한 성공 지표 1]: 목표치 [X]
- [사용자가 답변한 성공 지표 2]: 목표치 [Y]

### 19.2 비즈니스 지표
[Step 1의 "[비즈니스 임팩트]" 답변을 측정 가능한 비즈니스 목표로 전환]
- [비즈니스 목표 1]: [측정 방법]
- [비즈니스 목표 2]: [측정 방법]

### 19.3 기술 지표
[Step 2의 성능 요구사항 반영]
- 페이지 로딩 속도: 평균 3초 이내
- API 응답 시간: 평균 2초 이내
- 오류율: 1% 미만

---

## 20. 위험 관리

### 20.1 식별된 위험
[Step 3 이터레이션 계획과 Step 1의 문제점에서 도출된 위험 요소]
1. [기술적 위험]: [Step 3에서 언급된 복잡한 기능 구현 관련]
2. [일정 위험]: [Step 3 이터레이션 일정 지연 가능성]
3. [사용자 위험]: [Step 1 페르소나의 기술 수준에 따른 UX 위험]

### 20.2 대응 방안
[각 위험에 대한 대응 전략]
1. [기술적 위험 대응]: [대안 기술 또는 단계적 접근]
2. [일정 위험 대응]: [우선순위 조정, 이터레이션 범위 축소]
3. [사용자 위험 대응]: [Step 2의 UX 설계 강화, 사용자 테스트 확대]

---

## 21. 향후 로드맵

### 21.1 이터레이션 4 이후 계획
[Step 4 사용자 스토리에서 "Won't Have"로 분류된 기능들의 우선순위]
1. [향후 기능 1]: 예상 시기 [X개월 후]
2. [향후 기능 2]: 예상 시기 [Y개월 후]

### 21.2 장기 비전
[Step 1의 "[핵심 가치]"와 "[성공 지표]"를 바탕으로 6개월-1년 후 목표]
- [장기 목표 1]
- [장기 목표 2]

---

**문서 작성 방법론**:
- ✅ Design Thinking으로 사용자 깊이 이해
- ✅ UX/UI 설계 방법론으로 체계적 화면 설계
- ✅ Agile Iteration Planning으로 점진적 개발 계획
- ✅ User Story & Acceptance Criteria로 명확한 요구사항 정의
- ✅ PRD Best Practice로 완성도 높은 문서화

이 PRD는 실제 개발에 즉시 활용 가능한 수준으로 작성되었습니다.`;

      setProgress(15);
      // AI 호출 중 실시간 진행률 업데이트 (스트리밍)
      const result = await callGeminiAPI(prompt, (streamProgress) => {
        // 15%에서 시작해서 스트리밍 진행률을 15~60% 범위로 매핑
        const mappedProgress = 15 + (streamProgress * 0.45);
        setProgress(Math.floor(mappedProgress));
      });

      setProgress(65);
      if (result) {
        setFinalPRD('```markdown\n' + result + '\n```');

        // AI에게 PRD 요약 생성 요청
        setProgress(70);
        const summaryPrompt = `다음 PRD 문서를 읽고 핵심 섹션별로 간결하게 요약해주세요.

**중요**: 반드시 아래 형식을 정확히 따라주세요. 각 섹션 사이에 빈 줄(\\n\\n)을 넣어주세요.

### [섹션명]
[1-2문장으로 핵심 내용 요약]

예시:
### 문제 정의
현재 사용자들은 데이터 관리에 많은 시간을 소비하고 있으며, 엑셀 파일로 인한 비효율과 오류가 빈번하게 발생합니다.

### 해결 방안
웹/모바일 기반의 통합 데이터 관리 플랫폼을 구축하여 자동화와 실시간 협업을 가능하게 합니다.

### 이터레이션 계획
MVP부터 시작하여 3단계로 점진적 개발을 진행하며, 각 이터레이션마다 실사용 가능한 기능을 제공합니다.

### 사용자 스토리
사용자 중심의 시나리오를 바탕으로 총 X개의 스토리를 정의했으며, 각 스토리는 명확한 인수 기준을 포함합니다.

### 기술 스택
현대적이고 확장 가능한 기술 스택을 선정했으며, 프론트엔드/백엔드/인프라로 구분하여 구체적으로 명시했습니다.

PRD 문서:
${result}

위 형식으로 PRD의 주요 섹션(최소 5개 이상)을 요약해주세요.`;

        setProgress(70);
        // 요약 생성 중 실시간 진행률 업데이트 (스트리밍)
        const summaryResult = await callGeminiAPI(summaryPrompt, (streamProgress) => {
          // 70%에서 시작해서 스트리밍 진행률을 70~90% 범위로 매핑
          const mappedProgress = 70 + (streamProgress * 0.2);
          setProgress(Math.floor(mappedProgress));
        });
        setProgress(95);
        if (summaryResult) {
          setPrdSummary(summaryResult);
        }
      }

      setProgress(100);
      setIsProcessing(false);
    } else {
      setTimeout(() => {
        const prd = `\`\`\`markdown
# PRD: ${problemDescription.substring(0, 100)}

> 🤖 이 PRD는 AI가 사용자 입력을 분석하고 보완하여 생성했습니다

---

## 📋 목차
1. [문제 정의](#1-문제-정의)
2. [해결 방안 개요](#2-해결-방안-개요)
3. [3단계 이터레이션 계획](#3-3단계-이터레이션-계획)
4. [사용자 스토리](#4-사용자-스토리)
5. [기술 스택](#5-기술-스택)
6. [주요 화면 구성](#6-주요-화면-구성)
7. [데이터 모델](#7-데이터-모델)
8. [API 명세](#8-api-명세)
9. [보안 및 권한](#9-보안-및-권한)
10. [성능 요구사항](#10-성능-요구사항)
11. [구현 가이드](#11-구현-가이드)
12. [성공 지표 (KPI)](#12-성공-지표-kpi)

---

## 1. 문제 정의

### 1.1 현재 상황
${problemDescription}

### 1.2 타겟 사용자
- **주 사용자**: 일반 직장인, 프리랜서, 소규모 팀
- **사용 환경**: 데스크톱 및 모바일 브라우저
- **기술 수준**: 비전문가도 쉽게 사용 가능해야 함

### 1.3 핵심 문제
1. **시간 낭비**: 수동 작업으로 인한 반복적 업무 시간 소요
2. **오류 발생**: 수작업으로 인한 휴먼 에러
3. **협업 어려움**: 여러 도구 사용으로 인한 작업 파편화

---

## 2. 해결 방안 개요

**솔루션 핵심**: 직관적인 UI와 자동화를 통해 복잡한 작업을 간소화하고,
실시간 협업 기능으로 팀 생산성을 향상시킨다.

**차별점**:
- ✅ 회원가입 없이 즉시 사용 가능 (이메일 옵션)
- ✅ 3클릭 이내 작업 시작
- ✅ 실시간 자동 저장 및 버전 관리
- ✅ 모바일 친화적 반응형 디자인

---

## 3. 3단계 이터레이션 계획

${iterationPlan}

---

## 4. 사용자 스토리

${userStories}

---

## 5. 기술 스택

### 5.1 프론트엔드
- **프레임워크**: Next.js 15 (App Router)
  - React 19 + TypeScript
  - Server Components & Client Components 혼용
  - SEO 최적화를 위한 메타데이터 관리
- **스타일링**: Tailwind CSS
  - 반응형 디자인 (Mobile-first)
  - 다크 모드 지원 준비
- **상태 관리**: Zustand (필요 시)
- **폼 관리**: React Hook Form + Zod (유효성 검증)
- **UI 컴포넌트**: Shadcn/ui 또는 직접 구현

### 5.2 백엔드 & 데이터베이스
- **BaaS**: Supabase
  - PostgreSQL 데이터베이스
  - Row Level Security (RLS)
  - 실시간 구독 기능
  - 인증 (이메일, 소셜 로그인)
  - Storage (파일 업로드)

### 5.3 배포 및 인프라
- **호스팅**: Vercel
- **도메인**: 사용자 커스텀 도메인 연결 가능
- **모니터링**: Vercel Analytics

---

## 6. 주요 화면 구성

### 6.1 메인 화면 (\`/\`)
- 히어로 섹션: 서비스 소개 및 "시작하기" CTA
- 주요 기능 3가지 간단 설명
- 최근 작업 바로가기 (로그인 시)

### 6.2 작업 화면 (\`/work\`)
- 좌측: 단계별 입력 폼
- 우측: 실시간 미리보기
- 하단: 진행 상태 바

### 6.3 결과 화면 (\`/result/[id]\`)
- 상단: 핵심 요약 카드
- 중간: 상세 데이터 테이블
- 하단: 다운로드 및 공유 버튼

### 6.4 대시보드 (\`/dashboard\`) - 이터레이션 2+
- 작업 히스토리
- 통계 차트
- 저장된 템플릿 관리

---

## 7. 데이터 모델

### 7.1 Users (Supabase Auth)
\`\`\`sql
-- Supabase Auth 기본 테이블 사용
-- profiles 테이블로 확장
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

### 7.2 Tasks
\`\`\`sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  input_data JSONB,
  output_data JSONB,
  status TEXT CHECK (status IN ('processing', 'completed', 'failed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);
\`\`\`

### 7.3 Templates (이터레이션 2)
\`\`\`sql
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  config JSONB,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

---

## 8. API 명세

### 8.1 REST API (Next.js API Routes)

#### POST /api/tasks
작업 생성 및 처리 시작
\`\`\`typescript
// Request
{
  "title": "작업 제목",
  "input_data": { /* 입력 데이터 */ }
}

// Response
{
  "id": "uuid",
  "status": "processing",
  "created_at": "2024-01-15T10:00:00Z"
}
\`\`\`

#### GET /api/tasks/[id]
작업 상태 및 결과 조회
\`\`\`typescript
// Response
{
  "id": "uuid",
  "status": "completed",
  "output_data": { /* 결과 데이터 */ },
  "created_at": "2024-01-15T10:00:00Z",
  "completed_at": "2024-01-15T10:00:30Z"
}
\`\`\`

#### GET /api/export/[id]?format=excel|pdf|csv
결과 다운로드

---

## 9. 보안 및 권한

### 9.1 인증
- **이터레이션 1**: 인증 없이 사용 가능 (세션 기반 임시 저장)
- **이터레이션 2**: 이메일 로그인 추가
- **이터레이션 3**: 소셜 로그인 (Google, GitHub)

### 9.2 데이터 보호
- Supabase RLS 정책으로 사용자 데이터 격리
- HTTPS 필수
- API Rate Limiting (Vercel Edge Config)

### 9.3 정책
\`\`\`sql
-- 사용자는 본인 데이터만 조회/수정/삭제
CREATE POLICY "Users can CRUD own tasks"
  ON tasks FOR ALL
  USING (auth.uid() = user_id);
\`\`\`

---

## 10. 성능 요구사항

### 10.1 응답 시간
- 페이지 로드: 2초 이내 (FCP)
- 작업 처리: 소규모 데이터 3초, 대규모 10초 이내
- API 응답: 500ms 이내

### 10.2 확장성
- 동시 접속자 100명 이상 지원 (이터레이션 1)
- 1,000명 이상 지원 (이터레이션 3)

### 10.3 최적화
- 이미지 자동 최적화 (Next.js Image)
- 코드 스플리팅
- Lazy Loading 적용

---

## 11. 구현 가이드

위 PRD대로 앱을 제작해줘. 단, 다음 규칙을 따라줘:

### 11.1 프로젝트 구조
\`\`\`
/app
  /page.tsx              # 메인 페이지
  /work/page.tsx         # 작업 화면
  /result/[id]/page.tsx  # 결과 화면
  /api/tasks/route.ts    # API 엔드포인트
/components
  /ui/                   # 재사용 UI 컴포넌트
  /work/                 # 작업 관련 컴포넌트
/lib
  /supabase.ts           # Supabase 클라이언트
  /utils.ts              # 유틸 함수
/docs
  /PRD.md                # 이 문서
  /TODOs.md              # 작업 진행 상황
\`\`\`

### 11.2 작업 진행 방식
1. **문서화**: 위 내용 그대로 \`/docs/PRD.md\`로 저장해줘
2. **TODO 관리**: 작업 내역을 \`/docs/TODOs.md\`에 기록하면서 진행해줘
3. **단계별 구현**: 이터레이션 1 → 2 → 3 순서로 진행
4. **우선순위**: UI/UX 먼저 구현, 테스트 코드/DB 최적화/외부 API는 \`/docs/TODOs.md\`에 기록만 하고 지금은 구현하지 마

### 11.3 UI/UX 가이드
- **언어**: 모든 UI는 한글로 해줘
- **디자인**: 파워오토메이트 스타일 (깔끔하고 비즈니스 친화적)
- **색상**:
  - Primary: Blue (#0078D4)
  - Success: Green (#107C10)
  - Warning: Orange (#FF8C00)
  - Danger: Red (#D13438)
- **폰트**: Pretendard 또는 시스템 폰트

### 11.4 코드 스타일
- TypeScript strict 모드
- ESLint + Prettier
- 컴포넌트는 함수형 + Hooks
- 주석은 한글로

---

## 12. 성공 지표 (KPI)

### 12.1 사용성 지표
- **첫 작업 완료 시간**: 평균 5분 이내
- **재방문율**: 30% 이상
- **작업 성공률**: 95% 이상

### 12.2 성능 지표
- **페이지 로드 시간**: 2초 이내
- **에러율**: 1% 미만
- **가동률**: 99.9% 이상

### 12.3 비즈니스 지표 (이터레이션 2+)
- **회원 가입 전환율**: 20% 이상
- **일일 활성 사용자(DAU)**: 100명 이상
- **사용자당 평균 작업 수**: 주 3회 이상

---

## 📌 다음 단계

1. ✅ 이 PRD를 \`/docs/PRD.md\`에 저장
2. ✅ \`/docs/TODOs.md\` 파일 생성
3. ✅ Next.js 15 프로젝트 초기화
4. ✅ Supabase 프로젝트 생성 및 연결
5. ✅ 이터레이션 1 MVP 개발 시작

---

**문서 버전**: 1.0
**생성일**: ${new Date().toLocaleDateString('ko-KR')}
**작성자**: AI PRD Generator
**최종 수정일**: ${new Date().toLocaleDateString('ko-KR')}
\`\`\``;

        setFinalPRD(prd);

        // Mock 모드 PRD 요약
        const mockPrdSummary = `### 문제 정의
사용자들은 현재 비효율적인 수작업 프로세스로 인해 많은 시간을 낭비하고 있으며, 데이터 관리의 어려움과 협업 부재로 생산성이 저하되고 있습니다.

### 해결 방안
웹/모바일 기반의 통합 플랫폼을 구축하여 자동화, 실시간 협업, 데이터 시각화를 제공하고 사용자 경험을 혁신적으로 개선합니다.

### 이터레이션 계획
MVP 핵심 기능부터 시작하여 3단계로 점진적 개발을 진행하며, 각 이터레이션마다 사용자에게 실질적 가치를 제공하는 완성된 기능을 배포합니다.

### 사용자 스토리
사용자 중심의 시나리오를 바탕으로 주요 기능을 정의했으며, 각 스토리는 'As-I want-So that' 형식과 명확한 인수 기준을 포함합니다.

### 기술 스택
현대적이고 확장 가능한 기술 스택을 선정했으며, React/Next.js 프론트엔드, Node.js/Python 백엔드, PostgreSQL 데이터베이스, AWS 인프라를 활용합니다.

### 화면 구성
직관적인 UX/UI 디자인을 적용하고, 모바일 퍼스트 반응형 디자인으로 모든 디바이스에서 최적의 사용자 경험을 제공합니다.

### 성공 지표
일일 활성 사용자(DAU), 작업 완료율, 응답 시간 등 구체적인 KPI를 설정하고, 데이터 기반으로 지속적인 개선을 진행합니다.`;

        setPrdSummary(mockPrdSummary);
        setIsProcessing(false);
      }, MOCK_PRD_DELAY);
    }
  };

  // 수정 요청 처리 (이터레이션 계획)
  const handleIterationPlanModification = async () => {
    if (!modificationRequest.trim()) return;

    const newHistory = [...modificationHistory, { type: 'user' as const, content: modificationRequest }];
    setModificationHistory(newHistory);
    setModificationRequest('');
    setIsProcessing(true);

    if (useRealAI && geminiApiKey) {
      const prompt = `다음은 현재 이터레이션 계획입니다:

${iterationPlan}

사용자가 다음과 같은 수정을 요청했습니다:
"${modificationRequest}"

위 요청을 반영하여 이터레이션 계획을 수정해주세요. 전체 내용을 다시 작성해주세요.`;

      const result = await callGeminiAPI(prompt);
      setIsProcessing(false);

      if (result) {
        setIterationPlan(result);
        setModificationHistory([...newHistory, { type: 'ai', content: '수정이 완료되었습니다. 위 내용을 확인해주세요.' }]);
      }
    } else {
      setTimeout(() => {
        setModificationHistory([...newHistory, { type: 'ai', content: 'Mock AI 모드에서는 수정 기능이 제한됩니다. Gemini API를 연결하면 실제로 수정할 수 있습니다.' }]);
        setIsProcessing(false);
      }, 1000);
    }
  };

  // 수정 요청 처리 (사용자 스토리)
  const handleUserStoryModification = async () => {
    if (!modificationRequest.trim()) return;

    const newHistory = [...modificationHistory, { type: 'user' as const, content: modificationRequest }];
    setModificationHistory(newHistory);
    setModificationRequest('');
    setIsProcessing(true);

    if (useRealAI && geminiApiKey) {
      const prompt = `다음은 현재 사용자 스토리입니다:

${userStories}

사용자가 다음과 같은 수정을 요청했습니다:
"${modificationRequest}"

위 요청을 반영하여 사용자 스토리를 수정해주세요. 전체 내용을 다시 작성해주세요.`;

      const result = await callGeminiAPI(prompt);
      setIsProcessing(false);

      if (result) {
        setUserStories(result);
        setModificationHistory([...newHistory, { type: 'ai', content: '수정이 완료되었습니다. 위 내용을 확인해주세요.' }]);
      }
    } else {
      setTimeout(() => {
        setModificationHistory([...newHistory, { type: 'ai', content: 'Mock AI 모드에서는 수정 기능이 제한됩니다. Gemini API를 연결하면 실제로 수정할 수 있습니다.' }]);
        setIsProcessing(false);
      }, 1000);
    }
  };

  // 수정 요청 처리 (최종 PRD)
  const handlePRDModification = async () => {
    if (!modificationRequest.trim()) return;

    const newHistory = [...modificationHistory, { type: 'user' as const, content: modificationRequest }];
    setModificationHistory(newHistory);
    setModificationRequest('');
    setIsProcessing(true);

    if (useRealAI && geminiApiKey) {
      const prompt = `다음은 현재 PRD입니다:

${finalPRD}

사용자가 다음과 같은 수정을 요청했습니다:
"${modificationRequest}"

위 요청을 반영하여 PRD를 수정해주세요. 전체 내용을 다시 작성해주세요. 반드시 \`\`\`markdown으로 감싸서 작성해주세요.`;

      const result = await callGeminiAPI(prompt);
      setIsProcessing(false);

      if (result) {
        setFinalPRD('```markdown\n' + result + '\n```');
        setModificationHistory([...newHistory, { type: 'ai', content: '수정이 완료되었습니다. 위 내용을 확인해주세요.' }]);
      }
    } else {
      setTimeout(() => {
        setModificationHistory([...newHistory, { type: 'ai', content: 'Mock AI 모드에서는 수정 기능이 제한됩니다. Gemini API를 연결하면 실제로 수정할 수 있습니다.' }]);
        setIsProcessing(false);
      }, 1000);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(finalPRD);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION);
    } catch (error) {
      console.error('클립보드 복사 실패:', error);
      alert('클립보드 복사에 실패했습니다.');
    }
  };

  const goBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <div className="max-w-full mx-auto w-full flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6 flex-shrink-0">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src="/logo.png"
                alt="위드인천에너지 로고"
                className="h-12 w-12 object-contain"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1 tracking-tight">
                  위드인천에너지 PRD 생성기
                </h1>
                <p className="text-gray-600 text-sm">단계별 질문을 통해 AI 앱 개발에 필요한 PRD(제품기획서)를 생성합니다</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!useRealAI && (
                <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                  💡 현재 가상 데이터로 동작 중입니다. AI 연동 시 맞춤형 질문과 PRD 생성이 가능합니다
                </div>
              )}
              <button
                onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                className={`font-medium py-2.5 px-5 rounded-lg transition-colors text-sm border ${
                  useRealAI
                    ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                }`}
              >
                {useRealAI ? 'AI 연결됨' : 'AI 설정'}
              </button>
            </div>
          </div>
          
        </div>

        {/* Progress Steps */}
        <div className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-200 py-4 px-6 flex-shrink-0">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center relative">
                  {/* Step Circle */}
                  <div className={`
                    relative w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm
                    transition-all duration-300 ease-in-out
                    ${index < currentStep
                      ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30'
                      : index === currentStep
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/40 ring-4 ring-blue-100'
                        : 'bg-white text-gray-400 border-2 border-gray-200'}
                  `}>
                    {index < currentStep ? (
                      <CheckCircle size={22} strokeWidth={2.5} />
                    ) : (
                      <span className="text-base">{index + 1}</span>
                    )}

                    {/* Active Step Pulse Animation */}
                    {index === currentStep && (
                      <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20"></span>
                    )}
                  </div>

                  {/* Step Label */}
                  <span className={`
                    text-sm mt-3 font-medium text-center transition-colors duration-200 whitespace-nowrap
                    ${index < currentStep
                      ? 'text-green-600'
                      : index === currentStep
                        ? 'text-blue-600'
                        : 'text-gray-400'}
                  `}>
                    {step.name}
                  </span>

                  {/* Step Status Badge */}
                  {index === currentStep && (
                    <span className="mt-1 px-2 py-0.5 bg-blue-100 text-blue-600 text-xs font-medium rounded-full">
                      진행 중
                    </span>
                  )}
                  {index < currentStep && (
                    <span className="mt-1 px-2 py-0.5 bg-green-100 text-green-600 text-xs font-medium rounded-full">
                      완료
                    </span>
                  )}
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="relative mx-4 mb-8">
                    <div className={`
                      h-1 w-20 rounded-full transition-all duration-500
                      ${index < currentStep
                        ? 'bg-gradient-to-r from-green-500 to-green-600'
                        : 'bg-gray-200'}
                    `}>
                      {index === currentStep - 1 && (
                        <div className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full animate-pulse"></div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 0: 문제 설명 */}
        {currentStep === 0 && (
          <div className="flex-1 flex overflow-hidden bg-gray-50">
            <div className="max-w-[1600px] mx-auto w-full grid grid-cols-2 gap-6 px-6 py-8 h-full">
              {/* 좌측: 입력 영역 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-200">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">해결하고자 하는 문제를 설명해주세요</h2>
                  <p className="text-gray-600 text-sm mb-2">
                    만들고자 하는 앱의 목적과 해결하려는 문제를 자유롭게 작성하세요.
                  </p>
                  <p className="text-blue-600 text-xs font-medium">
                    ⏱️ 예상 소요 시간: 10~15분 (전 과정 기준)
                  </p>
                </div>
                <textarea
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.ctrlKey && e.key === 'Enter' && !isProcessing) {
                      handleProblemSubmit();
                    }
                  }}
                  placeholder=""
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none resize-none text-sm transition-all duration-200"
                />
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Ctrl + Enter로 다음 단계로 이동할 수 있습니다
                  </p>
                  <button
                    onClick={handleProblemSubmit}
                    disabled={isProcessing}
                    className="text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium flex items-center gap-2 rounded-lg px-4 py-2.5 hover:from-blue-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        분석 중
                      </>
                    ) : (
                      <>
                        다음
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 우측: 안내 영역 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-y-auto hover:shadow-md transition-shadow duration-200">
                <h3 className="text-md font-semibold text-gray-900 mb-4">입력 가이드</h3>
                <div className="space-y-4 text-sm text-gray-700">
                  <div>
                    <p className="font-medium text-gray-900 mb-2">✓ 좋은 예시</p>
                    <ul className="space-y-2 ml-4">
                      <li className="text-gray-600">• 구체적인 상황과 문제점 설명</li>
                      <li className="text-gray-600">• 현재 사용 중인 방법과 불편한 점</li>
                      <li className="text-gray-600">• 목표로 하는 결과나 개선점</li>
                    </ul>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <p className="font-medium text-gray-900 mb-2">예시 1: 회의록 관리</p>
                    <div className="bg-gray-50 p-3 rounded text-xs text-gray-700">
                      "팀 회의 후 회의록 작성에 매번 30분 이상 소요됩니다. 회의 내용을 수동으로 정리하다 보니 중요한 액션 아이템을 놓치는 경우가 많습니다. 회의 내용을 자동으로 구조화하고 액션 아이템을 추적할 수 있는 도구가 필요합니다."
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <p className="font-medium text-gray-900 mb-2">예시 2: 재고 관리</p>
                    <div className="bg-gray-50 p-3 rounded text-xs text-gray-700">
                      "소규모 카페를 운영 중인데, 재고를 엑셀로 관리하다 보니 실시간으로 재고 파악이 어렵습니다. 유통기한이 임박한 재료를 미리 알림받고, 발주 시기를 자동으로 추천받을 수 있는 시스템이 필요합니다."
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <p className="font-medium text-gray-900 mb-2">예시 3: 고객 문의 관리</p>
                    <div className="bg-gray-50 p-3 rounded text-xs text-gray-700">
                      "온라인 쇼핑몰을 운영하는데, 카카오톡, 이메일, 전화로 들어오는 고객 문의를 하나씩 확인하고 답변하는 데 하루 2시간 이상 소요됩니다. 모든 문의를 한 곳에서 확인하고 자주 묻는 질문은 자동 답변할 수 있는 도구가 필요합니다."
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: 대화형 정보 수집 */}
        {currentStep === 1 && (
          <div className="flex-1 flex overflow-hidden bg-gray-50">
            <div className="max-w-[1600px] mx-auto w-full grid grid-cols-2 gap-6 px-6 py-8 h-full">
              {/* 좌측: 채팅 영역 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-200">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">사용자 이해하기</h2>
                  <p className="text-gray-600 text-sm font-medium">
                    디자인 씽킹 방식으로 사용자와 문제를 깊이 이해합니다 <span className="text-blue-600 font-bold">({chatMessages.filter(m => m.type === 'user').length}/{REQUIRED_ANSWERS})</span>
                  </p>
                </div>
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto mb-4 space-y-3 scroll-smooth pr-4">
              {chatMessages.map((msg, index) => (
                <div key={`${msg.type}-${index}`} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-2xl px-4 py-3 ${
                    msg.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-50 text-gray-900 border border-gray-200'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.hint && (
                      <p className="text-xs opacity-70 mt-2 whitespace-pre-wrap">{msg.hint}</p>
                    )}
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 border border-gray-200 px-4 py-3">
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Loader2 className="animate-spin" size={16} />
                      AI가 질문을 준비하고 있습니다...
                    </p>
                  </div>
                </div>
              )}
                </div>
                <div className="flex gap-2 mb-4">
                  <input
                    ref={chatInputRef}
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isProcessing && handleChatSubmit()}
                    placeholder="답변을 입력하세요"
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all duration-200 disabled:opacity-50 text-sm"
                  />
                  <button
                    onClick={handleChatSubmit}
                    disabled={isProcessing}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium px-5 py-2.5 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
                  >
                    전송
                  </button>
                </div>
                {chatMessages.filter(m => m.type === 'user').length >= REQUIRED_ANSWERS && !isProcessing && (
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={goBack}
                        className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 rounded-lg px-3 py-2 hover:bg-gray-100 transition-all duration-200"
                      >
                        <ArrowLeft size={14} />
                        이전 단계
                      </button>
                      <p className="text-xs text-amber-600 px-3">
                        * 현재 단계 내용이 삭제됩니다
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <button
                        onClick={generateDetailedInfo}
                        disabled={isProcessing}
                        className="text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium flex items-center gap-2 rounded-lg px-4 py-2 hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
                      >
                        다음
                        <ArrowRight size={14} />
                      </button>
                      <p className="text-xs text-gray-500 px-3">
                        Ctrl + Enter로 다음 단계로 이동할 수 있습니다
                      </p>
                    </div>
                  </div>
                )}
                {chatMessages.filter(m => m.type === 'user').length < REQUIRED_ANSWERS && (
                  <div className="mt-2 flex flex-col gap-1">
                    <button
                      onClick={goBack}
                      className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors"
                    >
                      <ArrowLeft size={14} />
                      이전 단계
                    </button>
                    <p className="text-xs text-amber-600 px-3">
                      * 현재 단계 내용이 삭제됩니다
                    </p>
                  </div>
                )}
              </div>

              {/* 우측: 입력한 문제 설명 표시 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col overflow-hidden">
                <h3 className="text-md font-semibold text-gray-900 mb-3 flex-shrink-0">입력한 문제</h3>
                <div className="bg-gray-50 p-3 border border-gray-200 rounded text-sm text-gray-700 whitespace-pre-wrap overflow-y-auto flex-shrink-0" style={{maxHeight: '120px'}}>
                  {problemDescription}
                </div>

                {/* 질문-답변 정리 */}
                <div className="mt-4 flex-shrink-0">
                  {chatMessages.filter(m => m.type === 'user').length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">질문 답변 정리</h4>
                      <div ref={basicQASummaryRef} className="bg-gray-50 p-3 border border-gray-200 rounded overflow-y-auto" style={{height: '340px'}}>
                        <div className="space-y-2.5">
                          {chatMessages
                            .filter(m => m.type === 'ai' && m.questionIndex !== undefined)
                            .map((aiMsg, idx) => {
                              const userAnswer = chatMessages.find(
                                (m, i) => m.type === 'user' && i > chatMessages.indexOf(aiMsg)
                              );
                              // 질문에서 예시 부분(줄바꿈 이후) 제거
                              const questionOnly = aiMsg.content.split('\n')[0];
                              return userAnswer ? (
                                <div key={idx} className="text-xs">
                                  <p className="text-gray-500 mb-0.5">{questionOnly}</p>
                                  <p className="text-gray-900 font-medium flex items-start gap-1.5">
                                    <CheckCircle size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                    <span>{userAnswer.content}</span>
                                  </p>
                                </div>
                              ) : null;
                            })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: 상세 정보 수집 */}
        {currentStep === 2 && (
          <div className="flex-1 flex overflow-hidden bg-gray-50">
            <div className="max-w-[1600px] mx-auto w-full grid grid-cols-2 gap-6 px-6 py-8 h-full">
              {/* 좌측: 채팅 영역 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col overflow-hidden">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">디자인 & 화면 상세 설계</h2>
                  <p className="text-gray-600 text-sm font-medium">
                    Visual Design과 UX/UI 방법론으로 디자인 시스템과 화면 구성을 설계합니다 <span className="text-blue-600 font-bold">({detailedChatMessages.filter(m => m.type === 'user').length}/{REQUIRED_ANSWERS})</span>
                  </p>
                </div>
                <div ref={detailedChatContainerRef} className="flex-1 overflow-y-auto mb-4 space-y-3 scroll-smooth pr-4">
              {detailedChatMessages.map((msg, index) => (
                <div key={`${msg.type}-${index}`} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-2xl px-4 py-3 ${
                    msg.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-50 text-gray-900 border border-gray-200'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.hint && (
                      <p className="text-xs opacity-70 mt-2 whitespace-pre-wrap">{msg.hint}</p>
                    )}
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 border border-gray-200 px-4 py-3">
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Loader2 className="animate-spin" size={16} />
                      AI가 질문을 준비하고 있습니다...
                    </p>
                  </div>
                </div>
              )}
                </div>
                <div className="flex gap-2 mb-4">
                  <input
                    ref={detailedChatInputRef}
                    type="text"
                    value={detailedUserInput}
                    onChange={(e) => setDetailedUserInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isProcessing && handleDetailedChatSubmit()}
                    placeholder="답변을 입력하세요"
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all duration-200 disabled:opacity-50 text-sm"
                  />
                  <button
                    onClick={handleDetailedChatSubmit}
                    disabled={isProcessing}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium px-5 py-2.5 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
                  >
                    전송
                  </button>
                </div>
                {detailedChatMessages.filter(m => m.type === 'user').length >= REQUIRED_ANSWERS && !isProcessing && (
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={goBack}
                        className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 rounded-lg px-3 py-2 hover:bg-gray-100 transition-all duration-200"
                      >
                        <ArrowLeft size={14} />
                        이전 단계
                      </button>
                      <p className="text-xs text-amber-600 px-3">
                        * 현재 단계 내용이 삭제됩니다
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <button
                        onClick={generateIterationPlan}
                        disabled={isProcessing}
                        className="text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium flex items-center gap-2 rounded-lg px-4 py-2 hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
                      >
                        다음
                        <ArrowRight size={14} />
                      </button>
                      <p className="text-xs text-gray-500 px-3">
                        Ctrl + Enter로 다음 단계로 이동할 수 있습니다
                      </p>
                    </div>
                  </div>
                )}
                {detailedChatMessages.filter(m => m.type === 'user').length < REQUIRED_ANSWERS && (
                  <div className="mt-2 flex flex-col gap-1">
                    <button
                      onClick={goBack}
                      className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors"
                    >
                      <ArrowLeft size={14} />
                      이전 단계
                    </button>
                    <p className="text-xs text-amber-600 px-3">
                      * 현재 단계 내용이 삭제됩니다
                    </p>
                  </div>
                )}
              </div>

              {/* 우측: 수집된 정보 요약 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col overflow-hidden">
                <h3 className="text-md font-semibold text-gray-900 mb-3 flex-shrink-0">기본 정보 요약</h3>
                <div className="bg-gray-50 p-3 border border-gray-200 rounded text-sm text-gray-700 overflow-y-auto flex-shrink-0" style={{maxHeight: '120px'}}>
                  <p className="text-xs leading-relaxed">
                    {isProcessing && !basicInfoSummary ? (
                      <span className="flex items-center gap-2 text-blue-600">
                        <Loader2 className="animate-spin" size={14} />
                        AI가 답변을 분석하고 요약을 생성하고 있습니다...
                      </span>
                    ) : (basicInfoSummary || '답변을 기다리고 있습니다...')}
                  </p>
                </div>
                {/* 상세 정보 질문-답변 정리 */}
                <div className="mt-4 flex-shrink-0">
                  {detailedChatMessages.filter(m => m.type === 'user').length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">화면 구성 답변 정리</h4>
                      <div ref={detailedQASummaryRef} className="bg-gray-50 p-3 border border-gray-200 rounded overflow-y-auto" style={{height: '340px'}}>
                        <div className="space-y-2.5">
                          {detailedChatMessages
                            .filter(m => m.type === 'ai' && m.questionIndex !== undefined)
                            .map((aiMsg, idx) => {
                              const userAnswer = detailedChatMessages.find(
                                (m, i) => m.type === 'user' && i > detailedChatMessages.indexOf(aiMsg)
                              );
                              // 질문에서 예시 부분(줄바꿈 이후) 제거
                              const questionOnly = aiMsg.content.split('\n')[0];
                              return userAnswer ? (
                                <div key={idx} className="text-xs">
                                  <p className="text-gray-500 mb-0.5">{questionOnly}</p>
                                  <p className="text-gray-900 font-medium flex items-start gap-1.5">
                                    <CheckCircle size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                    <span>{userAnswer.content}</span>
                                  </p>
                                </div>
                              ) : null;
                            })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: 이터레이션 계획 */}
        {currentStep === 3 && (
          <div className="flex-1 flex overflow-hidden bg-gray-50">
            <div className="max-w-[1600px] mx-auto w-full grid grid-cols-2 gap-6 px-6 py-8 h-full">
              {/* 좌측: 이터레이션 계획 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col overflow-hidden">
                <div className="mb-4 flex items-start justify-between flex-shrink-0">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">이터레이션 계획</h2>
                    <p className="text-gray-600 text-sm">
                      Agile 방법론으로 3단계 이터레이션 계획을 수립합니다.
                    </p>
                  </div>
                  {iterationPlan && !isProcessing && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(iterationPlan);
                        const btn = document.activeElement as HTMLButtonElement;
                        const originalText = btn.innerHTML;
                        btn.innerHTML = '복사됨!';
                        setTimeout(() => {
                          btn.innerHTML = originalText;
                        }, 1500);
                      }}
                      className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-3 rounded-lg transition-colors flex items-center gap-1 text-sm"
                    >
                      <Copy size={14} />
                      복사
                    </button>
                  )}
                </div>
                {isProcessing ? (
                  <div className="flex items-center justify-center flex-1">
                    <div className="text-center">
                      <CircularProgress percentage={progress} />
                      <p className="text-gray-900 font-medium mb-1 mt-4">이터레이션 계획 생성 중</p>
                      <p className="text-gray-600 text-sm">사용자 답변을 분석하고 있습니다</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-gray-50 border border-gray-200 p-6 flex-1 overflow-y-auto mb-4">
                      <pre className="text-sm text-gray-900 whitespace-pre-wrap font-sans">{iterationPlan}</pre>
                    </div>

                    {/* 수정 요청 채팅 */}
                    {modificationHistory.length > 0 && (
                      <div className="mb-4 flex-shrink-0">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">수정 기록</h3>
                        <div className="bg-white border border-gray-200 p-3 max-h-32 overflow-y-auto space-y-2">
                          {modificationHistory.map((msg, index) => (
                            <div key={index} className={`text-sm ${msg.type === 'user' ? 'text-blue-600' : 'text-gray-600'}`}>
                              <strong>{msg.type === 'user' ? '요청:' : 'AI:'}</strong> {msg.content}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mb-4 flex-shrink-0">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        수정이 필요하신가요? AI에게 요청해보세요
                      </label>
                      <div className="flex gap-2">
                        <input
                          ref={iterationModInputRef}
                          type="text"
                          value={modificationRequest}
                          onChange={(e) => setModificationRequest(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && !isProcessing && handleIterationPlanModification()}
                          placeholder='예: "이터레이션 2에 성능 최적화 추가해줘"'
                          disabled={isProcessing}
                          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all duration-200 disabled:opacity-50 text-sm"
                        />
                        <button
                          onClick={handleIterationPlanModification}
                          disabled={isProcessing || !modificationRequest.trim()}
                          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium py-2.5 px-5 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 whitespace-nowrap"
                        >
                          {isProcessing ? '수정 중...' : '수정 요청'}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between flex-shrink-0">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={goBack}
                          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 rounded-lg px-3 py-2 hover:bg-gray-100 transition-all duration-200"
                        >
                          <ArrowLeft size={14} />
                          이전 단계
                        </button>
                        <p className="text-xs text-amber-600 px-3">
                          * 현재 단계 내용이 삭제됩니다
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <button
                          onClick={generateUserStories}
                          className="text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium flex items-center gap-2 rounded-lg px-4 py-2 hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          다음
                          <ArrowRight size={14} />
                        </button>
                        <p className="text-xs text-gray-500 px-3">
                          Ctrl + Enter로 다음 단계로 이동할 수 있습니다
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 우측: 이터레이션 계획 요약 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col overflow-hidden">
                <h3 className="text-md font-semibold text-gray-900 mb-4">이터레이션 계획 요약</h3>
                <div className="bg-gray-50 p-4 border border-gray-200 rounded text-sm text-gray-700 overflow-y-auto flex-1">
                  <div className="space-y-4 text-xs leading-relaxed">
                    {(() => {
                      if (!iterationPlan) return (
                        <p className="text-gray-500 flex items-center gap-2">
                          <Loader2 className="animate-spin" size={14} />
                          이터레이션 계획을 생성 중입니다...
                        </p>
                      );

                      if (isProcessing && currentStep === 3) return (
                        <p className="text-blue-600 flex items-center gap-2">
                          <Loader2 className="animate-spin" size={14} />
                          이터레이션 계획 요약을 재생성 중입니다...
                        </p>
                      );

                      if (!iterationSummary) return (
                        <p className="text-gray-500 flex items-center gap-2">
                          <Loader2 className="animate-spin" size={14} />
                          요약을 생성 중입니다...
                        </p>
                      );

                      // AI가 생성한 요약을 각 이터레이션별로 표시
                      return iterationSummary.split(/\n\n+/).filter(s => s.trim()).map((summary, idx) => {
                        const trimmed = summary.trim();
                        const match = trimmed.match(/^이터레이션\s*(\d+):\s*(.+?)\s*-\s*(.+)$/s);
                        if (!match) {
                          // 매칭 실패 시에도 표시
                          return (
                            <div key={idx}>
                              <p className="text-gray-700 whitespace-pre-line">{trimmed}</p>
                            </div>
                          );
                        }

                        const [, num, title, content] = match;
                        return (
                          <div key={idx}>
                            <p className="font-semibold text-gray-900 mb-1">이터레이션 {num}: {title.trim()}</p>
                            <p className="text-gray-700">{content.trim()}</p>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: 사용자 스토리 */}
        {currentStep === 4 && (
          <div className="flex-1 flex overflow-hidden bg-gray-50">
            <div className="max-w-[1600px] mx-auto w-full grid grid-cols-2 gap-6 px-6 py-8 h-full">
              {/* 좌측: 사용자 스토리 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col overflow-hidden">
                <div className="mb-4 flex items-start justify-between flex-shrink-0">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">사용자 스토리</h2>
                    <p className="text-gray-600 text-sm">
                      User Story & Acceptance Criteria 방식으로 사용자 스토리를 작성합니다.
                    </p>
                  </div>
                  {userStories && !isProcessing && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(userStories);
                        const btn = document.activeElement as HTMLButtonElement;
                        const originalText = btn.innerHTML;
                        btn.innerHTML = '복사됨!';
                        setTimeout(() => {
                          btn.innerHTML = originalText;
                        }, 1500);
                      }}
                      className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-3 rounded-lg transition-colors flex items-center gap-1 text-sm"
                    >
                      <Copy size={14} />
                      복사
                    </button>
                  )}
                </div>
                {isProcessing ? (
                  <div className="flex items-center justify-center flex-1">
                    <div className="text-center">
                      <CircularProgress percentage={progress} />
                      <p className="text-gray-900 font-medium mb-1 mt-4">사용자 스토리 생성 중</p>
                      <p className="text-gray-600 text-sm">페르소나 분석 및 맞춤형 스토리 작성 중</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-gray-50 border border-gray-200 p-6 flex-1 overflow-y-auto mb-4">
                      <pre className="text-sm text-gray-900 whitespace-pre-wrap font-sans">{userStories}</pre>
                    </div>

                    {/* 수정 요청 채팅 */}
                    {modificationHistory.length > 0 && (
                      <div className="mb-4 flex-shrink-0">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">수정 기록</h3>
                        <div className="bg-white border border-gray-200 p-3 max-h-32 overflow-y-auto space-y-2">
                          {modificationHistory.map((msg, index) => (
                            <div key={index} className={`text-sm ${msg.type === 'user' ? 'text-blue-600' : 'text-gray-600'}`}>
                              <strong>{msg.type === 'user' ? '요청:' : 'AI:'}</strong> {msg.content}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mb-4 flex-shrink-0">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        수정이 필요하신가요? AI에게 요청해보세요
                      </label>
                      <div className="flex gap-2">
                        <input
                          ref={userStoryModInputRef}
                          type="text"
                          value={modificationRequest}
                          onChange={(e) => setModificationRequest(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && !isProcessing && handleUserStoryModification()}
                          placeholder='예: "스토리 2에 모바일 앱 시나리오 추가해줘"'
                          disabled={isProcessing}
                          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all duration-200 disabled:opacity-50 text-sm"
                        />
                        <button
                          onClick={handleUserStoryModification}
                          disabled={isProcessing || !modificationRequest.trim()}
                          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium py-2.5 px-5 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 whitespace-nowrap"
                        >
                          {isProcessing ? '수정 중...' : '수정 요청'}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between flex-shrink-0">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={goBack}
                          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 rounded-lg px-3 py-2 hover:bg-gray-100 transition-all duration-200"
                        >
                          <ArrowLeft size={14} />
                          이전 단계
                        </button>
                        <p className="text-xs text-amber-600 px-3">
                          * 현재 단계 내용이 삭제됩니다
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <button
                          onClick={generateFinalPRD}
                          className="text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium flex items-center gap-2 rounded-lg px-4 py-2 hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          다음
                          <ArrowRight size={14} />
                        </button>
                        <p className="text-xs text-gray-500 px-3">
                          Ctrl + Enter로 다음 단계로 이동할 수 있습니다
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 우측: 사용자 스토리 요약 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col overflow-hidden">
                <h3 className="text-md font-semibold text-gray-900 mb-4">사용자 스토리 요약</h3>
                <div className="bg-gray-50 p-4 border border-gray-200 rounded text-sm text-gray-700 overflow-y-auto flex-1">
                  <div className="space-y-4 text-xs leading-relaxed">
                    {(() => {
                      if (!userStories) return (
                        <p className="text-gray-500 flex items-center gap-2">
                          <Loader2 className="animate-spin" size={14} />
                          사용자 스토리를 생성 중입니다...
                        </p>
                      );

                      if (isProcessing && currentStep === 4) return (
                        <p className="text-blue-600 flex items-center gap-2">
                          <Loader2 className="animate-spin" size={14} />
                          사용자 스토리 요약을 재생성 중입니다...
                        </p>
                      );

                      // 사용자 스토리에서 각 스토리 추출
                      const stories = userStories.split(/## 스토리 \d+:/);

                      return stories.slice(1, 6).map((story, idx) => {
                        // 제목 추출
                        const lines = story.split('\n').filter(line => line.trim());
                        const title = lines[0]?.trim() || `스토리 ${idx + 1}`;

                        // As a, I want to, So that 추출
                        let asA = '';
                        let iWantTo = '';
                        let soThat = '';

                        lines.forEach(line => {
                          if (line.includes('**As a**')) {
                            asA = line.replace(/\*\*As a\*\*/i, '').trim();
                          } else if (line.includes('**I want to**')) {
                            iWantTo = line.replace(/\*\*I want to\*\*/i, '').trim();
                          } else if (line.includes('**So that**')) {
                            soThat = line.replace(/\*\*So that\*\*/i, '').trim();
                          }
                        });

                        return (
                          <div key={idx}>
                            <p className="font-semibold text-gray-900 mb-1">스토리 {idx + 1}: {title}</p>
                            <p className="text-gray-700">
                              {asA}이(가) {iWantTo} 위해, {soThat}
                            </p>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: 최종 PRD */}
        {currentStep === 5 && (
          <div className="flex-1 flex overflow-hidden bg-gray-50">
            <div className="max-w-[1600px] mx-auto w-full grid grid-cols-2 gap-6 px-6 py-8 h-full">
              {/* 좌측: 최종 PRD */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col overflow-hidden">
                <div className="mb-4 flex items-center justify-between flex-shrink-0">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">최종 PRD</h2>
                    <p className="text-gray-600 text-sm">
                      PRD 문서화 Best Practice로 완성도 높은 PRD를 생성했습니다.
                    </p>
                  </div>
                  {finalPRD && !isProcessing && (
                    <button
                      onClick={copyToClipboard}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-3 rounded-lg transition-colors flex items-center gap-1 text-sm"
                    >
                      <Copy size={14} />
                      {copied ? '복사됨!' : '복사'}
                    </button>
                  )}
                </div>
                {isProcessing ? (
                  <div className="flex items-center justify-center flex-1">
                    <div className="text-center">
                      <CircularProgress percentage={progress} />
                      <p className="text-gray-900 font-medium mb-1 mt-4">최종 PRD 생성 중</p>
                      <p className="text-gray-600 text-sm">모든 정보를 통합하고 보완하여 완성도 높은 PRD 작성 중</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-gray-50 border border-gray-200 p-6 flex-1 overflow-y-auto mb-4">
                      <pre className="text-sm text-gray-900 whitespace-pre-wrap font-mono">{finalPRD}</pre>
                    </div>

                    {/* 수정 요청 채팅 */}
                    {modificationHistory.length > 0 && (
                      <div className="mb-4 flex-shrink-0">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">수정 기록</h3>
                        <div className="bg-white border border-gray-200 p-3 max-h-32 overflow-y-auto space-y-2">
                          {modificationHistory.map((msg, index) => (
                            <div key={index} className={`text-sm ${msg.type === 'user' ? 'text-blue-600' : 'text-gray-600'}`}>
                              <strong>{msg.type === 'user' ? '요청:' : 'AI:'}</strong> {msg.content}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mb-4 flex-shrink-0">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        수정이 필요하신가요? AI에게 요청해보세요
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={modificationRequest}
                          onChange={(e) => setModificationRequest(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && !isProcessing && handlePRDModification()}
                          placeholder='예: "기술 스택에 Redis 추가해줘"'
                          disabled={isProcessing}
                          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all duration-200 disabled:opacity-50 text-sm"
                        />
                        <button
                          onClick={handlePRDModification}
                          disabled={isProcessing || !modificationRequest.trim()}
                          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium py-2.5 px-5 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 whitespace-nowrap"
                        >
                          {isProcessing ? '수정 중...' : '수정 요청'}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setCurrentStep(0);
                        setProblemDescription('');
                        setChatMessages([]);
                        setIterationPlan('');
                        setUserStories('');
                        setFinalPRD('');
                        setModificationHistory([]);
                        setModificationRequest('');
                      }}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium py-2.5 px-6 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0"
                    >
                      새로 시작하기
                    </button>
                  </>
                )}
              </div>

              {/* 우측: PRD 요약 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4 flex-shrink-0">
                  <p className="text-sm font-semibold text-blue-900 mb-3">✨ PRD 생성 완료!</p>
                  <p className="text-xs text-blue-800 leading-relaxed mb-3">
                    PRD를 복사하여 아래 AI 코딩 에이전트에게 전달하면 앱을 만들 수 있습니다.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href="https://aistudio.google.com/apps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-blue-700 text-xs font-medium rounded-md border border-blue-200 transition-all duration-200 hover:shadow-sm"
                    >
                      <span>Gemini Studio</span>
                      <ArrowRight size={12} />
                    </a>
                    <a
                      href="https://claude.ai/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-blue-700 text-xs font-medium rounded-md border border-blue-200 transition-all duration-200 hover:shadow-sm"
                    >
                      <span>Claude</span>
                      <ArrowRight size={12} />
                    </a>
                    <a
                      href="https://v0.dev"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-blue-700 text-xs font-medium rounded-md border border-blue-200 transition-all duration-200 hover:shadow-sm"
                    >
                      <span>v0</span>
                      <ArrowRight size={12} />
                    </a>
                  </div>
                </div>

                {/* 단계별 개발 안내 */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-lg p-4 mb-4 flex-shrink-0">
                  <p className="text-xs text-amber-900 leading-relaxed">
                    <span className="font-semibold">💡 단계별 개발 안내:</span> 이 PRD는 3단계 이터레이션으로 구성되어 있습니다.
                    좌측의<span className="font-medium"> 최종 PRD 전체를 복사</span>하여 AI 에이전트에 붙여넣으면,
                    AI가 자동으로<span className="font-medium"> 이터레이션 1 (MVP)</span>부터 핵심 기능을 구현합니다.
                    실제로 동작하는 앱을 확인한 후, 만들어진 결과물을 바탕으로
                    <span className="font-medium"> 이터레이션 2, 3</span>을 순차적으로 요청하여 점진적으로 기능을 확장해 나가세요.
                  </p>
                </div>

                <h3 className="text-md font-semibold text-gray-900 mb-4">PRD 요약</h3>
                <div className="bg-gray-50 p-4 border border-gray-200 rounded text-sm text-gray-700 overflow-y-auto flex-1">
                  <div className="space-y-4 text-xs leading-relaxed">
                    {(() => {
                      if (!finalPRD) return (
                        <p className="text-gray-500 flex items-center gap-2">
                          <Loader2 className="animate-spin" size={14} />
                          PRD를 생성 중입니다...
                        </p>
                      );

                      if (isProcessing && currentStep === 5) return (
                        <p className="text-blue-600 flex items-center gap-2">
                          <Loader2 className="animate-spin" size={14} />
                          PRD 요약을 재생성 중입니다...
                        </p>
                      );

                      if (!prdSummary) return (
                        <p className="text-gray-500 flex items-center gap-2">
                          <Loader2 className="animate-spin" size={14} />
                          요약을 생성 중입니다...
                        </p>
                      );

                      // AI가 생성한 PRD 요약을 섹션별로 표시
                      return prdSummary.split(/\n\n+/).filter(s => s.trim()).map((section, idx) => {
                        const lines = section.trim().split('\n');
                        const titleMatch = lines[0].match(/^###\s*(.+)$/);

                        if (!titleMatch) {
                          return (
                            <div key={idx}>
                              <p className="text-gray-700 whitespace-pre-line">{section.trim()}</p>
                            </div>
                          );
                        }

                        const title = titleMatch[1].trim();
                        const content = lines.slice(1).join('\n').trim();

                        return (
                          <div key={idx}>
                            <p className="font-semibold text-gray-900 mb-1">{title}</p>
                            <p className="text-gray-700">{content}</p>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-white border-t border-gray-200 py-3 text-gray-500 text-sm flex-shrink-0">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between px-6">
            <p>💡 각 단계에서 충분한 정보를 제공할수록 더 좋은 PRD가 생성됩니다</p>
            <p className="text-xs text-gray-400">뀨2-251021</p>
          </div>
        </div>
      </div>

      {/* API Key Modal */}
      {showApiKeyInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowApiKeyInput(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Gemini API 설정</h3>
              <button
                onClick={() => setShowApiKeyInput(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {useRealAI && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>✓ AI가 활성화되었습니다.</strong> 실제 AI가 맥락을 이해하고 최적의 질문을 생성합니다.
                </p>
              </div>
            )}

            <p className="text-sm text-gray-600 mb-4">
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Google AI Studio
              </a>에서 무료로 API 키를 발급받으세요.
            </p>

            <div className="space-y-3">
              <div>
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && testGeminiAPI()}
                  placeholder="API 키 입력"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                />
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded flex items-center justify-between gap-2">
                  <p className="text-xs text-amber-800 flex-1">
                    <strong>테스트용 임시 키:</strong> <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900">AIzaSyCUtCsVDz82_9pSEsJbtOFOlNfD_rHkMrM</code>
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('AIzaSyCUtCsVDz82_9pSEsJbtOFOlNfD_rHkMrM');
                      const btn = document.activeElement as HTMLButtonElement;
                      const originalText = btn.textContent;
                      btn.textContent = '복사됨!';
                      setTimeout(() => {
                        btn.textContent = originalText;
                      }, 1500);
                    }}
                    className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 rounded transition-colors whitespace-nowrap"
                  >
                    복사
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowApiKeyInput(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
                >
                  취소
                </button>
                <button
                  onClick={testGeminiAPI}
                  disabled={isProcessing || !geminiApiKey.trim()}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm disabled:opacity-50"
                >
                  {isProcessing ? '연결 중...' : '연결'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}