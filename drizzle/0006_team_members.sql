CREATE TABLE IF NOT EXISTS team_member (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL,
  "group" text NOT NULL DEFAULT 'editorial',
  bio text NOT NULL DEFAULT '',
  photo_id uuid REFERENCES media_asset(id) ON DELETE SET NULL,
  email text,
  phone text,
  order_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_member_visible_idx ON team_member(is_active, "group", order_index);

INSERT INTO team_member (name, role, "group", bio, phone, email, order_index)
SELECT * FROM (VALUES
  ('Euriahs M. Togar', 'Chairman, Department of Communication and Media Studies', 'leadership', 'Euriahs M. Togar is an Assistant Professor and Chair of the Department of Communication and Media Studies, formerly the Mass Communication Department, at the University of Liberia. An academic and media professional, he brings experience in journalism, broadcast management, curriculum development and student mentorship. He holds a master''s degree in communication and information sciences from Tilburg University in the Netherlands, where he is pursuing a PhD. His research examines digital media, youth smartphone use, digital parenting, and journalism and public relations in Liberia. A former Station Manager of Lux FM, he has also served on the Press Union of Liberia''s National Media Council, contributing to media ethics and accountability.', '+231 777 463 864', 'togarem@ul.edu.lr', 10),
  ('Mr. Senyon Kieh', 'Editor-in-Chief and Copy Editor, The Varsity Pilot', 'editorial', 'Senyon Kieh leads The Varsity Pilot newsroom and oversees the newspaper''s editorial operations. He approves content and checks accuracy, grammar, clarity and consistency across student reporting.', '+231 777 435 631', NULL, 10),
  ('Moses Kpakolo', 'News Editor and Digital & Social Media Editor', 'editorial', 'Moses Kpakolo guides reporters, edits stories, publishes reporting online and engages readers across the newspaper''s digital and social platforms.', '+231 770 351 357', NULL, 20),
  ('Moses Cole', 'Multimedia Editor', 'editorial', 'Moses Cole handles photography, video and other visual content for The Varsity Pilot, supporting the newspaper''s shift to multimedia storytelling.', '+231 770 351 357', NULL, 30),
  ('Nicholas Dweh Nimely', 'Faculty Adviser, The Varsity Pilot', 'advisory', 'Nicholas Dweh Nimely provides mentorship and ethical guidance to the student editorial team, helping to uphold professional standards in every story the newspaper publishes.', '+231 776 586 433', NULL, 10)
) AS seed(name, role, "group", bio, phone, email, order_index)
WHERE NOT EXISTS (SELECT 1 FROM team_member);
