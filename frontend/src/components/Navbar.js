// src/components/Navbar.js
import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { logout } from '../redux/slices/authSlice'
import { toast } from 'react-toastify'

const NavLink = ({ to, children, active }) => (
  <Link
    to={to}
    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
      active
        ? 'bg-white/10 text-white'
        : 'text-stone-300 hover:text-white hover:bg-white/5'
    }`}
  >
    {children}
  </Link>
)

const Navbar = () => {
  const user = useSelector((state) => state.auth.user)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap()
      toast.success('Logged out successfully.', { autoClose: 1500 })
      navigate('/login')
    } catch (error) {
      toast.error('Error logging out.')
    }
  }

  const role = user?.claims?.role || user?.role
  const isActive = (path) => location.pathname === path

  return (
    <nav className="bg-stone-900 sticky top-0 z-50 border-b border-stone-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg">Hive</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {user ? (
              <>
                <NavLink to="/articles" active={isActive('/articles')}>Articles</NavLink>
                <NavLink to="/search" active={isActive('/search')}>Search</NavLink>
                {(role === 'admin' || role === 'moderator') && (
                  <NavLink to="/articles/create" active={isActive('/articles/create')}>New Article</NavLink>
                )}
                {role === 'admin' && (
                  <NavLink to="/admin/users" active={isActive('/admin/users')}>Users</NavLink>
                )}
              </>
            ) : (
              <>
                <NavLink to="/login" active={isActive('/login')}>Login</NavLink>
                <NavLink to="/register" active={isActive('/register')}>Register</NavLink>
              </>
            )}
          </div>

          {/* User menu */}
          <div className="hidden md:flex items-center gap-3">
            {user && (
              <>
                <Link to="/profile" className="flex items-center gap-2 group">
                  <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center">
                    <span className="text-brand-400 text-sm font-semibold">
                      {(user.username || user.claims?.sub || '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <span className="text-stone-300 text-sm group-hover:text-white transition-colors">
                    {user.username || user.claims?.sub}
                  </span>
                </Link>
                {role && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    role === 'admin' ? 'bg-purple-500/20 text-purple-300' :
                    role === 'moderator' ? 'bg-blue-500/20 text-blue-300' :
                    'bg-stone-700 text-stone-400'
                  }`}>
                    {role}
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  className="text-stone-400 hover:text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  Logout
                </button>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden text-stone-300 hover:text-white p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-1">
            {user ? (
              <>
                <NavLink to="/profile" active={isActive('/profile')}>Profile</NavLink>
                <NavLink to="/articles" active={isActive('/articles')}>Articles</NavLink>
                <NavLink to="/search" active={isActive('/search')}>Search</NavLink>
                {(role === 'admin' || role === 'moderator') && (
                  <NavLink to="/articles/create" active={isActive('/articles/create')}>New Article</NavLink>
                )}
                {role === 'admin' && (
                  <NavLink to="/admin/users" active={isActive('/admin/users')}>Users</NavLink>
                )}
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 text-stone-300 hover:text-white text-sm font-medium rounded-lg hover:bg-white/5"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" active={isActive('/login')}>Login</NavLink>
                <NavLink to="/register" active={isActive('/register')}>Register</NavLink>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar
