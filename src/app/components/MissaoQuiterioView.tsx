// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import {
  Trophy,
  Star,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  BookOpen,
  Award,
  BookMarked,
  Flame,
  Volume2,
  VolumeX,
  ChevronRight,
  GraduationCap,
  X,
  ShieldAlert,
  ArrowLeft,
  User,
  AlertCircle,
  Check,
  TrendingUp,
  Lightbulb,
  Search,
  Heart,
  Zap,
  HelpCircle,
  Bot,
  RefreshCw,
  Coins,
} from "lucide-react";
import { Book, Loan, Student, UserSession } from "../types";
import { useTheme } from "../context/ThemeContext";
import { QuiterioMascot, MascotMood } from "./QuiterioMascot";
import { getQuestionsForBook, QuizQuestion } from "../data/quizQuestions";
import {
  getStudentGameData,
  addGamePoints,
  getTopSchoolRanking,
  recordAttemptCompletion,
  MAX_QUIZ_ATTEMPTS,
  StudentScoreData,
  BookScoreDetail,
} from "../utils/quiterioScores";
import {
  playCorrectSound,
  playWrongSound,
  playTickSound,
  playCatMeowSound,
  playCelebrationSound,
  setSoundEnabled,
} from "../utils/gameAudio";
import { gerarQuestaoComGemini, converterParaQuizQuestion } from "../services/geminiQuiz";

interface MissaoQuiterioViewProps {
  books: Book[];
  loans: Loan[];
  students: Student[];
  currentSession: UserSession;
  onSelectBook?: (book: Book) => void;
  onNavigateToCatalog?: () => void;
  onNavigateToRanking?: () => void;
  onBackToHome?: () => void;
}

// 20 minutes timer per question/challenge (1200 seconds)
const QUESTION_TIMER_SECONDS = 1200;

