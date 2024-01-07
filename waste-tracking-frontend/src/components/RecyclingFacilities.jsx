// src/components/RecyclingFacilities.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RecyclingFacilities = ({ userLocation }) => {
  const [facilities, setFacilities] = useState([]);

  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const response = await axios.get(`/api/recycling-facilities?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}`);
        setFacilities(response.data);
      } catch (error) {
        console.error('Error fetching recycling facilities:', error.message);
      }
    };

    fetchFacilities();
  }, [userLocation]);

  return (
    <div>
      <h3>Recycling Facilities Near You</h3>
      <ul>
        {facilities.map((facility) => (
          <li key={facility.id}>{facility.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default RecyclingFacilities;
