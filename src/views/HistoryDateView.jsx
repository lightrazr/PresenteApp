import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getCourse, getStudentsByCourse, getAttendanceByCourseAndDate, saveAttendance, deleteAttendanceByDate, updateAttendanceDate } from '../db/database';
import { Button } from '../components/Button';
import { Avatar } from '../components/Avatar';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { ArrowLeft, Check, X, Trash2, Pencil } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export const HistoryDateView = () => {
  const { id, date } = useParams();
  const navigate = useNavigate();
  const courseId = Number(id);

  const course = useLiveQuery(() => getCourse(courseId), [courseId]);
  const students = useLiveQuery(() => getStudentsByCourse(courseId), [courseId]);
  const attendances = useLiveQuery(() => getAttendanceByCourseAndDate(courseId, date), [courseId, date]);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newDateStr, setNewDateStr] = useState(date);

  if (!course || !students || !attendances) return <div className="p-4 text-center mt-4">Cargando...</div>;

  let formattedDate;
  try {
    formattedDate = format(parseISO(date), "EEEE d 'de' MMMM, yyyy", { locale: es });
  } catch {
    formattedDate = date;
  }

  const handleToggleStatus = async (studentId, currentStatus) => {
    const newStatus = currentStatus === 'present' ? 'absent' : 'present';
    await saveAttendance({
      courseId,
      studentId,
      date,
      status: newStatus
    });
  };

  const handleDeleteDate = async () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar la asistencia de este día? Esta acción no se puede deshacer.')) {
      await deleteAttendanceByDate(courseId, date);
      navigate(`/course/${courseId}/history`);
    }
  };

  const handleEditDate = async (e) => {
    e.preventDefault();
    if (newDateStr && newDateStr !== date) {
      await updateAttendanceDate(courseId, date, newDateStr);
      setIsEditModalOpen(false);
      navigate(`/course/${courseId}/history/${newDateStr}`, { replace: true });
    } else {
      setIsEditModalOpen(false);
    }
  };

  return (
    <div className="container py-4 pb-12">
      <header className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/course/${courseId}/history`)}>
            <ArrowLeft size={24} />
          </Button>
          <div>
            <h1 className="heading-3 capitalize">{formattedDate}</h1>
            <p className="text-muted">{course.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="icon" onClick={() => setIsEditModalOpen(true)}>
            <Pencil size={20} />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDeleteDate} className="hover-danger">
            <Trash2 size={20} />
          </Button>
        </div>
      </header>

      <div className="students-list">
        {students.length === 0 ? (
          <div className="glass-panel p-4 text-center text-muted">
            No hay alumnos registrados.
          </div>
        ) : (
          students.map(student => {
            const record = attendances.find(a => a.studentId === student.id);
            // If no record exists for this student on this date, assume absent or unrecorded.
            // Let's assume unrecorded is absent for UI simplicity, but ideally it should show unrecorded.
            const status = record?.status || 'absent';
            const isPresent = status === 'present';

            return (
              <div key={student.id} className="student-row glass-panel flex justify-between items-center p-4 mb-2">
                <div className="flex items-center gap-4">
                  <Avatar name={student.firstName} surname={student.lastName} src={student.avatar} />
                  <div>
                    <div className="font-semibold">{student.lastName}, {student.firstName}</div>
                    <div className={isPresent ? "text-success text-sm" : "text-danger text-sm"}>
                      {isPresent ? 'Presente' : 'Ausente'}
                    </div>
                  </div>
                </div>
                <Button 
                  variant={isPresent ? "secondary" : "ghost"} 
                  className={isPresent ? "border-success text-success" : "border-danger text-danger"}
                  onClick={() => handleToggleStatus(student.id, status)}
                >
                  {isPresent ? <Check size={20} /> : <X size={20} />}
                  Cambiar
                </Button>
              </div>
            );
          })
        )}
      </div>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Fecha"
      >
        <form onSubmit={handleEditDate}>
          <p className="text-sm text-muted mb-4">Selecciona la nueva fecha para estos registros de asistencia.</p>
          <Input 
            type="date"
            label="Nueva Fecha"
            value={newDateStr}
            onChange={(e) => setNewDateStr(e.target.value)}
            required
          />
          <div className="flex justify-end gap-4 mt-6">
            <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
