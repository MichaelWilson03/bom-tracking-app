import React, { useState, useEffect } from 'react';
import axios from 'axios';
import UploadMTR from './UploadMTR';

const BOMList = ({ token }) => {
  const [bomData, setBomData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [jobFilter, setJobFilter] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editedQty, setEditedQty] = useState('');
  const [editedUnit, setEditedUnit] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10; // Number of items per page
  const [showUploadMTR, setShowUploadMTR] = useState(false);
  const [currentBomId, setCurrentBomId] = useState(null);

  useEffect(() => {
    fetchBOMData();
  }, [token, currentPage, searchTerm, jobFilter]);

  const fetchBOMData = () => {
    const params = {
      page: currentPage,
      limit: itemsPerPage,
      search: searchTerm,
      job: jobFilter
    };

    axios.get('/api/bom', {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params
    })
    .then(response => {
      setBomData(response.data.data);
      setTotalItems(response.data.totalItems);
    })
    .catch(error => {
      console.error('Error fetching data:', error);
      setBomData([]);
    });
  };

  const handleEdit = (item) => {
    setEditingItem(item.id);
    setEditedQty(item.qty);
    setEditedUnit(item.unit);
    setEditedDescription(item.description);
  };

  const handleSave = () => {
    axios.put(`/api/bom/${editingItem}`, {
      qty: editedQty,
      unit: editedUnit,
      description: editedDescription
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    .then(response => {
      setBomData(bomData.map(item => 
        item.id === editingItem ? response.data : item
      ));
      setEditingItem(null);
      setEditedQty('');
      setEditedUnit('');
      setEditedDescription('');
    })
    .catch(error => {
      console.error('Error updating data:', error);
    });
  };

  const handleCancel = () => {
    setEditingItem(null);
    setEditedQty('');
    setEditedUnit('');
    setEditedDescription('');
  };

  const handleDelete = (id) => {
    axios.delete(`/api/bom/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    .then(() => {
      setBomData(bomData.filter(item => item.id !== id));
    })
    .catch(error => {
      console.error('Error deleting data:', error);
    });
  };

  const handleMarkAsReceived = (id) => {
    axios.put(`/api/bom/${id}/received`, {}, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    .then(response => {
      setBomData(bomData.map(item => 
        item.id === id ? response.data : item
      ));
    })
    .catch(error => {
      console.error('Error marking item as received:', error);
    });
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to the first page when searching
  };

  const handleJobFilter = (e) => {
    setJobFilter(e.target.value);
    setCurrentPage(1); // Reset to the first page when filtering by job
  };

  const handleUploadMTR = (bomId) => {
    setCurrentBomId(bomId);
    setShowUploadMTR(true);
  };

  const handleCloseUploadMTR = () => {
    setShowUploadMTR(false);
    setCurrentBomId(null);
  };

  const handleDownloadMTR = (filePath) => {
    window.open(filePath, '_blank');
  };

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div>
      <h2>BOM List</h2>
      <input 
        type="text" 
        placeholder="Search by description..." 
        value={searchTerm}
        onChange={handleSearch}
      />
      <input 
        type="text" 
        placeholder="Filter by job..." 
        value={jobFilter}
        onChange={handleJobFilter}
      />
      <table>
        <thead>
          <tr>
            <th>Qty</th>
            <th>Unit of Measure</th>
            <th>Description</th>
            <th>Job</th>
            <th>Received</th>
            <th>Heat Numbers</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {bomData.map(item => (
            <tr key={item.id}>
              <td>
                {editingItem === item.id ? (
                  <input 
                    type="text" 
                    value={editedQty} 
                    onChange={(e) => setEditedQty(e.target.value)} 
                  />
                ) : (
                  item.qty
                )}
              </td>
              <td>
                {editingItem === item.id ? (
                  <input 
                    type="text" 
                    value={editedUnit} 
                    onChange={(e) => setEditedUnit(e.target.value)} 
                  />
                ) : (
                  item.unit
                )}
              </td>
              <td>
                {editingItem === item.id ? (
                  <input 
                    type="text" 
                    value={editedDescription} 
                    onChange={(e) => setEditedDescription(e.target.value)} 
                  />
                ) : (
                  item.description
                )}
              </td>
              <td>{item.job}</td>
              <td>
                {item.received ? '✓' : 'Pending'}
              </td>
              <td>
                {item.mtrs && item.mtrs.map(mtr => (
                  <div key={mtr.id}>
                    <a href="#" onClick={() => handleDownloadMTR(mtr.file_path)}>{mtr.heat_number}</a>
                  </div>
                ))}
              </td>
              <td>
                {editingItem === item.id ? (
                  <>
                    <button onClick={handleSave}>Save</button>
                    <button onClick={handleCancel}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleEdit(item)}>Edit</button>
                    <button onClick={() => handleDelete(item.id)}>Delete</button>
                    {!item.received && (
                      <button onClick={() => handleMarkAsReceived(item.id)}>Mark as Received</button>
                    )}
                    <button onClick={() => handleUploadMTR(item.id)}>Upload MTR</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        {Array.from({ length: totalPages }, (_, index) => (
          <button 
            key={index + 1} 
            onClick={() => handlePageChange(index + 1)}
            disabled={currentPage === index + 1}
          >
            {index + 1}
          </button>
        ))}
      </div>
      {showUploadMTR && (
        <div className="upload-mtr-modal">
          <UploadMTR token={token} bomId={currentBomId} />
          <button onClick={handleCloseUploadMTR}>Close</button>
        </div>
      )}
    </div>
  );
};

export default BOMList;
