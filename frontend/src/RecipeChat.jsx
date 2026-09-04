import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from './config';
import './RecipeChat.css';

const PANTRY_STAPLES = [
    "Salt", "Black Pepper", "Olive Oil", "Vegetable Oil", "Garlic", 
    "Onion", "Butter", "Flour", "Sugar", "Soy Sauce", "Milk", "Eggs"
];

const RecipeChat = ({ user, remainingMacros, onBack }) => {
    const [message, setMessage] = useState('');
    const [history, setHistory] = useState([]);
    const [chatId, setChatId] = useState(null);
    const [savedChats, setSavedChats] = useState([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    // New states for Image Upload & Kitchen Profile
    const [selectedImage, setSelectedImage] = useState(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [kitchenProfile, setKitchenProfile] = useState({
        staples: [],
        allergies: ''
    });
    const fileInputRef = useRef(null);

    const fetchHistories = async () => {
        try {
            const userId = user?.userId || user?.username || user?.signInDetails?.loginId || user?.attributes?.sub;
            const res = await fetch(`${API_URL}/chat/history?userId=${userId}`);
            const data = await res.json();
            if (res.ok) setSavedChats(data.histories || []);
        } catch (e) {
            console.error("Failed to fetch chat histories");
        }
    };

    // Load kitchen profile from local storage on mount
    useEffect(() => {
        fetchHistories();
        const savedProfile = localStorage.getItem('kitchenProfile');
        if (savedProfile) {
            try {
                setKitchenProfile(JSON.parse(savedProfile));
            } catch (e) {
                console.error("Failed to parse kitchen profile");
            }
        }
    }, [user]);

    const saveChatToDB = async (currentHistory, currentChatId) => {
        try {
            const userId = user?.userId || user?.username || user?.signInDetails?.loginId || user?.attributes?.sub;
            const res = await fetch(`${API_URL}/chat/history`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    chat_id: currentChatId,
                    title: currentHistory.length > 0 ? currentHistory[0].content.substring(0, 30) + "..." : "New Chat",
                    messages: currentHistory
                })
            });
            const data = await res.json();
            if (res.ok) {
                if (!currentChatId) setChatId(data.chat_id);
                fetchHistories(); // Refresh sidebar
            }
        } catch (e) {
            console.error("Failed to auto-save chat");
        }
    };

    const handleNewChat = () => {
        setHistory([]);
        setChatId(null);
        setMessage('');
        setSelectedImage(null);
        setIsSidebarOpen(false);
    };

    const handleDeleteChat = async (e, idToDelete) => {
        e.stopPropagation();
        try {
            const userId = user?.userId || user?.username || user?.signInDetails?.loginId || user?.attributes?.sub;
            const res = await fetch(`${API_URL}/chat/history/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, chat_id: idToDelete })
            });
            
            if (res.ok) {
                setSavedChats(prev => prev.filter(h => h.ChatId !== idToDelete));
                if (chatId === idToDelete) handleNewChat();
            } else {
                console.error('Failed to delete chat.');
            }
        } catch (e) {
            console.error('Delete chat error:', e);
        }
    };

    const loadChat = (chat) => {
        setHistory(chat.Messages || []);
        setChatId(chat.ChatId);
        setIsSidebarOpen(false);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setSelectedImage(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSend = async () => {
        if (!message.trim() && !selectedImage) return;

        const newUserMsg = { 
            role: 'user', 
            content: message || "Analyze this image.", 
            image: selectedImage 
        };
        const updatedHistory = [...history, newUserMsg];
        
        setHistory(updatedHistory);
        setMessage('');
        setSelectedImage(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsLoading(true);
        setError(null);

        try {
            const strippedHistory = history.map(msg => ({ role: msg.role, content: msg.content }));

            const response = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: newUserMsg.content,
                    image_data: newUserMsg.image,
                    remaining_macros: remainingMacros,
                    history: strippedHistory,
                    kitchen_profile: kitchenProfile
                })
            });

            const data = await response.json();

            if (response.ok) {
                const aiMsg = { 
                    role: 'assistant', 
                    content: data.bot_message,
                    recipe: data.is_recipe ? data : null
                };
                const finalHistory = [...updatedHistory, aiMsg];
                setHistory(finalHistory);
                saveChatToDB(finalHistory, chatId);
            } else {
                setError(data.error || 'Failed to generate recipe.');
                setHistory(updatedHistory);
                saveChatToDB(updatedHistory, chatId);
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveRecipe = async (recipe, msgIndex) => {
        setIsSaving(true);
        try {
            const userId = user?.userId || user?.username || user?.signInDetails?.loginId || user?.attributes?.sub;
            const response = await fetch(`${API_URL}/recipes/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, recipe, image_url: recipe.image_url })
            });

            const data = await response.json();
            if (response.ok) {
                const newHistory = [...history];
                newHistory[msgIndex].saved = true;
                setHistory(newHistory);
                saveChatToDB(newHistory, chatId);
            } else {
                console.error(`Error saving recipe: ${data.error}`);
            }
        } catch (err) {
            console.error('Connection error while saving recipe.');
        } finally {
            setIsSaving(false);
        }
    };

    const toggleStaple = (staple) => {
        setKitchenProfile(prev => {
            const newStaples = prev.staples.includes(staple)
                ? prev.staples.filter(s => s !== staple)
                : [...prev.staples, staple];
            return { ...prev, staples: newStaples };
        });
    };

    const saveKitchenProfile = () => {
        localStorage.setItem('kitchenProfile', JSON.stringify(kitchenProfile));
        setIsProfileOpen(false);
    };

    return (
        <div className="recipe-chat-wrapper">
            {/* Sidebar for chat histories */}
            <div className={`chat-history-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h3>Past Conversations</h3>
                    <button className="close-sidebar" onClick={() => setIsSidebarOpen(false)}>✕</button>
                </div>
                <div className="sidebar-content">
                    {savedChats.length === 0 ? (
                        <p className="no-history">No past conversations.</p>
                    ) : (
                        savedChats.map((h, idx) => (
                            <div key={h.ChatId} className="history-item" onClick={() => loadChat(h)}>
                                <div className="history-item-content">
                                    <h4>{h.Title}</h4>
                                    <span className="date">{new Date(h.UpdatedAt).toLocaleDateString()}</span>
                                </div>
                                <button 
                                    className="delete-chat-btn" 
                                    onClick={(e) => handleDeleteChat(e, h.ChatId)}
                                    title="Delete Chat"
                                >
                                    🗑️
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Kitchen Profile Modal */}
            {isProfileOpen && (
                <div className="kitchen-profile-overlay" onClick={() => setIsProfileOpen(false)}>
                    <div className="kitchen-profile-modal" onClick={e => e.stopPropagation()}>
                        <h2>🍽️ Kitchen Profile</h2>
                        <p>Tell the AI Chef about your kitchen so it can give you better recipes!</p>
                        
                        <div className="profile-section">
                            <h3>Pantry Staples</h3>
                            <p className="section-desc">Select ingredients you always have at home.</p>
                            <div className="staples-grid">
                                {PANTRY_STAPLES.map(staple => (
                                    <button 
                                        key={staple} 
                                        className={`staple-btn ${kitchenProfile.staples.includes(staple) ? 'selected' : ''}`}
                                        onClick={() => toggleStaple(staple)}
                                    >
                                        {staple}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="profile-section">
                            <h3>Allergies & Dietary Restrictions</h3>
                            <textarea 
                                placeholder="E.g., Peanuts, Gluten, Dairy..."
                                value={kitchenProfile.allergies}
                                onChange={(e) => setKitchenProfile(prev => ({...prev, allergies: e.target.value}))}
                            />
                        </div>

                        <div className="profile-actions">
                            <button className="cancel-profile-btn" onClick={() => setIsProfileOpen(false)}>Cancel</button>
                            <button className="save-profile-btn" onClick={saveKitchenProfile}>Save Profile</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="recipe-chat-container">
                <div className="chat-header">
                    <div className="header-left-actions">
                        <button className="back-button" onClick={onBack}>← Back</button>
                        <button className="history-button" onClick={() => setIsSidebarOpen(true)}>☰ History</button>
                    </div>
                    <div className="header-center">
                        <h1 className="chat-title">👨‍🍳 Chef Bot</h1>
                        <p className="chat-subtitle">
                            Remaining: {remainingMacros.calories} kcal | P: {remainingMacros.protein}g | C: {remainingMacros.carbs}g | F: {remainingMacros.fats}g
                        </p>
                    </div>
                    <div className="header-right-actions">
                        <button className="profile-btn" onClick={() => setIsProfileOpen(true)} title="Kitchen Profile">
                            🍽️ My Kitchen
                        </button>
                        <button className="new-chat-button" onClick={handleNewChat}>+ New Chat</button>
                    </div>
                </div>

                <div className="chat-window">
                    {history.length === 0 && (
                        <div className="chat-empty-state">
                            <p>Hi! Tell me what you're craving, or take a picture of your fridge to see what we can make!</p>
                            <p className="suggestion">Try uploading a photo of your ingredients.</p>
                        </div>
                    )}
                    
                    {history.map((msg, idx) => (
                        <div key={idx} className={`chat-bubble-container ${msg.role}`}>
                            <div className={`chat-bubble ${msg.role}`}>
                                {msg.image && (
                                    <div className="chat-image-preview">
                                        <img src={msg.image} alt="User upload" />
                                    </div>
                                )}
                                <p className="chat-text">{msg.content}</p>
                                
                                {msg.recipe && (
                                    <div className="recipe-card">
                                        {msg.recipe.image_url ? (
                                            <div style={{width: '100%', height: '200px', marginBottom: '15px', borderRadius: '10px', overflow: 'hidden'}}>
                                                <img src={msg.recipe.image_url} alt="Recipe" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                                            </div>
                                        ) : msg.recipe.image_error ? (
                                            <div style={{width: '100%', padding: '10px', marginBottom: '15px', backgroundColor: 'rgba(255,0,0,0.1)', color: '#ff6b6b', borderRadius: '10px', fontSize: '0.9em'}}>
                                                <strong>Image Error:</strong> {msg.recipe.image_error}
                                            </div>
                                        ) : null}
                                        <h3>{msg.recipe.title}</h3>
                                        <p className="recipe-desc">{msg.recipe.description}</p>
                                        
                                        <div className="recipe-macros">
                                            <span>{msg.recipe.macros.calories} kcal</span>
                                            <span>P: {msg.recipe.macros.protein}g</span>
                                            <span>C: {msg.recipe.macros.carbs}g</span>
                                            <span>F: {msg.recipe.macros.fats}g</span>
                                        </div>

                                        <div className="recipe-lists">
                                            <div className="list-col">
                                                <h4>Ingredients</h4>
                                                <ul>
                                                    {msg.recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                                                </ul>
                                            </div>
                                            <div className="list-col">
                                                <h4>Instructions</h4>
                                                <ol>
                                                    {msg.recipe.instructions.map((inst, i) => <li key={i}>{inst}</li>)}
                                                </ol>
                                            </div>
                                        </div>

                                        <button 
                                            className={`save-btn ${msg.saved ? 'saved' : ''}`}
                                            onClick={() => !msg.saved && handleSaveRecipe(msg.recipe, idx)}
                                            disabled={isSaving || msg.saved}
                                        >
                                            {msg.saved ? '✓ Saved to Cookbook' : (isSaving ? 'Generating Image & Saving...' : '💾 Save to Cookbook')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {isLoading && (
                        <div className="chat-bubble-container assistant">
                            <div className="chat-bubble loading-bubble">
                                <span className="dot"></span>
                                <span className="dot"></span>
                                <span className="dot"></span>
                            </div>
                        </div>
                    )}
                    {error && <div className="chat-error">{error}</div>}
                </div>

                <div className="chat-input-area">
                    {selectedImage && (
                        <div className="input-image-preview">
                            <img src={selectedImage} alt="Selected" />
                            <button className="remove-image-btn" onClick={removeImage}>✕</button>
                        </div>
                    )}
                    <div className="input-row">
                        <label className="upload-btn">
                            📷
                            <input 
                                type="file" 
                                accept="image/*" 
                                capture="environment"
                                ref={fileInputRef}
                                onChange={handleImageChange}
                                style={{ display: 'none' }}
                                disabled={isLoading || isSaving}
                            />
                        </label>
                        <input 
                            type="text" 
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="E.g. I want a heavy pasta dish..."
                            disabled={isLoading || isSaving}
                        />
                        <button onClick={handleSend} disabled={isLoading || isSaving || (!message.trim() && !selectedImage)}>
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecipeChat;
