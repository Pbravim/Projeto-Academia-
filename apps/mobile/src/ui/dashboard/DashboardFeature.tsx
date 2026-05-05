import type { DashboardControllerDependencies } from './hooks/useDashboardController';
import { useDashboardController } from './hooks/useDashboardController';
import { DashboardScreen } from './screens/DashboardScreen';

interface Props {
  dependencies: DashboardControllerDependencies;
}

export function DashboardFeature({ dependencies }: Props) {
  const controller = useDashboardController(dependencies);
  return <DashboardScreen {...controller} />;
}
