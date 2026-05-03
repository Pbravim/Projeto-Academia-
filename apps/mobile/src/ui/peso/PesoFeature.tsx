import type { PesoControllerDependencies } from './hooks/usePesoController';
import { usePesoController } from './hooks/usePesoController';
import { PesoScreen } from './screens/PesoScreen';

interface PesoFeatureProps {
  dependencies: PesoControllerDependencies;
}

export function PesoFeature({ dependencies }: PesoFeatureProps) {
  const controller = usePesoController(dependencies);
  return <PesoScreen {...controller} />;
}
