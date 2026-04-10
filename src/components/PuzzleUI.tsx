import React, { useState, useEffect, useRef } from 'react';

export const PuzzleUI = ({ puzzle, onSolve }: any) => {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false); // 🔥 NEW: smooth entry
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // 🔥 slight delay for smoother appearance
    const t = setTimeout(() => {
      setVisible(true);
      inputRef.current?.focus();
    }, 150);

    return () => clearTimeout(t);
  }, []);

  const handleSubmit = () => {
    if (input.toLowerCase().trim() === puzzle.answer.toLowerCase()) {
      setError("");
      onSolve();
    } else {
      setError("Incorrect code. Try again.");
      alert("❌ Incorrect Code!");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: '50%',               // 🔥 centered (less disorienting)
      left: '50%',
      transform: `translate(-50%, -50%) scale(${visible ? 1 : 0.95})`,
      opacity: visible ? 1 : 0,
      transition: 'all 0.25s ease',

      width: '85%',
      maxWidth: '420px',
      padding: '25px',
      background: 'rgba(0, 10, 20, 0.95)',
      border: '2px solid #00ffff',
      borderRadius: '15px',
      zIndex: 5000,
      color: '#fff',
      textAlign: 'center',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 0 30px rgba(0,255,255,0.2)'
    }}>

      {/* 🔥 NEW: Marker lock confirmation */}
      <p style={{
        fontSize: '12px',
        color: '#00ffff',
        marginBottom: '8px',
        opacity: 0.8
      }}>
        ✔ Marker detected
      </p>

      <h2 style={{ color: '#00ffff' }}>{puzzle.name}</h2>

      <p style={{ margin: '15px 0' }}>{puzzle.riddle}</p>

      <input 
        ref={inputRef}
        type="text" 
        value={input} 
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter code..." 
        style={{ 
          width: '90%', 
          padding: '12px', 
          borderRadius: '6px',
          border: '1px solid #00ffff',
          outline: 'none',
          fontSize: '16px',
          textAlign: 'center' // 🔥 easier focus
        }} 
      />

      {error && (
        <p style={{ marginTop: '10px', color: '#ff4d4d', fontSize: '14px' }}>
          {error}
        </p>
      )}

      <button onClick={handleSubmit} style={{
        marginTop: '20px',
        padding: '12px 20px',
        background: '#00ffff',
        color: '#000',
        fontWeight: 'bold',
        border: 'none',
        borderRadius: '5px',
        width: '100%',
        fontSize: '16px',
        transition: 'transform 0.1s ease'
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        SUBMIT
      </button>
    </div>
  );
};