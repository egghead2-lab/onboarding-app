  -- Profiles (extends Supabase auth.users for both team members and candidates)
  create type user_role as enum ('admin', 'team', 'candidate');

  create table profiles (
    id uuid references auth.users(id) on delete cascade primary key,
    email text not null,
    full_name text,
    role user_role not null default 'candidate',
    created_at timestamptz default now()
  );

  -- Candidates
  create table candidates (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid references profiles(id) on delete set null,
    full_name text not null,
    email text not null unique,
    phone text,
    status text not null default 'pending', -- pending, in_progress, complete, rejected
    assigned_to uuid references profiles(id) on delete set null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );

  -- Requirements (the checklist items your team defines)
  create table requirements (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text,
    requires_document boolean default false,
    category text,
    sort_order integer default 0,
    created_at timestamptz default now()
  );

  -- Candidate checklist (one row per candidate per requirement)
  create table candidate_requirements (
    id uuid primary key default gen_random_uuid(),
    candidate_id uuid references candidates(id) on delete cascade not null,
    requirement_id uuid references requirements(id) on delete cascade not null,
    completed boolean default false,
    completed_at timestamptz,
    completed_by uuid references profiles(id) on delete set null,
    notes text,
    unique(candidate_id, requirement_id)
  );

  -- Documents uploaded by candidates
  create table documents (
    id uuid primary key default gen_random_uuid(),
    candidate_id uuid references candidates(id) on delete cascade not null,
    requirement_id uuid references requirements(id) on delete set null,
    file_name text not null,
    storage_path text not null,
    uploaded_at timestamptz default now()
  );

  -- Tasks assigned to team members
  create table tasks (
    id uuid primary key default gen_random_uuid(),
    candidate_id uuid references candidates(id) on delete cascade not null,
    assigned_to uuid references profiles(id) on delete set null,
    created_by uuid references profiles(id) on delete set null,
    title text not null,
    description text,
    due_date date,
    completed boolean default false,
    completed_at timestamptz,
    created_at timestamptz default now()
  );

  -- Email threads linked to candidates
  create table email_threads (
    id uuid primary key default gen_random_uuid(),
    candidate_id uuid references candidates(id) on delete cascade not null,
    gmail_thread_id text,
    subject text,
    last_message_at timestamptz,
    created_at timestamptz default now()
  );

  -- Auto-update candidates.updated_at
  create or replace function update_updated_at()
  returns trigger as $$
  begin
    new.updated_at = now();
    return new;
  end;
  $$ language plpgsql;

  create trigger candidates_updated_at
    before update on candidates
    for each row execute function update_updated_at();

  -- Auto-create profile when a user signs up
  create or replace function handle_new_user()
  returns trigger as $$
  begin
    insert into profiles (id, email, full_name, role)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'full_name', new.email),
      coalesce((new.raw_user_meta_data->>'role')::user_role, 'candidate')
    );
    return new;
  end;
  $$ language plpgsql security definer;

  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function handle_new_user();

  -- Row Level Security
  alter table profiles enable row level security;
  alter table candidates enable row level security;
  alter table requirements enable row level security;
  alter table candidate_requirements enable row level security;
  alter table documents enable row level security;
  alter table tasks enable row level security;
  alter table email_threads enable row level security;

  -- Profiles: users can read their own, team/admin can read all
  create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
  create policy "Team can view all profiles" on profiles for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'team'))
  );

  -- Candidates: team can do everything, candidates can see only themselves
  create policy "Team can manage candidates" on candidates for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'team'))
  );
  create policy "Candidates can view own record" on candidates for select using (
    profile_id = auth.uid()
  );

  -- Requirements: team can manage, candidates can read
  create policy "Team can manage requirements" on requirements for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'team'))
  );
  create policy "Candidates can view requirements" on requirements for select using (true);

  -- Candidate requirements: team can manage, candidates can view own
  create policy "Team can manage checklist" on candidate_requirements for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'team'))
  );
  create policy "Candidates can view own checklist" on candidate_requirements for select using (
    exists (select 1 from candidates where id = candidate_id and profile_id = auth.uid())
  );

  -- Documents: team can manage, candidates can manage own
  create policy "Team can manage documents" on documents for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'team'))
  );
  create policy "Candidates can manage own documents" on documents for all using (
    exists (select 1 from candidates where id = candidate_id and profile_id = auth.uid())
  );

  -- Tasks: team only
  create policy "Team can manage tasks" on tasks for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'team'))
  );

  -- Email threads: team only
  create policy "Team can manage email threads" on email_threads for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'team'))
  );
