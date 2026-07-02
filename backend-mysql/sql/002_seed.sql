-- Seed data — default roles, admin/librarian, sample masters
USE school_withleo;

INSERT INTO roles (name, description) VALUES
  ('admin', 'Full access'),
  ('librarian', 'Library management'),
  ('teacher', 'View own issued books'),
  ('student', 'View own profile and books');

-- bcrypt hashes for demo passwords (12 rounds).
-- admin@leo12  → below hash. Librarian@123 → below hash. Change in production.
INSERT INTO users (full_name, email, password_hash, role_id) VALUES
  ('Admin', 'Admin@leo.com',
    '$2b$12$H2b3xN4o6l6qL0P5.YU3zeMOKcZzp1yF1e2Vwc07nT1S8QK7bZv8u',
    (SELECT id FROM roles WHERE name='admin')),
  ('Librarian', 'Librarian@leo.com',
    '$2b$12$Ux6zH8jH3fJ1KpQvLp7oCu2yfCq6r7cS.zZ1YyD5X6VXPS5x4A2Xq',
    (SELECT id FROM roles WHERE name='librarian')),
  ('Teacher', 'Teacher@leo.com',
    '$2b$12$1PjS8gsX9aVJ4o8f9Sm/geqm3o6O2p6oI.iP3M4XU8oT2rF.gc0nS',
    (SELECT id FROM roles WHERE name='teacher'));

INSERT INTO book_types (name) VALUES ('Textbook'),('Reference'),('Journal'),('Novel');
INSERT INTO categories (name) VALUES ('Science'),('Mathematics'),('History'),('Literature'),('Technology');
INSERT INTO languages (name) VALUES ('English'),('Hindi'),('French');
INSERT INTO authors (name) VALUES ('Robert C. Martin'),('Thomas H. Cormen'),('J. K. Rowling');
INSERT INTO publishers (name) VALUES ('Prentice Hall'),('MIT Press'),('Bloomsbury');

INSERT INTO campuses (name, code) VALUES ('Main Campus', 'MAIN');
SET @c := LAST_INSERT_ID();
INSERT INTO buildings (campus_id, name) VALUES (@c,'A'),(@c,'B'),(@c,'C');

INSERT INTO settings (key_name, value) VALUES
  ('fine_per_day', '2'),
  ('loan_days_default', '14'),
  ('school_name', 'School withleo');
