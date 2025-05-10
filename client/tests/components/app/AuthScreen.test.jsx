import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AuthScreen from 'src/components/app/AuthScreen';

describe('AuthScreen', () => {
  it('renders login form and Google button', () => {
    render(<AuthScreen onLogin={jest.fn()} onRegister={jest.fn()} />);
    expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
    expect(screen.getByText(/Continue with Google/i)).toBeInTheDocument();
  });

  it('calls onLogin when login form is submitted', () => {
    const onLogin = jest.fn(() => true);
    render(<AuthScreen onLogin={onLogin} onRegister={jest.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'testpass' } });
    fireEvent.click(screen.getByRole('button', { name: /^Sign In$/i }));
    expect(onLogin).toHaveBeenCalled();
  });
});
