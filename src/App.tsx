import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Landing } from './pages/Landing';
import { Pools } from './pages/Pools';
import { Trade } from './pages/Trade';
import { Liquidity } from './pages/Liquidity';
import { AddLiquidity } from './pages/AddLiquidity';
import { RemoveLiquidity } from './pages/RemoveLiquidity';
import { NotificationContainer } from './components/common/Notification';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-black">
        <NotificationContainer />
        <Header />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/pools" element={<Pools />} />
          <Route path="/trade" element={<Trade />} />
          <Route path="/liquidity" element={<Liquidity />} />
          <Route path="/liquidity/add" element={<AddLiquidity />} />
          <Route path="/liquidity/remove" element={<RemoveLiquidity />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
