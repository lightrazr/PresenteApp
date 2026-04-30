import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Dashboard } from './views/Dashboard';
import { CourseDetail } from './views/CourseDetail';
import { AttendanceSwipe } from './views/AttendanceSwipe';
import { HistoryExport } from './views/HistoryExport';
import { HistoryDateView } from './views/HistoryDateView';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/course/:id" element={<CourseDetail />} />
        <Route path="/course/:id/swipe" element={<AttendanceSwipe />} />
        <Route path="/course/:id/history" element={<HistoryExport />} />
        <Route path="/course/:id/history/:date" element={<HistoryDateView />} />
      </Routes>
    </Router>
  );
}

export default App;
