import React, { useState } from 'react';
import './EditProfile.css';

const BMRCalculator = ({ onBack }) => {
  const [formData, setFormData] = useState({
    weight: '', height: '', age: '', gender: 'Male'
  });
  const [BMR, setBMR] = useState(null);

  const calculateBMR = () => {
    const { weight, height, age, gender } = formData;
    if (weight && height && age) {
      // Mifflin-St Jeor Equation
      let result = (10 * weight) + (6.25 * height) - (5 * age);
      result = gender === 'Male' ? result + 5 : result - 161;
      setBMR(Math.round(result));
    }
  };

  return (
    <div className="edit-profile-container">
      <div className="edit-profile-split">
        <div className="edit-profile-image-panel" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=2069&auto=format&fit=crop')" }}>
          <div className="image-overlay">
            <h1 className="image-headline">FUEL YOUR<br/>PROGRESS</h1>
            <p className="image-subhead">Discover how many calories your body burns at rest.</p>
          </div>
        </div>

        <div className="edit-profile-form-panel">
          <h2 className="form-title">BMR Calculator</h2>
          <p className="form-subtitle">Basal Metabolic Rate helps determine your daily caloric needs.</p>
          
          <div className="form-group-row">
            <div className="form-group">
              <label>Weight (kg)</label>
              <input type="number" placeholder="75" value={formData.weight} onChange={(e) => setFormData({...formData, weight: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Height (cm)</label>
              <input type="number" placeholder="180" value={formData.height} onChange={(e) => setFormData({...formData, height: e.target.value})} />
            </div>
          </div>

          <div className="form-group-row">
            <div className="form-group">
              <label>Age</label>
              <input type="number" placeholder="25" value={formData.age} onChange={(e) => setFormData({...formData, age: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Gender</label>
              <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          {BMR && (
            <div className="result-display" style={{ padding: '20px', background: '#222224', borderRadius: '12px', marginBottom: '25px', borderLeft: '4px solid #FF5A1F' }}>
              <p style={{ color: '#A0A0A0', fontSize: '0.85rem', margin: '0' }}>Daily Resting Calories</p>
              <h3 style={{ fontSize: '2rem', margin: '5px 0', color: '#FF5A1F' }}>{BMR} kcal</h3>
              <p style={{ color: '#888', fontSize: '0.8rem' }}>This is the energy needed for basic life functions.</p>
            </div>
          )}

          <div className="form-actions">
            <button className="btn-cancel" onClick={onBack}>Back</button>
            <button className="btn-save" onClick={calculateBMR}>Calculate BMR</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BMRCalculator;