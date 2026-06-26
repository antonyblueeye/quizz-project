// components/Timer.jsx
import React, { useEffect, useState } from 'react';

export default function Timer({ seconds, total }) {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const p = Math.max(0, Math.min(100, ((total - seconds) / total) * 100));
    setPercent(p);
  }, [seconds, total]);

  return (
    <div style={{ width: '100%', background: '#444', borderRadius: '4px', overflow: 'hidden', marginBottom: '1rem' }}>
      <div className="timer-bar" style={{ width: `${percent}%` }}></div>
    </div>
  );
};
