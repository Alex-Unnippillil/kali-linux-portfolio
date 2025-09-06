import logger from '../../utils/logger.ts';

function greet(name) {
  logger.info('Hello ' + name)
}

greet('World')
