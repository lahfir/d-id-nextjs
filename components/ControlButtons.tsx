'use client';

interface ControlButtonsProps {
  isConnected: boolean;
  isConnecting: boolean;
  onConnect: () => Promise<void>;
  onDisconnect: () => void;
  onClearConversation: () => void;
  disabled?: boolean;
}

export function ControlButtons({
  isConnected,
  isConnecting,
  onConnect,
  onDisconnect,
  onClearConversation,
  disabled = false,
}: ControlButtonsProps) {
  const handleConnect = async () => {
    if (disabled || isConnecting) return;
    await onConnect();
  };

  const handleDisconnect = () => {
    if (disabled) return;
    onDisconnect();
  };

  const handleClearConversation = () => {
    if (disabled) return;
    onClearConversation();
  };

  return (
    <div className="flex flex-col gap-2">
      {!isConnected ? (
        <button
          onClick={handleConnect}
          disabled={disabled || isConnecting}
          className="btn-copper flex items-center justify-center gap-2"
        >
          {isConnecting ? (
            <>
              <div className="w-3 h-3 rounded-full animate-spin" style={{
                border: '2px solid rgba(12, 10, 9, 0.3)',
                borderTopColor: 'var(--bg-primary)',
              }} />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Connect</span>
            </>
          )}
        </button>
      ) : (
        <button
          onClick={handleDisconnect}
          disabled={disabled}
          className="btn-ghost flex items-center justify-center gap-2"
          style={{ color: 'var(--danger)', borderColor: 'rgba(248, 113, 113, 0.2)' }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Disconnect</span>
        </button>
      )}

      <button
        onClick={handleClearConversation}
        disabled={disabled}
        className="btn-ghost flex items-center justify-center gap-2"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span>Clear</span>
      </button>
    </div>
  );
}