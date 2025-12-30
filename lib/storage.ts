import { SUPABASE_BUCKET_DQW, SUPABASE_BUCKET_NSG, SUPABASE_BUCKET_RMW } from '@env';

export const getBucketNameForDomain = (domain: string | null | undefined): string => {
  const clean = (value: string | undefined, fallback: string) => {
    const trimmed = (value ?? '').trim();
    return trimmed.length > 0 ? trimmed : fallback;
  };

  const nsgBucket = clean(SUPABASE_BUCKET_NSG, 'NSG-LMS');
  const rmwBucket = clean(SUPABASE_BUCKET_RMW, nsgBucket);
  const dqwBucket = clean(SUPABASE_BUCKET_DQW, 'DQW-LMS');

  switch (domain) {
    case 'rmw':
      return rmwBucket;
    case 'dqw':
      return dqwBucket;
    case 'nsg':
    case 'admin':
    default:
      return nsgBucket;
  }
};
