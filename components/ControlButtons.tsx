'use client';

interface ControlButtonsProps {
  isConnected: boolean;
  isConnecting: boolean;
  onConnect: () => Promise<void>;
  onDisconnect: () => void;
  onClearConversation: () => void;
  disabled?: boolean;
}

/**
 * Component for connection and control buttons with minimal design
 */
export function ControlButtons({
  isConnected,
  isConnecting,
  onConnect,
  onDisconnect,
  onClearConversation,
  disabled = false,
}: ControlButtonsProps) {

  /**
   * Handles connect button click
   */
  const handleConnect = async () => {
    if (disabled || isConnecting) return;
    await onConnect();
  };

  /**
   * Handles disconnect button click
   */
  const handleDisconnect = () => {
    if (disabled) return;
    onDisconnect();
  };

  /**
   * Handles clear conversation button click
   */
  const handleClearConversation = () => {
    if (disabled) return;
    onClearConversation();
  };

  return (
    <div className="flex flex-col space-y-2">
      {/* Connect/Disconnect Button */}
      {!isConnected ? (
        <button
          onClick={handleConnect}
          disabled={disabled || isConnecting}
          className="px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-500/30 disabled:bg-white/5 disabled:cursor-not-allowed disabled:text-white/30 disabled:border-white/10 transition-all duration-200 text-sm font-medium flex items-center justify-center space-x-2"
        >
          {isConnecting ? (
            <>
              <div className="w-3 h-3 border border-green-400/50 border-t-green-400 rounded-full animate-spin"></div>
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Connect</span>
            </>
          )}
        </button>
      ) : (
        <button
          onClick={handleDisconnect}
          disabled={disabled}
          className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30 disabled:bg-white/5 disabled:cursor-not-allowed disabled:text-white/30 disabled:border-white/10 transition-all duration-200 text-sm font-medium flex items-center justify-center space-x-2"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Disconnect</span>
        </button>
      )}

      {/* Clear Conversation Button */}
      <button
        onClick={handleClearConversation}
        disabled={disabled}
        className="px-4 py-2 bg-white/10 border border-white/20 text-white/80 rounded-lg hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed disabled:text-white/30 disabled:border-white/10 transition-all duration-200 text-sm font-medium flex items-center justify-center space-x-2"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span>Clear</span>
      </button>
    </div>
  );
}