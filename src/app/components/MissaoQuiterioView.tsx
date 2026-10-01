// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
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
  Bell,
  Wallet,
  ShoppingBag,
  Coins,
  Library,
  Layers,
  HeartHandshake,
} from 'lucide-react';
import { Book, Loan, Student, UserSession } from '../types';
import { useTheme } from '../context/ThemeContext';
import { QuiterioMascot, MascotMood } from './QuiterioMascot';
import { getQuestionsForBook, QuizQuestion } from '../data/quizQuestions';
import {
  getStudentGameData,
  addGamePoints,
  getTopSchoolRanking,
  recordAttemptCompletion,
  MAX_QUIZ_ATTEMPTS,
  StudentScoreData,
  BookScoreDetail,
} from '../utils/quiterioScores';
import {
  playCorrectSound,
  playWrongSound,
  playTickSound,
  playCatMeowSound,
  playCelebrationSound,
  setSoundEnabled,
} from '../utils/gameAudio';

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

const SMART_TIPS = [
  'Ler 15 minutos por dia expande seu vocabulário e abre portas para novos mundos!',
  'Preste atenção aos detalhes e aos personagens principais para pontuar alto no quiz.',
  'Retire livros com frequência na biblioteca para desbloquear novos desafios!',
  'Cada tentativa concluída ajuda você a subir posições no Ranking da Escola!',
];

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
    initialStudent?.studentCode || ''
  );
  const [isCodeModalOpen, setIsCodeModalOpen] = useState<boolean>(!initialStudent);
  const [codeError, setCodeError] = useState<string>('');
  const [isBadgesModalOpen, setIsBadgesModalOpen] = useState<boolean>(false);
  const [isBookSelectorModalOpen, setIsBookSelectorModalOpen] = useState<boolean>(false);

  // Audio mute state
  const [soundOn, setSoundOn] = useState<boolean>(true);

  // Smart tip rotation
  const [smartTipIndex, setSmartTipIndex] = useState<number>(0);
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setSmartTipIndex((prev) => (prev + 1) % SMART_TIPS.length);
    }, 9000);
    return () => clearInterval(tipInterval);
  }, []);

  // Score & Gamification Data
  const [gameData, setGameData] = useState<StudentScoreData>(() => {
    const codeOrId = activeStudent?.studentCode || activeStudent?.id || 'anon';
    return getStudentGameData(codeOrId, activeStudent?.name || 'Estudante');
  });

  // Controls displaying the mascot's book-by-book scoreboard view
  const [showBookScoresView, setShowBookScoresView] = useState<boolean>(() => {
    const codeOrId = activeStudent?.studentCode || activeStudent?.id || 'anon';
    const initData = getStudentGameData(codeOrId, activeStudent?.name || 'Estudante');
    return (initData.attemptsCount || 0) >= MAX_QUIZ_ATTEMPTS;
  });

  const [leaderboard, setLeaderboard] = useState(() =>
    getTopSchoolRanking(activeStudent?.studentCode)
  );

  // Sync when student changes
  useEffect(() => {
    if (activeStudent) {
      const data = getStudentGameData(
        activeStudent.studentCode || activeStudent.id,
        activeStudent.name
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
      const studentCodeNormalized = (activeStudent.studentCode || '').trim().toLowerCase().replace(/^alu-/, '');
      const loanCodeNormalized = (l.studentCode || '').trim().toLowerCase().replace(/^alu-/, '');
      const codeMatch =
        Boolean(studentCodeNormalized && loanCodeNormalized && studentCodeNormalized === loanCodeNormalized);

      const studentNameNormalized = (activeStudent.name || '').trim().toLowerCase();
      const loanNameNormalized = (l.studentName || '').trim().toLowerCase();
      const nameMatch =
        Boolean(studentNameNormalized && loanNameNormalized && studentNameNormalized === loanNameNormalized);

      const studentEmailNormalized = (activeStudent.email || '').trim().toLowerCase();
      const loanEmailNormalized = (l.studentEmail || '').trim().toLowerCase();
      const emailMatch =
        Boolean(studentEmailNormalized && loanEmailNormalized && studentEmailNormalized === loanEmailNormalized);

      const studentIdNormalized = (activeStudent.id || '').trim().toLowerCase();
      const loanIdMatch = Boolean(studentIdNormalized && loanCodeNormalized === studentIdNormalized);

      return codeMatch || nameMatch || emailMatch || loanIdMatch;
    });
  }, [activeStudent, loans]);

  // Unique books from student's loans (strictly the books the student has borrowed/read)
  const studentBooks = useMemo(() => {
    const map = new Map<string, { book: Book; loan: Loan }>();
    studentLoans.forEach((loan) => {
      const matchedBook =
        books.find((b) => b.id === loan.bookId) ||
        books.find((b) => b.title.toLowerCase() === loan.bookTitle.toLowerCase()) || {
          id: loan.bookId,
          title: loan.bookTitle,
          author: loan.bookAuthor,
          cover: loan.bookCover,
          category: 'Literatura',
          rating: 5,
          reviewsCount: 1,
          status: 'disponivel',
          pages: 100,
          year: 2026,
          publisher: 'Biblioteca',
          location: 'Geral',
          synopsis: `Obra emprestada por ${loan.studentName}.`,
          isbn: '000',
          totalCopies: 1,
          availableCopies: 1,
        };

      if (!map.has(matchedBook.title.toLowerCase())) {
        map.set(matchedBook.title.toLowerCase(), { book: matchedBook, loan });
      }
    });
    return Array.from(map.values());
  }, [studentLoans, books]);

  // Default book for quiz: Strictly drawn from the books the student has read
  const defaultBook = useMemo(() => {
    if (studentBooks.length > 0) return studentBooks[0].book;
    return (
      books[0] || {
        id: 'default_book',
        title: 'Livro da Biblioteca',
        author: 'Autor',
        cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&auto=format&fit=crop&q=80',
        category: 'Literatura',
        rating: 5,
        reviewsCount: 1,
        status: 'disponivel',
        pages: 100,
        year: 2026,
        publisher: 'Biblioteca',
        location: 'Geral',
        synopsis: 'Livro do acervo escolar.',
        isbn: '000',
        totalCopies: 1,
        availableCopies: 1,
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
          sb.book.title.toLowerCase() === selectedBookForQuiz?.title?.toLowerCase()
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
        'Miau! Identifique-se com seu código ou nome para cruzarmos seus empréstimos e liberar o Desafio! 🐾'
      );
      setMascotMood('talking');
    } else if (studentLoans.length === 0) {
      setSpeechBubbleText(
        'Miau! Identificamos que você ainda não tem livros emprestados. Por favor, leia um livro para participar do Desafio! 🐾'
      );
      setMascotMood('thinking');
    } else {
      setSpeechBubbleText(
        `Miau! Perguntas retiradas dos livros que você leu na biblioteca! Mostre o que você aprendeu com a leitura! 🐾`
      );
      setMascotMood('talking');
    }
  }, [activeStudent, studentLoans.length]);

  // Current Question Set - Exclusively derived from the selected read book
  const currentQuestions: QuizQuestion[] = useMemo(() => {
    return getQuestionsForBook(selectedBookForQuiz);
  }, [selectedBookForQuiz]);

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
  const [mascotMood, setMascotMood] = useState<MascotMood>('talking');
  const [isMeowing, setIsMeowing] = useState<boolean>(false);
  const [speechBubbleText, setSpeechBubbleText] = useState<string>(
    'Vamos testar seu conhecimento sobre o livro que você leu? 🐾'
  );

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const activeQuestion: QuizQuestion | undefined = currentQuestions[currentQuestionIndex];

  // Reset question state
  const startQuestion = (idx: number) => {
    setCurrentQuestionIndex(idx);
    setSelectedOption(null);
    setIsAnswered(false);
    setIsCorrect(false);
    setTimeLeft(QUESTION_TIMER_SECONDS);
    setIsTimerActive(true);
    setMascotMood('talking');
    setIsMeowing(false);
    setSpeechBubbleText('Vamos testar seu conhecimento sobre o livro que você leu? 🐾');
    setFloatingScore(null);
    setCoverHasError(false);
  };

  const handlePetQuiterio = () => {
    if (soundOn) playCatMeowSound();
    setIsMeowing(true);
    setSpeechBubbleText('Miau!! 🐾 Quitério adora carinho e leitores dedicados!');
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
    setMascotMood('thinking');
    setSpeechBubbleText('O tempo acabou! Mas não desanime, o aprendizado continua! 🐾');
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

    const studentKey = activeStudent?.studentCode || activeStudent?.id || 'aluno_anonimo';
    const studentName = activeStudent?.name || 'Leitor Apaixonado';

    if (correct) {
      const totalPoints = 100;

      setFloatingScore(totalPoints);
      setMascotMood('celebrating');
      setIsMeowing(true);
      setSpeechBubbleText('Miau!! 🐾 Você mandou bem! Continua lendo e acertando as perguntas!');

      if (soundOn) {
        playCorrectSound();
        setTimeout(() => {
          playCatMeowSound();
        }, 250);
      }

      // Confetti burst
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#8b5cf6', '#fbbf24', '#10b981', '#f43f5e', '#3b82f6'],
        });
      } catch {
        // Confetti fallback
      }

      // Persist score & update leaderboard
      const { updatedData } = addGamePoints(
        studentKey,
        studentName,
        totalPoints,
        true,
        selectedBookForQuiz.title,
        selectedBookForQuiz.author,
        selectedBookForQuiz.cover
      );
      setGameData(updatedData);
      setLeaderboard(getTopSchoolRanking(activeStudent?.studentCode));
      setRoundStats((prev) => ({
        correct: prev.correct + 1,
        pointsEarned: prev.pointsEarned + totalPoints,
      }));
    } else {
      setMascotMood('thinking');
      setIsMeowing(false);
      setSpeechBubbleText('Quase lá! Na próxima pergunta você brilha! Continue lendo! 🐾');

      if (soundOn) playWrongSound();

      const { updatedData } = addGamePoints(
        studentKey,
        studentName,
        0,
        false,
        selectedBookForQuiz.title,
        selectedBookForQuiz.author,
        selectedBookForQuiz.cover
      );
      setGameData(updatedData);
      setLeaderboard(getTopSchoolRanking(activeStudent?.studentCode));
    }
  };

  // Next Question or Complete with 5-attempt limit tracking
  const handleNextQuestion = () => {
    if (currentQuestionIndex < currentQuestions.length - 1) {
      startQuestion(currentQuestionIndex + 1);
    } else {
      const studentKey = activeStudent?.studentCode || activeStudent?.id || 'aluno_anonimo';
      const studentName = activeStudent?.name || 'Leitor Apaixonado';

      // Record completed attempt for this book (enforcing max 5 attempts)
      const { updatedData, isLimitReached } = recordAttemptCompletion(
        studentKey,
        studentName,
        selectedBookForQuiz.title,
        selectedBookForQuiz.author,
        selectedBookForQuiz.cover,
        roundStats.pointsEarned,
        roundStats.correct,
        currentQuestions.length
      );

      setGameData(updatedData);
      setLeaderboard(getTopSchoolRanking(activeStudent?.studentCode));
      setRoundCompleted(true);
      setIsTimerActive(false);

      if (isLimitReached) {
        setMascotMood('celebrating');
        setIsMeowing(true);
        setSpeechBubbleText(
          'Miau!! 🎓 Incrível! Você completou sua 5ª e última tentativa! Veja sua pontuação para cada livro! 🐾'
        );
        setShowBookScoresView(true);
        if (soundOn) playCelebrationSound();
      } else {
        setMascotMood('celebrating');
        setSpeechBubbleText(
          `Parabéns, Leitor de Ouro! Tentativa ${updatedData.attemptsCount} de ${MAX_QUIZ_ATTEMPTS} concluída com sucesso! 🏆`
        );
        if (soundOn) playCelebrationSound();
      }
    }
  };

  const restartQuiz = () => {
    if ((gameData.attemptsCount || 0) >= MAX_QUIZ_ATTEMPTS) {
      setShowBookScoresView(true);
      setMascotMood('talking');
      setSpeechBubbleText(
        'Miau! Você já utilizou suas 5 tentativas na Missão! Não é possível iniciar novas partidas. Veja sua pontuação por livro! 🐾'
      );
      return;
    }
    setRoundCompleted(false);
    setRoundStats({ correct: 0, pointsEarned: 0 });
    setShowBookScoresView(false);
    startQuestion(0);
  };

  const handleSelectBookForQuiz = (book: Book) => {
    setIsBookSelectorModalOpen(false);
    if ((gameData.attemptsCount || 0) >= MAX_QUIZ_ATTEMPTS) {
      setShowBookScoresView(true);
      setMascotMood('talking');
      setSpeechBubbleText(
        'Miau! Você já utilizou todas as 5 tentativas disponíveis! Veja sua pontuação em cada livro! 🐾'
      );
      return;
    }
    setSelectedBookForQuiz(book);
    setRoundCompleted(false);
    setRoundStats({ correct: 0, pointsEarned: 0 });
    setShowBookScoresView(false);
    startQuestion(0);
    setMascotMood('talking');
    setSpeechBubbleText(`Miau! Vamos testar o livro "${book.title}"! Boa sorte no desafio! 🐾`);
  };

  // Student Identification Modal handler with cross-referencing code or name verification
  const handleIdentifyStudent = (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError('');

    const rawInput = studentCodeInput.trim();
    if (!rawInput) {
      setCodeError('Digite seu Código ou Nome de Aluno para entrar na Missão.');
      return;
    }

    const cleanInput = rawInput.toLowerCase().replace(/^alu-/, '');

    const foundStudent = students.find((s) => {
      const sCode = (s.studentCode || '').trim().toLowerCase().replace(/^alu-/, '');
      const sId = (s.id || '').trim().toLowerCase().replace(/^alu-/, '');
      const sName = (s.name || '').trim().toLowerCase();
      return (
        sCode === cleanInput ||
        sId === cleanInput ||
        sName === rawInput.toLowerCase() ||
        sName.includes(rawInput.toLowerCase())
      );
    });

    if (!foundStudent) {
      if (soundOn) playWrongSound();
      setCodeError(
        'Aluno não encontrado! Verifique o código ou nome digitado e tente novamente.'
      );
      return;
    }

    setActiveStudent(foundStudent);
    setIsCodeModalOpen(false);
    setCodeError('');

    const existingData = getStudentGameData(
      foundStudent.studentCode || foundStudent.id,
      foundStudent.name
    );
    setGameData(existingData);
    setLeaderboard(getTopSchoolRanking(foundStudent.studentCode));
  };

  const handleCloseModal = () => {
    setIsCodeModalOpen(false);
    if (!activeStudent) {
      if (onBackToHome) {
        onBackToHome();
      }
    }
  };

  // Attempt progress percentage
  const attemptsProgress = Math.min(
    100,
    Math.round(((gameData.attemptsCount || 0) / MAX_QUIZ_ATTEMPTS) * 100)
  );

  return (
    <div
      className={`min-h-[calc(100vh-80px)] py-4 sm:py-6 px-3 sm:px-6 transition-colors duration-300 ${
        isDark ? 'bg-[#0f1422] text-slate-100' : 'bg-[#F5F1EB] text-slate-800'
      }`}
    >
      {/* Outer Dashboard Shell (Inspired by reference image 3D claymorphic card canvas) */}
      <div
        className={`max-w-6xl mx-auto rounded-[32px] sm:rounded-[40px] p-4 sm:p-7 md:p-8 transition-all duration-300 shadow-[0_20px_60px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.02)] border ${
          isDark
            ? 'bg-[#151B2B] border-slate-800 shadow-[0_20px_60px_rgba(0,0,0,0.4)]'
            : 'bg-[#FAF7F2] border-[#EDE6DC]'
        } flex flex-col gap-6`}
      >
        {/* ========================================================================= */}
        {/* 1. TOP HEADER BAR: Greeting + Search/Student ID + Sound + Back */}
        {/* ========================================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/60 dark:border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {onBackToHome && (
                <button
                  type="button"
                  onClick={onBackToHome}
                  title="Voltar ao início"
                  className="mr-1 p-2 rounded-2xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-slate-200/70 dark:border-slate-700 transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <span>Olá, {activeStudent ? activeStudent.name.split(' ')[0] : 'Leitor'}!</span>
                <span className="inline-block animate-bounce">👋</span>
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Missão Quitério • Desafie seus conhecimentos literários e conquiste o topo do ranking!
            </p>
          </div>

          {/* Right Header Controls (Search bar / Quick Student ID + Audio Toggle + Avatar) */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            {/* Quick Identification / Switch Bar */}
            <button
              type="button"
              onClick={() => setIsCodeModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-all cursor-pointer text-xs font-semibold"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">
                {activeStudent ? `Aluno: ${activeStudent.studentCode || activeStudent.name.split(' ')[0]}` : 'Identificar Aluno...'}
              </span>
              <span className="sm:hidden">{activeStudent ? 'Trocar' : 'Entrar'}</span>
            </button>

            {/* Sound Toggle */}
            <button
              id="btn-quiterio-sound-toggle"
              type="button"
              onClick={() => {
                const next = !soundOn;
                setSoundOn(next);
                setSoundEnabled(next);
              }}
              title={soundOn ? 'Desativar Sons' : 'Ativar Sons'}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.03)] ${
                soundOn
                  ? 'bg-violet-600 text-white border-violet-500 hover:bg-violet-700 shadow-[0_4px_12px_rgba(139,92,246,0.3)]'
                  : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-700'
              }`}
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Student Avatar / Mini Mascot with 3D Ring */}
            <div
              onClick={() => setIsCodeModalOpen(true)}
              title={activeStudent ? `${activeStudent.name} (Clique para trocar)` : 'Identificar Aluno'}
              className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 p-0.5 shadow-[0_6px_16px_rgba(139,92,246,0.25)] cursor-pointer hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
            >
              <div className="w-full h-full rounded-[14px] bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                {activeStudent?.avatar ? (
                  <img
                    src={activeStudent.avatar}
                    alt={activeStudent.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-black text-violet-600">
                    {activeStudent ? activeStudent.name.charAt(0).toUpperCase() : '🐾'}
                  </span>
                )}
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. TOP METRIC CARDS (4 3D Claymorphic Cards - Just like FinTrack Reference) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Sua Pontuação Total (Violet / Wallet 3D style) */}
          <motion.div
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
            className={`p-5 rounded-[26px] transition-all border shadow-[0_8px_25px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-3 relative overflow-hidden ${
              isDark ? 'bg-[#1c2336] border-slate-800' : 'bg-white border-slate-100'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Sua Pontuação
                </span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
                  {gameData.score.toLocaleString('pt-BR')} <span className="text-xs font-bold text-violet-600">pts</span>
                </div>
              </div>
              {/* 3D Violet Wallet/Medal Icon container */}
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2),0_8px_18px_rgba(139,92,246,0.35)] flex-shrink-0">
                <Trophy className="w-6 h-6 text-amber-300 drop-shadow-sm" />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+100 pts/acerto</span>
              </span>
              <button
                type="button"
                onClick={() => setShowBookScoresView(true)}
                className="text-violet-600 dark:text-violet-400 font-bold hover:underline cursor-pointer text-[11px]"
              >
                Ver boletim
              </button>
            </div>
          </motion.div>

          {/* Card 2: Livros Lidos na Biblioteca (Emerald / Money Pouch 3D style) */}
          <motion.div
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
            className={`p-5 rounded-[26px] transition-all border shadow-[0_8px_25px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-3 relative overflow-hidden ${
              isDark ? 'bg-[#1c2336] border-slate-800' : 'bg-white border-slate-100'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Livros Lidos
                </span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
                  {studentBooks.length}{' '}
                  <span className="text-xs font-bold text-emerald-600">
                    {studentBooks.length === 1 ? 'obra' : 'obras'}
                  </span>
                </div>
              </div>
              {/* 3D Emerald Green Book/Pouch Icon */}
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2),0_8px_18px_rgba(16,185,129,0.35)] flex-shrink-0">
                <BookOpen className="w-6 h-6 text-white drop-shadow-sm" />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {studentLoans.length} empréstimo(s) registrado(s)
              </span>
              {studentBooks.length > 1 && (
                <button
                  type="button"
                  onClick={() => setIsBookSelectorModalOpen(true)}
                  className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer text-[11px]"
                >
                  Trocar
                </button>
              )}
            </div>
          </motion.div>

          {/* Card 3: Tentativas no Desafio (Coral Red / Bag 3D style) */}
          <motion.div
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
            className={`p-5 rounded-[26px] transition-all border shadow-[0_8px_25px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-3 relative overflow-hidden ${
              isDark ? 'bg-[#1c2336] border-slate-800' : 'bg-white border-slate-100'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Tentativas do Desafio
                </span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
                  {gameData.attemptsCount || 0}{' '}
                  <span className="text-xs font-bold text-rose-500">
                    de {MAX_QUIZ_ATTEMPTS}
                  </span>
                </div>
              </div>
              {/* 3D Coral Bag/Clock Icon */}
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-600 text-white flex items-center justify-center shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2),0_8px_18px_rgba(244,63,94,0.35)] flex-shrink-0">
                <Flame className="w-6 h-6 text-amber-200 drop-shadow-sm" />
              </div>
            </div>

            {/* 5 Attempt Paw Dots */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((num) => {
                  const used = num <= (gameData.attemptsCount || 0);
                  return (
                    <div
                      key={num}
                      title={`Tentativa ${num} ${used ? 'utilizada' : 'disponível'}`}
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${
                        used
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                      }`}
                    >
                      {used ? '✓' : num}
                    </div>
                  );
                })}
              </div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {(gameData.attemptsCount || 0) >= MAX_QUIZ_ATTEMPTS ? 'Concluído' : `${MAX_QUIZ_ATTEMPTS - (gameData.attemptsCount || 0)} restantes`}
              </span>
            </div>
          </motion.div>

          {/* Card 4: Posição no Ranking (Golden Coins / Star 3D style) */}
          <motion.div
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
            className={`p-5 rounded-[26px] transition-all border shadow-[0_8px_25px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-3 relative overflow-hidden ${
              isDark ? 'bg-[#1c2336] border-slate-800' : 'bg-white border-slate-100'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Ranking Escolar
                </span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
                  {gameData.score > 0 ? (
                    <>
                      {leaderboard.currentRank}º{' '}
                      <span className="text-xs font-bold text-amber-500">Lugar</span>
                    </>
                  ) : (
                    <span className="text-lg font-bold text-slate-400">Sem pontos</span>
                  )}
                </div>
              </div>
              {/* 3D Golden Star / Coin Stack Icon */}
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-amber-950 flex items-center justify-center shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2),0_8px_18px_rgba(245,158,11,0.35)] flex-shrink-0">
                <Star className="w-6 h-6 fill-amber-950 text-amber-950 drop-shadow-sm" />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                {gameData.correctAnswers} acerto(s) totais
              </span>
              {onNavigateToRanking && (
                <button
                  type="button"
                  onClick={onNavigateToRanking}
                  className="text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer text-[11px]"
                >
                  Ver ranking
                </button>
              )}
            </div>
          </motion.div>
        </div>

        {/* ========================================================================= */}
        {/* 3. MAIN DASHBOARD CONTENT (Two-Column Layout inspired by reference image) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT / CENTER: Quiz / Boletim Window (Like Spending Overview & Transactions in image) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <motion.div
              layout
              className={`p-6 sm:p-7 md:p-8 rounded-[30px] sm:rounded-[36px] transition-all border shadow-[0_10px_35px_rgba(0,0,0,0.04)] relative overflow-hidden ${
                isDark ? 'bg-[#182032] border-slate-800' : 'bg-white border-slate-100'
              }`}
            >
              {/* Header Navigation Segmented Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                    {showBookScoresView || (gameData.attemptsCount || 0) >= MAX_QUIZ_ATTEMPTS
                      ? 'Boletim do Quitério'
                      : 'Desafio Literário'}
                  </h2>
                </div>

                {/* Interactive Segmented Pill Tabs */}
                {activeStudent && studentLoans.length > 0 && (
                  <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => {
                        if ((gameData.attemptsCount || 0) >= MAX_QUIZ_ATTEMPTS) {
                          setSpeechBubbleText(
                            'Miau! Você já completou suas 5 tentativas! Confira seus pontos por livro abaixo! 🐾'
                          );
                          return;
                        }
                        setShowBookScoresView(false);
                      }}
                      className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        !showBookScoresView && (gameData.attemptsCount || 0) < MAX_QUIZ_ATTEMPTS
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Quiz Ativo
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBookScoresView(true)}
                      className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        showBookScoresView || (gameData.attemptsCount || 0) >= MAX_QUIZ_ATTEMPTS
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>Boletim</span>
                      {Object.keys(gameData.bookScores || {}).length > 0 && (
                        <span className="w-4 h-4 rounded-full bg-violet-600 text-white text-[10px] flex items-center justify-center font-bold">
                          {Object.keys(gameData.bookScores || {}).length}
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Floating +100 Points animated badge when user clicks right answer */}
              <AnimatePresence>
                {floatingScore !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 0, scale: 0.5 }}
                    animate={{ opacity: 1, y: -45, scale: 1.25 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.8 }}
                    className="absolute top-4 right-6 sm:right-8 z-30 pointer-events-none px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-extrabold text-sm sm:text-base shadow-[0_8px_20px_rgba(16,185,129,0.4)] flex items-center gap-1.5 border border-emerald-300"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    +{floatingScore} PONTOS!
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Condition 1: No active student */}
              {!activeStudent ? (
                <div className="py-12 px-4 text-center flex flex-col items-center">
                  <div className="w-16 h-16 rounded-3xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 flex items-center justify-center text-violet-600 dark:text-violet-400 mb-4 shadow-sm">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
                    Identificação de Aluno Necessária
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6 font-medium">
                    Digite seu <strong>Código ou Nome de Aluno</strong> para cruzarmos os livros que você retirou na biblioteca escolar e liberar o quiz literário!
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {onBackToHome && (
                      <button
                        type="button"
                        onClick={onBackToHome}
                        className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 shadow-sm transition-all"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Voltar ao Início</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsCodeModalOpen(true)}
                      className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-extrabold flex items-center gap-2 cursor-pointer shadow-[0_6px_20px_rgba(139,92,246,0.35)] active:scale-95 transition-all"
                    >
                      <User className="w-4 h-4" />
                      <span>Identificar Aluno</span>
                    </button>
                  </div>
                </div>
              ) : studentLoans.length === 0 ? (
                /* Condition 2: Student has 0 loans - "POR FAVOR LEIA UM LIVRO" */
                <div className="py-10 sm:py-14 px-4 sm:px-6 text-center flex flex-col items-center justify-center">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/40 p-1.5 shadow-[0_8px_25px_rgba(245,158,11,0.2)] flex items-center justify-center mb-4 border border-amber-200 dark:border-amber-800">
                    <div className="w-full h-full rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-4xl sm:text-5xl">
                      📖
                    </div>
                  </div>

                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase text-slate-900 dark:text-white tracking-tight leading-tight my-2">
                    Por favor Leia um Livro
                  </h2>

                  <div className="max-w-xl mx-auto my-4 p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 text-slate-700 dark:text-slate-300 text-sm leading-relaxed shadow-sm">
                    <p className="font-extrabold text-base text-amber-950 dark:text-amber-200 mb-1 flex items-center justify-center gap-1.5">
                      <span>🐾</span>
                      <span>Olá, {activeStudent.name}!</span>
                    </p>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                      Cruzamos seus dados com o registro de empréstimos da biblioteca e não encontramos nenhum livro retirado por você.
                      Para poder participar do <strong>Desafio da Missão Quitério</strong>, você precisa primeiro retirar e ler um livro na biblioteca escolar! As perguntas são retiradas exclusivamente dos livros que você leu.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                    {onNavigateToCatalog && (
                      <button
                        type="button"
                        onClick={onNavigateToCatalog}
                        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-sm flex items-center gap-2 shadow-[0_6px_20px_rgba(139,92,246,0.35)] active:scale-95 cursor-pointer transition-all"
                      >
                        <BookOpen className="w-5 h-5" />
                        <span>Ir para o Catálogo de Livros</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsCodeModalOpen(true)}
                      className="px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                    >
                      <User className="w-4 h-4" />
                      <span>Consultar Outro Aluno</span>
                    </button>
                  </div>
                </div>
              ) : showBookScoresView || (gameData.attemptsCount || 0) >= MAX_QUIZ_ATTEMPTS ? (
                /* Condition 3: Boletim por Livro */
                <div className="pt-4 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold px-2.5 py-1 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300">
                          Desempenho por Obra
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {activeStudent.name}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      Total acumulado: <strong className="text-violet-600 dark:text-violet-400 text-sm font-black">{gameData.score} pts</strong>
                    </div>
                  </div>

                  {/* Warning if 5 attempts limit reached */}
                  {(gameData.attemptsCount || 0) >= MAX_QUIZ_ATTEMPTS && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium flex items-center gap-3"
                    >
                      <span className="text-2xl flex-shrink-0">🎓</span>
                      <div>
                        <strong className="font-extrabold text-amber-900 dark:text-amber-300 block">
                          Limite de 5 tentativas alcançado!
                        </strong>
                        Você completou todas as suas 5 chances no quiz literário. Veja abaixo sua pontuação registrada em cada livro desafiado!
                      </div>
                    </motion.div>
                  )}

                  {/* List of book scores */}
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {Object.keys(gameData.bookScores || {}).length === 0 ? (
                      <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center">
                        <BookOpen className="w-10 h-10 text-slate-400 mb-2" />
                        <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-200">
                          Nenhum livro pontuado ainda!
                        </h4>
                        <p className="text-xs text-slate-500 max-w-xs mt-1">
                          Inicie o quiz literário para responder às perguntas do Quitério e registrar seus pontos.
                        </p>
                      </div>
                    ) : (
                      (Object.values(gameData.bookScores || {}) as BookScoreDetail[]).map((bookScore, idx) => {
                        const matchedBook =
                          books.find((b) => b.title.toLowerCase() === bookScore.bookTitle.toLowerCase()) ||
                          selectedBookForQuiz;
                        const cover = bookScore.bookCover || matchedBook.cover;
                        const percentage =
                          bookScore.totalQuestions > 0
                            ? Math.round((bookScore.correctAnswers / bookScore.totalQuestions) * 100)
                            : 0;

                        return (
                          <div
                            key={idx}
                            className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_4px_16px_rgba(0,0,0,0.02)] ${
                              isDark ? 'bg-[#1c2336] border-slate-800' : 'bg-[#FAF8F5] border-slate-200/70'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-16 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0 border border-slate-200 dark:border-slate-600 shadow-sm flex items-center justify-center">
                                {cover ? (
                                  <img
                                    src={cover}
                                    alt={bookScore.bookTitle}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <BookOpen className="w-5 h-5 text-slate-400" />
                                )}
                              </div>
                              <div className="truncate">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                                  {bookScore.bookAuthor || matchedBook.author}
                                </span>
                                <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                                  {bookScore.bookTitle}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="w-24 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                    {bookScore.correctAnswers}/{bookScore.totalQuestions} ({percentage}%)
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 flex-shrink-0">
                              <div className="px-3.5 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 font-extrabold text-sm flex items-center gap-1.5 shadow-sm">
                                <Star className="w-4 h-4 fill-violet-600 text-violet-600" />
                                <span>{bookScore.points} pts</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-slate-500">
                      Tentativas usadas: {gameData.attemptsCount || 0} de {MAX_QUIZ_ATTEMPTS}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(gameData.attemptsCount || 0) < MAX_QUIZ_ATTEMPTS && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowBookScoresView(false);
                            if (roundCompleted) restartQuiz();
                          }}
                          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-extrabold text-xs shadow-md hover:from-violet-500 hover:to-indigo-500 active:scale-95 cursor-pointer transition-all flex items-center gap-1.5"
                        >
                          <span>Continuar Quiz</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : activeQuestion && !roundCompleted ? (
                /* Condition 4: Active Question */
                <div className="pt-4 flex flex-col gap-5">
                  {/* Selected Book Header & 20-min Timer */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-14 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center">
                        {!coverHasError && activeQuestion.bookCover ? (
                          <img
                            src={activeQuestion.bookCover}
                            alt={activeQuestion.bookTitle}
                            onError={() => setCoverHasError(true)}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <BookOpen className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300">
                            Livro Lido
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {activeQuestion.bookAuthor || 'Literatura'}
                          </span>
                        </div>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate mt-0.5">
                          {activeQuestion.bookTitle}
                        </h3>
                      </div>
                    </div>

                    {/* Timer Pill */}
                    <div
                      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl font-black text-xs sm:text-sm border shadow-sm flex-shrink-0 ${
                        timeLeft <= 60
                          ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                          : 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800'
                      }`}
                      title="Tempo para o Desafio: 20 minutos"
                    >
                      <Clock className="w-4 h-4" />
                      <span className="font-mono">
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  </div>

                  {/* Question Box (Soft Warm Claymorphic) */}
                  <div
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      isDark
                        ? 'bg-[#1c2336] border-slate-800'
                        : 'bg-[#FAF8F5] border-slate-200/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)]'
                    }`}
                  >
                    <div className="text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1">
                      Pergunta {currentQuestionIndex + 1} de {currentQuestions.length}
                    </div>
                    <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-slate-900 dark:text-white leading-snug">
                      {activeQuestion.question}
                    </h2>
                  </div>

                  {/* Options (A, B, C, D) with 3D soft claymorphic button cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                    {activeQuestion.options.map((optionText, optIndex) => {
                      const letter = String.fromCharCode(65 + optIndex);
                      const isSelected = selectedOption === optIndex;
                      const isThisCorrect = optIndex === activeQuestion.correctIndex;

                      let cardStyle = isDark
                        ? 'bg-[#1a2234] hover:bg-[#202a40] text-slate-200 border-slate-700/80 shadow-[0_4px_12px_rgba(0,0,0,0.2)]'
                        : 'bg-white hover:bg-[#F9F7F4] text-slate-800 border-slate-200/90 shadow-[0_4px_14px_rgba(0,0,0,0.03)] hover:border-violet-300 hover:shadow-[0_8px_20px_rgba(139,92,246,0.08)]';
                      let letterStyle = 'bg-violet-100 text-violet-700 dark:bg-violet-950/80 dark:text-violet-300';

                      if (isAnswered) {
                        if (isThisCorrect) {
                          cardStyle =
                            'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-950 dark:text-emerald-100 shadow-[0_6px_20px_rgba(16,185,129,0.15)] font-bold';
                          letterStyle = 'bg-emerald-500 text-white';
                        } else if (isSelected && !isThisCorrect) {
                          cardStyle =
                            'bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-950 dark:text-rose-100 shadow-[0_6px_20px_rgba(244,63,94,0.15)] font-bold';
                          letterStyle = 'bg-rose-500 text-white';
                        } else {
                          cardStyle = 'opacity-40 border-slate-200 text-slate-400 shadow-none';
                          letterStyle = 'bg-slate-200 text-slate-500';
                        }
                      }

                      return (
                        <motion.button
                          key={optIndex}
                          whileHover={!isAnswered ? { y: -2 } : {}}
                          whileTap={!isAnswered ? { scale: 0.98 } : {}}
                          disabled={isAnswered}
                          onClick={() => handleSelectOption(optIndex)}
                          className={`p-3.5 sm:p-4 rounded-2xl text-left border transition-all flex items-center justify-between gap-3 cursor-pointer min-h-[58px] ${cardStyle}`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-8 h-8 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center flex-shrink-0 shadow-sm ${letterStyle}`}
                            >
                              {letter}
                            </span>
                            <span className="text-xs sm:text-sm font-semibold leading-snug">
                              {optionText}
                            </span>
                          </div>

                          {isAnswered && (
                            <div className="flex-shrink-0">
                              {isThisCorrect ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              ) : isSelected ? (
                                <XCircle className="w-5 h-5 text-rose-500" />
                              ) : null}
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Feedback Row & Next Question Button */}
                  {isAnswered && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 w-full sm:w-auto">
                        <div
                          className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-sm ${
                            isCorrect
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {isCorrect ? '✓ +100 pontos' : '0 pontos'}
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
                          {isCorrect
                            ? 'Excelente! Você mandou muito bem na resposta!'
                            : 'Quase lá! Na próxima pergunta você brilha!'}
                        </span>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleNextQuestion}
                        className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm shadow-[0_6px_20px_rgba(139,92,246,0.35)] flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <span>
                          {currentQuestionIndex < currentQuestions.length - 1
                            ? 'Próxima Pergunta'
                            : 'Ver Resultado Final'}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </motion.button>
                    </motion.div>
                  )}
                </div>
              ) : (
                /* Condition 5: Round Completed */
                <div className="py-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 flex items-center justify-center text-amber-600 shadow-md mb-4">
                    <Trophy className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                    {(gameData.attemptsCount || 0) >= MAX_QUIZ_ATTEMPTS
                      ? '5 de 5 Tentativas Concluídas! 🎓'
                      : 'Missão Literária Cumprida! 🏆'}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mt-1 mb-5">
                    Você finalizou as perguntas sobre o livro{' '}
                    <strong className="text-violet-600 dark:text-violet-400">{selectedBookForQuiz.title}</strong>!
                  </p>

                  <div className="grid grid-cols-2 gap-3 max-w-xs w-full mb-6">
                    <div className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Pontos Ganhos
                      </span>
                      <span className="text-xl font-extrabold text-violet-600 dark:text-violet-400">
                        +{roundStats.pointsEarned}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Acertos
                      </span>
                      <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                        {roundStats.correct} / {currentQuestions.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {(gameData.attemptsCount || 0) >= MAX_QUIZ_ATTEMPTS ? (
                      <button
                        type="button"
                        onClick={() => setShowBookScoresView(true)}
                        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-extrabold text-sm shadow-md hover:from-violet-500 hover:to-indigo-500 cursor-pointer transition-all flex items-center gap-2"
                      >
                        <span>Ver Boletim Completo</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={restartQuiz}
                          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-extrabold text-xs sm:text-sm shadow-md hover:from-violet-500 hover:to-indigo-500 cursor-pointer transition-all flex items-center gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Jogar Novamente</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsBookSelectorModalOpen(true)}
                          className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm shadow-sm hover:bg-slate-50 cursor-pointer transition-all"
                        >
                          Trocar Livro
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowBookScoresView(true)}
                          className="px-4 py-2.5 rounded-2xl bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 font-bold text-xs sm:text-sm cursor-pointer"
                        >
                          Ver Boletim
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Bottom Progress Bar: 3-step reading journey (Clean claymorphic banner) */}
            <div
              className={`p-4 rounded-[24px] border shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
                isDark ? 'bg-[#182032] border-slate-800' : 'bg-white border-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 flex items-center justify-center font-bold">
                  🐾
                </div>
                <div className="text-slate-600 dark:text-slate-300 font-medium">
                  <strong>Jornada Literária:</strong> Leia na biblioteca, responda o desafio e ganhe estrelas!
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsBadgesModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-violet-50 dark:bg-violet-950/50 hover:bg-violet-100 text-violet-700 dark:text-violet-300 font-extrabold border border-violet-200/80 dark:border-violet-800 flex items-center gap-1.5 cursor-pointer transition-all text-xs"
              >
                <Award className="w-4 h-4 text-violet-600" />
                <span>Ver Conquistas</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Quitério Mascot + School Podium + Smart Tip (Matches Character & Cards on right of image) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Card 1: Mascot Quitério Hero Card */}
            <motion.div
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className={`p-6 rounded-[30px] sm:rounded-[36px] border shadow-[0_10px_35px_rgba(0,0,0,0.04)] flex flex-col items-center text-center relative overflow-hidden ${
                isDark ? 'bg-[#182032] border-slate-800' : 'bg-white border-slate-100'
              }`}
            >
              <div className="w-full flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Mascote da Biblioteca
                </span>
                <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 px-2.5 py-0.5 rounded-full">
                  Gatinho Quitério
                </span>
              </div>

              {/* Quitério with Speech Bubble and Pet Interaction */}
              <div className="py-2">
                <QuiterioMascot
                  mood={mascotMood}
                  size="md"
                  showSpeechBubble={true}
                  speechText={speechBubbleText}
                  isMeowing={isMeowing}
                  onPetCat={handlePetQuiterio}
                />
              </div>

              <div className="text-[11px] text-slate-400 font-medium mt-1">
                Clique no Quitério para fazer carinho! 🐾
              </div>
            </motion.div>

            {/* Card 2: Top 3 Podium / Ranking Escolar (Similar to Spending Overview card in reference image) */}
            <div
              className={`p-6 rounded-[30px] sm:rounded-[36px] border shadow-[0_10px_35px_rgba(0,0,0,0.04)] flex flex-col gap-4 ${
                isDark ? 'bg-[#182032] border-slate-800' : 'bg-white border-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Pódio da Escola
                  </h3>
                  <span className="text-xs text-slate-400">Leitores mais pontuados</span>
                </div>
                {onNavigateToRanking && (
                  <button
                    type="button"
                    onClick={onNavigateToRanking}
                    className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                  >
                    Ver todos
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {leaderboard.topThree && leaderboard.topThree.length > 0 ? (
                  leaderboard.topThree.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        idx === 0
                          ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/40'
                          : idx === 1
                          ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/80'
                          : 'bg-orange-50/60 dark:bg-orange-950/20 border-orange-200/80 dark:border-orange-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                        </span>
                        <div>
                          <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate max-w-[120px]">
                            {item.studentName}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {idx + 1}º colocado
                          </span>
                        </div>
                      </div>

                      <div className="text-xs font-black text-violet-700 dark:text-violet-300 font-mono">
                        {item.score} pts
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-xs text-slate-400">
                    Nenhum ponto registrado ainda!
                  </div>
                )}
              </div>
            </div>

            {/* Card 3: Smart Tip (Exact replica of the "Smart Tip" card in the reference image!) */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              className="p-5 rounded-[26px] bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 border border-amber-200/80 dark:border-amber-800/50 shadow-[0_8px_25px_rgba(245,158,11,0.06)] flex items-start gap-3.5"
            >
              <div className="w-11 h-11 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center text-xl flex-shrink-0 shadow-[0_4px_12px_rgba(245,158,11,0.3)]">
                💡
              </div>
              <div className="text-xs leading-relaxed">
                <span className="font-extrabold text-amber-950 dark:text-amber-200 block text-sm">
                  Dica Esperta do Quitério
                </span>
                <p className="text-amber-900/80 dark:text-amber-300/80 mt-1 font-medium">
                  {SMART_TIPS[smartTipIndex]}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODALS (Clean Restyled Claymorphic Modals) */}
      {/* ========================================================================= */}

      {/* Conquistas Modal */}
      <AnimatePresence>
        {isBadgesModalOpen && (
          <div
            onClick={() => setIsBadgesModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full max-w-md border rounded-[32px] p-6 shadow-2xl ${
                isDark ? 'bg-[#182032] border-slate-700 text-white' : 'bg-white border-slate-100 text-slate-800'
              }`}
            >
              <button
                type="button"
                onClick={() => setIsBadgesModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-600 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                  Conquistas do Leitor
                </h3>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-violet-600 text-white flex items-center justify-center flex-shrink-0">
                    <BookMarked className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">Leitor Dedicado</h4>
                    <p className="text-[11px] text-slate-500">Acerte ao menos 1 pergunta no Quiz Literário</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
                    <Star className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">Mestre das Histórias</h4>
                    <p className="text-[11px] text-slate-500">Alcance mais de 500 pontos no ranking escolar</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center flex-shrink-0">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">Desafio Ler Mais</h4>
                    <p className="text-[11px] text-slate-500">Complete rodadas com 100% de acerto nas questões</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Student Code / Name Identification Modal */}
      <AnimatePresence>
        {isCodeModalOpen && (
          <div
            onClick={handleCloseModal}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full max-w-md border rounded-[32px] p-6 sm:p-7 shadow-2xl ${
                isDark ? 'bg-[#182032] border-slate-700 text-white' : 'bg-white border-slate-100 text-slate-800'
              }`}
            >
              <button
                id="btn-fechar-modal-aluno"
                type="button"
                onClick={handleCloseModal}
                className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer"
                aria-label="Fechar janela"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center mb-5">
                <div className="w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-950/80 text-violet-600 flex items-center justify-center text-2xl mb-2 shadow-sm">
                  🐱
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Entrar na Missão Quitério
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  Digite seu <strong>Código ou Nome de Aluno</strong> para cruzarmos seus empréstimos e liberar o desafio literário!
                </p>
              </div>

              {codeError && (
                <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-xs text-center font-medium">
                  {codeError}
                </div>
              )}

              <form onSubmit={handleIdentifyStudent} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider text-center">
                    Código ou Nome do Aluno
                  </label>
                  <input
                    type="text"
                    value={studentCodeInput}
                    onChange={(e) => setStudentCodeInput(e.target.value)}
                    autoFocus
                    placeholder="Ex: 001 ou Nome do Aluno"
                    className={`w-full px-4 py-3 rounded-2xl border text-sm font-bold text-center focus:outline-none focus:ring-2 ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-white focus:ring-violet-500/40'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-violet-500/30'
                    }`}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className={`px-4 py-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                      isDark
                        ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {activeStudent ? 'Cancelar' : 'Voltar ao Início'}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
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

      {/* Book Selector Modal */}
      <AnimatePresence>
        {isBookSelectorModalOpen && (
          <div
            onClick={() => setIsBookSelectorModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full max-w-lg max-h-[85vh] rounded-[32px] border shadow-2xl p-5 sm:p-6 flex flex-col ${
                isDark ? 'bg-[#182032] border-slate-700 text-white' : 'bg-white border-slate-100 text-slate-800'
              }`}
            >
              <button
                type="button"
                onClick={() => setIsBookSelectorModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-2xl bg-violet-100 dark:bg-violet-950 text-violet-600 flex items-center justify-center text-xl flex-shrink-0">
                  📚
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                    Livros Lidos por Você ({studentBooks.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Selecione qual obra você deseja responder no desafio literário:
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 my-1">
                {studentBooks.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500">Nenhum livro retirado ainda.</p>
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
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isCurrent
                            ? 'bg-violet-50/80 dark:bg-violet-950/40 border-violet-400 shadow-sm'
                            : 'bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <div className="w-10 h-14 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0 border border-slate-200 flex items-center justify-center">
                            {b.cover ? (
                              <img
                                src={b.cover}
                                alt={b.title}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <BookOpen className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div className="truncate">
                            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                              {b.title}
                            </h4>
                            <span className="text-[11px] text-slate-500 block truncate">
                              {b.author}
                            </span>
                            {bookScore && (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                ✓ Já desafiado ({bookScore.points} pts)
                              </span>
                            )}
                          </div>
                        </div>

                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-xl flex-shrink-0 ${
                            isCurrent
                              ? 'bg-violet-600 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {isCurrent ? 'Selecionado' : 'Escolher'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">
                  {studentBooks.length} livro(s) no histórico
                </span>
                <button
                  type="button"
                  onClick={() => setIsBookSelectorModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer hover:bg-slate-200"
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
