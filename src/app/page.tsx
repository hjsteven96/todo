'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { InteractiveHoverButton } from '@/registry/magicui/interactive-hover-button';
import { ShineBorder } from '@/registry/magicui/shine-border';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

interface Note {
  id: string;
  title: string;
  content: string;
  todos: Todo[];
  createdAt: string;
}

type NoteGroupLabel = '오늘' | '어제' | '지난 7일' | '지난 30일' | '그 외';

const NOTE_GROUP_ORDER: NoteGroupLabel[] = [
  '오늘',
  '어제',
  '지난 7일',
  '지난 30일',
  '그 외',
];

const formatKoreanTime = (date: Date) => {
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const period = hours < 12 ? '오전' : '오후';
  const twelveHour = hours % 12 || 12;
  return `${period} ${twelveHour}:${minutes}`;
};

const formatPreviewTimestamp = (createdAt: string) => {
  const noteDate = new Date(createdAt);
  if (Number.isNaN(noteDate.getTime())) return '';
  const today = new Date();
  const sameDay = noteDate.toDateString() === today.toDateString();

  if (sameDay) {
    return formatKoreanTime(noteDate);
  }

  return `${noteDate.getMonth() + 1}월 ${noteDate.getDate()}일`;
};

const formatDetailTimestamp = (createdAt: string) => {
  const noteDate = new Date(createdAt);
  if (Number.isNaN(noteDate.getTime())) return '작성일 정보를 찾을 수 없어요';
  const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'long' }).format(
    noteDate,
  );
  return `${noteDate.getFullYear()}년 ${noteDate.getMonth() + 1}월 ${noteDate.getDate()}일 ${weekday} ${formatKoreanTime(noteDate)}`;
};

