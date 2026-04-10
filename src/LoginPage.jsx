import React from 'react';
import { Authenticator, ThemeProvider, defaultTheme, useAuthenticator, View, Heading } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import Dashboard from './Dashboard';
import saladBg from './assets/salad_bg.png';

const theme = {
    ...defaultTheme,
    tokens: {
        colors: {
            brand: {
                primary: {
                    10: '#e8f5e9',
                    60: '#4CAF50',
                    80: '#388E3C'
                }
            }
        }
    }
};

// By injecting the custom Header into the Authenticator directly,
// we ensure everything stays perfectly inside the native Amplify borders!
const components = {
    Header() {
        return (
            <View textAlign="center" padding="30px 0 10px 0">
                <Heading level={3} color="#333" fontWeight="bold">
                    Welcome Back
                </Heading>
            </View>
        );
    }
};

const MainView = () => {
    const { authStatus, user, signOut } = useAuthenticator((context) => [context.authStatus, context.user]);

    // Dashboard renders purely independently with NO green background and full screen stretch
    if (authStatus === 'authenticated') {
        return <Dashboard user={user} signOut={signOut} />;
    }

    // Login Screen handles the salad background
    return (
        <div style={{
            position: 'relative',
            minHeight: '100vh',
            width: '100vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: `url(${saladBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            fontFamily: 'Arial, sans-serif'
        }}>
            <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                zIndex: 0
            }} />

            <div style={{
                zIndex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
                padding: '20px'
            }}>
                <h1 style={{ 
                    fontSize: '60px', 
                    color: 'white', 
                    marginBottom: '10px',
                    textShadow: '0 4px 10px rgba(0,0,0,0.5)'
                }}>
                    ReciFit
                </h1>
                
                <p style={{ 
                    color: '#f0f0f0', 
                    fontSize: '18px', 
                    marginBottom: '40px',
                    textShadow: '0 2px 5px rgba(0,0,0,0.5)',
                    textAlign: 'center'
                }}>
                    Personalized recipes and nutrition plans tailored to your fitness goals.
                </p>

                {/* Removing the custom white padding wrapper and letting Authenticator render its native card perfectly */}
                <div style={{ width: '100%', maxWidth: '500px', borderRadius: '15px', overflow: 'hidden', boxShadow: '0px 20px 40px rgba(0,0,0,0.4)', backgroundColor: 'white' }}>
                    <Authenticator
                        components={components}
                        loginMechanisms={['email']}
                    />
                </div>
            </div>
        </div>
    );
};

const LoginPage = () => {
    return (
        <ThemeProvider theme={theme}>
            <Authenticator.Provider>
                <MainView />
            </Authenticator.Provider>
        </ThemeProvider>
    );
};

export default LoginPage;