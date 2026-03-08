import React from 'react';
import './Status.css';

export default function Status({ 
  themeColor = '#8b5cf6',
  systemOnline = true,
  kyraxOnline = true,
  microphoneActive = false,
  microphonePermission = true,
  apiConnected = true,
  ttsSpeaking = false,
  position = { x: 0, y: 0 }
}) {
  return (
    <div 
      className="status-panel-container" 
      style={{ 
        '--status-accent': themeColor,
        transform: `translate(${position.x}px, ${position.y}px)`
      }}
    >
      <div className="status-header">
        <span className="status-title">SYSTEM DIAGNOSTICS</span>
      </div>
      
      <div className="status-list">
        <div className="status-item">
          <span className="status-label">SYS CORE</span>
          <span className={`status-value ${systemOnline ? 'online' : 'offline'}`}>
            {systemOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
        
        <div className="status-item">
          <span className="status-label">KYRAX LINK</span>
          <span className={`status-value ${kyraxOnline ? 'online' : 'offline'}`}>
            {kyraxOnline ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>
        
        <div className="status-item">
          <span className="status-label">MIC ARRAY</span>
          <span className={`status-value ${microphoneActive ? 'active' : 'idle'}`}>
            {microphoneActive ? 'ACTIVE' : 'IDLE'}
          </span>
        </div>
        
        <div className="status-item">
          <span className="status-label">MIC ACCESS</span>
          <span className={`status-value ${microphonePermission ? 'granted' : 'denied'}`}>
            {microphonePermission ? 'GRANTED' : 'DENIED'}
          </span>
        </div>
        
        <div className="status-item">
          <span className="status-label">GROQ API</span>
          <span className={`status-value ${apiConnected ? 'routing' : 'offline'}`}>
            {apiConnected ? 'ROUTING' : 'OFFLINE'}
          </span>
        </div>

        <div className="status-item">
          <span className="status-label">TTS ENGINE</span>
          <span className={`status-value ${ttsSpeaking ? 'active' : 'idle'}`}>
            {ttsSpeaking ? 'SPEAKING' : 'STANDBY'}
          </span>
        </div>
      </div>
    </div>
  );
}
