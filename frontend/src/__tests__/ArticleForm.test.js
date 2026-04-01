import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ArticleForm from '../components/ArticleForm'

describe('ArticleForm', () => {
  const mockSubmit = jest.fn()
  const mockCancel = jest.fn()

  beforeEach(() => {
    mockSubmit.mockReset()
    mockCancel.mockReset()
  })

  const renderForm = (props = {}) =>
    render(
      <ArticleForm
        onSubmit={mockSubmit}
        submitLabel="Create"
        onCancel={mockCancel}
        {...props}
      />
    )

  test('renders form with title and content fields', () => {
    renderForm()
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/content/i)).toBeInTheDocument()
    expect(screen.getByText('Create')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  test('populates fields from initialData', () => {
    renderForm({ initialData: { title: 'Existing Title', content: 'Existing content.' } })
    expect(screen.getByLabelText(/title/i)).toHaveValue('Existing Title')
    expect(screen.getByLabelText(/content/i)).toHaveValue('Existing content.')
  })

  test('shows validation error when title is empty', async () => {
    renderForm()
    fireEvent.change(screen.getByLabelText(/content/i), { target: { value: 'Some long enough content here.' } })
    fireEvent.click(screen.getByText('Create'))

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument()
    })
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  test('shows validation error when content is empty', async () => {
    renderForm()
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Valid Title' } })
    fireEvent.click(screen.getByText('Create'))

    await waitFor(() => {
      expect(screen.getByText('Content is required')).toBeInTheDocument()
    })
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  test('shows validation error for short title', async () => {
    renderForm()
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'AB' } })
    fireEvent.change(screen.getByLabelText(/content/i), { target: { value: 'Some long enough content here.' } })
    fireEvent.click(screen.getByText('Create'))

    await waitFor(() => {
      expect(screen.getByText('Title must be at least 3 characters')).toBeInTheDocument()
    })
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  test('calls onSubmit with trimmed values on valid submission', async () => {
    mockSubmit.mockResolvedValueOnce()
    renderForm()
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: '  Valid Title  ' } })
    fireEvent.change(screen.getByLabelText(/content/i), { target: { value: '  This is valid content for the form.  ' } })
    fireEvent.click(screen.getByText('Create'))

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith('Valid Title', 'This is valid content for the form.')
    })
  })

  test('calls onCancel when cancel button clicked', () => {
    renderForm()
    fireEvent.click(screen.getByText('Cancel'))
    expect(mockCancel).toHaveBeenCalled()
  })

  test('does not show cancel button when onCancel is not provided', () => {
    render(<ArticleForm onSubmit={mockSubmit} submitLabel="Submit" />)
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
  })
})
