import React from 'react';
// Import the Authenticator UI Component
import { Authenticator } from '@aws-amplify/ui-react';
// Import Amplify's default CSS for the Authenticator
import '@aws-amplify/ui-react/styles.css';

import Dashboard from './Dashboard';

const LoginPage = () => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f5f7fa' 
    }}>
      {/* 
        The Authenticator component provides a built-in login & registration UI.
        By setting loginMechanisms to 'email', we strictly ask for Email/Password.
      */}
      <Authenticator loginMechanisms={['email']}>
        {/*
          The children of <Authenticator> are only rendered when the user 
          is successfully authenticated. In this case, we render the Dashboard.
          The 'user' and 'signOut' props are automatically injected inside the function block.
        */}
        {({ signOut, user }) => (
          <Dashboard user={user} signOut={signOut} />
        )}
      </Authenticator>
    </div>
  );
};

export default LoginPage;
