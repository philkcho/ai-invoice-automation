import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignupPage from '@/app/(auth)/signup/page';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  );
});

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock api
const mockPost = jest.fn();
jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { post: (...args: unknown[]) => mockPost(...args) },
}));

describe('SignupPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders signup form with all required fields', () => {
    render(<SignupPage />);

    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Company Name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign Up' })).toBeInTheDocument();
  });

  it('renders page title', () => {
    render(<SignupPage />);

    expect(screen.getByText('Create Your Account')).toBeInTheDocument();
  });

  it('has link to login page', () => {
    render(<SignupPage />);

    const loginLink = screen.getByText('Sign in');
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('has logo link to landing page', () => {
    render(<SignupPage />);

    const logoLinks = screen.getAllByText('AI Invoice');
    expect(logoLinks.length).toBeGreaterThan(0);
    const link = logoLinks[0].closest('a');
    expect(link).toHaveAttribute('href', '/landing');
  });

  it('allows typing in all form fields', async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(screen.getByLabelText('Full Name'), 'John Doe');
    await user.type(screen.getByLabelText('Email'), 'john@example.com');
    await user.type(screen.getByLabelText('Password'), 'StrongPass1!');
    await user.type(screen.getByLabelText('Company Name'), 'Acme Corp');

    expect(screen.getByLabelText('Full Name')).toHaveValue('John Doe');
    expect(screen.getByLabelText('Email')).toHaveValue('john@example.com');
    expect(screen.getByLabelText('Password')).toHaveValue('StrongPass1!');
    expect(screen.getByLabelText('Company Name')).toHaveValue('Acme Corp');
  });

  it('calls register API on form submit', async () => {
    mockPost.mockResolvedValueOnce({ data: { message: 'ok' } });
    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(screen.getByLabelText('Full Name'), 'John Doe');
    await user.type(screen.getByLabelText('Email'), 'john@example.com');
    await user.type(screen.getByLabelText('Password'), 'StrongPass1!');
    await user.type(screen.getByLabelText('Company Name'), 'Acme Corp');
    await user.click(screen.getByRole('button', { name: 'Sign Up' }));

    expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/register', {
      email: 'john@example.com',
      password: 'StrongPass1!',
      full_name: 'John Doe',
      company_name: 'Acme Corp',
    });
  });

  it('redirects to verify-email page on success', async () => {
    mockPost.mockResolvedValueOnce({ data: { message: 'ok' } });
    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(screen.getByLabelText('Full Name'), 'John');
    await user.type(screen.getByLabelText('Email'), 'john@test.com');
    await user.type(screen.getByLabelText('Password'), 'Pass1234!');
    await user.type(screen.getByLabelText('Company Name'), 'Test');
    await user.click(screen.getByRole('button', { name: 'Sign Up' }));

    expect(mockPush).toHaveBeenCalledWith(
      `/verify-email?email=${encodeURIComponent('john@test.com')}`
    );
  });

  it('shows error message on signup failure', async () => {
    mockPost.mockRejectedValueOnce(new Error('Email already exists'));
    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(screen.getByLabelText('Full Name'), 'John');
    await user.type(screen.getByLabelText('Email'), 'john@test.com');
    await user.type(screen.getByLabelText('Password'), 'Pass1234!');
    await user.type(screen.getByLabelText('Company Name'), 'Test');
    await user.click(screen.getByRole('button', { name: 'Sign Up' }));

    expect(await screen.findByText('Email already exists')).toBeInTheDocument();
  });
});
