import Dexie from 'dexie';

export const db = new Dexie('PresenteAppDB');

db.version(1).stores({
  courses: '++id, name, color',
  students: '++id, courseId, firstName, lastName, avatar',
  attendances: '++id, courseId, date, studentId, status, [courseId+date]' // Compound index for quick lookup by date and course
});

// Helper functions for easy access
export const addCourse = async (course) => {
  return await db.courses.add(course);
};

export const getCourses = async () => {
  return await db.courses.toArray();
};

export const getCourse = async (id) => {
  return await db.courses.get(id);
};

export const deleteCourse = async (id) => {
  // Also delete related students and attendances
  await db.transaction('rw', db.courses, db.students, db.attendances, async () => {
    await db.courses.delete(id);
    await db.students.where('courseId').equals(id).delete();
    await db.attendances.where('courseId').equals(id).delete();
  });
};

export const addStudent = async (student) => {
  return await db.students.add(student);
};

export const updateStudent = async (id, changes) => {
  return await db.students.update(id, changes);
};

export const deleteStudent = async (id) => {
  await db.transaction('rw', db.students, db.attendances, async () => {
    await db.students.delete(id);
    await db.attendances.where('studentId').equals(id).delete();
  });
};

export const getStudentsByCourse = async (courseId) => {
  return await db.students.where('courseId').equals(courseId).toArray();
};

export const saveAttendance = async (attendanceRecord) => {
  // Check if a record already exists for this student on this date
  const existing = await db.attendances
    .where({ studentId: attendanceRecord.studentId, date: attendanceRecord.date })
    .first();
  
  if (existing) {
    return await db.attendances.update(existing.id, { status: attendanceRecord.status });
  } else {
    return await db.attendances.add(attendanceRecord);
  }
};

export const getAttendanceByCourseAndDate = async (courseId, date) => {
  return await db.attendances
    .where('[courseId+date]')
    .equals([courseId, date])
    .toArray();
};

export const getAttendanceByCourse = async (courseId) => {
  return await db.attendances
    .where('courseId')
    .equals(courseId)
    .toArray();
};

export const deleteAttendanceByDate = async (courseId, date) => {
  const records = await db.attendances
    .where('[courseId+date]')
    .equals([courseId, date])
    .toArray();
    
  const ids = records.map(r => r.id);
  await db.attendances.bulkDelete(ids);
};

export const updateAttendanceDate = async (courseId, oldDate, newDate) => {
  const records = await db.attendances
    .where('[courseId+date]')
    .equals([courseId, oldDate])
    .toArray();
    
  const updates = records.map(r => ({ ...r, date: newDate }));
  await db.attendances.bulkPut(updates);
};

// ---- Backup & Restore ----

const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const base64ToBlob = (base64) => {
  const [meta, data] = base64.split(',');
  const mime = meta.match(/:(.*?);/)[1];
  const binary = atob(data);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  return new Blob([array], { type: mime });
};

export const exportDatabase = async () => {
  const courses = await db.courses.toArray();
  const students = await db.students.toArray();
  const attendances = await db.attendances.toArray();

  // Convert Blob avatars to base64 for JSON serialization
  const studentsWithBase64 = await Promise.all(
    students.map(async (s) => {
      if (s.avatar instanceof Blob) {
        return { ...s, avatar: await blobToBase64(s.avatar), _avatarIsBlob: true };
      }
      return s;
    })
  );

  return {
    version: 1,
    exportDate: new Date().toISOString(),
    app: 'PresenteApp',
    data: {
      courses,
      students: studentsWithBase64,
      attendances
    }
  };
};

export const importDatabase = async (backup) => {
  if (!backup || backup.app !== 'PresenteApp') {
    throw new Error('El archivo no es un backup válido de PresenteApp.');
  }

  const { courses, students, attendances } = backup.data;

  // Restore Blob avatars from base64
  const studentsWithBlobs = students.map((s) => {
    if (s._avatarIsBlob && s.avatar) {
      const blob = base64ToBlob(s.avatar);
      const { _avatarIsBlob, ...rest } = s;
      return { ...rest, avatar: blob };
    }
    const { _avatarIsBlob, ...rest } = s;
    return rest;
  });

  await db.transaction('rw', db.courses, db.students, db.attendances, async () => {
    await db.courses.clear();
    await db.students.clear();
    await db.attendances.clear();

    await db.courses.bulkAdd(courses);
    await db.students.bulkAdd(studentsWithBlobs);
    await db.attendances.bulkAdd(attendances);
  });
};
