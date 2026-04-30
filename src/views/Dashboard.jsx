import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addCourse, deleteCourse } from '../db/database';
import { Card, CardHeader, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Users, Plus, Trash2, ArrowRight } from 'lucide-react';
import './Dashboard.css';

export const Dashboard = () => {
  const courses = useLiveQuery(() => db.courses.toArray());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');

  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (newCourseName.trim()) {
      await addCourse({ 
        name: newCourseName.trim(), 
        color: `hsl(${Math.random() * 360}, 70%, 60%)` 
      });
      setNewCourseName('');
      setIsModalOpen(false);
    }
  };

  const handleDeleteCourse = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('¿Estás seguro de eliminar este curso y todos sus alumnos/asistencias?')) {
      await deleteCourse(id);
    }
  };

  return (
    <div className="container dashboard-container">
      <header className="dashboard-header flex items-center justify-between">
        <div>
          <h1 className="heading-1 text-gradient">PresenteApp</h1>
          <p className="text-muted">Toma de asistencia simple y rápida</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={20} /> Nuevo Curso
        </Button>
      </header>

      <main className="courses-grid mt-4">
        {courses?.length === 0 ? (
          <div className="empty-state glass-panel text-center p-4">
            <Users size={48} className="text-muted mb-4 mx-auto" />
            <h3 className="heading-3 mb-2">No hay cursos aún</h3>
            <p className="text-muted mb-4">Comienza creando tu primer curso o grupo.</p>
            <Button onClick={() => setIsModalOpen(true)} variant="secondary">
              Crear Curso
            </Button>
          </div>
        ) : (
          courses?.map(course => (
            <Link to={`/course/${course.id}`} key={course.id} className="course-link">
              <Card className="course-card">
                <CardHeader>
                  <div className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-2">
                      <div className="course-color-dot" style={{ backgroundColor: course.color }}></div>
                      <h3 className="heading-3">{course.name}</h3>
                    </div>
                    <button 
                      className="btn-icon text-muted hover-danger"
                      onClick={(e) => handleDeleteCourse(course.id, e)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="flex justify-between items-center">
                  <span className="text-muted text-sm">Ver alumnos y asistencia</span>
                  <ArrowRight size={20} className="text-primary" />
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </main>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Crear Nuevo Curso"
      >
        <form onSubmit={handleAddCourse}>
          <Input 
            label="Nombre del Curso / Grupo"
            placeholder="Ej: Matemáticas 1A"
            value={newCourseName}
            onChange={(e) => setNewCourseName(e.target.value)}
            autoFocus
            required
          />
          <div className="flex justify-between gap-4 mt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
