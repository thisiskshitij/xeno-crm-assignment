import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import CreateCampaignPage from './pages/CreateCampaignPage';
import CampaignHistoryPage from './pages/CampaignHistoryPage';

import './App.css';

function AppLayout() {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  if (isLandingPage) {

    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
      </Routes>
    );
  }

  return (
    <div className="app-container">
      <nav className="top-navbar">CRM App</nav>
      <div className="d-flex">
        <div className="sidebar collapsed">
          <ul className="nav collapsed">
            <li>
              <Link to="/create" className="nav-link">Create Campaign</Link>
            </li>
            <li>
              <Link to="/history" className="nav-link">Campaign History</Link>
            </li>
          </ul>
        </div>
        <div className="content">
          <Routes>
            <Route path="/create" element={<CreateCampaignPage />} />
            <Route path="/history" element={<CampaignHistoryPage />} />
            <Route path="*" element={<CreateCampaignPage />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
