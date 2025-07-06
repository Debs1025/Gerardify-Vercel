const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// CORS Middleware
app.use((req, res, next) => {
  console.log('Request origin:', req.headers.origin);
  console.log('Request method:', req.method);
  console.log('Request path:', req.path);
  

  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
  
  if (req.method === 'OPTIONS') {
    console.log('Handling preflight request');
    return res.status(200).end();
  }
  
  next();
});

// Check JSON body content type
app.use((req, res, next) => {
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Request body:', req.body);
  next();
});

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://edebelen:MbvUtR5pgAQ2k3q0@erickdebelen.0poxbsq.mongodb.net/gerardify?retryWrites=true&w=majority';
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.connection.on('connected', () => {
  console.log('MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// Cloudinary Configuration
if (process.env.NODE_ENV === 'production') {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('Missing Cloudinary environment variables');
  }
}

if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL
  });
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dbapmmimu2',
    api_key: process.env.CLOUDINARY_API_KEY || '819751423758252',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'kMsHsylKp56yPHHNqFx03DCUwm4',
  });
}

// Create uploads directory if it doesn't exist 
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir) && process.env.NODE_ENV !== 'production') {
  fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'gerardify-songs',
    resource_type: 'auto',
    allowed_formats: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'],
    public_id: (req, file) => `song-${Date.now()}`,
  },
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    fieldSize: 50 * 1024 * 1024
  }
});

// Song Schema
const songSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: String, required: true },
  duration: { type: String, required: true },
  filePath: { type: String, required: true },
  publicId: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Add this line
  createdAt: { type: Date, default: Date.now }
});

const Song = mongoose.model('Song', songSchema);

// Playlist Schema
const playlistSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  artist: { type: String, required: true },
  year: { type: Number, default: () => new Date().getFullYear() },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Add this line
  songs: [{
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Song' },
    title: { type: String, required: true },
    artist: { type: String, required: true },
    duration: { type: String, required: true },
    filePath: { type: String, required: true }
  }],
  createdAt: { type: Date, default: Date.now }
});

const Playlist = mongoose.model('Playlist', playlistSchema);

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'gerardify-project', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Checks if the database is connected
app.get('/api/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'OK', 
    environment: process.env.NODE_ENV || 'development',
    mongodb: mongoStatus,
    timestamp: new Date().toISOString()
  });
});

// Checks if the server is running
app.get('/', (req, res) => {
  res.json({ 
    message: 'Gerardify Backend API',
    status: 'Running',
    endpoints: [
      'GET /api/health',
      'GET /api/songs', 
      'POST /api/songs',
      'GET /api/playlists',
      'POST /api/playlists',
      'GET /api/playlists/:id',
      'POST /api/auth/register',
      'POST /api/auth/login',
    ],
    timestamp: new Date().toISOString()
  });
});

app.post('/api/test', (req, res) => {
  res.json({ message: 'Test route works', body: req.body });
});

//Authentication Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ 
        message: 'Username, email, and password are required' 
      });
    }

    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: 'User with this email or username already exists' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      username,
      email,
      password: hashedPassword
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      'gerardify-project',
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login Route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || 'gerardify-project',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Song Routes
app.post('/api/songs', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    console.log('=== Song Upload Debug ===');
    console.log('Received request from origin:', req.headers.origin);
    console.log('User ID:', req.user.userId);
    console.log('Request body:', req.body);
    console.log('File info:', req.file ? {
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      public_id: req.file.public_id
    } : 'No file');

    const { title, artist, duration } = req.body;

    if (!title || !artist || !duration) {
      console.log('ERROR: Missing required fields');
      return res.status(400).json({ 
        message: 'Missing required fields: title, artist, and duration are required' 
      });
    }

    if (!req.file) {
      console.log('ERROR: No file uploaded');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log('Creating song with filePath:', req.file.path);
    console.log('Cloudinary public_id:', req.file.public_id);
    console.log('Cloudinary filename:', req.file.filename);

    const song = new Song({
      title: title.trim(),
      artist: artist.trim(),
      duration: duration.toString(),
      userId: req.user.userId,
      filePath: req.file.path, 
      publicId: req.file.public_id || req.file.filename
    });

    console.log('Song object before save:', song);

    const savedSong = await song.save();
    console.log('Song saved successfully:', savedSong);
    
    const responseData = {
      _id: savedSong._id,
      title: savedSong.title,
      artist: savedSong.artist,
      duration: savedSong.duration,
      filePath: savedSong.filePath,
      publicId: savedSong.publicId,
      userId: savedSong.userId,
      createdAt: savedSong.createdAt
    };
    
    res.status(201).json(responseData);
  } catch (error) {
    console.error('ERROR in song upload:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    
    // Clean up Cloudinary file if it was uploaded
    if (req.file && req.file.public_id) {
      try {
        await cloudinary.uploader.destroy(req.file.public_id, { resource_type: 'video' });
        console.log('Cleaned up Cloudinary file:', req.file.public_id);
      } catch (cleanupError) {
        console.error('Error cleaning up Cloudinary file:', cleanupError);
      }
    }
    
    // Return proper JSON error response
    res.status(500).json({ 
      message: 'Internal server error during song upload',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Upload failed'
    });
  }
});

