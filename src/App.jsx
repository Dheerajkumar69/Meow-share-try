import { useState } from 'react';
import './App.css';
import Sender from './components/Sender';
import Receiver from './components/Receiver';

function App() {
  const [mode, setMode] = useState('sender');

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">🐱</span>
          <h1>Meow Share</h1>
        </div>
        <p className="tagline">Share photos instantly with a simple code</p>
      </header>

      <div className="mode-selector">
        <button
          className={`mode-btn ${mode === 'sender' ? 'active' : ''}`}
          onClick={() => setMode('sender')}
        >
          📤 Send Photos
        </button>
        <button
          className={`mode-btn ${mode === 'receiver' ? 'active' : ''}`}
          onClick={() => setMode('receiver')}
        >
          📥 Receive Photos
        </button>
      </div>

      <main className="app-main">
        {mode === 'sender' ? <Sender /> : <Receiver />}
      </main>

      <footer className="app-footer">
        <p>Photos expire after 24 hours • Maximum 200 MB per session</p>
      </footer>
    </div>
  );
}

export default App;
