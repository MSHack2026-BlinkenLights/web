-- Dummy data for local development. Run via ./seed-database.sh or .\seed-database.ps1.
-- Uses fixed ids and ON CONFLICT DO NOTHING, so running it again is a no-op; the demo game
-- history in game_data is replaced on every run.
-- Demo login: jo@example.com / password123 (all seeded users share this password)

BEGIN;

-- controller
INSERT INTO "controller" ("id", "hardwareId", "location", "name", "width", "height", "latitude", "longitude", "updatedAt") VALUES
  ('01990000-0000-7000-8000-000000000001', 1, 'Prinzipalmarkt, Arkaden am Rathaus', 'Lichtwand Prinzipalmarkt', 16, 16, 51.961800, 7.628100, NOW()),
  ('01990000-0000-7000-8000-000000000002', 2, 'Schloss Münster, Foyer',            'Pad Schlossplatz',          8,  8, 51.963600, 7.613100, NOW()),
  ('01990000-0000-7000-8000-000000000003', 3, 'Stadthafen, Kreativkai',            'Testaufbau Hafen',          3,  3, 51.949500, 7.639500, NOW())
ON CONFLICT ("id") DO NOTHING;

-- game_type
INSERT INTO "game_type" ("id", "key", "name", "description", "requiredWidth", "requiredHeight", "minPlayers", "maxPlayers", "updatedAt") VALUES
  ('01990000-0000-7000-8000-000000000101', 'free-paint',   'Freies Malen',      'Pads antippen und bunt einfärben, so farbenfroh wie die Giebel am Prinzipalmarkt.', 4, 4, 1, 8, NOW()),
  ('01990000-0000-7000-8000-000000000102', 'tic-tac-toe',  'Drei gewinnt',      'Klassisches Drei-in-einer-Reihe für zwei Personen, Münster gegen Umland.',         3, 3, 2, 2, NOW()),
  ('01990000-0000-7000-8000-000000000103', 'snake',        'Leezen-Schlange',   'Lenke die Leezen-Kolonne über die Promenade, sammle Punkte und fahr dir nicht selbst hinten rein.', 8, 8, 1, 1, NOW()),
  ('01990000-0000-7000-8000-000000000104', 'whack-a-mole', 'Hau den Maulwurf',  NULL,                                                                                    8, 8, 1, 4, NOW())
ON CONFLICT ("id") DO NOTHING;

-- game (at most one running game per controller)
INSERT INTO "game" ("id", "controllerId", "gameTypeId", "startedAt", "endedAt", "updatedAt") VALUES
  ('01990000-0000-7000-8000-000000000201', '01990000-0000-7000-8000-000000000001', '01990000-0000-7000-8000-000000000103', NOW() - INTERVAL '2 hours',  NOW() - INTERVAL '110 minutes', NOW()),
  ('01990000-0000-7000-8000-000000000202', '01990000-0000-7000-8000-000000000001', '01990000-0000-7000-8000-000000000101', NOW() - INTERVAL '15 minutes', NULL,                          NOW()),
  ('01990000-0000-7000-8000-000000000203', '01990000-0000-7000-8000-000000000002', '01990000-0000-7000-8000-000000000104', NOW() - INTERVAL '1 day',     NOW() - INTERVAL '23 hours',    NOW()),
  ('01990000-0000-7000-8000-000000000204', '01990000-0000-7000-8000-000000000003', '01990000-0000-7000-8000-000000000102', NOW() - INTERVAL '5 minutes', NULL,                          NOW()),
  ('01990000-0000-7000-8000-000000000205', '01990000-0000-7000-8000-000000000003', '01990000-0000-7000-8000-000000000102', NOW() - INTERVAL '3 hours',   NOW() - INTERVAL '3 hours' + INTERVAL '2 minutes', NOW())
ON CONFLICT ("id") DO NOTHING;

-- game_data is an append-only history of color changes, ordered by UUIDv7 id; "#000000" is off.
-- PostgreSQL 17 has no built-in uuidv7(), so this encodes the change time plus a sequence
-- number that orders changes within the same millisecond. Rerunning replaces the demo history.
CREATE OR REPLACE FUNCTION pg_temp.uuid7(ts TIMESTAMPTZ, seq INTEGER) RETURNS UUID AS $$
  SELECT (
    lpad(to_hex((extract(epoch FROM ts) * 1000)::BIGINT), 12, '0')
    || '7' || lpad(to_hex(seq % 4096), 3, '0')
    || to_hex(8 + floor(random() * 4)::INTEGER)
    || substr(md5(random()::TEXT), 1, 15)
  )::UUID
