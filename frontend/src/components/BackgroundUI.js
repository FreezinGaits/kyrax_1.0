import React from 'react';
import './BackgroundUI.css';

export default function BackgroundUI() {
  return (
    <div className="bg-ui-container">
      {/* Subtle Grid Lines */}
      <div className="bg-grid-horiz line-1"></div>
      <div className="bg-grid-horiz line-2"></div>
      <div className="bg-grid-vert line-3"></div>
      <div className="bg-grid-vert line-4"></div>
      
      {/* Corner Brackets */}
      <div className="bracket topleft"></div>
      <div className="bracket topright"></div>
      <div className="bracket bottomleft"></div>
      <div className="bracket bottomright"></div>
      
      {/* Technical Data Labels */}
      <div className="data-label dl-1">
        <span className="blink">_</span> SYS.OP.492
      </div>
      <div className="data-label dl-2">V. 1.0.4 // CORE ACTIVE</div>
      <div className="data-label dl-3">LAT: 34.0522 &bull; LONG: -118.2437</div>
      <div className="data-label dl-4">MN-42-X</div>
      
      {/* Circular Decorative Elements */}
      <svg className="bg-circle outer-circle" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.2" strokeDasharray="2 4" />
      </svg>
      <svg className="bg-circle inner-circle" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(6,182,212,0.06)" strokeWidth="0.3" strokeDasharray="10 5" />
      </svg>
    </div>
  );
}
