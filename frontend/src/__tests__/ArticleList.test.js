import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ArticleList from '../components/ArticleList'

jest.mock('../api/axiosInstance', () => ({
  get: jest.fn(),
}))
import axiosInstance from '../api/axiosInstance'

jest.mock('react-toastify', () => ({
  toast: { error: jest.fn() },
}))

const mockArticles = [
  { article_id: '1', title: 'Article One', content: 'Content one', author: 'author1', created_at: '2025-01-01' },
  { article_id: '2', title: 'Article Two', content: 'Content two', author: 'author2', created_at: '2025-01-02' },
]

describe('ArticleList', () => {
  beforeEach(() => {
    axiosInstance.get.mockReset()
  })

  test('shows loading state then renders articles', async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: mockArticles })

    render(
      <MemoryRouter>
        <ArticleList />
      </MemoryRouter>
    )

    expect(screen.getByText('Loading articles...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Article One')).toBeInTheDocument()
      expect(screen.getByText('Article Two')).toBeInTheDocument()
    })
  })

  test('shows error state with retry button on API failure', async () => {
    axiosInstance.get.mockRejectedValueOnce({ response: { data: { error: 'Server error' } } })

    render(
      <MemoryRouter>
        <ArticleList />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
  })

  test('shows empty state when no articles', async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: [] })

    render(
      <MemoryRouter>
        <ArticleList />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('No articles found.')).toBeInTheDocument()
    })
  })

  test('pagination: next button fetches next page', async () => {
    // Page 1: full page (hasMore = true since length === limit would need 10 items)
    const fullPage = Array.from({ length: 10 }, (_, i) => ({
      article_id: String(i), title: `Article ${i}`, content: `Content ${i}`, author: 'a', created_at: '2025-01-01'
    }))
    axiosInstance.get.mockResolvedValueOnce({ data: fullPage })

    render(
      <MemoryRouter>
        <ArticleList />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Article 0')).toBeInTheDocument()
    })

    // Click next
    axiosInstance.get.mockResolvedValueOnce({ data: [{ article_id: '99', title: 'Page 2 Article', content: 'c', author: 'a', created_at: '2025-01-01' }] })
    fireEvent.click(screen.getByText('Next'))

    await waitFor(() => {
      expect(screen.getByText('Page 2 Article')).toBeInTheDocument()
      expect(screen.getByText('Page 2')).toBeInTheDocument()
    })
  })

  test('previous button is disabled on page 1', async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: mockArticles })

    render(
      <MemoryRouter>
        <ArticleList />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Article One')).toBeInTheDocument()
    })

    expect(screen.getByText('Previous')).toBeDisabled()
  })
})
