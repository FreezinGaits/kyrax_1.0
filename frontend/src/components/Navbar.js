import React, { useState } from 'react';
import { Hexagon, Home, LayoutDashboard, Settings, Info, Sliders } from 'lucide-react';

export default function Navbar({
  themeColor, setThemeColor,
  blobSize, setBlobSize,
  sensitivity, setSensitivity,
  brightness, setBrightness,
  blobOpacity, setBlobOpacity,
  isMovingBlob, setIsMovingBlob,
  saveBlobPosition,
  isMovingStatus, setIsMovingStatus,
  saveStatusPosition,
  isDragging
}) {
  const [showSettings, setShowSettings] = useState(false);

  const colors = [
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Gold', value: '#f59e0b' }
  ];

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo Section */}
        <div className="navbar-logo">
          <Hexagon className="logo-icon" size={26} strokeWidth={1.5} />
          <span className="logo-text">KYRAX 1.0</span>
        </div>

        {/* Links Section */}
        <div className="navbar-links">
          <a href="#home" className="nav-item active">
            <Home size={18} strokeWidth={1.5} />
            <span>Home</span>
          </a>
          <a href="#dashboard" className="nav-item">
            <LayoutDashboard size={18} strokeWidth={1.5} />
            <span>Dashboard</span>
          </a>
          <a href="#settings" className={`nav-item ${showSettings ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setShowSettings(!showSettings); }}>
            <Settings size={18} strokeWidth={1.5} />
            <span>Settings</span>
          </a>
          <a href="#about" className="nav-item">
            <Info size={18} strokeWidth={1.5} />
            <span>About</span>
          </a>
        </div>

        {/* Status Indicator */}
        <div className="navbar-status">
          <span className="status-dot"></span>
          <span className="status-text">ONLINE</span>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && !isDragging && (
        <div className="settings-panel">
          <h3><Sliders size={18} style={{marginRight: 8, verticalAlign: 'middle'}}/> BLOB SETTINGS</h3>
          
          <div className="settings-group">
            <label>THEME COLOR & BASE</label>
            <div className="color-options">
              {colors.map(c => (
                <button 
                  key={c.name}
                  className={`color-btn ${themeColor === c.value ? 'active' : ''}`}
                  style={{ backgroundColor: c.value, color: c.value }}
                  onClick={() => setThemeColor(c.value)}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div className="settings-group">
            <label>BLOB SCALE: {blobSize.toFixed(1)}x</label>
            <input 
              type="range" 
              min="0.5" max="2.0" step="0.1" 
              value={blobSize} 
              onChange={(e) => setBlobSize(parseFloat(e.target.value))}
            />
          </div>

          <div className="settings-group">
            <label>AUDIO SENSITIVITY: {sensitivity.toFixed(1)}x</label>
            <input 
              type="range" 
              min="0.0" max="3.0" step="0.1" 
              value={sensitivity} 
              onChange={(e) => setSensitivity(parseFloat(e.target.value))}
            />
          </div>

          <div className="settings-group">
            <label>BLOB BRIGHTNESS: {brightness.toFixed(1)}x</label>
            <input 
              type="range" 
              min="0.5" max="3.0" step="0.1" 
              value={brightness} 
              onChange={(e) => setBrightness(parseFloat(e.target.value))}
            />
          </div>

          <div className="settings-group">
            <label>BLOB TRANSPARENCY: {(blobOpacity * 100).toFixed(0)}%</label>
            <input 
              type="range" 
              min="0.1" max="1.0" step="0.05" 
              value={blobOpacity} 
              onChange={(e) => setBlobOpacity(parseFloat(e.target.value))}
            />
          </div>

          <div className="settings-group">
            <label>UI POSITIONING</label>
            <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
              <button 
                className={`action-btn ${isMovingBlob ? 'primary' : ''}`}
                onClick={() => {
                  if (isMovingStatus) saveStatusPosition();
                  if (isMovingBlob) {
                    saveBlobPosition();
                  } else {
                    setIsMovingBlob(true);
                  }
                }}
              >
                {isMovingBlob ? 'SAVE BLOB' : 'MOVE BLOB'}
              </button>
              
              <button 
                className={`action-btn ${isMovingStatus ? 'primary' : ''}`}
                onClick={() => {
                  if (isMovingBlob) saveBlobPosition();
                  if (isMovingStatus) {
                    saveStatusPosition();
                  } else {
                    setIsMovingStatus(true);
                  }
                }}
              >
                {isMovingStatus ? 'SAVE STATUS' : 'MOVE STATUS'}
              </button>
            </div>
            {(isMovingBlob || isMovingStatus) && (
              <div style={{marginTop: 8, fontSize: 10, color: 'var(--primary)'}}>
                Drag the screen to move the {isMovingBlob ? 'blob' : 'status panel'}.
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
