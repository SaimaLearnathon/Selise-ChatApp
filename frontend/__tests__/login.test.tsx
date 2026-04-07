import { render, screen } from '@testing-library/react';
import LoginPage from '../src/app/page';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../src/store/useAuthStore';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock useAuthStore
jest.mock('../src/store/useAuthStore');

describe('LoginPage', () => {
  it('renders the login form', () => {
    (useRouter as jest.jest.Mock).mockReturnValue({
      push: jest.fn(),
    });
    (useAuthStore as unknown as jest.jest.Mock).mockReturnValue(null);

    render(<LoginPage />);
    
    expect(screen.getByRole('heading', { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });
});
