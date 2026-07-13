export default function ChatGPTClonePlaceholderPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="p-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-md max-w-md shadow-xl">
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
          ChatGPT Clone Workspace
        </h1>
        <p className="text-sm text-muted-foreground">
          Database, ORM setup, Clerk auth, React Query, and Theme providers are now configured. After next class will build the chat UI and manage the sessions and message accordingly.
        </p>
      </div>
    </div>
  );
}
