import { StreamingChat } from '@/components/StreamingChat';
import { PresenterProvider } from '@/contexts/PresenterContext';

export default function Home() {
  return (
    <PresenterProvider>
      <StreamingChat />
    </PresenterProvider>
  );
}