$$ LANGUAGE sql VOLATILE;

DELETE FROM "game_data" WHERE "gameId" IN (
  '01990000-0000-7000-8000-000000000201', '01990000-0000-7000-8000-000000000202',
  '01990000-0000-7000-8000-000000000203', '01990000-0000-7000-8000-000000000204',
  '01990000-0000-7000-8000-000000000205'
);

-- game_data: running 16x16 game, painted in diagonal stripes, then the main diagonal
-- repainted white and its top left end turned off again
INSERT INTO "game_data" ("id", "gameId", "x", "y", "colorHex", "createdAt")
SELECT pg_temp.uuid7(created_at, seq), '01990000-0000-7000-8000-000000000202', x, y, colorHex, created_at
FROM (
  SELECT x, y, (ARRAY['#FF0000', '#FF8800', '#FFFF00', '#00FF00', '#0088FF', '#8800FF'])[(x + y) % 6 + 1] AS colorHex,
         date_trunc('milliseconds', NOW()) - INTERVAL '14 minutes' AS created_at, y * 16 + x AS seq
  FROM generate_series(0, 15) AS x, generate_series(0, 15) AS y
  UNION ALL
  SELECT i, i, '#FFFFFF', date_trunc('milliseconds', NOW()) - INTERVAL '6 minutes' + i * INTERVAL '2 seconds', 0
  FROM generate_series(0, 15) AS i
  UNION ALL
  SELECT i, i, '#000000', date_trunc('milliseconds', NOW()) - INTERVAL '2 minutes' + i * INTERVAL '1 second', 0
  FROM generate_series(0, 3) AS i
) AS changes;

-- game_data: a short Leezen-Schlange from the ended game, one step per second; the tail
-- turns off again as the head moves on
INSERT INTO "game_data" ("id", "gameId", "x", "y", "colorHex", "createdAt")
SELECT pg_temp.uuid7(created_at, seq), '01990000-0000-7000-8000-000000000201', x, 7, colorHex, created_at
FROM (
  SELECT x, '#00FF00' AS colorHex,
         date_trunc('milliseconds', NOW()) - INTERVAL '115 minutes' + (x - 3) * INTERVAL '1 second' AS created_at, 0 AS seq
  FROM generate_series(3, 12) AS x
  UNION ALL
  SELECT x - 4, '#000000',
         date_trunc('milliseconds', NOW()) - INTERVAL '115 minutes' + (x - 3) * INTERVAL '1 second', 1
  FROM generate_series(7, 12) AS x
) AS changes;

-- game_data: checkerboard on the ended 8x8 game, black squares stay off
INSERT INTO "game_data" ("id", "gameId", "x", "y", "colorHex", "createdAt")
SELECT pg_temp.uuid7(created_at, y * 8 + x), '01990000-0000-7000-8000-000000000203', x, y,
       CASE WHEN (x + y) % 2 = 0 THEN '#FFFFFF' ELSE '#000000' END, created_at
FROM generate_series(0, 7) AS x, generate_series(0, 7) AS y,
     LATERAL (SELECT date_trunc('milliseconds', NOW()) - INTERVAL '1 day' + INTERVAL '1 minute' AS created_at) AS t;

-- game_data: tic tac toe moves on the running 3x3 game, red starts
INSERT INTO "game_data" ("id", "gameId", "x", "y", "colorHex", "createdAt")
SELECT pg_temp.uuid7(created_at, 0), '01990000-0000-7000-8000-000000000204', x, y, colorHex, created_at
FROM (VALUES
  (1, 0, 0, '#FF0000'),
  (2, 1, 1, '#0000FF'),
  (3, 2, 0, '#FF0000')
) AS moves (move, x, y, colorHex),
LATERAL (SELECT date_trunc('milliseconds', NOW()) - INTERVAL '5 minutes' + move * INTERVAL '15 seconds' AS created_at) AS t;

