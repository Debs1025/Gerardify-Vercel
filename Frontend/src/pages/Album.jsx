// Pag binuksan ko si album iyo lang to ang mapplay sa music player 

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/pages/Album.css';

// Create axios instance with base URL
const api = axios.create({
  baseURL: 'http://localhost:5000/api'
});

function Album({ setCurrentSong, currentSong, setIsPlaying, playlists, setPlaylists, songs }) {
  const { id } = useParams();
  const numericId = parseInt(id); // Ensure it's a number
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedArtist, setEditedArtist] = useState('');
  const [currentAlbum, setCurrentAlbum] = useState(null);
  const [showAddSongs, setShowAddSongs] = useState(false);
  const [availableSongs, setAvailableSongs] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Set the current album based on the ID 
  useEffect(() => {
    const fetchAlbum = async () => {
      try {
        setIsLoading(true);
        setError(null);
        if (isNaN(numericId)) {
          throw new Error('Invalid playlist ID');
        }
        console.log('Fetching playlist with ID:', numericId);

        const response = await api.get(`/playlists/${numericId}`);
        console.log('Received playlist data:', response.data);

        if (!response.data) {
          throw new Error('No playlist data received');
        }

        const album = response.data;
        setCurrentAlbum(album);
        setEditedName(album.name);
        setEditedArtist(album.artist);
      } catch (error) {
        console.error('Error fetching album:', error);
        setError(error.response?.data?.message || 'Failed to load album. Please try again.');
        if (error.response?.status === 404 || error.message === 'Invalid playlist ID') {
          navigate('/library');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlbum();
  }, [numericId, navigate]);

  // Show available songs to add to the current album
  useEffect(() => {
    if (songs && currentAlbum) {
      const albumSongIds = currentAlbum.songs.map(song => song._id);
      const filtered = songs.filter(song => !albumSongIds.includes(song._id));
      setAvailableSongs(filtered);
    }
  }, [songs, currentAlbum]);

  // Handle editing the album name and artist
  const handleEditClick = () => {
    setIsEditing(true);
    setError(null);
  };

  // Handle saving the edited album name and artist
  const handleSaveEdit = async () => {
    if (editedName.trim() && editedArtist.trim()) {
      try {
        setError(null);
        const response = await api.put(`/playlists/${numericId}`, {
          name: editedName,
          artist: editedArtist
        });

        const updatedAlbum = response.data;
        
        setPlaylists(prevPlaylists => {
          return prevPlaylists.map(playlist => {
            if (playlist.id === numericId) {
              return {
                ...playlist,
                name: updatedAlbum.name,
                artist: updatedAlbum.artist
              };
            }
            return playlist;
          });
        });

        setCurrentAlbum(updatedAlbum);
        setIsEditing(false);
      } catch (error) {
        console.error('Error updating album:', error);
        setError(error.response?.data?.message || 'Failed to update album. Please try again.');
      }
    }
  };

  // Handle deleting the album
  const handleDelete = () => {
    setShowDeleteModal(true);
    setError(null);
  };

  // Confirm delete of the album
  const confirmDelete = async () => {
    try {
      setError(null);
      await api.delete(`/playlists/${numericId}`);
      
      setPlaylists(prevPlaylists => 
        prevPlaylists.filter(playlist => playlist.id !== numericId)
      );
      navigate('/library');
    } catch (error) {
      console.error('Error deleting album:', error);
      setError(error.response?.data?.message || 'Failed to delete album. Please try again.');
      setShowDeleteModal(false);
    }
  };

  // Handle song click to play the song
  const handleSongClick = (song) => {
    console.log('Playing song:', song);
    setCurrentSong({
      id: song._id || song.id,
      title: song.title,
      artist: song.artist,
      duration: song.duration,
      url: `http://localhost:5000/${song.filePath}`
    });
    setIsPlaying(true);
  };

  // Add song to the current album
  const handleAddSong = async (songToAdd) => {
    try {
      setError(null);
      console.log('Adding song to playlist:', songToAdd);
      
      const response = await api.post(`/playlists/${numericId}/songs`, {
        songId: songToAdd._id || songToAdd.id
      });

      console.log('Server response:', response.data);
      const updatedAlbum = response.data;
      setCurrentAlbum(updatedAlbum);
      
      setPlaylists(prevPlaylists => {
        return prevPlaylists.map(playlist => {
          if (playlist.id === numericId) {
            return updatedAlbum;
          }
          return playlist;
        });
      });

      setShowAddSongs(false);
    } catch (error) {
      console.error('Error adding song to album:', error);
      setError(error.response?.data?.message || 'Failed to add song. Please try again.');
    }
  };

  // Remove song from the current album
  const handleRemoveSong = async (songId, e) => {
    e.stopPropagation();
    try {
      setError(null);
      const response = await api.delete(`/playlists/${id}/songs/${songId}`);
      
      const updatedAlbum = response.data;
      setCurrentAlbum(updatedAlbum);
      
      setPlaylists(prevPlaylists => {
        return prevPlaylists.map(playlist => {
          if (playlist.id === parseInt(id)) {
            return updatedAlbum;
          }
          return playlist;
        });
      });
    } catch (error) {
      console.error('Error removing song from album:', error);
      setError('Failed to remove song. Please try again.');
    }
  };

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  // Check if the album exists
  if (!currentAlbum) {
    return <div className="empty-message">Album not found</div>;
  }

  return (
    <div className="album-view">
      <div className="album-header">
        <div className="album-info-wrapper">
          {isEditing ? (
            <div className="edit-form">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="edit-input"
                placeholder="Playlist name"
                autoFocus
              />
              <input
                type="text"
                value={editedArtist}
                onChange={(e) => setEditedArtist(e.target.value)}
                className="edit-input"
                placeholder="Artist name"
              />
              {error && <p className="error-message">{error}</p>}
              <div className="edit-buttons">
                <button className="save-btn" onClick={handleSaveEdit}>
                  <i className="bi bi-check2"></i>
                </button>
                <button className="cancel-btn" onClick={() => {
                  setIsEditing(false);
                  setError(null);
                }}>
                  <i className="bi bi-x"></i>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="album-title-container">
                <h1>{currentAlbum.name}</h1>
                <button className="edit-btn" onClick={handleEditClick}>
                  <i className="bi bi-pencil"></i>
                </button>
              </div>
              <p className="album-info">
                {currentAlbum.artist} • {currentAlbum.year}
              </p>
            </>
          )}
        </div>
        <button className="delete-btn" onClick={handleDelete}>
          <i className="bi bi-trash"></i>
        </button>
      </div>

      {showDeleteModal && (
        <div className="delete-modal">
          <div className="delete-modal-content">
            <h2>Delete Playlist</h2>
            <p>Are you sure you want to delete this playlist?</p>
            {error && <p className="error-message">{error}</p>}
            <div className="delete-modal-buttons">
              <button className="confirm-delete-btn" onClick={confirmDelete}>
                Yes
              </button>
              <button className="cancel-delete-btn" onClick={() => {
                setShowDeleteModal(false);
                setError(null);
              }}>
                No
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="songs-section">
        <div className="songs-header">
          <h2>Songs</h2>
          <button className="add-songs-btn" onClick={() => setShowAddSongs(true)}>
            <i className="bi bi-plus-lg"></i> Add Songs
          </button>
        </div>

        {showAddSongs && (
          <div className="add-songs-modal">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Add Songs to {currentAlbum.name}</h3>
                <button className="close-modal-btn" onClick={() => setShowAddSongs(false)}>
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
              {error && <p className="error-message">{error}</p>}
              <div className="available-songs">
                {availableSongs.length === 0 ? (
                  <p className="empty-message">No songs available to add</p>
                ) : (
                  availableSongs.map(song => (
                    <div key={song._id || song.id} className="available-song-item">
                      <div className="song-info">
                        <span className="song-title">{song.title}</span>
                        <span className="song-artist">{song.artist}</span>
                      </div>
                      <button 
                        className="add-song-btn"
                        onClick={() => handleAddSong(song)}
                      >
                        <i className="bi bi-plus-lg"></i>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <div className="songs-content">
          {currentAlbum.songs.length === 0 ? (
            <p className="empty-message">No songs available</p>
          ) : (
            <div className="songs-list">
              {currentAlbum.songs.map((song, index) => (
                <div 
                  key={song._id || song.id} 
                  className={`song-item ${currentSong?._id === song._id || currentSong?.id === song.id ? 'playing' : ''}`}
                >
                  <div className="song-item-content" onClick={() => handleSongClick(song)}>
                    <span className="song-number">{index + 1}</span>
                    <div className="song-info">
                      <span className="song-title">{song.title}</span>
                      <span className="song-artist">{song.artist}</span>
                    </div>
                    <span className="song-duration">{song.duration}</span>
                  </div>
                  <button 
                    className="remove-song-btn"
                    onClick={(e) => handleRemoveSong(song._id || song.id, e)}
                  >
                    <i className="bi bi-x"></i>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Album;