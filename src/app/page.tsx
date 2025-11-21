'use client';

import { useState, useEffect } from 'react';
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

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
              setTitle(updatedSelected.title);
              setContent(updatedSelected.content);
              return updatedSelected;
            }
          }

          const firstNote = notesData[0];
          setTitle(firstNote.title);
          setContent(firstNote.content);
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

  // 메모 업데이트
  const updateNote = async (field: 'title' | 'content', value: string) => {
    if (!selectedNote) return;

    try {
      const noteRef = doc(db, 'notes', selectedNote.id);
      const updatedNote = {
        ...selectedNote,
        [field]: value,
      };

      await updateDoc(noteRef, {
        [field]: value,
      });

      setSelectedNote(updatedNote);

      if (field === 'title') {
        setTitle(value);
      } else {
        setContent(value);
      }
    } catch (error) {
      console.error('메모 업데이트 오류:', error);
      alert('메모 업데이트에 실패했습니다.');
    }
  };

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
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* 사이드바 - 메모 목록 */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={createNewNote}
            className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            + 새 메모
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {notes.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
              메모가 없습니다
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className={`p-3 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  selectedNote?.id === note.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500'
                    : ''
                }`}
                onClick={() => selectNote(note)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {note.title || '제목 없음'}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                      {note.content || '내용 없음'}
                    </p>
                    {note.todos.length > 0 && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        투두 {note.todos.filter((t) => t.completed).length}/
                        {note.todos.length}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNote(note.id);
                    }}
                    className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 메인 영역 - 메모 편집 */}
      <div className="flex-1 flex flex-col">
        {selectedNote ? (
          <>
            {/* 제목 입력 */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <input
                type="text"
                value={title}
                onChange={(e) => updateNote('title', e.target.value)}
                placeholder="메모 제목을 입력하세요"
                className="w-full text-2xl font-bold bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
              />
            </div>

            {/* 내용 입력 */}
            <div className="flex-1 p-4 overflow-y-auto">
              <textarea
                value={content}
                onChange={(e) => updateNote('content', e.target.value)}
                placeholder="메모 내용을 입력하세요..."
                className="w-full h-full bg-transparent border-none outline-none resize-none text-gray-700 dark:text-gray-300 placeholder-gray-400"
              />
            </div>

            {/* 투두 리스트 */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                투두 리스트
              </h3>

              {/* 투두 입력 */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addTodo();
                    }
                  }}
                  placeholder="새 투두 추가..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addTodo}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                  추가
                </button>
              </div>

              {/* 투두 목록 */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedNote.todos.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    투두가 없습니다
                  </p>
                ) : (
                  selectedNote.todos.map((todo) => (
                    <div
                      key={todo.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => toggleTodo(todo.id)}
                        className="w-5 h-5 text-blue-500 rounded focus:ring-blue-500"
                      />
                      <span
                        className={`flex-1 ${
                          todo.completed
                            ? 'line-through text-gray-500 dark:text-gray-400'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        {todo.text}
                      </span>
                      <button
                        onClick={() => deleteTodo(todo.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors px-2"
                      >
                        삭제
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">
                메모를 선택하거나 새 메모를 만들어주세요
              </p>
              <button
                onClick={createNewNote}
                className="px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-medium transition-colors"
              >
                새 메모 만들기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
