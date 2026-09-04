import React, { useState, useEffect } from 'react';
import { API_URL } from './config';
import './Cookbook.css';

const Cookbook = ({ user, onBack, onFoodLogged }) => {
    const [recipes, setRecipes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRecipe, setSelectedRecipe] = useState(null);

    useEffect(() => {
        const fetchCookbook = async () => {
            const userId = user?.userId || user?.username || user?.signInDetails?.loginId || user?.attributes?.sub;
            if (!userId) {
                setError("Unable to identify user.");
                setIsLoading(false);
                return;
            }

            try {
                const response = await fetch(`${API_URL}/recipes?userId=${userId}`);
                const data = await response.json();

                if (response.ok) {
                    setRecipes(data.recipes || []);
                } else {
                    setError(data.error || 'Failed to load cookbook.');
                }
            } catch (err) {
                setError('Connection error while fetching cookbook.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchCookbook();
    }, [user]);

    const openModal = (recipe) => {
        setSelectedRecipe(recipe);
    };

    const closeModal = () => {
        setSelectedRecipe(null);
    };

    const handleDeleteRecipe = async (recipeId) => {


        const userId = user?.userId || user?.username || user?.signInDetails?.loginId || user?.attributes?.sub;
        
        try {
            const response = await fetch(`${API_URL}/recipes/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, recipeId })
            });

            if (response.ok) {
                setRecipes(prev => prev.filter(r => r.RecipeId !== recipeId));
                closeModal();
            } else {
                console.error("Failed to delete recipe.");
            }
        } catch (err) {
            console.error("Connection error while deleting recipe.");
        }
    };

    const handleLogMeal = async (recipe) => {
        const userId = user?.userId || user?.username || user?.signInDetails?.loginId || user?.attributes?.sub;
        if (!userId) return;
        
        try {
            const response = await fetch(`${API_URL}/log-recipe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, macros: recipe.Macros })
            });

            if (response.ok) {
                const data = await response.json();
                if (onFoodLogged && data.totals) {
                    onFoodLogged(data.totals);
                }
                closeModal();
            } else {
                console.error("Failed to log meal.");
            }
        } catch (err) {
            console.error("Connection error while logging meal.");
        }
    };

    return (
        <div className="cookbook-wrapper">
            <div className="cookbook-container">
                <div className="cookbook-header">
                    <button className="back-button" onClick={onBack}>← Back</button>
                    <div>
                        <h1 className="cookbook-title">📖 My Cookbook</h1>
                        <p className="cookbook-subtitle">Your personal collection of AI-generated recipes.</p>
                    </div>
                </div>

                <div className="cookbook-content">
                    {isLoading ? (
                        <div className="cookbook-loading">
                            <span className="spinner"></span> Loading your recipes...
                        </div>
                    ) : error ? (
                        <div className="cookbook-error">⚠️ {error}</div>
                    ) : recipes.length === 0 ? (
                        <div className="cookbook-empty">
                            <div className="empty-icon">🍳</div>
                            <h3>Your cookbook is empty!</h3>
                            <p>Go to the Chef Bot to generate and save some delicious recipes.</p>
                        </div>
                    ) : (
                        <div className="recipe-grid">
                            {recipes.map((recipe, idx) => (
                                <div key={idx} className="recipe-card-mini" onClick={() => openModal(recipe)}>
                                    <div className="recipe-image-container">
                                        {recipe.ImageUrl ? (
                                            <img src={recipe.ImageUrl} alt={recipe.Title} className="recipe-img" />
                                        ) : (
                                            <div className="recipe-img-placeholder">🍽️</div>
                                        )}
                                    </div>
                                    <div className="recipe-card-content">
                                        <h3 className="recipe-card-title">{recipe.Title}</h3>
                                        <p className="recipe-card-macros">
                                            {recipe.Macros?.calories} kcal • {recipe.Macros?.protein}g P
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {selectedRecipe && (
                <div className="recipe-modal-overlay" onClick={closeModal}>
                    <div className="recipe-modal" onClick={e => e.stopPropagation()}>
                        <button className="close-modal" onClick={closeModal}>✕</button>
                        
                        <div className="modal-header-img">
                            {selectedRecipe.ImageUrl ? (
                                <img src={selectedRecipe.ImageUrl} alt={selectedRecipe.Title} />
                            ) : (
                                <div className="placeholder-hero">🍽️</div>
                            )}
                        </div>

                        <div className="modal-content">
                            <div className="modal-title-row">
                                <h2>{selectedRecipe.Title}</h2>
                                <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                                    <button 
                                        className="log-meal-btn" 
                                        onClick={() => handleLogMeal(selectedRecipe)}
                                        style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}
                                    >
                                        🍽️ I made this!
                                    </button>
                                    <button className="delete-recipe-btn" onClick={() => handleDeleteRecipe(selectedRecipe.RecipeId)}>
                                        🗑️ Delete
                                    </button>
                                </div>
                            </div>
                            <p className="modal-desc">{selectedRecipe.Description}</p>
                            
                            <div className="modal-macros">
                                <div className="macro-box">
                                    <span className="val">{selectedRecipe.Macros?.calories}</span>
                                    <span className="lbl">kcal</span>
                                </div>
                                <div className="macro-box">
                                    <span className="val">{selectedRecipe.Macros?.protein}g</span>
                                    <span className="lbl">Protein</span>
                                </div>
                                <div className="macro-box">
                                    <span className="val">{selectedRecipe.Macros?.carbs}g</span>
                                    <span className="lbl">Carbs</span>
                                </div>
                                <div className="macro-box">
                                    <span className="val">{selectedRecipe.Macros?.fats}g</span>
                                    <span className="lbl">Fats</span>
                                </div>
                            </div>

                            <div className="modal-body-grid">
                                <div>
                                    <h3>Ingredients</h3>
                                    <ul>
                                        {selectedRecipe.Ingredients?.map((ing, i) => <li key={i}>{ing}</li>)}
                                    </ul>
                                </div>
                                <div>
                                    <h3>Instructions</h3>
                                    <ol>
                                        {selectedRecipe.Instructions?.map((inst, i) => <li key={i}>{inst}</li>)}
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cookbook;
