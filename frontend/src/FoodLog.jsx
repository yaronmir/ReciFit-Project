import React, { useState } from 'react';
import { API_URL } from './config';
import './FoodLog.css';

const FoodLog = ({ user, onBack }) => {
    const [foodDescription, setFoodDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleLog = async () => {
        if (!foodDescription.trim()) {
            setError('Please describe what you ate!');
            return;
        }

        const userId = user?.userId || user?.username || user?.signInDetails?.loginId || user?.attributes?.sub;
        if (!userId) {
            setError('Could not verify your User ID. Please log out and back in.');
            return;
        }

        setIsLoading(true);
        setResult(null);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/log-food`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, foodDescription })
            });

            const data = await response.json().catch(() => ({}));

            if (response.ok) {
                setResult(data);
                setFoodDescription('');
            } else {
                setError(data.error || `Server error ${response.status}. Please try again.`);
            }
        } catch (err) {
            setError('Failed to connect to the server. Check your internet connection.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="foodlog-wrapper">
            <div className="foodlog-container">
                {/* Header */}
                <div className="foodlog-header">
                    <button className="back-button" onClick={onBack}>← Back</button>
                    <h1 className="foodlog-title">🍽️ Log Your Food</h1>
                    <p className="foodlog-subtitle">Describe what you ate and our AI will calculate the nutrition instantly.</p>
                </div>

                {/* Input Section */}
                <div className="foodlog-input-section">
                    <label className="input-label">What did you eat?</label>
                    <textarea
                        className="food-textarea"
                        placeholder="e.g. 100g rice, 200g chicken breast, and a boiled egg"
                        value={foodDescription}
                        onChange={(e) => setFoodDescription(e.target.value)}
                        rows={3}
                        disabled={isLoading}
                    />
                    <button
                        className={`log-button ${isLoading ? 'loading' : ''}`}
                        onClick={handleLog}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="loading-content">
                                <span className="spinner" />
                                AI is calculating...
                            </span>
                        ) : (
                            '✨ Calculate & Log'
                        )}
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="foodlog-error">
                        ⚠️ {error}
                    </div>
                )}

                {/* Results Section */}
                {result && (
                    <div className="foodlog-results">
                        {/* AI friendly message */}
                        <div className="ai-message">
                            🤖 {result.message}
                        </div>

                        {/* Totals Row */}
                        <div className="totals-grid">
                            <div className="total-card calories">
                                <span className="total-value">{result.totals.calories}</span>
                                <span className="total-label">kcal</span>
                            </div>
                            <div className="total-card protein">
                                <span className="total-value">{result.totals.protein}g</span>
                                <span className="total-label">Protein</span>
                            </div>
                            <div className="total-card carbs">
                                <span className="total-value">{result.totals.carbs}g</span>
                                <span className="total-label">Carbs</span>
                            </div>
                            <div className="total-card fats">
                                <span className="total-value">{result.totals.fats}g</span>
                                <span className="total-label">Fats</span>
                            </div>
                        </div>

                        {/* Per-item Breakdown */}
                        <h3 className="breakdown-title">Breakdown</h3>
                        <div className="items-list">
                            {result.items.map((item, i) => (
                                <div className="food-item-row" key={i}>
                                    <div className="item-name-amount">
                                        <span className="item-name">{item.food}</span>
                                        <span className="item-amount">{item.amount}</span>
                                    </div>
                                    <div className="item-macros">
                                        <span>{item.calories} kcal</span>
                                        <span>P: {item.protein}g</span>
                                        <span>C: {item.carbs}g</span>
                                        <span>F: {item.fats}g</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <p className="saved-note">✅ Saved to your daily log!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FoodLog;
