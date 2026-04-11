// src/App.js
import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { refreshUser } from './redux/slices/authSlice'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import AdminUserManagement from './pages/AdminUserManagement'
import Articles from './pages/Articles'
import ArticleDetail from './pages/ArticleDetail'
import CreateArticle from './pages/CreateArticle'
import EditArticle from './pages/EditArticle'
import Search from './pages/Search'
import SessionManager from './components/SessionManager'
import ProtectedRoute from './components/ProtectedRoute'
import PersistLogin from './components/PersistLogin'
import Navbar from './components/Navbar'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

const App = () => {
  const dispatch = useDispatch()
  const [isInitialized, setIsInitialized] = useState(false)
  const { user } = useSelector((state) => state.auth)

  useEffect(() => {
    dispatch(refreshUser())
      .unwrap()
      .catch(() => {})
      .finally(() => {
        setIsInitialized(true)
      })
  }, [dispatch])

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-stone-500 text-sm font-medium">Loading Hive...</span>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <SessionManager />
      <ToastContainer
        data-testid="toast-container"
        position="bottom-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="light"
      />
      <div className="min-h-screen bg-surface-50">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route
              path="/"
              element={user ? <Navigate to="/profile" replace /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/login"
              element={user ? <Navigate to="/profile" replace /> : <Login />}
            />
            <Route
              path="/register"
              element={user ? <Navigate to="/profile" replace /> : <Register />}
            />

            <Route element={<PersistLogin />}>
              <Route element={<ProtectedRoute />}>
                <Route path="/profile" element={<Profile />} />
                <Route path="/articles" element={<Articles />} />
                <Route path="/articles/create" element={<CreateArticle />} />
                <Route path="/articles/:id/edit" element={<EditArticle />} />
                <Route path="/articles/:id" element={<ArticleDetail />} />
                <Route path="/search" element={<Search />} />
                <Route path="/admin/users" element={<AdminUserManagement />} />
              </Route>
            </Route>
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
