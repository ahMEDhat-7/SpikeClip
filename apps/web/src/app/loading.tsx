export default function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <img
          src="/logo.svg"
          alt="Clutch"
          width={120}
          height={120}
          className="drop-shadow-lg"
        />
      </div>
    </div>
  );
}
