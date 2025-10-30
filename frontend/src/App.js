import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CourseList from './pages/CourseList';
import CourseDetail from './pages/CourseDetail';
import VideoPlayer from './pages/VideoPlayer';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import CreateCourse from './pages/CreateCourse';
import Notes from './pages/Notes';

function App() {
  return (
    <AuthProvider>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <Box component="main" sx={{ flexGrow: 1 }}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/courses" element={
              <PrivateRoute>
                <CourseList />
              </PrivateRoute>
            } />
            <Route path="/course/:id" element={
              <PrivateRoute>
                <CourseDetail />
              </PrivateRoute>
            } />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            <Route path="/teacher" element={
              <PrivateRoute allowedRoles={['teacher', 'admin']}>
                <TeacherDashboard />
              </PrivateRoute>
            } />
            <Route path="/create-course" element={
              <PrivateRoute allowedRoles={['teacher', 'admin']}>
                <CreateCourse />
              </PrivateRoute>
            } />
            <Route path="/edit-course/:id" element={
              <PrivateRoute allowedRoles={['teacher', 'admin']}>
                <CreateCourse />
              </PrivateRoute>
            } />
            <Route path="/admin" element={
              <PrivateRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </PrivateRoute>
            } />
            <Route path="/profile" element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            } />
            <Route path="/notes" element={
              <PrivateRoute>
                <Notes />
              </PrivateRoute>
            } />
            <Route path="/video/:videoId" element={
              <PrivateRoute allowedRoles={['student', 'teacher', 'admin']}>
                <VideoPlayer />
              </PrivateRoute>
            } />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Box>
        <Footer />
      </Box>
    </AuthProvider>
  );
}

export default App;
