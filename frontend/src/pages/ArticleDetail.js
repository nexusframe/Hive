// src/pages/ArticleDetail.js
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axiosInstance from '../api/axiosInstance'
import { toast } from 'react-toastify'
import AsyncButton from '../components/AsyncButton'

const ArticleDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useSelector((state) => state.auth.user)
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await axiosInstance.get(`/articles/${id}`)
        setArticle(response.data)
      } catch (err) {
        if (err.response?.status === 404) {
          setError('Article not found')
        } else {
          const errorMessage = err.response?.data?.error || 'Failed to load article'
          setError(errorMessage)
          toast.error(errorMessage, { autoClose: 5000 })
        }
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchArticle()
  }, [id])

  const formatDate = (dateString) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return dateString
    }
  }

  const canEditArticle = (article, user) => {
    if (!article || !user) return false
    const role = user?.claims?.role || user?.role
    const username = user?.username || user?.claims?.username
    return role === 'admin' || role === 'moderator' || username === article.author
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this article? This action cannot be undone.')) return
    setIsDeleting(true)
    try {
      await axiosInstance.delete(`/articles/${id}`)
      toast.success('Article deleted successfully', { autoClose: 2000 })
      navigate('/articles')
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error('Article not found', { autoClose: 5000 })
        navigate('/articles')
      } else {
        const errorMessage = err.response?.data?.error || 'Failed to delete article'
        toast.error(errorMessage, { autoClose: 5000 })
      }
    } finally {
      setIsDeleting(false)
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
        <button onClick={() => navigate('/articles')} className="btn-secondary">
          Back to Articles
        </button>
      </div>
    )
  }

  if (!article) return null

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back + actions */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/articles')}
          className="btn-ghost text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Articles
        </button>

        {canEditArticle(article, user) && (
          <div className="flex items-center gap-2">
            <Link to={`/articles/${id}/edit`} className="btn-secondary text-sm">
              Edit
            </Link>
            <AsyncButton
              onClick={handleDelete}
              initialLabel="Delete"
              loadingLabel="Deleting..."
              className="btn-danger text-sm"
            />
          </div>
        )}
      </div>

      {/* Article */}
      <article className="card p-8">
        <h1 className="text-3xl font-bold text-stone-900 mb-4 leading-tight">{article.title}</h1>

        <div className="flex flex-wrap items-center gap-3 text-sm text-stone-500 mb-8 pb-6 border-b border-stone-100">
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {article.author}
          </span>
          <span className="text-stone-300">|</span>
          <span>{formatDate(article.created_at)}</span>
          {article.updated_at && article.updated_at !== article.created_at && (
            <>
              <span className="text-stone-300">|</span>
              <span className="text-stone-400">Updated: {formatDate(article.updated_at)}</span>
            </>
          )}
        </div>

        <div className="text-stone-700 whitespace-pre-wrap leading-relaxed text-[1.05rem]">
          {article.content}
        </div>
      </article>
    </div>
  )
}

export default ArticleDetail
