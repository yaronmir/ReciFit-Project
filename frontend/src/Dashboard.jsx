import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import EditProfile from './EditProfile';
import BMICalculator from './BMICalculator';
import BMRCalculator from './BMRCalculator';
import FoodLog from './FoodLog';
import { API_URL } from './config';

// ─── BMR & Goal Calculation ────────────────────────────────────────────────
function calculateGoals(profile) {
    const weight = parseFloat(profile.weight);
    const height = parseFloat(profile.height);
    const age    = parseFloat(profile.age);
    const gender = profile.gender;
    const goal   = profile.fitnessGoal;

    // If any required field is missing, return zeros
    if (!weight || !height || !age || !gender) {
        return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    }

    // Mifflin-St Jeor BMR formula
    let bmr = 10 * weight + 6.25 * height - 5 * age;
    bmr += (gender === 'Male') ? 5 : -161;

    // Apply goal modifier
    let calorieGoal = bmr;
    if (goal === 'Lose Weight')   calorieGoal = bmr * 0.80;
    if (goal === 'Build Muscle')  calorieGoal = bmr * 1.20;

    calorieGoal = Math.round(calorieGoal);

    // Macro split: 30% protein, 45% carbs, 25% fats
    return {
        calories: calorieGoal,
        protein:  Math.round((calorieGoal * 0.30) / 4),
        carbs:    Math.round((calorieGoal * 0.45) / 4),
        fats:     Math.round((calorieGoal * 0.25) / 9),
    };
}
// ──────────────────────────────────────────────────────────────────────────

const Dashboard = ({ user, signOut }) => {
    const [isMenuOpen, setIsMenuOpen]     = useState(false);
    const [currentView, setCurrentView]   = useState('dashboard');
    const [profile, setProfile]           = useState(null);
    const [goals, setGoals]               = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });
    const [eaten, setEaten]               = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });
    const [isDarkMode, setIsDarkMode]     = useState(() => localStorage.getItem('recifit-dark') === 'true');

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const toggleDark = () => {
        setIsDarkMode(prev => {
            localStorage.setItem('recifit-dark', !prev);
            return !prev;
        });
    };

    // ── Fetch profile on mount ─────────────────────────────────────────────
    useEffect(() => {
        const fetchProfile = async () => {
            const userId = user?.userId || user?.username || user?.signInDetails?.loginId || user?.attributes?.sub;
            if (!userId) return;
            try {
                const res = await fetch(`${API_URL}/profile?userId=${encodeURIComponent(userId)}`);
                if (res.ok) {
                    const data = await res.json();
                    const p = data.user || {};
                    setProfile(p);
                    setGoals(calculateGoals(p));

                    // Restore today's eaten progress from DynamoDB
                    setEaten({
                        calories: parseFloat(p.DailyCalories) || 0,
                        protein:  parseFloat(p.DailyProtein)  || 0,
                        carbs:    parseFloat(p.DailyCarbs)    || 0,
                        fats:     parseFloat(p.DailyFats)     || 0,
                    });
                }
            } catch (e) {
                console.error('Failed to fetch profile:', e);
            }
        };
        fetchProfile();
    }, [user]);

    // ── Called by FoodLog when food is logged successfully ─────────────────
    const handleFoodLogged = (totals) => {
        setEaten(prev => ({
            calories: Math.round(prev.calories + totals.calories),
            protein:  Math.round(prev.protein  + totals.protein),
            carbs:    Math.round(prev.carbs    + totals.carbs),
            fats:     Math.round(prev.fats     + totals.fats),
        }));
    };

    const macros = [
        { name: 'Protein', icon: '🥩', eaten: eaten.protein, goal: goals.protein, unit: 'g' },
        { name: 'Carbs',   icon: '🌾', eaten: eaten.carbs,   goal: goals.carbs,   unit: 'g' },
        { name: 'Fats',    icon: '🥑', eaten: eaten.fats,    goal: goals.fats,    unit: 'g', cardClass: 'fats-card' }
    ];

    // ── Navigation views ───────────────────────────────────────────────────
    if (currentView === 'editProfile') {
        return (
            <EditProfile
                user={user}
                onCancel={() => setCurrentView('dashboard')}
                onSave={async (updatedData) => {
                    try {
                        const userId = user?.userId || user?.username || user?.signInDetails?.loginId || user?.attributes?.sub;
                        if (!userId) { alert('Security Error: Could not verify your User ID.'); return; }

                        const response = await fetch(`${API_URL}/profile`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId, updates: updatedData })
                        });

                        if (response.ok) {
                            // Recalculate goals immediately with the new profile data
                            setProfile(updatedData);
                            setGoals(calculateGoals(updatedData));
                            alert('Profile successfully updated!');
                            setCurrentView('dashboard');
                        } else {
                            const data = await response.json();
                            alert('Error saving profile: ' + data.error);
                        }
                    } catch (error) {
                        alert('Failed to connect to the server. Error: ' + error.message);
                    }
                }}
            />
        );
    }

    if (currentView === 'BMICalculator') return <BMICalculator onBack={() => setCurrentView('dashboard')} />;
    if (currentView === 'BMRCalculator') return <BMRCalculator onBack={() => setCurrentView('dashboard')} />;
    if (currentView === 'foodLog') {
        return <FoodLog user={user} onBack={() => setCurrentView('dashboard')} onFoodLogged={handleFoodLogged} />;
    }

    // ── Ring progress percentage ───────────────────────────────────────────
    const ringPercent = goals.calories > 0 ? Math.min((eaten.calories / goals.calories) * 100, 100) : 0;
    const ringDash = 2 * Math.PI * 54; // circumference for r=54
    const ringOffset = ringDash - (ringPercent / 100) * ringDash;

    return (
        <div className={`dashboard-wrapper${isDarkMode ? ' dark' : ''}`}>
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
                    <button className="menu-item" onClick={() => { setCurrentView('foodLog'); setIsMenuOpen(false); }}>
                        <span>🍎</span> Log Food (AI)
                    </button>
                    <button className="menu-item" onClick={() => alert('New Recipe coming soon!')}>
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
                    <button className="dark-mode-btn" onClick={toggleDark} title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                        {isDarkMode ? '☀️' : '🌙'}
                    </button>
                </div>

                <div className="dashboard-content">
                    {/* Progress Ring */}
                    <div className="daily-progress-card">
                        <h3 className="progress-title">DAILY PROGRESS</h3>
                        <div className="progress-ring-container">
                            {/* Animated SVG ring */}
                            <svg className="progress-svg" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="54" fill="none" stroke="#e9d8fd" strokeWidth="10"/>
                                <circle
                                    cx="60" cy="60" r="54" fill="none"
                                    stroke="url(#ringGrad)" strokeWidth="10"
                                    strokeLinecap="round"
                                    strokeDasharray={ringDash}
                                    strokeDashoffset={ringOffset}
                                    transform="rotate(-90 60 60)"
                                    style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                                />
                                <defs>
                                    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#7c3aed"/>
                                        <stop offset="100%" stopColor="#a78bfa"/>
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="progress-ring-inner">
                                <span className="calories-number">{eaten.calories}</span>
                                <span className="calories-label">kcal</span>
                            </div>
                        </div>
                        <div className="goal-badge">
                            <span>🎏</span> Goal: {goals.calories} kcal
                        </div>
                    </div>

                    <h3 className="section-title">Nutrition Breakdown</h3>

                    {/* Macros */}
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