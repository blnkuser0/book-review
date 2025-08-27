


<!-- SQL SCHEMA -->
This is the SQL schema 

```sql
CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    author VARCHAR(100),
    genre VARCHAR(50),
    title VARCHAR(100),
    review TEXT,
    rating INT,
    image_path VARCHAR(255),
    user_id INT REFERENCES users(id),
    is_private BOOLEAN DEFAULT FALSE
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    firstname VARCHAR(45),
    lastname VARCHAR(45),
    email VARCHAR(45) UNIQUE NOT NULL,
    password VARCHAR(100),
    photo TEXT
);