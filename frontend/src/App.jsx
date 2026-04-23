import React from 'react';

// Import AWS Amplify core library
import { Amplify } from 'aws-amplify';
// Import your configuration variables
import awsconfig from './aws-exports';

import LoginPage from './LoginPage';

// Configure Amplify globally
// This must happen at the root level of your application
Amplify.configure(awsconfig);

function App() {
  return (
    <div className="App">
      {/* 
        For now, the App simply renders the LoginPage component. 
        If you introduce a router (like react-router-dom) later, 
        you would set up your Routes inside here instead.
      */}
      <LoginPage />
    </div>
  );
}

export default App;
