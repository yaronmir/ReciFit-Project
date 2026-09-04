import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import EditProfile from './EditProfile';
import FoodLog from './FoodLog';
import RecipeChat from './RecipeChat';
import Cookbook from './Cookbook';
import { API_URL } from './config';

// ─── BMR & Goal Calculation ────────────────────────────────────────────────
function calculateGoals(profile) {
    const weight = parseFloat(profile.weight);
    const height = parseFloat(profile.height);
    const age = parseFloat(profile.age);
    const gender = profile.gender;
    const goal = profile.fitnessGoal;

    // If any required field is missing and there is no custom goal, return zeros
    if (!profile.customCalorieGoal && !profile.customProteinGoal && (!weight || !height || !age || !gender)) {
        return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    }

    let calorieGoal = 0;

    if (profile.customCalorieGoal) {
        calorieGoal = parseInt(profile.customCalorieGoal, 10);
    } else {
        // Mifflin-St Jeor BMR formula
        let bmr = 10 * weight + 6.25 * height - 5 * age;
        bmr += (gender === 'Male') ? 5 : -161;

        // Apply goal modifier
        calorieGoal = bmr;
        if (goal === 'Lose Weight') calorieGoal = bmr * 0.80;
        if (goal === 'Build Muscle') calorieGoal = bmr * 1.20;

        calorieGoal = Math.round(calorieGoal);
    }

    // Macro split: check for custom macros first, else 30% protein, 45% carbs, 25% fats
    const protein = profile.customProteinGoal ? parseInt(profile.customProteinGoal, 10) : Math.round((calorieGoal * 0.30) / 4);
    const carbs = profile.customCarbsGoal ? parseInt(profile.customCarbsGoal, 10) : Math.round((calorieGoal * 0.45) / 4);
    const fats = profile.customFatsGoal ? parseInt(profile.customFatsGoal, 10) : Math.round((calorieGoal * 0.25) / 9);

    return {
        calories: calorieGoal,
        protein: protein,
        carbs: carbs,
        fats: fats,
    };
}
// ──────────────────────────────────────────────────────────────────────────

