import React, { useState, useEffect } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import './components/Navbar.css';
import PlasmaBlob from './components/blob';
import BackgroundUI from './components/BackgroundUI';
import Terminal from './components/Terminal';
import Status from './components/Status';
import About from './components/About';

function App() {
  const [themeColor, setThemeColor] = useState('#8b5cf6'); // Default primary (violet)
  const [blobSize, setBlobSize] = useState(1.0);
  const [sensitivity, setSensitivity] = useState(1.0);
  const [brightness, setBrightness] = useState(1.5);
  const [blobOpacity, setBlobOpacity] = useState(1.0);

  // Status panel states
  const [systemOnline, setSystemOnline] = useState(true);
  const [kyraxOnline, setKyraxOnline] = useState(false); // Validated by backend
  const [microphoneActive, setMicrophoneActive] = useState(false);
  const [microphonePermission, setMicrophonePermission] = useState(true);
  const [apiConnected, setApiConnected] = useState(false);
  const [ttsSpeaking, setTtsSpeaking] = useState(false);

  // Blob positioning state
  const [blobPos, setBlobPos] = useState(() => {
    try {
      const saved = localStorage.getItem('kyrax_blob_pos');
      return saved ? JSON.parse(saved) : { x: 0, y: 0 };
    } catch (e) {
      return { x: 0, y: 0 };
    }
  });
  const [isMovingBlob, setIsMovingBlob] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const saveBlobPosition = () => {
    setIsMovingBlob(false);
    localStorage.setItem('kyrax_blob_pos', JSON.stringify(blobPos));
  };

  // Status panel positioning state
  const [statusPos, setStatusPos] = useState(() => {
    try {
      const saved = localStorage.getItem('kyrax_status_pos');
      return saved ? JSON.parse(saved) : { x: 0, y: 0 };
    } catch (e) {
      return { x: 0, y: 0 };
    }
  });
  const [isMovingStatus, setIsMovingStatus] = useState(false);
  const [dragStatusStart, setDragStatusStart] = useState({ x: 0, y: 0 });

  const saveStatusPosition = () => {
    setIsMovingStatus(false);
    localStorage.setItem('kyrax_status_pos', JSON.stringify(statusPos));
  };

  const [isDragging, setIsDragging] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    // Update global CSS variables for the theme dynamically
    document.documentElement.style.setProperty('--primary', themeColor);
  }, [themeColor]);

  return (
    <div className="App">
      <Navbar 
        themeColor={themeColor} setThemeColor={setThemeColor}
        blobSize={blobSize} setBlobSize={setBlobSize}
        sensitivity={sensitivity} setSensitivity={setSensitivity}
        brightness={brightness} setBrightness={setBrightness}
        blobOpacity={blobOpacity} setBlobOpacity={setBlobOpacity}
        isMovingBlob={isMovingBlob} setIsMovingBlob={setIsMovingBlob}
        saveBlobPosition={saveBlobPosition}
        isMovingStatus={isMovingStatus} setIsMovingStatus={setIsMovingStatus}
        saveStatusPosition={saveStatusPosition}
        isDragging={isDragging}
        onOpenAbout={() => setShowAbout(true)}
      />
      
      {/* Minimal Sci-Fi Background UI */}
      <BackgroundUI />

      {/* 3D Background Layer */}
      <div 
        className="blob-container" 
        style={{ transform: `translate(${blobPos.x}px, ${blobPos.y}px)` }}
      >
        <PlasmaBlob 
          themeColor={themeColor} 
          sizeMultiplier={blobSize} 
          sensitivityMultiplier={sensitivity} 
          brightnessMultiplier={brightness}
          opacityMultiplier={blobOpacity}
        />
      </div>

      {/* Foreground Interactive Content Layer */}
      <div className="content-wrapper">
        {/* We have removed the big center block for a cleaner, ultra-premium look. Let the blob be the star. */}
      </div>

      {/* Invisible Drag Overlay for Moving Blob & Status */}
      {(isMovingBlob || isMovingStatus) && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            zIndex: 900, cursor: 'grab'
          }}
          onPointerDown={(e) => {
            e.currentTarget.style.cursor = 'grabbing';
            setIsDragging(true);
            if (isMovingBlob) {
              setDragStart({ x: e.clientX - blobPos.x, y: e.clientY - blobPos.y });
            } else if (isMovingStatus) {
              setDragStatusStart({ x: e.clientX - statusPos.x, y: e.clientY - statusPos.y });
            }
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (e.buttons !== 1) return; // Only move if left mouse is held
            if (isMovingBlob) {
              setBlobPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
            } else if (isMovingStatus) {
              setStatusPos({ x: e.clientX - dragStatusStart.x, y: e.clientY - dragStatusStart.y });
            }
          }}
          onPointerUp={(e) => {
            e.currentTarget.style.cursor = 'grab';
            setIsDragging(false);
            e.currentTarget.releasePointerCapture(e.pointerId);
          }}
        />
      )}

      {/* Right Top Status Panel */}
      <Status 
        themeColor={themeColor}
        systemOnline={systemOnline}
        kyraxOnline={kyraxOnline}
        microphoneActive={microphoneActive}
        microphonePermission={microphonePermission}
        apiConnected={apiConnected}
        ttsSpeaking={ttsSpeaking}
        position={statusPos}
      />

      {/* Voice Recognition Terminal */}
      <Terminal 
        themeColor={themeColor} 
        setKyraxOnline={setKyraxOnline}
        setMicrophoneActive={setMicrophoneActive}
        setMicrophonePermission={setMicrophonePermission}
        setApiConnected={setApiConnected}
        setTtsSpeaking={setTtsSpeaking}
      />

      {/* About Section Overlay */}
      <About 
        isOpen={showAbout} 
        onClose={() => setShowAbout(false)} 
        themeColor={themeColor} 
      />
    </div>
  );
}

export default App;
