import React, { useState, useEffect } from 'react';
import '../styles/pages/Search.css';

function Search({ setCurrentSong, setIsPlaying }) {
  const [isFocused, setIsFocused] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [songs, setSongs] = useState([]);
  const [filteredSongs, setFilteredSongs] = useState([]);

  useEffect(() => {
    // Fetch preloaded songs from backend
    fetch('https://gerardify-vercel-backend.vercel.app/api/preloaded-songs')
      .then(res => res.json())
      .then(data => setSongs(data))
      .catch(err => console.error('Failed to fetch preloaded songs:', err));
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredSongs([]);
      return;
    }
    const lower = searchTerm.toLowerCase();
    setFilteredSongs(
      songs.filter(song =>
        song.title.toLowerCase().includes(lower) ||
        song.artist.toLowerCase().includes(lower)
      )
    );
  }, [searchTerm, songs]);

  const handlePlay = (song) => {
    if (setCurrentSong && setIsPlaying) {
      // Map song to expected structure for the player and log for debugging
      const mappedSong = {
        id: song.id || song._id,
        title: song.title,
        artist: song.artist,
        duration: song.duration,
        url: song.filePath || song.url,
        publicId: song.publicId,
        isPreloaded: song.isPreloaded !== undefined ? song.isPreloaded : true
      };
      console.log('Playing song from search:', mappedSong);
      setCurrentSong(mappedSong);
      setIsPlaying(true);
    } else {
      console.warn('setCurrentSong or setIsPlaying not provided');
    }
  };

  return (
    <div className="search">
      <h1>Search</h1>
      <div className="search-box">
        <i className="bi bi-search search-icon"></i>
        <input 
          type="text" 
          placeholder="What do you want to listen to?"
          className="search-input"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={e => {
            if (e.target.value === '') setIsFocused(false);
          }}
        />
      </div>
      {filteredSongs.length > 0 && (
        <div className="search-results">
          {filteredSongs.map(song => (
            <div key={song.id || song._id} className="search-result-item song-row" style={{cursor: 'pointer'}}>
              <div className="song-row-main">
                <span className="search-play-icon" onClick={() => handlePlay(song)}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="4,3 15,9 4,15" fill="#e040a2" />
                  </svg>
                </span>
                <div className="song-details-col" style={{flex: 1}}>
                  <span className="search-song-title">{song.title}</span>
                  <div className="search-song-artist-row">
                    {song.explicit && (
                      <span className="explicit-badge">E</span>
                    )}
                    <span className="search-song-artist">{song.artist}</span>
                  </div>
                </div>
                <span className="search-song-duration">{song.duration}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Search;