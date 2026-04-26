import { useParams } from 'react-router-dom';

// TODO: Implement NoteDetailPage
// Features:
// - Display note title, abstract, tags
// - Render knowledge points (PointCard components)
// - Show associated flashcards (QACard components)
// - Sticky sidebar with table of contents
// - "Enter Review Mode" button

export default function NoteDetailPage() {
  const { id } = useParams();

  return (
    <div className='container mx-auto px-4 py-8'>
      <h1 className='text-3xl font-bold mb-4'>Note Detail</h1>
      <p className='text-muted-foreground'>Note ID: {id}</p>
      <p className='text-muted-foreground'>
        NoteDetailPage - Under Construction
      </p>
    </div>
  );
}
