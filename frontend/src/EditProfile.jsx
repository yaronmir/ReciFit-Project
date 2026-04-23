import React, { useState } from 'react';
import './EditProfile.css';

const EditProfile = ({ user, onCancel, onSave }) => {
  const [formData, setFormData] = useState({
    weight: '',
    goalWeight: '',
    height: '',
    age: '',
    gender: 'Female',
    fitnessGoal: 'Not Set',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = () => {
    // In Phase 2, we will hook this up to the AWS API!
    onSave(formData);
  };

  return (
    <div className="edit-profile-container">
      <div className="edit-profile-split">
        {/* Left Side: Imagery */}
        <div className="edit-profile-image-panel">
          <div className="image-overlay">
            <h1 className="image-headline">ELEVATE<br/>YOURSELF</h1>
            <p className="image-subhead">Turn your goals into reality.</p>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="edit-profile-form-panel">
          <h2 className="form-title">Edit Profile</h2>
          <p className="form-subtitle">Manage your personal details to track your fitness journey.</p>
          
          <div className="form-group">
            <label>Current Weight (kg)</label>
            <input type="number" name="weight" placeholder="e.g. 75" value={formData.weight} onChange={handleChange} />
          </div>

          <div className="form-group-row">
            <div className="form-group">
              <label>Height (cm)</label>
              <input type="number" name="height" placeholder="175" value={formData.height} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Age (Years)</label>
              <input type="number" name="age" placeholder="28" value={formData.age} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group-row">
            <div className="form-group">
              <label>Gender</label>
              <select name="gender" value={formData.gender} onChange={handleChange}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="form-group">
              <label>Primary Goal</label>
              <select name="fitnessGoal" value={formData.fitnessGoal} onChange={handleChange}>
                <option value="Not Set">Not Set</option>
                <option value="Lose Weight">Lose Weight</option>
                <option value="Maintain">Maintain</option>
                <option value="Build Muscle">Build Muscle</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-cancel" onClick={onCancel}>Cancel</button>
            <button className="btn-save" onClick={handleSave}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