-- game_data: a complete tic tac toe game on the 3x3 controller, red (X) wins the middle row
-- in move 7, then the winning row blinks white
INSERT INTO "game_data" ("id", "gameId", "x", "y", "colorHex", "createdAt")
SELECT pg_temp.uuid7(created_at, x), '01990000-0000-7000-8000-000000000205', x, y, colorHex, created_at
FROM (VALUES
  (1, 1, 1, '#FF0000'),
  (2, 0, 0, '#0000FF'),
  (3, 2, 0, '#FF0000'),
  (4, 0, 2, '#0000FF'),
  (5, 0, 1, '#FF0000'),
  (6, 2, 2, '#0000FF'),
  (7, 2, 1, '#FF0000'),
  (8, 0, 1, '#FFFFFF'), (8, 1, 1, '#FFFFFF'), (8, 2, 1, '#FFFFFF'),
  (9, 0, 1, '#FF0000'), (9, 1, 1, '#FF0000'), (9, 2, 1, '#FF0000')
) AS moves (move, x, y, colorHex),
LATERAL (SELECT date_trunc('milliseconds', NOW()) - INTERVAL '3 hours' + move * INTERVAL '15 seconds' AS created_at) AS t;

-- user (nicknames of different lengths, to test layouts)
INSERT INTO "user" ("id", "name", "email", "emailVerified") VALUES
  ('seed-user-jo',             'Jo',                                                                 'jo@example.com',             true),
  ('seed-user-leeze',          'Leeze',                                                              'leeze@example.com',          true),
  ('seed-user-kiepenkerl',     'Kiepenkerl',                                                         'kiepenkerl@example.com',     false),
  ('seed-user-paettkesfahrer', 'Pättkesfahrer_vom_Aasee_1984',                                       'paettkesfahrer@example.com', true),
  ('seed-user-langername',     'DerAllerlängsteNicknameVomPrinzipalmarktBisZumAaseeUndWiederZurück', 'langername@example.com',     false)
ON CONFLICT ("id") DO NOTHING;

-- account (better-auth credential accounts, password hash of "password123")
INSERT INTO "account" ("id", "accountId", "providerId", "userId", "password", "updatedAt") VALUES
  ('seed-account-jo',             'seed-user-jo',             'credential', 'seed-user-jo',
   '2c0f19b5331dd3400e16f1da5b9b6d68:9f6d6ab0a464d0708d4c5a40bc2e85b843bd4e86b77035082296447b7b57482a3142e107c04b6d1105f123976a16c6dd83f23e40e14b95674644f364b15cc3fc', NOW()),
  ('seed-account-leeze',          'seed-user-leeze',          'credential', 'seed-user-leeze',
   '2c0f19b5331dd3400e16f1da5b9b6d68:9f6d6ab0a464d0708d4c5a40bc2e85b843bd4e86b77035082296447b7b57482a3142e107c04b6d1105f123976a16c6dd83f23e40e14b95674644f364b15cc3fc', NOW()),
  ('seed-account-kiepenkerl',     'seed-user-kiepenkerl',     'credential', 'seed-user-kiepenkerl',
   '2c0f19b5331dd3400e16f1da5b9b6d68:9f6d6ab0a464d0708d4c5a40bc2e85b843bd4e86b77035082296447b7b57482a3142e107c04b6d1105f123976a16c6dd83f23e40e14b95674644f364b15cc3fc', NOW()),
  ('seed-account-paettkesfahrer', 'seed-user-paettkesfahrer', 'credential', 'seed-user-paettkesfahrer',
   '2c0f19b5331dd3400e16f1da5b9b6d68:9f6d6ab0a464d0708d4c5a40bc2e85b843bd4e86b77035082296447b7b57482a3142e107c04b6d1105f123976a16c6dd83f23e40e14b95674644f364b15cc3fc', NOW()),
  ('seed-account-langername',     'seed-user-langername',     'credential', 'seed-user-langername',
   '2c0f19b5331dd3400e16f1da5b9b6d68:9f6d6ab0a464d0708d4c5a40bc2e85b843bd4e86b77035082296447b7b57482a3142e107c04b6d1105f123976a16c6dd83f23e40e14b95674644f364b15cc3fc', NOW())
ON CONFLICT ("id") DO NOTHING;

