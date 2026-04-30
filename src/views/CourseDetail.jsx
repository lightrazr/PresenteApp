import React, { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getCourse, getStudentsByCourse, addStudent, updateStudent, deleteStudent, getAttendanceByCourse } from '../db/database';
import { Card, CardHeader, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Avatar } from '../components/Avatar';
import { ArrowLeft, Plus, Play, Calendar, Trash2, Upload, Camera, Pencil, Activity } from 'lucide-react';
import { compressImageToBlob } from '../utils/imageUtils';
import Papa from 'papaparse';
import { format } from 'date-fns';
import './CourseDetail.css';

export const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const courseId = Number(id);

  const course = useLiveQuery(() => getCourse(courseId), [courseId]);
  const students = useLiveQuery(() => getStudentsByCourse(courseId), [courseId]);
  const sortedStudents = students?.slice().sort((a, b) => a.lastName.localeCompare(b.lastName));
  const attendances = useLiveQuery(() => getAttendanceByCourse(courseId), [courseId]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [statsStudent, setStatsStudent] = useState(null);
  const [newStudent, setNewStudent] = useState({ firstName: '', lastName: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const fileInputRef = useRef(null);
  const csvInputRef = useRef(null);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (newStudent.firstName.trim() && newStudent.lastName.trim()) {
      let avatarBlob = null;
      if (avatarFile) {
        try {
          avatarBlob = await compressImageToBlob(avatarFile);
        } catch (error) {
          console.error("Error comprimiendo imagen", error);
        }
      }

      if (editingStudentId) {
        const changes = {
          firstName: newStudent.firstName.trim(),
          lastName: newStudent.lastName.trim(),
        };
        if (avatarBlob) changes.avatar = avatarBlob;
        await updateStudent(editingStudentId, changes);
      } else {
        await addStudent({
          courseId,
          firstName: newStudent.firstName.trim(),
          lastName: newStudent.lastName.trim(),
          avatar: avatarBlob
        });
      }
      
      // Reset
      setNewStudent({ firstName: '', lastName: '' });
      setAvatarFile(null);
      setEditingStudentId(null);
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
      setIsModalOpen(false);
    }
  };

  const openEditModal = (student) => {
    setEditingStudentId(student.id);
    setNewStudent({ firstName: student.firstName, lastName: student.lastName });
    setAvatarFile(null);
    setAvatarPreview(student.avatar instanceof Blob ? URL.createObjectURL(student.avatar) : student.avatar);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingStudentId(null);
    setNewStudent({ firstName: '', lastName: '' });
    setAvatarFile(null);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
    setIsModalOpen(true);
  };

  const handleDeleteStudent = async (studentId) => {
    if (window.confirm('¿Eliminar alumno? También se borrará su historial de asistencia en este curso.')) {
      await deleteStudent(studentId);
    }
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        let imported = 0;
        for (const row of rows) {
          // Detect columns case-insensitively or loosely
          const name = row['Nombre'] || row['Nombres'] || row['nombre'] || row['name'] || '';
          const surname = row['Apellido'] || row['Apellidos'] || row['apellido'] || row['surname'] || '';
          
          if (name.trim() || surname.trim()) {
            await addStudent({
              courseId,
              firstName: name.trim(),
              lastName: surname.trim()
            });
            imported++;
          }
        }
        alert(`Se importaron ${imported} alumnos correctamente.`);
        // Reset input so the same file can be selected again
        if (csvInputRef.current) csvInputRef.current.value = '';
      },
      error: (err) => {
        alert('Error leyendo el archivo CSV: ' + err.message);
      }
    });
  };

  const startAttendance = (e) => {
    e.preventDefault();
    navigate(`/course/${courseId}/swipe?date=${attendanceDate}`);
  };

  if (course === undefined) return <div className="p-4 text-center mt-4">Cargando...</div>;
  if (course === null) return <div className="p-4 text-center mt-4 text-danger">Curso no encontrado</div>;

  return (
    <div className="container course-detail-container">
      <header className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft size={24} />
          </Button>
          <div className="flex items-center gap-2">
            <div className="course-color-dot" style={{ backgroundColor: course.color }}></div>
            <h1 className="heading-2">{course.name}</h1>
          </div>
        </div>
      </header>

      <div className="action-cards grid-2 mb-4">
        <Card className="action-card primary-action" onClick={() => setIsDateModalOpen(true)}>
          <CardContent className="flex flex-col items-center justify-center gap-2 text-center h-full pointer-events-none">
            <div className="icon-circle bg-primary-light">
              <Play size={32} className="text-white" />
            </div>
            <h3 className="heading-3">Tomar Asistencia</h3>
            <p className="text-sm opacity-80">Iniciar modo de tarjetas interactivas</p>
          </CardContent>
        </Card>

        <Link to={`/course/${course.id}/history`} className="no-underline">
          <Card className="action-card secondary-action">
            <CardContent className="flex flex-col items-center justify-center gap-2 text-center h-full">
              <div className="icon-circle bg-secondary-light">
                <Calendar size={32} className="text-white" />
              </div>
              <h3 className="heading-3">Historial</h3>
              <p className="text-sm opacity-80">Ver fechas y exportar a CSV</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="students-section">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <h2 className="heading-3">Alumnos ({sortedStudents?.length || 0})</h2>
          <div className="flex gap-2">
            <input 
              type="file" 
              accept=".csv" 
              style={{ display: 'none' }} 
              ref={csvInputRef} 
              onChange={handleImportCSV} 
              id="csv-upload"
            />
            <Button size="sm" variant="secondary" onClick={() => document.getElementById('csv-upload').click()}>
              <Upload size={16} /> Importar CSV
            </Button>
            <Button size="sm" onClick={openAddModal}>
              <Plus size={16} /> Añadir Alumno
            </Button>
          </div>
        </div>

        <div className="students-list">
          {sortedStudents?.length === 0 ? (
            <div className="glass-panel p-4 text-center text-muted">
              No hay alumnos registrados en este curso.
            </div>
          ) : (
            sortedStudents?.map(student => (
              <div key={student.id} className="student-row glass-panel flex justify-between items-center p-4 mb-2">
                <div className="flex items-center gap-4">
                  <Avatar name={student.firstName} surname={student.lastName} src={student.avatar} />
                  <div>
                    <div className="font-semibold">{student.lastName}, {student.firstName}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setStatsStudent(student)}>
                    <Activity size={18} className="text-info" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEditModal(student)}>
                    <Pencil size={18} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteStudent(student.id)} className="hover-danger">
                    <Trash2 size={18} />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={editingStudentId ? "Editar Alumno" : "Añadir Nuevo Alumno"}
      >
        <form onSubmit={handleAddStudent}>
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Avatar 
                name={newStudent.firstName || '?'} 
                surname={newStudent.lastName || '?'} 
                src={avatarPreview} 
                size="lg" 
              />
              <input 
                type="file" 
                accept="image/*" 
                style={{ display: 'none' }} 
                ref={fileInputRef} 
                onChange={handleAvatarChange}
                id="avatar-upload"
              />
              <button 
                type="button"
                className="absolute bottom-0 right-0 bg-primary text-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center hover:bg-primary-hover transition-colors"
                onClick={() => document.getElementById('avatar-upload').click()}
              >
                <Camera size={20} />
              </button>
            </div>
          </div>
          <Input 
            label="Nombres"
            placeholder="Ej: Juan Carlos"
            value={newStudent.firstName}
            onChange={(e) => setNewStudent({...newStudent, firstName: e.target.value})}
            autoFocus
            required
          />
          <Input 
            label="Apellidos"
            placeholder="Ej: Pérez"
            value={newStudent.lastName}
            onChange={(e) => setNewStudent({...newStudent, lastName: e.target.value})}
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

      <Modal
        isOpen={isDateModalOpen}
        onClose={() => setIsDateModalOpen(false)}
        title="Seleccionar Fecha"
      >
        <form onSubmit={startAttendance}>
          <p className="mb-4 text-sm text-muted">¿Para qué fecha deseas tomar la asistencia?</p>
          <Input 
            type="date"
            label="Fecha"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
            required
          />
          <div className="flex justify-end gap-4 mt-6">
            <Button type="button" variant="ghost" onClick={() => setIsDateModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Comenzar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!statsStudent}
        onClose={() => setStatsStudent(null)}
        title="Estadísticas del Alumno"
      >
        {statsStudent && (() => {
          const studentAtts = attendances?.filter(a => a.studentId === statsStudent.id) || [];
          const totalClassDays = studentAtts.length;
          const presentDays = studentAtts.filter(a => a.status === 'present').length;
          const absentRecords = studentAtts.filter(a => a.status === 'absent').sort((a, b) => new Date(b.date) - new Date(a.date));
          
          const percentage = totalClassDays > 0 ? Math.round((presentDays / totalClassDays) * 100) : 0;
          
          let colorClass = "text-success";
          if (percentage < 60) colorClass = "text-danger";
          else if (percentage < 80) colorClass = "text-warning";

          return (
            <div>
              <div className="flex flex-col items-center text-center gap-4 mb-8">
                <Avatar name={statsStudent.firstName} surname={statsStudent.lastName} src={statsStudent.avatar} size="xl" />
                <div>
                  <h3 className="heading-3">{statsStudent.firstName} {statsStudent.lastName}</h3>
                  <p className="text-muted text-sm mt-1">{totalClassDays} clases registradas</p>
                </div>
              </div>
              
              <div className="glass-panel p-6 mb-8 text-center rounded-xl">
                <p className="text-sm text-muted mb-2 font-medium">Porcentaje de Asistencia</p>
                <h2 className={`heading-1 ${colorClass}`}>{percentage}%</h2>
              </div>

              <h4 className="font-semibold mb-4 text-lg">Fechas de Inasistencia ({absentRecords.length})</h4>
              <div className="max-h-48 overflow-y-auto">
                {absentRecords.length === 0 ? (
                  <p className="text-muted text-sm">No registra inasistencias.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {absentRecords.map(record => {
                      const [y, m, d] = record.date.split('-');
                      return (
                        <li key={record.id} className="p-4 bg-white/5 rounded-md text-sm flex justify-between items-center mb-2">
                          <span className="text-lg">{`${d}/${m}/${y}`}</span>
                          <span className="text-danger font-semibold bg-danger/10 px-3 py-1 rounded-full">Ausente</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              
              <div className="flex justify-end mt-6">
                <Button onClick={() => setStatsStudent(null)}>Cerrar</Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};
