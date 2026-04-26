// TODO: Implement Sidebar
// Features:
// - Table of contents navigation
// - Sticky positioning
// - "Enter Review Mode" button
// - Active section highlighting

export default function Sidebar() {
  return (
    <aside className='hidden lg:block w-[280px] sticky top-24 h-[calc(100vh-120px)] overflow-y-auto'>
      <div className='p-4'>
        <h3 className='font-semibold mb-4'>目录</h3>
        <p className='text-sm text-muted-foreground'>
          Sidebar - Under Construction
        </p>
      </div>
    </aside>
  );
}
