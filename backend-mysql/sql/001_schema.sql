-- ==============================================================
-- School withleo — MySQL 8 schema
-- Import: mysql -u root -p school_withleo < sql/001_schema.sql
-- ==============================================================
SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE DATABASE IF NOT EXISTS school_withleo
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE school_withleo;

-- --------------------------------------------------------------
-- Auth: roles, users, permissions
-- --------------------------------------------------------------
CREATE TABLE roles (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(50) NOT NULL UNIQUE,
  description   VARCHAR(255) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code          VARCHAR(80) NOT NULL UNIQUE,
  description   VARCHAR(255) NULL
);

CREATE TABLE role_permissions (
  role_id       INT UNSIGNED NOT NULL,
  permission_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE users (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(150) NOT NULL,
  email         VARCHAR(190) NOT NULL,
  phone         VARCHAR(20) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id       INT UNSIGNED NOT NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at TIMESTAMP NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL,
  UNIQUE KEY uq_users_email (email),
  FOREIGN KEY (role_id) REFERENCES roles(id),
  INDEX idx_users_role (role_id)
);

CREATE TABLE refresh_tokens (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED NOT NULL,
  token_hash    CHAR(64) NOT NULL UNIQUE,
  expires_at    TIMESTAMP NOT NULL,
  revoked_at    TIMESTAMP NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- --------------------------------------------------------------
-- Library masters
-- --------------------------------------------------------------
CREATE TABLE libraries (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL UNIQUE,
  status        TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE book_types (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE, status TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE, status TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE authors (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE, status TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE publishers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE, status TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE languages (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE, status TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------
-- Location hierarchy: campus → building → floor → room → almirah → rack → shelf
-- --------------------------------------------------------------
CREATE TABLE campuses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL, code VARCHAR(30) NULL,
  status TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_campus_name (name)
);
CREATE TABLE buildings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campus_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL, code VARCHAR(30) NULL,
  status TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_bld (campus_id, name),
  INDEX idx_bld_campus (campus_id),
  FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE CASCADE
);
CREATE TABLE floors (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  building_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL, level_no INT NULL,
  status TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_floor (building_id, name),
  INDEX idx_floor_bld (building_id),
  FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE
);
CREATE TABLE rooms (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  floor_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL, code VARCHAR(30) NULL,
  status TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_room (floor_id, name),
  INDEX idx_room_floor (floor_id),
  FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE CASCADE
);
CREATE TABLE almirahs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  room_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL, code VARCHAR(30) NULL,
  status TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_alm (room_id, name),
  INDEX idx_alm_room (room_id),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);
CREATE TABLE racks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  almirah_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL, code VARCHAR(30) NULL,
  capacity INT UNSIGNED NOT NULL DEFAULT 0,
  status TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_rack (almirah_id, name),
  INDEX idx_rack_alm (almirah_id),
  FOREIGN KEY (almirah_id) REFERENCES almirahs(id) ON DELETE CASCADE
);
CREATE TABLE shelves (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rack_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL, position INT NULL,
  status TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_shelf (rack_id, name),
  INDEX idx_shelf_rack (rack_id),
  FOREIGN KEY (rack_id) REFERENCES racks(id) ON DELETE CASCADE
);

-- --------------------------------------------------------------
-- Books
-- --------------------------------------------------------------
CREATE TABLE books (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  collection_no   BIGINT UNSIGNED NOT NULL UNIQUE AUTO_INCREMENT,
  isbn            VARCHAR(20) NULL,
  title           VARCHAR(300) NOT NULL,
  book_type_id    INT UNSIGNED NULL,
  category_id     INT UNSIGNED NULL,
  author_id       INT UNSIGNED NULL,
  publisher_id    INT UNSIGNED NULL,
  language_id     INT UNSIGNED NULL,
  edition         VARCHAR(50) NULL,
  publishing_year VARCHAR(10) NULL,
  no_of_pages     INT UNSIGNED NULL,
  no_of_copies    INT UNSIGNED NOT NULL DEFAULT 1,
  available_copies INT UNSIGNED NOT NULL DEFAULT 1,
  price           DECIMAL(10,2) NULL,
  mrp             DECIMAL(10,2) NULL,
  cover_image     VARCHAR(500) NULL,
  status          ENUM('available','issued','lost','damaged','retired') NOT NULL DEFAULT 'available',
  purchase_date   DATE NULL,
  created_by      BIGINT UNSIGNED NULL,
  updated_by      BIGINT UNSIGNED NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP NULL,
  UNIQUE KEY uq_book_isbn (isbn),
  INDEX idx_books_title (title),
  INDEX idx_books_cat (category_id),
  INDEX idx_books_auth (author_id),
  FOREIGN KEY (book_type_id) REFERENCES book_types(id),
  FOREIGN KEY (category_id)  REFERENCES categories(id),
  FOREIGN KEY (author_id)    REFERENCES authors(id),
  FOREIGN KEY (publisher_id) REFERENCES publishers(id),
  FOREIGN KEY (language_id)  REFERENCES languages(id)
);

CREATE TABLE book_locations (
  book_id     BIGINT UNSIGNED PRIMARY KEY,
  campus_id   BIGINT UNSIGNED NULL,
  building_id BIGINT UNSIGNED NULL,
  floor_id    BIGINT UNSIGNED NULL,
  room_id     BIGINT UNSIGNED NULL,
  almirah_id  BIGINT UNSIGNED NULL,
  rack_id     BIGINT UNSIGNED NULL,
  shelf_id    BIGINT UNSIGNED NULL,
  position    INT NULL,
  updated_by  BIGINT UNSIGNED NULL,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_bl_rack (rack_id),
  FOREIGN KEY (book_id)     REFERENCES books(id)     ON DELETE CASCADE,
  FOREIGN KEY (campus_id)   REFERENCES campuses(id),
  FOREIGN KEY (building_id) REFERENCES buildings(id),
  FOREIGN KEY (floor_id)    REFERENCES floors(id),
  FOREIGN KEY (room_id)     REFERENCES rooms(id),
  FOREIGN KEY (almirah_id)  REFERENCES almirahs(id),
  FOREIGN KEY (rack_id)     REFERENCES racks(id),
  FOREIGN KEY (shelf_id)    REFERENCES shelves(id)
);

-- --------------------------------------------------------------
-- Members, Issues, Returns, Fines, Transfers, Movements
-- --------------------------------------------------------------
CREATE TABLE members (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  member_code   VARCHAR(30) NOT NULL UNIQUE,
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(190) NULL,
  phone         VARCHAR(20) NULL,
  address       VARCHAR(255) NULL,
  pin_code      VARCHAR(10) NULL,
  member_type   ENUM('student','teacher','staff','other') NOT NULL DEFAULT 'student',
  class_grade   VARCHAR(30) NULL,
  status        TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL,
  UNIQUE KEY uq_member_email (email),
  INDEX idx_member_name (name)
);

CREATE TABLE book_issues (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  book_id       BIGINT UNSIGNED NOT NULL,
  member_id     BIGINT UNSIGNED NOT NULL,
  issued_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_at        TIMESTAMP NOT NULL,
  returned_at   TIMESTAMP NULL,
  fine_amount   DECIMAL(10,2) NOT NULL DEFAULT 0,
  fine_paid     TINYINT(1) NOT NULL DEFAULT 0,
  remarks       VARCHAR(255) NULL,
  issued_by     BIGINT UNSIGNED NULL,
  returned_by   BIGINT UNSIGNED NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_iss_book (book_id),
  INDEX idx_iss_member (member_id),
  INDEX idx_iss_returned (returned_at),
  FOREIGN KEY (book_id)   REFERENCES books(id),
  FOREIGN KEY (member_id) REFERENCES members(id)
);

CREATE TABLE book_transfers (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  book_id       BIGINT UNSIGNED NOT NULL,
  from_rack_id  BIGINT UNSIGNED NULL,
  to_rack_id    BIGINT UNSIGNED NULL,
  from_snapshot JSON NULL,
  to_snapshot   JSON NULL,
  moved_by      BIGINT UNSIGNED NULL,
  moved_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  remarks       VARCHAR(255) NULL,
  INDEX idx_bt_book (book_id),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE book_movements (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  book_id       BIGINT UNSIGNED NOT NULL,
  event_type    ENUM('placed','issue','return','transfer','lost','damaged','deleted','updated') NOT NULL,
  actor_id      BIGINT UNSIGNED NULL,
  actor_name    VARCHAR(150) NULL,
  from_snapshot JSON NULL,
  to_snapshot   JSON NULL,
  remarks       VARCHAR(255) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bm_book (book_id),
  INDEX idx_bm_type (event_type),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- --------------------------------------------------------------
-- Settings, Notifications, Audit logs
-- --------------------------------------------------------------
CREATE TABLE settings (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  key_name      VARCHAR(80) NOT NULL UNIQUE,
  value         TEXT NULL,
  updated_by    BIGINT UNSIGNED NULL,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED NOT NULL,
  title         VARCHAR(150) NOT NULL,
  body          TEXT NULL,
  read_at       TIMESTAMP NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_user (user_id, read_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE audit_logs (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED NULL,
  action        VARCHAR(80) NOT NULL,
  entity        VARCHAR(80) NULL,
  entity_id     VARCHAR(80) NULL,
  detail        TEXT NULL,
  ip_address    VARCHAR(45) NULL,
  user_agent    VARCHAR(255) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user (user_id, created_at),
  INDEX idx_audit_action (action)
);

-- --------------------------------------------------------------
-- Rack inventory view: capacity vs current books
-- --------------------------------------------------------------
CREATE OR REPLACE VIEW rack_inventory AS
SELECT
  r.id AS rack_id,
  r.name AS rack_name,
  r.capacity,
  COALESCE(cnt.current_count, 0) AS current_count,
  GREATEST(r.capacity - COALESCE(cnt.current_count, 0), 0) AS available
FROM racks r
LEFT JOIN (
  SELECT rack_id, COUNT(*) AS current_count
  FROM book_locations
  WHERE rack_id IS NOT NULL
  GROUP BY rack_id
) cnt ON cnt.rack_id = r.id
WHERE r.deleted_at IS NULL;

-- --------------------------------------------------------------
-- Trigger: log every book location change to book_movements
-- --------------------------------------------------------------
DELIMITER $$
CREATE TRIGGER trg_bl_ai AFTER INSERT ON book_locations
FOR EACH ROW BEGIN
  INSERT INTO book_movements(book_id, event_type, actor_id, to_snapshot, remarks)
  VALUES (NEW.book_id, 'placed', NEW.updated_by, JSON_OBJECT('rack_id', NEW.rack_id, 'shelf_id', NEW.shelf_id, 'position', NEW.position), 'Initial placement');
END$$

CREATE TRIGGER trg_bl_au AFTER UPDATE ON book_locations
FOR EACH ROW BEGIN
  IF (OLD.rack_id <=> NEW.rack_id) = 0 OR (OLD.shelf_id <=> NEW.shelf_id) = 0 THEN
    INSERT INTO book_movements(book_id, event_type, actor_id, from_snapshot, to_snapshot, remarks)
    VALUES (NEW.book_id, 'transfer', NEW.updated_by,
      JSON_OBJECT('rack_id', OLD.rack_id, 'shelf_id', OLD.shelf_id, 'position', OLD.position),
      JSON_OBJECT('rack_id', NEW.rack_id, 'shelf_id', NEW.shelf_id, 'position', NEW.position),
      'Location updated');
  END IF;
END$$
DELIMITER ;
