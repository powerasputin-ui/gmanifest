import path from 'path';

/**
 * Корень проекта. В production standalone-сборке process.cwd() = .next/standalone,
 * поэтому поднимаемся на два уровня вверх — иначе uploads/ писались бы внутрь
 * .next и удалялись при каждой пересборке.
 */
export const PROJECT_ROOT =
  path.basename(process.cwd()) === 'standalone'
    ? path.resolve(process.cwd(), '..', '..')
    : process.cwd();

export const UPLOADS_DIR = path.join(PROJECT_ROOT, 'uploads');
