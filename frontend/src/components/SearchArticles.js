// src/components/SearchArticles.js
import React, { useState, useEffect, useRef } from 'react'
import axiosInstance from '../api/axiosInstance'
import { toast } from 'react-toastify'
import ArticleCard from './ArticleCard'

const SearchArticles = () => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const abortControllerRef = useRef(null)

  const performSearch = async (searchQuery) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setLoading(true)
    setError('')

    try {
      const response = await axiosInstance.get('/articles/search', {
        params: { query: searchQuery },
        signal: abortControllerRef.current.signal
      })
      const articlesData = Array.isArray(response.data) ? response.data : []
      setResults(articlesData)
      if (articlesData.length === 0 && searchQuery.trim()) {
        setError('No articles found matching your search.')
      }
    } catch (err) {
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return
      const errorMessage = err.response?.data?.error || 'Failed to search articles'
      setError(errorMessage)
      toast.error(errorMessage, { autoClose: 5000 })
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setError('')
      setLoading(false)
      if (abortControllerRef.current) abortControllerRef.current.abort()
      return
    }
    const timer = setTimeout(() => {
      performSearch(query.trim())
    }, 300)

    return () => {
      clearTimeout(timer)
      if (abortControllerRef.current) abortControllerRef.current.abort()
    }
  }, [query])

  return (
    <div className="w-full">
      <div className="relative mb-8">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles by title or content..."
          className="input-field pl-12 text-lg"
          autoFocus
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {error && !loading && (
        <div className="text-center py-12 text-stone-500">{error}</div>
      )}

      {!loading && !error && query.trim() && results.length === 0 && (
        <div className="text-center py-12 text-stone-500">
          No articles found matching "<span className="font-medium text-stone-700">{query}</span>"
        </div>
      )}

      {!loading && results.length > 0 && (
        <div>
          <p className="text-sm text-stone-500 mb-4">
            Found {results.length} {results.length === 1 ? 'article' : 'articles'}
          </p>
          <div className="space-y-1">
            {results.map((article) => (
              <ArticleCard key={article.article_id || article._id} article={article} />
            ))}
          </div>
        </div>
      )}

      {!query.trim() && (
        <div className="text-center py-16">
          <svg className="w-16 h-16 text-stone-300 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p className="text-stone-400">Enter a search query to find articles</p>
        </div>
      )}
    </div>
  )
}

export default SearchArticles
