export function extractError(err: unknown) {
  if (typeof err === 'string') return err;

  if (err instanceof Error) {
    return err.message;
  }

  if (typeof err === 'object' && err !== null && 'message' in err) {
    return (err as any).message;
  }

  if (typeof err === 'object' && err !== null && 'response' in err) {
    return (err as any).response?.data || err;
  }

  return err;
}
