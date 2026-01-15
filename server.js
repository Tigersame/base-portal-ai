const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

// Set Cross-Origin-Opener-Policy header to allow Coinbase/Base Account popups
// This is critical for the smart wallet popup to communicate back to the dapp.
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

// Serve static files from the current directory
app.use(express.static(__dirname));

// Support SPA routing by falling back to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Base Portal AI successfully listening on port ${port}`);
});