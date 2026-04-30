import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getCourse, getStudentsByCourse, getAttendanceByCourse } from '../db/database';
import { Button } from '../components/Button';
import { Card, CardHeader, CardContent } from '../components/Card';
import { ArrowLeft, Download, FileSpreadsheet } from 'lucide-react';
import { exportToCsv } from '../utils/exportCsv';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export const HistoryExport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const courseId = Number(id);

  const course = useLiveQuery(() => getCourse(courseId), [courseId]);
  const students = useLiveQuery(() => getStudentsByCourse(courseId), [courseId]);
  const attendances = useLiveQuery(() => getAttendanceByCourse(courseId), [courseId]);

  if (!course || !students || !attendances) return <div className="p-4 text-center mt-4">Cargando...</div>;

  // Group attendances by date
  const groupedByDate = attendances.reduce((acc, curr) => {
    if (!acc[curr.date]) acc[curr.date] = [];
    acc[curr.date].push(curr);
    return acc;
  }, {});

  const dates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));

  const handleExportAll = () => {
    const data = attendances.map(att => {
      const student = students.find(s => s.id === att.studentId);
      return {
        Fecha: format(parseISO(att.date), 'dd/MM/yyyy'),
        Apellido: student?.lastName || 'Desconocido',
        Nombre: student?.firstName || 'Desconocido',
        Estado: att.status === 'present' ? 'Presente' : 'Ausente'
      };
    });
    
    // Sort by Date then Last Name
    data.sort((a, b) => {
      if (a.Fecha !== b.Fecha) return b.Fecha.localeCompare(a.Fecha);
      return a.Apellido.localeCompare(b.Apellido);
    });

    exportToCsv(data, `Asistencia_${course.name}_Completa.csv`);
  };

  const handleExportDate = (dateStr) => {
    const records = groupedByDate[dateStr];
    const data = records.map(att => {
      const student = students.find(s => s.id === att.studentId);
      return {
        Apellido: student?.lastName || 'Desconocido',
        Nombre: student?.firstName || 'Desconocido',
        Estado: att.status === 'present' ? 'Presente' : 'Ausente'
      };
    });

    data.sort((a, b) => a.Apellido.localeCompare(b.Apellido));

    exportToCsv(data, `Asistencia_${course.name}_${dateStr}.csv`);
  };

  return (
    <div className="container py-4">
      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/course/${courseId}`)}>
            <ArrowLeft size={24} />
          </Button>
          <div>
            <h1 className="heading-2">Historial</h1>
            <p className="text-muted">{course.name}</p>
          </div>
        </div>
        <Button onClick={handleExportAll} className="gap-2" disabled={attendances.length === 0}>
          <FileSpreadsheet size={20} /> Exportar Todo
        </Button>
      </header>

      {dates.length === 0 ? (
        <div className="glass-panel p-8 text-center text-muted">
          No hay registros de asistencia para este curso todavía.
        </div>
      ) : (
        <div className="grid gap-4">
          {dates.map(dateStr => {
            const records = groupedByDate[dateStr];
            const presentCount = records.filter(r => r.status === 'present').length;
            const absentCount = records.filter(r => r.status === 'absent').length;
            const formattedDate = format(parseISO(dateStr), "EEEE d 'de' MMMM, yyyy", { locale: es });

            return (
              <div 
                key={dateStr} 
                className="glass-panel flex justify-between items-center p-4 cursor-pointer hover-bg-light"
                onClick={() => navigate(`/course/${courseId}/history/${dateStr}`)}
              >
                <div>
                  <h3 className="heading-3 capitalize mb-1">{formattedDate}</h3>
                  <div className="flex gap-4 text-sm">
                    <span className="text-success">{presentCount} Presentes</span>
                    <span className="text-danger">{absentCount} Ausentes</span>
                  </div>
                </div>
                <Button 
                  variant="secondary" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportDate(dateStr);
                  }}
                >
                  <Download size={18} /> CSV
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
