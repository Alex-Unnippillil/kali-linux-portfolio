import type { GetServerSideProps } from 'next';
import { getAnonSupabaseServer } from '../lib/supabase.server';

interface NotesPageProps {
  notes: unknown[] | null;
  error?: string;
}

export const getServerSideProps: GetServerSideProps<NotesPageProps> = async () => {
  const supabase = getAnonSupabaseServer();
  const { data, error } = await supabase.from('notes').select();

  if (error) {
    return {
      props: {
        notes: null,
        error: error.message,
      },
    };
  }

  return {
    props: {
      notes: data ?? null,
    },
  };
};

export default function NotesPage({ notes, error }: NotesPageProps) {
  if (error) {
    return <pre>{JSON.stringify({ error }, null, 2)}</pre>;
  }

  return <pre>{JSON.stringify(notes, null, 2)}</pre>;
}

