import { useLocalSearchParams, useRouter } from 'expo-router';

import { PracticeSessionScreen } from '@/components/practice/practice-session-screen';
import { SessionSummary } from '@/components/session-summary';
import { useCramSession } from '@/hooks/use-cram-session';

export default function PracticeDrillScreen() {
  const { topic } = useLocalSearchParams();
  const router = useRouter();
  const session = useCramSession({ topic });

  if (session.complete) {
    return (
      <SessionSummary reviewed={session.stats.reviewed} missed={session.stats.missed} onDone={() => router.back()} />
    );
  }

  return <PracticeSessionScreen session={session} modeLabel="Practice" />;
}
