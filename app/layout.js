// app/layout.js – global layout with dark theme and Inter font

import './globals.css';
import '../styles/globals.css';
import React from 'react';

export const metadata = {
  title: 'Quiz Platform',
  description: 'Premium real‑time quiz application',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className="flex-center" style={{ minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  );
}
