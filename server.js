require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'registro_votantes',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

app.locals.db = pool;

// Auto-create database and table on startup
(async () => {
    try {
        const initPool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            port: process.env.DB_PORT || 3306,
        });
        await initPool.query(`CREATE DATABASE IF NOT EXISTS registro_votantes CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await initPool.end();

        await pool.query(`
            CREATE TABLE IF NOT EXISTS votantes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(150) NOT NULL,
                apellido VARCHAR(150) NOT NULL,
                cedula VARCHAR(20) UNIQUE NOT NULL,
                direccion TEXT,
                barrio VARCHAR(150),
                local_voto VARCHAR(200),
                celular VARCHAR(20),
                correo VARCHAR(150),
                estado TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('Base de datos y tabla verificadas');
    } catch (err) {
        console.error('Error inicializando BD:', err.message);
    }
})();

// ==================== API ROUTES ====================

// GET all votantes (with search)
app.get('/api/votantes', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { search, page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = 'SELECT * FROM votantes WHERE estado = 1';
        let countQuery = 'SELECT COUNT(*) as total FROM votantes WHERE estado = 1';
        let params = [];
        let countParams = [];

        if (search) {
            const searchClause = ' AND (nombre LIKE ? OR apellido LIKE ? OR cedula LIKE ? OR barrio LIKE ?)';
            query += searchClause;
            countQuery += searchClause;
            const searchParam = `%${search}%`;
            params = [searchParam, searchParam, searchParam, searchParam];
            countParams = [...params];
        }

        query += ' ORDER BY apellido, nombre LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const [rows] = await db.query(query, params);
        const [countRows] = await db.query(countQuery, countParams);

        res.json({
            data: rows,
            total: countRows[0].total,
            page: parseInt(page),
            pages: Math.ceil(countRows[0].total / parseInt(limit))
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error al obtener votantes' });
    }
});

// GET all votantes for export (no pagination)
app.get('/api/votantes/export', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { search } = req.query;
        let query = 'SELECT nombre, apellido, cedula, direccion, barrio, local_voto, celular, correo FROM votantes WHERE estado = 1';
        let params = [];

        if (search) {
            query += ' AND (nombre LIKE ? OR apellido LIKE ? OR cedula LIKE ? OR barrio LIKE ?)';
            const s = `%${search}%`;
            params = [s, s, s, s];
        }

        query += ' ORDER BY apellido, nombre';
        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al exportar datos' });
    }
});

// GET single votante
app.get('/api/votantes/:id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const [rows] = await db.query('SELECT * FROM votantes WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Votante no encontrado' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener votante' });
    }
});

// POST create votante
app.post('/api/votantes', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { nombre, apellido, cedula, direccion, barrio, local_voto, celular, correo } = req.body;

        if (!nombre || !apellido || !cedula) {
            return res.status(400).json({ error: 'Nombre, apellido y cedula son obligatorios' });
        }

        const [result] = await db.query(
            'INSERT INTO votantes (nombre, apellido, cedula, direccion, barrio, local_voto, celular, correo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [nombre, apellido, cedula, direccion, barrio, local_voto, celular, correo]
        );
        res.status(201).json({ id: result.insertId, message: 'Votante registrado exitosamente' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Ya existe un votante con esa cedula' });
        }
        console.error('Error:', error);
        res.status(500).json({ error: 'Error al registrar votante' });
    }
});

// PUT update votante
app.put('/api/votantes/:id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { nombre, apellido, cedula, direccion, barrio, local_voto, celular, correo } = req.body;
        await db.query(
            'UPDATE votantes SET nombre=?, apellido=?, cedula=?, direccion=?, barrio=?, local_voto=?, celular=?, correo=? WHERE id=?',
            [nombre, apellido, cedula, direccion, barrio, local_voto, celular, correo, req.params.id]
        );
        res.json({ message: 'Votante actualizado exitosamente' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Ya existe un votante con esa cedula' });
        }
        res.status(500).json({ error: 'Error al actualizar votante' });
    }
});

// DELETE votante
app.delete('/api/votantes/:id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        await db.query('DELETE FROM votantes WHERE id = ?', [req.params.id]);
        res.json({ message: 'Votante eliminado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar votante' });
    }
});

// Stats
app.get('/api/stats', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const [total] = await db.query('SELECT COUNT(*) as total FROM votantes WHERE estado = 1');
        const [barrios] = await db.query('SELECT barrio, COUNT(*) as total FROM votantes WHERE estado = 1 AND barrio IS NOT NULL AND barrio != "" GROUP BY barrio ORDER BY total DESC LIMIT 10');
        const [locales] = await db.query('SELECT local_voto, COUNT(*) as total FROM votantes WHERE estado = 1 AND local_voto IS NOT NULL AND local_voto != "" GROUP BY local_voto ORDER BY total DESC LIMIT 10');
        res.json({ total: total[0].total, barrios, locales });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener estadisticas' });
    }
});

// Serve HTML
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Start
app.listen(PORT, () => {
    console.log(`\nRegistro de Votantes corriendo en http://localhost:${PORT}\n`);
});
