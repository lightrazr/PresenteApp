import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addCourse, deleteCourse, exportDatabase, importDatabase } from '../db/database';
import { Card, CardHeader, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Users, Plus, Trash2, ArrowRight, Download, Upload, Database } from 'lucide-react';
import { format } from 'date-fns';
import './Dashboard.css';

export const Dashboard = () => {
  const courses = useLiveQuery(() => db.courses.toArray());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupStatus, setBackupStatus] = useState(null); // 'exporting' | 'importing' | 'success' | 'error'
  const [backupMessage, setBackupMessage] = useState('');
  const restoreInputRef = useRef(null);

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

  const handleExportBackup = async () => {
    try {
      setBackupStatus('exporting');
      const backup = await exportDatabase();
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const dateStr = format(new Date(), 'yyyy-MM-dd_HH-mm');
      const a = document.createElement('a');
      a.href = url;
      a.download = `PresenteApp_Backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setBackupStatus('success');
      setBackupMessage(`Backup generado correctamente.\nFecha: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`);
    } catch (error) {
      setBackupStatus('error');
      setBackupMessage('Error al generar el backup: ' + error.message);
    }
  };

  const handleImportBackup = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setBackupStatus('importing');
      const text = await file.text();
      const backup = JSON.parse(text);
      
      await importDatabase(backup);
      
      setBackupStatus('success');
      setBackupMessage(`Datos restaurados correctamente desde:\n${file.name}\n\nFecha del backup: ${format(new Date(backup.exportDate), 'dd/MM/yyyy HH:mm')}`);
    } catch (error) {
      setBackupStatus('error');
      setBackupMessage('Error al restaurar: ' + error.message);
    }
    
    // Reset input
    if (restoreInputRef.current) restoreInputRef.current.value = '';
  };

  return (
    <div className="container dashboard-container">
      <header className="dashboard-header flex items-center justify-between">
        <div>
          <h1 className="heading-1 text-gradient">PresenteApp</h1>
          <p className="text-muted">Toma de asistencia simple y rápida</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setBackupStatus(null); setBackupMessage(''); setIsBackupModalOpen(true); }}>
            <Database size={20} />
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus size={20} /> Nuevo Curso
          </Button>
        </div>
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

      <Modal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        title="Copia de Seguridad"
      >
        <div className="flex flex-col gap-6">
          {!backupStatus && (
            <>
              <p className="text-sm text-muted">
                Genera un archivo con todos tus datos (cursos, alumnos, fotos y asistencias) para guardarlos en un lugar seguro.
              </p>

              <div className="glass-panel p-4 flex flex-col gap-4">
                <div>
                  <h4 className="font-semibold mb-1">Crear Backup</h4>
                  <p className="text-sm text-muted mb-4">Descarga un archivo .json con todos tus datos.</p>
                  <Button onClick={handleExportBackup} className="w-full">
                    <Download size={18} /> Descargar Backup
                  </Button>
                </div>
              </div>

              <div className="glass-panel p-4 flex flex-col gap-4">
                <div>
                  <h4 className="font-semibold mb-1">Restaurar Backup</h4>
                  <p className="text-sm text-muted mb-4">Carga un archivo .json previamente generado. Esto reemplazará todos los datos actuales.</p>
                  <input 
                    type="file" 
                    accept=".json" 
                    style={{ display: 'none' }} 
                    ref={restoreInputRef} 
                    onChange={handleImportBackup}
                    id="restore-upload"
                  />
                  <Button 
                    variant="secondary" 
                    className="w-full"
                    onClick={() => {
                      if (window.confirm('⚠️ Restaurar un backup reemplazará TODOS los datos actuales. ¿Deseas continuar?')) {
                        document.getElementById('restore-upload').click();
                      }
                    }}
                  >
                    <Upload size={18} /> Restaurar desde Archivo
                  </Button>
                </div>
              </div>
            </>
          )}

          {backupStatus === 'exporting' && (
            <div className="text-center p-6">
              <p className="text-muted">Generando backup...</p>
            </div>
          )}

          {backupStatus === 'importing' && (
            <div className="text-center p-6">
              <p className="text-muted">Restaurando datos...</p>
            </div>
          )}

          {backupStatus === 'success' && (
            <div className="text-center p-6 flex flex-col items-center gap-4">
              <div className="icon-circle bg-success mx-auto">
                <Download size={32} className="text-white" />
              </div>
              <h3 className="heading-3 text-success">¡Listo!</h3>
              <p className="text-sm text-muted" style={{ whiteSpace: 'pre-line' }}>{backupMessage}</p>
              <Button onClick={() => { setBackupStatus(null); setBackupMessage(''); }}>
                Volver
              </Button>
            </div>
          )}

          {backupStatus === 'error' && (
            <div className="text-center p-6 flex flex-col items-center gap-4">
              <div className="icon-circle" style={{ backgroundColor: 'var(--danger)' }}>
                <Trash2 size={32} className="text-white" />
              </div>
              <h3 className="heading-3 text-danger">Error</h3>
              <p className="text-sm text-muted">{backupMessage}</p>
              <Button onClick={() => { setBackupStatus(null); setBackupMessage(''); }}>
                Reintentar
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
