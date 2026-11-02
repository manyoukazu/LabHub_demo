CREATE TABLE ideas (
 id TEXT PRIMARY KEY,
 title TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('lab','external','spark')),
 body TEXT NOT NULL DEFAULT '',
 author TEXT NOT NULL DEFAULT '',
 tags TEXT NOT NULL DEFAULT '[]',
 source TEXT NOT NULL DEFAULT '',
 related TEXT NOT NULL DEFAULT '[]',
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX ideas_updated ON ideas(updated_at DESC);
