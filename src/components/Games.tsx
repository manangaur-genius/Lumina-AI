import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Gamepad2, Puzzle, Book, ArrowLeft, Check, X, RotateCcw, Lightbulb } from 'lucide-react';
import { getChat } from '../services/geminiService';

interface GameProps {
  language: string;
  onBack: () => void;
}

const STORAGE_KEY = 'lumina_high_scores';

export const Games: React.FC<GameProps> = ({ language, onBack }) => {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [highScores, setHighScores] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  });

  const updateHighScore = (game: string, score: number, lowerIsBetter = false) => {
    setHighScores(prev => {
      const current = prev[game];
      if (current === undefined || (lowerIsBetter ? score < current : score > current)) {
        const next = { ...prev, [game]: score };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      }
      return prev;
    });
  };

  const gameOptions = [
    { id: 'wordle', name: 'Wordle', icon: <Puzzle className="w-6 h-6" />, description: 'Guess the hidden word' },
    { id: 'trivia', name: 'Trivia', icon: <Trophy className="w-6 h-6" />, description: 'Test your knowledge' },
    { id: 'sudoku', name: 'Sudoku', icon: <Gamepad2 className="w-6 h-6" />, description: 'Logic-based number puzzle' },
    { id: 'riddle', name: 'Riddle Master', icon: <Lightbulb className="w-6 h-6" />, description: 'Solve clever riddles' },
    { id: 'memory', name: 'Memory Match', icon: <Puzzle className="w-6 h-6" />, description: 'Train your brain' },
  ];

  if (activeGame === 'wordle') return <WordleGame language={language} onBack={() => setActiveGame(null)} onWin={(score) => updateHighScore('wordle', score)} highScore={highScores['wordle']} />;
  if (activeGame === 'trivia') return <TriviaGame language={language} onBack={() => setActiveGame(null)} onEnd={(score) => updateHighScore('trivia', score)} highScore={highScores['trivia']} />;
  if (activeGame === 'sudoku') return <SudokuGame onBack={() => setActiveGame(null)} onWin={(score) => updateHighScore('sudoku', score)} highScore={highScores['sudoku']} />;
  if (activeGame === 'riddle') return <RiddleGame language={language} onBack={() => setActiveGame(null)} onWin={(score) => updateHighScore('riddle', score)} highScore={highScores['riddle']} />;
  if (activeGame === 'memory') return <MemoryGame onBack={() => setActiveGame(null)} onWin={(score) => updateHighScore('memory', score, true)} highScore={highScores['memory']} />;

  return (
    <div className="flex flex-col h-full overflow-auto p-6">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-medium tracking-tight">Intellectual Games</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {gameOptions.map((game) => (
          <motion.button
            key={game.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveGame(game.id)}
            className="flex items-start gap-4 p-6 glass-panel text-left hover:bg-white/5 transition-colors group"
          >
            <div className="p-3 rounded-xl bg-sky-500/20 text-sky-400 group-hover:bg-sky-500/30 transition-colors">
              {game.icon}
            </div>
            <div>
              <h3 className="text-lg font-medium mb-1">{game.name}</h3>
              <p className="text-sm text-white/60">{game.description}</p>
              {highScores[game.id] !== undefined && (
                <p className="text-xs text-sky-400 mt-2 font-mono">Best: {highScores[game.id]}</p>
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

// --- Wordle Game ---
const WordleGame: React.FC<{ language: string; onBack: () => void; onWin: (score: number) => void; highScore?: number }> = ({ language, onBack, onWin, highScore }) => {
  const [wordLength, setWordLength] = useState<number | null>(null);
  const [targetWord, setTargetWord] = useState('');
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');

  const wordsByLength: Record<number, string[]> = {
    4: ['BOOK', 'FIRE', 'WOLF', 'MOON', 'STAR', 'BLUE', 'WIND', 'TREE'],
    5: ['LIGHT', 'BRAIN', 'SPACE', 'CLOUD', 'DREAM', 'WATER', 'EARTH', 'HEART'],
    6: ['LUMINA', 'GALAXY', 'SILVER', 'SPIRIT', 'WISDOM', 'ENERGY', 'FUTURE', 'PLANET'],
  };

  useEffect(() => {
    if (wordLength) {
      const possibleWords = wordsByLength[wordLength];
      setTargetWord(possibleWords[Math.floor(Math.random() * possibleWords.length)]);
    }
  }, [wordLength]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (gameState !== 'playing') return;
    if (e.key === 'Enter') {
      if (currentGuess.length === wordLength) {
        const newGuesses = [...guesses, currentGuess];
        setGuesses(newGuesses);
        setCurrentGuess('');
        if (currentGuess === targetWord) {
          setGameState('won');
          onWin(guesses.length + 1);
        } else if (newGuesses.length >= 6) {
          setGameState('lost');
        }
      }
    } else if (e.key === 'Backspace') {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (e.key.length === 1 && /^[a-zA-Z]$/.test(e.key) && currentGuess.length < (wordLength || 0)) {
      setCurrentGuess(prev => prev + e.key.toUpperCase());
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentGuess, guesses, gameState, wordLength]);

  if (!wordLength) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <h3 className="text-2xl font-medium mb-6">Choose Word Length</h3>
        <div className="flex gap-4">
          {[4, 5, 6].map(len => (
            <button
              key={len}
              onClick={() => setWordLength(len)}
              className="w-16 h-16 rounded-xl glass-panel hover:bg-sky-500/20 transition-colors text-xl font-bold"
            >
              {len}
            </button>
          ))}
        </div>
        <button onClick={onBack} className="mt-8 text-white/40 hover:text-white transition-colors">Back to Games</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-6 h-full overflow-auto">
      <div className="w-full flex justify-between items-center mb-8">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h2 className="text-xl font-medium">Wordle ({wordLength} letters)</h2>
          {highScore && <p className="text-xs text-sky-400 font-mono">Best: {highScore} tries</p>}
        </div>
        <div className="w-10" />
      </div>

      <div className="grid gap-2 mb-8">
        {Array.from({ length: 6 }).map((_, i) => {
          const guess = guesses[i] || (i === guesses.length ? currentGuess : '');
          return (
            <div key={i} className="flex gap-2">
              {Array.from({ length: wordLength }).map((_, j) => {
                const char = guess[j] || '';
                let status = '';
                if (guesses[i]) {
                  if (targetWord[j] === char) status = 'bg-emerald-500 border-emerald-500';
                  else if (targetWord.includes(char)) status = 'bg-amber-500 border-amber-500';
                  else status = 'bg-white/10 border-white/20';
                } else {
                  status = char ? 'border-sky-400/50' : 'border-white/10';
                }
                return (
                  <motion.div
                    key={j}
                    initial={false}
                    animate={char ? { scale: [1, 1.1, 1] } : {}}
                    className={`w-12 h-12 border-2 flex items-center justify-center text-xl font-bold rounded-lg transition-colors ${status}`}
                  >
                    {char}
                  </motion.div>
                );
              })}
            </div>
          );
        })}
      </div>

      {gameState !== 'playing' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <p className="text-xl mb-4">{gameState === 'won' ? '🎉 Brilliant!' : `The word was ${targetWord}`}</p>
          <button
            onClick={() => { setGuesses([]); setGameState('playing'); setWordLength(null); }}
            className="px-6 py-2 bg-sky-500 rounded-full font-medium hover:bg-sky-400 transition-colors"
          >
            Play Again
          </button>
        </motion.div>
      )}
    </div>
  );
};

// --- Trivia Game ---
const TriviaGame: React.FC<{ language: string; onBack: () => void; onEnd: (score: number) => void; highScore?: number }> = ({ language, onBack, onEnd, highScore }) => {
  const [subject, setSubject] = useState<string | null>(null);
  const [question, setQuestion] = useState<any>(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const subjects = Array.from(new Set(['Science', 'History', 'Geography', 'Technology', 'Art', 'English', 'Hindi', language]));

  const fetchQuestion = async (subj: string) => {
    setLoading(true);
    try {
      const chat = getChat(language, 'games');
      const prompt = `Generate a unique multiple-choice trivia question about ${subj}. 
      If the subject is a language, focus on meanings of words or phrases.
      Respond ONLY with a JSON object: {"question": "...", "options": ["...", "...", "...", "..."], "correctIndex": 0}.
      The question and options must be in Romanized ${language} mixed with English.`;
      
      const response = await chat.sendMessage({ message: prompt });
      const data = JSON.parse(response.text.replace(/```json|```/g, '').trim());
      setQuestion(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
    setShowResult(true);
    if (index === question.correctIndex) {
      setScore(s => s + 1);
    }
    setTimeout(() => {
      setShowResult(false);
      setSelectedAnswer(null);
      fetchQuestion(subject!);
    }, 2000);
  };

  if (!subject) {
    return (
      <div className="flex flex-col h-full p-6 overflow-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-medium">Select Subject</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {subjects.map(s => (
            <button
              key={s}
              onClick={() => { setSubject(s); fetchQuestion(s); }}
              className="p-4 glass-panel hover:bg-sky-500/20 transition-colors text-center font-medium capitalize"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6 overflow-auto">
      <div className="w-full flex justify-between items-center mb-8">
        <button onClick={() => { setSubject(null); onEnd(score); }} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h2 className="text-xl font-medium">{subject} Trivia</h2>
          <p className="text-sm text-sky-400 font-mono">Score: {score} | Best: {highScore || 0}</p>
        </div>
        <div className="w-10" />
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center flex-1">
            <div className="w-12 h-12 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin mb-4" />
            <p className="text-white/60">Lumina is crafting a question...</p>
          </motion.div>
        ) : question && (
          <motion.div key="question" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">
            <h3 className="text-xl font-medium mb-8 leading-relaxed">{question.question}</h3>
            <div className="grid gap-4">
              {question.options.map((opt: string, i: number) => {
                let statusClass = 'glass-panel';
                if (showResult) {
                  if (i === question.correctIndex) statusClass = 'bg-emerald-500/40 border-emerald-500';
                  else if (i === selectedAnswer) statusClass = 'bg-rose-500/40 border-rose-500';
                  else statusClass = 'opacity-40 glass-panel';
                }
                return (
                  <button
                    key={i}
                    disabled={showResult}
                    onClick={() => handleAnswer(i)}
                    className={`p-4 text-left transition-all rounded-xl border-2 ${statusClass} ${!showResult && 'hover:border-sky-400/50 hover:bg-white/5'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{opt}</span>
                      {showResult && i === question.correctIndex && <Check className="w-5 h-5 text-emerald-400" />}
                      {showResult && i === selectedAnswer && i !== question.correctIndex && <X className="w-5 h-5 text-rose-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Sudoku Game ---
const SudokuGame: React.FC<{ onBack: () => void; onWin: (score: number) => void; highScore?: number }> = ({ onBack, onWin, highScore }) => {
  const [grid, setGrid] = useState<number[][]>([]);
  const [initialGrid, setInitialGrid] = useState<number[][]>([]);
  const [selected, setSelected] = useState<[number, number] | null>(null);

  const generateSudoku = () => {
    // Simple static puzzle for demo, normally would generate
    const puzzle = [
      [5, 3, 0, 0, 7, 0, 0, 0, 0],
      [6, 0, 0, 1, 9, 5, 0, 0, 0],
      [0, 9, 8, 0, 0, 0, 0, 6, 0],
      [8, 0, 0, 0, 6, 0, 0, 0, 3],
      [4, 0, 0, 8, 0, 3, 0, 0, 1],
      [7, 0, 0, 0, 2, 0, 0, 0, 6],
      [0, 6, 0, 0, 0, 0, 2, 8, 0],
      [0, 0, 0, 4, 1, 9, 0, 0, 5],
      [0, 0, 0, 0, 8, 0, 0, 7, 9]
    ];
    setGrid(puzzle.map(row => [...row]));
    setInitialGrid(puzzle.map(row => [...row]));
  };

  useEffect(generateSudoku, []);

  const solve = () => {
    const solved = [
      [5, 3, 4, 6, 7, 8, 9, 1, 2],
      [6, 7, 2, 1, 9, 5, 3, 4, 8],
      [1, 9, 8, 3, 4, 2, 5, 6, 7],
      [8, 5, 9, 7, 6, 1, 4, 2, 3],
      [4, 2, 6, 8, 5, 3, 7, 9, 1],
      [7, 1, 3, 9, 2, 4, 8, 5, 6],
      [9, 6, 1, 5, 3, 7, 2, 8, 4],
      [2, 8, 7, 4, 1, 9, 6, 3, 5],
      [3, 4, 5, 2, 8, 6, 1, 7, 9]
    ];
    setGrid(solved);
  };

  return (
    <div className="flex flex-col items-center h-full p-6 overflow-auto">
      <div className="w-full flex justify-between items-center mb-8">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-medium">Sudoku</h2>
        <button onClick={solve} className="text-sky-400 text-sm font-medium hover:text-sky-300">Solve</button>
      </div>

      <div className="grid grid-cols-9 border-2 border-white/20 bg-white/5 p-1 rounded-xl shadow-2xl">
        {grid.map((row, r) => row.map((val, c) => (
          <button
            key={`${r}-${c}`}
            onClick={() => initialGrid[r][c] === 0 && setSelected([r, c])}
            className={`w-8 h-8 sm:w-10 sm:h-10 border border-white/10 flex items-center justify-center text-lg font-mono transition-colors
              ${(r % 3 === 2 && r !== 8) ? 'border-b-2' : ''}
              ${(c % 3 === 2 && c !== 8) ? 'border-r-2' : ''}
              ${selected?.[0] === r && selected?.[1] === c ? 'bg-sky-500/40' : ''}
              ${initialGrid[r][c] !== 0 ? 'text-white/40' : 'text-sky-400'}
            `}
          >
            {val !== 0 ? val : ''}
          </button>
        )))}
      </div>

      <div className="grid grid-cols-5 gap-2 mt-8">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
          <button
            key={num}
            onClick={() => {
              if (selected) {
                const newGrid = [...grid];
                newGrid[selected[0]][selected[1]] = num;
                setGrid(newGrid);
              }
            }}
            className="w-12 h-12 glass-panel rounded-lg flex items-center justify-center font-bold hover:bg-sky-500/20 transition-colors"
          >
            {num === 0 ? <RotateCcw className="w-5 h-5" /> : num}
          </button>
        ))}
      </div>
    </div>
  );
};

// --- Riddle Game ---
const RiddleGame: React.FC<{ language: string; onBack: () => void; onWin: (score: number) => void; highScore?: number }> = ({ language, onBack, onWin, highScore }) => {
  const [riddle, setRiddle] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const fetchRiddle = async () => {
    setLoading(true);
    try {
      const chat = getChat(language, 'games');
      const prompt = `Generate a clever riddle in Romanized ${language} mixed with English.
      Provide 4 possible answers, one of which is correct.
      Respond ONLY with a JSON object: {"riddle": "...", "options": ["...", "...", "...", "..."], "correctIndex": 0}.`;
      
      const response = await chat.sendMessage({ message: prompt });
      const data = JSON.parse(response.text.replace(/```json|```/g, '').trim());
      setRiddle(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(fetchRiddle, []);

  const handleAnswer = (idx: number) => {
    setSelected(idx);
    setShowResult(true);
    if (idx === riddle.correctIndex) {
      setScore(s => s + 1);
      onWin(score + 1);
    }
    setTimeout(() => {
      setShowResult(false);
      setSelected(null);
      fetchRiddle();
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full p-6 overflow-auto">
      <div className="w-full flex justify-between items-center mb-8">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h2 className="text-xl font-medium">Riddle Master</h2>
          <p className="text-sm text-sky-400 font-mono">Score: {score} | Best: {highScore || 0}</p>
        </div>
        <div className="w-10" />
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center flex-1">
            <div className="w-12 h-12 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin mb-4" />
            <p className="text-white/60">Lumina is thinking of a riddle...</p>
          </motion.div>
        ) : riddle && (
          <motion.div key="riddle" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1">
            <div className="glass-panel p-8 rounded-3xl mb-8 text-center italic text-xl leading-relaxed">
              "{riddle.riddle}"
            </div>
            <div className="grid gap-3">
              {riddle.options.map((opt: string, i: number) => (
                <button
                  key={i}
                  disabled={showResult}
                  onClick={() => handleAnswer(i)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    showResult 
                      ? i === riddle.correctIndex ? 'bg-emerald-500/40 border-emerald-500' : i === selected ? 'bg-rose-500/40 border-rose-500' : 'opacity-40 glass-panel'
                      : 'glass-panel hover:border-sky-400/50 hover:bg-white/5'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Memory Game ---
const MemoryGame: React.FC<{ onBack: () => void; onWin: (score: number) => void; highScore?: number }> = ({ onBack, onWin, highScore }) => {
  const icons = ['🌟', '🌙', '🐺', '🌲', '🔥', '💧', '🌍', '⚡'];
  const [cards, setCards] = useState<any[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [solved, setSolved] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    const shuffled = [...icons, ...icons]
      .sort(() => Math.random() - 0.5)
      .map((icon, id) => ({ id, icon }));
    setCards(shuffled);
  }, []);

  const handleClick = (id: number) => {
    if (flipped.length === 2 || flipped.includes(id) || solved.includes(id)) return;
    const newFlipped = [...flipped, id];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      if (cards[newFlipped[0]].icon === cards[newFlipped[1]].icon) {
        setSolved([...solved, ...newFlipped]);
        setFlipped([]);
        if (solved.length + 2 === cards.length) {
          onWin(moves + 1);
        }
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  return (
    <div className="flex flex-col items-center h-full p-6 overflow-auto">
      <div className="w-full flex justify-between items-center mb-8">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h2 className="text-xl font-medium">Memory Match</h2>
          <p className="text-sm text-sky-400 font-mono">Moves: {moves} | Best: {highScore || '--'}</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="grid grid-cols-4 gap-3">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleClick(card.id)}
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl transition-all duration-500 preserve-3d relative ${flipped.includes(card.id) || solved.includes(card.id) ? 'rotate-y-180' : ''}`}
          >
            <div className={`absolute inset-0 backface-hidden glass-panel rounded-xl flex items-center justify-center text-2xl ${solved.includes(card.id) ? 'opacity-0' : ''}`}>
              ?
            </div>
            <div className={`absolute inset-0 backface-hidden rotate-y-180 bg-sky-500/20 border-2 border-sky-500/50 rounded-xl flex items-center justify-center text-3xl`}>
              {card.icon}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
