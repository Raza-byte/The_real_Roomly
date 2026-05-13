import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import DashboardPage from '../pages/DashboardPage';
import { useAuth } from '../context/AuthContext';

// Mock the useAuth hook
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock Three.js components that won't work in JSDOM
vi.mock('../components/room/RoomCanvas', () => ({
  default: () => <div data-testid="room-canvas">Mocked Canvas</div>,
}));

// Mock API utility
vi.mock('../utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('User Story: Account Security', () => {
  it('should prevent access and show error for unauthorised users (invalid credentials)', async () => {
    const mockLogin = vi.fn().mockRejectedValue({
      response: { data: { message: 'Invalid credentials' } }
    });
    useAuth.mockReturnValue({ login: mockLogin });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    // Fill in credentials
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { value: 'wrong@user.com' } });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'wrongpassword' } });
    
    // Click login
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Assert that login was called
    expect(mockLogin).toHaveBeenCalled();

    // Assert error message is displayed
    const errorMessage = await screen.findByText(/Invalid credentials/i);
    expect(errorMessage).toBeInTheDocument();
  });
});

describe('User Story: Create Account', () => {
  it('should allow a user to create an account to save designs', async () => {
    const mockRegister = vi.fn().mockResolvedValue({ user: { name: 'New User' } });
    useAuth.mockReturnValue({ register: mockRegister });

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    // Fill in registration form
    fireEvent.change(screen.getByPlaceholderText(/John Doe/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Min. 6 characters/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'password123' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    // Wait for register to be called
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('Test User', 'test@example.com', 'password123');
    });
  });
});

describe('User Story: System Performance', () => {
  it('should respond quickly (render dashboard within threshold)', async () => {
    const api = (await import('../utils/api')).default;
    api.get.mockResolvedValue({ data: { rooms: [] } });

    useAuth.mockReturnValue({ 
      user: { name: 'Speedy' }, 
      loading: false 
    });

    const startTime = performance.now();
    
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Wait for component to settle to avoid 'act' warnings
    expect(await screen.findByText(/Speedy/i)).toBeInTheDocument();

    console.log(`Dashboard Render Duration: ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(100);
  });
});
