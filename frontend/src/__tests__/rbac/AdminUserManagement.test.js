/**
 * @file AdminUserManagement.test.js
 *
 * Test suite for AdminUserManagement using React Testing Library
 * and axios-mock-adapter.
 */

import React from 'react'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import MockAdapter from 'axios-mock-adapter'
import axiosInstance from '../../api/axiosInstance'
import AdminUserManagement from '../../pages/AdminUserManagement'

// Mock IntersectionObserver to prevent errors in the test environment.
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.IntersectionObserver = MockIntersectionObserver

describe('AdminUserManagement Component', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(axiosInstance)
    // Always mock window.confirm to return true.
    window.confirm = jest.fn(() => true)
  })

  afterEach(() => {
    mock.restore()
  })

  test('fetches and displays the initial list of users (page 1)', async () => {
    // First GET returns two users.
    mock.onGet('/users').replyOnce(200, {
      data: [
        { _id: '1', username: 'user1', email: 'u1@example.com', role: 'admin' },
        { _id: '2', username: 'user2', email: 'u2@example.com', role: 'editor' },
      ],
    })

    render(<AdminUserManagement />)

    // Wait for the initial fetch
    expect(await screen.findByText('user1')).toBeInTheDocument()
    expect(screen.getByText('u2@example.com')).toBeInTheDocument()
  })

  test('manual "Load More" button loads next page', async () => {
    // Override IntersectionObserver with a no-op so that auto-loading is disabled.
    window.IntersectionObserver = class {
      constructor() {}
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  
    // First GET returns exactly 5 users.
    mock.onGet('/users').replyOnce(200, {
      data: [
        { _id: '1', username: 'user1', email: 'u1@example.com', role: 'admin' },
        { _id: '2', username: 'user2', email: 'u2@example.com', role: 'editor' },
        { _id: '3', username: 'user3', email: 'u3@example.com', role: 'user' },
        { _id: '4', username: 'user4', email: 'u4@example.com', role: 'user' },
        { _id: '5', username: 'user5', email: 'u5@example.com', role: 'user' },
      ],
    })
  
    // Second GET returns 1 additional user.
    mock.onGet('/users').replyOnce(200, {
      data: [{ _id: '6', username: 'user6', email: 'u6@example.com', role: 'user' }],
    })
  
    render(<AdminUserManagement />)
  
    // Wait for page 1 to load.
    expect(await screen.findByText('user1')).toBeInTheDocument()
  
    // "Load More" button should appear.
    const loadMoreBtn = screen.getByRole('button', { name: /load more/i })
    expect(loadMoreBtn).toBeEnabled()
  
    // Click "Load More" button.
    fireEvent.click(loadMoreBtn)
  
    // Wait for page 2 user to appear.
    expect(await screen.findByText('user6')).toBeInTheDocument()
  })
  
  

  test('creates a new user and re-fetches from page 1', async () => {
    // First GET: initial fetch returns empty.
    mock.onGet('/users').replyOnce(200, { data: [] })

    // POST to create user returns the new user.
    mock.onPost('/users').replyOnce(200, {
      _id: '99',
      username: 'newUser',
      email: 'new@example.com',
      role: 'user',
    })

    // Second GET: re-fetch page 1 returns the new user.
    mock.onGet('/users').replyOnce(200, {
      data: [{ _id: '99', username: 'newUser', email: 'new@example.com', role: 'user' }],
    })

    render(<AdminUserManagement />)

    // Wait for initial (empty) fetch.
    expect(await screen.findByText(/No More Users/i)).toBeInTheDocument()

    // Click "Create New User"
    fireEvent.click(screen.getByText(/add user/i))

    // Fill out the form.
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'newUser' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'user' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass123' } })

    // Submit the form.
    fireEvent.click(screen.getByRole('button', { name: /create user/i }))

    // Wait for re-fetch and new user to appear.
    expect(await screen.findByText('newUser')).toBeInTheDocument()
    expect(screen.getByText('new@example.com')).toBeInTheDocument()
  })

  test('edits an existing user (with list re-fetch)', async () => {
    // First GET returns the old user.
    mock.onGet('/users').replyOnce(200, {
      data: [{ _id: '1', username: 'oldName', email: 'old@example.com', role: 'admin' }],
    })

    // PUT to update user returns the updated user.
    mock.onPut('/users/1').replyOnce(200, {
      _id: '1',
      username: 'updatedName',
      email: 'updated@example.com',
      role: 'admin',
    })

    // Second GET returns the updated user.
    mock.onGet('/users').replyOnce(200, {
      data: [{ _id: '1', username: 'updatedName', email: 'updated@example.com', role: 'admin' }],
    })

    render(<AdminUserManagement />)

    // Wait for the old user to appear.
    expect(await screen.findByText('oldName')).toBeInTheDocument()

    // Click "Edit"
    fireEvent.click(screen.getByText(/edit/i))

    // Update form fields.
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'updatedName' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'updated@example.com' } })

    // Click "Update User"
    fireEvent.click(screen.getByRole('button', { name: /update user/i }))

    // Wait for the updated user to appear.
    expect(await screen.findByText('updatedName')).toBeInTheDocument()
    expect(screen.queryByText('oldName')).not.toBeInTheDocument()
  })

  test('deletes a user', async () => {
    // First GET returns the user "deleteMe".
    mock.onGet('/users').replyOnce(200, {
      data: [{ _id: '1', username: 'deleteMe', email: 'del@example.com', role: 'user' }],
    })

    // DELETE request returns success.
    mock.onDelete('/users/1').replyOnce(200)

    render(<AdminUserManagement />)

    // Wait for "deleteMe" to appear.
    expect(await screen.findByText('deleteMe')).toBeInTheDocument()

    // Find the row containing "deleteMe".
    const userRow = screen.getByText('deleteMe').closest('tr')
    expect(userRow).toBeInTheDocument()

    // Within that row, find the Delete button using an exact match.
    const deleteButton = within(userRow).getByRole('button', { name: /^delete$/i })
    expect(deleteButton).toBeInTheDocument()

    // Click the Delete button.
    fireEvent.click(deleteButton)

    // Wait for the row to disappear.
    await waitFor(() => {
      expect(screen.queryByText('deleteMe')).not.toBeInTheDocument()
    })
  })

  test('handles error on initial load', async () => {
    // GET returns an error.
    mock.onGet('/users').replyOnce(500)

    render(<AdminUserManagement />)
    expect(await screen.findByText(/failed to load users/i)).toBeInTheDocument()
  })
})
