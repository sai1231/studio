
import { Redirect } from 'expo-router';

// This layout is part of an obsolete routing structure.
// It redirects any requests within the (app) group to the new (tabs) layout.
// This file can be deleted once the file system properly reflects the latest changes.
export default function ObsoleteAppLayout() {
  return <Redirect href="/(tabs)" />;
}
