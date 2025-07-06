import React, { useState } from 'react';
import axios from 'axios';
import '../styles/authentication/Login.css';

const api = axios.create({
  baseURL: 'https://gerardify-vercel-backend.vercel.app/api'
});

function Login({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      if (isLogin) {
        // Login flow
        const response = await api.post('/auth/login', {
          email: formData.email,
          password: formData.password
        });
        
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        onLogin(response.data.user);
      } else {
        // Registration flow
        const response = await api.post('/auth/register', formData);
        
        // Show success message and switch to login
        setSuccessMessage('Account created successfully! Please login with your credentials.');
        setIsLogin(true);
        setFormData({
          username: '',
          email: formData.email, // Keep email for convenience
          password: ''
        });
      }
    } catch (error) {
      setError(error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccessMessage('');
    setFormData({
      username: '',
      email: '',
      password: ''
    });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="logo-section">
          <div className="logo-icon">
            <i className="bi bi-music-note"></i>
          </div>
          <h1>Gerardify</h1>
        </div>
        
        <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        
        {successMessage && (
          <div className="success-message">
            {successMessage}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
          )}
          <div className="form-group">
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              name="password"
              placeholder="Password (use a strong password)"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="8"
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Loading...' : (isLogin ? 'Login' : 'Create Account')}
          </button>
        </form>
        <p>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button" 
            onClick={toggleMode}
            className="toggle-button"
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;