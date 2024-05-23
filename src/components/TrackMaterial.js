import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TrackMaterial = ({ token }) => {
  const [materialsData, setMaterialsData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10; // Number of items per page

  useEffect(() => {
    fetchMaterialsData();
  }, [token, currentPage, searchTerm]);

  const fetchMaterialsData = () => {
    axios.get(`/api/materials?page=${currentPage}&limit=${itemsPerPage}&search=${searchTerm}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    .then(response => {
      console.log('Materials data fetched:', response.data.data);
      setMaterialsData(response.data.data);
      setTotalItems(response.data.totalItems);
    })
    .catch(error => {
      console.error('Error fetching materials:', error);
      setMaterialsData([]); // Ensure materialsData is set to an empty array on error
    });
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to the first page when searching
  };

  const filteredMaterialsData = Array.isArray(materialsData) ? materialsData.filter(item => 
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  console.log(`Total Pages: ${totalPages}, Current Page: ${currentPage}, Total Items: ${totalItems}`);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div>
      <h2>Track Materials</h2>
      <input 
        type="text" 
        placeholder="Search by description..." 
        value={searchTerm}
        onChange={handleSearch}
      />
      <table>
        <thead>
          <tr>
            <th>Qty</th>
            <th>Name</th>
            <th>Description</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {filteredMaterialsData.map(item => (
            <tr key={item.id}>
              <td>{item.quantity}</td>
              <td>{item.name}</td>
              <td>{item.description}</td>
              <td>{item.received ? '✓' : 'Pending'}</td>
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
    </div>
  );
};

export default TrackMaterial;