-- session
INSERT INTO "session" ("id", "expiresAt", "token", "updatedAt", "ipAddress", "userAgent", "userId") VALUES
  ('seed-session-jo', NOW() + INTERVAL '7 days', 'seed-session-token-jo', NOW(), '127.0.0.1', 'seed-script', 'seed-user-jo')
ON CONFLICT ("id") DO NOTHING;

-- verification
INSERT INTO "verification" ("id", "identifier", "value", "expiresAt") VALUES
  ('seed-verification-kiepenkerl', 'kiepenkerl@example.com', 'seed-verification-value', NOW() + INTERVAL '1 day')
ON CONFLICT ("id") DO NOTHING;

-- play_request: two live, the rest spread over the coming days, one already over.
-- Times are refreshed on every run so the "Mitspielen" page never runs empty.
INSERT INTO "play_request" ("id", "hostId", "controllerId", "gameTypeId", "startsAt", "endsAt", "openSlots", "note", "updatedAt") VALUES
  ('01990000-0000-7000-8000-000000000301', 'seed-user-leeze',          '01990000-0000-7000-8000-000000000003', '01990000-0000-7000-8000-000000000102', NOW() - INTERVAL '10 minutes',                   NOW() + INTERVAL '35 minutes',                   1, 'Wer traut sich gegen mich?', NOW()),
  ('01990000-0000-7000-8000-000000000302', 'seed-user-kiepenkerl',     '01990000-0000-7000-8000-000000000001', '01990000-0000-7000-8000-000000000101', NOW() - INTERVAL '20 minutes',                   NOW() + INTERVAL '40 minutes',                   5, NULL,                                    NOW()),
  ('01990000-0000-7000-8000-000000000303', 'seed-user-paettkesfahrer', '01990000-0000-7000-8000-000000000002', '01990000-0000-7000-8000-000000000104', NOW() + INTERVAL '2 hours',                      NOW() + INTERVAL '3 hours',                      3, 'Treffpunkt direkt am Pad im Foyer.',    NOW()),
  ('01990000-0000-7000-8000-000000000304', 'seed-user-langername',     '01990000-0000-7000-8000-000000000001', '01990000-0000-7000-8000-000000000102', NOW() + INTERVAL '1 day 3 hours',               NOW() + INTERVAL '1 day 4 hours',                1, NULL,                                    NOW()),
  ('01990000-0000-7000-8000-000000000305', 'seed-user-jo',             '01990000-0000-7000-8000-000000000002', '01990000-0000-7000-8000-000000000101', NOW() + INTERVAL '4 days',                       NOW() + INTERVAL '4 days 2 hours',               7, 'Bringt gute Laune mit!',                NOW()),
  ('01990000-0000-7000-8000-000000000306', 'seed-user-leeze',          '01990000-0000-7000-8000-000000000001', '01990000-0000-7000-8000-000000000104', NOW() + INTERVAL '12 days',                      NOW() + INTERVAL '12 days 1 hour',               2, NULL,                                    NOW()),
  ('01990000-0000-7000-8000-000000000307', 'seed-user-jo',             '01990000-0000-7000-8000-000000000003', '01990000-0000-7000-8000-000000000102', NOW() - INTERVAL '1 day 2 hours',               NOW() - INTERVAL '1 day 1 hour',                 1, NULL,                                    NOW())
ON CONFLICT ("id") DO UPDATE SET "startsAt" = EXCLUDED."startsAt", "endsAt" = EXCLUDED."endsAt", "updatedAt" = NOW();

-- play_request_participant: 302 has two of five taken, 303 one left, 304 full
INSERT INTO "play_request_participant" ("playRequestId", "userId") VALUES
  ('01990000-0000-7000-8000-000000000302', 'seed-user-paettkesfahrer'),
  ('01990000-0000-7000-8000-000000000302', 'seed-user-jo'),
  ('01990000-0000-7000-8000-000000000303', 'seed-user-leeze'),
  ('01990000-0000-7000-8000-000000000303', 'seed-user-langername'),
  ('01990000-0000-7000-8000-000000000304', 'seed-user-kiepenkerl'),
  ('01990000-0000-7000-8000-000000000307', 'seed-user-leeze')
ON CONFLICT ("playRequestId", "userId") DO NOTHING;

COMMIT;
