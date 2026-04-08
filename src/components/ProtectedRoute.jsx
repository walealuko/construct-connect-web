import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthenticator } from "@aws-amplify/ui-react";

export default function PrivateRoute({ children, allowedRole }) {
  const { user } = useAuthenticator();

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  const role = user?.attributes?.["custom:role"];

  if (allowedRole && role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}
