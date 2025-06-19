'use client';

interface StatusPanelProps {
  connectionStatus: {
    status: 'connecting' | 'connected' | 'disconnected' | 'error';
    message: string;
  };
  streamStatus: string;
  isVideoPlaying: boolean;
}

/**
 * Component for displaying connection and streaming status
 */
export function StatusPanel({
  connectionStatus,
  streamStatus,
  isVideoPlaying,
}: StatusPanelProps) {

  /**
   * Gets status color based on connection state
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  /**
   * Gets status indicator dot color
   */
  const getIndicatorColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  /**
   * Gets video status display
   */
  const getVideoStatus = () => {
    return isVideoPlaying ? 'Streaming' : 'Idle';
  };

  /**
   * Gets video status color
   */
  const getVideoStatusColor = () => {
    return isVideoPlaying ? 'text-green-600' : 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-100 pb-2">
        System Status
      </h3>

      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Connection:</span>
        <div className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${getIndicatorColor(connectionStatus.status)}`}
          />
          <span className={`text-sm font-medium ${getStatusColor(connectionStatus.status)}`}>
            {connectionStatus.message}
          </span>
        </div>
      </div>

      {/* Video Status */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Video:</span>
        <div className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${isVideoPlaying ? 'bg-green-500' : 'bg-gray-400'}`}
          />
          <span className={`text-sm font-medium ${getVideoStatusColor()}`}>
            {getVideoStatus()}
          </span>
        </div>
      </div>

      {/* Stream Event Status */}
      {streamStatus && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Stream Event:</span>
          <span className="text-sm font-medium text-blue-600 capitalize">
            {streamStatus}
          </span>
        </div>
      )}

      {/* Error Display */}
      {connectionStatus.status === 'error' && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">
            {connectionStatus.message}
          </p>
        </div>
      )}
    </div>
  );
}