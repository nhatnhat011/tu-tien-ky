
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="w-full text-center p-4 -mt-2">
      <h1 className="text-4xl md:text-5xl font-bold text-cyan-300 tracking-wider font-cinzel" style={{ textShadow: '0 0 8px rgba(0, 224, 255, 0.6), 0 0 16px rgba(0, 224, 255, 0.4)' }}>
        Tu Tiên Ký: Hư Vô Lộ
      </h1>
      <p className="text-slate-400 mt-2 text-sm italic">Con đường tu luyện, vạn dặm chông gai...</p>
    </header>
  );
};

export default Header;