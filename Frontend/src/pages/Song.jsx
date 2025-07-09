import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/pages/Song.css';

// axios instance with base URL
const createAuthenticatedApi = () => {
  const token = localStorage.getItem('token');
  return axios.create({
    baseURL: 'https://gerardify-vercel-backend.vercel.app/api',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
};

function Song({ setCurrentSong, setIsPlaying, songs, setSongs, setCurrentPlaylist }) {
  const location = useLocation();
  const navigate = useNavigate();
  const song = location.state?.song;
  const [isEditing, setIsEditing] = useState(false);
  const [editedSong, setEditedSong] = useState(song || {});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState(null);

  const handlePlay = () => {
    if (song) {
      setCurrentSong(song);
      
      if (setCurrentPlaylist && songs) {
        const formattedPlaylist = songs.map(s => ({
          id: s.id,
          title: s.title,
          artist: s.artist,
          duration: s.duration,
          url: s.url
        }));
        setCurrentPlaylist(formattedPlaylist);
      }
      
      setIsPlaying(true);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
  };

  const handleSave = async () => {
    try {
      const api = createAuthenticatedApi();
      const response = await api.put(`/songs/${song.id}`, {
        title: editedSong.title,
        artist: editedSong.artist
      });

      const updatedSong = response.data;
      
      if (updatedSong.isTemporary && song.isPreloaded) {
        // Handle temporary edit - update local state only
        setSongs(prevSongs => {
          return prevSongs.map(s => 
            s.id === song.id 
              ? { 
                  ...s, 
                  title: updatedSong.title, 
                  artist: updatedSong.artist 
                }
              : s
          );
        });
        
        // Store in localStorage for persistence until refresh
        const tempEdits = JSON.parse(localStorage.getItem('tempEditedSongs') || '{}');
        tempEdits[song.id] = {
          title: updatedSong.title,
          artist: updatedSong.artist
        };
        localStorage.setItem('tempEditedSongs', JSON.stringify(tempEdits));
      } else {
        // Handle permanent edit (user song)
        setSongs(prevSongs => {
          const updatedSongs = prevSongs.map(s => 
            s.id === song.id 
              ? { 
                  ...s, 
                  title: updatedSong.title, 
                  artist: updatedSong.artist 
                }
              : s
          );
          return updatedSongs;
        });
      }

      // Update the current song object
      Object.assign(song, {
        title: updatedSong.title,
        artist: updatedSong.artist
      });

      setIsEditing(false);
      navigate('/song', { state: { song } });
    } catch (error) {
      console.error('Error updating song:', error);
      setError('Failed to update song. Please try again.');
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
    setError(null);
  };

  const confirmDelete = async () => {
    try {
      const api = createAuthenticatedApi();
      const response = await api.delete(`/songs/${song.id}`);
      
      if (response.data.isTemporary && song.isPreloaded) {
        // Handle temporary delete
        const updatedSongs = songs.filter(s => s.id !== song.id);
        setSongs(updatedSongs);
        
        // Store in localStorage for persistence until refresh
        const tempDeleted = JSON.parse(localStorage.getItem('tempDeletedSongs') || '[]');
        tempDeleted.push(song.id);
        localStorage.setItem('tempDeletedSongs', JSON.stringify(tempDeleted));
      } else {
        // Handle permanent delete (user song)
        const updatedSongs = songs.filter(s => s.id !== song.id);
        setSongs(updatedSongs);
      }
      
      navigate('/library');
    } catch (error) {
      console.error('Error deleting song:', error);
      setError('Failed to delete song. Please try again.');
      setShowDeleteConfirm(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  if (!song) return <div>No song selected</div>;

  return (
    <div className="song-details">
      <div className="song-header">
        <div className="song-cover">
          <i className="bi bi-music-note"></i>
        </div>
        <div className="song-info">
          {isEditing ? (
            <div className="edit-form">
              <input
                type="text"
                value={editedSong.title}
                onChange={(e) => setEditedSong({...editedSong, title: e.target.value})}
                placeholder="Song title"
              />
              <input
                type="text"
                value={editedSong.artist}
                onChange={(e) => setEditedSong({...editedSong, artist: e.target.value})}
                placeholder="Artist name"
              />
              {error && <p className="error-message">{error}</p>}
              <div className="edit-buttons">
                <button onClick={handleSave}>Save</button>
                <button onClick={() => {
                  setIsEditing(false);
                  setError(null);
                }}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <h1>{song.title}</h1>
              <div className="song-meta">
                <p className="artist">{song.artist}</p>
                <span className="duration">
                  <i className="bi bi-clock"></i> {song.duration}
                </span>
              </div>
              <div className="song-actions">
                <button className="play-button" onClick={handlePlay}>
                  <i className="bi bi-play-fill"></i> Play
                </button>
                <button className="edit-button" onClick={handleEdit}>
                  <i className="bi bi-pencil"></i> Edit
                </button>
                <button className="delete-button" onClick={handleDelete}>
                  <i className="bi bi-trash"></i> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="delete-confirmation-overlay">
          <div className="delete-confirmation">
            <h3>Delete Song</h3>
            <p>Are you sure you want to delete "{song.title}"?</p>
            {error && <p className="error-message">{error}</p>}
            <div className="confirmation-buttons">
              <button className="confirm-delete" onClick={confirmDelete}>
                Yes, Delete
              </button>
              <button className="cancel-delete" onClick={cancelDelete}>
                No, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Song;