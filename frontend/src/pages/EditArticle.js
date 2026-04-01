// src/pages/EditArticle.js
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axiosInstance from '../api/axiosInstance'
import { toast } from 'react-toastify'
import ArticleForm from '../components/ArticleForm'

const EditArticle = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useSelector((state) => state.auth.user)
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await axiosInstance.get(`/articles/${id}`)
        setArticle(response.data)
        const role = user?.claims?.role || user?.role
        const username = user?.username || user?.claims?.username
        const canEdit = role === 'admin' || role === 'moderator' || username === response.data.author
        if (!canEdit) {
          toast.error('You do not have permission to edit this article', { autoClose: 3000 })
          navigate(`/articles/${id}`)
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setError('Article not found')
        } else {
          setError(err.response?.data?.error || 'Failed to load article')
          toast.error(err.response?.data?.error || 'Failed to load article', { autoClose: 5000 })
        }
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchArticle()
  }, [id, user, navigate])

  const handleSubmit = async (title, content) => {
    setIsSubmitting(true)
    try {
      await axiosInstance.put(`/articles/${id}`, { title, content })
      toast.success('Article updated successfully', { autoClose: 2000 })
      navigate(`/articles/${id}`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update article', { autoClose: 5000 })
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center py-16 gap-3">
        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-stone-500 text-sm">Loading article...</span>
      </div>
    )
  }

  if (error && !article) {
    return (
      <div className="text-center py-16">
        <div className="text-red-500 text-lg mb-4">{error}</div>
        <button onClick={() => navigate('/articles')} className="btn-secondary">Back to Articles</button>
      </div>
    )
  }

  if (!article) return null

  const role = user?.claims?.role || user?.role
  const username = user?.username || user?.claims?.username
  if (!(role === 'admin' || role === 'moderator' || username === article.author)) return null

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Edit Article</h1>
      <ArticleForm
        initialData={{ title: article.title, content: article.content }}
        onSubmit={handleSubmit}
        submitLabel="Update Article"
        isLoading={isSubmitting}
        onCancel={() => navigate(`/articles/${id}`)}
      />
    </div>
  )
}

export default EditArticle
