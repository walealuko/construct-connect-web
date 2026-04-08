import React from 'react';
import { Auth } from '@aws-amplify/auth';

const SignIn = () => {
  const signIn = async () => {
    try {
      const user = await Auth.signIn('yourusername', 'yourpassword');
      console.log('Signed in:', user);
    } catch (error) {
      console.log('Error signing in', error);
    }
  };

  return (
    <div>
      <h2>Sign In</h2>
      <button onClick={signIn}>Sign In</button>
    </div>
  );
};

export default SignIn;
