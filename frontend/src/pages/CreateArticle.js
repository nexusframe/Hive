// src/pages/CreateArticle.js
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axiosInstance from '../api/axiosInstance'
import { toast } from 'react-toastify'
import ArticleForm from '../components/ArticleForm'

const CreateArticle = () => {
  const navigate = useNavigate()
  const user = useSelector((state) => state.auth.user)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const role = user?.claims?.role || user?.role
    if (role !== 'admin' && role !== 'moderator') {
      toast.error('You do not have permission to create articles', { autoClose: 3000 })
      navigate('/articles')
    }
  }, [user, navigate])

  const handleSubmit = async (title, content) => {
    setIsLoading(true)
    try {
      const response = await axiosInstance.post('/articles', { title, content })
      toast.success('Article created successfully', { autoClose: 2000 })
      navigate(response.data.article_id ? `/articles/${response.data.article_id}` : '/articles')
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error('You do not have permission to create articles', { autoClose: 5000 })
        navigate('/articles')
      } else {
        toast.error(err.response?.data?.error || 'Failed to create article', { autoClose: 5000 })
      }
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const role = user?.claims?.role || user?.role
  if (role !== 'admin' && role !== 'moderator') return null

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Create Article</h1>
      <ArticleForm
        onSubmit={handleSubmit}
        submitLabel="Publish Article"
        isLoading={isLoading}
        onCancel={() => navigate('/articles')}
      />
    </div>
  )
}

export default CreateArticle
