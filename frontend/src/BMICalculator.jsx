import React, { useState } from 'react';
import './EditProfile.css'; // Reusing your existing CSS

const BMICalculator = ({ onBack }) => {
  const [formData, setFormData] = useState({ weight: '', height: '' });
  const [result, setResult] = useState(null);

  const calculateBMI = () => {
    const { weight, height } = formData;
    if (weight && height) {
      const heightInMeters = height / 100;
      const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);
      
      let category = '';
      if (bmi < 18.5) category = 'Underweight';
      else if (bmi < 25) category = 'Healthy Weight';
      else if (bmi < 30) category = 'Overweight';
      else category = 'Obese';

      setResult({ bmi, category });
    }
  };

  return (
    <div className="edit-profile-container">
      <div className="edit-profile-split">
        <div className="edit-profile-image-panel" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2070&auto=format&fit=crop')" }}>
          <div className="image-overlay">
            <h1 className="image-headline">KNOW YOUR<br/>NUMBERS</h1>
            <p className="image-subhead">Body Mass Index is a starting point for your health journey.</p>
          </div>
        </div>

        <div className="edit-profile-form-panel">
          <h2 className="form-title">BMI Calculator</h2>
          <p className="form-subtitle">Enter your details to calculate your current Body Mass Index.</p>
          
          <div className="form-group">
            <label>Weight (kg)</label>
            <input type="number" placeholder="70" value={formData.weight} onChange={(e) => setFormData({...formData, weight: e.target.value})} />
          </div>

          <div className="form-group">
            <label>Height (cm)</label>
            <input type="number" placeholder="175" value={formData.height} onChange={(e) => setFormData({...formData, height: e.target.value})} />
          </div>

          {result && (
            <div className="result-display" style={{ padding: '20px', background: '#222224', borderRadius: '12px', marginBottom: '25px', borderLeft: '4px solid #FF5A1F' }}>
              <p style={{ color: '#A0A0A0', fontSize: '0.85rem', margin: '0' }}>Your BMI</p>
              <h3 style={{ fontSize: '2rem', margin: '5px 0', color: '#FF5A1F' }}>{result.bmi}</h3>
              <p style={{ color: '#FFF', fontWeight: '600' }}>Category: {result.category}</p>
            </div>
          )}

          <div className="form-actions">
            <button className="btn-cancel" onClick={onBack}>Back</button>
            <button className="btn-save" onClick={calculateBMI}>Calculate BMI</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BMICalculator;