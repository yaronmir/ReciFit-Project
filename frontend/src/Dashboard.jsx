import React, { useState } from 'react';
import './Dashboard.css';
import EditProfile from './EditProfile';
import BMICalculator from './BMICalculator';
import BMRCalculator from './BMRCalculator';

const Dashboard = ({ user, signOut }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [currentView, setCurrentView] = useState('dashboard');

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const caloriesEaten = 0;
    const goalCalories = 2000;

    const macros = [
        { name: 'Protein', icon: '🥩', eaten: 0, goal: 150, unit: 'g' },
        { name: 'Carbs', icon: '🌾', eaten: 0, goal: 250, unit: 'g' },
        { name: 'Fats', icon: '🥑', eaten: 0, goal: 65, unit: 'g', cardClass: 'fats-card' }
    ];

    // בדיקת ניווט לפני הרינדור המרכזי
    if (currentView === 'editProfile') {
        return (
            <EditProfile
                user={user}
                onCancel={() => setCurrentView('dashboard')}
                onSave={async (updatedData) => {
                    try {
                        const userId = user?.userId || user?.signInDetails?.loginId;
                        const API_URL = "https://6to6ha1kul.execute-api.us-east-1.amazonaws.com/profile";
                        
                        const response = await fetch(API_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                userId: userId,
                                updates: updatedData
                            })
                        });
                        
                        if (response.ok) {
                            alert("Profile successfully updated on AWS DynamoDB!");
                            setCurrentView('dashboard');
                        } else {
                            const data = await response.json();
                            alert("Error saving profile: " + data.error);
                        }
                    } catch (error) {
                        console.error("Fetch error:", error);
                        alert("Failed to connect to the AWS server.");
                    }
                }}
            />
        );
    }

    if (currentView === 'BMICalculator') {
        return <BMICalculator onBack={() => setCurrentView('dashboard')} />;
    }

    if (currentView === 'BMRCalculator') {
        return <BMRCalculator onBack={() => setCurrentView('dashboard')} />;
    }

    // רינדור ה-Dashboard
    return (
        <div className="dashboard-wrapper">
            {/* Sidebar & Overlay */}
            <div className={`menu-overlay ${isMenuOpen ? 'open' : ''}`} onClick={toggleMenu}></div>
            <div className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
                <div className="menu-profile">
                    <p>Ready to crush it,</p>
                    <h3>{user?.signInDetails?.loginId || 'User'}!</h3>
                </div>

                <div className="sidebar-links">
                    <button className="menu-item" onClick={() => { setCurrentView('editProfile'); setIsMenuOpen(false); }}>
                        <span>✏️</span> Edit Profile
                    </button>
                    <button className="menu-item" onClick={() => { setCurrentView('BMICalculator'); setIsMenuOpen(false); }}>
                        <span>⚖️</span> Calculate BMI
                    </button>
                    <button className="menu-item" onClick={() => { setCurrentView('BMRCalculator'); setIsMenuOpen(false); }}>
                        <span>🔥</span> Calculate BMR
                    </button>
                    <button className="menu-item" onClick={() => alert("New Recipe coming soon!")}>
                        <span>🍽️</span> New Recipe
                    </button>

                    <button className="menu-item logout" onClick={signOut}>
                        <span>🚪</span> Log Out
                    </button>
                </div>
            </div>

            {/* Main Dashboard Area */}
            <div className="dashboard-main">
                <div className="dashboard-header">
                    <button className="icon-button" onClick={toggleMenu}>☰</button>
                    <h2 className="dashboard-title">RECIFIT HUB</h2>
                    <div className="profile-icon">👤</div>
                </div>

                <div className="dashboard-content">
                    {/* Progress Wheel */}
                    <div className="daily-progress-card">
                        <h3 className="progress-title">DAILY PROGRESS</h3>
                        <div className="progress-ring-container">
                            <div className="progress-ring-inner">
                                <span className="calories-number">{caloriesEaten}</span>
                                <span className="calories-label">kcal</span>
                            </div>
                        </div>
                        <div className="goal-badge">
                            <span>🎏</span> Goal: {goalCalories} kcal
                        </div>
                    </div>

                    <h3 className="section-title">Nutrition Breakdown</h3>

                    {/* Macros Row */}
                    <div className="macros-row">
                        {macros.map((macro, index) => (
                            <div className={`nutrition-card ${macro.cardClass || ''}`} key={index}>
                                <div className="icon-wrapper">{macro.icon}</div>
                                <div className="nutrition-info">
                                    <h4 className="nutrition-name">{macro.name}</h4>
                                    <p className="nutrition-goal">GOAL: {macro.goal}{macro.unit}</p>
                                </div>
                                <div className="nutrition-value">
                                    {macro.eaten} <span className="nutrition-unit">{macro.unit}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;