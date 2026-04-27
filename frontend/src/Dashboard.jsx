import React, { useState } from 'react';
import './Dashboard.css';
import EditProfile from './EditProfile';

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

    if (currentView === 'editProfile') {
        return (
            <EditProfile
                user={user}
                onCancel={() => setCurrentView('dashboard')}
                onSave={() => { /* Your existing save logic here */ }}
            />
        );
    }

    return (
        <div className="dashboard-wrapper">
            {/* Sidebar / Slider Bar */}
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

                    <button className="menu-item" onClick={() => alert("BMI coming soon!")}>
                        <span>⚖️</span> Calculate BMI
                    </button>

                    <button className="menu-item" onClick={() => alert("NMR coming soon!")}>
                        <span>🔥</span> Calculate NMR
                    </button>

                    <button className="menu-item" onClick={() => alert("New Recipe coming soon!")}>
                        <span>🍽️</span> New Recipe
                    </button>
                </div>

                <button className="menu-item logout" onClick={signOut}>
                    <span>🚪</span> Log Out
                </button>
            </div>

            {/* Main Dashboard Area */}
            <div className="dashboard-main">
                <div className="dashboard-header">
                    <button className="icon-button" onClick={toggleMenu}>☰</button>
                    <h2 className="dashboard-title">RECIFIT HUB</h2>
                    <div className="profile-icon">👤</div>
                </div>

                <div className="dashboard-content">
                    {/* Your Original Progress Wheel */}
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

                    {/* Row of Macros */}
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