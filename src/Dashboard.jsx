import React, { useState } from 'react';
import './Dashboard.css';

const Dashboard = ({ user, signOut }) => {
  // UI State for the hamburger menu
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Mock data for visualization (to be replaced with actual backend data later)
  const caloriesEaten = 0;
  const goalCalories = 2000;
  
  const macros = [
    { name: 'Protein', icon: '🥩', eaten: 0, goal: 150, unit: 'g' },
    { name: 'Carbs', icon: '🌾', eaten: 0, goal: 250, unit: 'g' },
    { name: 'Fats', icon: '🥑', eaten: 0, goal: 65, unit: 'g', cardClass: 'fats-card' }
  ];

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-mobile-frame">
        
        {/* --- HAMBURGER MENU OVERLAY & SIDEBAR --- */}
        <div className={`menu-overlay ${isMenuOpen ? 'open' : ''}`} onClick={toggleMenu}></div>
        <div className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
          <div className="menu-profile">
            <p>Ready to crush it,</p>
            <h3>{user?.signInDetails?.loginId || 'User'}!</h3>
          </div>
          
          <button className="menu-item" onClick={() => alert("BMI Calculator coming soon!")}>
            <span>⚖️</span> Calculate BMI
          </button>
          
          <button className="menu-item" onClick={() => alert("BMR/NMR Calculator coming soon!")}>
            <span>🔥</span> Calculate NMR
          </button>

          <button className="menu-item" onClick={() => alert("New Recipe flow coming soon!")}>
            <span>🍽️</span> New Recipe
          </button>

          {/* Sign Out is positioned at the bottom of the sidebar */}
          <button className="menu-item logout" onClick={signOut}>
            <span>🚪</span> Log Out
          </button>
        </div>
        {/* -------------------------------------- */}

        {/* --- HEADER --- */}
        <div className="dashboard-header">
          {/* Hamburger Icon */}
          <button className="icon-button" onClick={toggleMenu}>
            ☰
          </button>
          
          <h2 className="dashboard-title">RECIFIT HUB</h2>
          
          {/* Profile Icon */}
          <div className="profile-icon">
            👤
          </div>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="dashboard-content">
          
          {/* Daily Progress Widget */}
          <div className="daily-progress-card">
            <h3 className="progress-title">DAILY PROGRESS</h3>
            
            <div className="progress-ring-container">
              {/* Inner circle giving the ring effect */}
              <div className="progress-ring-inner">
                <span className="calories-number">{caloriesEaten}</span>
                <span className="calories-label">kcal</span>
              </div>
            </div>

            <div className="goal-badge">
              <span>🎏</span> Goal: {goalCalories} kcal
            </div>
          </div>

          {/* Nutrition Breakdown Widget */}
          <h3 className="section-title">Nutrition Breakdown</h3>
          
          {macros.map((macro, index) => (
            <div className={`nutrition-card ${macro.cardClass || ''}`} key={index}>
              <div className="icon-wrapper">
                {macro.icon}
              </div>
              
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
  );
};

export default Dashboard;
