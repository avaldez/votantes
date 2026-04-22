-- =============================================
-- Base de Datos: Registro de Votantes
-- Ejecutar: mysql -u root < schema.sql
-- =============================================

CREATE DATABASE IF NOT EXISTS registro_votantes
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE registro_votantes;

-- =============================================
-- Tabla: votantes
-- =============================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Indices para optimizar busquedas
-- =============================================
CREATE INDEX idx_votantes_nombre ON votantes (nombre);
CREATE INDEX idx_votantes_apellido ON votantes (apellido);
CREATE INDEX idx_votantes_cedula ON votantes (cedula);
CREATE INDEX idx_votantes_barrio ON votantes (barrio);
