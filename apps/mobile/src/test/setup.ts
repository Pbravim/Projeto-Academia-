process.env.TZ = 'UTC';

// React act() needs this flag to recognize the testing environment.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
