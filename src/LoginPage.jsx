import React from 'react';
import { Authenticator, ThemeProvider, defaultTheme } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import Dashboard from './Dashboard';

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

const LoginPage = () => {
    return (
        <ThemeProvider theme={theme}>
            <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>

                {/* LEFT SIDE - BRANDING */}
                <div
                    style={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #4CAF50, #81C784)',
                        color: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        padding: '60px'
                    }}
                >
                    <h1 style={{ fontSize: '60px', marginBottom: '3 0px' }}>
                        ReciFit
                    </h1>

                    <p style={{ fontSize: '18px', marginBottom: '30px', maxWidth: '400px' }}>
                        Personalized recipes and nutrition plans tailored to your fitness goals.
                    </p>

                    <ul style={{ lineHeight: '1.8', fontSize: '16px' }}>
                        <li>🥗 AI-generated healthy recipes</li>
                        <li>💪 Built around your goals</li>
                        <li>📊 Smart nutrition tracking</li>
                    </ul>
                </div>

                {/* RIGHT SIDE - LOGIN */}
                <div
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f9fafb'
                    }}
                >
                    <div style={{ width: '600px' }}>

                        <h2 style={{ marginBottom: '30px', color: '#333333' }}>Welcome Back</h2>

                        <Authenticator
                            loginMechanisms={['email']}
                            formFields={{
                                signIn: {
                                    username: {
                                        label: 'Email',
                                        placeholder: 'Enter your email'
                                    },
                                    password: {
                                        label: 'Password',
                                        placeholder: 'Enter your password'
                                    }
                                }
                            }}
                        >
                            {({ signOut, user }) => (
                                <Dashboard user={user} signOut={signOut} />
                            )}
                        </Authenticator>

                    </div>
                </div>

            </div>
        </ThemeProvider>
    );
};

export default LoginPage;