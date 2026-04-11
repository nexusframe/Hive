// src/components/ArticleForm.js
import React, { useState, useEffect } from 'react'
import AsyncButton from './AsyncButton'

const ArticleForm = ({ initialData, onSubmit, submitLabel, isLoading, onCancel }) => {
  const [title, setTitle] = useState(initialData?.title || '')
  const [content, setContent] = useState(initialData?.content || '')
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '')
      setContent(initialData.content || '')
    }
  }, [initialData])

  const validate = () => {
    const newErrors = {}
    if (!title.trim()) {
      newErrors.title = 'Title is required'
    } else if (title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters'
    } else if (title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters'
    }
    if (!content.trim()) {
      newErrors.content = 'Content is required'
    } else if (content.trim().length < 10) {
      newErrors.content = 'Content must be at least 10 characters'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!validate()) return
    try {
      await onSubmit(title.trim(), content.trim())
    } catch (error) {
      // Error handling is done by parent component
    }
  }

  const handleButtonClick = async (e) => {
    e.preventDefault()
    await handleSubmit(e)
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 max-w-3xl">
      <div className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-stone-700 mb-1.5">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (errors.title) setErrors({ ...errors, title: '' })
            }}
            className={`input-field ${errors.title ? 'border-red-400 focus:ring-red-500/30 focus:border-red-500' : ''}`}
            disabled={isLoading}
            maxLength={200}
            placeholder="Enter article title"
          />
          {errors.title && (
            <p className="text-red-500 text-sm mt-1.5">{errors.title}</p>
          )}
          <p className="text-stone-400 text-xs mt-1">{title.length}/200</p>
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-stone-700 mb-1.5">
            Content
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              if (errors.content) setErrors({ ...errors, content: '' })
            }}
            rows={14}
            className={`input-field resize-y min-h-[200px] ${errors.content ? 'border-red-400 focus:ring-red-500/30 focus:border-red-500' : ''}`}
            disabled={isLoading}
            placeholder="Write your article content..."
          />
          {errors.content && (
            <p className="text-red-500 text-sm mt-1.5">{errors.content}</p>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <AsyncButton
            type="button"
            initialLabel={submitLabel || 'Publish'}
            loadingLabel="Publishing..."
            onClick={handleButtonClick}
            className="btn-primary"
          />
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </form>
  )
}

export default ArticleForm
