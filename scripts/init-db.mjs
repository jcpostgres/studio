// scripts/init-db.mjs
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { schema } from '../src/lib/schema.js';

async function initialize() {
  try {
    const db = await open({
      filename: './database.db',
      driver: sqlite3.Database,
    });

    await db.exec(schema);
    console.log('Database initialized successfully.');

    // Opcional: Insertar un usuario de desarrollo para que las claves foráneas funcionen
    await db.run("INSERT OR IGNORE INTO users (id, name, email) VALUES (?, ?, ?)",
      'dev_user_id',
      'Desarrollador',
      'dev@example.com'
    );
    console.log('Dev user created.');

    await db.close();
  } catch (e) {
    console.error('Failed to initialize database:', e);
  }
}

initialize();
