import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ArticleCard from '../components/ArticleCard'

describe('ArticleCard', () => {
  const article = {
    article_id: '123',
    title: 'Test Article Title',
    content: 'This is the full content of the article that should be truncated if it exceeds the max length limit.',
    author: 'testauthor',
    created_at: '2025-03-01T12:00:00Z',
  }

  const renderCard = (props = {}) =>
    render(
      <MemoryRouter>
        <ArticleCard article={{ ...article, ...props }} />
      </MemoryRouter>
    )

  test('renders title, author, and truncated content', () => {
    renderCard()
    expect(screen.getByText('Test Article Title')).toBeInTheDocument()
    expect(screen.getByText('testauthor')).toBeInTheDocument()
    expect(screen.getByText(/Mar 1, 2025/)).toBeInTheDocument()
  })

  test('links to article detail page', () => {
    renderCard()
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/articles/123')
  })

  test('truncates long content with ellipsis', () => {
    const longContent = 'A'.repeat(200)
    renderCard({ content: longContent })
    const displayed = screen.getByText(/A+\.\.\./)
    expect(displayed).toBeInTheDocument()
  })

  test('handles missing content gracefully', () => {
    renderCard({ content: null })
    // Should not crash, title still visible
    expect(screen.getByText('Test Article Title')).toBeInTheDocument()
  })

  test('handles missing date gracefully', () => {
    renderCard({ created_at: null })
    expect(screen.getByText('Test Article Title')).toBeInTheDocument()
  })
})
