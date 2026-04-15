
-- Add subscription_type to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_type text DEFAULT 'free';

-- Documents table
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  topic text NOT NULL,
  format text NOT NULL,
  level text NOT NULL,
  depth text NOT NULL,
  pages integer DEFAULT 0,
  content text DEFAULT '',
  table_of_contents text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own docs" ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own docs" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own docs" ON public.documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own docs" ON public.documents FOR DELETE USING (auth.uid() = user_id);

-- Imported documents table
CREATE TABLE public.imported_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_name text NOT NULL,
  content text DEFAULT '',
  page_count integer DEFAULT 0,
  theme text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.imported_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own imports" ON public.imported_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own imports" ON public.imported_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own imports" ON public.imported_documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own imports" ON public.imported_documents FOR DELETE USING (auth.uid() = user_id);

-- Evaluations table
CREATE TABLE public.evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id text NOT NULL,
  document_title text NOT NULL,
  content text DEFAULT '',
  answers_content text DEFAULT '',
  depth text DEFAULT '',
  format text DEFAULT '',
  completed boolean DEFAULT false,
  score integer,
  total_questions integer DEFAULT 25,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own evals" ON public.evaluations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own evals" ON public.evaluations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own evals" ON public.evaluations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own evals" ON public.evaluations FOR DELETE USING (auth.uid() = user_id);

-- Chat messages table
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id text NOT NULL,
  document_title text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own chats" ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chats" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own chats" ON public.chat_messages FOR DELETE USING (auth.uid() = user_id);

-- Highlights table
CREATE TABLE public.highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id text NOT NULL,
  text_content text NOT NULL,
  start_offset integer NOT NULL,
  end_offset integer NOT NULL,
  page_number integer DEFAULT 1,
  color text DEFAULT 'yellow',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own highlights" ON public.highlights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own highlights" ON public.highlights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own highlights" ON public.highlights FOR DELETE USING (auth.uid() = user_id);

-- Generation queue table
CREATE TABLE public.generation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  level text NOT NULL,
  format text NOT NULL,
  depth text NOT NULL,
  target_pages integer DEFAULT 15,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'paused', 'completed', 'failed')),
  progress integer DEFAULT 0,
  current_step text DEFAULT '',
  pages_generated integer DEFAULT 0,
  partial_content text DEFAULT '',
  partial_toc text DEFAULT '',
  table_of_contents_input text DEFAULT '',
  reference_content text,
  document_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.generation_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own queue" ON public.generation_queue FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own queue" ON public.generation_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own queue" ON public.generation_queue FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own queue" ON public.generation_queue FOR DELETE USING (auth.uid() = user_id);
