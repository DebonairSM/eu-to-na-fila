import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import { useAuthContext } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/utils';

// Demo credentials - In production, use real username/password authentication
const CREDENTIALS = {
  owner: { username: 'owner', password: 'owner123', pin: '1234' },
  barber: { username: 'barber', password: 'barber123', pin: '0000' },
  kiosk: { username: 'kiosk', password: 'kiosk123', pin: '0000' },
};

export function useLoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuthContext();
  
  // Use ref to track if request is in flight to prevent double submissions
  // This is more reliable than just isLoading state, especially with React StrictMode
  const isSubmittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmittingRef.current || isLoading) {
      return;
    }
    
    setError(null);
    setIsLoading(true);
    isSubmittingRef.current = true;

    try {
      // Check credentials and get corresponding PIN
      let pin: string | null = null;
      let role: 'owner' | 'barber' = 'barber';
      let redirectTo = '/manage';
      let isKiosk = false;

      if (username === CREDENTIALS.owner.username && password === CREDENTIALS.owner.password) {
        pin = CREDENTIALS.owner.pin;
        role = 'owner';
        redirectTo = '/owner';
      } else if (username === CREDENTIALS.barber.username && password === CREDENTIALS.barber.password) {
        pin = CREDENTIALS.barber.pin;
        role = 'barber';
        redirectTo = '/manage';
      } else if (username === CREDENTIALS.kiosk.username && password === CREDENTIALS.kiosk.password) {
        pin = CREDENTIALS.kiosk.pin;
        role = 'barber'; // Kiosk uses staff-level access
        redirectTo = '/manage?kiosk=true';
        isKiosk = true;
      } else {
        setError('Credenciais inválidas. Verifique usuário e senha.');
        setIsLoading(false);
        isSubmittingRef.current = false;
        return;
      }

      // Authenticate with API
      const result = await api.authenticate(config.slug, pin);

      if (result.valid && result.token) {
        // Login successful - token is stored in API client
        login({
          id: 1,
          username: username,
          role: isKiosk ? 'barber' : role,
          name: username,
        });

        navigate(redirectTo);
      } else {
        setError('Erro de autenticação. Tente novamente.');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao fazer login. Tente novamente.'));
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return {
    username,
    setUsername,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    isLoading,
    error,
    handleSubmit,
  };
}
