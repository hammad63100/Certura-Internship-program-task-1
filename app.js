const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('./DBConnection');

// Connect to MongoDB
connectDB();
const app = express();
app.use(express.json());

// Counter Schema for auto-increment
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});
const Counter = mongoose.model('Counter', counterSchema);

// User Schema
const userSchema = new mongoose.Schema({
  id: { type: Number, unique: true }, // auto-incremented id
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  age: { type: Number, required: true },
  lasteducation: { type: String, required: true }
}, { timestamps: true });

// Auto-increment id before saving a new user
userSchema.pre('save', async function (next) {
  if (this.isNew) {
    const counter = await Counter.findByIdAndUpdate(
      { _id: 'userId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.id = counter.seq;
  }
  next();
});

// Transform _id to id in JSON output
userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  }
});

const User = mongoose.model('User', userSchema);

// User Routes

// GET all users
app.get('/users', async (req, res) => {
  try {
    const users = await User.find().sort({ id: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST a new user
app.post('/users', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create user', details: error.message });
  }
});

// PUT update user (find by auto-incremented id)
app.put('/users/:id', async (req, res) => {
  try {
    const updated = await User.findOneAndUpdate({ id: req.params.id * 1 }, req.body, { new: true, runValidators: true });
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update user', details: error.message });
  }
});

// DELETE user (find by auto-incremented id)
app.delete('/users/:id', async (req, res) => {
  try {
    const deleted = await User.findOneAndDelete({ id: req.params.id * 1 });
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
