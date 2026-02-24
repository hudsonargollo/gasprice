import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState, AppDispatch } from '../store';
import { clearAuth } from '../store/slices/authSlice';
import LoadingScreen from './LoadingScreen';

/**
 * Higher-order component that protects routes requiring authentication
 */
const AuthGuard = <P extends object>(
  WrappedComponent: React.ComponentType<P>
): React.FC<P> => {
  const AuthenticatedComponent: React.FC<P> = (props) => {
    const navigation = useNavigation();
    const dispatch = useDispatch<AppDispatch>();
    const { isAuthenticated, loading, token } = useSelector(
      (state: RootState) => state.auth
    );

    useEffect(() => {
      // If not authenticated and not loading, redirect to login
      if (!isAuthenticated && !loading) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' as never }],
        });
        return;
      }

      // If no token but marked as authenticated, clear auth state
      if (isAuthenticated && !token) {
        dispatch(clearAuth());
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' as never }],
        });
        return;
      }
    }, [isAuthenticated, loading, token, navigation, dispatch]);

    // Show loading screen while checking authentication
    if (loading) {
      return <LoadingScreen message="Checking authentication..." />;
    }

    // Show loading screen if not authenticated (will redirect)
    if (!isAuthenticated) {
      return <LoadingScreen message="Redirecting to login..." />;
    }

    // Render the protected component
    return <WrappedComponent {...props} />;
  };

  return AuthenticatedComponent;
};

export default AuthGuard;