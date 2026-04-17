import { useMutation } from '@tanstack/react-query';
import { uploadSessionImage } from '../services/session';

export const useUploadSessionImage = () => {
  return useMutation({
    mutationFn: uploadSessionImage,
  });
};
