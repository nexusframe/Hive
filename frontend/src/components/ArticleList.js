// src/components/ArticleList.js
import React, { useState, useEffect } from 'react'
import axiosInstance from '../api/axiosInstance'
import { toast } from 'react-toastify'
import ArticleCard from './ArticleCard'

const ArticleList = () => {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const limit = 10

  const fetchArticles = async (page) => {
    setLoading(true)
    setError('')
    try {
      const response = await axiosInstance.get('/articles', {
        params: { page, limit }
      })
      const articlesData = Array.isArray(response.data) ? response.data : []
      setArticles(articlesData)
      setHasMore(articlesData.length === limit)
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to load articles'
      setError(errorMessage)
      toast.error(errorMessage, { autoClose: 5000 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchArticles(currentPage)
  }, [currentPage])

  const handlePrevious = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1)
  }

  const handleNext = () => {
    if (hasMore) setCurrentPage(currentPage + 1)
  }

  if (loading && articles.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 gap-3">
        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-stone-500 text-sm">Loading articles...</span>
      </div>
    )
  }

  if (error && articles.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-red-500 mb-4">{error}</div>
        <button onClick={() => fetchArticles(currentPage)} className="btn-primary">
          Retry
        </button>
      </div>
    )
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-16">
        <svg className="w-16 h-16 text-stone-300 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <p className="text-stone-500 text-lg">No articles found.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="space-y-1">
        {articles.map((article) => (
          <ArticleCard key={article.article_id} article={article} />
        ))}
      </div>

      {loading && articles.length > 0 && (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="flex items-center justify-between mt-8 pt-6 border-t border-stone-200">
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1 || loading}
          className="btn-secondary"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>

        <span className="text-sm text-stone-500 font-medium">Page {currentPage}</span>

        <button
          onClick={handleNext}
          disabled={!hasMore || loading}
          className="btn-secondary"
        >
          Next
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default ArticleList