export const MissaoQuiterioView: React.FC<MissaoQuiterioViewProps> = ({
  books,
  loans,
  students,
  currentSession,
  onNavigateToCatalog,
  onNavigateToRanking,
  onBackToHome,
}) => {
  const { isDark } = useTheme();

  // Student Identification State
  const initialStudent = currentSession.student || null;
  const [activeStudent, setActiveStudent] = useState<Student | null>(initialStudent);
  const [studentCodeInput, setStudentCodeInput] = useState<string>(
    initialStudent?.studentCode || "",
  );
  const [isCodeModalOpen, setIsCodeModalOpen] = useState<boolean>(!initialStudent);
  const [codeError, setCodeError] = useState<string>("");
  const [isBadgesModalOpen, setIsBadgesModalOpen] = useState<boolean>(false);
  const [isBookSelectorModalOpen, setIsBookSelectorModalOpen] = useState<boolean>(false);

  // Audio mute state
  const [soundOn, setSoundOn] = useState<boolean>(true);

  // AI & Game-Show Stage Features
  const [useGeminiAi, setUseGeminiAi] = useState<boolean>(true);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [streakCount, setStreakCount] = useState<number>(0);
  const [showGuruTip, setShowGuruTip] = useState<boolean>(false);

  // Score & Gamification Data
  const [gameData, setGameData] = useState<StudentScoreData>(() => {
    const codeOrId = activeStudent?.studentCode || activeStudent?.id || "anon";
    return getStudentGameData(codeOrId, activeStudent?.name || "Estudante");
  });

  // Controls displaying the mascot's book-by-book scoreboard view
  const [showBookScoresView, setShowBookScoresView] = useState<boolean>(() => {
    const codeOrId = activeStudent?.studentCode || activeStudent?.id || "anon";
    const initData = getStudentGameData(codeOrId, activeStudent?.name || "Estudante");
    return (initData.attemptsCount || 0) >= MAX_QUIZ_ATTEMPTS;
  });

  const [leaderboard, setLeaderboard] = useState(() =>
    getTopSchoolRanking(activeStudent?.studentCode),
  );

  // Sync when student changes
  useEffect(() => {
    if (activeStudent) {
      const data = getStudentGameData(
        activeStudent.studentCode || activeStudent.id,
        activeStudent.name,
      );
      setGameData(data);
      setLeaderboard(getTopSchoolRanking(activeStudent.studentCode));
      if ((data.attemptsCount || 0) >= MAX_QUIZ_ATTEMPTS) {
        setShowBookScoresView(true);
      }
    }
  }, [activeStudent]);

  // Cross-reference books borrowed or returned by this student
  const studentLoans = useMemo(() => {
    if (!activeStudent) return [];
    return loans.filter((l) => {
      const studentCodeNormalized = (activeStudent.studentCode || "")
        .trim()
        .toLowerCase()
        .replace(/^alu-/, "");
      const loanCodeNormalized = (l.studentCode || "").trim().toLowerCase().replace(/^alu-/, "");
      const codeMatch = Boolean(
        studentCodeNormalized && loanCodeNormalized && studentCodeNormalized === loanCodeNormalized,
      );

      const studentNameNormalized = (activeStudent.name || "").trim().toLowerCase();
      const loanNameNormalized = (l.studentName || "").trim().toLowerCase();
      const nameMatch = Boolean(
        studentNameNormalized && loanNameNormalized && studentNameNormalized === loanNameNormalized,
      );

      const studentEmailNormalized = (activeStudent.email || "").trim().toLowerCase();
      const loanEmailNormalized = (l.studentEmail || "").trim().toLowerCase();
      const emailMatch = Boolean(
        studentEmailNormalized &&
        loanEmailNormalized &&
        studentEmailNormalized === loanEmailNormalized,
      );

      const studentIdNormalized = (activeStudent.id || "").trim().toLowerCase();
      const loanIdMatch = Boolean(
        studentIdNormalized && loanCodeNormalized === studentIdNormalized,
      );

      return codeMatch || nameMatch || emailMatch || loanIdMatch;
    });
  }, [activeStudent, loans]);

  // Unique books from student's loans
  const studentBooks = useMemo(() => {
    const map = new Map<string, { book: Book; loan: Loan }>();
    studentLoans.forEach((loan) => {
      const matchedBook = books.find((b) => b.id === loan.bookId) ||
        books.find((b) => b.title.toLowerCase() === loan.bookTitle.toLowerCase()) || {
          id: loan.bookId,
          title: loan.bookTitle,
          author: loan.bookAuthor,
          cover: loan.bookCover,
          category: "Literatura",
          rating: 5,
          reviewsCount: 1,
          status: "disponivel",
          pages: 100,
          year: 2026,
          publisher: "Biblioteca",
          location: "Geral",
          synopsis: `Obra emprestada por ${loan.studentName}.`,
          isbn: "000",
          totalCopies: 1,
          availableCopies: 1,
        };

      if (!map.has(matchedBook.title.toLowerCase())) {
        map.set(matchedBook.title.toLowerCase(), { book: matchedBook, loan });
      }
    });
    return Array.from(map.values());
  }, [studentLoans, books]);

  // Default book for quiz
  const defaultBook = useMemo(() => {
    if (studentBooks.length > 0) return studentBooks[0].book;
    return (
      books[0] || {
        id: "default_book",
        title: "Dom Casmurro",
        author: "Machado de Assis",
        cover:
          "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&auto=format&fit=crop&q=80",
        category: "Literatura Brasileira",
        rating: 5,
        reviewsCount: 1,
        status: "disponivel",
        pages: 256,
        year: 2026,
        publisher: "Biblioteca Maria Quitéria",
        location: "Geral",
        synopsis: "Clássico da literatura com a história de Bento Santiago e Capitu.",
        isbn: "978-85-001",
        totalCopies: 5,
        availableCopies: 5,
      }
    );
  }, [books, studentBooks]);

  const [selectedBookForQuiz, setSelectedBookForQuiz] = useState<Book>(defaultBook);

  // Sync selected book when student books change
  useEffect(() => {
    if (studentBooks.length > 0) {
      const isAlreadyInStudentBooks = studentBooks.some(
        (sb) =>
          sb.book.id === selectedBookForQuiz?.id ||
          sb.book.title.toLowerCase() === selectedBookForQuiz?.title?.toLowerCase(),
      );
      if (!isAlreadyInStudentBooks) {
        setSelectedBookForQuiz(studentBooks[0].book);
      }
    }
  }, [studentBooks, selectedBookForQuiz]);

  // Sync mascot speech bubble and mood based on student loan verification
  useEffect(() => {
    if (!activeStudent) {
      setSpeechBubbleText(
        "Miau! Identifique-se com seu código ou nome para cruzarmos seus empréstimos e liberar o Show de Saberes! 🐾",
      );
      setMascotMood("talking");
    } else if (studentLoans.length === 0) {
      setSpeechBubbleText(
        "Miau! Identificamos que você ainda não tem livros emprestados. Por favor, leia um livro para participar do Desafio! 🐾",
      );
      setMascotMood("thinking");
    } else {
      setSpeechBubbleText(
        `Miau! Bem-vindo ao Desafio Literário! Perguntas exclusivas de "${selectedBookForQuiz.title}" geradas para testar sua leitura real! 🐾`,
      );
      setMascotMood("talking");
    }
  }, [activeStudent, studentLoans.length, selectedBookForQuiz]);

  // Curated Questions as baseline
  const curatedQuestions: QuizQuestion[] = useMemo(() => {
    return getQuestionsForBook(selectedBookForQuiz);
  }, [selectedBookForQuiz]);

  // AI-generated question cache per question level (1 to 5)
  const [aiQuestionsCache, setAiQuestionsCache] = useState<Record<number, QuizQuestion>>({});

  // Quiz Game State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(QUESTION_TIMER_SECONDS);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(true);
  const [roundCompleted, setRoundCompleted] = useState<boolean>(false);
  const [roundStats, setRoundStats] = useState({ correct: 0, pointsEarned: 0 });
  const [floatingScore, setFloatingScore] = useState<number | null>(null);
  const [coverHasError, setCoverHasError] = useState<boolean>(false);

  // Mascot Mood & Speech Bubble Text
  const [mascotMood, setMascotMood] = useState<MascotMood>("talking");
  const [isMeowing, setIsMeowing] = useState<boolean>(false);
  const [speechBubbleText, setSpeechBubbleText] = useState<string>(
    "Bem-vindo ao Show de Saberes Literários! 🐾",
  );

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Active question resolution: prefers AI question if enabled and cached, else curated
  const activeQuestion: QuizQuestion = useMemo(() => {
    const level = currentQuestionIndex + 1;
    if (useGeminiAi && aiQuestionsCache[level]) {
      return aiQuestionsCache[level];
    }
    if (curatedQuestions[currentQuestionIndex]) {
      return curatedQuestions[currentQuestionIndex];
    }
    return (
      curatedQuestions[0] || {
        id: `fb_${level}`,
        bookTitle: selectedBookForQuiz.title,
        bookAuthor: selectedBookForQuiz.author,
        bookCover: selectedBookForQuiz.cover,
        question: `Qual é o tema central da obra "${selectedBookForQuiz.title}" de ${selectedBookForQuiz.author}?`,
        options: [
          "O valor humano e a reflexão proporcionada pela leitura",
          "A montagem técnica de engrenagens mecânicas",
          "Viagens interestelares em buracos negros",
          "Fórmulas matemáticas de geometria euclidiana",
        ],
        correctIndex: 0,
        explanation: `A leitura de "${selectedBookForQuiz.title}" enriquece a imaginação e a formação leitora!`,
        points: level * 1000,
        capituloReferencia: "Acervo Escolar",
        dicaGuru: "Pense no impacto literário da narrativa que você retirou na biblioteca!",
        nivel: level,
      }
    );
  }, [useGeminiAi, aiQuestionsCache, currentQuestionIndex, curatedQuestions, selectedBookForQuiz]);

  // Fetch AI Question from Gemini server proxy when question level changes
  useEffect(() => {
    if (!useGeminiAi || !selectedBookForQuiz?.title) return;
    const level = currentQuestionIndex + 1;
    if (aiQuestionsCache[level]) return;

    let isMounted = true;
    setIsAiLoading(true);

    gerarQuestaoComGemini(selectedBookForQuiz.title, selectedBookForQuiz.author, level, 5)
      .then((geminiRes) => {
        if (!isMounted) return;
        const converted = converterParaQuizQuestion(geminiRes, selectedBookForQuiz.cover);
        setAiQuestionsCache((prev) => ({ ...prev, [level]: converted }));
      })
      .catch((err) => {
        console.error("Fallback para questão local:", err);
      })
      .finally(() => {
        if (isMounted) setIsAiLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [useGeminiAi, currentQuestionIndex, selectedBookForQuiz, aiQuestionsCache]);

  // Reset question state
  const startQuestion = (idx: number) => {
    setCurrentQuestionIndex(idx);
    setSelectedOption(null);
    setIsAnswered(false);
    setIsCorrect(false);
    setTimeLeft(QUESTION_TIMER_SECONDS);
    setIsTimerActive(true);
    setMascotMood("talking");
    setIsMeowing(false);
    setShowGuruTip(false);
    setSpeechBubbleText(
      `Questão ${idx + 1} de 5 valendo ${(idx + 1) * 1000} pontos! Mostre seus conhecimentos! 🐾`,
    );
    setFloatingScore(null);
    setCoverHasError(false);
  };

  const handlePetQuiterio = () => {
    if (soundOn) playCatMeowSound();
    setIsMeowing(true);
    setSpeechBubbleText("Miau!! 🐾 O Quitério adora carinho e torce pelo seu sucesso no quiz!");
    setTimeout(() => {
      setIsMeowing(false);
    }, 2200);
  };

  // Timer countdown
  useEffect(() => {
    if (!isTimerActive || isAnswered || roundCompleted) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeUp();
          return 0;
        }
        if (prev <= 6 && soundOn) {
          playTickSound();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerActive, isAnswered, roundCompleted, soundOn]);

  const handleTimeUp = () => {
    setIsAnswered(true);
    setIsCorrect(false);
    setIsTimerActive(false);
    setMascotMood("thinking");
    setStreakCount(0);
    setSpeechBubbleText("Buzzer! ⏰ O tempo da pergunta esgotou! Na próxima você recupera! 🐾");
    if (soundOn) playWrongSound();
  };

  // Handle Option Click
  const handleSelectOption = (index: number) => {
    if (isAnswered || !activeQuestion) return;

    setIsAnswered(true);
    setIsTimerActive(false);
    setSelectedOption(index);

    const correct = index === activeQuestion.correctIndex;
    setIsCorrect(correct);

    const studentKey = activeStudent?.studentCode || activeStudent?.id || "aluno_anonimo";
    const studentName = activeStudent?.name || "Leitor Apaixonado";
    const questionPoints = activeQuestion.points || (currentQuestionIndex + 1) * 1000;

    if (correct) {
      const newStreak = streakCount + 1;
      setStreakCount(newStreak);

      setFloatingScore(questionPoints);
      setMascotMood("celebrating");
      setIsMeowing(true);
      setSpeechBubbleText(
        `RESPOSTA EXATA! 🏆 +${questionPoints} LivroCoins para sua pontuação! Miau!! 🐾`,
      );

      if (soundOn) {
        playCorrectSound();
        setTimeout(() => {
          playCatMeowSound();
        }, 250);
      }

      // Stage victory confetti burst
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#ffd165", "#f7be1d", "#62f0b3", "#06b6d4", "#eab308"],
        });
      } catch {
        // Fallback
      }

      // Persist score & update leaderboard
      const { updatedData } = addGamePoints(
        studentKey,
        studentName,
        questionPoints,
        true,
        selectedBookForQuiz.title,
        selectedBookForQuiz.author,
        selectedBookForQuiz.cover,
      );
      setGameData(updatedData);
      setLeaderboard(getTopSchoolRanking(activeStudent?.studentCode));
      setRoundStats((prev) => ({
        correct: prev.correct + 1,
        pointsEarned: prev.pointsEarned + questionPoints,
      }));
    } else {
      setStreakCount(0);
      setMascotMood("thinking");
      setIsMeowing(false);
      setSpeechBubbleText(
        "Ah, não foi dessa vez! Mas não desanime, leia a explicação literária e siga firme! 🐾",
      );

      if (soundOn) playWrongSound();

      const { updatedData } = addGamePoints(
        studentKey,
        studentName,
        0,
        false,
        selectedBookForQuiz.title,
        selectedBookForQuiz.author,
        selectedBookForQuiz.cover,
      );
      setGameData(updatedData);
      setLeaderboard(getTopSchoolRanking(activeStudent?.studentCode));
    }
  };

  // Next Question or Complete with 5-attempt limit tracking
  const handleNextQuestion = () => {
    if (currentQuestionIndex < 4) {
      startQuestion(currentQuestionIndex + 1);
    } else {
      const studentKey = activeStudent?.studentCode || activeStudent?.id || "aluno_anonimo";
      const studentName = activeStudent?.name || "Leitor Apaixonado";

      // Record completed attempt for this book
      const { updatedData, isLimitReached } = recordAttemptCompletion(
        studentKey,
        studentName,
        selectedBookForQuiz.title,
        selectedBookForQuiz.author,
        selectedBookForQuiz.cover,
        roundStats.pointsEarned,
        roundStats.correct,
        5,
      );

      setGameData(updatedData);
      setLeaderboard(getTopSchoolRanking(activeStudent?.studentCode));
      setRoundCompleted(true);
      setIsTimerActive(false);

      if (isLimitReached) {
        setMascotMood("celebrating");
        setIsMeowing(true);
        setSpeechBubbleText(
          "Miau!! 🎓 ESPETÁCULO! Você atingiu sua 5ª e última tentativa na Missão Quitério! Veja sua pontuação detalhada! 🐾",
        );
        setShowBookScoresView(true);
        if (soundOn) playCelebrationSound();
      } else {
        setMascotMood("celebrating");
        setSpeechBubbleText(
          `Sensacional, leitor de ouro! Rodada concluída com ${roundStats.pointsEarned} LivroCoins conquistados! 🏆`,
        );
        if (soundOn) playCelebrationSound();
      }
    }
  };

  const restartQuiz = () => {
    if ((gameData.attemptsCount || 0) >= MAX_QUIZ_ATTEMPTS) {
      setShowBookScoresView(true);
      setMascotMood("talking");
      setSpeechBubbleText(
        "Miau! Você já utilizou suas 5 tentativas na Missão! Confira seu boletim por livro abaixo! 🐾",
      );
      return;
    }
    setRoundCompleted(false);
    setRoundStats({ correct: 0, pointsEarned: 0 });
    setShowBookScoresView(false);
    setStreakCount(0);
    setAiQuestionsCache({});
    startQuestion(0);
  };

  const handleSelectBookForQuiz = (book: Book) => {
    setIsBookSelectorModalOpen(false);
    if ((gameData.attemptsCount || 0) >= MAX_QUIZ_ATTEMPTS) {
      setShowBookScoresView(true);
      setMascotMood("talking");
      setSpeechBubbleText(
        "Miau! Suas 5 tentativas foram concluídas! Confira seu histórico por livro! 🐾",
      );
      return;
    }
    setSelectedBookForQuiz(book);
    setRoundCompleted(false);
    setRoundStats({ correct: 0, pointsEarned: 0 });
    setShowBookScoresView(false);
    setStreakCount(0);
    setAiQuestionsCache({});
    startQuestion(0);
    setMascotMood("talking");
    setSpeechBubbleText(
      `Miau! Desafio selecionado para "${book.title}"! Gerando perguntas com IA! 🐾`,
    );
  };

  // Student Identification Modal handler
  const handleIdentifyStudent = (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError("");

    const rawInput = studentCodeInput.trim();
    if (!rawInput) {
      setCodeError("Digite seu Código ou Nome de Aluno para entrar no Desafio.");
      return;
    }

    const cleanInput = rawInput.toLowerCase().replace(/^alu-/, "");

    const foundStudent = students.find((s) => {
      const sCode = (s.studentCode || "").trim().toLowerCase().replace(/^alu-/, "");
      const sId = (s.id || "").trim().toLowerCase().replace(/^alu-/, "");
      const sName = (s.name || "").trim().toLowerCase();
      return (
        sCode === cleanInput ||
        sId === cleanInput ||
        sName === rawInput.toLowerCase() ||
        sName.includes(rawInput.toLowerCase())
      );
    });

    if (!foundStudent) {
      if (soundOn) playWrongSound();
      setCodeError("Aluno não encontrado! Verifique o código ou nome digitado.");
      return;
    }

    setActiveStudent(foundStudent);
    setIsCodeModalOpen(false);
    setCodeError("");

    const existingData = getStudentGameData(
      foundStudent.studentCode || foundStudent.id,
      foundStudent.name,
    );
    setGameData(existingData);
    setLeaderboard(getTopSchoolRanking(foundStudent.studentCode));
  };

  const handleCloseModal = () => {
    setIsCodeModalOpen(false);
    if (!activeStudent && onBackToHome) {
      onBackToHome();
    }
  };

  // Remaining lives calculated out of 5 attempts
  const remainingLives = Math.max(0, MAX_QUIZ_ATTEMPTS - (gameData.attemptsCount || 0));

  return (
    <div className="min-h-[calc(100vh-80px)] py-4 sm:py-6 px-3 sm:px-6 bg-[#0b1326] text-[#dae2fd] font-['Plus_Jakarta_Sans',sans-serif] selection:bg-[#ffd165] selection:text-[#0b1326] relative overflow-hidden">
      {/* Neo-Arcade Ambient Stage Lighting Rails */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.25),transparent_70%)]"
        aria-hidden="true"
      />
      <div
        className="absolute -top-32 -left-32 w-96 h-96 bg-[#ffd165]/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#06b6d4]/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Main Game-Show Arena Shell */}
      <div className="max-w-6xl mx-auto relative z-10 flex flex-col gap-5 sm:gap-6">
        {/* ========================================================================= */}
        {/* 1. STAGE HUD TOP BAR: Logo / Title + LivroCoins + Lives + Combo Multiplier */}
        {/* ========================================================================= */}
        <header className="p-4 sm:p-5 rounded-3xl bg-[#131b2e] border-2 border-[#334155] border-b-4 border-[#0b0f19] shadow-[0_12px_32px_rgba(0,0,0,0.5)] flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left: Branding & Back Button */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2.5">
              {onBackToHome && (
                <button
                  type="button"
                  onClick={onBackToHome}
                  title="Voltar ao início da Biblioteca"
                  className="px-3 py-2 rounded-xl bg-[#171f33] hover:bg-[#222a3d] border-2 border-[#334155] border-b-4 border-[#060e20] text-[#dae2fd] text-xs font-['Rubik'] font-bold flex items-center gap-1.5 transition-all cursor-pointer active:translate-y-1 active:border-b-2"
                >
                  <ArrowLeft className="w-4 h-4 text-[#ffd165]" />
                  <span className="hidden sm:inline">Início</span>
                </button>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-[#eab308]/20 border border-[#ffd165]/40 text-[#ffd165] text-[10px] font-['Rubik'] font-black tracking-widest uppercase">
                    Show de Saberes
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#62f0b3] font-bold">
                    <Bot className="w-3.5 h-3.5" />
                    <span>Gemini 1.5</span>
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-['Rubik'] font-black uppercase tracking-tight text-[#f8fafc] drop-shadow-[0_2px_8px_rgba(255,209,101,0.2)]">
                  Desafio Literário
                </h1>
              </div>
            </div>

            {/* Audio Toggle button */}
            <button
              id="btn-quiterio-sound-toggle"
              type="button"
              onClick={() => {
                const next = !soundOn;
                setSoundOn(next);
                setSoundEnabled(next);
              }}
              title={soundOn ? "Desativar Efeitos" : "Ativar Efeitos"}
              className={`p-2.5 rounded-2xl border-2 border-b-4 transition-all cursor-pointer shadow-md active:translate-y-1 active:border-b-2 ${
                soundOn
                  ? "bg-[#ffd165] text-[#251a00] border-[#f7be1d] border-b-[#ca8a04]"
                  : "bg-[#171f33] text-[#94a3b8] border-[#334155] border-b-[#0b0f19]"
              }`}
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>

          {/* Right: Stage HUD Status Badges (LivroCoins, Lives, Combo, Student Profile) */}
          <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-end flex-wrap">
            {/* LivroCoins Status Pill */}
            <div
              className="px-3.5 sm:px-4 py-2 rounded-2xl bg-[#060e20] border-2 border-[#eab308] border-b-4 border-[#ca8a04] shadow-[0_0_20px_-4px_rgba(234,179,8,0.45)] flex items-center gap-2"
              title="LivroCoins conquistados"
            >
              <Coins className="w-5 h-5 text-[#ffd165] drop-shadow-sm animate-pulse" />
              <div>
                <span className="text-[9px] uppercase font-['Rubik'] font-black text-[#ffd165]/80 block leading-tight">
                  LivroCoins
                </span>
                <span className="text-base sm:text-lg font-['Rubik'] font-black text-[#f8fafc] leading-none">
                  {gameData.score.toLocaleString("pt-BR")}
                </span>
              </div>
            </div>

            {/* Lives / Attempts Monitor (Ruby Dramatic) */}
            <div
              className="px-3.5 py-2 rounded-2xl bg-[#060e20] border-2 border-[#dc2626]/80 border-b-4 border-[#991b1b] shadow-[0_0_20px_-4px_rgba(220,38,38,0.35)] flex items-center gap-2"
              title={`${remainingLives} tentativa(s) restante(s) de ${MAX_QUIZ_ATTEMPTS}`}
            >
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => {
                  const isAlive = n <= remainingLives;
                  return (
                    <Heart
                      key={n}
                      className={`w-3.5 h-3.5 transition-all ${
                        isAlive
                          ? "text-[#dc2626] fill-[#dc2626] scale-105"
                          : "text-[#475569] fill-transparent opacity-30"
                      }`}
                    />
                  );
                })}
              </div>
              <span className="text-xs font-['Rubik'] font-black text-[#ffb4ab]">
                {remainingLives}/{MAX_QUIZ_ATTEMPTS}
              </span>
            </div>

            {/* Streak & Multiplier Badge */}
            {streakCount > 0 && (
              <div className="px-3 py-1.5 rounded-2xl bg-[#06b6d4]/20 border-2 border-[#06b6d4] border-b-4 border-[#0891b2] shadow-[0_0_16px_rgba(6,182,212,0.4)] flex items-center gap-1.5 text-xs font-['Rubik'] font-black text-[#06b6d4] animate-bounce">
                <Zap className="w-4 h-4 fill-current" />
                <span>COMBO x{streakCount}</span>
              </div>
            )}

            {/* Student ID / Switch Pill */}
            <button
              type="button"
              onClick={() => setIsCodeModalOpen(true)}
              className="px-3 py-2 rounded-2xl bg-[#171f33] hover:bg-[#222a3d] border-2 border-[#334155] border-b-4 border-[#060e20] text-xs font-bold flex items-center gap-2 text-[#dae2fd] cursor-pointer transition-all active:translate-y-1 active:border-b-2"
            >
              <User className="w-3.5 h-3.5 text-[#ffd165]" />
              <span className="truncate max-w-[100px] sm:max-w-[130px]">
                {activeStudent ? activeStudent.name.split(" ")[0] : "Identificar"}
              </span>
            </button>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* 2. STAGE ARENA: 12-Column Grid (Main Quiz Board + Host Mascote Console) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          {/* Main Quiz Board (8 Columns) */}
          <main className="lg:col-span-8 flex flex-col gap-5">
            <div className="p-5 sm:p-7 rounded-3xl bg-[#171f33] border-2 border-[#334155] border-b-6 border-[#060e20] shadow-[0_16px_40px_rgba(0,0,0,0.6)] relative overflow-hidden">
              {/* Top Banner inside Stage Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#334155]/80">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-[#ffd165] shadow-[0_0_10px_#ffd165]" />
                  <h2 className="text-lg sm:text-xl font-['Rubik'] font-bold text-[#f8fafc]">
                    {showBookScoresView || (gameData.attemptsCount || 0) >= MAX_QUIZ_ATTEMPTS
                      ? "Boletim da Missão Quitério"
                      : "Show de Saberes • Questão em Andamento"}
                  </h2>
                </div>

                {/* Sub-Tabs: Quiz vs Boletim */}
                {activeStudent && studentLoans.length > 0 && (
                  <div className="flex items-center p-1 rounded-2xl bg-[#060e20] border border-[#334155]">
                    <button
                      type="button"
                      onClick={() => {
                        if ((gameData.attemptsCount || 0) >= MAX_QUIZ_ATTEMPTS) {
                          setSpeechBubbleText(
                            "Miau! Você já completou suas 5 tentativas! Confira seus pontos por livro abaixo! 🐾",
                          );
                          return;
                        }
                        setShowBookScoresView(false);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-['Rubik'] font-bold transition-all cursor-pointer ${
                        !showBookScoresView && (gameData.attemptsCount || 0) < MAX_QUIZ_ATTEMPTS
                          ? "bg-[#ffd165] text-[#251a00] shadow-sm"
                          : "text-[#94a3b8] hover:text-[#f8fafc]"
                      }`}
                    >
                      Arena de Questões
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBookScoresView(true)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-['Rubik'] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        showBookScoresView || (gameData.attemptsCount || 0) >= MAX_QUIZ_ATTEMPTS
                          ? "bg-[#ffd165] text-[#251a00] shadow-sm"
                          : "text-[#94a3b8] hover:text-[#f8fafc]"
                      }`}
                    >
                      <span>Boletim de Pontos</span>
                      {Object.keys(gameData.bookScores || {}).length > 0 && (
                        <span className="w-4 h-4 rounded-full bg-[#131b2e] text-[#ffd165] text-[10px] flex items-center justify-center font-bold">
                          {Object.keys(gameData.bookScores || {}).length}
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Floating +Pontos Burst on Correct Answer */}
              <AnimatePresence>
                {floatingScore !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 0, scale: 0.5 }}
                    animate={{ opacity: 1, y: -45, scale: 1.25 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.8 }}
                    className="absolute top-4 right-6 sm:right-8 z-30 pointer-events-none px-4 py-2 rounded-2xl bg-gradient-to-r from-[#ffd165] to-[#f7be1d] text-[#251a00] font-['Rubik'] font-black text-base sm:text-lg shadow-[0_8px_25px_rgba(247,190,29,0.5)] flex items-center gap-1.5 border-2 border-[#fff] border-b-4 border-[#ca8a04]"
                  >
                    <Sparkles className="w-5 h-5 text-[#251a00]" />+{floatingScore} LIVROCOINS!
                  </motion.div>
                )}
              </AnimatePresence>

              {/* State A: Aluno não identificado */}
              {!activeStudent ? (
                <div className="py-12 px-4 text-center flex flex-col items-center">
                  <div className="w-16 h-16 rounded-3xl bg-[#060e20] border-2 border-[#ffd165] flex items-center justify-center text-[#ffd165] mb-4 shadow-[0_0_20px_rgba(255,209,101,0.2)]">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-['Rubik'] font-black text-[#f8fafc] mb-2">
                    Acesso à Arena Bloqueado
                  </h3>
                  <p className="text-xs sm:text-sm text-[#94a3b8] max-w-md mx-auto mb-6">
                    Digite seu <strong>Código ou Nome de Aluno</strong> para cruzarmos os livros que
                    você retirou e liberar o quiz literário do Google AI Studio!
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsCodeModalOpen(true)}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#ffd165] to-[#f7be1d] text-[#251a00] font-['Rubik'] font-black text-sm shadow-[0_4px_0_#ca8a04] border-2 border-[#fff] border-b-4 border-[#ca8a04] active:translate-y-1 active:border-b-2 cursor-pointer transition-all flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    <span>Identificar Aluno Agora</span>
                  </button>
                </div>
              ) : studentLoans.length === 0 ? (
                /* State B: Aluno sem empréstimos na biblioteca escolar */
                <div className="py-10 sm:py-14 px-4 sm:px-6 text-center flex flex-col items-center justify-center">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-[#ffd165] to-[#f7be1d] p-1 shadow-[0_0_30px_rgba(247,190,29,0.3)] flex items-center justify-center mb-4">
                    <div className="w-full h-full rounded-2xl bg-[#060e20] flex items-center justify-center text-4xl sm:text-5xl">
                      📖
                    </div>
                  </div>

                  <h2 className="text-2xl sm:text-4xl md:text-5xl font-['Rubik'] font-black uppercase text-[#ffd165] tracking-tight leading-tight my-2 drop-shadow-md">
                    Por favor Leia um Livro
                  </h2>

                  <div className="max-w-xl mx-auto my-4 p-5 rounded-2xl bg-[#060e20] border-2 border-[#ffd165]/50 text-[#dae2fd] text-sm leading-relaxed shadow-lg">
                    <p className="font-['Rubik'] font-extrabold text-base text-[#ffd165] mb-1 flex items-center justify-center gap-1.5">
                      <span>🐾</span>
                      <span>Olá, {activeStudent.name}!</span>
                    </p>
                    <p className="text-xs sm:text-sm text-[#94a3b8]">
                      Cruzamos seus dados com o registro de empréstimos da biblioteca e não
                      encontramos nenhum livro retirado por você. Para participar do{" "}
                      <strong>Desafio Literário</strong>, retire e leia um livro na biblioteca
                      escolar! As perguntas são formuladas pelo Gemini com base exclusiva nas obras
                      que você retirou.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
                    {onNavigateToCatalog && (
                      <button
                        type="button"
                        onClick={onNavigateToCatalog}
                        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#ffd165] to-[#f7be1d] text-[#251a00] font-['Rubik'] font-black text-sm flex items-center gap-2 border-2 border-[#fff] border-b-4 border-[#ca8a04] shadow-[0_4px_0_#ca8a04] active:translate-y-1 active:border-b-2 cursor-pointer transition-all"
                      >
                        <BookOpen className="w-5 h-5" />
                        <span>Ir para o Catálogo da Biblioteca</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsCodeModalOpen(true)}
                      className="px-5 py-3 rounded-2xl border-2 border-[#334155] border-b-4 border-[#060e20] bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] font-bold text-sm flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <User className="w-4 h-4 text-[#ffd165]" />
                      <span>Consultar Outro Aluno</span>
                    </button>
                  </div>
                </div>
              ) : showBookScoresView || (gameData.attemptsCount || 0) >= MAX_QUIZ_ATTEMPTS ? (
                /* State C: Boletim Detalhado por Livro */
                <div className="pt-4 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#334155]">
                    <div>
                      <span className="text-xs font-['Rubik'] font-bold uppercase text-[#ffd165]">
                        Boletim Oficial de Leituras
                      </span>
                      <h3 className="text-lg font-['Rubik'] font-black text-[#f8fafc]">
                        Desempenho de {activeStudent.name}
                      </h3>
                    </div>

                    <div className="px-3.5 py-1.5 rounded-xl bg-[#060e20] border border-[#ffd165]/50 text-xs font-['Rubik'] font-bold text-[#ffd165]">
                      Total: {gameData.score.toLocaleString("pt-BR")} LivroCoins
                    </div>
                  </div>

                  {/* Warning if 5 attempts limit reached */}
                  {(gameData.attemptsCount || 0) >= MAX_QUIZ_ATTEMPTS && (
                    <div className="p-4 rounded-2xl bg-[#060e20] border-2 border-[#ffd165] border-b-4 border-[#ca8a04] flex items-center gap-3">
                      <span className="text-3xl flex-shrink-0">🎓</span>
                      <div className="text-xs sm:text-sm">
                        <strong className="font-['Rubik'] font-black text-[#ffd165] block">
                          5 de 5 Tentativas Concluídas!
                        </strong>
                        <span className="text-[#94a3b8]">
                          Conforme o regulamento do Desafio Literário, você atingiu o limite de 5
                          rodadas da Missão Quitério. Parabéns pelo esforço e dedicação à leitura!
                        </span>
                      </div>
                    </div>
                  )}

                  {/* List of book scores */}
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {Object.keys(gameData.bookScores || {}).length === 0 ? (
                      <div className="p-8 text-center rounded-2xl bg-[#060e20] border border-dashed border-[#334155] flex flex-col items-center">
                        <BookOpen className="w-10 h-10 text-[#475569] mb-2" />
                        <h4 className="text-base font-['Rubik'] font-bold text-[#f8fafc]">
                          Nenhum livro pontuado ainda
                        </h4>
                        <p className="text-xs text-[#94a3b8] max-w-xs mt-1">
                          Inicie o desafio para responder às perguntas geradas e acumular
                          LivroCoins!
                        </p>
                      </div>
                    ) : (
                      (Object.values(gameData.bookScores || {}) as BookScoreDetail[]).map(
                        (bookScore, idx) => {
                          const matchedBook =
                            books.find(
                              (b) => b.title.toLowerCase() === bookScore.bookTitle.toLowerCase(),
                            ) || selectedBookForQuiz;
                          const cover = bookScore.bookCover || matchedBook.cover;
                          const percentage =
                            bookScore.totalQuestions > 0
                              ? Math.round(
                                  (bookScore.correctAnswers / bookScore.totalQuestions) * 100,
                                )
                              : 0;

                          return (
                            <div
                              key={idx}
                              className="p-4 rounded-2xl bg-[#131b2e] border-2 border-[#334155] border-b-4 border-[#060e20] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-16 rounded-xl overflow-hidden bg-[#060e20] flex-shrink-0 border border-[#334155] flex items-center justify-center shadow-sm">
                                  {cover ? (
                                    <img
                                      src={cover}
                                      alt={bookScore.bookTitle}
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <BookOpen className="w-5 h-5 text-[#94a3b8]" />
                                  )}
                                </div>
                                <div className="truncate">
                                  <span className="text-[10px] font-['Rubik'] font-bold uppercase tracking-wider text-[#ffd165]">
                                    {bookScore.bookAuthor || matchedBook.author}
                                  </span>
                                  <h4 className="text-sm sm:text-base font-['Rubik'] font-bold text-[#f8fafc] truncate">
                                    {bookScore.bookTitle}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="w-24 h-2 rounded-full bg-[#060e20] overflow-hidden border border-[#334155]">
                                      <div
                                        className="h-full bg-gradient-to-r from-[#ffd165] to-[#62f0b3] rounded-full"
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                    <span className="text-[11px] font-bold text-[#62f0b3]">
                                      {bookScore.correctAnswers}/{bookScore.totalQuestions} (
                                      {percentage}%)
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-2 flex-shrink-0">
                                <div className="px-3.5 py-1.5 rounded-xl bg-[#060e20] border-2 border-[#eab308] text-[#ffd165] font-['Rubik'] font-black text-sm flex items-center gap-1.5 shadow-[0_0_12px_rgba(234,179,8,0.25)]">
                                  <Star className="w-4 h-4 fill-[#ffd165]" />
                                  <span>{bookScore.points} pts</span>
                                </div>
                              </div>
                            </div>
                          );
                        },
                      )
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-[#334155] flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-[#94a3b8]">
                      Tentativas usadas: {gameData.attemptsCount || 0} de {MAX_QUIZ_ATTEMPTS}
                    </span>
                    {(gameData.attemptsCount || 0) < MAX_QUIZ_ATTEMPTS && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowBookScoresView(false);
                          if (roundCompleted) restartQuiz();
                        }}
                        className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#ffd165] to-[#f7be1d] text-[#251a00] font-['Rubik'] font-black text-xs shadow-[0_3px_0_#ca8a04] border border-[#fff] border-b-3 border-[#ca8a04] active:translate-y-1 active:border-b-2 cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        <span>Voltar para a Arena</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ) : activeQuestion && !roundCompleted ? (
                /* State D: Arena de Questões (Stage Knowledge Quest) */
                <div className="pt-4 flex flex-col gap-5">
                  {/* Top Question Row: Book Spine Crease Card + Countdown + Level / Pts Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#334155]">
                    {/* Book Metadata */}
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-15 rounded-xl overflow-hidden bg-[#060e20] flex-shrink-0 border-2 border-[#334155] shadow-md flex items-center justify-center relative">
                        {!coverHasError && activeQuestion.bookCover ? (
                          <img
                            src={activeQuestion.bookCover}
                            alt={activeQuestion.bookTitle}
                            onError={() => setCoverHasError(true)}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <BookOpen className="w-5 h-5 text-[#ffd165]" />
                        )}
                        {/* 3D Spine Crease Effect */}
                        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-r from-white/30 to-transparent pointer-events-none" />
                      </div>

                      <div className="truncate">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-['Rubik'] font-bold uppercase px-2 py-0.5 rounded-md bg-[#06b6d4]/20 text-[#06b6d4] border border-[#06b6d4]/40">
                            Nível {activeQuestion.nivel || currentQuestionIndex + 1}/5
                          </span>
                          <span className="text-[10px] font-['Rubik'] font-bold uppercase px-2 py-0.5 rounded-md bg-[#eab308]/20 text-[#ffd165] border border-[#eab308]/40">
                            +{activeQuestion.points || (currentQuestionIndex + 1) * 1000} Pts
                          </span>
                          {activeQuestion.capituloReferencia && (
                            <span className="text-[11px] text-[#94a3b8] truncate">
                              • {activeQuestion.capituloReferencia}
                            </span>
                          )}
                        </div>
                        <h3 className="text-base sm:text-lg font-['Rubik'] font-bold text-[#f8fafc] truncate mt-0.5">
                          {activeQuestion.bookTitle}
                        </h3>
                        <span className="text-xs text-[#94a3b8] block truncate">
                          {activeQuestion.bookAuthor}
                        </span>
                      </div>
                    </div>

                    {/* 20-min Countdown Timer with Ruby Alert when <= 60s */}
                    <div
                      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl font-['Rubik'] font-black text-xs sm:text-sm border-2 border-b-4 shadow-md flex-shrink-0 ${
                        timeLeft <= 60
                          ? "bg-[#dc2626] text-white border-[#f87171] border-b-[#991b1b] animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.5)]"
                          : "bg-[#060e20] text-[#ffd165] border-[#ffd165]/50 border-b-[#ca8a04]"
                      }`}
                      title="Tempo restante: 20 minutos"
                    >
                      <Clock className="w-4 h-4 text-current" />
                      <span className="font-mono">
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                      </span>
                    </div>
                  </div>

                  {/* Question Box (Recessed Stage Floor Slab) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#0b0f19] border-2 border-[#334155] border-b-4 border-[#060e20] shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)] relative">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-['Rubik'] font-bold text-[#06b6d4] uppercase tracking-wider">
                        Questão {currentQuestionIndex + 1} de 5
                      </span>
                      {isAiLoading && (
                        <span className="text-[10px] text-[#ffd165] font-bold flex items-center gap-1 animate-pulse">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Gemini gerando...</span>
                        </span>
                      )}
                    </div>
                    <h2 className="text-base sm:text-lg md:text-xl font-['Rubik'] font-bold text-[#f8fafc] leading-snug">
                      {activeQuestion.question}
                    </h2>
                  </div>

                  {/* Dica do Guru Accordion / Reveal Card */}
                  {activeQuestion.dicaGuru && (
                    <div className="p-3 rounded-2xl bg-[#eab308]/10 border border-[#ffd165]/30 flex items-start gap-2.5 text-xs text-[#ffd165]">
                      <Lightbulb className="w-4 h-4 text-[#ffd165] flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-['Rubik'] font-bold block text-[11px] uppercase tracking-wider text-[#ffd165]">
                          Dica do Guru Literário:
                        </strong>
                        <span className="text-[#dae2fd]/90 font-medium">
                          {activeQuestion.dicaGuru}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 3D Tactile Answer Options Slabs (A, B, C, D) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                    {activeQuestion.options.map((optionText, optIndex) => {
                      const letter = String.fromCharCode(65 + optIndex);
                      const isSelected = selectedOption === optIndex;
                      const isThisCorrect = optIndex === activeQuestion.correctIndex;

                      // Default Tactile Neo-Arcade Slab
                      let slabStyle =
                        "bg-[#131b2e] hover:bg-[#1a243c] text-[#f8fafc] border-2 border-[#334155] border-b-4 border-[#060e20] shadow-[0_4px_0_#060e20] active:translate-y-1 active:border-b-2";
                      let letterStyle = "bg-[#060e20] text-[#06b6d4] border border-[#06b6d4]/40";

                      if (isAnswered) {
                        if (isThisCorrect) {
                          // Glowing Emerald Green on Triumph
                          slabStyle =
                            "bg-[#065f46] text-white border-2 border-[#34d399] border-b-4 border-[#047857] shadow-[0_0_24px_-4px_rgba(16,185,129,0.5)] font-bold";
                          letterStyle = "bg-[#10b981] text-[#064e3b] font-black";
                        } else if (isSelected && !isThisCorrect) {
                          // Ruby Red Buzzer on Wrong
                          slabStyle =
                            "bg-[#7f1d1d] text-white border-2 border-[#f87171] border-b-4 border-[#991b1b] shadow-[0_0_24px_-4px_rgba(220,38,38,0.5)] font-bold";
                          letterStyle = "bg-[#dc2626] text-white font-black";
                        } else {
                          slabStyle =
                            "opacity-35 bg-[#0b0f19] border-[#1e293b] text-[#64748b] shadow-none";
                          letterStyle = "bg-[#1e293b] text-[#64748b] border-transparent";
                        }
                      }

                      return (
                        <motion.button
                          key={optIndex}
                          whileHover={!isAnswered ? { y: -2 } : {}}
                          whileTap={!isAnswered ? { scale: 0.98 } : {}}
                          disabled={isAnswered}
                          onClick={() => handleSelectOption(optIndex)}
                          className={`p-3.5 sm:p-4 rounded-2xl text-left transition-all flex items-center justify-between gap-3 cursor-pointer min-h-[64px] ${slabStyle}`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-8 h-8 rounded-xl font-['Rubik'] font-black text-xs sm:text-sm flex items-center justify-center flex-shrink-0 shadow-sm ${letterStyle}`}
                            >
                              {letter}
                            </span>
                            <span className="text-xs sm:text-sm font-medium leading-snug">
                              {optionText}
                            </span>
                          </div>

                          {isAnswered && (
                            <div className="flex-shrink-0">
                              {isThisCorrect ? (
                                <CheckCircle2 className="w-5 h-5 text-[#62f0b3] drop-shadow-md" />
                              ) : isSelected ? (
                                <XCircle className="w-5 h-5 text-[#ffb4ab] drop-shadow-md" />
                              ) : null}
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Pedagogical Explanation & Stage Next Step */}
                  {isAnswered && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 pt-4 border-t border-[#334155] flex flex-col gap-3"
                    >
                      {/* Detailed Explanation Box */}
                      <div className="p-3.5 rounded-2xl bg-[#060e20] border-2 border-[#334155] text-xs leading-relaxed">
                        <span className="font-['Rubik'] font-bold text-[#ffd165] uppercase tracking-wider block mb-0.5">
                          Explicação Literária:
                        </span>
                        <p className="text-[#dae2fd]/90 font-medium">
                          {activeQuestion.explanation}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#62f0b3]">
                            {isCorrect
                              ? `✓ Acertou! +${activeQuestion.points || (currentQuestionIndex + 1) * 1000} LivroCoins`
                              : "✗ Resposta incorreta"}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={handleNextQuestion}
                          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-[#ffd165] to-[#f7be1d] hover:from-[#f7be1d] hover:to-[#ffd165] text-[#251a00] font-['Rubik'] font-black text-xs sm:text-sm shadow-[0_4px_0_#ca8a04] border-2 border-[#fff] border-b-4 border-[#ca8a04] active:translate-y-1 active:border-b-2 flex items-center justify-center gap-2 cursor-pointer transition-all"
                        >
                          <span>
                            {currentQuestionIndex < 4
                              ? "Próxima Questão do Desafio"
                              : "Ver Resultado da Rodada"}
                          </span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              ) : (
                /* State E: Rodada Concluída */
                <div className="py-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-3xl bg-[#060e20] border-2 border-[#ffd165] flex items-center justify-center text-[#ffd165] shadow-[0_0_25px_rgba(255,209,101,0.4)] mb-4">
                    <Trophy className="w-9 h-9" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-['Rubik'] font-black text-[#f8fafc]">
                    {(gameData.attemptsCount || 0) >= MAX_QUIZ_ATTEMPTS
                      ? "5 de 5 Tentativas Concluídas! 🎓"
                      : "Show de Saberes Concluído! 🏆"}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#94a3b8] max-w-md mt-1 mb-5">
                    Você finalizou as 5 perguntas geradas para{" "}
                    <strong className="text-[#ffd165]">{selectedBookForQuiz.title}</strong>!
                  </p>

                  <div className="grid grid-cols-2 gap-3 max-w-xs w-full mb-6">
                    <div className="p-3.5 rounded-2xl bg-[#060e20] border-2 border-[#eab308] text-center">
                      <span className="text-[10px] uppercase font-['Rubik'] font-black text-[#ffd165] block">
                        LivroCoins Ganhos
                      </span>
                      <span className="text-xl font-['Rubik'] font-black text-[#ffd165]">
                        +{roundStats.pointsEarned}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#060e20] border-2 border-[#62f0b3] text-center">
                      <span className="text-[10px] uppercase font-['Rubik'] font-black text-[#62f0b3] block">
                        Acertos na Rodada
                      </span>
                      <span className="text-xl font-['Rubik'] font-black text-[#62f0b3]">
                        {roundStats.correct} / 5
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {(gameData.attemptsCount || 0) >= MAX_QUIZ_ATTEMPTS ? (
                      <button
                        type="button"
                        onClick={() => setShowBookScoresView(true)}
                        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#ffd165] to-[#f7be1d] text-[#251a00] font-['Rubik'] font-black text-sm shadow-[0_4px_0_#ca8a04] border-2 border-[#fff] border-b-4 border-[#ca8a04] active:translate-y-1 active:border-b-2 cursor-pointer transition-all flex items-center gap-2"
                      >
                        <span>Ver Boletim Completo</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={restartQuiz}
                          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#ffd165] to-[#f7be1d] text-[#251a00] font-['Rubik'] font-black text-xs sm:text-sm shadow-[0_3px_0_#ca8a04] border border-[#fff] border-b-3 border-[#ca8a04] active:translate-y-1 active:border-b-2 cursor-pointer transition-all flex items-center gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Jogar Próxima Rodada</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsBookSelectorModalOpen(true)}
                          className="px-4 py-2.5 rounded-2xl border-2 border-[#334155] border-b-4 border-[#060e20] bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] font-bold text-xs sm:text-sm cursor-pointer transition-all"
                        >
                          Trocar Livro Lido
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* Right Console: Mascote Quitério Host + Pódio Escolar + AI Status (4 Columns) */}
          <aside className="lg:col-span-4 flex flex-col gap-5">
            {/* Stage Host Card (Quitério Mascote) */}
            <div className="p-5 rounded-3xl bg-[#171f33] border-2 border-[#334155] border-b-6 border-[#060e20] shadow-[0_12px_32px_rgba(0,0,0,0.5)] flex flex-col items-center text-center relative overflow-hidden">
              <div className="w-full flex items-center justify-between mb-2">
                <span className="text-[10px] font-['Rubik'] font-black uppercase tracking-wider text-[#ffd165]">
                  Apresentador do Show
                </span>
                <span className="text-[10px] font-bold text-[#62f0b3] bg-[#62f0b3]/15 px-2.5 py-0.5 rounded-full border border-[#62f0b3]/30">
                  Gatinho Quitério
                </span>
              </div>

              {/* Animated Mascot with speech bubble */}
              <div className="py-1">
                <QuiterioMascot
                  mood={mascotMood}
                  size="md"
                  showSpeechBubble={true}
                  speechText={speechBubbleText}
                  isMeowing={isMeowing}
                  onPetCat={handlePetQuiterio}
                />
              </div>

              <span className="text-[10px] text-[#94a3b8] font-medium mt-1">
                Toque no Quitério para comemorar com um Miau! 🐾
              </span>
            </div>

            {/* School Leaderboard Card (Pódio da Escola) */}
            <div className="p-5 rounded-3xl bg-[#171f33] border-2 border-[#334155] border-b-6 border-[#060e20] shadow-[0_12px_32px_rgba(0,0,0,0.5)] flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#334155]">
                <div>
                  <h3 className="text-base font-['Rubik'] font-bold text-[#f8fafc]">
                    Pódio do Show de Saberes
                  </h3>
                  <span className="text-xs text-[#94a3b8]">Colégio Maria Quitéria</span>
                </div>
                {onNavigateToRanking && (
                  <button
                    type="button"
                    onClick={onNavigateToRanking}
                    className="text-xs font-['Rubik'] font-bold text-[#ffd165] hover:underline cursor-pointer"
                  >
                    Ver ranking
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {leaderboard.topThree && leaderboard.topThree.length > 0 ? (
                  leaderboard.topThree.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-2xl border-2 border-b-3 flex items-center justify-between gap-2.5 ${
                        idx === 0
                          ? "bg-[#eab308]/15 border-[#ffd165] border-b-[#ca8a04]"
                          : idx === 1
                            ? "bg-[#131b2e] border-[#94a3b8] border-b-[#475569]"
                            : "bg-[#131b2e] border-[#b45309] border-b-[#78350f]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                        </span>
                        <div>
                          <div className="text-xs font-['Rubik'] font-bold text-[#f8fafc] truncate max-w-[110px]">
                            {item.studentName}
                          </div>
                          <span className="text-[10px] text-[#94a3b8]">{idx + 1}º colocado</span>
                        </div>
                      </div>

                      <span className="text-xs font-['Rubik'] font-black text-[#ffd165]">
                        {item.score.toLocaleString("pt-BR")} pts
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-xs text-[#94a3b8]">
                    🐾 Nenhum ponto registrado ainda!
                  </div>
                )}
              </div>
            </div>

            {/* AI Generator Integration Info Box */}
            <div className="p-4 rounded-3xl bg-[#060e20] border-2 border-[#06b6d4]/40 border-b-4 border-[#0891b2] flex items-start gap-3 shadow-md">
              <Bot className="w-5 h-5 text-[#06b6d4] flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="font-['Rubik'] font-bold text-[#06b6d4] block uppercase">
                  Google AI Studio Integrado:
                </strong>
                <p className="text-[#94a3b8] mt-0.5 leading-relaxed">
                  As perguntas são geradas sob demanda com o modelo <strong>Gemini 1.5</strong> via
                  JSON estruturado, testando a compreensão real de leitura do aluno.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODALS (Identificação de Aluno + Escolha de Livro) */}
      {/* ========================================================================= */}

      {/* Modal: Identificação do Aluno */}
      <AnimatePresence>
        {isCodeModalOpen && (
          <div
            onClick={handleCloseModal}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-3xl p-6 sm:p-7 bg-[#131b2e] border-2 border-[#ffd165] border-b-6 border-[#ca8a04] shadow-[0_20px_60px_rgba(0,0,0,0.8)] text-[#dae2fd]"
            >
              <button
                type="button"
                onClick={handleCloseModal}
                className="absolute top-5 right-5 p-2 rounded-xl text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#171f33] transition-all cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center mb-5">
                <div className="w-14 h-14 rounded-2xl bg-[#060e20] border-2 border-[#ffd165] text-[#ffd165] flex items-center justify-center text-2xl mb-2 shadow-[0_0_20px_rgba(255,209,101,0.3)]">
                  🐱
                </div>
                <h3 className="text-xl font-['Rubik'] font-black text-[#f8fafc]">
                  Entrar no Desafio Literário
                </h3>
                <p className="text-xs text-[#94a3b8] max-w-xs mt-1">
                  Digite seu <strong>Código ou Nome de Aluno</strong> para cruzarmos os livros que
                  você retirou na biblioteca escolar!
                </p>
              </div>

              {codeError && (
                <div className="mb-4 p-3 rounded-2xl bg-[#dc2626]/20 border border-[#dc2626] text-[#ffb4ab] text-xs text-center font-bold">
                  {codeError}
                </div>
              )}

              <form onSubmit={handleIdentifyStudent} className="space-y-4">
                <div>
                  <label className="block text-xs font-['Rubik'] font-bold text-[#ffd165] mb-1.5 uppercase tracking-wider text-center">
                    Código ou Nome do Aluno
                  </label>
                  <input
                    type="text"
                    value={studentCodeInput}
                    onChange={(e) => setStudentCodeInput(e.target.value)}
                    autoFocus
                    placeholder="Ex: 001 ou Nome do Aluno"
                    className="w-full px-4 py-3 rounded-2xl border-2 border-[#334155] bg-[#060e20] text-sm font-['Rubik'] font-bold text-center text-[#f8fafc] focus:outline-none focus:border-[#ffd165] shadow-inner"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-3 rounded-2xl border-2 border-[#334155] bg-[#171f33] hover:bg-[#222a3d] text-xs font-bold text-[#dae2fd] transition-all cursor-pointer"
                  >
                    {activeStudent ? "Cancelar" : "Voltar ao Início"}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#ffd165] to-[#f7be1d] text-[#251a00] font-['Rubik'] font-black text-sm shadow-[0_4px_0_#ca8a04] border border-[#fff] border-b-4 border-[#ca8a04] active:translate-y-1 active:border-b-2 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <span>Verificar Empréstimos 🐾</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Escolha de Livro Lido */}
      <AnimatePresence>
        {isBookSelectorModalOpen && (
          <div
            onClick={() => setIsBookSelectorModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg max-h-[85vh] rounded-3xl p-5 sm:p-6 bg-[#131b2e] border-2 border-[#ffd165] border-b-6 border-[#ca8a04] shadow-[0_20px_60px_rgba(0,0,0,0.8)] text-[#dae2fd] flex flex-col"
            >
              <button
                type="button"
                onClick={() => setIsBookSelectorModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-xl text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#171f33] transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#334155]">
                <div className="w-10 h-10 rounded-2xl bg-[#060e20] border border-[#ffd165] text-[#ffd165] flex items-center justify-center text-xl flex-shrink-0">
                  📚
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-['Rubik'] font-bold text-[#f8fafc]">
                    Obras Lidas por Você ({studentBooks.length})
                  </h3>
                  <p className="text-xs text-[#94a3b8]">
                    Selecione qual livro você deseja responder no Show de Saberes:
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 my-1">
                {studentBooks.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-[#060e20] border border-dashed border-[#334155]">
                    <p className="text-xs text-[#94a3b8]">Nenhum livro retirado ainda.</p>
                  </div>
                ) : (
                  studentBooks.map(({ book: b, loan }) => {
                    const isCurrent =
                      selectedBookForQuiz.id === b.id ||
                      selectedBookForQuiz.title.toLowerCase() === b.title.toLowerCase();
                    const bookScore = (gameData.bookScores || {})[b.title];

                    return (
                      <div
                        key={b.id}
                        onClick={() => handleSelectBookForQuiz(b)}
                        className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isCurrent
                            ? "bg-[#eab308]/20 border-[#ffd165] shadow-sm"
                            : "bg-[#171f33] hover:bg-[#222a3d] border-[#334155]"
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <div className="w-10 h-14 rounded-lg overflow-hidden bg-[#060e20] flex-shrink-0 border border-[#334155] flex items-center justify-center">
                            {b.cover ? (
                              <img
                                src={b.cover}
                                alt={b.title}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <BookOpen className="w-4 h-4 text-[#ffd165]" />
                            )}
                          </div>
                          <div className="truncate">
                            <h4 className="text-xs sm:text-sm font-['Rubik'] font-bold text-[#f8fafc] truncate">
                              {b.title}
                            </h4>
                            <span className="text-[11px] text-[#94a3b8] block truncate">
                              {b.author}
                            </span>
                            {bookScore && (
                              <span className="text-[10px] font-bold text-[#62f0b3]">
                                ✓ Pontuado: {bookScore.points} pts
                              </span>
                            )}
                          </div>
                        </div>

                        <span
                          className={`text-xs font-['Rubik'] font-bold px-3 py-1 rounded-xl flex-shrink-0 ${
                            isCurrent
                              ? "bg-[#ffd165] text-[#251a00]"
                              : "bg-[#060e20] text-[#94a3b8]"
                          }`}
                        >
                          {isCurrent ? "Selecionado" : "Escolher"}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-3 border-t border-[#334155] flex items-center justify-between gap-2">
                <span className="text-xs text-[#94a3b8]">
                  {studentBooks.length} livro(s) no seu acervo de leitura
                </span>
                <button
                  type="button"
                  onClick={() => setIsBookSelectorModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#171f33] hover:bg-[#222a3d] text-xs font-bold text-[#dae2fd] cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
