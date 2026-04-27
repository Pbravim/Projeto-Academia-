import type { AppLogger } from './AppLogger';

type ErrorHandler = (error: unknown, isFatal?: boolean) => void;

interface ErrorUtilsShape {
  getGlobalHandler?: () => ErrorHandler;
  setGlobalHandler?: (handler: ErrorHandler) => void;
}

export function registerGlobalErrorHandler(logger: AppLogger): () => void {
  const errorUtils = (globalThis as typeof globalThis & { ErrorUtils?: ErrorUtilsShape }).ErrorUtils;

  if (!errorUtils?.getGlobalHandler || !errorUtils.setGlobalHandler) {
    return () => undefined;
  }

  const previousHandler = errorUtils.getGlobalHandler();

  errorUtils.setGlobalHandler((error, isFatal) => {
    logger.error('runtime.unhandled_error', error, {
      isFatal: Boolean(isFatal),
    });

    previousHandler?.(error, isFatal);
  });

  return () => {
    errorUtils.setGlobalHandler?.(previousHandler);
  };
}
