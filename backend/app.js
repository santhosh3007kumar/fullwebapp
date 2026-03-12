const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Simple JSON file database
const DB_FILE = path.join(__dirname, 'todos.json');

// Initialize database
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([]));
}

const readTodos = () => JSON.parse(fs.readFileSync(DB_FILE));
const writeTodos = (todos) => fs.writeFileSync(DB_FILE, JSON.stringify(todos, null, 2));

app.get('/api/todos', (req, res) => {
  res.json(readTodos());
});

app.post('/api/todos', (req, res) => {
  const todos = readTodos();
  const newTodo = {
    id: Date.now(),
    text: req.body.text,
    done: false
  };
  todos.push(newTodo);
  writeTodos(todos);
  res.json(newTodo);
});

app.put('/api/todos/:id/toggle', (req, res) => {
  const todos = readTodos();
  const todo = todos.find(t => t.id == req.params.id);
  if (todo) {
    todo.done = !todo.done;
    writeTodos(todos);
    res.json(todo);
  } else {
    res.status(404).json({ error: 'Todo not found' });
  }
});

app.delete('/api/todos/:id', (req, res) => {
  const todos = readTodos();
  const newTodos = todos.filter(t => t.id != req.params.id);
  writeTodos(newTodos);
  res.json({ success: true });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
