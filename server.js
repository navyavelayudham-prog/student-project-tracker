/* START: server.js */
import express from 'express';

const app = express();

// Parse JSON request bodies with a size limit
app.use(express.json({ limit: '10kb' }));

// Serve static files from public folder
app.use(express.static('public'));

// Health check API route
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Open http://localhost:${port}`));
/* END: server.js */