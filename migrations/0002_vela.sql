create table if not exists profiles (
  user_id text primary key,
  display_name text not null,
  age integer not null,
  gender text not null,
  seeking text not null,
  bio text not null default '',
  photo_data text,
  created_at timestamptz not null default now()
);

create table if not exists sample_profiles (
  id text primary key,
  display_name text not null,
  age integer not null,
  gender text not null,
  bio text not null,
  hue integer not null,
  tagline text not null
);

create table if not exists wallets (
  user_id text primary key,
  credits integer not null default 0,
  free_texts integer not null default 8
);

create table if not exists conversations (
  id text primary key,
  user_id text not null,
  peer_id text not null,
  peer_kind text not null,
  last_body text not null default '',
  last_at timestamptz not null default now(),
  unique (user_id, peer_id, peer_kind)
);
create index if not exists conversations_user_idx on conversations (user_id);

create table if not exists messages (
  id serial primary key,
  conversation_id text not null,
  sender text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_conv_idx on messages (conversation_id, id);

create table if not exists purchases (
  id serial primary key,
  user_id text not null,
  pack_id text not null,
  credits integer not null,
  amount_cents integer not null,
  created_at timestamptz not null default now()
);

insert into sample_profiles (id, display_name, age, gender, bio, hue, tagline) values
  ('s-mira', 'Mira', 26, 'woman', 'Gallery assistant. Weekends for long walks and terrible movies. Sample profile for the preview — not a real person.', 12, 'City lights'),
  ('s-julian', 'Julian', 29, 'man', 'Chef who still burns toast. Looking for unhurried conversations. Sample profile for the preview — not a real person.', 200, 'Late kitchens'),
  ('s-noor', 'Noor', 24, 'woman', 'Architecture student. Plants, vinyl, rooftop sunsets. Sample profile for the preview — not a real person.', 280, 'Blue hour'),
  ('s-eli', 'Eli', 31, 'man', 'Trail runner and amateur radio. Slow mornings preferred. Sample profile for the preview — not a real person.', 160, 'Open roads'),
  ('s-sasha', 'Sasha', 27, 'nonbinary', 'DJ on Fridays, librarian the rest of the week. Sample profile for the preview — not a real person.', 330, 'After hours'),
  ('s-rafa', 'Rafa', 28, 'man', 'Photographer between cities. Coffee first, plans later. Sample profile for the preview — not a real person.', 28, 'Golden hour')
on conflict (id) do nothing;
