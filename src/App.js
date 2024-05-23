// src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import UploadBOM from './components/UploadBOM';
import TrackMaterial from './components/TrackMaterial';
import UploadMTR from './components/UploadMTR';
import BOMList from './components/BOMList';
import Login from './components/Login';
import Register from './components/Register'; // Import Register component
import './App.css';
import NavBar from './components/NavBar';

const App = () => {
  const [token, setToken] = useState(localStorage.getItem('token') || '');

  const setTokenInStorage = (token) => {
    localStorage.setItem('token', token);
    setToken(token);
  };

  const PrivateRoute = ({ element: Component, ...rest }) => (
    token ? <Component {...rest} token={token} /> : <Navigate to="/login" />
  );

  return (
    <Router>
      <div className="App">
        <NavBar token={token} setToken={setToken} />
        <h1>BOM Tracking Application</h1>
        <Routes>
          <Route path="/login" element={<Login setToken={setTokenInStorage} />} />
          <Route path="/register" element={<Register />} /> {/* Add Register route */}
          <Route path="/" element={<PrivateRoute element={BOMList} />} />
          <Route path="/upload-bom" element={<PrivateRoute element={UploadBOM} />} />
          <Route path="/track-material" element={<PrivateRoute element={TrackMaterial} />} />
          <Route path="/upload-mtr" element={<PrivateRoute element={UploadMTR} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
