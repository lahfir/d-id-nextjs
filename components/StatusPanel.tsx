'use client';

interface StatusPanelProps {
  connectionStatus: {
    status: 'connecting' | 'connected' | 'disconnected' | 'error';
    message: string;
  };
  streamStatus: string;
  isVideoPlaying: boolean;
}

export function StatusPanel({
  connectionStatus,
  streamStatus,
  isVideoPlaying,
}: StatusPanelProps) {
  const getLedClass = (status: string) => {
    switch (status) {
      case 'connected': return 'led-green';
      case 'connecting': return 'led-amber';
      case 'error': return 'led-red';
      default: return 'led-off';
    }
  };

  return (
    <div className="panel-elevated p-4 space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
        System Status
      </h3>

      <div className="space-y-2.5">
        {/* Connection */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Connection</span>
          <div className="flex items-center gap-2">
            <div className={`led-indicator ${getLedClass(connectionStatus.status)}`} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {connectionStatus.message}
            </span>
          </div>
        </div>

        {/* Video */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Video</span>
          <div className="flex items-center gap-2">
            <div className={`led-indicator ${isVideoPlaying ? 'led-green' : 'led-off'}`} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {isVideoPlaying ? 'Streaming' : 'Idle'}
            </span>
          </div>
        </div>

        {/* Stream Event */}
        {streamStatus && (
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Stream</span>
            <span className="tag tag-copper capitalize">{streamStatus}</span>
          </div>
        )}
      </div>

      {connectionStatus.status === 'error' && (
        <div className="mt-2 p-3 rounded-lg text-xs" style={{ background: 'var(--danger-muted)', border: '1px solid rgba(248, 113, 113, 0.15)', color: 'var(--danger)' }}>
          {connectionStatus.message}
        </div>
      )}
    </div>
  );
}