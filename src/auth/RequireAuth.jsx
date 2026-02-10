import { Navigate } from 'react-router-dom';

const RequireAuth = ({ children }) => {
  const isAuthenticated = true; // set false to test redirect

  if (!isAuthenticated) {
    return <Navigate to='/signin' replace />;
  }

  return children;
};

export default RequireAuth;
