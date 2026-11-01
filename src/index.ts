import { mkdirSync } from 'node:fs'
import { Database } from 'bun:sqlite'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/bun'

type Note = {
  id: number
  body: string
  created_at: string
}

mkdirSync('data', { recursive: true })

const app = new Hono()
app.use('*', cors())
app.get('/', (c) => c.text('Hello!'))

app.use('*', cors({
  origin: '*',          
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}))

const db = new Database('data/app.db')

db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`)

app.get('/api/v1/health', (c) => c.json({ ok: true }))

app.get('/api/v1/notes', (c) => {
  const rows = db.query('SELECT id, body, created_at FROM notes ORDER BY id DESC').all() as Note[]
  return c.json({ notes: rows })
})

app.post('/api/v1/notes', async (c) => {
  const body = await c.req.json() as { body?: string }
  if (!body.body || body.body.trim().length === 0) {
    return c.json({ error: 'Note body is required' }, 400)
  }
  const result = db.query('INSERT INTO notes (body) VALUES (?)').run(body.body)
  return c.json({ id: Number(result.lastInsertRowid) }, 201)
})

app.use('/*', serveStatic({ root: './public' }))

// Need to set up a delete endpoint for notes, that accepts an ID parameter and deletes the corresponding note from the database. And returns a message to the user saying the note was deleted.
app.delete('/api/v1/notes/:id', (c) => {
  const id = Number(c.req.param('id'))
  const result = db.query('DELETE FROM notes WHERE id = ?').run(id)
  if (result.changes === 0) {
    return c.json({ error: 'Note not found' }, 404)
  }
  return c.json({ message: 'Note deleted successfully' })
})
//This creates an ID number, and returns it to the client after inserting the new note into the database.

export default {
  port: 3000,
  hostname: '0.0.0.0',
  fetch: app.fetch,
}

// Need an additional "front end" service in Docker Compose that sets up a basic nginx webserver. 



// In order to get the two services to communicate with eachother, you will need to set up CORS in hono. (Cross Origin Resource Sharing) Follow the documentation to make sure CORS works.