const getNoteGroup = (createdAt: string): NoteGroupLabel => {
  const noteDate = new Date(createdAt);
  if (Number.isNaN(noteDate.getTime())) return '그 외';

  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  const startOfNote = new Date(
    noteDate.getFullYear(),
    noteDate.getMonth(),
    noteDate.getDate(),
  ).getTime();
  const diffDays = Math.floor((startOfToday - startOfNote) / 86_400_000);

  if (diffDays <= 0) return '오늘';
  if (diffDays === 1) return '어제';
  if (diffDays <= 7) return '지난 7일';
  if (diffDays <= 30) return '지난 30일';
  return '그 외';
};

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [newTodo, setNewTodo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const isComposingRef = useRef(false);

  useEffect(() => {
    isTypingRef.current = isTyping;
  }, [isTyping]);

  useEffect(() => {
    isComposingRef.current = isComposing;
  }, [isComposing]);

  const markTyping = () => {
    setIsTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 800);
  };

  // Firestore에서 메모 불러오기
  useEffect(() => {
    const notesRef = collection(db, 'notes');
    const q = query(notesRef, orderBy('createdAt', 'desc'));

    // 실시간 업데이트 구독
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notesData: Note[] = snapshot.docs.map((docSnapshot) => {
          const data = docSnapshot.data() as Omit<Note, 'id'>;
          return {
            id: docSnapshot.id,
            title: data.title ?? '',
            content: data.content ?? '',
            todos: data.todos ?? [],
            createdAt: data.createdAt ?? '',
          };
        });

        setNotes(notesData);
        setLoading(false);
        setErrorMessage(null);

        setSelectedNote((previous) => {
          if (notesData.length === 0) {
            setTitle('');
            setContent('');
            return null;
          }

          if (previous) {
            const updatedSelected = notesData.find(
              (note) => note.id === previous.id,
            );
            if (updatedSelected) {
              if (!isTypingRef.current && !isComposingRef.current) {
                setTitle(updatedSelected.title);
                setContent(updatedSelected.content);
              }
              return updatedSelected;
            }
          }

          const firstNote = notesData[0];
          if (!isTypingRef.current && !isComposingRef.current) {
            setTitle(firstNote.title);
            setContent(firstNote.content);
          }
          return firstNote;
        });
      },
      (error) => {
        console.error('메모를 불러오지 못했습니다:', error);
        setErrorMessage(
          '메모를 불러오는 데 문제가 발생했어요. Firebase 환경 변수와 Firestore 설정을 다시 확인한 뒤 새로고침 해주세요.',
        );
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // 새 메모 생성
  const createNewNote = async () => {
    try {
      const newNote = {
        title: '새 메모',
        content: '',
        todos: [],
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'notes'), newNote);
      const createdNote: Note = {
        id: docRef.id,
        ...newNote,
      };
      
      setSelectedNote(createdNote);
      setTitle(createdNote.title);
      setContent(createdNote.content);
      setNewTodo('');
    } catch (error) {
      console.error('메모 생성 오류:', error);
      alert('메모 생성에 실패했습니다.');
    }
  };

  // 메모 선택
  const selectNote = (note: Note) => {
    setSelectedNote(note);
    setTitle(note.title);
    setContent(note.content);
    setNewTodo('');
  };

  // 메모 필드 저장 (디바운스용)
  const saveNoteField = useCallback(
    async (field: 'title' | 'content', value: string) => {
      if (!selectedNote) return;

      try {
        const noteRef = doc(db, 'notes', selectedNote.id);

        await updateDoc(noteRef, {
          [field]: value,
        });

        setSelectedNote((previous) => {
          if (!previous || previous.id !== selectedNote.id) return previous;
          return {
            ...previous,
            [field]: value,
          };
        });
      } catch (error) {
        console.error('메모 업데이트 오류:', error);
        alert('메모 업데이트에 실패했습니다.');
      }
    },
    [selectedNote],
  );

  // 제목/내용 입력값을 일정 시간 후 저장
  useEffect(() => {
    if (!selectedNote || isComposing) return;

    const handler = setTimeout(() => {
      if (title !== selectedNote.title) {
        saveNoteField('title', title);
      }
      if (content !== selectedNote.content) {
        saveNoteField('content', content);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [title, content, selectedNote, isComposing, saveNoteField]);

  // 투두 추가
  const addTodo = async () => {
    if (!newTodo.trim() || !selectedNote) return;

    try {
      const todo: Todo = {
        id: Date.now().toString(),
        text: newTodo.trim(),
        completed: false,
      };

      const updatedTodos = [...selectedNote.todos, todo];
      const noteRef = doc(db, 'notes', selectedNote.id);

      await updateDoc(noteRef, {
        todos: updatedTodos,
      });

      setSelectedNote({
        ...selectedNote,
        todos: updatedTodos,
      });
      setNewTodo('');
    } catch (error) {
      console.error('투두 추가 오류:', error);
      alert('투두 추가에 실패했습니다.');
    }
  };

  // 투두 완료 토글
  const toggleTodo = async (todoId: string) => {
    if (!selectedNote) return;

    try {
      const updatedTodos = selectedNote.todos.map((todo) =>
        todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
      );

      const noteRef = doc(db, 'notes', selectedNote.id);
      await updateDoc(noteRef, {
        todos: updatedTodos,
      });

      setSelectedNote({
        ...selectedNote,
        todos: updatedTodos,
      });
    } catch (error) {
      console.error('투두 업데이트 오류:', error);
      alert('투두 업데이트에 실패했습니다.');
    }
  };

  // 투두 삭제
  const deleteTodo = async (todoId: string) => {
    if (!selectedNote) return;

    try {
      const updatedTodos = selectedNote.todos.filter((todo) => todo.id !== todoId);
      const noteRef = doc(db, 'notes', selectedNote.id);

      await updateDoc(noteRef, {
        todos: updatedTodos,
      });

      setSelectedNote({
        ...selectedNote,
        todos: updatedTodos,
      });
    } catch (error) {
      console.error('투두 삭제 오류:', error);
      alert('투두 삭제에 실패했습니다.');
    }
  };

  // 메모 삭제
  const deleteNote = async (noteId: string) => {
    try {
      const noteRef = doc(db, 'notes', noteId);
      await deleteDoc(noteRef);

      if (selectedNote?.id === noteId) {
        const remainingNotes = notes.filter((note) => note.id !== noteId);
        if (remainingNotes.length > 0) {
          selectNote(remainingNotes[0]);
        } else {
          setSelectedNote(null);
          setTitle('');
          setContent('');
        }
      }
    } catch (error) {
      console.error('메모 삭제 오류:', error);
      alert('메모 삭제에 실패했습니다.');
    }
  };

  const filteredNotes = useMemo(() => {
    if (!searchTerm.trim()) return notes;
    const term = searchTerm.trim().toLowerCase();
    return notes.filter((note) => {
      const base = `${note.title ?? ''} ${note.content ?? ''}`.toLowerCase();
      const todoMatch = note.todos.some((todo) =>
        todo.text.toLowerCase().includes(term),
      );
      return base.includes(term) || todoMatch;
    });
  }, [notes, searchTerm]);

  const groupedNotes = useMemo(() => {
    const groups: Record<NoteGroupLabel, Note[]> = {
      오늘: [],
      어제: [],
      '지난 7일': [],
      '지난 30일': [],
      '그 외': [],
    };

    filteredNotes.forEach((note) => {
      const groupLabel = getNoteGroup(note.createdAt);
      groups[groupLabel].push(note);
    });

    NOTE_GROUP_ORDER.forEach((group) => {
      groups[group].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    });

    return groups;
  }, [filteredNotes]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 text-lg">메모를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-6">
        <div className="max-w-md text-center rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800">
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            연결 오류
          </p>
          <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400">
            {errorMessage}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              새로고침
            </button>
            <button
              onClick={createNewNote}
              className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              새 메모 만들기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f3f4f7] text-gray-900">
      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-80 flex-col border-r border-gray-200 bg-[#f9f9fb]">
          <div className="px-6 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                  받은 편지함
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  총 {notes.length}개의 메모
                </p>
              </div>
              <InteractiveHoverButton onClick={createNewNote} className="px-5">
                새 메모
              </InteractiveHoverButton>
            </div>
            <div className="relative mt-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="검색"
                className="w-full rounded-full border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
          <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
            {notes.length === 0 ? (
              <p className="text-center text-sm text-gray-400">
                아직 작성된 메모가 없습니다.
              </p>
            ) : (
              NOTE_GROUP_ORDER.map((group) => {
                const groupNotes = groupedNotes[group];
                if (!groupNotes || groupNotes.length === 0) return null;
                return (
                  <div key={group}>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
                      {group}
                    </p>
                    <div className="mt-3 space-y-2">
                      {groupNotes.map((note) => {
                        const todoCount = note.todos.length;
                        const completedCount = note.todos.filter(
                          (todo) => todo.completed,
                        ).length;
                        const isActive = selectedNote?.id === note.id;

                        return (
                          <button
                            key={note.id}
                            onClick={() => selectNote(note)}
                            className={`relative w-full overflow-hidden rounded-2xl border px-4 py-3 text-left transition-all ${
                              isActive
                                ? 'border-transparent bg-white shadow-md'
                                : 'border-transparent bg-transparent hover:border-gray-200 hover:bg-white'
                            }`}
                          >
                            {isActive && (
                              <ShineBorder
                                className="-inset-px"
                                borderWidth={1.5}
                                duration={10}
                                shineColor={['#A07CFE', '#FE8FB5', '#FFBE7B', '#A07CFE']}
                              />
                            )}
                            <div className="flex items-center justify-between text-xs text-gray-400">
                              <span>{formatPreviewTimestamp(note.createdAt)}</span>
                              {todoCount > 0 && (
                                <span>
                                  체크 {completedCount}/{todoCount}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-base font-semibold text-gray-900">
                              {note.title || '제목 없음'}
                            </p>
                            <p
                              className="mt-1 text-sm text-gray-500"
                              style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {note.content || '내용 없음'}
                            </p>
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                deleteNote(note.id);
                              }}
                              className="absolute right-4 top-3 text-xs text-gray-300 hover:text-red-500"
                            >
                              삭제
                            </button>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <main className="flex flex-1 flex-col bg-[#f9f9fb]">
          {selectedNote ? (
            <>
              <div className="px-10 py-5">
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      markTyping();
                      setTitle(e.target.value);
                    }}
                    onCompositionStart={() => {
                      setIsComposing(true);
                      if (typingTimeoutRef.current) {
                        clearTimeout(typingTimeoutRef.current);
                      }
                    }}
                    onCompositionEnd={(e) => {
                      setIsComposing(false);
                      markTyping();
                      setTitle(e.currentTarget.value);
                    }}
                    placeholder="제목 없음"
                    className="w-full border-none bg-transparent text-3xl font-semibold text-gray-900 placeholder:text-gray-300 focus:outline-none"
                  />
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                    <span>{formatDetailTimestamp(selectedNote.createdAt)}</span>
                    <span className="h-1 w-1 rounded-full bg-gray-300" />
                    <span>
                      체크리스트 {selectedNote.todos.filter((todo) => todo.completed).length}
                      /{selectedNote.todos.length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-8 overflow-y-auto bg-[#f9f9fb] px-10 py-8">
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <textarea
                    value={content}
                    onChange={(e) => {
                      markTyping();
                      setContent(e.target.value);
                    }}
                    onCompositionStart={() => {
                      setIsComposing(true);
                      if (typingTimeoutRef.current) {
                        clearTimeout(typingTimeoutRef.current);
                      }
                    }}
                    onCompositionEnd={(e) => {
                      setIsComposing(false);
                      markTyping();
                      setContent(e.currentTarget.value);
                    }}
                    placeholder="내용을 입력하세요..."
                    className="min-h-[240px] w-full resize-none border-none bg-transparent text-base leading-relaxed text-gray-700 placeholder:text-gray-400 focus:outline-none"
                  />
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">체크리스트</h3>
                      <p className="text-sm text-gray-500">
                        할 일 {selectedNote.todos.filter((todo) => todo.completed).length}개 완료
                      </p>
                    </div>
                    <div className="flex flex-1 gap-2 md:flex-none">
                      <input
                        type="text"
                        value={newTodo}
                        onChange={(e) => setNewTodo(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addTodo();
                          }
                        }}
                        placeholder="새 할 일을 입력하세요"
                        className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-gray-400 focus:outline-none"
                      />
                      <button
                        onClick={addTodo}
                        className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800"
                      >
                        추가
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {selectedNote.todos.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-400">
                        아직 등록된 체크리스트가 없습니다.
                      </p>
                    ) : (
                      selectedNote.todos.map((todo) => (
                        <div
                          key={todo.id}
                          className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3"
                        >
                          <input
                            type="checkbox"
                            checked={todo.completed}
                            onChange={() => toggleTodo(todo.id)}
                            className="h-5 w-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                          />
                          <span
                            className={`flex-1 text-sm ${
                              todo.completed ? 'text-gray-400 line-through' : 'text-gray-800'
                            }`}
                          >
                            {todo.text}
                          </span>
                          <button
                            onClick={() => deleteTodo(todo.id)}
                            className="text-sm text-gray-400 hover:text-red-500"
                          >
                            삭제
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center bg-white">
              <div className="text-center">
                <p className="text-lg text-gray-500">
                  왼쪽 목록에서 메모를 선택하거나 새로 작성해보세요.
                </p>
                <button
                  onClick={createNewNote}
                  className="mt-4 rounded-full bg-gray-900 px-6 py-2 text-sm font-medium text-white shadow-sm"
                >
                  새 메모 만들기
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
