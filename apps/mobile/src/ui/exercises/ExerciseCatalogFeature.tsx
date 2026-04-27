import type { ExerciseCatalogControllerDependencies } from './hooks/useExerciseCatalogController';
import { useExerciseCatalogController } from './hooks/useExerciseCatalogController';
import { ExerciseCatalogScreen } from './screens/ExerciseCatalogScreen';

interface ExerciseCatalogFeatureProps {
  dependencies: ExerciseCatalogControllerDependencies;
}

export function ExerciseCatalogFeature({ dependencies }: ExerciseCatalogFeatureProps) {
  const controller = useExerciseCatalogController(dependencies);

  return <ExerciseCatalogScreen {...controller} />;
}
