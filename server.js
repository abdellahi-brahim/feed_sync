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
    const components = req.body;
    const basePath = "https://localhost:8000";

    const formattedComponents = components.map(component => {
        if (component.name === "picture-component" && component.fields["picture-src"]) {
            component.fields["picture-src"] = basePath + component.fields["picture-src"];
        }
        return { 
            name: component.name,
            fields: component.fields 
        };
    });

    const uid = components[0].uuid;

    const callData = {
        UID: uid,
        Title: (formattedComponents.find(comp => comp.name === "header-component") || {}).fields?.title || "No Title",
        Path: basePath,
        Author: "Unknown",
        Description: (formattedComponents.find(comp => comp.name === "header-component") || {}).fields?.subtitle || "No Description",
        formattedComponents: formattedComponents
    };

    const existingCallIndex = calls.findIndex(call => call.UID === uid);

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

app.get('/', (req, res) => {
    res.send(`
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                padding: 20px;
                max-width: 1600px; /* increased to accommodate two news articles side by side */
                margin: auto;
            }
            #feed {
                display: flex;
                flex-wrap: wrap;
                gap: 20px;
            }
            .entry {
                flex: 1 1 calc(50% - 10px); /* take up half the space minus half the gap */
                background-color: #fff;
                padding: 20px;
                border-radius: 5px;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
                animation: popIn 0.4s forwards;
            }
            @keyframes popIn {
                from {
                    transform: scale(0.96);
                    opacity: 0.6;
                }
                to {
                    transform: scale(1);
                    opacity: 1;
                }
            }
            h1 {
                color: #333;
                text-align: center;
                margin-bottom: 20px;
            }
            h2 {
                margin-top: 20px;
            }
            img {
                max-width: 100%;
                border-radius: 5px;
                margin: 20px 0;
            }
            p {
                line-height: 1.6;
            }
            /* Temporary highlight effect */
            .highlight {
                border: 3px solid #FFD700; /* golden color */
                animation: highlightFade 1.5s forwards;
            }
            @keyframes highlightFade {
                to {
                    border-color: transparent;
                }
            }
            .slideIn {
                animation: slideIn 0.4s forwards;
            }
            @keyframes slideIn {
                from {
                    transform: translateY(-100%);
                }
                to {
                    transform: translateY(0);
                }
            }
        </style>

        <div id="feed"></div>

        <script>
            const feed = document.getElementById('feed');
            const eventSource = new EventSource('/events');
            let localCalls = [];

            eventSource.onmessage = function(event) {
                const newCalls = JSON.parse(event.data);
                localCalls = [...newCalls];

                localCalls.forEach(call => {
                    let entry = feed.querySelector(\`.entry[data-uid="\${call.UID}"]\`);

                    // If the call doesn't exist, create it and slide it in from the top.
                    if (!entry) {
                        entry = document.createElement('div');
                        entry.className = 'entry slideIn';
                        entry.dataset.uid = call.UID;
                        feed.insertBefore(entry, feed.firstChild); // Add the new entry at the beginning.
                    }

                    entry.innerHTML = \`
                        <h1>\${call.Title}</h1>
                        <h2>\${call.Description}</h2>
                        \${call.formattedComponents.map(component => {
                            if (component.name === "picture-component") {
                                return \`
                                    <img src="\${component.fields['picture-src']}" alt="Article Image">
                                    <h3>\${component.fields.title}</h3>
                                    <h4>\${component.fields.subtitle}</h4>
                                    <p>\${component.fields.text}</p>
                                \`;
                            }
                            return '';
                        }).join('')}
                    \`;

                    // Apply the highlight effect, indicating an update.
                    entry.classList.add('highlight');
                    setTimeout(() => {
                        entry.classList.remove('highlight');
                        entry.classList.remove('slideIn'); // Remove slideIn class after animation completes
                    }, 1500);
                });
            };
        </script>
    `);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});