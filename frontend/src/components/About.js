import React from 'react';
import { 
  Brain, Cpu, Globe, Mic, Volume2, Music, MessageSquare, Phone, Mail, 
  Calendar, FileText, Calculator, Search, FolderOpen, Monitor, Zap, 
  Shield, Layers, ArrowRight, ChevronRight, X, Database, Cloud, Code,
  Terminal as TerminalIcon, Workflow, Bot, Sparkles
} from 'lucide-react';
import './About.css';

export default function About({ isOpen, onClose, themeColor }) {
  if (!isOpen) return null;

  return (
    <div className="about-overlay" onClick={onClose}>
      <div className="about-panel" onClick={(e) => e.stopPropagation()}>
        
        {/* Close Button */}
        <button className="about-close" onClick={onClose}>
          <X size={20} />
        </button>

        {/* Scrollable Content */}
        <div className="about-scroll">

          {/* ═══════════════════════════════════════════ */}
          {/* HERO SECTION */}
          {/* ═══════════════════════════════════════════ */}
          <header className="about-hero">
            <div className="hero-badge">
              <Sparkles size={14} />
              <span>AI-POWERED DESKTOP ASSISTANT</span>
            </div>
            <h1 className="hero-title">
              <span className="hero-gradient">KYRAX</span> 1.0
            </h1>
            <p className="hero-subtitle">
              A real-time, voice-controlled AI operating system built for Windows — combining 
              local system automation, browser orchestration, and cloud intelligence into one 
              seamless neural interface.
            </p>
            <div className="hero-stats">
              <div className="stat-card">
                <span className="stat-number">12+</span>
                <span className="stat-label">Native Tools</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">7</span>
                <span className="stat-label">Google APIs</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">3</span>
                <span className="stat-label">Browser Profiles</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">∞</span>
                <span className="stat-label">Possibilities</span>
              </div>
            </div>
          </header>

          {/* ═══════════════════════════════════════════ */}
          {/* WHAT IS KYRAX */}
          {/* ═══════════════════════════════════════════ */}
          <section className="about-section">
            <div className="section-header">
              <Brain size={22} />
              <h2>What is Kyrax?</h2>
            </div>
            <p>
              <strong>Kyrax</strong> is a full-stack, voice-activated AI assistant that runs directly on your 
              Windows PC. Unlike cloud-only assistants (Siri, Alexa, Google Assistant), Kyrax has <em>direct 
              control</em> over your local machine — it can open apps, control volume, manage files, play 
              music on Spotify, send WhatsApp messages, make phone calls with automated voice messages, 
              manage your Google Calendar, Gmail, Tasks, Docs, Sheets, and much more.
            </p>
            <p>
              It combines <strong>three layers of intelligence</strong>: a local tool execution engine 
              (Node.js), a cloud LLM brain (Groq API with Qwen3-32B), and an autonomous workflow 
              orchestrator (n8n) — all tied together through a premium glassmorphic web UI with real-time 
              voice recognition and text-to-speech.
            </p>
          </section>

          {/* ═══════════════════════════════════════════ */}
          {/* ARCHITECTURE DIAGRAM */}
          {/* ═══════════════════════════════════════════ */}
          <section className="about-section">
            <div className="section-header">
              <Layers size={22} />
              <h2>System Architecture</h2>
            </div>
            <div className="architecture-diagram">
              <div className="arch-layer arch-frontend">
                <div className="arch-label">FRONTEND LAYER</div>
                <div className="arch-boxes">
                  <div className="arch-box">
                    <Monitor size={16} />
                    <span>React UI</span>
                  </div>
                  <div className="arch-box">
                    <Mic size={16} />
                    <span>Web Speech API</span>
                  </div>
                  <div className="arch-box">
                    <Volume2 size={16} />
                    <span>TTS Engine</span>
                  </div>
                  <div className="arch-box">
                    <Sparkles size={16} />
                    <span>3D Plasma Blob</span>
                  </div>
                </div>
              </div>
              <div className="arch-arrow">
                <ChevronRight size={20} />
                <span>HTTP / REST</span>
                <ChevronRight size={20} />
              </div>
              <div className="arch-layer arch-backend">
                <div className="arch-label">BACKEND LAYER</div>
                <div className="arch-boxes">
                  <div className="arch-box">
                    <Cpu size={16} />
                    <span>Node.js Server</span>
                  </div>
                  <div className="arch-box">
                    <Code size={16} />
                    <span>Tool Executor</span>
                  </div>
                  <div className="arch-box">
                    <Globe size={16} />
                    <span>Puppeteer</span>
                  </div>
                  <div className="arch-box">
                    <TerminalIcon size={16} />
                    <span>PowerShell</span>
                  </div>
                </div>
              </div>
              <div className="arch-arrow">
                <ChevronRight size={20} />
                <span>API Calls</span>
                <ChevronRight size={20} />
              </div>
              <div className="arch-layer arch-cloud">
                <div className="arch-label">CLOUD LAYER</div>
                <div className="arch-boxes">
                  <div className="arch-box highlight">
                    <Brain size={16} />
                    <span>Groq (Qwen3-32B)</span>
                  </div>
                  <div className="arch-box highlight">
                    <Workflow size={16} />
                    <span>n8n Workflow</span>
                  </div>
                  <div className="arch-box">
                    <Volume2 size={16} />
                    <span>ElevenLabs TTS</span>
                  </div>
                  <div className="arch-box">
                    <Cloud size={16} />
                    <span>Google APIs</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════ */}
          {/* TECH STACK */}
          {/* ═══════════════════════════════════════════ */}
          <section className="about-section">
            <div className="section-header">
              <Code size={22} />
              <h2>Technology Stack</h2>
            </div>
            <div className="tech-grid">
              <div className="tech-category">
                <h4>Frontend</h4>
                <ul>
                  <li><strong>React 18</strong> — Component-based UI framework</li>
                  <li><strong>WebGL / Three.js</strong> — 3D plasma blob visualization</li>
                  <li><strong>Web Speech API</strong> — Real-time voice recognition (STT)</li>
                  <li><strong>Web Audio API</strong> — Microphone access &amp; audio analysis</li>
                  <li><strong>Lucide React</strong> — Icon library for premium UI</li>
                  <li><strong>CSS3 Glassmorphism</strong> — Frosted glass aesthetics</li>
                </ul>
              </div>
              <div className="tech-category">
                <h4>Backend</h4>
                <ul>
                  <li><strong>Node.js + Express</strong> — REST API server on port 5000</li>
                  <li><strong>Puppeteer-Core</strong> — Headless Chrome automation</li>
                  <li><strong>PowerShell</strong> — Windows system control (volume, apps)</li>
                  <li><strong>child_process</strong> — Native OS command execution</li>
                  <li><strong>Axios</strong> — HTTP client for API communication</li>
                  <li><strong>dotenv</strong> — Environment variable management</li>
                </ul>
              </div>
              <div className="tech-category">
                <h4>AI / Cloud</h4>
                <ul>
                  <li><strong>Groq API</strong> — Ultra-fast LLM inference (Qwen3-32B)</li>
                  <li><strong>ElevenLabs</strong> — Neural text-to-speech voices</li>
                  <li><strong>n8n</strong> — Visual workflow automation engine</li>
                  <li><strong>SerpAPI</strong> — Real-time web search integration</li>
                  <li><strong>Google OAuth 2.0</strong> — Secure API authentication</li>
                  <li><strong>Windows SpeechSynthesizer</strong> — Local TTS fallback</li>
                </ul>
              </div>
              <div className="tech-category">
                <h4>Google Suite</h4>
                <ul>
                  <li><strong>Google Calendar API</strong> — Event scheduling</li>
                  <li><strong>Gmail API</strong> — Email read/send/summarize</li>
                  <li><strong>Google Tasks API</strong> — To-do list management</li>
                  <li><strong>Google Docs API</strong> — Note creation &amp; editing</li>
                  <li><strong>Google Sheets API</strong> — Expense tracking</li>
                  <li><strong>Google Drive</strong> — Cloud document storage</li>
                </ul>
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════ */}
          {/* DATA FLOW */}
          {/* ═══════════════════════════════════════════ */}
          <section className="about-section">
            <div className="section-header">
              <Workflow size={22} />
              <h2>Request Processing Flow</h2>
            </div>
            <div className="flow-diagram">
              <div className="flow-step">
                <div className="flow-icon"><Mic size={20} /></div>
                <div className="flow-content">
                  <h5>1. Voice Input</h5>
                  <p>User speaks a command. Web Speech API converts speech to text in real-time.</p>
                </div>
              </div>
              <div className="flow-connector"><ArrowRight size={16} /></div>
              <div className="flow-step">
                <div className="flow-icon"><Globe size={20} /></div>
                <div className="flow-content">
                  <h5>2. Backend Relay</h5>
                  <p>Transcript is sent via POST to <code>/api/chat</code> on the Node.js server.</p>
                </div>
              </div>
              <div className="flow-connector"><ArrowRight size={16} /></div>
              <div className="flow-step">
                <div className="flow-icon"><Brain size={20} /></div>
                <div className="flow-content">
                  <h5>3. LLM Reasoning</h5>
                  <p>Groq's Qwen3-32B analyzes the request with the system prompt and decides which tool to call.</p>
                </div>
              </div>
              <div className="flow-connector"><ArrowRight size={16} /></div>
              <div className="flow-step">
                <div className="flow-icon"><Zap size={20} /></div>
                <div className="flow-content">
                  <h5>4. Tool Execution</h5>
                  <p>The selected tool runs locally (PowerShell, Puppeteer) or remotely (n8n webhook, Google APIs).</p>
                </div>
              </div>
              <div className="flow-connector"><ArrowRight size={16} /></div>
              <div className="flow-step">
                <div className="flow-icon"><Bot size={20} /></div>
                <div className="flow-content">
                  <h5>5. Response Synthesis</h5>
                  <p>Tool result is fed back to the LLM, which generates a natural language summary.</p>
                </div>
              </div>
              <div className="flow-connector"><ArrowRight size={16} /></div>
              <div className="flow-step">
                <div className="flow-icon"><Volume2 size={20} /></div>
                <div className="flow-content">
                  <h5>6. Voice Output</h5>
                  <p>ElevenLabs TTS (or browser fallback) speaks the response. Terminal displays the text.</p>
                </div>
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════ */}
          {/* CAPABILITIES TABLE */}
          {/* ═══════════════════════════════════════════ */}
          <section className="about-section">
            <div className="section-header">
              <Zap size={22} />
              <h2>Full Capabilities Matrix</h2>
            </div>
            <div className="table-wrapper">
              <table className="capabilities-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Capability</th>
                    <th>Tool Used</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td rowSpan="3"><strong>System Control</strong></td>
                    <td>Open any Windows application</td><td><code>open_application</code></td><td className="tag local">Local</td></tr>
                  <tr><td>Close running applications</td><td><code>close_application</code></td><td className="tag local">Local</td></tr>
                  <tr><td>Set system volume (0-100%)</td><td><code>set_volume</code></td><td className="tag local">Local</td></tr>
                  
                  <tr><td rowSpan="2"><strong>System Info</strong></td>
                    <td>Get CPU, RAM, GPU, OS details</td><td><code>get_system_info</code></td><td className="tag local">Local</td></tr>
                  <tr><td>List files &amp; folders in directories</td><td><code>list_directory</code></td><td className="tag local">Local</td></tr>
                  
                  <tr><td rowSpan="2"><strong>File Mgmt</strong></td>
                    <td>Create files and folders</td><td><code>manage_files</code></td><td className="tag local">Local</td></tr>
                  <tr><td>Read and write file contents</td><td><code>manage_files</code></td><td className="tag local">Local</td></tr>

                  <tr><td rowSpan="2"><strong>Browser</strong></td>
                    <td>Open any website/URL in Chrome</td><td><code>open_website</code></td><td className="tag local">Local</td></tr>
                  <tr><td>Close specific browser tabs</td><td><code>close_specific_tab</code></td><td className="tag local">Local</td></tr>

                  <tr><td rowSpan="3"><strong>Spotify</strong></td>
                    <td>Open Spotify Web Player</td><td><code>spotify_control</code></td><td className="tag browser">Browser</td></tr>
                  <tr><td>Search for songs/artists</td><td><code>spotify_control</code></td><td className="tag browser">Browser</td></tr>
                  <tr><td>Auto-play songs (click play)</td><td><code>spotify_control</code></td><td className="tag browser">Browser</td></tr>

                  <tr><td rowSpan="2"><strong>WhatsApp</strong></td>
                    <td>Send messages to contacts</td><td><code>send_whatsapp_message</code></td><td className="tag browser">Browser</td></tr>
                  <tr><td>Fuzzy contact name matching</td><td><code>send_whatsapp_message</code></td><td className="tag browser">Browser</td></tr>

                  <tr><td rowSpan="2"><strong>Phone Calls</strong></td>
                    <td>Dial contacts via Phone Link</td><td><code>phone_call</code></td><td className="tag local">Local</td></tr>
                  <tr><td>Auto-speak message on call via TTS</td><td><code>phone_call</code></td><td className="tag local">Local</td></tr>

                  <tr><td rowSpan="3"><strong>Email</strong></td>
                    <td>Read &amp; summarize emails</td><td><code>n8n_agent → Gmail</code></td><td className="tag cloud">Cloud</td></tr>
                  <tr><td>Send emails with subject/body</td><td><code>n8n_agent → Gmail</code></td><td className="tag cloud">Cloud</td></tr>
                  <tr><td>Reply to specific emails</td><td><code>n8n_agent → Gmail</code></td><td className="tag cloud">Cloud</td></tr>

                  <tr><td rowSpan="3"><strong>Calendar</strong></td>
                    <td>Create events with title/time</td><td><code>n8n_agent → Calendar</code></td><td className="tag cloud">Cloud</td></tr>
                  <tr><td>View upcoming events</td><td><code>n8n_agent → Calendar</code></td><td className="tag cloud">Cloud</td></tr>
                  <tr><td>Get specific event details</td><td><code>n8n_agent → Calendar</code></td><td className="tag cloud">Cloud</td></tr>

                  <tr><td rowSpan="3"><strong>Tasks</strong></td>
                    <td>Create new to-do items</td><td><code>n8n_agent → Tasks</code></td><td className="tag cloud">Cloud</td></tr>
                  <tr><td>List all current tasks</td><td><code>n8n_agent → Tasks</code></td><td className="tag cloud">Cloud</td></tr>
                  <tr><td>Delete completed tasks</td><td><code>n8n_agent → Tasks</code></td><td className="tag cloud">Cloud</td></tr>

                  <tr><td rowSpan="2"><strong>Notes</strong></td>
                    <td>Create Google Docs notes</td><td><code>n8n_agent → Docs</code></td><td className="tag cloud">Cloud</td></tr>
                  <tr><td>Append text to existing docs</td><td><code>n8n_agent → Docs</code></td><td className="tag cloud">Cloud</td></tr>

                  <tr><td rowSpan="2"><strong>Expenses</strong></td>
                    <td>Log expenses to Google Sheets</td><td><code>n8n_agent → Sheets</code></td><td className="tag cloud">Cloud</td></tr>
                  <tr><td>Query expense history/totals</td><td><code>n8n_agent → Sheets</code></td><td className="tag cloud">Cloud</td></tr>

                  <tr><td rowSpan="2"><strong>Web Search</strong></td>
                    <td>Search the web for current info</td><td><code>n8n_agent → SerpAPI</code></td><td className="tag cloud">Cloud</td></tr>
                  <tr><td>Get live prices, news, facts</td><td><code>n8n_agent → SerpAPI</code></td><td className="tag cloud">Cloud</td></tr>

                  <tr><td><strong>Calculator</strong></td>
                    <td>Math calculations &amp; conversions</td><td><code>n8n_agent → Calculator</code></td><td className="tag cloud">Cloud</td></tr>

                  <tr><td><strong>Q&amp;A</strong></td>
                    <td>Answer general knowledge questions</td><td><code>LLM Direct</code></td><td className="tag ai">AI</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ═══════════════════════════════════════════ */}
          {/* BROWSER PROFILES */}
          {/* ═══════════════════════════════════════════ */}
          <section className="about-section">
            <div className="section-header">
              <Shield size={22} />
              <h2>Isolated Browser Profile System</h2>
            </div>
            <p>
              Kyrax uses <strong>three independent Chrome browser profiles</strong> to prevent cross-service 
              contamination. Each profile maintains its own login sessions, cookies, and cache — so Spotify, 
              WhatsApp, and Email never interfere with each other.
            </p>
            <div className="profile-grid">
              <div className="profile-card">
                <Music size={28} />
                <h5>.spotify_profile</h5>
                <p>Dedicated Spotify Web Player session. Supports tab reuse and intelligent playback automation.</p>
              </div>
              <div className="profile-card">
                <MessageSquare size={28} />
                <h5>.wa_profile</h5>
                <p>Persistent WhatsApp Web session. Maintains QR code login across restarts with fuzzy contact matching.</p>
              </div>
              <div className="profile-card">
                <Mail size={28} />
                <h5>.email_profile</h5>
                <p>Gmail Web session for direct browser-based email operations independent of the n8n API integration.</p>
              </div>
            </div>
            <div className="info-callout">
              <Zap size={16} />
              <span>Each profile has its own <strong>zombie process cleanup</strong> system using Windows WMI 
              (Get-CimInstance) to safely terminate locked Chrome instances without affecting other profiles or 
              the user's personal Chrome browser.</span>
            </div>
          </section>

          {/* ═══════════════════════════════════════════ */}
          {/* N8N INTEGRATION */}
          {/* ═══════════════════════════════════════════ */}
          <section className="about-section">
            <div className="section-header">
              <Workflow size={22} />
              <h2>n8n Workflow Integration</h2>
            </div>
            <p>
              Complex multi-step tasks (calendar, email, tasks, notes, expenses, web search, calculations) 
              are delegated to a dedicated <strong>n8n AI Agent workflow</strong> running locally on port 5678. 
              The workflow uses an internal Groq-powered LLM to autonomously decide which Google APIs to call 
              and in what order.
            </p>
            <div className="n8n-flow">
              <div className="n8n-node">
                <span className="n8n-type">Trigger</span>
                <span className="n8n-name">Webhook</span>
              </div>
              <div className="n8n-arrow">→</div>
              <div className="n8n-node">
                <span className="n8n-type">AI</span>
                <span className="n8n-name">AI Agent</span>
              </div>
              <div className="n8n-arrow">→</div>
              <div className="n8n-node">
                <span className="n8n-type">Memory</span>
                <span className="n8n-name">Buffer Window</span>
              </div>
              <div className="n8n-arrow">→</div>
              <div className="n8n-node">
                <span className="n8n-type">Output</span>
                <span className="n8n-name">Respond</span>
              </div>
            </div>
            <p style={{marginTop: 16, fontSize: '0.85rem', opacity: 0.7}}>
              Connected tools: SerpAPI, Calculator, Google Calendar (×3), Gmail (×3), Google Sheets (×2), 
              Google Docs (×3), Google Tasks (×4)
            </p>
          </section>

          {/* ═══════════════════════════════════════════ */}
          {/* PROJECT STRUCTURE */}
          {/* ═══════════════════════════════════════════ */}
          <section className="about-section">
            <div className="section-header">
              <FolderOpen size={22} />
              <h2>Project File Structure</h2>
            </div>
            <div className="file-tree">
              <pre>{`Kyrax_1.0/
├── frontend/                    # React Frontend Application
│   └── src/
│       ├── App.js               # Main app component & state management
│       ├── App.css              # Global layout styles
│       ├── index.css            # CSS variables, fonts, theme tokens
│       └── components/
│           ├── Navbar.js/.css    # Navigation bar + Settings + Reset
│           ├── Terminal.js/.css  # Voice I/O terminal interface
│           ├── Status.js/.css    # System diagnostics panel
│           ├── BackgroundUI.js   # Ambient sci-fi background elements
│           ├── blob.js          # WebGL 3D plasma blob visualization
│           └── About.js/.css    # This documentation page
│
├── backend/                     # Node.js Backend Server
│   ├── server.js                # Express server, LLM loop, TTS
│   ├── tools.js                 # 12 tool definitions + executors
│   ├── spotify_skill.js         # Puppeteer Spotify automation
│   ├── whatsapp_skill.js        # Puppeteer WhatsApp automation
│   ├── email_skill.js           # Puppeteer Gmail automation
│   ├── productivity.js          # Local data management utilities
│   ├── contacts.json            # Contact name → phone mapping
│   └── data/                    # Local JSON data stores
│       ├── notes.json
│       ├── tasks.json
│       ├── expenses.json
│       └── calendar.json
│
├── n8n/                         # n8n Workflow Integration
│   ├── kyrax.json               # Exported n8n workflow definition
│   └── app.py                   # Streamlit test interface
│
└── .env                         # API keys (GROQ, ELEVENLABS)`}</pre>
            </div>
          </section>

          {/* ═══════════════════════════════════════════ */}
          {/* EXAMPLE COMMANDS */}
          {/* ═══════════════════════════════════════════ */}
          <section className="about-section">
            <div className="section-header">
              <TerminalIcon size={22} />
              <h2>Example Voice Commands</h2>
            </div>

            <div className="examples-grid">
              <div className="example-category">
                <h4><Monitor size={16} /> System Control</h4>
                <ul>
                  <li>"Jarvis, open Camera"</li>
                  <li>"Jarvis, open Calculator"</li>
                  <li>"Jarvis, close Notepad"</li>
                  <li>"Jarvis, set volume to 40%"</li>
                  <li>"Jarvis, mute the system"</li>
                  <li>"Jarvis, what are my laptop specs?"</li>
                </ul>
              </div>

              <div className="example-category">
                <h4><Globe size={16} /> Web &amp; Browser</h4>
                <ul>
                  <li>"Jarvis, open YouTube and search React tutorials"</li>
                  <li>"Jarvis, search Google for latest AI news"</li>
                  <li>"Jarvis, open GitHub"</li>
                  <li>"Jarvis, close the YouTube tab"</li>
                </ul>
              </div>

              <div className="example-category">
                <h4><Music size={16} /> Spotify</h4>
                <ul>
                  <li>"Jarvis, open Spotify and play Bohemian Rhapsody"</li>
                  <li>"Jarvis, play Mere Rang Mein Rangne Wali"</li>
                  <li>"Jarvis, search for Arijit Singh on Spotify"</li>
                </ul>
              </div>

              <div className="example-category">
                <h4><MessageSquare size={16} /> WhatsApp</h4>
                <ul>
                  <li>"Jarvis, send a WhatsApp message to Royal Ravish saying 'Meeting at 5 PM'"</li>
                  <li>"Jarvis, message Akshat on WhatsApp: 'Project is ready'"</li>
                </ul>
              </div>

              <div className="example-category">
                <h4><Phone size={16} /> Phone Calls</h4>
                <ul>
                  <li>"Jarvis, call Gautam Sharma"</li>
                  <li>"Jarvis, call Gorry and tell him I'm busy today"</li>
                  <li>"Jarvis, call Royal Ravish and say the meeting is postponed to tomorrow"</li>
                </ul>
              </div>

              <div className="example-category">
                <h4><Calendar size={16} /> Calendar</h4>
                <ul>
                  <li>"Jarvis, schedule a meeting for tomorrow at 4 PM called Team Sync"</li>
                  <li>"Jarvis, what events do I have this week?"</li>
                  <li>"Jarvis, create a 2-hour event on Monday at 10 AM titled Project Review"</li>
                </ul>
              </div>

              <div className="example-category">
                <h4><Mail size={16} /> Email</h4>
                <ul>
                  <li>"Jarvis, send an email to john@example.com about the project update"</li>
                  <li>"Jarvis, read my latest emails"</li>
                  <li>"Jarvis, summarize my unread emails"</li>
                </ul>
              </div>

              <div className="example-category">
                <h4><FileText size={16} /> Tasks &amp; Notes</h4>
                <ul>
                  <li>"Jarvis, add a task: Buy groceries by Saturday"</li>
                  <li>"Jarvis, list all my tasks"</li>
                  <li>"Jarvis, create a note titled Meeting Minutes with today's discussion points"</li>
                </ul>
              </div>

              <div className="example-category">
                <h4><Database size={16} /> Expenses</h4>
                <ul>
                  <li>"Jarvis, log an expense of ₹500 for lunch under Food"</li>
                  <li>"Jarvis, log $750 for office supplies under Business"</li>
                  <li>"Jarvis, what's my total expense this month?"</li>
                </ul>
              </div>

              <div className="example-category">
                <h4><Search size={16} /> Web Search &amp; Q&amp;A</h4>
                <ul>
                  <li>"Jarvis, what's the current price of Bitcoin?"</li>
                  <li>"Jarvis, search the web for latest iPhone release date"</li>
                  <li>"Jarvis, calculate 15% of $89,000"</li>
                  <li>"Jarvis, what is quantum computing?"</li>
                  <li>"Jarvis, explain the difference between React and Angular"</li>
                </ul>
              </div>

              <div className="example-category full-width">
                <h4><Sparkles size={16} /> Multi-Step Workflows</h4>
                <ul>
                  <li>"Jarvis, search the web for Bitcoin price, calculate 10% of it, add a task called 'Review investments', log an expense of $500 for server costs, create a note with the Bitcoin data, schedule a meeting for tomorrow at 3 PM, and email everything to me"</li>
                  <li>"Jarvis, check my calendar for this week, summarize my unread emails, and create a task for anything urgent"</li>
                </ul>
              </div>

              <div className="example-category full-width">
                <h4><FolderOpen size={16} /> File Management</h4>
                <ul>
                  <li>"Jarvis, list all files on my desktop"</li>
                  <li>"Jarvis, create a folder called 'Project Alpha' on the desktop"</li>
                  <li>"Jarvis, create a file called notes.txt with 'Here are my notes' inside it"</li>
                </ul>
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════ */}
          {/* FOOTER */}
          {/* ═══════════════════════════════════════════ */}
          <footer className="about-footer">
            <div className="footer-line"></div>
            <p>Built with ♥ by <strong>Gautam Sharma</strong></p>
            <p className="footer-version">KYRAX v1.0 — Neural Desktop Operating System</p>
          </footer>

        </div>
      </div>
    </div>
  );
}
