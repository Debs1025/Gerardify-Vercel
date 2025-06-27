import React, { useState } from 'react';
import '../styles/pages/Search.css';

function Search() {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="search">
      <h1>Search</h1>
      <div className="search-box">
        <i className="bi bi-search search-icon"></i>
        <input 
          type="text" 
          placeholder="What do you want to listen to?"
          className="search-input"
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            if (e.target.value === '') {
              setIsFocused(false);
            }
          }}
        />
      </div>
    </div>
  );
}

export default Search;