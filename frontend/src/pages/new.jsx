import React from 'react';
import './LandingPage.css';
import { useNavigate } from 'react-router-dom';
const LandingPage = () => {

  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/create'); // 👈 Navigate to campaign creation
  };

  return (
    <div className="landing-container">
      {/* Hero Section */}
      <header className="hero-section">
        <nav className="navbar">
          <div className="logo">CRMFlow</div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#testimonials">Testimonials</a>
            <a href="#contact">Contact</a>
          </div>
        </nav>
        <div className="hero-content">
          <h1>Supercharge Your Sales with CRMFlow</h1>
          <p>All-in-one CRM to manage customers, track interactions, and close more deals.</p>
          <div className="hero-buttons">
            <button className="primary-btn" handleGetStarted>Get Started</button>
            <button className="secondary-btn">Book a Demo</button>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="features-section">
        <h2>Powerful Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>Contact Management</h3>
            <p>Organize and track your contacts seamlessly.</p>
          </div>
          <div className="feature-card">
            <h3>Sales Pipeline</h3>
            <p>Visualize and manage leads through every stage.</p>
          </div>
          <div className="feature-card">
            <h3>Automation</h3>
            <p>Automate repetitive tasks and focus on selling.</p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="testimonials-section">
        <h2>What Users Say</h2>
        <p>"CRMFlow helped our team close 30% more deals in 3 months!"</p>
        <p>— Alex, Sales Manager at TechCorp</p>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>&copy; 2025 CRMFlow. All rights reserved.</p>
        <div className="footer-links">
          <a href="#privacy">Privacy</a>
          <a href="#terms">Terms</a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
