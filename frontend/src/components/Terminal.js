import React, { useEffect, useRef, useState, useCallback } from 'react';
import './Terminal.css';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const BACKEND_URL = 'http://localhost:5000/api';

export default function Terminal({ 
  themeColor = '#8b5cf6',
  setKyraxOnline,
  setMicrophoneActive,
  setMicrophonePermission,
  setApiConnected,
  setTtsSpeaking
}) {
  const [lines, setLines] = useState([
    { type: 'system', text: 'KYRAX SUBSYSTEM INITIALIZING...' },
    { type: 'system', text: 'Connecting to Cloud Core...' }
  ]);
  const [interimText, setInterimText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);
  const isAlive = useRef(true);
  const restartTimer = useRef(null);
  const audioRef = useRef(null);

  const addLine = useCallback((type, text) => {
    if (!isAlive.current) return;
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLines(prev => [...prev, { type, text, time }]);
  }, []);

  const checkBackendStatus = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/status`);
      const data = await res.json();
      if (setApiConnected) setApiConnected(true);
      if (setKyraxOnline) setKyraxOnline(data.groqConnected);
      addLine('system', data.groqConnected ? 'Groq API Linked. Ready for neural link.' : 'Groq API Offline. Limited capabilities.');
    } catch (err) {
      if (setApiConnected) setApiConnected(false);
      if (setKyraxOnline) setKyraxOnline(false);
      addLine('error', 'Kyrax Backend Offline. Ensure server.js is running.');
    }
  }, [addLine, setApiConnected, setKyraxOnline]);

  const speakNativeFallback = (text) => {
    try {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel(); // stop any current speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 0.9;
      
      const voices = window.speechSynthesis.getVoices();
      // Look for a consistent female/assistant voice
      const preferredBody = voices.find(v => 
        (v.lang === 'en-US' || v.lang === 'en-IN') && 
        (v.name.includes('Google') || v.name.includes('Zira') || v.name.includes('Female'))
      );
      
      if (preferredBody) {
        utterance.voice = preferredBody;
      }
      
      utterance.onstart = () => { if (setTtsSpeaking) setTtsSpeaking(true); };
      utterance.onend = () => { if (setTtsSpeaking) setTtsSpeaking(false); };
      utterance.onerror = () => { if (setTtsSpeaking) setTtsSpeaking(false); };
      
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      if (setTtsSpeaking) setTtsSpeaking(false);
    }
  };

  const submitToLLM = async (query) => {
    addLine('system', 'Processing logic...');
    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query })
      });
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      
      addLine('kyrax', data.text);

      // Web Audio TTS or ElevenLabs playback
      if (data.audioBase64) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        const audio = new Audio(`data:audio/mpeg;base64,${data.audioBase64}`);
        
        audio.onplay = () => { if (setTtsSpeaking) setTtsSpeaking(true); };
        audio.onended = () => { if (setTtsSpeaking) setTtsSpeaking(false); };
        audio.onerror = () => { if (setTtsSpeaking) setTtsSpeaking(false); };

        audio.play().catch(e => {
          console.warn('[Kyrax Terminal] ElevenLabs audio blocked, falling back to native TTS', e);
          speakNativeFallback(data.text);
        });
        audioRef.current = audio;
      } else {
        // Fallback to native Web Speech API if ElevenLabs API Key was missing
        speakNativeFallback(data.text);
      }

    } catch (err) {
      console.error(err);
      addLine('error', 'Neural relay failed. Check backend connection.');
    }
  };

  const startRecognition = useCallback((recognition) => {
    if (!isAlive.current) return;
    try {
      recognition.start();
      console.log('[Kyrax Mic] Recognition started.');
    } catch (e) {
      // start() throws if the engine is still winding down — retry after a short pause
      console.log('[Kyrax Mic] start() threw, retrying in 300ms...', e.message);
      if (restartTimer.current) clearTimeout(restartTimer.current);
      restartTimer.current = setTimeout(() => {
        if (isAlive.current) startRecognition(recognition);
      }, 300);
    }
  }, []);

  useEffect(() => {
    isAlive.current = true;
    checkBackendStatus();

    // Preload native TTS voices to avoid the "man's voice first, girl's voice later" bug
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices(); // Cache them
      };
    }

    if (!SpeechRecognition) {
      addLine('error', '⚠ Speech Recognition not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN'; // Based on locale
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      if (!isAlive.current) return;
      setIsListening(true);
      if (setMicrophoneActive) setMicrophoneActive(true);
      if (setMicrophonePermission) setMicrophonePermission(true);
    };

    recognition.onresult = (event) => {
      if (!isAlive.current) return;
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript.trim()) {
        const text = finalTranscript.trim();
        addLine('user', text);
        setInterimText('');
        
        // Wakeword Detection: Only process if they say "Jarvis" or "Kyrax"
        if (/(jarvis|kyrax|kairax)/i.test(text)) {
          submitToLLM(text);
        }
      } else {
        setInterimText(interimTranscript);
      }
    };

    recognition.onerror = (event) => {
      if (!isAlive.current) return;
      
      if (event.error === 'not-allowed') {
        addLine('error', '⚠ Microphone access denied.');
        setIsListening(false);
        if (setMicrophoneActive) setMicrophoneActive(false);
        if (setMicrophonePermission) setMicrophonePermission(false);
        return; 
      }
      // Silently handle nospeech/aborted — they are harmless timeout closures
    };

    recognition.onend = () => {
      if (!isAlive.current) {
        setIsListening(false);
        if (setMicrophoneActive) setMicrophoneActive(false);
        return;
      }
      // Chrome's SpeechRecognition fires onend during silence gaps even with
      // continuous=true. We need a tiny delay (150ms) so the browser engine
      // fully releases before we call start() again. Zero delay crashes it.
      if (restartTimer.current) clearTimeout(restartTimer.current);
      restartTimer.current = setTimeout(() => {
        if (isAlive.current) startRecognition(recognition);
      }, 150);
    };

    const initTimer = setTimeout(() => {
      if (!isAlive.current) return;
      startRecognition(recognition);
    }, 2500); // give blob array permission setup time

    return () => {
      isAlive.current = false;
      clearTimeout(initTimer);
      if (restartTimer.current) clearTimeout(restartTimer.current);
      try {
        recognition.abort();
      } catch (e) {}
      recognitionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [lines, interimText]);

  return (
    <div className="terminal-container" style={{ '--terminal-accent': themeColor }}>
      <div className="terminal-header">
        <div className="terminal-dots">
          <span className="dot dot-red" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
        </div>
        <span className="terminal-title">KYRAX TERMINAL</span>
        <div className="terminal-status">
          <span className={`listening-indicator ${isListening ? 'active' : ''}`} />
          <span className="listening-text">{isListening ? 'LISTENING' : 'OFFLINE'}</span>
        </div>
      </div>

      <div className="terminal-body">
        {lines.map((line, i) => (
          <div key={i} className={`terminal-line ${line.type}`}>
            {line.type === 'system' && (
              <>
                <span className="line-prefix system-prefix">[ SYS ]</span>
                <span className="line-text">{line.text}</span>
              </>
            )}
            {line.type === 'kyrax' && (
              <>
                <span className="line-prefix kyrax-prefix">[ KYR ]</span>
                <span className="line-prompt kyrax-prompt">❯</span>
                <span className="line-text kyrax-text">{line.text}</span>
              </>
            )}
            {line.type === 'user' && (
              <>
                <span className="line-prefix user-prefix">[{line.time}]</span>
                <span className="line-prompt">❯</span>
                <span className="line-text">{line.text}</span>
              </>
            )}
            {line.type === 'error' && (
              <>
                <span className="line-prefix error-prefix">[ ERR ]</span>
                <span className="line-text error-text">{line.text}</span>
              </>
            )}
          </div>
        ))}

        {interimText && (
          <div className="terminal-line interim">
            <span className="line-prefix interim-prefix">[ ... ]</span>
            <span className="line-prompt">❯</span>
            <span className="line-text interim-text">{interimText}</span>
          </div>
        )}

        <div className="terminal-cursor-line">
          <span className="cursor-prompt">❯</span>
          <span className="terminal-cursor" />
        </div>

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
