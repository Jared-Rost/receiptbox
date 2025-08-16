import { Redirect } from 'expo-router';

export default function Index() {
  // This component will automatically redirect to the /receipts screen
  return <Redirect href="/receipts" />;
}