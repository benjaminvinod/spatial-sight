import React, { useState } from 'react';

export const PuzzleUI = ({ puzzle, onSolve }: any) => {
  const [input, setInput] = useState("");
  const handleSubmit = () => {
    if (input.toLowerCase().trim() === puzzle.answer.toLowerCase()) {
      onSolve();
    } else {
      alert("❌ Incorrect Code!");
    }
  };

  return (
    <div style={{
      position: 'absolute', top: '25%', left: '10%', width: '80%', padding: '25px',
      background: 'rgba(0, 10, 20, 0.95)', border: '2px solid #00ffff', borderRadius: '15px',
      zIndex: 5000, color: '#fff', textAlign: 'center', backdropFilter: 'blur(10px)'
    }}>
      <h2 style={{ color: '#00ffff' }}>{puzzle.name}</h2>
      <p style={{ margin: '15px 0' }}>{puzzle.riddle}</p>
      <input 
        type="text" 
        value={input} 
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter code..." 
        style={{ width: '90%', padding: '10px', borderRadius: '5px' }} 
      />
      <button onClick={handleSubmit} style={{
        marginTop: '20px', padding: '10px 20px', background: '#00ffff', color: '#000',
        fontWeight: 'bold', border: 'none', borderRadius: '5px', width: '100%'
      }}>SUBMIT</button>
    </div>
  );
};