// get song by ID
app.put('/api/songs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, artist } = req.body;

    const song = await Song.findOneAndUpdate(
      { _id: id, userId: req.user.userId }, // Only update user's songs
      { title, artist },
      { new: true }
    );

    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    res.json(song);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete song by ID
app.delete('/api/songs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const song = await Song.findOne({ _id: id, userId: req.user.userId });

    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    // Delete from Cloudinary if in production
    if (process.env.NODE_ENV === 'production' && song.publicId) {
      try {
        await cloudinary.uploader.destroy(song.publicId, { resource_type: 'video' });
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
      }
    }

    await Song.findByIdAndDelete(id);
    res.json({ message: 'Song deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all songs of the user
app.get('/api/songs', authenticateToken, async (req, res) => {
  try {
    const songs = await Song.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json(songs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Playlist Routes
app.post('/api/playlists', authenticateToken, async (req, res) => {
  try {
    const { name, artist } = req.body;
    console.log('Creating playlist with data:', { name, artist });
    
    const playlistId = Date.now();
    console.log('Generated playlist ID:', playlistId);
    
    const playlist = new Playlist({
      id: playlistId,
      name,
      artist,
      songs: [],
      userId: req.user.userId 
    });
    
    console.log('New playlist object:', playlist);
    await playlist.save();
    console.log('Saved playlist:', playlist);
    
    res.status(201).json(playlist);
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/playlists', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching playlists for user:', req.user.userId);
    const playlists = await Playlist.find({ userId: req.user.userId }).populate('songs');
    console.log('Found playlists:', playlists);
    res.json(playlists);
  } catch (error) {
    console.error('Error fetching playlists:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/playlists/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching playlist with ID:', id);
    
    const numericId = parseInt(id);
    if (isNaN(numericId)) {
      return res.status(400).json({ message: 'Invalid playlist ID format' });
    }

    const playlist = await Playlist.findOne({ 
      id: numericId, 
      userId: req.user.userId 
    }).populate('songs');
    
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    res.json(playlist);
  } catch (error) {
    console.error('Error fetching playlist:', error);
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/playlists/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, artist } = req.body;

    const playlist = await Playlist.findOneAndUpdate(
      { id: parseInt(id), userId: req.user.userId },
      { name, artist },
      { new: true }
    ).populate('songs');

    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    res.json(playlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/playlists/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const playlist = await Playlist.findOneAndDelete({ 
      id: parseInt(id), 
      userId: req.user.userId 
    });
    
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    res.json({ message: 'Playlist deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add or update songs in a playlist
app.post('/api/playlists/:id/songs', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { songId } = req.body;

    const playlist = await Playlist.findOne({ 
      id: parseInt(id), 
      userId: req.user.userId 
    });
    
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    const song = await Song.findOne({ 
      _id: songId, 
      userId: req.user.userId 
    });
    
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    if (playlist.songs.some(s => s._id.toString() === songId)) {
      return res.status(400).json({ message: 'Song already in playlist' });
    }

    playlist.songs.push({
      _id: song._id,
      title: song.title,
      artist: song.artist,
      duration: song.duration,
      filePath: song.filePath
    });
    
    await playlist.save();
    const updatedPlaylist = await Playlist.findOne({ id: parseInt(id) });
    res.json(updatedPlaylist);
  } catch (error) {
    console.error('Error adding song to playlist:', error);
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/playlists/:id/songs/:songId', authenticateToken, async (req, res) => {
  try {
    const { id, songId } = req.params;

    const playlist = await Playlist.findOne({ 
      id: parseInt(id), 
      userId: req.user.userId 
    });
    
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    playlist.songs = playlist.songs.filter(song => song._id.toString() !== songId);
    await playlist.save();

    const updatedPlaylist = await Playlist.findOne({ id: parseInt(id) });
    res.json(updatedPlaylist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Debug route to list all playlists
app.get('/api/debug/playlists', async (req, res) => {
  try {
    const playlists = await Playlist.find().populate('songs');
    console.log('All playlists:', playlists);
    res.json(playlists);
  } catch (error) {
    console.error('Error fetching all playlists:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/test-config', (req, res) => {
  res.json({
    cloudinary: {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dbapmmimu2',
      api_key: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not set',
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not set',
      cloudinary_url: process.env.CLOUDINARY_URL ? 'Set' : 'Not set'
    },
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    node_env: process.env.NODE_ENV
  });
});

app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  // Handle multer errors
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'File too large' });
    }
    return res.status(400).json({ message: error.message });
  }
  
  // Handle other errors
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Export for Vercel
module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}