const Dashboard = ({ user, signOut }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [currentView, setCurrentView] = useState('dashboard');
    const [profile, setProfile] = useState(null);
    const [goals, setGoals] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });
    const [eaten, setEaten] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('recifit-dark') === 'true');
    const [showBmiModal, setShowBmiModal] = useState(false);
    const [showBmrModal, setShowBmrModal] = useState(false);
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [customGoalInput, setCustomGoalInput] = useState('');
    const [editingMacro, setEditingMacro] = useState(null);
    const [customMacroInput, setCustomMacroInput] = useState('');

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const toggleDark = () => {
        setIsDarkMode(prev => {
            localStorage.setItem('recifit-dark', !prev);
            return !prev;
        });
    };

    const handleSaveCustomMacro = async () => {
        if (!editingMacro) return;
        try {
            const userId = user?.userId || user?.username || user?.signInDetails?.loginId || user?.attributes?.sub;
            if (!userId) return;

            const fieldName = `custom${editingMacro}Goal`;
            const updates = {
                [fieldName]: customMacroInput.toString().trim() === '' ? '' : parseInt(customMacroInput, 10),
            };

            const response = await fetch(`${API_URL}/profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, updates })
            });

            if (response.ok) {
                const updatedProfile = { ...profile, ...updates };
                setProfile(updatedProfile);
                setGoals(calculateGoals(updatedProfile));
                setEditingMacro(null);
            }
        } catch (error) {
            console.error('Failed to update custom macro:', error);
        }
    };

    const handleSaveCustomGoal = async () => {
        const newGoal = customGoalInput.toString().trim() === '' ? '' : parseInt(customGoalInput, 10);
        if (newGoal !== '' && (isNaN(newGoal) || newGoal <= 0)) return;

        try {
            const userId = user?.userId || user?.username || user?.signInDetails?.loginId || user?.attributes?.sub;
            if (!userId) return;

            const updates = { customCalorieGoal: newGoal };
            const response = await fetch(`${API_URL}/profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, updates })
            });

            if (response.ok) {
                const updatedProfile = { ...profile, ...updates };
                setProfile(updatedProfile);
                setGoals(calculateGoals(updatedProfile));
                setIsEditingGoal(false);
            }
        } catch (error) {
            console.error('Failed to update custom goal:', error);
        }
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

                    // Daily reset: check if the last log was today (UTC)
                    const today = new Date().toISOString().split('T')[0]; // "2026-05-19"
                    const lastLogDate = p.LastLogDate || '';
                    const isToday = lastLogDate === today;

                    // Only restore progress if it was logged today — otherwise reset to 0
                    setEaten({
                        calories: isToday ? Math.round(parseFloat(p.DailyCalories) || 0) : 0,
                        protein: isToday ? Math.round(parseFloat(p.DailyProtein) || 0) : 0,
                        carbs: isToday ? Math.round(parseFloat(p.DailyCarbs) || 0) : 0,
                        fats: isToday ? Math.round(parseFloat(p.DailyFats) || 0) : 0,
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
            protein: Math.round(prev.protein + totals.protein),
            carbs: Math.round(prev.carbs + totals.carbs),
            fats: Math.round(prev.fats + totals.fats),
        }));
    };

    const macros = [
        { name: 'Protein', icon: '🥩', eaten: Math.round(eaten.protein), goal: goals.protein, unit: 'g' },
        { name: 'Carbs', icon: '🌾', eaten: Math.round(eaten.carbs), goal: goals.carbs, unit: 'g' },
        { name: 'Fats', icon: '🥑', eaten: Math.round(eaten.fats), goal: goals.fats, unit: 'g', cardClass: 'fats-card' }
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
                        if (!userId) { console.error('Security Error: Could not verify your User ID.'); return; }

                        const response = await fetch(`${API_URL}/profile`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId, updates: updatedData })
                        });

                        if (response.ok) {
                            // Recalculate goals immediately with the new profile data
                            setProfile(updatedData);
                            setGoals(calculateGoals(updatedData));
                            setCurrentView('dashboard');
                        } else {
                            const data = await response.json();
                            console.error('Error saving profile: ' + data.error);
                        }
                    } catch (error) {
                        console.error('Failed to connect to the server. Error: ' + error.message);
                    }
                }}
            />
        );
    }

    if (currentView === 'foodLog') {
        return <FoodLog user={user} onBack={() => setCurrentView('dashboard')} onFoodLogged={handleFoodLogged} />;
    }

    const remainingMacros = {
        calories: Math.max(0, goals.calories - eaten.calories),
        protein: Math.max(0, goals.protein - eaten.protein),
        carbs: Math.max(0, goals.carbs - eaten.carbs),
        fats: Math.max(0, goals.fats - eaten.fats)
    };

    if (currentView === 'recipeChat') {
        return <RecipeChat user={user} remainingMacros={remainingMacros} onBack={() => setCurrentView('dashboard')} />;
    }

    if (currentView === 'cookbook') {
        return <Cookbook user={user} onBack={() => setCurrentView('dashboard')} onFoodLogged={handleFoodLogged} />;
    }

    // ── Ring progress percentage ───────────────────────────────────────────
    const ringPercent = goals.calories > 0 ? Math.min((eaten.calories / goals.calories) * 100, 100) : 0;
    const ringDash = 2 * Math.PI * 54; // circumference for r=54
    const ringOffset = ringDash - (ringPercent / 100) * ringDash;

    const renderBmiModal = () => {
        if (!showBmiModal) return null;

        const weight = parseFloat(profile?.weight);
        const height = parseFloat(profile?.height);

        const hasData = weight && height;
        let bmi = 0;
        let category = '';

        if (hasData) {
            const heightInMeters = height / 100;
            bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);
            if (bmi < 18.5) category = 'Underweight';
            else if (bmi < 25) category = 'Healthy Weight';
            else if (bmi < 30) category = 'Overweight';
            else category = 'Obese';
        }

        return (
            <div className="dashboard-modal-overlay" onClick={() => setShowBmiModal(false)}>
                <div className="dashboard-modal-content" onClick={e => e.stopPropagation()}>
                    <button className="dashboard-modal-close" onClick={() => setShowBmiModal(false)}>×</button>
                    <h2 className="dashboard-modal-title">Your BMI</h2>

                    {hasData ? (
                        <>
                            <div className="dashboard-modal-result">
                                <p className="dashboard-modal-desc">Body Mass Index</p>
                                <div className="dashboard-modal-value">{bmi}</div>
                                <p className="dashboard-modal-desc">Category: <strong>{category}</strong></p>
                            </div>
                            <button className="dashboard-modal-action" onClick={() => setShowBmiModal(false)}>Awesome!</button>
                        </>
                    ) : (
                        <>
                            <div className="dashboard-modal-result">
                                <p className="dashboard-modal-desc">We don't have enough data to calculate your BMI.</p>
                            </div>
                            <button className="dashboard-modal-action" onClick={() => { setShowBmiModal(false); setCurrentView('editProfile'); }}>
                                Edit Profile
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    };

    const renderBmrModal = () => {
        if (!showBmrModal) return null;

        const weight = parseFloat(profile?.weight);
        const height = parseFloat(profile?.height);
        const age = parseFloat(profile?.age);
        const gender = profile?.gender;

        const hasData = weight && height && age && gender;
        let bmr = 0;

        if (hasData) {
            bmr = 10 * weight + 6.25 * height - 5 * age;
            bmr += (gender === 'Male') ? 5 : -161;
            bmr = Math.round(bmr);
        }

        return (
            <div className="dashboard-modal-overlay" onClick={() => setShowBmrModal(false)}>
                <div className="dashboard-modal-content" onClick={e => e.stopPropagation()}>
                    <button className="dashboard-modal-close" onClick={() => setShowBmrModal(false)}>×</button>
                    <h2 className="dashboard-modal-title">Your BMR</h2>

                    {hasData ? (
                        <>
                            <div className="dashboard-modal-result">
                                <p className="dashboard-modal-desc">Basal Metabolic Rate</p>
                                <div className="dashboard-modal-value">{bmr} <span style={{ fontSize: '20px' }}>kcal</span></div>
                                <p className="dashboard-modal-desc">Daily resting calories</p>
                            </div>
                            <button className="dashboard-modal-action" onClick={() => setShowBmrModal(false)}>Got it!</button>
                        </>
                    ) : (
                        <>
                            <div className="dashboard-modal-result">
                                <p className="dashboard-modal-desc">We don't have enough data to calculate your BMR.</p>
                            </div>
                            <button className="dashboard-modal-action" onClick={() => { setShowBmrModal(false); setCurrentView('editProfile'); }}>
                                Edit Profile
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    };

    const renderGoalModal = () => {
        if (!isEditingGoal) return null;

        return (
            <div className="dashboard-modal-overlay" onClick={() => setIsEditingGoal(false)}>
                <div className="dashboard-modal-content" onClick={e => e.stopPropagation()}>
                    <button className="dashboard-modal-close" onClick={() => setIsEditingGoal(false)}>×</button>
                    <h2 className="dashboard-modal-title">Custom Calorie Goal</h2>
                    <div className="dashboard-modal-result">
                        <p className="dashboard-modal-desc" style={{ marginBottom: '15px' }}>Enter your target daily calories:</p>
                        <input
                            type="number"
                            value={customGoalInput}
                            onChange={(e) => setCustomGoalInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCustomGoal(); }}
                            autoFocus
                            style={{ fontSize: '32px', padding: '10px', width: '150px', textAlign: 'center', borderRadius: '12px', border: '2px solid #7c3aed', background: 'transparent', color: 'inherit', fontWeight: '800', marginBottom: '15px' }}
                        />
                        <p className="dashboard-modal-desc">Leave empty to use BMR suggestions.</p>
                    </div>
                    <button className="dashboard-modal-action" onClick={handleSaveCustomGoal}>Save Goal</button>
                </div>
            </div>
        );
    };

    const renderMacroModal = () => {
        if (!editingMacro) return null;

        return (
            <div className="dashboard-modal-overlay" onClick={() => setEditingMacro(null)}>
                <div className="dashboard-modal-content" onClick={e => e.stopPropagation()}>
                    <button className="dashboard-modal-close" onClick={() => setEditingMacro(null)}>×</button>
                    <h2 className="dashboard-modal-title">Custom {editingMacro} Goal</h2>
                    <div className="dashboard-modal-result">
                        <p className="dashboard-modal-desc" style={{ marginBottom: '15px' }}>Enter your target daily {editingMacro} (g):</p>
                        <input
                            type="number"
                            value={customMacroInput}
                            onChange={(e) => setCustomMacroInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCustomMacro(); }}
                            autoFocus
                            style={{ fontSize: '32px', padding: '10px', width: '150px', textAlign: 'center', borderRadius: '12px', border: '2px solid #7c3aed', background: 'transparent', color: 'inherit', fontWeight: '800', marginBottom: '15px' }}
                        />
                        <p className="dashboard-modal-desc">Leave empty to use automatically calculated goals.</p>
                    </div>
                    <button className="dashboard-modal-action" onClick={handleSaveCustomMacro}>Save Goal</button>
                </div>
            </div>
        );
    };

    return (
        <div className={`dashboard-wrapper${isDarkMode ? ' dark' : ''}`}>
            {renderBmiModal()}
            {renderBmrModal()}
            {renderGoalModal()}
            {renderMacroModal()}
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
                    <button className="menu-item" onClick={() => { setShowBmiModal(true); setIsMenuOpen(false); }}>
                        <span>⚖️</span> Calculate BMI
                    </button>
                    <button className="menu-item" onClick={() => { setShowBmrModal(true); setIsMenuOpen(false); }}>
                        <span>🔥</span> Calculate BMR
                    </button>
                    <button className="menu-item" onClick={() => { setCurrentView('foodLog'); setIsMenuOpen(false); }}>
                        <span>🍎</span> Log Food (AI)
                    </button>
                    <button className="menu-item" onClick={() => { setCurrentView('recipeChat'); setIsMenuOpen(false); }}>
                        <span>👩‍🍳</span> Chef Chat
                    </button>
                    <button className="menu-item" onClick={() => { setCurrentView('cookbook'); setIsMenuOpen(false); }}>
                        <span>📖</span> My Cookbook
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
                    <h2 className="dashboard-title">RECIFIT</h2>
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
                                <circle cx="60" cy="60" r="54" fill="none" stroke="#e9d8fd" strokeWidth="10" />
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
                                        <stop offset="0%" stopColor="#7c3aed" />
                                        <stop offset="100%" stopColor="#a78bfa" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="progress-ring-inner">
                                <span className="calories-number">{Math.round(eaten.calories)}</span>
                                <span className="calories-label">kcal</span>
                            </div>
                        </div>
                        <div className="goal-badge" onClick={() => { setIsEditingGoal(true); setCustomGoalInput(profile?.customCalorieGoal?.toString() || ''); }} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                            Goal: {goals.calories} kcal
                        </div>
                    </div>

                    <h3 className="section-title" style={{ textAlign: 'center' }}>Nutrition Breakdown</h3>

                    {/* Macros */}
                    <div className="macros-row">
                        {macros.map((macro, index) => (
                            <div className={`nutrition-card ${macro.cardClass || ''}`} key={index}>
                                <div className="icon-wrapper">{macro.icon}</div>
                                <div className="nutrition-info">
                                    <h4 className="nutrition-name">{macro.name}</h4>
                                    <p 
                                        className="nutrition-goal" 
                                        onClick={() => {
                                            setEditingMacro(macro.name);
                                            setCustomMacroInput(profile?.[`custom${macro.name}Goal`]?.toString() || '');
                                        }}
                                        style={{ cursor: 'pointer', transition: 'opacity 0.2s', display: 'inline-block' }}
                                        onMouseOver={(e) => e.currentTarget.style.opacity = 0.7}
                                        onMouseOut={(e) => e.currentTarget.style.opacity = 1}
                                        title={`Edit ${macro.name} Goal`}
                                    >
                                        GOAL: {macro.goal}{macro.unit}
                                    </p>
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