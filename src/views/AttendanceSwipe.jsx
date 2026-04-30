import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { db, getCourse, getStudentsByCourse, saveAttendance } from '../db/database';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { ArrowLeft, Check, X, RotateCcw } from 'lucide-react';
import './AttendanceSwipe.css';
import { format } from 'date-fns';

export const AttendanceSwipe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseId = Number(id);

  const course = useLiveQuery(() => getCourse(courseId), [courseId]);
  const students = useLiveQuery(() => getStudentsByCourse(courseId), [courseId]);
  const sortedStudents = students?.slice().sort((a, b) => a.lastName.localeCompare(b.lastName));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState([]); // To keep track of past actions for "undo"
  
  // Read date from URL, fallback to today
  const urlDate = searchParams.get('date');
  const [date] = useState(urlDate || format(new Date(), 'yyyy-MM-dd'));

  const controls = useAnimation();

  useEffect(() => {
    // Lock body scroll to prevent accidental pull-to-refresh on mobile
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  if (sortedStudents === undefined || course === undefined) return <div className="p-4 text-center text-white">Cargando...</div>;
  if (sortedStudents.length === 0) return (
    <div className="p-4 text-center mt-10">
      <h3 className="heading-3 mb-4">No hay alumnos</h3>
      <Button onClick={() => navigate(`/course/${courseId}`)}>Volver</Button>
    </div>
  );

  const currentStudent = sortedStudents[currentIndex];
  const isFinished = currentIndex >= sortedStudents.length;

  const handleSwipe = async (direction, student) => {
    let status = 'present';
    if (direction === -1) status = 'absent';

    // Save locally
    await saveAttendance({
      courseId,
      studentId: student.id,
      date,
      status
    });

    setHistory(prev => [...prev, { index: currentIndex, student, status }]);
    setCurrentIndex(prev => prev + 1);
  };

  const handleUndo = async () => {
    if (history.length === 0) return;
    const lastAction = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setCurrentIndex(lastAction.index);
    // Note: This undoes the UI step. The actual database record will just be overwritten next time we swipe this student.
  };

  const triggerSwipeAnimation = async (direction) => {
    await controls.start({ 
      x: direction * 500, 
      opacity: 0, 
      rotate: direction * 15,
      transition: { duration: 0.3 } 
    });
    handleSwipe(direction, currentStudent);
    controls.set({ x: 0, opacity: 1, rotate: 0 }); // Reset for next card
  };

  return (
    <div className="swipe-container bg-dark flex flex-col h-screen overflow-hidden">
      <header className="swipe-header p-4 flex justify-between items-center z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/course/${courseId}`)}>
          <ArrowLeft size={24} />
        </Button>
        <div className="text-center">
          <h2 className="heading-3">{course?.name}</h2>
          <span className="text-sm text-muted">
            {isFinished ? 'Finalizado' : `${currentIndex + 1} de ${sortedStudents.length}`}
          </span>
        </div>
        <div className="w-10"></div> {/* Spacer for alignment */}
      </header>

      <main className="swipe-main flex-1 relative flex items-center justify-center p-4">
        {isFinished ? (
          <div className="finished-state text-center glass-panel p-8">
            <div className="icon-circle bg-success mx-auto mb-4">
              <Check size={40} className="text-white" />
            </div>
            <h2 className="heading-2 mb-2">¡Asistencia Completada!</h2>
            <p className="text-muted mb-6">Has tomado asistencia a todos los alumnos.</p>
            <div className="flex gap-4 justify-center">
              <Button variant="secondary" onClick={handleUndo} disabled={history.length === 0}>
                Deshacer último
              </Button>
              <Button onClick={() => navigate(`/course/${courseId}`)}>
                Finalizar
              </Button>
            </div>
          </div>
        ) : (
          <div className="card-stack relative w-full max-w-sm mx-auto flex justify-center items-center h-[60vh] min-h-[400px]">
            <AnimatePresence>
              <motion.div
                key={currentStudent.id}
                className="swipe-card absolute w-full h-full glass-panel flex flex-col items-center justify-center p-6 shadow-2xl"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(e, { offset, velocity }) => {
                  const swipeThreshold = 100;
                  if (offset.x > swipeThreshold) {
                    handleSwipe(1, currentStudent);
                  } else if (offset.x < -swipeThreshold) {
                    handleSwipe(-1, currentStudent);
                  }
                }}
                animate={controls}
                style={{ x: 0, rotate: 0, aspectRatio: '3/4', maxWidth: '300px', maxHeight: '450px' }}
                dragElastic={0.8}
                whileDrag={{ scale: 1.05 }}
              >
                <Avatar 
                  name={currentStudent.firstName} 
                  surname={currentStudent.lastName} 
                  src={currentStudent.avatar}
                  size="xl" 
                  className="mb-6 shadow-xl border-4 border-white/10" 
                />
                <h2 className="heading-2 text-center mb-1">{currentStudent.lastName}</h2>
                <h3 className="heading-3 text-muted text-center mb-8">{currentStudent.firstName}</h3>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </main>

      {!isFinished && (
        <footer className="swipe-footer p-6 pb-12 flex justify-center gap-8 items-center z-10 mt-auto">
          <button 
            className="action-btn btn-absent" 
            onClick={() => triggerSwipeAnimation(-1)}
          >
            <X size={32} />
          </button>
          
          <button 
            className="action-btn btn-undo" 
            onClick={handleUndo}
            disabled={history.length === 0}
          >
            <RotateCcw size={24} />
          </button>

          <button 
            className="action-btn btn-present" 
            onClick={() => triggerSwipeAnimation(1)}
          >
            <Check size={32} />
          </button>
        </footer>
      )}
    </div>
  );
};
