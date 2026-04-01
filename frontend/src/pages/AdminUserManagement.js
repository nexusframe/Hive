import React, { useEffect, useState, useRef, useCallback } from 'react'
import axiosInstance from '../api/axiosInstance'
import { toast } from 'react-toastify'
import AsyncButton from '../components/AsyncButton'

const AdminUserManagement = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: 'regular',
    password: '',
  })

  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const pageSize = 5
  const observerRef = useRef(null)

  const fetchUsers = async (pageToLoad) => {
    setLoading(true)
    try {
      const response = await axiosInstance.get('/users', {
        params: { page: pageToLoad, size: pageSize },
      })
      const newUsers = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
        ? response.data
        : []
      setUsers((prev) => [...prev, ...newUsers])
      setHasMore(newUsers.length === pageSize)
    } catch (err) {
      setError('Failed to load users')
      toast.error('Failed to load users', { autoClose: 15000 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const lastUserRef = useCallback(
    (node) => {
      if (loading || !hasMore) return
      if (observerRef.current) observerRef.current.disconnect()
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const nextPage = page + 1
          setPage(nextPage)
          fetchUsers(nextPage)
        }
      })
      if (node) observerRef.current.observe(node)
    },
    [loading, hasMore, page]
  )

  const loadMore = () => {
    if (loading || !hasMore) return
    const nextPage = page + 1
    setPage(nextPage)
    fetchUsers(nextPage)
  }

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault()
    if (editingUser) {
      try {
        const updateData = { ...formData }
        if (!updateData.password || updateData.password.trim() === '') delete updateData.password
        const response = await axiosInstance.put(`/users/${editingUser._id}`, updateData)
        toast.success('User updated successfully', { autoClose: 2000 })
        if (response.data?.user) {
          setUsers((prev) =>
            prev.map((u) => (u._id === editingUser._id ? { ...response.data.user, _id: editingUser._id } : u))
          )
        } else {
          setUsers([])
          setPage(1)
          setHasMore(true)
          fetchUsers(1)
        }
        setEditingUser(null)
        setShowForm(false)
        setFormData({ username: '', email: '', role: 'regular', password: '' })
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to update user', { autoClose: false })
      }
    } else {
      try {
        await axiosInstance.post('/users', formData)
        toast.success('User created successfully', { autoClose: 2000 })
        setUsers([])
        setPage(1)
        setHasMore(true)
        setShowForm(false)
        setFormData({ username: '', email: '', role: 'regular', password: '' })
        fetchUsers(1)
      } catch (err) {
        toast.error('Failed to create user', { autoClose: 15000 })
      }
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await axiosInstance.delete(`/users/${userId}`)
        toast.success('User deleted successfully', { autoClose: 2000 })
        setUsers((prev) => prev.filter((u) => u._id !== userId))
      } catch (err) {
        toast.error('Failed to delete user', { autoClose: false })
      }
    }
  }

  const startEdit = (user) => {
    setEditingUser(user)
    setFormData({ username: user.username, email: user.email, role: user.role || 'regular', password: '' })
    setShowForm(true)
  }

  const roleColors = {
    admin: 'badge-admin',
    moderator: 'badge-moderator',
    regular: 'badge-regular',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-900">User Management</h1>
        {!showForm && (
          <button
            className="btn-primary"
            onClick={() => {
              setShowForm(true)
              setEditingUser(null)
              setFormData({ username: '', email: '', role: 'regular', password: '' })
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add User
          </button>
        )}
      </div>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {showForm && (
        <div className="card p-6 mb-6 max-w-lg">
          <h3 className="text-lg font-semibold text-stone-900 mb-4">
            {editingUser ? 'Edit User' : 'Create User'}
          </h3>
          <form onSubmit={handleCreateOrUpdate} autoComplete="off" className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-stone-700 mb-1.5">Username</label>
              <input id="username" type="text" name="username" value={formData.username} onChange={handleChange}
                className="input-field" required autoComplete="off" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1.5">Email</label>
              <input id="email" type="email" name="email" value={formData.email} onChange={handleChange}
                className="input-field" required autoComplete="off" />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-stone-700 mb-1.5">Role</label>
              <select id="role" name="role" value={formData.role} onChange={handleChange}
                className="input-field" autoComplete="off">
                <option value="admin">Admin</option>
                <option value="moderator">Moderator</option>
                <option value="regular">Regular</option>
              </select>
            </div>
            {!editingUser && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1.5">Password</label>
                <input id="password" type="password" name="password" value={formData.password} onChange={handleChange}
                  className="input-field" required autoComplete="new-password" />
              </div>
            )}
            <div className="flex items-center gap-3 pt-2">
              <AsyncButton
                type="submit"
                initialLabel={editingUser ? 'Update User' : 'Create User'}
                loadingLabel={editingUser ? 'Updating...' : 'Creating...'}
                className="btn-primary"
              />
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Username</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Role</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map((user, idx) => {
                const isLastRow = idx === users.length - 1
                return (
                  <tr key={user._id} data-testid="user-row" ref={isLastRow ? lastUserRef : null}
                    className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-stone-900">{user.username}</td>
                    <td className="px-4 py-3 text-sm text-stone-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={roleColors[user.role] || 'badge-regular'}>{user.role}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="btn-ghost text-xs" onClick={() => startEdit(user)}>Edit</button>
                        <button className="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                          onClick={() => handleDelete(user._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!hasMore && users.length > 0 && (
          <div className="text-center py-3 text-sm text-stone-400 border-t border-stone-100">All users loaded</div>
        )}
      </div>

      <button
        className="btn-secondary mt-4"
        onClick={loadMore}
        disabled={loading || !hasMore}
      >
        {loading ? 'Loading...' : hasMore ? 'Load More' : 'No More Users'}
      </button>
    </div>
  )
}

export default AdminUserManagement
