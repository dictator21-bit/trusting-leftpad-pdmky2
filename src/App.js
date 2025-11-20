import React, { useState, useEffect } from "react";
import {
  Upload,
  LineChart,
  Brain,
  ArrowRight,
  Sparkles,
  MessageCircle,
  Lightbulb,
  Play,
  Zap,
  CheckCircle,
  RotateCcw,
  AlertCircle,
} from "lucide-react";

// Gemini API 설정
const apiKey = ""; // 런타임 환경에서 키가 제공됩니다.

const App = () => {
  // 상태 관리
  const [isTraining, setIsTraining] = useState(false); // 학습 중(로딩) 여부
  const [isTrained, setIsTrained] = useState(false); // 학습 완료 여부
  const [showResult, setShowResult] = useState(false); // 결과 보여주기 여부

  const [selectedImage, setSelectedImage] = useState(null);
  const [promptText, setPromptText] = useState("");
  const [predictedValue, setPredictedValue] = useState("");
  const [aiReasoning, setAiReasoning] = useState(""); // AI의 분석 근거 멘트
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false); // 실제 API 분석 중 상태

  // 이미지 업로드 핸들러
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(URL.createObjectURL(file));
      resetModel(); // 이미지가 바뀌면 모델 초기화
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedImage(URL.createObjectURL(file));
      resetModel();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // 텍스트 변경 시
  const handleTextChange = (e) => {
    setPromptText(e.target.value);
  };

  // 이미지 파일을 Base64로 변환하는 헬퍼 함수
  const fileToBase64 = (blobUrl) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {
        const reader = new FileReader();
        reader.onloadend = function () {
          resolve(reader.result.split(",")[1]);
        };
        reader.readAsDataURL(xhr.response);
      };
      xhr.open("GET", blobUrl);
      xhr.responseType = "blob";
      xhr.send();
    });
  };

  // 실제 Gemini API 호출 함수
  const callGeminiAPI = async (base64Image, userPrompt) => {
    try {
      // 1. 프롬프트 구성
      const systemPrompt = `
        당신은 초등학교 4학년 학생들을 도와주는 친절한 AI 로봇입니다.
        학생이 업로드한 '꺾은선 그래프' 이미지를 보고 다음 값을 예측해야 합니다.
        
        학생이 적은 예측 방법(힌트): "${userPrompt}"

        다음 단계로 분석해 주세요:
        1. 이미지 속 그래프의 추세(상승, 하강, 유지 등)와 대략적인 마지막 값을 파악하세요.
        2. 학생이 적은 힌트(숫자나 예측 논리)를 최우선으로 반영하세요.
        3. 초등학생이 이해하기 쉬운 말투("주인님~ 했습니다!")로 존댓말을 써서 설명하세요.
        4. 결과는 반드시 다음 JSON 형식을 지켜주세요. (마크다운 없이 순수 JSON만 반환)
        {
          "prediction": "예측한 숫자 (정수)",
          "reasoning": "예측 이유 (학생의 힌트 언급 포함)"
        }
      `;

      // 2. API 호출 (Vision Multimodal)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: systemPrompt },
                  { inlineData: { mimeType: "image/png", data: base64Image } },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();

      // 3. 결과 파싱
      if (data.error) throw new Error(data.error.message);
      const textResult = data.candidates[0].content.parts[0].text;

      // JSON 부분만 추출 (가끔 마크다운이 섞일 수 있음)
      const jsonMatch = textResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch (error) {
      console.error("AI Analysis Failed:", error);
      return null; // 실패 시 시뮬레이션으로 대체하기 위해 null 반환
    }
  };

  // 1. AI 모델 학습 시작
  const startTraining = () => {
    if (!selectedImage || !promptText) {
      alert("그래프 이미지와 비법 노트를 모두 작성해주세요!");
      return;
    }
    setIsTraining(true);
    setLoadingProgress(0);
    setShowResult(false); // 결과 숨기기
  };

  // 학습 애니메이션 효과
  useEffect(() => {
    if (isTraining) {
      const timer = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            setTimeout(() => {
              setIsTraining(false);
              setIsTrained(true); // 학습 완료 상태로 변경
            }, 800);
            return 100;
          }
          return prev + 2; // 속도 조절
        });
      }, 40);
      return () => clearInterval(timer);
    }
  }, [isTraining]);

  // 텍스트 분석 함수 (NLP 시뮬레이션 강화)
  const analyzePrompt = (text) => {
    const cleanText = text.replace(/,/g, "");

    // 1. 숫자 추출
    const numbers = cleanText.match(/-?\d+(\.\d+)?/g); // 음수 포함
    const foundNumbers = numbers ? numbers.map(parseFloat) : [];
    // 문장에 마지막으로 등장한 숫자를 가장 중요한 숫자로 간주
    const lastNumber =
      foundNumbers.length > 0 ? foundNumbers[foundNumbers.length - 1] : null;

    // 2. 키워드 추출 (동의어 확장)
    const increaseKeywords = [
      "증가",
      "상승",
      "올라",
      "커질",
      "많아",
      "더하기",
      "up",
      "increase",
      "plus",
      "add",
      "높아",
    ];
    const decreaseKeywords = [
      "감소",
      "하락",
      "내려",
      "줄어",
      "적어",
      "빼기",
      "down",
      "decrease",
      "minus",
      "sub",
      "낮아",
    ];

    let trend = "maintain"; // 기본은 유지
    let detectedKeyword = "";

    // 키워드 우선순위: 텍스트에 포함된 키워드 찾기
    for (const keyword of increaseKeywords) {
      if (text.includes(keyword)) {
        trend = "increase";
        detectedKeyword = keyword;
        break;
      }
    }
    if (trend === "maintain") {
      for (const keyword of decreaseKeywords) {
        if (text.includes(keyword)) {
          trend = "decrease";
          detectedKeyword = keyword;
          break;
        }
      }
    }

    return { foundNumbers, lastNumber, trend, detectedKeyword };
  };

  // 2. AI 모델 작동 (실제 AI + 시뮬레이션 하이브리드)
  const runModel = async () => {
    if (!isTrained) {
      alert("먼저 'AI 모델 학습' 버튼을 눌러서 공부를 시켜주세요!");
      return;
    }

    setIsAnalyzing(true); // 분석 시작 표시

    let finalValue = 0;
    let reasoning = "";
    let isRealAnalysisSuccess = false;

    // 1. 실제 Gemini API 시도
    if (selectedImage) {
      try {
        const base64 = await fileToBase64(selectedImage);
        const result = await callGeminiAPI(base64, promptText);

        if (result) {
          finalValue = result.prediction;
          reasoning = result.reasoning;
          isRealAnalysisSuccess = true;
        }
      } catch (e) {
        console.log("Falling back to simulation mode");
      }
    }

    // 2. API 실패 시 기존 시뮬레이션 로직 사용 (백업)
    if (!isRealAnalysisSuccess) {
      const analysis = analyzePrompt(promptText);
      // 시뮬레이션을 위한 가상의 '이전 값' (그래프의 마지막 값이라고 가정)
      const simulatedLastValue = 120;

      // 로직 1: 구체적인 숫자가 있는 경우 (최우선 처리)
      if (analysis.lastNumber !== null) {
        // Case 1-A: "10만큼 증가" (변화량)
        if (
          Math.abs(analysis.lastNumber) < 60 &&
          analysis.trend !== "maintain"
        ) {
          if (analysis.trend === "increase") {
            finalValue = simulatedLastValue + analysis.lastNumber;
            reasoning = `주인님께서 **'${analysis.lastNumber}'**만큼 **'${analysis.detectedKeyword}'**한다고 알려주셨습니다! (이미지 연결 실패로 시뮬레이션 모드 작동)`;
          } else {
            finalValue = simulatedLastValue - analysis.lastNumber;
            reasoning = `주인님께서 **'${analysis.lastNumber}'**만큼 **'${analysis.detectedKeyword}'**한다고 알려주셨습니다! (이미지 연결 실패로 시뮬레이션 모드 작동)`;
          }
        }
        // Case 1-B: 목표값
        else {
          const variance = analysis.lastNumber * 0.01;
          const randomOffset = Math.random() * variance * 2 - variance;
          finalValue = Math.round(analysis.lastNumber + randomOffset);
          reasoning = `주인님께서 적어주신 숫자 **'${analysis.lastNumber}'**을(를) 목표값으로 인식했습니다! (이미지 연결 실패로 시뮬레이션 모드 작동)`;
        }
      }
      // 로직 2: 키워드만 있는 경우
      else if (analysis.trend === "increase") {
        finalValue = simulatedLastValue + Math.floor(Math.random() * 20) + 10;
        reasoning = `주인님께서 **'${analysis.detectedKeyword}'**할 것이라고 하셔서 높게 예측했습니다! (이미지 연결 실패로 시뮬레이션 모드 작동)`;
      } else if (analysis.trend === "decrease") {
        finalValue = simulatedLastValue - (Math.floor(Math.random() * 20) + 10);
        reasoning = `주인님께서 **'${analysis.detectedKeyword}'**할 것이라고 하셔서 낮게 예측했습니다! (이미지 연결 실패로 시뮬레이션 모드 작동)`;
      } else {
        finalValue = simulatedLastValue + Math.floor(Math.random() * 10) - 5;
        reasoning = `주인님의 비법을 참고하여 분석했습니다. (이미지 연결 실패로 시뮬레이션 모드 작동)`;
      }
    }

    setIsAnalyzing(false); // 분석 종료
    setPredictedValue(String(finalValue));
    setAiReasoning(reasoning);
    setShowResult(true);

    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }, 100);
  };

  // 초기화
  const resetModel = () => {
    setIsTrained(false);
    setShowResult(false);
    setPredictedValue("");
    setAiReasoning("");
  };

  const resetAll = () => {
    setSelectedImage(null);
    setPromptText("");
    resetModel();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-sky-50 font-sans text-slate-800 selection:bg-indigo-100 selection:text-indigo-800">
      {/* === 헤더 === */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500 p-2 rounded-2xl shadow-md transform rotate-3">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-indigo-600 tracking-tight">
                미래 예측 탐정단 🕵️
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                AI와 함께 그래프의 비밀을 찾아라!
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={resetAll}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              title="처음부터 다시하기"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* === 학습 중(로딩) 화면 오버레이 === */}
      {isTraining && (
        <div className="fixed inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center animate-fadeIn">
          <div className="relative w-40 h-40 mb-10">
            <div className="absolute inset-0 border-[6px] border-slate-100 rounded-full"></div>
            <div className="absolute inset-0 border-[6px] border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
            <div className="absolute inset-0 m-auto w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center animate-pulse">
              <Brain className="w-10 h-10 text-indigo-600" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-4 text-center">
            AI 모델 학습 중... ⚙️
          </h2>
          <p className="text-slate-600 text-center font-medium animate-pulse mb-8">
            그래프를 분석하고 있어요...
            <br />
            주인님의 비법 노트를 꼼꼼히 읽고 있어요...
          </p>
          <div className="w-64 bg-slate-200 rounded-full h-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-400 to-purple-500 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
          <div className="mt-3 font-bold text-indigo-600">
            {loadingProgress}% 완료
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 py-8 pb-32">
        <div className="space-y-8 animate-fadeIn">
          {/* 1. 그래프 업로드 섹션 */}
          <section className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-2 border-slate-100 overflow-hidden">
            <div className="p-6 bg-white flex justify-between items-center border-b border-slate-100">
              <div>
                <h2 className="text-xl font-extrabold flex items-center gap-3 text-slate-800">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 text-sm font-black">
                    1
                  </span>
                  사건 파일(그래프) 등록
                </h2>
                <p className="text-sm text-slate-500 mt-2 ml-11 font-medium">
                  우리가 조사할 꺾은선 그래프 사진을 올려줘!
                </p>
              </div>
              <LineChart className="w-8 h-8 text-indigo-200" />
            </div>

            <div className="p-8 bg-slate-50/50">
              <div
                className={`border-4 border-dashed rounded-2xl transition-all duration-200 flex flex-col items-center justify-center min-h-[240px] cursor-pointer group
                  ${
                    selectedImage
                      ? "border-indigo-300 bg-indigo-50/30"
                      : "border-slate-300 hover:border-indigo-400 hover:bg-white hover:shadow-lg"
                  }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                {selectedImage ? (
                  <div className="relative w-full h-full flex flex-col items-center p-4">
                    <img
                      src={selectedImage}
                      alt="Uploaded Graph"
                      className="max-h-[300px] object-contain rounded-lg shadow-md transform group-hover:scale-105 transition-transform"
                    />
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedImage(null);
                        resetModel();
                      }}
                      className="mt-6 px-6 py-2 bg-white border-2 border-red-100 shadow-sm rounded-full text-sm text-red-500 hover:bg-red-50 hover:border-red-200 font-bold transition-colors"
                    >
                      사진 바꾸기
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center cursor-pointer w-full h-full justify-center py-10">
                    <div className="w-20 h-20 bg-white border-2 border-indigo-100 text-indigo-400 rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-all">
                      <Upload className="w-10 h-10" />
                    </div>
                    <p className="text-slate-800 font-bold text-lg mb-2">
                      여기를 눌러서 사진 올리기
                    </p>
                    <p className="text-slate-400 text-sm font-medium">
                      또는 사진을 여기로 끌어다 놓아도 돼!
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </section>

          {/* 2. 프롬프트 입력 섹션 */}
          <section className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-2 border-slate-100 overflow-hidden relative">
            <div className="p-6 bg-white flex justify-between items-center border-b border-slate-100">
              <div>
                <h2 className="text-xl font-extrabold flex items-center gap-3 text-slate-800">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 text-sm font-black">
                    2
                  </span>
                  미래 예측 AI 모델 만들기
                </h2>
                <p className="text-sm text-slate-500 mt-2 ml-11 font-medium">
                  그래프를 보고 다음 값을 어떻게 알아낼 수 있는지 설명해줘.
                </p>
              </div>
              <Lightbulb className="w-8 h-8 text-yellow-300" />
            </div>

            <div className="p-6 bg-yellow-50/30 space-y-6">
              <div className="bg-yellow-50 rounded-3xl p-1 border-2 border-yellow-200 shadow-[4px_4px_0px_0px_rgba(250,204,21,0.2)]">
                <div className="bg-white/60 rounded-[20px] p-5 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-yellow-100">
                    <div className="bg-yellow-400 text-yellow-900 p-1.5 rounded-lg shadow-sm">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-yellow-800 text-lg">
                      미래 예측 방법!
                    </span>
                    <span className="text-xs bg-white text-yellow-600 px-2 py-1 rounded-full border border-yellow-200 font-medium ml-auto">
                      Tip: AI는 구체적으로 말해줘야 잘 알아들어!
                    </span>
                  </div>
                  <textarea
                    className="w-full h-48 bg-white border-2 border-yellow-100 rounded-xl p-4 text-slate-700 placeholder:text-slate-400 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 focus:outline-none transition-all text-base leading-relaxed resize-none shadow-inner"
                    placeholder={`[이렇게 적어보면 좋아요!]

1. 선이 위로 올라가고 있어? 아니면 내려가고 있어?
2. 작년 이맘때랑 모양이 비슷한지 확인해봐.
3. 계산해보니 150 정도 될 것 같아! (숫자를 적어주면 AI가 그 숫자를 참고해요)`}
                    value={promptText}
                    onChange={handleTextChange}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 3. 컨트롤 버튼 섹션 (학습 & 작동) */}
          <div className="sticky bottom-6 z-10">
            <div className="bg-white/80 backdrop-blur-md border border-white/50 p-4 rounded-3xl shadow-xl flex gap-4 items-center justify-center max-w-2xl mx-auto">
              {/* 버튼 1: AI 모델 학습 */}
              <button
                onClick={startTraining}
                disabled={!selectedImage || !promptText}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-lg shadow-md transition-all transform active:scale-95
                  ${
                    isTrained
                      ? "bg-slate-100 text-slate-500 hover:bg-slate-200 border-2 border-slate-200"
                      : "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-indigo-300 hover:-translate-y-1"
                  }
                  ${
                    (!selectedImage || !promptText) &&
                    "opacity-50 cursor-not-allowed hover:translate-y-0"
                  }
                `}
              >
                {isTrained ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Brain className="w-6 h-6" />
                )}
                {isTrained ? "학습 완료!" : "AI 모델 학습"}
              </button>

              {/* 화살표 아이콘 */}
              <div className="text-slate-300">
                <ArrowRight className="w-6 h-6" />
              </div>

              {/* 버튼 2: AI 모델 작동 */}
              <button
                onClick={runModel}
                disabled={!isTrained || isAnalyzing}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-lg shadow-md transition-all transform active:scale-95
                  ${
                    isTrained
                      ? "bg-yellow-400 text-yellow-900 hover:bg-yellow-300 hover:shadow-yellow-200 hover:-translate-y-1 border-b-4 border-yellow-600"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed border-2 border-slate-200"
                  }
                `}
              >
                {isAnalyzing ? (
                  <div className="w-6 h-6 border-4 border-yellow-800 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Zap
                    className={`w-6 h-6 ${isTrained ? "fill-current" : ""}`}
                  />
                )}
                {isAnalyzing ? "AI 분석 중..." : "AI 모델 작동"}
              </button>
            </div>

            {!isTrained && selectedImage && promptText && (
              <p className="text-center text-xs text-indigo-500 font-bold mt-2 animate-bounce">
                👆 먼저 왼쪽의 'AI 모델 학습' 버튼을 눌러보세요!
              </p>
            )}
          </div>

          {/* 4. 결과 출력 섹션 */}
          {showResult && (
            <div className="animate-fadeIn pt-4">
              <div className="bg-white rounded-3xl border-4 border-indigo-100 p-8 shadow-xl relative overflow-hidden">
                {/* 배경 장식 */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full -mr-10 -mt-10 opacity-50"></div>

                <div className="relative z-10 text-center">
                  <h3 className="text-2xl font-black text-slate-800 mb-6 flex items-center justify-center gap-2">
                    <Sparkles className="w-8 h-8 text-yellow-400 fill-yellow-400 animate-pulse" />
                    AI의 미래 예측 결과
                    <Sparkles className="w-8 h-8 text-yellow-400 fill-yellow-400 animate-pulse" />
                  </h3>

                  <div className="bg-indigo-50 rounded-2xl p-8 inline-block min-w-[300px] border-2 border-indigo-100 mb-6 transform transition-all hover:scale-105 hover:rotate-1">
                    <span className="text-sm text-indigo-500 font-bold block mb-3 uppercase tracking-wider">
                      Prediction Value
                    </span>
                    <div className="text-6xl font-black text-indigo-700 flex items-center justify-center gap-2">
                      {predictedValue}
                    </div>
                  </div>

                  <div className="max-w-xl mx-auto bg-yellow-50 p-6 rounded-2xl border border-yellow-200 text-left flex gap-4 items-start shadow-sm">
                    <div className="text-4xl shrink-0">🤖</div>
                    <div>
                      <div className="text-slate-700 font-medium leading-relaxed">
                        <p className="mb-2 font-bold text-indigo-800">
                          "위대한 주인님, 예측을 완료했습니다!"
                        </p>
                        <p
                          dangerouslySetInnerHTML={{
                            __html: aiReasoning.replace(
                              /\*\*(.*?)\*\*/g,
                              '<span class="bg-yellow-200 px-1 rounded font-bold text-slate-900">$1</span>'
                            ),
                          }}
                        />
                        <p className="mt-2 text-slate-500 text-sm">
                          저를 이렇게 똑똑하게 만들어주셔서 감사합니다!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
