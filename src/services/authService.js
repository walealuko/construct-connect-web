// src/services/authService.js
import { 
  signIn as amplifySignIn,
  signUp as amplifySignUp,
  signOut as amplifySignOut,
  confirmSignUp as amplifyConfirmSignUp,
  resetPassword as amplifyResetPassword,
  getCurrentUser
} from "@aws-amplify/auth";

/**
 * Sign up a new user
 */
export const signUp = async (username, password, attributes = {}) => {
  try {
    const result = await amplifySignUp({ username, password, attributes });
    return result;
  } catch (error) {
    console.error("Sign up error: - authService.js:19", error);
    throw error;
  }
};

/**
 * Confirm sign up with code
 */
export const confirmSignUp = async (username, code) => {
  try {
    return await amplifyConfirmSignUp(username, code);
  } catch (error) {
    console.error("Confirm sign up error: - authService.js:31", error);
    throw error;
  }
};

/**
 * Sign in user
 */
export const signIn = async (username, password) => {
  try {
    return await amplifySignIn(username, password);
  } catch (error) {
    console.error("Sign in error: - authService.js:43", error);
    throw error;
  }
};

/**
 * Sign out user
 */
export const signOut = async () => {
  try {
    await amplifySignOut();
  } catch (error) {
    console.error("Sign out error: - authService.js:55", error);
    throw error;
  }
};

/**
 * Forgot password / reset password
 * Use same function for initiating and submitting
 */
export const resetPassword = async ({ username, code, newPassword }) => {
  try {
    return await amplifyResetPassword({ username, code, newPassword });
  } catch (error) {
    console.error("Reset password error: - authService.js:68", error);
    throw error;
  }
};

/**
 * Get current logged in user info
 */
export const getUser = async () => {
  try {
    return await getCurrentUser();
  } catch (error) {
    console.error("Get current user error: - authService.js:80", error);
    return null;
  }
};
