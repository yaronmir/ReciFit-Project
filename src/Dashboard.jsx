import React from 'react';

const Dashboard = ({ user, signOut }) => {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>Welcome to ReciFit Dashboard! 🏋️‍♂️🥗</h1>
      <p>You have successfully logged in.</p>
      
      {/* user.signInDetails?.loginId gives the email used to login in Amplify gen 6 */}
      {user?.signInDetails?.loginId && (
        <p>Logged in as: <strong>{user.signInDetails.loginId}</strong></p>
      )}
      
      <button 
        onClick={signOut} 
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          backgroundColor: '#ff4d4f',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        Sign Out
      </button>
    </div>
  );
};

export default Dashboard;
