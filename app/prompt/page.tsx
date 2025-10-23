// app/prompt/page.tsx
'use client';

import { useState, useEffect, Suspense, FormEvent, ChangeEvent, KeyboardEvent, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import TypingAnimationPrompt from '@/components/TypingAnimation';
import RecommendationBook from '@/components/RecommendationBook';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface Recommendation {
  id: string;
  title: string;
  author: string;
  highlight: string;
}

interface Highlight {
  id: string;
  text: string;
  bookTitle: string;
  bookAuthor: string;
  bookId: string;
}

interface Book {
  id: string;
  title: string;
  author: string;
  highlights: string;
  synopsis?: string;
}

const placeholderTexts = [
    "What's on your mind?"
];

const AVAILABLE_GENRES = [
    "Habits", "Finance", "Leadership", "Mental health", "Motivational",
    "Physical Health", "Time Management", "Communication", "Self-Discovery",
    "Decision making", "Creativity", "Cognitive intelligence", "Behaviour",
    "Emotional Intelligence", "Innovation", "Philosophy", "Entrepreneurship"
];

const generateAIPrompt = (taskType: string, userPrompt?: string | null, availableGenres?: string | null, data?: any, totalCount?: number): string => {
    const prompts: { [key: string]: any } = {
        languageDetection: {
            role: "You are a highly accurate language identification AI.",
            task: "Analyze the user's query and determine if it is primarily written in English or Indonesian.",
            outputFormat: `
- Your response MUST be a valid JSON object.
- The JSON object must have a single key: "language".
- The value must be either "en" for English or "id" for Indonesian.`,
            content: `User query: "${userPrompt}"`
        },
        highlightTranslation: {
            role: "You are an expert translator specializing in conveying the nuanced meaning of book highlights from English to Indonesian.",
            task: "Translate EACH of the following English book highlights into Indonesian. Preserve the core wisdom, context, and tone of the original highlight. Return the translations in the exact same order as the input.",
            outputFormat: `
- Your response MUST be a valid JSON object.
- The JSON object must have a single key: "translations".
- The value must be an array of strings.`,
            content: `Original English highlights (JSON array format):\n${JSON.stringify(data)}`
        },
        genreAnalysis: {
            role: "You are a specialized AI assistant with expert knowledge of book genres and user intent analysis. You are fluent in both English and Indonesian.",
            context: `Available genres: ${availableGenres}`,
            task: `Analyze the user's query, which can be in English or Indonesian, and determine which book genres would be most relevant.`,
            process: `
1. First, detect the language of the user's query (English or Indonesian).
2. Carefully read the query to understand the user's needs, interests, or preferences, regardless of the language.
3. Scan the available genres for the best matches based on the query's meaning.
4. Prioritize genres where the benefits directly address the user's query.
5. Select a minimum of 1 and a maximum of 3 genres that are most relevant.
6. If the query is vague, choose the most general applicable genres.`,
            outputFormat: `
- Your response MUST be a valid JSON object.
- The JSON object must have a single key: "genres".
- The value of "genres" must be an array of strings.
- Each string must be the exact "Name" of a recommended genre from the provided list.`,
            content: `User query: "${userPrompt}"\n\nSelected genres:`
        },
        // --- MODIFICATION START ---
        highlightRanking: {
            role: "You are an expert content analyst specializing in matching book insights to user queries with surgical precision. You are fluent in both English and Indonesian.",
            context: `You have ${totalCount} individual book highlights. Your task is to find the most relevant highlights that directly answer or address the user's specific query, which may be in English or Indonesian.`,
            task: `Rank ALL of the provided highlights based on how relevant they are to the user's query.`,
            process: `
1. Analyze the user's query (in English or Indonesian) to understand their specific need.
2. Evaluate every single highlight provided for its relevance to the query.
3. Rank all highlights from most relevant to least relevant. Even highlights with low relevance must be included at the end of the list.
4. Do not filter or exclude any highlights. The final list must contain all original highlights, just in a new order.`,
            outputFormat: `
- Your response MUST be a valid JSON object.
- The JSON object must have a single key: "recommendations".
- The value must be an array of objects, each with an "id" field.
- The array must contain an object for EVERY highlight ID provided in the input.
- Order the array by relevance (most relevant first, least relevant last).`,
            content: `Available highlights:\n${data}\n\nUser query: "${userPrompt}"\n\nRanked matching highlights:`
        },
        synopsisRanking: {
            role: "You are an expert content analyst specializing in matching book synopses to user queries with surgical precision. You are fluent in both English and Indonesian.",
            context: `You have ${totalCount} individual book synopses. Your task is to find the most relevant synopses that directly address the user's specific query, which may be in.`,
            task: `Rank ALL of the provided synopses based on how relevant they are to the user's query.`,
            process: `
1. Analyze the user's query to understand their specific need.
2. Evaluate every single synopsis for its relevance to the query.
3. Rank all synopses from most relevant to least relevant. Even synopses with low relevance must be included at the end of the list.
4. Do not filter or exclude any synopses. The final list must contain all original synopses, just in a new order.
5. **CRITICAL RULE: While ranking, strongly prefer diversity. Try not to rank multiple synopses from the same book highly if possible.**`,
            outputFormat: `
- Your response MUST be a valid JSON object.
- The JSON object must have a single key: "recommendations".
- The value must be an array of objects, each with an "id" field.
- The array must contain an object for EVERY synopsis ID provided in the input.
- Order the array by relevance (most relevant first, least relevant last).`,
            content: `Available synopses:\n${data}\n\nUser query: "${userPrompt}"\n\nRanked matching synopses:`
        }
        // --- MODIFICATION END ---
    };
    const selectedPrompt = prompts[taskType];
    if (!selectedPrompt) throw new Error(`Unknown task type: ${taskType}`);
    let promptString = `# ROLE\n${selectedPrompt.role}`;
    if (selectedPrompt.context) promptString += `\n\n# CONTEXT\n${selectedPrompt.context}`;
    if (selectedPrompt.task) promptString += `\n\n# TASK\n${selectedPrompt.task}`;
    if (selectedPrompt.process) promptString += `\n\n# PROCESS\n${selectedPrompt.process}`;
    if (selectedPrompt.outputFormat) promptString += `\n\n# OUTPUT FORMAT\n${selectedPrompt.outputFormat}`;
    if (selectedPrompt.content) promptString += `\n\n${selectedPrompt.content}`;
    return promptString;
};

const parseHighlights = (highlightsText: string): string[] => {
    if (!highlightsText || typeof highlightsText !== 'string') return [];
    const regex = /(["“])(.*?)(["”])/g;
    const matches = Array.from(highlightsText.matchAll(regex));
    if (matches.length > 0) {
        return matches.map(match => match[2].trim());
    }
    const singleHighlight = highlightsText.trim();
    return singleHighlight ? [singleHighlight] : [];
};


function PromptComponent() {
    const searchParams = useSearchParams();
    const [query, setQuery] = useState('');
    const [searchType, setSearchType] = useState('highlights');
    const [isLoading, setIsLoading] = useState(false);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [error, setError] = useState<string | null>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const [placeholder, setPlaceholder] = useState('');
    
    const [mobileIndex, setMobileIndex] = useState(0);
    const [mobileDirection, setMobileDirection] = useState(0);
    const [bookCurrentIndex, setBookCurrentIndex] = useState(1);
    const [isBookFlipping, setIsBookFlipping] = useState(false);
    const bookRef = useRef<HTMLDivElement>(null);
  
    const handleSearch = async (currentQuery = query, currentSearchType = searchType) => {
    if (!currentQuery.trim()) {
      setError('Please enter a prompt to get recommendations.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setRecommendations([]);
    setMobileIndex(0); 
    setBookCurrentIndex(1);

    try {
      const langDetectionPrompt = generateAIPrompt('languageDetection', currentQuery);
      const langResult = await callApi('/api/analyze', { prompt: langDetectionPrompt });
      const detectedLang = langResult.language || 'en';

      const genrePrompt = generateAIPrompt('genreAnalysis', currentQuery, AVAILABLE_GENRES.join(', '));
      const genreResult = await callApi('/api/analyze', { prompt: genrePrompt });
      const genres = genreResult.genres;

      if (!genres || genres.length === 0) {
        throw new Error('No relevant genres found for your query.');
      }

      const searchEndpoint = currentSearchType === 'synopsis' ? '/api/books/search-by-synopsis' : '/api/books/search';
      const books: Book[] = await callApi(searchEndpoint, { genres });

      if (!books || books.length === 0) {
        throw new Error('No books found for the determined genres.');
      }
      
      let finalRecommendations: Recommendation[];

      if (currentSearchType === 'synopsis') {
        const booksToProcess = books.slice(0, 75);
        const synopsisData = booksToProcess.map((book, index) => `ID: synopsis_${index} | Book: "${book.title}" | Synopsis: "${book.synopsis}"`).join('\n');
        const rankingPrompt = generateAIPrompt('synopsisRanking', currentQuery, null, synopsisData, booksToProcess.length);
        const rankingResult = await callApi('/api/analyze', { prompt: rankingPrompt });
        const selectedIds = (rankingResult.recommendations || []).map((rec: { id: string }) => rec.id);
        
        finalRecommendations = buildRecommendationsFromSynopsis(selectedIds, booksToProcess);
        
        if (finalRecommendations.length === 0) {
            throw new Error('No synopses match your query well enough.');
        }

        if (detectedLang === 'id' && finalRecommendations.length > 0) {
            finalRecommendations = await translateHighlights(finalRecommendations);
        }

      } else { 
        const booksToProcess = books.slice(0, 75);
        const allHighlights = extractAllHighlights(booksToProcess);

        if (allHighlights.length === 0) {
            throw new Error('No valid highlights found in the books.');
        }

        const highlightData = allHighlights.map(h => `ID: ${h.id} | Book: "${h.bookTitle}" | Highlight: "${h.text}"`).join('\n');
        const rankingPrompt = generateAIPrompt('highlightRanking', currentQuery, null, highlightData, allHighlights.length);
        const rankingResult = await callApi('/api/analyze', { prompt: rankingPrompt });
        const selectedIds = (rankingResult.recommendations || []).map((rec: { id: string }) => rec.id);
        
        finalRecommendations = buildRecommendationsFromHighlights(selectedIds, allHighlights);

        if (finalRecommendations.length === 0) {
            throw new Error('No highlights match your query well enough.');
        }
        
        if (detectedLang === 'id' && finalRecommendations.length > 0) {
            finalRecommendations = await translateHighlights(finalRecommendations);
        }
      }
      setRecommendations(finalRecommendations);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while getting recommendations.');
    } finally {
      setIsLoading(false);
    }
  };

  const translateHighlights = async (recs: Recommendation[]): Promise<Recommendation[]> => {
      const highlightsToTranslate = recs.map(rec => rec.highlight);
      const translationPrompt = generateAIPrompt('highlightTranslation', null, null, highlightsToTranslate);
      const translationResult = await callApi('/api/analyze', { prompt: translationPrompt });

      if (translationResult.translations && translationResult.translations.length === recs.length) {
          return recs.map((rec, index) => ({
              ...rec,
              highlight: translationResult.translations[index] || rec.highlight,
          }));
      }
      return recs;
  }

  const callApi = async (endpoint: string, body: object) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }
    return response.json();
  };

  const extractAllHighlights = (books: Book[]): Highlight[] => {
      const allHighlights: Highlight[] = [];
      books.forEach((book, bookIndex) => {
          const highlights = parseHighlights(book.highlights);
          highlights.forEach((highlight, highlightIndex) => {
              allHighlights.push({
                  id: `highlight_${bookIndex}_${highlightIndex}`,
                  text: highlight,
                  bookTitle: book.title,
                  bookAuthor: book.author,
                  bookId: book.id,
              });
          });
      });
      return allHighlights;
  };
  
  const buildRecommendationsFromHighlights = (selectedIds: string[], allHighlights: Highlight[]): Recommendation[] => {
      const recommendations: Recommendation[] = [];
      for (const id of selectedIds) {
          const highlight = allHighlights.find(h => h.id === id);
          if (highlight) {
              recommendations.push({
                  id: highlight.bookId,
                  title: highlight.bookTitle,
                  author: highlight.bookAuthor,
                  highlight: highlight.text,
              });
          }
      }
      return recommendations;
  };
  
  const buildRecommendationsFromSynopsis = (selectedIds: string[], books: Book[]): Recommendation[] => {
    const recommendations: Recommendation[] = [];
    const addedBookTitles = new Set<string>();
    for (const id of selectedIds) {
        if (recommendations.length >= 5) break;

        const index = parseInt(id.split('_')[1]);
        const book = books[index];

        if (book && book.synopsis && !addedBookTitles.has(book.title)) {
            recommendations.push({
                id: book.id,
                title: book.title,
                author: book.author,
                highlight: book.synopsis,
            });
            addedBookTitles.add(book.title);
        }
    }
    return recommendations;
  };

  const handleSubmit = (e: FormEvent) => { e.preventDefault(); handleSearch(query, searchType); };
  
  const handleTextareaChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };
  
  const handleNext = () => {
    if (isBookFlipping) return;
    setBookCurrentIndex((prev) => Math.min(prev + 1, recommendations.length));
    setMobileDirection(1);
    setMobileIndex(i => Math.min(i + 1, recommendations.length - 1));
  };
  const handlePrev = () => {
    if (isBookFlipping) return;
    setBookCurrentIndex((prev) => Math.max(prev - 1, 1));
    setMobileDirection(-1);
    setMobileIndex(i => Math.max(i - 1, 0));
  };
  
  const sheetVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
    }),
  };

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * placeholderTexts.length);
    setPlaceholder(placeholderTexts[randomIndex]);
  }, []);

  useEffect(() => {
    const queryFromUrl = searchParams.get('query');
    const searchTypeFromUrl = searchParams.get('searchType');
    if (queryFromUrl) {
      const newSearchType = searchTypeFromUrl === 'synopsis' ? 'synopsis' : 'highlights';
      setQuery(queryFromUrl);
      setSearchType(newSearchType);
      setTimeout(() => handleSearch(queryFromUrl, newSearchType), 100);
    }
  }, [searchParams]);

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      const textarea = formRef.current?.querySelector('textarea');
      if (document.activeElement === textarea) {
        return;
      }

      if (recommendations.length === 0) return;

      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [recommendations, bookCurrentIndex, mobileIndex, isBookFlipping]);

  useEffect(() => {
    if (recommendations.length > 0 && bookRef.current) {
      bookRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [recommendations]);

  return (
    <div className="flex-grow flex flex-col items-center justify-center bg-classic-cream px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-5rem)] overflow-x-hidden overflow-y-hidden">
        <div className="w-full max-w-7xl mx-auto">
            <div className="text-center text-classic-green mb-10 max-w-2xl mx-auto">
                <TypingAnimationPrompt />
                <h2 className="font-serif text-3xl md:text-6xl font-bold uppercase tracking-wide whitespace-nowFrap">
                    Begin by Asking...
                </h2>
            </div>

            <form onSubmit={handleSubmit} ref={formRef} className="mb-8 max-w-4xl mx-auto">
                <div className="search-box-container">
                    <textarea
                        className="search-input w-full flex-grow bg-transparent text-classic-green placeholder-neutral-500 text-base leading-relaxed focus:outline-none resize-none overflow-y-auto"
                        value={query}
                        onChange={handleTextareaChange}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        rows={1}
                    />
                    <div className="search-options-row">
                        <div className="flex items-center space-x-2">
                            <button type="button" onClick={() => setSearchType('highlights')} className={`search-option-btn ${searchType === 'highlights' ? 'active' : ''}`}>
                                <span className="hidden sm:inline">By </span>Highlights
                            </button>
                            <button type="button" onClick={() => setSearchType('synopsis')} className={`search-option-btn ${searchType === 'synopsis' ? 'active' : ''}`}>
                                <span className="hidden sm:inline">By </span>Synopsis
                            </button>
                        </div>
                        <button type="submit" disabled={isLoading || !query.trim()} className="send-btn flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M8 5v14l11-7z"/></svg>
                        </button>
                    </div>
                </div>
            </form>
        </div>

        {isLoading && (
            <div className="text-center text-classic-green text-lg my-5">
                <div className="book-container">
                    <div className="book">
                        <div className="book__page"></div>
                        <div className="book__page"></div>
                        <div className="book__page"></div>
                        <div className="book__page"></div>
                        <div className="book__page"></div>
                        <div className="book__page"></div>
                    </div>
                </div>
                <p>AI is analyzing your request and finding the best book recommendations...</p>
            </div>
        )}

        {error && (
            <div className="bg-classic-green bg-opacity-10 border border-classic-green text-classic-green p-4 rounded-lg my-5 text-center">
                {error}
            </div>
        )}

{!isLoading && recommendations.length > 0 && (
                <div ref={bookRef} className="w-full my-16">
                    <div className="hidden md:block">
                        <div className="w-full" style={{ transform: 'translateX(25%)' }}>
                          <div className="hidden md:block">
                        <RecommendationBook 
                            recommendations={recommendations}
                            currentIndex={bookCurrentIndex}
                            isFlipping={isBookFlipping}
                            onNext={handleNext}
                            onPrev={handlePrev}
                            setIsFlipping={setIsBookFlipping}
                        />
                    </div>
                        </div>
                    </div>

                <div className="block md:hidden">
                    <div className="w-full flex flex-col items-center">
                        <div className="relative w-full max-w-sm h-[480px] overflow-hidden">
                            <AnimatePresence initial={false} custom={mobileDirection} mode="wait">
                                <motion.div
                                    key={mobileIndex}
                                    custom={mobileDirection}
                                    variants={sheetVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{
                                        x: { type: "spring", stiffness: 300, damping: 30 },
                                        opacity: { duration: 0.2 }
                                    }}
                                    className="absolute w-full h-full p-6 bg-white rounded-lg shadow-md flex flex-col items-center justify-center text-center"
                                >
                                    <div className="absolute top-2 left-2 text-6xl text-classic-green font-serif">“</div>
                                    <Link
                                        href={`/book-details/${recommendations[mobileIndex].id}`}
                                        className="font-lustria text-lg leading-relaxed text-gray-800 px-4 py-2 cursor-pointer transition-transform duration-300 ease-out hover:scale-105"
                                        aria-label="View book details for this quote"
                                    >
                                        "{recommendations[mobileIndex].highlight}"
                                    </Link>
                                    <div className="absolute bottom-2 right-2 text-6xl text-classic-green font-serif">”</div>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        <div className="flex items-center justify-center space-x-8 mt-4">
                            <button onClick={handlePrev} disabled={mobileIndex === 0} className="font-sans font-semibold text-classic-green disabled:text-gray-400">
                                Previous
                            </button>
                            <span className="font-sans text-sm text-gray-500">{mobileIndex + 1} / {recommendations.length}</span>
                            <button onClick={handleNext} disabled={mobileIndex === recommendations.length - 1} className="font-sans font-semibold text-classic-green disabled:text-gray-400">
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}

export default function PromptPage() {
    return (
        <Suspense fallback={<div className="text-center p-12">Loading page...</div>}>
            <PromptComponent />
        </Suspense>
    );
}