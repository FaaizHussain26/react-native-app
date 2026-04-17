import { useMutation } from '@tanstack/react-query';
import { createSession } from '../services/session';

export const useCreateSession = () => {
  return useMutation({
    mutationFn: createSession,
  });
};
