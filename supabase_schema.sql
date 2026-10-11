-- =========================================================
-- SCHEMA SUPABASE MULTI-UTILISATEURS & AUTHENTIFICATION
-- Application : Organisation & Journal de Pensées IA
-- =========================================================

-- 1. Table des Catégories (Liée à chaque utilisateur)
CREATE TABLE IF NOT EXISTS categories (
  id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#1d4ed8',
  bg_color TEXT NOT NULL DEFAULT '#eff6ff',
  border_color TEXT NOT NULL DEFAULT '#bfdbfe',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

-- 2. Table des Tâches (Liée à chaque utilisateur)
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  title TEXT NOT NULL,
  category_id TEXT,
  horizon TEXT DEFAULT 'todo', -- 'today', 'todo', 'life'
  scheduled_date TEXT, -- 'YYYY-MM-DD' pour programmation sur la semaine
  completed BOOLEAN DEFAULT FALSE,
  cancelled BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  estimated_time TEXT,
  due_date TEXT,
  notes TEXT,
  today_order INT,
  suggested_time_slot TEXT,
  today_phase TEXT,
  today_rationale TEXT,
  is_frog BOOLEAN DEFAULT FALSE,
  subtasks JSONB, -- Tableau d'objets sous-tâches [{ id, title, completed, createdAt }]
  created_at BIGINT NOT NULL,
  PRIMARY KEY (id, user_id)
);

-- 3. Table des Pensées & Journal IA (Liée à chaque utilisateur)
CREATE TABLE IF NOT EXISTS thoughts (
  id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  content TEXT NOT NULL,
  tag TEXT DEFAULT 'Réflexion',
  analysis JSONB,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (id, user_id)
);

-- 4. Table des Citations Favorites (Liée à chaque utilisateur)
CREATE TABLE IF NOT EXISTS favorite_quotes (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  quote TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (quote, user_id)
);

-- 5. Table des Sessions de Brainstorming & Projets IA (Liée à chaque utilisateur)
CREATE TABLE IF NOT EXISTS brainstorm_sessions (
  id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  title TEXT NOT NULL,
  topic TEXT,
  category TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  messages JSONB DEFAULT '[]'::jsonb,
  last_analysis JSONB,
  PRIMARY KEY (id, user_id)
);

-- Activation de Row Level Security (RLS) sur toutes les tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE thoughts ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE brainstorm_sessions ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour Brainstorm Sessions
DROP POLICY IF EXISTS "Users can view own brainstorms" ON brainstorm_sessions;
DROP POLICY IF EXISTS "Users can insert own brainstorms" ON brainstorm_sessions;
DROP POLICY IF EXISTS "Users can update own brainstorms" ON brainstorm_sessions;
DROP POLICY IF EXISTS "Users can delete own brainstorms" ON brainstorm_sessions;

CREATE POLICY "Users can view own brainstorms" ON brainstorm_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own brainstorms" ON brainstorm_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own brainstorms" ON brainstorm_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own brainstorms" ON brainstorm_sessions FOR DELETE USING (auth.uid() = user_id);

-- Politiques RLS pour Categories
DROP POLICY IF EXISTS "Users can view own categories" ON categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON categories;
DROP POLICY IF EXISTS "Users can update own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON categories;

CREATE POLICY "Users can view own categories" ON categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON categories FOR DELETE USING (auth.uid() = user_id);

-- Politiques RLS pour Tasks
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

CREATE POLICY "Users can view own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);

-- Politiques RLS pour Thoughts
DROP POLICY IF EXISTS "Users can view own thoughts" ON thoughts;
DROP POLICY IF EXISTS "Users can insert own thoughts" ON thoughts;
DROP POLICY IF EXISTS "Users can update own thoughts" ON thoughts;
DROP POLICY IF EXISTS "Users can delete own thoughts" ON thoughts;

CREATE POLICY "Users can view own thoughts" ON thoughts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own thoughts" ON thoughts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own thoughts" ON thoughts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own thoughts" ON thoughts FOR DELETE USING (auth.uid() = user_id);

-- Politiques RLS pour Favorite Quotes
DROP POLICY IF EXISTS "Users can view own favorite_quotes" ON favorite_quotes;
DROP POLICY IF EXISTS "Users can insert own favorite_quotes" ON favorite_quotes;
DROP POLICY IF EXISTS "Users can update own favorite_quotes" ON favorite_quotes;
DROP POLICY IF EXISTS "Users can delete own favorite_quotes" ON favorite_quotes;

CREATE POLICY "Users can view own favorite_quotes" ON favorite_quotes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorite_quotes" ON favorite_quotes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own favorite_quotes" ON favorite_quotes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorite_quotes" ON favorite_quotes FOR DELETE USING (auth.uid() = user_id);

-- Trigger automatique pour insérer les catégories par défaut à l'inscription d'un nouvel utilisateur
CREATE OR REPLACE FUNCTION public.handle_new_user_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.categories (id, user_id, name, color, bg_color, border_color)
  VALUES
    ('work', NEW.id, 'Activité Pro & Travail', '#1d4ed8', '#eff6ff', '#bfdbfe'),
    ('leisure', NEW.id, 'Détente & Loisirs', '#7c3aed', '#f5f3ff', '#ddd6fe'),
    ('personal', NEW.id, 'Maison & Quotidien', '#047857', '#ecfdf5', '#a7f3d0'),
    ('health', NEW.id, 'Santé & Bien-être', '#be185d', '#fdf2f8', '#fbcfe8'),
    ('shopping', NEW.id, 'Courses & Achats', '#b45309', '#fffbeb', '#fde68a'),
    ('admin', NEW.id, 'Admin & Finances', '#4338ca', '#eef2ff', '#c7d2fe'),
    ('ideas', NEW.id, 'Idées & Projets', '#0e7490', '#ecfeff', '#a5f3fc'),
    ('calls', NEW.id, 'Appels & Rendez-vous', '#059669', '#f0fdf4', '#bbf7d0')
  ON CONFLICT (id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_categories();
