const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

const calls = [];
let clients = [];

app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    clients.push(res);

    req.on('close', () => {
        clients = clients.filter(client => client !== res);
    });
});

app.post('/api/call', (req, res) => {
    const callData = req.body;

    delete callData["User-Agent"];

    const existingCallIndex = calls.findIndex(call => call.UID === callData.UID);

    if (existingCallIndex !== -1) {
        calls[existingCallIndex] = callData;
        res.status(200).send('Call updated successfully!');
    } else {
        calls.push(callData);
        res.status(201).send('Call stored successfully!');
    }

    clients.forEach(client =>
        client.write(`data: ${JSON.stringify(calls)}\n\n`)
    );
});

app.get('/calls', (req, res) => {
    res.send(`
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                padding: 20px;
            }
            h1 {
                color: #333;
            }
            .feed {
                background: #fff;
                padding: 20px;
                border-radius: 5px;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .entry {
                border-bottom: 1px solid #eee;
                padding: 15px 0;
            }
            .entry:last-child {
                border-bottom: none;
            }
            .title {
                font-weight: bold;
                margin-bottom: 10px;
            }
        </style>

        <h1>Roxen Article Feeds</h1>
        <div class="feed" id="feed"></div>

        <script>
            const feed = document.getElementById('feed');

            // Create an EventSource connected to our /events endpoint
            const eventSource = new EventSource('/events');

            eventSource.onmessage = function(event) {
                const calls = JSON.parse(event.data);
                feed.innerHTML = calls.map(call => \`
                    <div class="entry">
                        <div class="title">\${call.Title}</div>
                        <div><strong>Path:</strong> \${call.Path}</div>
                        <div><strong>Author:</strong> \${call.Author}</div>
                        <div><strong>Description:</strong> \${call.Description}</div>
                    </div>
                \`).join('');
            };
        </script>
    `);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
