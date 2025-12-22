import React, { useState } from 'react';
import './LoginRegisterForm.css';
import { FaUser, FaLock, FaEnvelope } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';

export const LoginRegisterForm = () => {
  // controls which side is visible ('' or ' active')
  const [action, setAction] = useState('');

  // login state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // register state
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState('');
  const navigate = useNavigate();

  // forgot password state
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  
  const registerLink = (e) => {
    e.preventDefault();
    setAction(' active'); // show registration form
    setLoginError('');

    // reset forgot state
    setForgotMode(false);
    setForgotError('');
    setForgotSuccess('');
  };

  const loginLink = (e) => {
    e.preventDefault();
    setAction(''); // show login form
    setRegError('');
    setRegSuccess('');

    // reset forgot state
    setForgotMode(false);
    setForgotError('');
    setForgotSuccess('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword
        })
      });

      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        // 🔴 Banned user case
        if (res.status === 403 && data?.message === 'Your account has been banned.') {
          setLoginError('This account has been banned and cannot log in.');
          return;
        }

        // Other login errors
        setLoginError(data?.message || 'Login failed');
        return;
      }

      // ✅ Success
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('authUser', JSON.stringify(data.user));
      
      // Set login timestamp for welcome card detection
      localStorage.setItem('kitaRideCurrentLogin', Date.now().toString());

      // tell App.jsx that auth changed
      window.dispatchEvent(new Event("auth-changed"));

      // 🔁 Role-based redirect
      if (data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Login error:', err);
      setLoginError('Login failed. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');
    setRegLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUsername,
          password: regPassword,
        })
      });

      if (!res.ok) {
        let msg = 'Registration failed';
        try {
          const data = await res.json();
          if (data?.message) msg = data.message;
        } catch {}
        throw new Error(msg);
      }

      // success → switch back to login, prefill username
      setRegSuccess('Registration successful! You can now log in.');
      setLoginUsername(regUsername);
      setRegPassword('');
      setRegEmail('');

      setAction(''); // slide back to login
    } catch (err) {
      setRegError(err.message || 'Registration failed');
    } finally {
      setRegLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!forgotUsername || !forgotNewPassword || !forgotConfirmPassword) {
      setForgotError('Please fill in all fields.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('New password and confirmation do not match.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: forgotUsername,
          newPassword: forgotNewPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setForgotError(data?.message || 'Failed to reset password.');
        return;
      }

      setForgotSuccess('Password reset successful! You can now log in.');
      // Optionally prefill login username
      setLoginUsername(forgotUsername);

      // Clear fields
      setForgotNewPassword('');
      setForgotConfirmPassword('');
    } catch (err) {
      console.error('Forgot password error:', err);
      setForgotError('Failed to reset password. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className={`wrapper${action}`}>
        {/* LOGIN FORM */}
        <div className="form-box login">
          <form onSubmit={forgotMode ? handleForgotSubmit : handleLoginSubmit}>
            {/* LOGIN MODE */}
            {!forgotMode && (
              <>
                <h1>Login</h1>

                <div className="input-box">
                  <input
                    type="text"
                    placeholder="Username"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                  />
                  <FaUser className="icon" />
                </div>

                <div className="input-box">
                  <input
                    type="password"
                    placeholder="Password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                  <FaLock className="icon" />
                </div>

                {loginError && (
                  <p className="form-error">
                    {loginError}
                  </p>
                )}

                {regSuccess && (
                  <p className="form-success">
                    {regSuccess}
                  </p>
                )}
              </>
            )}

            {/* FORGOT PASSWORD MODE */}
            {forgotMode && (
              <>
                <h1>Reset Password</h1>

                <div className="input-box">
                  <input
                    type="text"
                    placeholder="Username"
                    required
                    value={forgotUsername}
                    onChange={(e) => setForgotUsername(e.target.value)}
                  />
                  <FaUser className="icon" />
                </div>

                <div className="input-box">
                  <input
                    type="password"
                    placeholder="New password"
                    required
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                  />
                  <FaLock className="icon" />
                </div>

                <div className="input-box">
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    required
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  />
                  <FaLock className="icon" />
                </div>

                {forgotError && (
                  <p className="form-error">
                    {forgotError}
                  </p>
                )}

                {forgotSuccess && (
                  <p className="form-success">
                    {forgotSuccess}
                  </p>
                )}
              </>
            )}

            {/* Forgot/back link row */}
            <div className="remember-forgot">
              {!forgotMode ? (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setForgotMode(true);
                    setForgotError('');
                    setForgotSuccess('');
                  }}
                >
                  Forgot Password?
                </a>
              ) : (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setForgotMode(false);
                    setForgotError('');
                    setForgotSuccess('');
                  }}
                >
                  Back to login
                </a>
              )}
            </div>

            {/* Button changes label based on mode */}
            <button
              type="submit"
              className="btn"
              disabled={forgotMode ? forgotLoading : loginLoading}
            >
              {forgotMode
                ? (forgotLoading ? 'Resetting...' : 'Reset Password')
                : (loginLoading ? 'Logging in...' : 'Login')}
            </button>

            <div className="register-link">
              <p>
                Don&apos;t have an account?
                <a href="#" onClick={registerLink}> Register</a>
              </p>
            </div>

            {/* Admin hint */}
            {!forgotMode && (
              <p className="admin-hint">
                Admin user? Log in here and we’ll redirect you to the admin console.
              </p>
            )}
          </form>
        </div>

        {/* REGISTER FORM */}
        <div className="form-box register">
          <form onSubmit={handleRegisterSubmit}>
            <h1>Registration</h1>

            <div className="input-box">
              <input
                type="text"
                placeholder="Username"
                required
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
              />
              <FaUser className="icon" />
            </div>

            <div className="input-box">
              <input
                type="password"
                placeholder="Password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
              />
              <FaLock className="icon" />
            </div>

            {regError && (
              <p className="form-error">
                {regError}
              </p>
            )}

            <button type="submit" className="btn" disabled={regLoading}>
              {regLoading ? 'Registering...' : 'Register'}
            </button>

            <div className="register-link">
              <p>
                Already have an account?
                <a href="#" onClick={loginLink}> Login</a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginRegisterForm;
