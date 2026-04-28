import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUnauthorizedNavigator } from '@/lib/api/authRedirect';

export function UnauthorizedNavigatorBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    registerUnauthorizedNavigator(() => {
      navigate('/auth/login', { replace: true });
    });
    return () => registerUnauthorizedNavigator(null);
  }, [navigate]);

  return null;
}
