import React, { useState } from 'react';
import axios from 'axios';

const UploadMTR = ({ token, bomId, onUploadSuccess }) => {
  const [heatNumber, setHeatNumber] = useState('');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file || !heatNumber) {
      setMessage('Heat number and MTR file are required.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bom_id', bomId);
    formData.append('heat_number', heatNumber);

    try {
      const response = await axios.post('/api/mtrs', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      setMessage('MTR uploaded successfully.');
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      setMessage(`Error uploading MTR: ${error.message}`);
      console.error('Error uploading MTR:', error);
    }
  };

  return (
    <div>
      <h2>Upload MTR</h2>
      <input 
        type="text" 
        placeholder="Heat Number" 
        value={heatNumber}
        onChange={(e) => setHeatNumber(e.target.value)}
      />
      <input 
        type="file" 
        onChange={handleFileChange}
      />
      <button onClick={handleUpload}>Upload</button>
      {message && <p>{message}</p>}
    </div>
  );
};

export default UploadMTR;