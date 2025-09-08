import { logger } from '../../utils/logger';

function greet(name) {
  logger.info('Hello ' + name)
}

greet('World')
