// src/pages/Profile.js
import React from 'react'
import { useSelector } from 'react-redux'

const Profile = () => {
  const userData = useSelector((state) => state.auth.user)

  if (!userData) {
    return (
      <div className="text-center py-16 text-stone-500">No user data available</div>
    )
  }

  const username = userData.username || userData.claims?.sub || 'N/A'
  const email = userData.claims?.email || 'N/A'
  const role = userData.claims?.role || 'regular'

  const roleColors = {
    admin: 'badge-admin',
    moderator: 'badge-moderator',
    regular: 'badge-regular',
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Profile</h1>

      <div className="card p-8">
        <div className="flex items-center gap-5 mb-8 pb-8 border-b border-stone-100">
          <div className="w-16 h-16 rounded-full bg-brand-100 border-2 border-brand-200 flex items-center justify-center">
            <span className="text-brand-700 text-2xl font-bold">
              {username[0].toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-stone-900">{username}</h2>
            <span className={roleColors[role] || 'badge-regular'}>{role}</span>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">
              Username
            </label>
            <div className="text-stone-800 font-medium">{username}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">
              Email
            </label>
            <div className="text-stone-800 font-medium">{email}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">
              Role
            </label>
            <div className="text-stone-800 font-medium capitalize">{role}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
