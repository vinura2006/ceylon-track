const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const pool = require('./db/pool');

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

function setupWebSocket(server) {
  const wss = new WebSocketServer({ 
    server, 
    path: '/ws',
    maxPayload: 65536 // 64 KB limit to prevent large payload Denial of Service
  });
  const clients = new Map();

  wss.on('connection', (ws, req) => {
    let userId = null;
    let userRole = null;
    let subscribedTrains = new Set();
    let clientId = null;

    // Validate Origin header
    const origin = req.headers.origin;
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && origin && origin !== process.env.CORS_ORIGIN) {
        console.warn(`[SECURITY] WS connection rejected from unauthorized origin: ${origin}`);
        ws.close(4003, 'Unauthorized origin');
        return;
    }

    const closeConnection = () => {
      if (clientId) clients.delete(clientId);
    };

    let messageCount = 0;
    let rateLimitResetTime = Date.now() + 60000;

    ws.on('message', async (raw) => {
      // Simple rate limiting: 100 messages per minute per connection
      if (Date.now() > rateLimitResetTime) {
          messageCount = 0;
          rateLimitResetTime = Date.now() + 60000;
      }
      messageCount++;
      if (messageCount > 100) {
          ws.send(JSON.stringify({ type: 'error', error: 'Rate limit exceeded. Too many WebSocket requests.' }));
          ws.close(4029, 'Rate limit exceeded');
          return;
      }
      try {
        const msg = JSON.parse(raw.toString());
        const { type } = msg;

        switch (type) {
          case 'auth': {
            try {
              const decoded = jwt.verify(msg.token, JWT_SECRET);
              userId = decoded.userId;
              userRole = decoded.role;
              clientId = `${userId}-${Date.now()}`;
              clients.set(clientId, { ws, userId, userRole, subscribedTrains });
              ws.send(JSON.stringify({ type: 'auth_ok', clientId }));
            } catch (e) {
              ws.send(JSON.stringify({ type: 'auth_error', error: 'Invalid token' }));
            }
            break;
          }

          case 'subscribe_train': {
            if (!userId) return;
            const trainId = String(msg.trainId);
            subscribedTrains.add(trainId);
            if (clientId && clients.has(clientId)) {
              clients.get(clientId).subscribedTrains = subscribedTrains;
            }
            ws.send(JSON.stringify({ type: 'subscribed', trainId }));
            break;
          }

          case 'unsubscribe_train': {
            const id = String(msg.trainId);
            subscribedTrains.delete(id);
            break;
          }

          case 'gps_update': {
            if (!userId || !userRole || (userRole !== 'staff' && userRole !== 'admin')) {
              ws.send(JSON.stringify({ type: 'error', error: 'Unauthorized for GPS broadcast' }));
              return;
            }
            const { trainId, trainName, latitude, longitude, accuracy, speed, heading, timestamp } = msg;
            if (!trainId || latitude == null || longitude == null) {
              ws.send(JSON.stringify({ type: 'error', error: 'trainId, latitude, and longitude required' }));
              return;
            }

            try {
              await pool.query(
                `INSERT INTO live_train_sessions 
                   (schedule_id, staff_id, last_latitude, last_longitude, last_accuracy, last_speed, last_heading, last_updated_at, is_active)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), true)
                 ON CONFLICT DO NOTHING`,
                [trainId, userId, latitude, longitude, accuracy || null, speed || null, heading || null]
              );

              await pool.query(
                `UPDATE live_train_sessions SET 
                   last_latitude = $3, last_longitude = $4, last_accuracy = $5,
                   last_speed = $6, last_heading = $7, last_updated_at = NOW()
                 WHERE schedule_id = $1 AND staff_id = $2 AND is_active = true`,
                [trainId, userId, latitude, longitude, accuracy || null, speed || null, heading || null]
              );
            } catch (e) {
              console.error('GPS update DB error:', e.message);
            }

            broadcastToAll({
              type: 'train_update',
              trainId: String(trainId),
              trainName: trainName || '',
              latitude, longitude, accuracy, speed, heading, timestamp
            });
            break;
          }

          case 'session_ended': {
            const { trainId } = msg;
            try {
              await pool.query(
                `UPDATE live_train_sessions SET is_active = false, session_ended_at = NOW() 
                 WHERE schedule_id = $1 AND staff_id = $2 AND is_active = true`,
                [trainId, userId]
              );
            } catch (e) {
              console.error('Session end DB error:', e.message);
            }
            broadcastToAll({
              type: 'train_offline',
              trainId: String(trainId)
            });
            break;
          }
        }
      } catch (e) {
        console.error('WS message error:', e.message);
      }
    });

    ws.on('close', () => {
      if (userId && subscribedTrains.size > 0) {
        setTimeout(async () => {
          const active = await pool.query(
            `SELECT 1 FROM live_train_sessions WHERE staff_id = $1 AND is_active = true LIMIT 1`,
            [userId]
          );
          if (active.rowCount === 0) {
            for (const trainId of subscribedTrains) {
              broadcastToAll({ type: 'train_offline', trainId: String(trainId) });
            }
          }
        }, 30000);
      }
      closeConnection();
    });

    ws.on('error', () => {
      closeConnection();
    });
  });

  function broadcastToAll(message) {
    const data = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.ws.readyState === 1 && client.userId) {
        try { client.ws.send(data); } catch (e) {}
      }
    });
  }

  function broadcastToUser(targetUserId, message) {
    const data = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.ws.readyState === 1 && client.userId === targetUserId) {
        try { client.ws.send(data); } catch (e) {}
      }
    });
  }

  return { broadcastToAll, broadcastToUser };
}

module.exports = { setupWebSocket };
