import React, { useState } from 'react';
import axios from 'axios';

const UploadBOM = ({ token }) => {
  const [file, setFile] = useState(null);
  const [job, setJob] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleJobChange = (e) => {
    setJob(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('job', job);

    axios.post('/api/upload-bom', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
      },
    })
      .then(response => {
        alert('BOM uploaded successfully');
      })
      .catch(error => {
        console.error('Error uploading BOM:', error);
        alert('Error uploading BOM');
      });
  };

  return (
    <div>
      <h2>Upload BOM</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Job:</label>
          <input type="text" value={job} onChange={handleJobChange} required />
        </div>
        <div>
          <label>File:</label>
          <input type="file" onChange={handleFileChange} required />
        </div>
        <button type="submit">Upload</button>
      </form>
    </div>
  );
};

export default UploadBOM;
